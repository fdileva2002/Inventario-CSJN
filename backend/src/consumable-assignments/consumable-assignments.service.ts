import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  ConsumableMovementType,
  Prisma,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { getCurrentUserId } from '../common/request-context';
import { applyStockMovement } from '../consumables/consumable-stock';
import { CreateConsumableAssignmentDto } from './dto/create-consumable-assignment.dto';

@Injectable()
export class ConsumableAssignmentsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(createConsumableAssignmentDto: CreateConsumableAssignmentDto) {
  const { consumableId, personId, departmentId, quantity, notes } =
    createConsumableAssignmentDto;

  if (!personId && !departmentId) {
    throw new BadRequestException(
      'Debe indicar una persona o una dependencia',
    );
  }

  if (personId && departmentId) {
    throw new BadRequestException(
      'No se puede asignar a una persona y una dependencia al mismo tiempo',
    );
  }

  const consumable = await this.prisma.consumable.findUnique({
    where: { id: consumableId },
  });

  if (!consumable) {
    throw new NotFoundException('El consumible indicado no existe');
  }

  let personName = '';

  if (personId) {
    const person = await this.prisma.person.findUnique({
      where: { id: personId },
    });
    if (!person) throw new NotFoundException('La persona indicada no existe');
    personName = person.fullName;
  }

  if (departmentId) {
    const department = await this.prisma.department.findUnique({
      where: { id: departmentId },
    });
    if (!department) throw new NotFoundException('La dependencia indicada no existe');
    personName = department.name;
  }

  return this.prisma.transaction(async (tx) => {
    await applyStockMovement(tx, {
      consumableId,
      type: ConsumableMovementType.SALIDA_POR_CONSUMO,
      delta: -quantity,
      detail: notes?.trim() || `Asignación a ${personName}`,
    });

    return tx.consumableAssignment.create({
      data: {
        consumableId,
        personId: personId ?? null,
        departmentId: departmentId ?? null,
        quantity,
        assignedAt: new Date(),
        notes,
        createdById: getCurrentUserId(),
      },
      include: this.getInclude(),
    });
  });
}

  async findAll() {
    return this.prisma.consumableAssignment.findMany({
      include: this.getInclude(),
      orderBy: [{ assignedAt: 'desc' }, { id: 'desc' }],
    });
  }

  async findOne(id: number) {
    const assignment = await this.prisma.consumableAssignment.findUnique({
      where: { id },
      include: this.getInclude(),
    });

    if (!assignment) {
      throw new NotFoundException(
        `No se encontró la asignación de consumible con id ${id}`,
      );
    }

    return assignment;
  }

  async findByPerson(personId: number) {
    const person = await this.prisma.person.findUnique({
      where: { id: personId },
    });

    if (!person) {
      throw new NotFoundException('La persona indicada no existe');
    }

    return this.prisma.consumableAssignment.findMany({
      where: { personId },
      include: this.getInclude(),
      orderBy: [{ assignedAt: 'desc' }, { id: 'desc' }],
    });
  }

  async findByConsumable(consumableId: number) {
    const consumable = await this.prisma.consumable.findUnique({
      where: { id: consumableId },
    });

    if (!consumable) {
      throw new NotFoundException('El consumible indicado no existe');
    }

    return this.prisma.consumableAssignment.findMany({
      where: { consumableId },
      include: this.getInclude(),
      orderBy: [{ assignedAt: 'desc' }, { id: 'desc' }],
    });
  }

  private getInclude() {
    return {
      consumable: {
        include: {
          stock: true,
        },
      },
      person: true,
      department: true,
    } satisfies Prisma.ConsumableAssignmentInclude;
  }
}