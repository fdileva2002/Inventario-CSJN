import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePurchaseOrderItemDto } from './dto/create-purchase-order-item.dto';
import { UpdatePurchaseOrderItemDto } from './dto/update-purchase-order-item.dto';

@Injectable()
export class PurchaseOrderItemsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(createPurchaseOrderItemDto: CreatePurchaseOrderItemDto) {
    await this.validateReferences(createPurchaseOrderItemDto);

    return this.prisma.purchaseOrderItem.create({
      data: {
        purchaseOrderId: createPurchaseOrderItemDto.purchaseOrderId,
        itemType: createPurchaseOrderItemDto.itemType,
        deviceModelId:
          createPurchaseOrderItemDto.itemType === 'DEVICE'
            ? createPurchaseOrderItemDto.deviceModelId
            : null,
        consumableId:
          createPurchaseOrderItemDto.itemType === 'CONSUMABLE'
            ? createPurchaseOrderItemDto.consumableId
            : null,
        quantity: createPurchaseOrderItemDto.quantity,
        unitPrice: createPurchaseOrderItemDto.unitPrice,
        notes: createPurchaseOrderItemDto.notes?.trim(),
      },
      include: this.getInclude(),
    });
  }

  async findAll(purchaseOrderId?: number) {
    if (purchaseOrderId !== undefined) {
      const purchaseOrder = await this.prisma.purchaseOrder.findUnique({
        where: { id: purchaseOrderId },
      });

      if (!purchaseOrder) {
        throw new NotFoundException('La orden de compra indicada no existe');
      }
    }

    return this.prisma.purchaseOrderItem.findMany({
      where: purchaseOrderId ? { purchaseOrderId } : undefined,
      include: this.getInclude(),
      orderBy: [{ purchaseOrderId: 'asc' }, { id: 'asc' }],
    });
  }

  async findOne(id: number) {
    const item = await this.prisma.purchaseOrderItem.findUnique({
      where: { id },
      include: this.getInclude(),
    });

    if (!item) {
      throw new NotFoundException(
        `No se encontró el ítem de orden de compra con id ${id}`,
      );
    }

    return item;
  }

  async update(id: number, updatePurchaseOrderItemDto: UpdatePurchaseOrderItemDto) {
    const existingItem = await this.prisma.purchaseOrderItem.findUnique({
      where: { id },
    });

    if (!existingItem) {
      throw new NotFoundException(
        `No se encontró el ítem de orden de compra con id ${id}`,
      );
    }

    const mergedData = {
      purchaseOrderId:
        updatePurchaseOrderItemDto.purchaseOrderId ?? existingItem.purchaseOrderId,
      itemType: updatePurchaseOrderItemDto.itemType ?? existingItem.itemType,
      deviceModelId:
        updatePurchaseOrderItemDto.deviceModelId ?? existingItem.deviceModelId ?? undefined,
      consumableId:
        updatePurchaseOrderItemDto.consumableId ?? existingItem.consumableId ?? undefined,
      quantity: updatePurchaseOrderItemDto.quantity ?? existingItem.quantity,
      notes:
        updatePurchaseOrderItemDto.notes !== undefined
          ? updatePurchaseOrderItemDto.notes
          : existingItem.notes ?? undefined,
    };

    await this.validateReferences(mergedData);

    return this.prisma.purchaseOrderItem.update({
      where: { id },
      data: {
        purchaseOrderId: mergedData.purchaseOrderId,
        itemType: mergedData.itemType,
        deviceModelId:
          mergedData.itemType === 'DEVICE' ? mergedData.deviceModelId : null,
        consumableId:
          mergedData.itemType === 'CONSUMABLE' ? mergedData.consumableId : null,
        quantity: mergedData.quantity,
        unitPrice: updatePurchaseOrderItemDto.unitPrice,
        notes: mergedData.notes?.trim(),
      },
      include: this.getInclude(),
    });
  }

  async remove(id: number) {
    await this.findOne(id);

    try {
      return await this.prisma.purchaseOrderItem.delete({
        where: { id },
      });
    } catch (error: any) {
      const message = String(error?.message ?? '');

      if (
        error.code === 'P2003' ||
        message.includes('violates RESTRICT setting') ||
        message.includes('foreign key constraint')
      ) {
        throw new BadRequestException(
          'No se puede eliminar el ítem porque tiene recepciones asociadas',
        );
      }

      throw error;
    }
  }

  private getInclude() {
    return {
      purchaseOrder: {
        include: {
          supplier: true,
        },
      },
      deviceModel: {
        include: {
          category: true,
        },
      },
      consumable: true,
    };
  }

  private async validateReferences(data: {
    purchaseOrderId: number;
    itemType: 'DEVICE' | 'CONSUMABLE';
    deviceModelId?: number | null;
    consumableId?: number | null;
    quantity: number;
  }) {
    const purchaseOrder = await this.prisma.purchaseOrder.findUnique({
      where: { id: data.purchaseOrderId },
    });

    if (!purchaseOrder) {
      throw new NotFoundException('La orden de compra indicada no existe');
    }

    if (data.itemType === 'DEVICE') {
      if (!data.deviceModelId) {
        throw new BadRequestException(
          'Si el ítem es DEVICE, deviceModelId es obligatorio',
        );
      }

      if (data.consumableId) {
        throw new BadRequestException(
          'Un ítem DEVICE no puede tener consumableId',
        );
      }

      const deviceModel = await this.prisma.deviceModel.findUnique({
        where: { id: data.deviceModelId },
      });

      if (!deviceModel) {
        throw new NotFoundException('El modelo de dispositivo indicado no existe');
      }
    }

    if (data.itemType === 'CONSUMABLE') {
      if (!data.consumableId) {
        throw new BadRequestException(
          'Si el ítem es CONSUMABLE, consumableId es obligatorio',
        );
      }

      if (data.deviceModelId) {
        throw new BadRequestException(
          'Un ítem CONSUMABLE no puede tener deviceModelId',
        );
      }

      const consumable = await this.prisma.consumable.findUnique({
        where: { id: data.consumableId },
      });

      if (!consumable) {
        throw new NotFoundException('El consumible indicado no existe');
      }
    }
  }
}