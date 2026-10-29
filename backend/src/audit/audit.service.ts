import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { FindAuditDto } from './dto/find-audit.dto';

// Solo lectura: AuditLog lo escriben los triggers de la base.
@Injectable()
export class AuditService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(filters: FindAuditDto) {
    const where: Prisma.AuditLogWhereInput = {};

    if (filters.entity) where.entity = filters.entity;
    if (filters.entityId !== undefined) where.entityId = filters.entityId;
    if (filters.userId !== undefined) where.userId = filters.userId;
    if (filters.action) where.action = filters.action;

    if (filters.from || filters.to) {
      where.date = {
        ...(filters.from ? { gte: new Date(filters.from) } : {}),
        ...(filters.to ? { lte: new Date(filters.to) } : {}),
      };
    }

    const page = filters.page ?? 0;
    const limit = filters.limit ?? 50;

    const [data, total] = await Promise.all([
      this.prisma.auditLog.findMany({
        where,
        include: { user: { select: { id: true, name: true } } },
        orderBy: [{ date: 'desc' }, { id: 'desc' }],
        skip: page * limit,
        take: limit,
      }),
      this.prisma.auditLog.count({ where }),
    ]);

    const references = await this.resolveReferences(data);

    return { data, references, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  // La auditoría guarda ids (statusId: 3). Para mostrar "Disponible" en lugar de 3, se
  // devuelven los nombres de los ids que aparecen en esta página: { statusId: { "3": "Disponible" } }.
  private async resolveReferences(entries: { previousValues: Prisma.JsonValue; newValues: Prisma.JsonValue }[]) {
    const idsByField = new Map<string, Set<number>>();

    for (const entry of entries) {
      for (const values of [entry.previousValues, entry.newValues]) {
        if (!values || typeof values !== 'object' || Array.isArray(values)) continue;
        for (const [field, value] of Object.entries(values)) {
          if (!(field in REFERENCE_RESOLVERS) || typeof value !== 'number') continue;
          if (!idsByField.has(field)) idsByField.set(field, new Set());
          idsByField.get(field)!.add(value);
        }
      }
    }

    const references: Record<string, Record<number, string>> = {};
    await Promise.all(
      [...idsByField].map(async ([field, ids]) => {
        references[field] = await REFERENCE_RESOLVERS[field](this.prisma, [...ids]);
      }),
    );
    return references;
  }
}

type Resolver = (prisma: PrismaService, ids: number[]) => Promise<Record<number, string>>;

function byId<T extends { id: number }>(rows: T[], label: (row: T) => string) {
  return Object.fromEntries(rows.map((row) => [row.id, label(row)]));
}

const REFERENCE_RESOLVERS: Record<string, Resolver> = {
  statusId: async (prisma, ids) =>
    byId(await prisma.deviceStatus.findMany({ where: { id: { in: ids } } }), (s) => s.name),
  modelId: async (prisma, ids) =>
    byId(await prisma.deviceModel.findMany({ where: { id: { in: ids } } }), (m) => `${m.brand} ${m.model}`),
  deviceModelId: async (prisma, ids) =>
    byId(await prisma.deviceModel.findMany({ where: { id: { in: ids } } }), (m) => `${m.brand} ${m.model}`),
  categoryId: async (prisma, ids) =>
    byId(await prisma.deviceCategory.findMany({ where: { id: { in: ids } } }), (c) => c.name),
  supplierId: async (prisma, ids) =>
    byId(await prisma.supplier.findMany({ where: { id: { in: ids } } }), (s) => s.name),
  purchaseOrderId: async (prisma, ids) =>
    byId(await prisma.purchaseOrder.findMany({ where: { id: { in: ids } } }), (o) => `OC ${o.number}`),
  parentOrderId: async (prisma, ids) =>
    byId(await prisma.purchaseOrder.findMany({ where: { id: { in: ids } } }), (o) => `OC ${o.number}`),
  departmentId: async (prisma, ids) =>
    byId(await prisma.department.findMany({ where: { id: { in: ids } } }), (d) => d.name),
  personId: async (prisma, ids) =>
    byId(await prisma.person.findMany({ where: { id: { in: ids } } }), (p) => p.fullName),
  deviceId: async (prisma, ids) =>
    byId(await prisma.device.findMany({ where: { id: { in: ids } } }), (d) => d.tag),
  consumableId: async (prisma, ids) =>
    byId(await prisma.consumable.findMany({ where: { id: { in: ids } } }), (c) =>
      [c.name, c.model, c.variant].filter(Boolean).join(' '),
    ),
};
