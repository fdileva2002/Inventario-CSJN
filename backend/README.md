# Inventario TI — CSJN

Sistema web de inventario de TI para gestión de dispositivos, consumibles, personas, órdenes de compra y asignaciones.

---

## Stack tecnológico

| Capa | Tecnología |
|---|---|
| Frontend | React + Vite + TypeScript |
| UI | Material UI (MUI) |
| Backend | NestJS + TypeScript |
| Base de datos | PostgreSQL |
| ORM | Prisma |
| Auth | JWT |

---

## Estructura del proyecto

```
InventarioSop/
├── backend/          # NestJS API
│   ├── prisma/       # Schema y migraciones
│   └── src/
│       ├── assignments/
│       ├── auth/
│       ├── consumable-assignments/
│       ├── consumable-movements/
│       ├── consumables/
│       ├── dashboard/
│       ├── departments/
│       ├── device-categories/
│       ├── device-models/
│       ├── devices/
│       ├── people/
│       ├── purchase-order-items/
│       ├── purchase-orders/
│       ├── receipts/
│       ├── suppliers/
│       └── users/
└── frontend/         # React App
    └── src/
        ├── api/
        ├── auth/
        ├── components/
        ├── pages/
        └── router/
```

---

## Requisitos previos

- Node.js 18+
- PostgreSQL corriendo localmente
- Git

---

## Instalación en una nueva computadora

### 1. Clonar el repositorio

```bash
git clone https://github.com/fdileva2002/Inventario-CSJN.git
cd Inventario-CSJN
```

### 2. Configurar el backend

```bash
cd backend
npm install
```

Crear el archivo `.env` en la carpeta `backend/`:

```env
DATABASE_URL="postgresql://USUARIO:PASSWORD@localhost:5432/inventario_csjn"
JWT_SECRET="tu_clave_secreta_jwt"
```

Reemplazá `USUARIO` y `PASSWORD` con los datos de tu PostgreSQL local.

Correr las migraciones y generar el cliente de Prisma:

```bash
npx prisma migrate dev
npx prisma generate
```

Cargar datos iniciales (seed):

```bash
npx prisma db seed
```

Iniciar el servidor:

```bash
npm run start:dev
```

El backend corre en `http://localhost:3000`

### 3. Configurar el frontend

```bash
cd ../frontend
npm install
npm run dev
```

El frontend corre en `http://localhost:5173`

---

## Usuario inicial

Después de correr el seed, el usuario administrador es:

| Campo | Valor |
|---|---|
| Email | admin@inventario.local |
| Contraseña | Admin1234! |

---

## Roles de usuario

| Rol | Puede |
|---|---|
| `SUPERADMIN` | Todo: también borrar, ajustar stock y administrar usuarios |
| `ADMINISTRADOR` | Cargar y editar (equipos, consumibles, OC, recepciones, personas, componentes), cambiar estados. No borra ni ajusta stock |
| `TECNICO` | Asignar y devolver equipos, editar hostname, ubicación y notas, entregar consumibles, instalar/mover/retirar componentes |
| `CONSULTA` | Solo ver |

Los permisos se definen por grupo en `src/auth/roles.ts` (`LECTURA`, `ASIGNACION`, `CARGA`, `TOTAL`) y cada endpoint declara uno. El frontend replica la tabla en `frontend/src/auth/permissions.ts` solo para mostrar u ocultar botones: quien hace cumplir los permisos es el backend.

- El rol y el estado activo se leen de la base en cada request: desactivar a alguien o cambiarle el rol rige al instante, sin esperar a que venza su sesión.
- No se puede quitar el rol ni desactivar al último Superadmin activo.
- Cada usuario cambia solo su propia contraseña (con la actual). El Superadmin blanquea las de otros: se genera una temporal aleatoria.

Los roles se gestionan desde la página **Usuarios** (solo visible para Superadmin).

---

## Módulos implementados (MVP)

### Dispositivos
- Alta manual con generación automática de tag según categoría (ej: `NBK0001`, `MON0003`). El número sigue después de 9999 (`NBK10000`), un prefijo no se mezcla con otro parecido (`PC` / `PCX`) y dos altas simultáneas nunca reciben el mismo tag (`src/devices/device-tag.ts`)
- MAC address opcional, única, normalizada a `AA:BB:CC:DD:EE:FF` (acepta guiones, puntos o sin separadores). También en la importación de Excel de recepciones (columna `macAddress` o `MAC`)
- Hostname, MAC, ubicación y notas editables en cualquier estado
- Gestión de estados: A configurar / Disponible / En funcionamiento / En reparación / En baja
- Asignación a **persona** o **dependencia**
- Devolución automática a estado "A configurar"
- Cambio de ubicación al asignar
- Filtros avanzados: tag, serial, hostname, modelo, categoría, estado, persona/dependencia, ubicación
- Paginación (40 por página)
- Historial de movimientos por dispositivo, con los cambios de datos mostrando nombres (estado, modelo...) en lugar de ids
- Exportar a Excel **todo el resultado de la búsqueda** (no solo la página), con asignación vigente, componentes instalados, proveedor, OC, fechas y notas; los componentes van además en una hoja aparte (`GET /devices/export`, hasta 20.000 equipos)
- Chips de color por estado

### Movimientos
- Pantalla única para consultar el historial de **equipos**, **consumibles** y **componentes**
- Filtros: rango de fechas (con atajos: hoy, últimos 7 días, este mes, mes anterior, este año, todo), tipo de movimiento (uno o varios), persona, dependencia y búsqueda por equipo o consumible
- Totales por tipo en el período (en consumibles, también las unidades): responden "cuántas asignaciones / entregas / bajas hubo en tal período". Al tocar una tarjeta se filtra por ese tipo
- Exportar a Excel con una hoja de resumen (filtros usados y totales) y otra con todos los movimientos (`GET /movements/export`, hasta 50.000)
- Desde Personas ("Ver todos los movimientos") y Dependencias ("Ver movimientos") se abre ya filtrada
- Las entregas de consumibles guardan a quién se entregaron (persona o dependencia). Las anteriores a la migración `movimientos_consumibles` conservan el destinatario solo en el texto del detalle

### Componentes
- Piezas con seguimiento propio (memoria, disco, fuente...), con número de serie opcional y único
- Estados: en depósito / instalado / de baja
- Instalar en un equipo, mover a otro (queda el retiro del anterior), retirar y dar de baja, con historial y usuario
- El detalle del dispositivo muestra los componentes instalados y todo lo que se le instaló o retiró

### Consumibles
- Stock por cantidad (no por unidad individual)
- Movimientos: ingreso por compra, salida por consumo, ajuste positivo/negativo
- Alerta de stock bajo
- Entrega a personas o dependencias: varios consumibles en una sola entrega, buscando entre cartuchos y otros insumos. Se descuentan todos o ninguno: si a uno le falta stock, se avisa cuál y no se entrega nada
- Exportar a Excel

### Personas
- Alta, baja lógica y edición
- Asociación a dependencia mediante dropdown
- Historial de dispositivos y consumibles asignados
- Exportar a Excel

### Dependencias
- ABM completo
- Asociadas a personas y asignaciones de dispositivos

### Órdenes de compra
- Cabecera con número, proveedor, fecha y estado (PENDIENTE / PARCIAL / COMPLETA / ANULADA)
- Ítems de tipo dispositivo o consumible (con su color / variante)
- Filtro por categoría al agregar ítems de dispositivo
- Crear proveedor, modelo o consumible sin salir de la orden
- Ampliaciones: una orden puede ser ampliación de otra. En la lista y en el detalle se ve "Ampliación de X" y "Ampliada por Y" (al tocarlo se abre esa orden). No se puede borrar una orden original que tenga ampliaciones
- Recepciones parciales o totales
- Estado visual de dispositivos cargados por recepción (ej: "2/5 cargados")
- Bloqueo de carga duplicada de dispositivos
- Eliminar órdenes

### Recepciones
- Creación automática de dispositivos desde recepción
- Importación desde Excel
- Incremento automático de stock de consumibles
- Actualización automática del estado de la OC

### Categorías y modelos
- Categorías con código de tag personalizado
- Modelos anidados dentro de cada categoría
- Generación automática de tags usando el código de la categoría
- Editar y eliminar categorías

### Proveedores
- ABM completo con búsqueda, CUIT, teléfono y email

### Pantallas chicas
- En celulares y tablets (menos de 1200 px de ancho) el menú se abre con el botón ☰
- Filtros y formularios se acomodan en una columna; las tablas se desplazan de costado en lugar de cortarse

### Usuarios
- Crear usuarios con cualquiera de los 4 roles
- Cambiar rol de cualquier usuario
- Cambiar contraseña propia (validando contraseña actual)
- Blanquear contraseña de otros usuarios (asigna una temporal aleatoria)
- Activar/desactivar usuarios

### Dashboard
- Bienvenida con nombre del usuario y fecha actual
- Resumen: dispositivos a configurar, consumibles con stock bajo, OC pendientes y parciales
- Alertas detalladas con tablas
- Últimos movimientos de dispositivos

---

## Reglas de negocio importantes

- Solo se pueden asignar dispositivos en estado **DISPONIBLE**
- Al asignar, el dispositivo pasa a **EN FUNCIONAMIENTO**
- Al devolver, el dispositivo pasa automáticamente a **A CONFIGURAR**
- Un dispositivo EN FUNCIONAMIENTO solo puede ser devuelto, no cambiar de estado directamente
- Los dispositivos se asignan a una **persona** O a una **dependencia**, no a ambas
- El stock de consumibles nunca se modifica silenciosamente — todo cambio genera un movimiento
- Las recepciones pueden ser parciales pero no superar la cantidad pedida en la OC
- Los tags se generan automáticamente usando el código de la categoría (ej: `MON` → `MON0001`)
- No se puede eliminar una categoría que tenga modelos o dispositivos asociados
- No se puede eliminar una dependencia que tenga personas asociadas
- Una dependencia con historial (asignaciones o movimientos) se da de baja lógica en lugar de borrarse
- El estado de un dispositivo no se cambia desde "Editar": solo asignando, devolviendo o con "Cambiar estado"

---

## Historial y auditoría

El historial se garantiza en la base de datos (migración `historial_confiable`), no solo en el código:

- **Movimientos** (`DeviceMovement`, `ConsumableMovement`): el historial operativo (asignaciones, devoluciones, cambios de estado, traslados, ingresos y consumos). Cada uno registra el usuario que lo hizo.
- **Auditoría** (`AuditLog`): un trigger registra toda alta, modificación o baja en las tablas principales, con los valores de antes y después de cada campo modificado y el usuario. Captura también cambios hechos a mano por SQL. Se consulta con `GET /audit?entity=Device&entityId=1`.
- **Solo agregado**: movimientos y auditoría no se pueden modificar ni borrar (lo impide un trigger). Un error se corrige con un movimiento nuevo, por ejemplo un ajuste de stock.
- **Usuario**: toda escritura del backend pasa por `prisma.transaction(...)`, que informa a la base el usuario logueado (`app.user_id`). Las escrituras nuevas tienen que usar ese método y no `this.prisma.<modelo>.create/update/delete` directo, o la auditoría queda sin usuario.
- **Stock**: se modifica únicamente con `applyStockMovement` (`src/consumables/consumable-stock.ts`), que bloquea la fila para que dos operaciones simultáneas no se pisen. La base rechaza stock negativo.

Para verificar todo esto contra una base de desarrollo (crea datos de prueba), con el backend levantado:

```bash
node scripts/verificar-historial.mjs admin@inventario.local 'Admin1234!'
```

Y para roles, usuarios, tags, MAC y componentes (crea además usuarios de prueba):

```bash
node scripts/verificar-modelo.mjs admin@inventario.local 'Admin1234!'
```

Y para movimientos, entregas múltiples, ampliaciones, exportación y permisos del técnico:

```bash
node scripts/verificar-fase3.mjs admin@inventario.local 'Admin1234!'
```

---

## Comandos útiles

### Backend

```bash
# Desarrollo
npm run start:dev

# Generar cliente Prisma después de cambiar el schema
npx prisma generate

# Crear nueva migración
npx prisma migrate dev --name nombre_de_la_migracion

# Ver base de datos en el navegador
npx prisma studio
```

### Frontend

```bash
# Desarrollo
npm run dev

# Build para producción
npm run build
```

### Git

```bash
# Ver estado
git status

# Subir cambios
git add .
git commit -m "descripción del cambio"
git push origin main

# Bajar cambios en otra computadora
git pull origin main
```

---

## Variables de entorno

### backend/.env

```env
DATABASE_URL="postgresql://USUARIO:PASSWORD@localhost:5432/inventario_csjn"
JWT_SECRET="clave_secreta_larga_y_segura"
```

### frontend

Si necesitás cambiar la URL del backend, modificá `frontend/src/api/axios.ts` con la URL correcta.

CAMBIAR AHORA

-[HECHO] MOSTRAR EL COLOR LA VARIANTE EN LA ORDEN O/C
-[HECHO] NOTA GENERAL DEL DISPOSITIVO, Y SE PUEDA MODIFICAR
-[HECHO] MAC ADDRESS
-[HECHO] AGREGARLE COMPONENTES A DISPOSITIVOS
-[HECHO] HISTORIA DE MOVIMIENTOS DE PERSONAS (DEPENDENDENCIAS)
-[HECHO] TIENE AMPLIACIION (OC ORIGINAL)
-[HECHO] cambiar excel para que cargue MAC ADDRESS (opcional)
-[HECHO] CARTEL ERROR AL REPETIR SERIALNUMBER
-[HECHO] AL EXPORTAR TRAER TODOS LOS DETALLES DEL DISPOSITIVO (COMPONENTES, MAC, ETC) (Sin historial)
-[HECHO] TELEFONO EN PROVEEDOR
-[HECHO] AGREGAR BOTON CREAR PROVEDOR, MODELO, CARTUCHO EN OC
-[HECHO] BOTON ASIGNAR EN CONSUMIBLES CON LA OPCION DE TRAER TODOS LOS MODELOS POR BUSQUEDA Y TE DEJE AGREGAR MAS DE UNO POR ASIGNACION
-[HECHO] ROLES: ADMINISTRADOR(PUEDE cargar dispositivos o consumibles, sin borrar y ajustar stock), Tecnico(Solo asignar), consulta
-[HECHO] Carteles de error cuando hay un cuil o SN duplicados
-[HECHO] SITIO RESPONSIVE
-[HECHO] MOVIMIENTOS: VER, FILTRAR POR FECHA Y TIPO, TOTALES Y EXPORTAR



CAMBIAR MAS ADELANTE
Traer EXP del SIAF 

