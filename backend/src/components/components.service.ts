import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Component, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import {
  CreateComponentDto,
  FindComponentsDto,
  InstallComponentDto,
  UpdateComponentDto,
} from './dto/component.dto';

const deviceSummary = { select: { id: true, tag: true, hostname: true } } as const;

@Injectable()
export class ComponentsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(filters: FindComponentsDto) {
    const where: Prisma.ComponentWhereInput = {};

    if (filters.type) where.type = filters.type;
    if (filters.status) where.status = filters.status;
    if (filters.deviceId !== undefined) where.deviceId = filters.deviceId;

    if (filters.search?.trim()) {
      const contains = { contains: filters.search.trim(), mode: 'insensitive' as const };
      where.OR = [
        { type: contains },
        { brand: contains },
        { model: contains },
        { serialNumber: contains },
        { capacity: contains },
        { device: { tag: contains } },
        { device: { hostname: contains } },
      ];
    }

    const page = filters.page ?? 0;
    const limit = filters.limit ?? 40;

    const [data, total] = await Promise.all([
      this.prisma.component.findMany({
        where,
        include: { device: deviceSummary },
        orderBy: [{ type: 'asc' }, { id: 'asc' }],
        skip: page * limit,
        take: limit,
      }),
      this.prisma.component.count({ where }),
    ]);

    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  // Tipos ya usados, para sugerir en el formulario y no terminar con "RAM", "Ram" y "Memoria".
  async findTypes() {
    const rows = await this.prisma.component.findMany({
      distinct: ['type'],
      select: { type: true },
      orderBy: { type: 'asc' },
    });
    return rows.map((row) => row.type);
  }

  async findOne(id: number) {
    const component = await this.prisma.component.findUnique({
      where: { id },
      include: { device: deviceSummary },
    });

    if (!component) {
      throw new NotFoundException(`No se encontró el componente con id ${id}`);
    }

    return component;
  }

  // Movimientos de un componente, o de todos los que pasaron por un equipo.
  async findMovements(filters: { componentId?: number; deviceId?: number }) {
    return this.prisma.componentMovement.findMany({
      where: {
        ...(filters.componentId !== undefined ? { componentId: filters.componentId } : {}),
        ...(filters.deviceId !== undefined ? { deviceId: filters.deviceId } : {}),
      },
      include: {
        component: { select: { id: true, type: true, brand: true, model: true, serialNumber: true, capacity: true } },
        device: deviceSummary,
        user: { select: { id: true, name: true } },
      },
      orderBy: [{ date: 'desc' }, { id: 'desc' }],
    });
  }

  async create(dto: CreateComponentDto) {
    try {
      const created = await this.prisma.transaction(async (tx) => {
        const component = await tx.component.create({
          data: {
            type: dto.type.trim(),
            brand: this.optionalText(dto.brand),
            model: this.optionalText(dto.model),
            serialNumber: this.optionalText(dto.serialNumber),
            capacity: this.optionalText(dto.capacity),
            notes: this.optionalText(dto.notes),
          },
        });

        await tx.componentMovement.create({
          data: { componentId: component.id, type: 'ALTA', detail: 'Alta del componente' },
        });

        if (dto.deviceId !== undefined) {
          await this.installInTx(tx, component, dto.deviceId);
        }

        return component;
      });

      return this.findOne(created.id);
    } catch (error) {
      this.rethrowDuplicate(error);
    }
  }

  async update(id: number, dto: UpdateComponentDto) {
    await this.findOne(id);

    try {
      return await this.prisma.transaction((tx) =>
        tx.component.update({
          where: { id },
          data: {
            type: dto.type?.trim(),
            brand: this.optionalText(dto.brand),
            model: this.optionalText(dto.model),
            serialNumber: this.optionalText(dto.serialNumber),
            capacity: this.optionalText(dto.capacity),
            notes: this.optionalText(dto.notes),
          },
          include: { device: deviceSummary },
        }),
      );
    } catch (error) {
      this.rethrowDuplicate(error);
    }
  }

  async install(id: number, dto: InstallComponentDto) {
    const component = await this.findOne(id);

    await this.prisma.transaction((tx) =>
      this.installInTx(tx, component, dto.deviceId, dto.notes),
    );

    return this.findOne(id);
  }

  async uninstall(id: number, notes?: string) {
    const component = await this.findOne(id);

    if (component.status !== 'INSTALADO' || component.deviceId === null) {
      throw new BadRequestException('El componente no está instalado en ningún equipo');
    }

    await this.prisma.transaction(async (tx) => {
      await this.transition(tx, component, { status: 'DISPONIBLE', deviceId: null });
      await tx.componentMovement.create({
        data: {
          componentId: id,
          type: 'RETIRO',
          deviceId: component.deviceId,
          detail: notes?.trim() || `Retirado de ${component.device?.tag}`,
        },
      });
    });

    return this.findOne(id);
  }

  // Baja: si estaba instalado, el retiro queda registrado antes de la baja.
  async discard(id: number, notes?: string) {
    const component = await this.findOne(id);

    if (component.status === 'BAJA') {
      throw new BadRequestException('El componente ya está dado de baja');
    }

    await this.prisma.transaction(async (tx) => {
      await this.transition(tx, component, { status: 'BAJA', deviceId: null });

      if (component.deviceId !== null) {
        await tx.componentMovement.create({
          data: {
            componentId: id,
            type: 'RETIRO',
            deviceId: component.deviceId,
            detail: `Retirado de ${component.device?.tag} para dar de baja`,
          },
        });
      }

      await tx.componentMovement.create({
        data: { componentId: id, type: 'BAJA', detail: notes?.trim() || 'Baja del componente' },
      });
    });

    return this.findOne(id);
  }

  private async installInTx(
    tx: Prisma.TransactionClient,
    component: Component & { device?: { tag: string } | null },
    deviceId: number,
    notes?: string,
  ) {
    if (component.status === 'BAJA') {
      throw new BadRequestException('No se puede instalar un componente dado de baja');
    }

    if (component.deviceId === deviceId) {
      throw new BadRequestException('El componente ya está instalado en ese equipo');
    }

    const device = await tx.device.findUnique({
      where: { id: deviceId },
      include: { status: true },
    });

    if (!device) {
      throw new NotFoundException('El dispositivo indicado no existe');
    }

    if (device.status.code === 'EN_BAJA') {
      throw new BadRequestException('No se puede instalar un componente en un equipo dado de baja');
    }

    await this.transition(tx, component, { status: 'INSTALADO', deviceId });

    // Instalarlo en otro equipo es moverlo: queda el retiro del anterior.
    if (component.deviceId !== null) {
      await tx.componentMovement.create({
        data: {
          componentId: component.id,
          type: 'RETIRO',
          deviceId: component.deviceId,
          detail: `Movido a ${device.tag}`,
        },
      });
    }

    await tx.componentMovement.create({
      data: {
        componentId: component.id,
        type: 'INSTALACION',
        deviceId,
        detail: notes?.trim() || `Instalado en ${device.tag}`,
      },
    });
  }

  // Cambia estado/equipo solo si sigue como se leyó; si otro usuario lo movió entretanto, corta.
  private async transition(
    tx: Prisma.TransactionClient,
    component: Component,
    data: { status: Component['status']; deviceId: number | null },
  ) {
    const result = await tx.component.updateMany({
      where: { id: component.id, status: component.status, deviceId: component.deviceId },
      data,
    });

    if (result.count !== 1) {
      throw new BadRequestException(
        'El componente cambió mientras se procesaba. Actualizá la pantalla y volvé a intentar.',
      );
    }
  }

  private optionalText(value: string | undefined) {
    if (value === undefined) return undefined;
    return value.trim() || null;
  }

  private rethrowDuplicate(error: any): never {
    if (error?.code === 'P2002') {
      throw new BadRequestException('Ya existe un componente con ese número de serie');
    }
    throw error;
  }
}
