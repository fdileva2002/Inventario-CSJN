import { BadRequestException, Injectable } from '@nestjs/common';
import {
  ComponentMovementType,
  ConsumableMovementType,
  DeviceMovementType,
  Prisma,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { FindMovementsDto } from './dto/find-movements.dto';

// Tope de filas para exportar: más que eso conviene acotar las fechas.
const EXPORT_LIMIT = 50000;

const VALID_TYPES = {
  DEVICE: Object.values(DeviceMovementType) as string[],
  CONSUMABLE: Object.values(ConsumableMovementType) as string[],
  COMPONENT: Object.values(ComponentMovementType) as string[],
};

// Fila común a los tres historiales, lista para tabla y Excel.
export type MovementRow = {
  id: number;
  date: Date;
  type: string;
  deviceId: number | null;
  item: string;
  itemDetail: string | null;
  quantity: number | null;
  previousStock: number | null;
  newStock: number | null;
  previousStatus: string | null;
  newStatus: string | null;
  previousLocation: string | null;
  newLocation: string | null;
  recipient: string | null;
  detail: string | null;
  user: string | null;
};

export type MovementSummary = { type: string; count: number; quantity: number | null };

const userSelect = { select: { id: true, name: true } } as const;

/**
 * Consulta unificada de los historiales de movimientos (equipos, consumibles y
 * componentes) con filtros por fecha, tipo, destinatario y usuario. Solo lectura.
 */
@Injectable()
export class MovementsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(filters: FindMovementsDto) {
    const page = filters.page ?? 0;
    const limit = filters.limit ?? 50;
    const { rows, total, summary } = await this.query(filters, page * limit, limit);

    return { data: rows, summary, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async export(filters: FindMovementsDto) {
    const { rows, total } = await this.query(filters, 0, EXPORT_LIMIT, false);
    if (total > EXPORT_LIMIT) {
      throw new BadRequestException(
        `La búsqueda tiene ${total} movimientos; el máximo para exportar es ${EXPORT_LIMIT}. Acotá las fechas.`,
      );
    }
    return rows;
  }

  private async query(filters: FindMovementsDto, skip: number, take: number, withSummary = true) {
    const types = filters.types?.length ? filters.types : undefined;
    const invalid = types?.filter((type) => !VALID_TYPES[filters.kind].includes(type)) ?? [];
    if (invalid.length > 0) {
      throw new BadRequestException(`Tipo de movimiento inválido: ${invalid.join(', ')}`);
    }

    const date =
      filters.from || filters.to
        ? {
            ...(filters.from ? { gte: new Date(filters.from) } : {}),
            ...(filters.to ? { lt: new Date(filters.to) } : {}),
          }
        : undefined;
    const search = filters.search?.trim() || undefined;
    const contains = (value: string) => ({ contains: value, mode: 'insensitive' as const });

    switch (filters.kind) {
      case 'DEVICE': {
        // Los totales por tipo usan los mismos filtros salvo el de tipo, para ver el desglose completo.
        const base: Prisma.DeviceMovementWhereInput = {
          date,
          personId: filters.personId,
          departmentId: filters.departmentId,
          userId: filters.userId,
          device: search
            ? {
                OR: [
                  { tag: contains(search) },
                  { serialNumber: contains(search) },
                  { hostname: contains(search) },
                ],
              }
            : undefined,
        };
        const where = { ...base, type: types ? { in: types as DeviceMovementType[] } : undefined };

        const [movements, total, groups] = await Promise.all([
          this.prisma.deviceMovement.findMany({
            where,
            include: {
              device: { include: { model: true, category: true } },
              person: true,
              department: true,
              user: userSelect,
            },
            orderBy: [{ date: 'desc' }, { id: 'desc' }],
            skip,
            take,
          }),
          this.prisma.deviceMovement.count({ where }),
          withSummary
            ? this.prisma.deviceMovement.groupBy({ by: ['type'], where: base, _count: { _all: true } })
            : [],
        ]);

        return {
          total,
          summary: groups.map((g) => ({ type: g.type, count: g._count._all, quantity: null })),
          rows: movements.map<MovementRow>((m) => ({
            id: m.id,
            date: m.date,
            type: m.type,
            deviceId: m.deviceId,
            item: m.device.tag,
            itemDetail: [m.device.category.name, m.device.model.brand, m.device.model.model, m.device.hostname]
              .filter(Boolean)
              .join(' · '),
            quantity: null,
            previousStock: null,
            newStock: null,
            previousStatus: m.previousStatus,
            newStatus: m.newStatus,
            previousLocation: m.previousLocation,
            newLocation: m.newLocation,
            recipient: m.person?.fullName ?? m.department?.name ?? null,
            detail: m.detail,
            user: m.user?.name ?? null,
          })),
        };
      }

      case 'CONSUMABLE': {
        const base: Prisma.ConsumableMovementWhereInput = {
          date,
          personId: filters.personId,
          departmentId: filters.departmentId,
          userId: filters.userId,
          consumable: search
            ? {
                OR: [
                  { name: contains(search) },
                  { brand: contains(search) },
                  { model: contains(search) },
                  { variant: contains(search) },
                ],
              }
            : undefined,
        };
        const where = { ...base, type: types ? { in: types as ConsumableMovementType[] } : undefined };

        const [movements, total, groups] = await Promise.all([
          this.prisma.consumableMovement.findMany({
            where,
            include: { consumable: true, person: true, department: true, user: userSelect },
            orderBy: [{ date: 'desc' }, { id: 'desc' }],
            skip,
            take,
          }),
          this.prisma.consumableMovement.count({ where }),
          withSummary
            ? this.prisma.consumableMovement.groupBy({
                by: ['type'],
                where: base,
                _count: { _all: true },
                _sum: { quantity: true },
              })
            : [],
        ]);

        return {
          total,
          summary: groups.map((g) => ({
            type: g.type,
            count: g._count._all,
            quantity: g._sum.quantity ?? 0,
          })),
          rows: movements.map<MovementRow>((m) => ({
            id: m.id,
            date: m.date,
            type: m.type,
            deviceId: null,
            item: [m.consumable.name, m.consumable.model].filter(Boolean).join(' '),
            itemDetail: [m.consumable.type, m.consumable.brand, m.consumable.variant].filter(Boolean).join(' · '),
            quantity: m.quantity,
            previousStock: m.previousStock,
            newStock: m.newStock,
            previousStatus: null,
            newStatus: null,
            previousLocation: null,
            newLocation: null,
            recipient: m.person?.fullName ?? m.department?.name ?? null,
            detail: m.detail,
            user: m.user?.name ?? null,
          })),
        };
      }

      case 'COMPONENT': {
        // Los componentes no tienen destinatario: persona y dependencia no aplican.
        const base: Prisma.ComponentMovementWhereInput = {
          date,
          userId: filters.userId,
          OR: search
            ? [
                { component: { type: contains(search) } },
                { component: { serialNumber: contains(search) } },
                { component: { brand: contains(search) } },
                { component: { model: contains(search) } },
                { device: { tag: contains(search) } },
              ]
            : undefined,
        };
        const where = { ...base, type: types ? { in: types as ComponentMovementType[] } : undefined };

        const [movements, total, groups] = await Promise.all([
          this.prisma.componentMovement.findMany({
            where,
            include: { component: true, device: true, user: userSelect },
            orderBy: [{ date: 'desc' }, { id: 'desc' }],
            skip,
            take,
          }),
          this.prisma.componentMovement.count({ where }),
          withSummary
            ? this.prisma.componentMovement.groupBy({ by: ['type'], where: base, _count: { _all: true } })
            : [],
        ]);

        return {
          total,
          summary: groups.map((g) => ({ type: g.type, count: g._count._all, quantity: null })),
          rows: movements.map<MovementRow>((m) => ({
            id: m.id,
            date: m.date,
            type: m.type,
            deviceId: m.deviceId,
            item: [m.component.type, m.component.brand, m.component.model, m.component.capacity]
              .filter(Boolean)
              .join(' '),
            itemDetail: m.component.serialNumber ? `S/N ${m.component.serialNumber}` : null,
            quantity: null,
            previousStock: null,
            newStock: null,
            previousStatus: null,
            newStatus: null,
            previousLocation: null,
            newLocation: m.device?.tag ?? null,
            recipient: null,
            detail: m.detail,
            user: m.user?.name ?? null,
          })),
        };
      }
    }
  }
}
