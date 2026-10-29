// Verificación de la Fase 3 (movimientos, entregas múltiples, ampliaciones, exportación,
// permisos del técnico) contra la API local. Crea datos y usuarios de prueba: correrlo
// solo contra una base de desarrollo.
// Uso (con el backend levantado): node scripts/verificar-fase3.mjs <email-superadmin> <password>
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

const su = await login(adminEmail, adminPassword);
const S = (m, p, b) => call(su, m, p, b);

async function makeUser(role) {
  const email = `${role.toLowerCase()}.f3.${run.toLowerCase()}@inventario.local`;
  const password = randomBytes(12).toString('base64url');
  await S('POST', '/users', { name: `${role} ${run}`, email, password, role });
  return { token: await login(email, password) };
}
const tec = await makeUser('TECNICO');
const con = await makeUser('CONSULTA');
const as = (u) => (m, p, b) => call(u.token, m, p, b);

// ---------- Datos base ----------
const cat = (await S('POST', '/device-categories', { name: `Cat F3 ${run}`, code: `F${run}` })).data;
const model = (await S('POST', '/device-models', { categoryId: cat.id, brand: 'Marca', model: `F3-${run}` })).data;
const dept = (await S('POST', '/departments', { name: `Dep F3 ${run}` })).data;
const person = (await S('POST', '/people', { firstName: 'Ana', lastName: run, fullName: `Ana ${run}`, employeeId: `20-${run}-1` })).data;
const other = (await S('POST', '/people', { firstName: 'Otro', lastName: run, fullName: `Otro ${run}`, employeeId: `20-${run}-2` })).data;
const device = (await S('POST', '/devices/manual-smart', {
  modelId: model.id, statusCode: 'DISPONIBLE', serialNumber: `F3-${run}`, location: `Piso ${run}`,
})).data;

// ---------- CUIL repetido ----------
const dupCreate = await S('POST', '/people', { firstName: 'X', lastName: run, fullName: `X ${run}`, employeeId: person.employeeId });
check('Alta con CUIL repetido da error claro', dupCreate.status === 400 && /CUIL/.test(dupCreate.data.message), String(dupCreate.status));
const dupEdit = await S('PATCH', `/people/${other.id}`, { employeeId: person.employeeId });
check('Edición con CUIL repetido da error claro (antes era 500)', dupEdit.status === 400 && /CUIL/.test(dupEdit.data.message), `${dupEdit.status} ${dupEdit.data.message}`);

// ---------- Permisos del técnico sobre datos del equipo ----------
const tecEdit = await as(tec)('PATCH', `/devices/${device.id}`, { hostname: `PC-${run}`, location: `Oficina ${run}`, notes: 'Cambio de nombre' });
check('Técnico puede editar hostname, ubicación y notas', tecEdit.status === 200 && tecEdit.data.hostname === `PC-${run}`, String(tecEdit.status));
check('Técnico NO puede editar la MAC', (await as(tec)('PATCH', `/devices/${device.id}`, { macAddress: '02:00:00:00:00:01' })).status === 403);
check('Técnico NO puede editar el número de serie', (await as(tec)('PATCH', `/devices/${device.id}`, { serialNumber: 'OTRO' })).status === 403);
check('Consulta NO puede editar el hostname', (await as(con)('PATCH', `/devices/${device.id}`, { hostname: 'X' })).status === 403);

// ---------- Auditoría con nombres ----------
await S('PATCH', `/devices/${device.id}`, { supplierId: undefined, hostname: `PC2-${run}` });
const audit = (await S('GET', `/audit?entity=Device&entityId=${device.id}`)).data;
check('La auditoría devuelve nombres para los ids', audit.references?.statusId && Object.values(audit.references.statusId).includes('Disponible'), JSON.stringify(audit.references));

// ---------- Movimientos de equipos ----------
const assign = await S('POST', '/assignments', { deviceId: device.id, personId: person.id });
await S('PATCH', `/assignments/${assign.data.id}/return`, {});
const byPerson = (await S('GET', `/movements?kind=DEVICE&personId=${person.id}`)).data;
check('Movimientos filtrados por persona', byPerson.total >= 2 && byPerson.data.every((m) => m.recipient === person.fullName), `total ${byPerson.total}`);
const onlyAssign = (await S('GET', `/movements?kind=DEVICE&personId=${person.id}&types=ASIGNACION`)).data;
check('Filtro por tipo de movimiento', onlyAssign.total === 1 && onlyAssign.data[0].type === 'ASIGNACION', `total ${onlyAssign.total}`);
check('Los totales por tipo ignoran el filtro de tipo', onlyAssign.summary.some((s) => s.type === 'DEVOLUCION' && s.count >= 1));
const future = (await S('GET', `/movements?kind=DEVICE&personId=${person.id}&from=2099-01-01T00:00:00Z`)).data;
check('Filtro por fecha (desde)', future.total === 0, `total ${future.total}`);
const today = new Date(); today.setHours(0, 0, 0, 0);
const tomorrow = new Date(today); tomorrow.setDate(tomorrow.getDate() + 1);
const todayOnly = (await S('GET', `/movements?kind=DEVICE&personId=${person.id}&from=${today.toISOString()}&to=${tomorrow.toISOString()}`)).data;
check('Filtro por rango de un día', todayOnly.total === byPerson.total, `${todayOnly.total} de ${byPerson.total}`);
check('Tipo inválido da 400', (await S('GET', '/movements?kind=DEVICE&types=FOO')).status === 400);
check('Consulta puede ver movimientos', (await as(con)('GET', '/movements?kind=CONSUMABLE')).status === 200);
const exported = await S('GET', `/movements/export?kind=DEVICE&personId=${person.id}`);
check('Exportación de movimientos trae todas las filas', Array.isArray(exported.data) && exported.data.length === byPerson.total);

// ---------- Entrega de varios consumibles ----------
const c1 = (await S('POST', '/consumables', { name: 'Toner', model: `A-${run}`, variant: 'Negro' })).data;
const c2 = (await S('POST', '/consumables', { name: 'Toner', model: `B-${run}`, variant: 'Cyan' })).data;
await S('POST', '/consumable-movements', { consumableId: c1.id, type: 'AJUSTE_POSITIVO', quantity: 5 });
await S('POST', '/consumable-movements', { consumableId: c2.id, type: 'AJUSTE_POSITIVO', quantity: 2 });
const stockOf = async (id) => (await S('GET', `/consumables/${id}`)).data.stock?.currentStock;

const batch = await as(tec)('POST', '/consumable-assignments/batch', {
  departmentId: dept.id,
  items: [{ consumableId: c1.id, quantity: 3 }, { consumableId: c2.id, quantity: 1 }],
});
check('Técnico entrega dos consumibles en una operación', batch.status === 201 && batch.data.length === 2, String(batch.status));
check('Se descuentan los dos stocks', (await stockOf(c1.id)) === 2 && (await stockOf(c2.id)) === 1);

const tooMuch = await S('POST', '/consumable-assignments/batch', {
  personId: person.id,
  items: [{ consumableId: c1.id, quantity: 1 }, { consumableId: c2.id, quantity: 5 }],
});
check('Si a uno le falta stock, falla e indica cuál', tooMuch.status === 400 && tooMuch.data.message.includes(`B-${run}`), tooMuch.data.message);
check('…y no se entrega ninguno (el otro stock queda igual)', (await stockOf(c1.id)) === 2);
check('Consumible repetido en la entrega da 400', (await S('POST', '/consumable-assignments/batch', {
  personId: person.id, items: [{ consumableId: c1.id, quantity: 1 }, { consumableId: c1.id, quantity: 1 }],
})).status === 400);
check('Consulta NO puede entregar', (await as(con)('POST', '/consumable-assignments/batch', {
  personId: person.id, items: [{ consumableId: c1.id, quantity: 1 }],
})).status === 403);

const byDept = (await S('GET', `/movements?kind=CONSUMABLE&departmentId=${dept.id}`)).data;
check('Las salidas quedan con la dependencia y se filtran por ella', byDept.total === 2 && byDept.data.every((m) => m.recipient === dept.name), `total ${byDept.total}`);
const salida = byDept.summary.find((s) => s.type === 'SALIDA_POR_CONSUMO');
check('El resumen suma unidades entregadas', salida?.quantity === 4, JSON.stringify(salida));
const single = await S('POST', '/consumable-assignments', { consumableId: c1.id, personId: person.id, quantity: 1 });
check('La entrega simple sigue funcionando', single.status === 201 && single.data.consumableId === c1.id);

// ---------- Ampliaciones de OC ----------
const supplier = (await S('POST', '/suppliers', { name: `Prov F3 ${run}`, phone: '011-4444-5555' })).data;
check('El proveedor guarda el teléfono', supplier.phone === '011-4444-5555');
const original = (await S('POST', '/purchase-orders', { number: `F3-${run}`, supplierId: supplier.id, date: new Date().toISOString() })).data;
const amp = await S('POST', '/purchase-orders', { number: `F3A-${run}`, supplierId: supplier.id, date: new Date().toISOString(), parentOrderId: original.id });
check('Se crea una ampliación', amp.status === 201 && amp.data.parentOrderId === original.id);
const originalNow = (await S('GET', `/purchase-orders/${original.id}`)).data;
check('La original muestra quién la amplía', originalNow.childOrders?.some((o) => o.id === amp.data.id));
const ampNow = (await S('GET', `/purchase-orders/${amp.data.id}`)).data;
check('La ampliación muestra su original', ampNow.parentOrder?.id === original.id);
check('No se puede borrar una original con ampliaciones', (await S('DELETE', `/purchase-orders/${original.id}`)).status === 400);
check('Ampliación de una orden inexistente da 404', (await S('POST', '/purchase-orders', {
  number: `F3B-${run}`, supplierId: supplier.id, date: new Date().toISOString(), parentOrderId: 999999999,
})).status === 404);

// ---------- Exportación de dispositivos ----------
const comp = (await S('POST', '/components', { type: 'Memoria', capacity: '8 GB', serialNumber: `MEM-${run}` })).data;
await S('POST', `/components/${comp.id}/install`, { deviceId: device.id });
const exportDevices = await S('GET', `/devices/export?search=${encodeURIComponent(device.tag)}`);
const exportedDevice = exportDevices.data.find?.((d) => d.id === device.id);
check('La exportación trae los componentes instalados', exportedDevice?.components?.some((c) => c.id === comp.id), String(exportDevices.status));
const byLocation = (await S('GET', `/devices?location=${encodeURIComponent(`Oficina ${run}`)}`)).data;
check('El filtro por ubicación funciona (antes daba 400)', byLocation.total === 1, `total ${byLocation.total}`);
check('El límite por página tiene tope', (await S('GET', '/devices?limit=5000')).status === 400);

console.log(failures === 0 ? '\nTODO OK' : `\n${failures} verificación(es) fallaron`);
process.exit(failures === 0 ? 0 : 1);
