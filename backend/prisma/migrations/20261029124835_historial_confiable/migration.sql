-- AlterTable
ALTER TABLE "AuditLog" ADD COLUMN     "changedFields" TEXT[];

-- AlterTable
ALTER TABLE "DeviceMovement" ADD COLUMN     "departmentId" INTEGER,
ADD COLUMN     "newLocation" TEXT,
ADD COLUMN     "previousLocation" TEXT;

-- CreateIndex
CREATE INDEX "AuditLog_userId_idx" ON "AuditLog"("userId");

-- CreateIndex
CREATE INDEX "ConsumableAssignment_consumableId_idx" ON "ConsumableAssignment"("consumableId");

-- CreateIndex
CREATE INDEX "ConsumableAssignment_personId_idx" ON "ConsumableAssignment"("personId");

-- CreateIndex
CREATE INDEX "ConsumableAssignment_departmentId_idx" ON "ConsumableAssignment"("departmentId");

-- CreateIndex
CREATE INDEX "DeviceAssignment_departmentId_idx" ON "DeviceAssignment"("departmentId");

-- CreateIndex
CREATE INDEX "DeviceMovement_personId_idx" ON "DeviceMovement"("personId");

-- CreateIndex
CREATE INDEX "DeviceMovement_departmentId_idx" ON "DeviceMovement"("departmentId");

-- CreateIndex
CREATE INDEX "DeviceMovement_receiptId_idx" ON "DeviceMovement"("receiptId");

-- AddForeignKey
ALTER TABLE "DeviceMovement" ADD CONSTRAINT "DeviceMovement_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "Department"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- =====================================================================
-- Historial confiable (escrito a mano; Prisma no modela triggers ni CHECKs)
-- =====================================================================

-- El backend ejecuta set_config('app.user_id', <id>, true) al abrir cada
-- transacción; estas funciones lo leen. Fuera de una transacción del backend
-- (seed, consola SQL) queda NULL.
CREATE OR REPLACE FUNCTION app_current_user_id() RETURNS integer AS $$
  SELECT NULLIF(current_setting('app.user_id', true), '')::integer;
$$ LANGUAGE sql STABLE;

-- Auditoría genérica de filas. En UPDATE guarda solo los campos que cambiaron.
-- passwordHash nunca se copia: si cambia, solo se registra el nombre del campo.
CREATE OR REPLACE FUNCTION audit_row() RETURNS trigger AS $$
DECLARE
  v_old     jsonb;
  v_new     jsonb;
  v_changed text[];
  v_action  text;
BEGIN
  IF TG_OP = 'INSERT' THEN
    v_action := 'CREACION';
    v_new := to_jsonb(NEW) - 'passwordHash' - 'createdAt' - 'updatedAt';
  ELSIF TG_OP = 'DELETE' THEN
    v_action := 'ELIMINACION';
    v_old := to_jsonb(OLD) - 'passwordHash' - 'createdAt' - 'updatedAt';
  ELSE
    v_action := 'MODIFICACION';
    SELECT array_agg(n.key ORDER BY n.key),
           jsonb_object_agg(n.key, to_jsonb(OLD) -> n.key),
           jsonb_object_agg(n.key, n.value)
      INTO v_changed, v_old, v_new
      FROM jsonb_each(to_jsonb(NEW) - 'passwordHash' - 'updatedAt') n
     WHERE n.value IS DISTINCT FROM (to_jsonb(OLD) -> n.key);

    IF (to_jsonb(NEW) -> 'passwordHash') IS DISTINCT FROM (to_jsonb(OLD) -> 'passwordHash') THEN
      v_changed := array_append(COALESCE(v_changed, '{}'), 'passwordHash');
    END IF;

    IF v_changed IS NULL THEN
      RETURN NULL;
    END IF;
  END IF;

  INSERT INTO "AuditLog" ("entity", "entityId", "action", "previousValues", "newValues", "changedFields", "userId", "date")
  VALUES (
    TG_TABLE_NAME,
    COALESCE((to_jsonb(NEW) ->> 'id')::integer, (to_jsonb(OLD) ->> 'id')::integer),
    v_action,
    v_old,
    v_new,
    v_changed,
    app_current_user_id(),
    -- Las columnas son timestamp sin zona y Prisma las lee como UTC.
    now() AT TIME ZONE 'UTC'
  );

  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DO $$
DECLARE
  t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'User', 'Department', 'Person', 'Supplier',
    'DeviceCategory', 'DeviceModel', 'DeviceStatus',
    'PurchaseOrder', 'PurchaseOrderItem', 'Receipt', 'ReceiptItem',
    'Device', 'DeviceAssignment',
    'Consumable', 'ConsumableAssignment'
  ] LOOP
    EXECUTE format(
      'CREATE TRIGGER audit_row AFTER INSERT OR UPDATE OR DELETE ON %I FOR EACH ROW EXECUTE FUNCTION audit_row()',
      t
    );
  END LOOP;
END $$;

-- Los movimientos toman el usuario de la sesión: el cliente no puede atribuirlos a otro.
CREATE OR REPLACE FUNCTION movement_set_user() RETURNS trigger AS $$
BEGIN
  NEW."userId" := COALESCE(app_current_user_id(), NEW."userId");
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER movement_set_user BEFORE INSERT ON "DeviceMovement"
  FOR EACH ROW EXECUTE FUNCTION movement_set_user();
CREATE TRIGGER movement_set_user BEFORE INSERT ON "ConsumableMovement"
  FOR EACH ROW EXECUTE FUNCTION movement_set_user();

-- El historial es de solo agregado: corregir un error es un movimiento nuevo.
CREATE OR REPLACE FUNCTION history_is_append_only() RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'El historial (%) no se puede modificar ni borrar', TG_TABLE_NAME
    USING ERRCODE = 'P0001';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER append_only BEFORE UPDATE OR DELETE ON "DeviceMovement"
  FOR EACH ROW EXECUTE FUNCTION history_is_append_only();
CREATE TRIGGER append_only BEFORE UPDATE OR DELETE ON "ConsumableMovement"
  FOR EACH ROW EXECUTE FUNCTION history_is_append_only();
CREATE TRIGGER append_only BEFORE UPDATE OR DELETE ON "AuditLog"
  FOR EACH ROW EXECUTE FUNCTION history_is_append_only();

ALTER TABLE "ConsumableStock"
  ADD CONSTRAINT "ConsumableStock_currentStock_nonnegative" CHECK ("currentStock" >= 0);