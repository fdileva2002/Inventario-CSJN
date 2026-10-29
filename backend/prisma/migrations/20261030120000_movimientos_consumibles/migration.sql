-- Salidas de consumibles con destinatario: permite consultar qué se entregó a cada
-- persona o dependencia desde el historial de movimientos. Las salidas anteriores a
-- esta migración quedan sin destinatario (el detalle de texto lo sigue mostrando).
ALTER TABLE "ConsumableMovement" ADD COLUMN "departmentId" INTEGER,
ADD COLUMN "personId" INTEGER;

CREATE INDEX "ConsumableMovement_personId_idx" ON "ConsumableMovement"("personId");
CREATE INDEX "ConsumableMovement_departmentId_idx" ON "ConsumableMovement"("departmentId");

-- Reportes de movimientos por tipo y rango de fechas.
CREATE INDEX "ConsumableMovement_type_date_idx" ON "ConsumableMovement"("type", "date");
CREATE INDEX "DeviceMovement_type_date_idx" ON "DeviceMovement"("type", "date");

-- RESTRICT: el historial es de solo agregado, así que no se puede anular la referencia.
ALTER TABLE "ConsumableMovement" ADD CONSTRAINT "ConsumableMovement_personId_fkey" FOREIGN KEY ("personId") REFERENCES "Person"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ConsumableMovement" ADD CONSTRAINT "ConsumableMovement_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "Department"("id") ON DELETE RESTRICT ON UPDATE CASCADE;