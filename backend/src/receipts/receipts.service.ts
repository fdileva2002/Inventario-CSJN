import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  Prisma,
  PurchaseOrderStatus,
  ConsumableMovementType,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateReceiptDto } from './dto/create-receipt.dto';
import { UpdateReceiptDto } from './dto/update-receipt.dto';
import { CreateDevicesFromReceiptDto } from './dto/create-devices-from-receipt.dto';
import * as XLSX from 'xlsx';

@Injectable()
export class ReceiptsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(createReceiptDto: CreateReceiptDto) {
    await this.validateReceiptData({
      purchaseOrderId: createReceiptDto.purchaseOrderId,
      receivedById: createReceiptDto.receivedById,
      items: createReceiptDto.items,
    });

    const result = await this.prisma.$transaction(async (tx) => {
      const receipt = await tx.receipt.create({
        data: {
          purchaseOrderId: createReceiptDto.purchaseOrderId,
          receiptNumber: createReceiptDto.receiptNumber?.trim(),
          receivedAt: new Date(createReceiptDto.receivedAt),
          notes: createReceiptDto.notes?.trim(),
          receivedById: createReceiptDto.receivedById,
          items: {
            create: createReceiptDto.items.map((item) => ({
              purchaseOrderItemId: item.purchaseOrderItemId,
              receivedQuantity: item.receivedQuantity,
            })),
          },
        },
        include: this.getInclude(),
      });

      await this.updatePurchaseOrderStatus(
        tx,
        createReceiptDto.purchaseOrderId,
      );

      await this.rebuildConsumableStockAndMovements(tx);

      return receipt;
    });

    return this.findOne(result.id);
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

    return this.prisma.receipt.findMany({
      where: purchaseOrderId ? { purchaseOrderId } : undefined,
      include: this.getInclude(),
      orderBy: [{ receivedAt: 'desc' }, { id: 'desc' }],
    });
  }

  async findOne(id: number) {
    const receipt = await this.prisma.receipt.findUnique({
      where: { id },
      include: this.getInclude(),
    });

    if (!receipt) {
      throw new NotFoundException(`No se encontró la recepción con id ${id}`);
    }

    return receipt;
  }

  async update(id: number, updateReceiptDto: UpdateReceiptDto) {
    const existingReceipt = await this.prisma.receipt.findUnique({
      where: { id },
      include: {
        items: true,
      },
    });

    if (!existingReceipt) {
      throw new NotFoundException(`No se encontró la recepción con id ${id}`);
    }

    const mergedPurchaseOrderId =
      updateReceiptDto.purchaseOrderId ?? existingReceipt.purchaseOrderId;

    const mergedReceivedById =
      updateReceiptDto.receivedById !== undefined
        ? updateReceiptDto.receivedById
        : existingReceipt.receivedById ?? undefined;

    const mergedItems =
      updateReceiptDto.items?.map((item) => ({
        purchaseOrderItemId: item.purchaseOrderItemId,
        receivedQuantity: item.receivedQuantity,
      })) ??
      existingReceipt.items.map((item) => ({
        purchaseOrderItemId: item.purchaseOrderItemId,
        receivedQuantity: item.receivedQuantity,
      }));

    await this.validateReceiptData({
      purchaseOrderId: mergedPurchaseOrderId,
      receivedById: mergedReceivedById,
      items: mergedItems,
      currentReceiptId: id,
    });

    await this.prisma.$transaction(async (tx) => {
      await tx.receipt.update({
        where: { id },
        data: {
          purchaseOrderId: mergedPurchaseOrderId,
          receiptNumber:
            updateReceiptDto.receiptNumber !== undefined
              ? updateReceiptDto.receiptNumber?.trim()
              : undefined,
          receivedAt: updateReceiptDto.receivedAt
            ? new Date(updateReceiptDto.receivedAt)
            : undefined,
          notes:
            updateReceiptDto.notes !== undefined
              ? updateReceiptDto.notes?.trim()
              : undefined,
          receivedById:
            updateReceiptDto.receivedById !== undefined
              ? updateReceiptDto.receivedById
              : undefined,
        },
      });

      if (updateReceiptDto.items) {
        await tx.receiptItem.deleteMany({
          where: { receiptId: id },
        });

        await tx.receiptItem.createMany({
          data: updateReceiptDto.items.map((item) => ({
            receiptId: id,
            purchaseOrderItemId: item.purchaseOrderItemId,
            receivedQuantity: item.receivedQuantity,
          })),
        });
      }

      const affectedPurchaseOrderIds = new Set<number>([
        existingReceipt.purchaseOrderId,
        mergedPurchaseOrderId,
      ]);

      for (const purchaseOrderId of affectedPurchaseOrderIds) {
        await this.updatePurchaseOrderStatus(tx, purchaseOrderId);
      }

      await this.rebuildConsumableStockAndMovements(tx);
    });

    return this.findOne(id);
  }

  private getInclude() {
    return {
      purchaseOrder: {
        include: {
          supplier: true,
        },
      },
      receivedBy: true,
      items: {
        include: {
          purchaseOrderItem: {
            include: {
              deviceModel: {
                include: {
                  category: true,
                },
              },
              consumable: true,
            },
          },
        },
      },
    } satisfies Prisma.ReceiptInclude;
  }

  private async validateReceiptData(params: {
    purchaseOrderId: number;
    receivedById?: number;
    items: Array<{
      purchaseOrderItemId: number;
      receivedQuantity: number;
    }>;
    currentReceiptId?: number;
  }) {
    const { purchaseOrderId, receivedById, items, currentReceiptId } = params;

    const purchaseOrder = await this.prisma.purchaseOrder.findUnique({
      where: { id: purchaseOrderId },
    });

    if (!purchaseOrder) {
      throw new NotFoundException('La orden de compra indicada no existe');
    }

    if (purchaseOrder.status === 'ANULADA') {
      throw new BadRequestException(
        'No se pueden registrar recepciones sobre una orden anulada',
      );
    }

    if (receivedById !== undefined) {
      const user = await this.prisma.user.findUnique({
        where: { id: receivedById },
      });

      if (!user) {
        throw new NotFoundException('El usuario receptor indicado no existe');
      }
    }

    const uniqueItemIds = new Set<number>();

    for (const item of items) {
      if (uniqueItemIds.has(item.purchaseOrderItemId)) {
        throw new BadRequestException(
          'No se puede repetir el mismo purchaseOrderItemId dentro de una misma recepción',
        );
      }

      uniqueItemIds.add(item.purchaseOrderItemId);

      const purchaseOrderItem = await this.prisma.purchaseOrderItem.findUnique({
        where: { id: item.purchaseOrderItemId },
      });

      if (!purchaseOrderItem) {
        throw new NotFoundException(
          `No existe el ítem de orden de compra con id ${item.purchaseOrderItemId}`,
        );
      }

      if (purchaseOrderItem.purchaseOrderId !== purchaseOrderId) {
        throw new BadRequestException(
          `El ítem ${item.purchaseOrderItemId} no pertenece a la orden de compra ${purchaseOrderId}`,
        );
      }

      const previousReceipts = await this.prisma.receiptItem.aggregate({
        where: {
          purchaseOrderItemId: item.purchaseOrderItemId,
          ...(currentReceiptId
            ? {
                receipt: {
                  id: {
                    not: currentReceiptId,
                  },
                },
              }
            : {}),
        },
        _sum: {
          receivedQuantity: true,
        },
      });

      const alreadyReceived = previousReceipts._sum.receivedQuantity ?? 0;
      const totalAfterThisReceipt = alreadyReceived + item.receivedQuantity;

      if (totalAfterThisReceipt > purchaseOrderItem.quantity) {
        throw new BadRequestException(
          `El ítem ${item.purchaseOrderItemId} supera la cantidad comprada. Comprada: ${purchaseOrderItem.quantity}, ya recibida: ${alreadyReceived}, intentando recibir ahora: ${item.receivedQuantity}`,
        );
      }
    }
  }

  private async updatePurchaseOrderStatus(
    tx: Prisma.TransactionClient,
    purchaseOrderId: number,
  ) {
    const purchaseOrderItems = await tx.purchaseOrderItem.findMany({
      where: { purchaseOrderId },
      select: {
        id: true,
        quantity: true,
      },
    });

    if (purchaseOrderItems.length === 0) {
      await tx.purchaseOrder.update({
        where: { id: purchaseOrderId },
        data: {
          status: 'PENDIENTE',
        },
      });

      return;
    }

    let totalOrdered = 0;
    let totalReceived = 0;

    for (const item of purchaseOrderItems) {
      totalOrdered += item.quantity;

      const receiptSum = await tx.receiptItem.aggregate({
        where: {
          purchaseOrderItemId: item.id,
        },
        _sum: {
          receivedQuantity: true,
        },
      });

      totalReceived += receiptSum._sum.receivedQuantity ?? 0;
    }

    let newStatus: PurchaseOrderStatus = 'PENDIENTE';

    if (totalReceived === 0) {
      newStatus = 'PENDIENTE';
    } else if (totalReceived < totalOrdered) {
      newStatus = 'PARCIAL';
    } else {
      newStatus = 'COMPLETA';
    }

    await tx.purchaseOrder.update({
      where: { id: purchaseOrderId },
      data: {
        status: newStatus,
      },
    });
  }

  private async rebuildConsumableStockAndMovements(
    tx: Prisma.TransactionClient,
  ) {
    const receiptConsumableItems = await tx.receiptItem.findMany({
      where: {
        purchaseOrderItem: {
          itemType: 'CONSUMABLE',
          consumableId: {
            not: null,
          },
        },
      },
      include: {
        receipt: true,
        purchaseOrderItem: {
          include: {
            consumable: true,
          },
        },
      },
      orderBy: [
        { receipt: { receivedAt: 'asc' } },
        { receiptId: 'asc' },
        { id: 'asc' },
      ],
    });

    await tx.consumableMovement.deleteMany({
      where: {
        type: ConsumableMovementType.INGRESO_POR_COMPRA,
        receiptId: {
          not: null,
        },
      },
    });

    const allConsumables = await tx.consumable.findMany({
      select: { id: true },
      orderBy: { id: 'asc' },
    });

    for (const consumable of allConsumables) {
      await tx.consumableStock.upsert({
        where: { consumableId: consumable.id },
        update: {
          currentStock: 0,
        },
        create: {
          consumableId: consumable.id,
          currentStock: 0,
        },
      });
    }

    const stockMap = new Map<number, number>();

    for (const consumable of allConsumables) {
      stockMap.set(consumable.id, 0);
    }

    for (const item of receiptConsumableItems) {
      const consumableId = item.purchaseOrderItem.consumableId;

      if (!consumableId) {
        continue;
      }

      const previousStock = stockMap.get(consumableId) ?? 0;
      const newStock = previousStock + item.receivedQuantity;

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

      await tx.consumableMovement.create({
        data: {
          consumableId,
          purchaseOrderId: item.receipt.purchaseOrderId,
          receiptId: item.receiptId,
          type: ConsumableMovementType.INGRESO_POR_COMPRA,
          quantity: item.receivedQuantity,
          previousStock,
          newStock,
          detail:
            item.receipt.receiptNumber
              ? `Ingreso por compra - recepción ${item.receipt.receiptNumber}`
              : `Ingreso por compra - recepción ${item.receiptId}`,
          userId: item.receipt.receivedById ?? undefined,
          date: item.receipt.receivedAt,
        },
      });

      stockMap.set(consumableId, newStock);
    }
  }

  async createDevicesFromReceipt(
  receiptId: number,
  createDevicesFromReceiptDto: CreateDevicesFromReceiptDto,
) {
  const receipt = await this.prisma.receipt.findUnique({
    where: { id: receiptId },
    include: {
      purchaseOrder: true,
      items: {
        include: {
          purchaseOrderItem: {
            include: {
              deviceModel: {
                include: {
                  category: true,
                },
              },
            },
          },
        },
      },
    },
  });

  if (!receipt) {
    throw new NotFoundException('La recepción indicada no existe');
  }

  const deviceReceiptItems = receipt.items.filter(
    (item) => item.purchaseOrderItem.itemType === 'DEVICE',
  );

  if (deviceReceiptItems.length === 0) {
    throw new BadRequestException(
      'La recepción no tiene ítems de tipo DEVICE',
    );
  }

  const totalDevicesToCreate = deviceReceiptItems.reduce(
    (acc, item) => acc + item.receivedQuantity,
    0,
  );

  if (createDevicesFromReceiptDto.devices.length !== totalDevicesToCreate) {
    throw new BadRequestException(
      `Cantidad inválida de seriales. Se esperaban ${totalDevicesToCreate} y se recibieron ${createDevicesFromReceiptDto.devices.length}`,
    );
  }

  const statusToConfigure = await this.prisma.deviceStatus.findUnique({
    where: { code: 'DISPONIBLE' },
  });

  if (!statusToConfigure) {
    throw new NotFoundException(
      'No existe el estado A_CONFIGURAR en la base de datos',
    );
  }

  const serials = createDevicesFromReceiptDto.devices.map((d) =>
    d.serialNumber.trim(),
  );

  const uniqueSerials = new Set(serials);

  if (uniqueSerials.size !== serials.length) {
    throw new BadRequestException(
      'Hay seriales repetidos dentro de la misma carga',
    );
  }

  return this.prisma.$transaction(async (tx) => {
    const createdDevices: any[] = [];
    let serialIndex = 0;

    for (const receiptItem of deviceReceiptItems) {
      const deviceModel = receiptItem.purchaseOrderItem.deviceModel;

      if (!deviceModel) {
        throw new BadRequestException(
          `El item ${receiptItem.purchaseOrderItemId} no tiene modelo de dispositivo asociado`,
        );
      }

      const category = deviceModel.category;
      const prefix = this.getTagPrefixByCategory(category.name);

      for (let i = 0; i < receiptItem.receivedQuantity; i++) {
        const serialNumber = serials[serialIndex];
        const tag = await this.generateNextTag(tx, prefix);

        const device = await tx.device.create({
          data: {
            tag,
            serialNumber,
            categoryId: deviceModel.categoryId,
            modelId: deviceModel.id,
            statusId: statusToConfigure.id,
            supplierId: receipt.purchaseOrder.supplierId,
            purchaseOrderId: receipt.purchaseOrderId,
            purchaseDate: receipt.purchaseOrder.date,
            entryDate: receipt.receivedAt,
          },
          include: {
            category: true,
            model: true,
            status: true,
            supplier: true,
            purchaseOrder: true,
          },
        });

        await tx.deviceMovement.create({
          data: {
            deviceId: device.id,
            type: 'INGRESO_POR_COMPRA',
            previousStatus: null,
            newStatus: statusToConfigure.code,
            detail: `Ingreso por recepción ${receipt.id}`,
          },
        });

        createdDevices.push(device);
        serialIndex++;
      }
    }

    return {
      receiptId: receipt.id,
      createdCount: createdDevices.length,
      devices: createdDevices,
    };
  });
 }
 private getTagPrefixByCategory(categoryName: string) {
  const prefixes: Record<string, string> = {
    Desktop: 'PC',
    Notebook: 'NBK',
    Monitor: 'MON',
    Impresora: 'IMP',
    Token: 'TKN',
    'All-in-one': 'AIO',
    'Camara Web': 'CAM',
    DVD: 'DVD',
    Escaner: 'SCN',
    'Colector de datos': 'COL',
  };

  return prefixes[categoryName] ?? 'DEV';
 }

 private async generateNextTag(tx: PrismaService | any, prefix: string) {
  const lastDevice = await tx.device.findFirst({
    where: {
      tag: {
        startsWith: prefix,
      },
    },
    orderBy: {
      tag: 'desc',
    },
  });

  if (!lastDevice) {
    return `${prefix}0001`;
  }

  const numericPart = lastDevice.tag.slice(prefix.length);
  const lastNumber = Number.parseInt(numericPart, 10);

  const nextNumber = Number.isNaN(lastNumber) ? 1 : lastNumber + 1;

  return `${prefix}${nextNumber.toString().padStart(4, '0')}`;
 }

 async importDevicesFromReceipt(
  receiptId: number,
  file: any,
) {
  if (!file) {
    throw new BadRequestException('Archivo requerido');
  }

  // leer archivo
  const workbook = XLSX.read(file.buffer, { type: 'buffer' });

  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];

  const data = XLSX.utils.sheet_to_json(sheet);

  if (!data.length) {
    throw new BadRequestException('El archivo está vacío');
  }

  // transformar a formato que ya tenés
  const devices = data.map((row: any) => {
    if (!row.serialNumber) {
      throw new BadRequestException('Falta serialNumber en el Excel');
    }

    return {
      serialNumber: String(row.serialNumber).trim(),
    };
  });

  // reutilizamos lo que ya hiciste
  return this.createDevicesFromReceipt(receiptId, { devices });
}
}