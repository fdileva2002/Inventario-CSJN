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
import { CreateConsumableMovementDto } from './dto/create-consumable-movement.dto';

@Injectable()
export class ConsumableMovementsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(createConsumableMovementDto: CreateConsumableMovementDto) {
    const { consumableId, type, quantity, detail, userId } =
      createConsumableMovementDto;

    const consumable = await this.prisma.consumable.findUnique({
      where: { id: consumableId },
      include: {
        stock: true,
      },
    });

    if (!consumable) {
      throw new NotFoundException('El consumible indicado no existe');
    }

    if (userId !== undefined) {
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
      });

      if (!user) {
        throw new NotFoundException('El usuario indicado no existe');
      }
    }

    const currentStock = consumable.stock?.currentStock ?? 0;

    let newStock = currentStock;

    if (type === 'SALIDA_POR_CONSUMO' || type === 'AJUSTE_NEGATIVO') {
      newStock = currentStock - quantity;

      if (newStock < 0) {
        throw new BadRequestException(
          `Stock insuficiente. Stock actual: ${currentStock}, intentando descontar: ${quantity}`,
        );
      }
    }

    if (type === 'AJUSTE_POSITIVO') {
      newStock = currentStock + quantity;
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

      const movement = await tx.consumableMovement.create({
        data: {
          consumableId,
          type: type as ConsumableMovementType,
          quantity,
          previousStock: currentStock,
          newStock,
          detail: detail?.trim(),
          userId,
        },
        include: this.getInclude(),
      });

      return movement;
    });
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
      user: true,
    } satisfies Prisma.ConsumableMovementInclude;
  }
}