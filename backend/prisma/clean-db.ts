import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
    console.log('Limpiando base de datos...');

    await prisma.auditLog.deleteMany();
    await prisma.deviceMovement.deleteMany();
    await prisma.deviceAssignment.deleteMany();
    await prisma.consumableMovement.deleteMany();
    await prisma.consumableAssignment.deleteMany();
    await prisma.consumableStock.deleteMany();
    await prisma.receiptItem.deleteMany();
    await prisma.receipt.deleteMany();
    await prisma.purchaseOrderItem.deleteMany();
    await prisma.device.deleteMany();
    await prisma.consumable.deleteMany();
    await prisma.purchaseOrder.deleteMany();
    await prisma.person.deleteMany();
    await prisma.department.deleteMany();
    await prisma.deviceModel.deleteMany();
    await prisma.deviceCategory.deleteMany();
    await prisma.supplier.deleteMany();

    console.log('Base de datos limpia');
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect());