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
import { CreateConsumableAssignmentDto } from './dto/create-consumable-assignment.dto';

@Injectable()
export class ConsumableAssignmentsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(createConsumableAssignmentDto: CreateConsumableAssignmentDto) {
    const { consumableId, personId, quantity, notes, createdById } =
      createConsumableAssignmentDto;

    const consumable = await this.prisma.consumable.findUnique({
      where: { id: consumableId },
      include: {
        stock: true,
      },
    });

    if (!consumable) {
      throw new NotFoundException('El consumible indicado no existe');
    }

    const person = await this.prisma.person.findUnique({
      where: { id: personId },
    });

    if (!person) {
      throw new NotFoundException('La persona indicada no existe');
    }

    if (createdById !== undefined) {
      const user = await this.prisma.user.findUnique({
        where: { id: createdById },
      });

      if (!user) {
        throw new NotFoundException('El usuario indicado no existe');
      }
    }

    const currentStock = consumable.stock?.currentStock ?? 0;
    const newStock = currentStock - quantity;

    if (newStock < 0) {
      throw new BadRequestException(
        `Stock insuficiente. Stock actual: ${currentStock}, intentando asignar: ${quantity}`,
      );
    }

    return this.prisma.$transaction(async (tx) => {
      await tx.consumableStock.upsert({
        where: { consumableId },
        update: {
          currentStock: newStock,
        },
        create: {
          consumableId,
          currentStock: newStock,
        },
      });

      const assignment = await tx.consumableAssignment.create({
        data: {
          consumableId,
          personId,
          quantity,
          assignedAt: new Date(),
          notes,
          createdById,
        },
        include: this.getInclude(),
      });

      await tx.consumableMovement.create({
        data: {
          consumableId,
          type: ConsumableMovementType.SALIDA_POR_CONSUMO,
          quantity,
          previousStock: currentStock,
          newStock,
          detail: notes?.trim() || `Asignación a ${person.fullName}`,
          userId: createdById,
        },
      });

      return assignment;
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
      person: true
    } satisfies Prisma.ConsumableAssignmentInclude;
  }
}