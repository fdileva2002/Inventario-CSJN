import { BadRequestException } from '@nestjs/common';
import { ConsumableMovementType, Prisma } from '@prisma/client';

type StockMovement = {
  consumableId: number;
  type: ConsumableMovementType;
  // Positivo suma stock, negativo resta.
  delta: number;
  detail?: string;
  purchaseOrderId?: number | null;
  receiptId?: number | null;
  // Destinatario de una salida por asignación.
  personId?: number | null;
  departmentId?: number | null;
  date?: Date;
};

/**
 * Única forma de modificar stock de consumibles: bloquea la fila de stock
 * (SELECT ... FOR UPDATE) para que dos operaciones simultáneas no se pisen,
 * y deja el movimiento correspondiente en la misma transacción.
 */
export async function applyStockMovement(
  tx: Prisma.TransactionClient,
  movement: StockMovement,
) {
  const { consumableId, delta } = movement;

  await tx.consumableStock.upsert({
    where: { consumableId },
    update: {},
    create: { consumableId, currentStock: 0 },
  });

  const [row] = await tx.$queryRaw<{ currentStock: number }[]>`
    SELECT "currentStock" FROM "ConsumableStock"
    WHERE "consumableId" = ${consumableId}
    FOR UPDATE`;

  const previousStock = row.currentStock;
  const newStock = previousStock + delta;

  if (newStock < 0) {
    throw new BadRequestException(
      `Stock insuficiente. Stock actual: ${previousStock}, intentando descontar: ${-delta}`,
    );
  }

  await tx.consumableStock.update({
    where: { consumableId },
    data: { currentStock: newStock },
  });

  return tx.consumableMovement.create({
    data: {
      consumableId,
      type: movement.type,
      quantity: Math.abs(delta),
      previousStock,
      newStock,
      detail: movement.detail,
      purchaseOrderId: movement.purchaseOrderId ?? null,
      receiptId: movement.receiptId ?? null,
      personId: movement.personId ?? null,
      departmentId: movement.departmentId ?? null,
      date: movement.date,
    },
  });
}
