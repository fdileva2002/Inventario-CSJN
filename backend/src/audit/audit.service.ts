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

    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }
}
