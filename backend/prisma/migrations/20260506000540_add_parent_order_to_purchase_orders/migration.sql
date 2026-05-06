-- AlterTable
ALTER TABLE "PurchaseOrder" ADD COLUMN     "parentOrderId" INTEGER;

-- AddForeignKey
ALTER TABLE "PurchaseOrder" ADD CONSTRAINT "PurchaseOrder_parentOrderId_fkey" FOREIGN KEY ("parentOrderId") REFERENCES "PurchaseOrder"("id") ON DELETE SET NULL ON UPDATE CASCADE;
