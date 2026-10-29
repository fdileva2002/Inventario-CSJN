// Verificación de roles, usuarios, tags, MAC y componentes contra la API local.
// Crea datos y usuarios de prueba: correrlo solo contra una base de desarrollo.
// Uso (con el backend levantado): node scripts/verificar-modelo.mjs <email-superadmin> <password>
import { randomBytes } from 'node:crypto';

const BASE = process.env.API_URL ?? 'http://localhost:3000';
const [adminEmail, adminPassword] = process.argv.slice(2);
const run = randomBytes(3).toString('hex').toUpperCase();
let failures = 0;
// MACs únicas por corrida (02:… = localmente administrada, no choca con equipos reales).
const runMac = (last) => ['02', '00', run.slice(0, 2), run.slice(2, 4), run.slice(4, 6), last].join(':');

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
const me = (await S('GET', '/auth/me')).data;
check('El admin del seed quedó como SUPERADMIN', me.role === 'SUPERADMIN', me.role);

// ---------- Usuarios de prueba por rol ----------
async function makeUser(role) {
  const email = `${role.toLowerCase()}.${run.toLowerCase()}@inventario.local`;
  const password = randomBytes(12).toString('base64url');
  const created = await S('POST', '/users', { name: `${role} ${run}`, email, password, role });
  return { id: created.data.id, email, password, token: await login(email, password) };
}
const adm = await makeUser('ADMINISTRADOR');
const tec = await makeUser('TECNICO');
const con = await makeUser('CONSULTA');
const as = (u) => (m, p, b) => call(u.token, m, p, b);

// ---------- Datos base ----------
const cat = (await S('POST', '/device-categories', { name: `Cat ${run}`, code: `Q${run}` })).data;
const catX = (await S('POST', '/device-categories', { name: `CatX ${run}`, code: `Q${run}X` })).data;
const model = (await S('POST', '/device-models', { categoryId: cat.id, brand: 'Marca', model: `M-${run}` })).data;
const modelX = (await S('POST', '/device-models', { categoryId: catX.id, brand: 'Marca', model: `MX-${run}` })).data;
const person = (await S('POST', '/people', { firstName: 'Beto', lastName: run, fullName: `Beto ${run}`, employeeId: `27-${run}-2` })).data;
const smart = (who, body) => who('POST', '/devices/manual-smart', { modelId: model.id, statusCode: 'DISPONIBLE', ...body });

// ---------- Permisos por rol ----------
const admDevice = await smart(as(adm), { serialNumber: `ADM-${run}` });
check('Administrador puede dar de alta un equipo', admDevice.status === 201, String(admDevice.status));
check('Técnico NO puede dar de alta un equipo', (await smart(as(tec), { serialNumber: `TEC-${run}` })).status === 403);
check('Consulta NO puede dar de alta un equipo', (await smart(as(con), { serialNumber: `CON-${run}` })).status === 403);

const tecAssign = await as(tec)('POST', '/assignments', { deviceId: admDevice.data.id, personId: person.id });
check('Técnico puede asignar un equipo', tecAssign.status === 201, String(tecAssign.status));
check('Técnico puede devolverlo', (await as(tec)('PATCH', `/assignments/${tecAssign.data.id}/return`, {})).status === 200);
check('Técnico NO puede cambiar el estado', (await as(tec)('PATCH', `/devices/${admDevice.data.id}/status`, { statusCode: 'DISPONIBLE' })).status === 403);
check('Técnico NO puede editar la MAC del equipo', (await as(tec)('PATCH', `/devices/${admDevice.data.id}`, { macAddress: runMac('ff') })).status === 403);
check('Consulta NO puede asignar', (await as(con)('POST', '/assignments', { deviceId: admDevice.data.id, personId: person.id })).status === 403);
check('Administrador NO puede borrar un equipo', (await as(adm)('DELETE', `/devices/${admDevice.data.id}`)).status === 403);

const cons = (await S('POST', '/consumables', { name: 'Toner', model: `R-${run}` })).data;
check('Superadmin puede ajustar stock', (await S('POST', '/consumable-movements', { consumableId: cons.id, type: 'AJUSTE_POSITIVO', quantity: 5 })).status === 201);
check('Administrador NO puede ajustar stock', (await as(adm)('POST', '/consumable-movements', { consumableId: cons.id, type: 'AJUSTE_POSITIVO', quantity: 5 })).status === 403);
check('Técnico puede registrar un consumo', (await as(tec)('POST', '/consumable-movements', { consumableId: cons.id, type: 'SALIDA_POR_CONSUMO', quantity: 1 })).status === 201);
check('Técnico puede entregar consumibles', (await as(tec)('POST', '/consumable-assignments', { consumableId: cons.id, personId: person.id, quantity: 1 })).status === 201);

check('Consulta ahora puede ver proveedores (antes 403)', (await as(con)('GET', '/suppliers')).status === 200);
check('Consulta ahora puede ver recepciones (antes 403)', (await as(con)('GET', '/receipts')).status === 200);
check('Consulta NO puede crear recepciones (antes podía)', (await as(con)('POST', '/receipts', { purchaseOrderId: 1, receivedAt: new Date().toISOString(), items: [{ purchaseOrderItemId: 1, receivedQuantity: 1 }] })).status === 403);
check('Administrador NO puede administrar usuarios', (await as(adm)('GET', '/users')).status === 403);

// ---------- Usuarios ----------
check('Nadie cambia la contraseña de otro', (await as(adm)('PATCH', `/users/${tec.id}/password`, { currentPassword: 'x', password: 'nueva123' })).status === 403);
check('Cambiar la propia exige la contraseña actual correcta', (await as(con)('PATCH', `/users/${con.id}/password`, { currentPassword: 'incorrecta', password: 'nueva123' })).status === 400);
const ownChange = await as(con)('PATCH', `/users/${con.id}/password`, { currentPassword: con.password, password: `${con.password}!` });
check('Cada uno puede cambiar la propia', ownChange.status === 200, String(ownChange.status));

const reset = await S('PATCH', `/users/${tec.id}/reset-password`);
const temp = reset.data.temporaryPassword;
check('El reset genera una temporal aleatoria (antes fija)', reset.status === 200 && typeof temp === 'string' && temp.length === 10 && temp !== 'Cdl%4884');
check('…y sirve para entrar', (await call(null, 'POST', '/auth/login', { email: tec.email, password: temp })).status === 201);

const demote = await S('PATCH', `/users/${me.id}`, { role: 'CONSULTA' });
check('No se puede degradar al último Superadmin', demote.status === 400, demote.data?.message);

await S('PATCH', `/users/${adm.id}`, { active: false });
check('Un usuario desactivado pierde el acceso al instante (token vigente)', (await as(adm)('GET', '/devices')).status === 401);
await S('PATCH', `/users/${adm.id}`, { role: 'CONSULTA', active: true });
const admMe = await as(adm)('GET', '/auth/me');
check('Un cambio de rol rige sin volver a loguearse', admMe.data?.role === 'CONSULTA', admMe.data?.role);

// ---------- Tags ----------
await call(su, 'POST', '/devices/manual-smart', { modelId: modelX.id, serialNumber: `X1-${run}`, statusCode: 'DISPONIBLE' });
const firstQ = (await smart(S, { serialNumber: `Q1-${run}` })).data;
// 0001 es el equipo que cargó el Administrador; el de la categoría QxxxX no cuenta.
check('Un prefijo parecido (QxxxX) no afecta la numeración', firstQ.tag === `Q${run}0002`, firstQ.tag);
await S('POST', '/devices', {
  tag: `Q${run}9999`, serialNumber: `Q9999-${run}`, categoryId: cat.id, modelId: model.id,
  statusId: firstQ.status.id, entryDate: new Date().toISOString(),
});
const after9999 = (await smart(S, { serialNumber: `Q10000-${run}` })).data;
check('Después de 9999 sigue 10000 (antes se repetía)', after9999.tag === `Q${run}10000`, after9999.tag);
const burst = await Promise.all(Array.from({ length: 6 }, (_, i) => smart(S, { serialNumber: `QB${i}-${run}` })));
const burstTags = burst.map((r) => r.data.tag);
check('6 altas simultáneas → 6 tags distintos y correlativos',
  burst.every((r) => r.status === 201) && new Set(burstTags).size === 6 && burstTags.sort().join() === [10001, 10002, 10003, 10004, 10005, 10006].map((n) => `Q${run}${n}`).join(),
  burstTags.join(','));

// ---------- MAC ----------
const macDev = await smart(S, { serialNumber: `MAC1-${run}`, macAddress: runMac('a1').replace(/:/g, '-').toLowerCase() });
check('La MAC se normaliza a AA:BB:CC:DD:EE:FF', macDev.data.macAddress === runMac('A1'), macDev.data.macAddress);
const dupMac = await smart(S, { serialNumber: `MAC2-${run}`, macAddress: runMac('a1').replace(/:/g, '') });
check('MAC repetida (escrita distinto) se rechaza con mensaje claro', dupMac.status === 400 && /MAC/.test(dupMac.data.message), dupMac.data.message);
check('MAC inválida se rechaza', (await smart(S, { serialNumber: `MAC3-${run}`, macAddress: '12:34' })).status === 400);
const dupSerial = await smart(S, { serialNumber: `MAC1-${run}` });
check('Serial repetido se rechaza con mensaje claro', dupSerial.status === 400 && /serie/.test(dupSerial.data.message), dupSerial.data.message);
const macHit = (await S('GET', `/devices?search=${encodeURIComponent(runMac('A1'))}`)).data.data;
check('La búsqueda encuentra por MAC', macHit.some((d) => d.id === macDev.data.id));
const clearMac = await S('PATCH', `/devices/${macDev.data.id}`, { macAddress: '' });
check('Borrar la MAC la deja vacía', clearMac.status === 200 && clearMac.data.macAddress === null);

// ---------- Componentes ----------
const devA = (await smart(S, { serialNumber: `CA-${run}` })).data;
const devB = (await smart(S, { serialNumber: `CB-${run}` })).data;
const ram = (await S('POST', '/components', { type: 'Memoria RAM', brand: 'Kingston', capacity: '16 GB', serialNumber: `RAM-${run}` })).data;
check('Alta de componente en depósito', ram.status === 'DISPONIBLE');
check('Serial de componente repetido se rechaza', (await S('POST', '/components', { type: 'Memoria RAM', serialNumber: `RAM-${run}` })).status === 400);

// Dos instalaciones simultáneas: según el orden, una falla o la segunda queda como
// "mover". En cualquier caso el componente termina en un solo equipo y el historial cierra.
await Promise.all([devA, devB].map((d) => as(tec)('POST', `/components/${ram.id}/install`, { deviceId: d.id })));
const afterRace = (await S('GET', `/components/${ram.id}`)).data;
const raceMovs = (await S('GET', `/components/${ram.id}/movements`)).data;
const lastInstall = raceMovs.find((m) => m.type === 'INSTALACION');
const installs = raceMovs.filter((m) => m.type === 'INSTALACION').length;
const removals = raceMovs.filter((m) => m.type === 'RETIRO').length;
check('Instalaciones simultáneas: queda en un solo equipo, coherente con su historial',
  afterRace.status === 'INSTALADO' && afterRace.device.id === lastInstall.device.id && installs - removals === 1,
  `en ${afterRace.device?.tag}, ${installs} instalaciones / ${removals} retiros`);

const otherDev = afterRace.device.id === devA.id ? devB : devA;
const moved = await as(tec)('POST', `/components/${ram.id}/install`, { deviceId: otherDev.id });
check('Técnico puede mover el componente a otro equipo', moved.status === 201 && moved.data.device.id === otherDev.id);
check('Instalar donde ya está se rechaza', (await S('POST', `/components/${ram.id}/install`, { deviceId: otherDev.id })).status === 400);
check('Consulta NO puede instalar', (await as(con)('POST', `/components/${ram.id}/uninstall`, {})).status === 403);
check('Técnico puede retirarlo', (await as(tec)('POST', `/components/${ram.id}/uninstall`, { notes: 'Se cambió por una de 32' })).status === 201);
check('Técnico NO puede darlo de baja', (await as(tec)('POST', `/components/${ram.id}/discard`, {})).status === 403);
check('Superadmin puede darlo de baja', (await S('POST', `/components/${ram.id}/discard`, { notes: 'Falla de memoria' })).data.status === 'BAJA');
check('Un componente de baja no se instala', (await S('POST', `/components/${ram.id}/install`, { deviceId: devA.id })).status === 400);

const ramMovs = (await S('GET', `/components/${ram.id}/movements`)).data.map((m) => m.type).reverse();
const middle = ramMovs.slice(1, -1).join(' > ');
check('Historial completo del componente (alta, instalaciones/retiros alternados, baja)',
  ramMovs[0] === 'ALTA' && ramMovs.at(-1) === 'BAJA' && /^(INSTALACION > RETIRO)( > INSTALACION > RETIRO)*$/.test(middle),
  ramMovs.join(' > '));
const devMovs = (await S('GET', `/components/movements?deviceId=${otherDev.id}`)).data;
check('El equipo muestra lo que se le instaló y retiró, con usuario',
  devMovs.length >= 2 && devMovs.every((m) => m.user?.name === `TECNICO ${run}`), devMovs.map((m) => `${m.type}/${m.user?.name}`).join(','));
const ssd = (await S('POST', '/components', { type: 'Disco', capacity: '512 GB SSD', deviceId: devA.id })).data;
check('Alta de componente directamente instalado', ssd.status === 'INSTALADO' && ssd.device.id === devA.id);
const compAudit = (await S('GET', `/audit?entity=Component&entityId=${ram.id}`)).data.data;
check('Los cambios de componentes quedan auditados', compAudit.length >= 4);

// ---------- MAC en carga desde recepción ----------
const sup = (await S('POST', '/suppliers', { name: `Prov ${run}` })).data;
const po = (await S('POST', '/purchase-orders', { number: `OC2-${run}`, supplierId: sup.id, date: new Date().toISOString() })).data;
const item = (await S('POST', '/purchase-order-items', { purchaseOrderId: po.id, itemType: 'DEVICE', deviceModelId: model.id, quantity: 2 })).data;
const rec = (await S('POST', '/receipts', { purchaseOrderId: po.id, receivedAt: new Date().toISOString(), items: [{ purchaseOrderItemId: item.id, receivedQuantity: 2 }] })).data;
const dupInLoad = await S('POST', `/receipts/${rec.id}/devices`, { devices: [{ serialNumber: `R1-${run}`, macAddress: runMac('b1') }, { serialNumber: `R2-${run}`, macAddress: runMac('b1').replace(/:/g, '') }] });
check('Recepción: MAC repetida dentro de la carga se rechaza', dupInLoad.status === 400, dupInLoad.data.message);
const recLoad = await S('POST', `/receipts/${rec.id}/devices`, { devices: [{ serialNumber: `R1-${run}`, macAddress: runMac('b1') }, { serialNumber: `R2-${run}` }] });
check('Recepción: carga con MAC opcional', recLoad.status === 201 && recLoad.data.devices[0].macAddress === runMac('B1') && recLoad.data.devices[1].macAddress === null);

console.log(`\n${failures === 0 ? 'TODO OK' : `${failures} FALLAS`}  (corrida ${run})`);
process.exit(failures ? 1 : 0);
