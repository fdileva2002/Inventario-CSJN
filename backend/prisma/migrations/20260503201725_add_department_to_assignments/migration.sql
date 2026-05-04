-- DropForeignKey
ALTER TABLE "DeviceAssignment" DROP CONSTRAINT "DeviceAssignment_personId_fkey";

-- AlterTable
ALTER TABLE "DeviceAssignment" ADD COLUMN     "departmentId" INTEGER,
ALTER COLUMN "personId" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "DeviceAssignment" ADD CONSTRAINT "DeviceAssignment_personId_fkey" FOREIGN KEY ("personId") REFERENCES "Person"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DeviceAssignment" ADD CONSTRAINT "DeviceAssignment_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "Department"("id") ON DELETE SET NULL ON UPDATE CASCADE;
