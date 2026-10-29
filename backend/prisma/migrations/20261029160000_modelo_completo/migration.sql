-- Roles: EDICION pasa a SUPERADMIN (los usuarios existentes conservan todos sus permisos)
-- y se agregan ADMINISTRADOR y TECNICO. Escrito a mano: el diff de Prisma recrea el
-- enum casteando por texto y fallaría con las filas que tienen 'EDICION'.
ALTER TYPE "UserRole" RENAME VALUE 'EDICION' TO 'SUPERADMIN';
ALTER TYPE "UserRole" ADD VALUE 'ADMINISTRADOR' BEFORE 'CONSULTA';
ALTER TYPE "UserRole" ADD VALUE 'TECNICO' BEFORE 'CONSULTA';

-- CreateEnum
CREATE TYPE "ComponentStatus" AS ENUM ('DISPONIBLE', 'INSTALADO', 'BAJA');

-- CreateEnum
CREATE TYPE "ComponentMovementType" AS ENUM ('ALTA', 'INSTALACION', 'RETIRO', 'BAJA');

-- AlterTable
ALTER TABLE "Device" ADD COLUMN     "macAddress" TEXT;

-- CreateTable
CREATE TABLE "Component" (
    "id" SERIAL NOT NULL,
    "type" TEXT NOT NULL,
    "brand" TEXT,
    "model" TEXT,
    "serialNumber" TEXT,
    "capacity" TEXT,
    "status" "ComponentStatus" NOT NULL DEFAULT 'DISPONIBLE',
    "deviceId" INTEGER,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Component_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ComponentMovement" (
    "id" SERIAL NOT NULL,
    "componentId" INTEGER NOT NULL,
    "type" "ComponentMovementType" NOT NULL,
    "deviceId" INTEGER,
    "detail" TEXT,
    "userId" INTEGER,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ComponentMovement_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Component_serialNumber_key" ON "Component"("serialNumber");

-- CreateIndex
CREATE INDEX "Component_deviceId_idx" ON "Component"("deviceId");

-- CreateIndex
CREATE INDEX "Component_type_idx" ON "Component"("type");

-- CreateIndex
CREATE INDEX "Component_status_idx" ON "Component"("status");

-- CreateIndex
CREATE INDEX "ComponentMovement_componentId_idx" ON "ComponentMovement"("componentId");

-- CreateIndex
CREATE INDEX "ComponentMovement_deviceId_idx" ON "ComponentMovement"("deviceId");

-- CreateIndex
CREATE INDEX "ComponentMovement_date_idx" ON "ComponentMovement"("date");

-- CreateIndex
CREATE UNIQUE INDEX "Device_macAddress_key" ON "Device"("macAddress");

-- AddForeignKey
ALTER TABLE "Component" ADD CONSTRAINT "Component_deviceId_fkey" FOREIGN KEY ("deviceId") REFERENCES "Device"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ComponentMovement" ADD CONSTRAINT "ComponentMovement_componentId_fkey" FOREIGN KEY ("componentId") REFERENCES "Component"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ComponentMovement" ADD CONSTRAINT "ComponentMovement_deviceId_fkey" FOREIGN KEY ("deviceId") REFERENCES "Device"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ComponentMovement" ADD CONSTRAINT "ComponentMovement_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Componentes: mismas garantías de historial que dispositivos y consumibles
-- (funciones definidas en la migración historial_confiable).
CREATE TRIGGER audit_row AFTER INSERT OR UPDATE OR DELETE ON "Component"
  FOR EACH ROW EXECUTE FUNCTION audit_row();
CREATE TRIGGER movement_set_user BEFORE INSERT ON "ComponentMovement"
  FOR EACH ROW EXECUTE FUNCTION movement_set_user();
CREATE TRIGGER append_only BEFORE UPDATE OR DELETE ON "ComponentMovement"
  FOR EACH ROW EXECUTE FUNCTION history_is_append_only();

-- Un componente instalado tiene equipo, y uno en depósito o de baja no.
ALTER TABLE "Component"
  ADD CONSTRAINT "Component_installed_has_device"
  CHECK (("status" = 'INSTALADO') = ("deviceId" IS NOT NULL));
