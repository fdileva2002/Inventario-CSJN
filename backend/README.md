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

| Rol | Permisos |
|---|---|
| `EDICION` | Ver + crear + editar + eliminar |
| `CONSULTA` | Solo ver, sin botones de acción |

Los roles se gestionan desde la página **Usuarios** (solo visible para usuarios con rol EDICION).

---

## Módulos implementados (MVP)

### Dispositivos
- Alta manual con generación automática de tag según categoría (ej: `NBK0001`, `MON0003`)
- Gestión de estados: A configurar / Disponible / En funcionamiento / En reparación / En baja
- Asignación a **persona** o **dependencia**
- Devolución automática a estado "A configurar"
- Cambio de ubicación al asignar
- Filtros avanzados: tag, serial, hostname, modelo, categoría, estado, persona/dependencia, ubicación
- Paginación (20 por página)
- Historial de movimientos por dispositivo
- Exportar búsqueda a Excel
- Chips de color por estado

### Consumibles
- Stock por cantidad (no por unidad individual)
- Movimientos: ingreso por compra, salida por consumo, ajuste positivo/negativo
- Alerta de stock bajo
- Asignación a personas
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
- Ítems de tipo DEVICE o CONSUMABLE
- Filtro por categoría al agregar ítems de dispositivo
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
- ABM completo con búsqueda

### Usuarios
- Crear usuarios con rol EDICION o CONSULTA
- Cambiar rol de cualquier usuario
- Cambiar contraseña propia (validando contraseña actual)
- Blanquear contraseña de otros usuarios (asigna contraseña temporal)
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

-MOSTRAR EL COLOR LA VARIANTE EN LA ORDEN O/C
-NOTA GENERAL DEL DISPOSITIVO, Y SE PUEDA MODIFICAR
-MAC ADDRESS
-AGREGARLE COMPONENTES A DISPOSITIVOS
-HISTORIA DE MOVIMIENTOS DE PERSONAS (DEPENDENDENCIAS)
-TIENE AMPLIACIION (OC ORIGINAL)
-cambiar excel para que cargue MAC ADDRESS (opcional)
-CARTEL ERROR AL REPETIR SERIALNUMBER
-AL EXPORTAR TRAER TODOS LOS DETALLES DEL DISPOSITIVO (COMPONENTES, MAC, ETC) (Sin historial)
-TELEFONO EN PROVEEDOR
-AGREGAR BOTON CREAR PROVEDOR, MODELO, CARTUCHO EN OC
-BOTON ASIGNAR EN CONSUMIBLES CON LA OPCION DE TRAER TODOS LOS MODELOS POR BUSQUEDA Y TE DEJE AGREGAR MAS DE UNO POR ASIGNACION
-ROLES: ADMINISTRADOR(PUEDE cargar dispositivos o consumibles, sin borrar y ajustar stock), Tecnico(Solo asignar), consulta
-Carteles de error cuando hay un cuil o SN duplicados



CAMBIAR MAS ADELANTE
Traer EXP del SIAF 

