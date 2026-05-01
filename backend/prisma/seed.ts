import { PrismaClient, UserRole } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Iniciando seed...');

  // 1. Estados de dispositivos
  const deviceStatuses = [
    {
      code: 'A_CONFIGURAR',
      name: 'A configurar',
      description: 'Equipo ingresado o devuelto pendiente de preparación',
      sortOrder: 1,
    },
    {
      code: 'DISPONIBLE',
      name: 'Disponible',
      description: 'Equipo listo para ser asignado',
      sortOrder: 2,
    },
    {
      code: 'EN_FUNCIONAMIENTO',
      name: 'En funcionamiento',
      description: 'Equipo asignado y en uso',
      sortOrder: 3,
    },
    {
      code: 'EN_REPARACION',
      name: 'En reparación',
      description: 'Equipo fuera de servicio por reparación',
      sortOrder: 4,
    },
    {
      code: 'EN_BAJA',
      name: 'En baja',
      description: 'Equipo dado de baja definitivamente',
      sortOrder: 5,
    },
  ];

  for (const status of deviceStatuses) {
    await prisma.deviceStatus.upsert({
      where: { code: status.code },
      update: {
        name: status.name,
        description: status.description,
        sortOrder: status.sortOrder,
      },
      create: status,
    });
  }

  console.log('✅ Estados de dispositivos cargados');

  // 2. Categorías de dispositivos
  const deviceCategories = [
    {
      name: 'Desktop',
      description: 'Computadoras de escritorio',
    },
    {
      name: 'Notebook',
      description: 'Computadoras portátiles',
    },
    {
      name: 'Monitor',
      description: 'Monitores',
    },
    {
      name: 'Impresora',
      description: 'Impresoras',
    },
    {
      name: 'Token',
      description: 'Dispositivos de autenticación',
    },
    {
      name: 'All-in-one',
      description: 'Computadora todo en uno',
    },
    {
      name: 'Camara Web',
      description: 'Dispositivos de video',
    },
    {
      name: 'DVD',
      description: 'Dispositivos de lectura de discos',
    },
    {
      name: 'Escaner',
      description: 'Dispositivos de escaneo',
    },
    {
      name: 'Colector de datos',
      description: 'Dispositivos de entrada de datos',
    },
  ];

  for (const category of deviceCategories) {
    await prisma.deviceCategory.upsert({
      where: { name: category.name },
      update: {
        description: category.description,
      },
      create: category,
    });
  }

  console.log('✅ Categorías de dispositivos cargadas');

  // 3. Usuario admin inicial
  const adminEmail = 'admin@inventario.local';
  const plainPassword = 'Admin1234!';
  const passwordHash = await bcrypt.hash(plainPassword, 10);

  await prisma.user.upsert({
    where: { email: adminEmail },
    update: {
      name: 'Administrador',
      passwordHash,
      role: UserRole.EDICION,
      active: true,
    },
    create: {
      name: 'Administrador',
      email: adminEmail,
      passwordHash,
      role: UserRole.EDICION,
      active: true,
    },
  });

  await prisma.user.upsert({
  where: { email: 'consulta@inventario.local' },
  update: {
    name: 'Usuario Consulta',
    passwordHash,
    role: UserRole.CONSULTA,
    active: true,
  },
  create: {
    name: 'Usuario Consulta',
    email: 'consulta@inventario.local',
    passwordHash,
    role: UserRole.CONSULTA,
    active: true,
  },
});

  console.log('✅ Usuario admin inicial cargado');
  console.log('📧 Email admin:', adminEmail);
  console.log('🔑 Password admin:', plainPassword);

  console.log('🎉 Seed finalizado correctamente');
}

main()
  .catch((error) => {
    console.error('❌ Error al ejecutar el seed:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });