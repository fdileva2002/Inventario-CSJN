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
import { CreateConsumableAssignmentBatchDto } from './dto/create-consumable-assignment-batch.dto';

@Injectable()
export class ConsumableAssignmentsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(createConsumableAssignmentDto: CreateConsumableAssignmentDto) {
    const { consumableId, personId, departmentId, quantity, notes } =
      createConsumableAssignmentDto;

    const [assignment] = await this.createBatch({
      personId,
      departmentId,
      notes,
      items: [{ consumableId, quantity }],
    });
    return assignment;
  }

  // Todos los ítems salen en una transacción: si a uno le falta stock, no se entrega ninguno.
  async createBatch(dto: CreateConsumableAssignmentBatchDto) {
    const { personId, departmentId, notes, items } = dto;

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

    const consumableIds = [...new Set(items.map((item) => item.consumableId))];
    if (consumableIds.length !== items.length) {
      throw new BadRequestException('Hay un consumible repetido en la entrega: sumá las cantidades');
    }

    const consumables = await this.prisma.consumable.findMany({
      where: { id: { in: consumableIds } },
    });

    if (consumables.length !== consumableIds.length) {
      throw new NotFoundException('El consumible indicado no existe');
    }

    let recipientName = '';

    if (personId) {
      const person = await this.prisma.person.findUnique({
        where: { id: personId },
      });
      if (!person) throw new NotFoundException('La persona indicada no existe');
      recipientName = person.fullName;
    }

    if (departmentId) {
      const department = await this.prisma.department.findUnique({
        where: { id: departmentId },
      });
      if (!department) throw new NotFoundException('La dependencia indicada no existe');
      recipientName = department.name;
    }

    const consumableNames = new Map(
      consumables.map((c) => [c.id, [c.name, c.model, c.variant].filter(Boolean).join(' ')]),
    );

    return this.prisma.transaction(async (tx) => {
      const assignments: Prisma.ConsumableAssignmentGetPayload<{
        include: ReturnType<ConsumableAssignmentsService["getInclude"]>;
      }>[] = [];

      for (const item of items) {
        try {
          await applyStockMovement(tx, {
            consumableId: item.consumableId,
            type: ConsumableMovementType.SALIDA_POR_CONSUMO,
            delta: -item.quantity,
            personId: personId ?? null,
            departmentId: departmentId ?? null,
            detail: notes?.trim() || `Asignación a ${recipientName}`,
          });
        } catch (error) {
          // Con varios ítems hay que decir cuál no alcanzó.
          if (error instanceof BadRequestException && items.length > 1) {
            throw new BadRequestException(
              `${consumableNames.get(item.consumableId)}: ${error.message}`,
            );
          }
          throw error;
        }

        assignments.push(
          await tx.consumableAssignment.create({
            data: {
              consumableId: item.consumableId,
              personId: personId ?? null,
              departmentId: departmentId ?? null,
              quantity: item.quantity,
              assignedAt: new Date(),
              notes,
              createdById: getCurrentUserId(),
            },
            include: this.getInclude(),
          }),
        );
      }

      return assignments;
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