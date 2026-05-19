-- DropForeignKey
ALTER TABLE "ConsumableAssignment" DROP CONSTRAINT "ConsumableAssignment_personId_fkey";

-- DropIndex
DROP INDEX "ConsumableAssignment_consumableId_idx";

-- DropIndex
DROP INDEX "ConsumableAssignment_personId_idx";

-- AlterTable
ALTER TABLE "ConsumableAssignment" ADD COLUMN     "departmentId" INTEGER,
ALTER COLUMN "personId" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "ConsumableAssignment" ADD CONSTRAINT "ConsumableAssignment_personId_fkey" FOREIGN KEY ("personId") REFERENCES "Person"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConsumableAssignment" ADD CONSTRAINT "ConsumableAssignment_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "Department"("id") ON DELETE SET NULL ON UPDATE CASCADE;
