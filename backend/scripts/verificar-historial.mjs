// Verificación de historial, transacciones y reglas de estado contra la API local.
// Crea datos de prueba: correrlo solo contra una base de desarrollo.
// Uso (con el backend levantado): node scripts/verificar-historial.mjs <email-admin> <password-admin>
import { randomBytes } from 'node:crypto';

const BASE = process.env.API_URL ?? 'http://localhost:3000';
const [adminEmail, adminPassword] = process.argv.slice(2);
const run = randomBytes(3).toString('hex').toUpperCase();
let failures = 0;

function check(name, ok, extra = '') {
  if (!ok) failures++;
  console.log(`${ok ? 'OK  ' : 'FAIL'} ${name}${extra ? `  [${extra}]` : ''}`);
}

async function call(token, method, path, body) {
  const res = await fetch(BASE + path, {
    method,
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let data;
  try { data = JSON.parse(text); } catch { data = text; }
  return { status: res.status, data };
}

async function login(email, password) {
  const r = await call(null, 'POST', '/auth/login', { email, password });
  if (r.status !== 201) throw new Error(`login ${email}: ${r.status} ${JSON.stringify(r.data)}`);
  return r.data.accessToken;
}

const admin = await login(adminEmail, adminPassword);
const adminUser = (await call(admin, 'GET', '/users')).data.find((u) => u.email === adminEmail);
const A = (m, p, b) => call(admin, m, p, b);

// ---------- Datos base ----------
const cat = (await A('POST', '/device-categories', { name: `Test ${run}`, code: `T${run}` })).data;
const model = (await A('POST', '/device-models', { categoryId: cat.id, brand: 'Marca', model: `M-${run}` })).data;
const supplier = (await A('POST', '/suppliers', { name: `Proveedor ${run}` })).data;
const dept = (await A('POST', '/departments', { name: `Dependencia ${run}` })).data;
const person = (await A('POST', '/people', { firstName: 'Ana', lastName: run, fullName: `Ana ${run}`, employeeId: `20-${run}-1` })).data;

// ---------- Dispositivos ----------
const dev = (await A('POST', '/devices/manual-smart', { modelId: model.id, serialNumber: `SN-${run}`, statusCode: 'DISPONIBLE', location: 'Depósito' })).data;
check('Alta de dispositivo con tag generado', dev.tag === `T${run}0001`, dev.tag);

const assignAttempts = await Promise.all(
  Array.from({ length: 8 }, () => A('POST', '/assignments', { deviceId: dev.id, personId: person.id, location: 'Piso 3' })),
);
const assignOk = assignAttempts.filter((r) => r.status === 201);
check('8 asignaciones simultáneas del mismo equipo → solo 1 prospera', assignOk.length === 1,
  `éxitos=${assignOk.length}, estados=${assignAttempts.map((r) => r.status).join(',')}`);

const statusWhileAssigned = await A('PATCH', `/devices/${dev.id}/status`, { statusCode: 'EN_BAJA' });
check('No se puede dar de baja un equipo asignado', statusWhileAssigned.status === 400, statusWhileAssigned.data?.message);

const free = (await A('POST', '/devices/manual-smart', { modelId: model.id, serialNumber: `SN0-${run}`, statusCode: 'DISPONIBLE' })).data;
const toInUse = await A('PATCH', `/devices/${free.id}/status`, { statusCode: 'EN_FUNCIONAMIENTO' });
check('No se puede pasar a EN_FUNCIONAMIENTO sin asignar', toInUse.status === 400, toInUse.data?.message);

const patchStatus = await A('PATCH', `/devices/${dev.id}`, { statusId: 1 });
check('La edición genérica no cambia el estado', patchStatus.status === 400, patchStatus.data?.message);

const assignmentId = assignOk[0]?.data.id;
const returns = await Promise.all([1, 2, 3].map(() => A('PATCH', `/assignments/${assignmentId}/return`, { notes: 'Devuelto' })));
check('3 devoluciones simultáneas → solo 1 prospera', returns.filter((r) => r.status === 200).length === 1,
  returns.map((r) => r.status).join(','));

await A('PATCH', `/devices/${dev.id}`, { location: 'Taller', hostname: `HOST-${run}` });
await A('PATCH', `/devices/${dev.id}/status`, { statusCode: 'EN_REPARACION', notes: 'Pantalla rota' });

const movements = (await A('GET', `/devices/${dev.id}/movements`)).data;
const types = movements.map((m) => m.type).reverse();
check('Secuencia de movimientos completa',
  JSON.stringify(types) === JSON.stringify(['ALTA_MANUAL', 'ASIGNACION', 'DEVOLUCION', 'ACTUALIZACION', 'REPARACION']),
  types.join(' > '));
check('Todos los movimientos tienen usuario', movements.every((m) => m.user?.name === adminUser.name));
const asig = movements.find((m) => m.type === 'ASIGNACION');
check('La asignación registra el traslado de ubicación', asig?.previousLocation === 'Depósito' && asig?.newLocation === 'Piso 3');

const audit = (await A('GET', `/audit?entity=Device&entityId=${dev.id}`)).data.data;
const hostChange = audit.find((e) => e.changedFields?.includes('hostname'));
check('Auditoría registra el cambio de hostname con antes/después y usuario',
  hostChange && hostChange.previousValues.hostname === null && hostChange.newValues.hostname === `HOST-${run}` && hostChange.user?.name === adminUser.name);
check('Auditoría registra la creación', audit.some((e) => e.action === 'CREACION'));
const skewMs = Math.abs(new Date(audit[0].date) - new Date(movements[0].date));
check('Hora de auditoría coincide con la de movimientos (sin desfase de zona)', skewMs < 60_000, `${Math.round(skewMs / 1000)} s`);

// Asignación a dependencia
const dev2 = (await A('POST', '/devices/manual-smart', { modelId: model.id, serialNumber: `SN2-${run}`, statusCode: 'DISPONIBLE' })).data;
await A('POST', '/assignments', { deviceId: dev2.id, departmentId: dept.id });
const mov2 = (await A('GET', `/devices/${dev2.id}/movements`)).data.find((m) => m.type === 'ASIGNACION');
check('El movimiento de asignación a dependencia guarda la dependencia', mov2?.department?.name === dept.name);

// ---------- Consumibles ----------
const consA = (await A('POST', '/consumables', { name: 'Toner', model: `A-${run}` })).data;
const consB = (await A('POST', '/consumables', { name: 'Toner', model: `B-${run}` })).data;
const po = (await A('POST', '/purchase-orders', { number: `OC-${run}`, supplierId: supplier.id, date: new Date().toISOString() })).data;
const itemA = (await A('POST', '/purchase-order-items', { purchaseOrderId: po.id, itemType: 'CONSUMABLE', consumableId: consA.id, quantity: 20 })).data;
const itemB = (await A('POST', '/purchase-order-items', { purchaseOrderId: po.id, itemType: 'CONSUMABLE', consumableId: consB.id, quantity: 20 })).data;
const stock = async (id) => (await A('GET', `/consumables/${id}`)).data.stock.currentStock;

const rec1 = (await A('POST', '/receipts', { purchaseOrderId: po.id, receiptNumber: `R1-${run}`, receivedAt: new Date().toISOString(), items: [{ purchaseOrderItemId: itemA.id, receivedQuantity: 10 }] })).data;
check('Recepción suma stock', (await stock(consA.id)) === 10);

const editRec = await A('PATCH', `/receipts/${rec1.id}`, { items: [{ purchaseOrderItemId: itemA.id, receivedQuantity: 12 }] });
check('Editar recepción 10→12 deja stock 12 con ajuste', editRec.status === 200 && (await stock(consA.id)) === 12);

const consume = await Promise.all(
  Array.from({ length: 15 }, () => A('POST', '/consumable-movements', { consumableId: consA.id, type: 'SALIDA_POR_CONSUMO', quantity: 1 })),
);
check('15 consumos simultáneos con stock 12 → exactamente 12 prosperan',
  consume.filter((r) => r.status === 201).length === 12, `éxitos=${consume.filter((r) => r.status === 201).length}`);
check('El stock queda en 0 (sin pérdidas ni negativos)', (await stock(consA.id)) === 0);

await A('POST', '/receipts', { purchaseOrderId: po.id, receiptNumber: `R2-${run}`, receivedAt: new Date().toISOString(), items: [{ purchaseOrderItemId: itemB.id, receivedQuantity: 5 }] });
check('Una recepción nueva de otro consumible NO resetea el stock del primero', (await stock(consA.id)) === 0, `stockA=${await stock(consA.id)}`);
check('…y suma al segundo', (await stock(consB.id)) === 5);

const consAssign = await A('POST', '/consumable-assignments', { consumableId: consB.id, departmentId: dept.id, quantity: 2 });
check('Asignación de consumible a dependencia guarda la dependencia', consAssign.data?.department?.name === dept.name);

const consMovs = (await A('GET', `/consumable-movements?consumableId=${consA.id}`)).data;
const chain = [...consMovs].reverse().every((m, i, arr) => i === 0 || m.previousStock === arr[i - 1].newStock);
check('Cadena de movimientos de stock consistente (anterior = nuevo del previo)', chain, `${consMovs.length} movimientos`);
check('Movimientos de consumible con usuario', consMovs.every((m) => m.user?.name === adminUser.name));
check('Movimientos de consumible no exponen passwordHash', consMovs.every((m) => !('passwordHash' in (m.user ?? {}))));

// ---------- Roles ----------
const consultaEmail = `consulta.${run.toLowerCase()}@inventario.local`;
const consultaPassword = randomBytes(12).toString('base64url');
await A('POST', '/users', { name: `Consulta ${run}`, email: consultaEmail, password: consultaPassword, role: 'CONSULTA' });
const consulta = await login(consultaEmail, consultaPassword);
const deptByConsulta = await call(consulta, 'POST', '/departments', { name: `Hack ${run}` });
check('Usuario CONSULTA no puede crear dependencias', deptByConsulta.status === 403, String(deptByConsulta.status));
const auditByConsulta = await call(consulta, 'GET', `/audit?entity=Device&entityId=${dev.id}`);
check('Usuario CONSULTA puede leer la auditoría', auditByConsulta.status === 200);

// Dependencia con historial → baja lógica
const delDept = await A('DELETE', `/departments/${dept.id}`);
check('Borrar dependencia con historial la da de baja (no la borra)', delDept.status === 200 && delDept.data.active === false);

console.log(`\n${failures === 0 ? 'TODO OK' : `${failures} FALLAS`}  (corrida ${run}, device ${dev.id})`);
process.exit(failures ? 1 : 0);
