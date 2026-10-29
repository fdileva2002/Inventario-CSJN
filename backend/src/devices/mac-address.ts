import { BadRequestException } from '@nestjs/common';

/**
 * Acepta las formas habituales (AA:BB:CC:DD:EE:FF, AA-BB-..., AABB.CCDD.EEFF,
 * AABBCCDDEEFF) y devuelve siempre AA:BB:CC:DD:EE:FF, para que la unicidad
 * no dependa de cómo se tipeó. Vacío = sin MAC (null); undefined = no se envió.
 */
export function normalizeMac(value: string | null | undefined) {
  if (value === undefined) return undefined;
  if (value === null || value.trim() === '') return null;

  const hex = value.replace(/[\s:.-]/g, '').toUpperCase();

  if (!/^[0-9A-F]{12}$/.test(hex)) {
    throw new BadRequestException(`MAC address inválida: "${value}"`);
  }

  return hex.match(/.{2}/g)!.join(':');
}
