import { Prisma } from '@prisma/client';

// Prefijos para categorías sin código propio (las categorías nuevas deberían tener code).
const FALLBACK_PREFIXES: Record<string, string> = {
  Desktop: 'PC',
  Notebook: 'NBK',
  Monitor: 'MON',
  Impresora: 'IMP',
  Token: 'TKN',
  'All-in-one': 'AIO',
  'Camara Web': 'CAM',
  DVD: 'DVD',
  Escaner: 'SCN',
  'Colector de datos': 'COL',
};

export function tagPrefixFor(category: { name: string; code?: string | null }) {
  return category.code?.trim() || FALLBACK_PREFIXES[category.name] || 'DEV';
}

/**
 * Próximo tag del prefijo (PREFIJO + número, mínimo 4 dígitos: NBK0001 … NBK9999, NBK10000).
 * Debe llamarse dentro de una transacción: toma un lock por prefijo para que dos
 * altas simultáneas no calculen el mismo número.
 */
export async function nextDeviceTag(tx: Prisma.TransactionClient, prefix: string) {
  await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${'device-tag:' + prefix}))`;

  // Solo tags exactamente PREFIJO+dígitos: "PC" no toma "PCX0001", y el máximo es numérico.
  const pattern = `^${prefix.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}([0-9]+)$`;
  const [{ last }] = await tx.$queryRaw<{ last: number | null }[]>`
    SELECT MAX(CAST(substring("tag" FROM ${pattern}) AS integer)) AS last
    FROM "Device"
    WHERE "tag" ~ ${pattern}`;

  return `${prefix}${String((last ?? 0) + 1).padStart(4, '0')}`;
}
