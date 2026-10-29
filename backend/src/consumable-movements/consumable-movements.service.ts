import { Injectable, NotFoundException } from '@nestjs/common';
import { ConsumableMovementType, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { applyStockMovement } from '../consumables/consumable-stock';
import { CreateConsumableMovementDto } from './dto/create-consumable-movement.dto';

@Injectable()
export class ConsumableMovementsService {
  constructor(private readonly prisma: PrismaService) {}

  // El usuario del movimiento lo pone la base desde la sesión; dto.userId se ignora.
  async create(createConsumableMovementDto: CreateConsumableMovementDto) {
    const { consumableId, type, quantity, detail } = createConsumableMovementDto;

    const consumable = await this.prisma.consumable.findUnique({
      where: { id: consumableId },
    });

    if (!consumable) {
      throw new NotFoundException('El consumible indicado no existe');
    }

    const delta = type === 'AJUSTE_POSITIVO' ? quantity : -quantity;

    const movement = await this.prisma.transaction((tx) =>
      applyStockMovement(tx, {
        consumableId,
        type: type as ConsumableMovementType,
        delta,
        detail: detail?.trim(),
      }),
    );

    return this.findOne(movement.id);
  }

  async findAll(consumableId?: number) {
    if (consumableId !== undefined) {
      const consumable = await this.prisma.consumable.findUnique({
        where: { id: consumableId },
      });

      if (!consumable) {
        throw new NotFoundException('El consumible indicado no existe');
      }
    }

    return this.prisma.consumableMovement.findMany({
      where: consumableId ? { consumableId } : undefined,
      include: this.getInclude(),
      orderBy: [{ date: 'desc' }, { id: 'desc' }],
    });
  }

  async findOne(id: number) {
    const movement = await this.prisma.consumableMovement.findUnique({
      where: { id },
      include: this.getInclude(),
    });

    if (!movement) {
      throw new NotFoundException(
        `No se encontró el movimiento de consumible con id ${id}`,
      );
    }

    return movement;
  }

  private getInclude() {
    return {
      consumable: {
        include: {
          stock: true,
        },
      },
      purchaseOrder: true,
      receipt: true,
      user: { select: { id: true, name: true, email: true } },
    } satisfies Prisma.ConsumableMovementInclude;
  }
}
