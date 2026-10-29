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
import { getCurrentUserId } from '../common/request-context';
import { applyStockMovement } from '../consumables/consumable-stock';
import { nextDeviceTag, tagPrefixFor } from '../devices/device-tag';
import { normalizeMac } from '../devices/mac-address';
import { CreateReceiptDto } from './dto/create-receipt.dto';
import { UpdateReceiptDto } from './dto/update-receipt.dto';
import { CreateDevicesFromReceiptDto } from './dto/create-devices-from-receipt.dto';
import * as XLSX from 'xlsx';

type ReceiptItemInput = {
  purchaseOrderItemId: number;
  receivedQuantity: number;
};

@Injectable()
export class ReceiptsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(createReceiptDto: CreateReceiptDto) {
    const result = await this.prisma.transaction(async (tx) => {
      await this.validateReceiptData(tx, {
        purchaseOrderId: createReceiptDto.purchaseOrderId,
        receivedById: createReceiptDto.receivedById,
        items: createReceiptDto.items,
      });

      const receipt = await tx.receipt.create({
        data: {
          purchaseOrderId: createReceiptDto.purchaseOrderId,
          receiptNumber: createReceiptDto.receiptNumber?.trim(),
          receivedAt: new Date(createReceiptDto.receivedAt),
          notes: createReceiptDto.notes?.trim(),
          receivedById: createReceiptDto.receivedById ?? getCurrentUserId(),
          items: {
            create: createReceiptDto.items.map((item) => ({
              purchaseOrderItemId: item.purchaseOrderItemId,
              receivedQuantity: item.receivedQuantity,
            })),
          },
        },
      });

      await this.updatePurchaseOrderStatus(
        tx,
        createReceiptDto.purchaseOrderId,
      );

      const received = await this.consumableQuantities(tx, createReceiptDto.items);

      for (const [consumableId, quantity] of received) {
        await applyStockMovement(tx, {
          consumableId,
          type: ConsumableMovementType.INGRESO_POR_COMPRA,
          delta: quantity,
          detail: `Ingreso por compra - recepción ${receipt.receiptNumber ?? receipt.id}`,
          purchaseOrderId: receipt.purchaseOrderId,
          receiptId: receipt.id,
        });
      }

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

    const receipts = await this.prisma.receipt.findMany({
      where: purchaseOrderId ? { purchaseOrderId } : undefined,
      include: this.getInclude(),
      orderBy: [{ receivedAt: 'desc' }, { id: 'desc' }],
    });

    return Promise.all(
      receipts.map(async (receipt) => {
        const devicesCreated = await this.prisma.deviceMovement.count({
          where: {
            type: 'INGRESO_POR_COMPRA',
            receiptId: receipt.id,
          },
        });

        const totalDevicesExpected = receipt.items
          .filter((item) => item.purchaseOrderItem.itemType === 'DEVICE')
          .reduce((acc, item) => acc + item.receivedQuantity, 0);

        return {
          ...receipt,
          devicesCreated,
          totalDevicesExpected,
          devicesFullyLoaded:
            totalDevicesExpected > 0 && devicesCreated >= totalDevicesExpected,
        };
      }),
    );
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

    await this.prisma.transaction(async (tx) => {
      await this.validateReceiptData(tx, {
        purchaseOrderId: mergedPurchaseOrderId,
        receivedById: mergedReceivedById,
        items: mergedItems,
        currentReceiptId: id,
      });

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

      // Si cambiaron las cantidades de consumibles, el stock se corrige con un
      // ajuste por la diferencia: el ingreso original queda en el historial.
      if (updateReceiptDto.items) {
        const before = await this.consumableQuantities(tx, existingReceipt.items);
        const after = await this.consumableQuantities(tx, updateReceiptDto.items);
        const consumableIds = new Set([...before.keys(), ...after.keys()]);
        const label = updateReceiptDto.receiptNumber?.trim() || existingReceipt.receiptNumber || id;

        for (const consumableId of consumableIds) {
          const delta = (after.get(consumableId) ?? 0) - (before.get(consumableId) ?? 0);

          if (delta === 0) continue;

          await applyStockMovement(tx, {
            consumableId,
            type: delta > 0
              ? ConsumableMovementType.AJUSTE_POSITIVO
              : ConsumableMovementType.AJUSTE_NEGATIVO,
            delta,
            detail: `Corrección de recepción ${label}`,
            purchaseOrderId: mergedPurchaseOrderId,
            receiptId: id,
          });
        }
      }
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
      receivedBy: { select: { id: true, name: true, email: true } },
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

  // Cantidad recibida por consumible (ignora ítems de dispositivos).
  private async consumableQuantities(
    tx: Prisma.TransactionClient,
    items: ReceiptItemInput[],
  ) {
    const orderItems = await tx.purchaseOrderItem.findMany({
      where: { id: { in: items.map((item) => item.purchaseOrderItemId) } },
      select: { id: true, itemType: true, consumableId: true },
    });
    const byId = new Map(orderItems.map((orderItem) => [orderItem.id, orderItem]));
    const quantities = new Map<number, number>();

    for (const item of items) {
      const orderItem = byId.get(item.purchaseOrderItemId);

      if (orderItem?.itemType !== 'CONSUMABLE' || !orderItem.consumableId) continue;

      quantities.set(
        orderItem.consumableId,
        (quantities.get(orderItem.consumableId) ?? 0) + item.receivedQuantity,
      );
    }

    return quantities;
  }

  private async validateReceiptData(
    db: Prisma.TransactionClient,
    params: {
      purchaseOrderId: number;
      receivedById?: number;
      items: ReceiptItemInput[];
      currentReceiptId?: number;
    },
  ) {
    const { purchaseOrderId, receivedById, items, currentReceiptId } = params;

    const purchaseOrder = await db.purchaseOrder.findUnique({
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
      const user = await db.user.findUnique({
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

      const purchaseOrderItem = await db.purchaseOrderItem.findUnique({
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

      const previousReceipts = await db.receiptItem.aggregate({
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

  
  const existingDevices = await this.prisma.deviceMovement.findFirst({
    where: {
      type: 'INGRESO_POR_COMPRA',
      receiptId,
    },
  });

  if (existingDevices) {
    throw new BadRequestException(
      'Los dispositivos de esta recepción ya fueron cargados anteriormente',
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

  const macs = createDevicesFromReceiptDto.devices.map((d) => normalizeMac(d.macAddress) ?? null);
  const presentMacs = macs.filter((mac): mac is string => mac !== null);

  if (new Set(presentMacs).size !== presentMacs.length) {
    throw new BadRequestException('Hay MAC address repetidas dentro de la misma carga');
  }

  try {
  return await this.prisma.transaction(async (tx) => {
    const createdDevices: any[] = [];
    let serialIndex = 0;

    for (const receiptItem of deviceReceiptItems) {
      const deviceModel = receiptItem.purchaseOrderItem.deviceModel;

      if (!deviceModel) {
        throw new BadRequestException(
          `El item ${receiptItem.purchaseOrderItemId} no tiene modelo de dispositivo asociado`,
        );
      }

      const prefix = tagPrefixFor(deviceModel.category);

      for (let i = 0; i < receiptItem.receivedQuantity; i++) {
        const serialNumber = serials[serialIndex];
        const tag = await nextDeviceTag(tx, prefix);

        const device = await tx.device.create({
          data: {
            tag,
            serialNumber,
            macAddress: macs[serialIndex],
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
            detail: `Ingreso por OC ${receipt.purchaseOrder.number}${receipt.receiptNumber ? ` - Recepción ${receipt.receiptNumber}` : ''}`,
            receiptId: receipt.id,
            newLocation: device.location,
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
  } catch (error: any) {
    // Nombra el dato repetido contra lo ya cargado (la carga entera se revierte).
    if (error?.code === 'P2002') {
      const target: string[] = Array.isArray(error.meta?.target) ? error.meta.target : [];
      if (target.includes('serialNumber')) {
        throw new BadRequestException('Alguno de los seriales ya está cargado en otro dispositivo. No se cargó ningún equipo.');
      }
      if (target.includes('macAddress')) {
        throw new BadRequestException('Alguna de las MAC address ya está cargada en otro dispositivo. No se cargó ningún equipo.');
      }
    }
    throw error;
  }
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

  // Columnas: serialNumber (obligatoria) y macAddress o MAC (opcional).
  const devices = data.map((row: any, index: number) => {
    if (!row.serialNumber) {
      throw new BadRequestException(`Falta serialNumber en la fila ${index + 2} del Excel`);
    }

    const mac = row.macAddress ?? row.MAC ?? row.mac;

    return {
      serialNumber: String(row.serialNumber).trim(),
      macAddress: mac !== undefined && mac !== null ? String(mac).trim() : undefined,
    };
  });

  // reutilizamos lo que ya hiciste
  return this.createDevicesFromReceipt(receiptId, { devices });
}
}