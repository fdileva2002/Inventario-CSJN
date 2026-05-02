/*
  Warnings:

  - A unique constraint covering the columns `[code]` on the table `DeviceCategory` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "DeviceCategory" ADD COLUMN     "code" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "DeviceCategory_code_key" ON "DeviceCategory"("code");
