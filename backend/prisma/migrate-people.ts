/**
 * Script de migración de personas desde CSV del sistema anterior
 *
 * Uso:
 *   1. Copiá este archivo a backend/prisma/migrate-people.ts
 *   2. Copiá el CSV a backend/prisma/personas.csv
 *   3. Corré: npx ts-node prisma/migrate-people.ts
 */

import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();

// ─── CONFIGURACIÓN ────────────────────────────────────────────────────────────
const CSV_PATH = path.join(__dirname, 'personas.csv');
const UPDATE_IF_EXISTS = false; // true = actualiza si ya existe el CUIL
// ──────────────────────────────────────────────────────────────────────────────

type PersonRow = {
  fullName: string;
  employeeId: string;
  email: string | null;
  department: string | null;
  location: string | null;
};

function parseLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current.trim());
  return result;
}

function parseCSV(content: string): PersonRow[] {
  const lines = content.split('\n').filter(line => line.trim());
  const headers = parseLine(lines[0]);
  const rows: PersonRow[] = [];

  for (let i = 1; i < lines.length; i++) {
    const values = parseLine(lines[i]);
    const row: any = {};
    headers.forEach((header, index) => {
      row[header] = values[index] ?? '';
    });

    const fullName = row['Nombre']?.trim();
    const employeeId = row['Usuario']?.trim(); // CUIL en el sistema anterior
    const email = row['Email']?.trim() || null;
    const department = row['Departamento']?.trim() || null;
    const location = row['Ubicación']?.trim() || null;

    if (!fullName || !employeeId) {
      console.warn(`  ⚠ Fila ${i + 1} ignorada: falta Nombre o CUIL`);
      continue;
    }

    rows.push({
      fullName,
      employeeId,
      email: email !== '' ? email : null,
      department: department !== '' ? department : null,
      location: location !== '' ? location : null,
    });
  }

  return rows;
}

async function main() {
  console.log('════════════════════════════════════════');
  console.log('  Migración de personas desde CSV');
  console.log('════════════════════════════════════════\n');

  // 1. Leer CSV
  let people: PersonRow[];
  try {
    const content = fs.readFileSync(CSV_PATH, 'utf-8');
    people = parseCSV(content);
    console.log(`✓ CSV leído: ${people.length} personas encontradas\n`);
  } catch (error: any) {
    console.error(`✗ Error al leer el CSV: ${error.message}`);
    console.error('  Verificá que el archivo exista en: ' + CSV_PATH);
    process.exit(1);
  }

  // 2. Crear dependencias únicas
  const departmentNames = [...new Set(
    people
      .filter(p => p.department)
      .map(p => p.department as string)
  )];

  if (departmentNames.length > 0) {
    console.log(`Paso 1: Creando ${departmentNames.length} dependencia(s)...`);
    for (const name of departmentNames) {
      const existing = await prisma.department.findUnique({ where: { name } });
      if (existing) {
        console.log(`  ~ Ya existe: ${name}`);
      } else {
        await prisma.department.create({ data: { name } });
        console.log(`  ✓ Creada: ${name}`);
      }
    }
  } else {
    console.log('Paso 1: No hay dependencias nuevas para crear');
  }

  // 3. Crear personas
  console.log(`\nPaso 2: Procesando ${people.length} persona(s)...`);

  let created = 0;
  let updated = 0;
  let skipped = 0;
  let errors = 0;

  for (const person of people) {
    try {
      const nameParts = person.fullName.trim().split(' ');
      const firstName = nameParts[0];
      const lastName = nameParts.slice(1).join(' ') || '-';

      let departmentId: number | undefined = undefined;
      if (person.department) {
        const dept = await prisma.department.findUnique({
          where: { name: person.department },
        });
        departmentId = dept?.id;
      }

      const existing = await prisma.person.findUnique({
        where: { employeeId: person.employeeId },
      });

      if (existing) {
        if (UPDATE_IF_EXISTS) {
          await prisma.person.update({
            where: { employeeId: person.employeeId },
            data: {
              firstName,
              lastName,
              fullName: person.fullName,
              email: person.email ?? undefined,
              departmentId,
            },
          });
          console.log(`  ↑ Actualizada: ${person.fullName} (CUIL: ${person.employeeId})`);
          updated++;
        } else {
          console.log(`  ~ Salteada (ya existe): ${person.fullName}`);
          skipped++;
        }
      } else {
        await prisma.person.create({
          data: {
            firstName,
            lastName,
            fullName: person.fullName,
            employeeId: person.employeeId,
            email: person.email ?? undefined,
            departmentId,
          },
        });
        console.log(`  ✓ Creada: ${person.fullName} (CUIL: ${person.employeeId})`);
        created++;
      }
    } catch (error: any) {
      console.error(`  ✗ Error con ${person.fullName}: ${error.message}`);
      errors++;
    }
  }

  // 4. Resumen
  console.log('\n════════════════════════════════════════');
  console.log('  Resumen de la migración');
  console.log('════════════════════════════════════════');
  console.log(`  ✓ Creadas:      ${created}`);
  console.log(`  ↑ Actualizadas: ${updated}`);
  console.log(`  ~ Salteadas:    ${skipped}`);
  console.log(`  ✗ Errores:      ${errors}`);
  console.log('════════════════════════════════════════\n');

  if (errors > 0) {
    console.log('Hubo errores. Revisá los mensajes de arriba.');
  } else {
    console.log('Migración completada exitosamente.');
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
