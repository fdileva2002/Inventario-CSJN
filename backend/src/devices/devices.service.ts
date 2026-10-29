import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateDeviceDto } from './dto/create-device.dto';
import { UpdateDeviceDto } from './dto/update-device.dto';
import { CreateSmartDeviceDto } from './dto/create-smart-device.dto';
import { FindDevicesDto } from './dto/find-devices.dto';
import { ChangeDeviceStatusDto } from './dto/change-devices-status.dto';
import { DeviceMovementType, UserRole } from '@prisma/client';
import { getCurrentUserRole } from '../common/request-context';
import { CARGA } from '../auth/roles';
import { nextDeviceTag, tagPrefixFor } from './device-tag';
import { normalizeMac } from './mac-address';

const TECHNICIAN_EDITABLE_FIELDS = ['hostname', 'location', 'notes'];

// Tope de equipos por exportación: con más conviene filtrar.
const DEVICE_EXPORT_LIMIT = 20000;

@Injectable()
export class DevicesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(createDeviceDto: CreateDeviceDto) {
    try {
      return await this.prisma.transaction(async (tx) => {
      const device = await tx.device.create({
        data: {
          tag: createDeviceDto.tag,
          serialNumber: createDeviceDto.serialNumber,
          macAddress: normalizeMac(createDeviceDto.macAddress),
          hostname: createDeviceDto.hostname?.trim(),
          categoryId: createDeviceDto.categoryId,
          modelId: createDeviceDto.modelId,
          statusId: createDeviceDto.statusId,
          location: createDeviceDto.location,
          supplierId: createDeviceDto.supplierId,
          purchaseOrderId: createDeviceDto.purchaseOrderId,
          purchaseDate: createDeviceDto.purchaseDate
            ? new Date(createDeviceDto.purchaseDate)
            : undefined,
          entryDate: new Date(createDeviceDto.entryDate),
          notes: createDeviceDto.notes,
        },
        include: {
          category: true,
          model: true,
          status: true,
          supplier: true,
          purchaseOrder: true,
        },
      });

      await tx.deviceMovement.create({
        data: {
          deviceId: device.id,
          type: 'ALTA_MANUAL',
          newStatus: device.status.code,
          newLocation: device.location,
          detail: 'Alta manual del dispositivo',
        },
      });

      return device;
      });
    } catch (error: any) {
      this.rethrowDuplicate(error);
    }
  }

  async findAll(filters: FindDevicesDto) {
    const where = this.buildWhere(filters);
    const page = filters.page ?? 0;
    const limit = filters.limit ?? 40;

    const [devices, total] = await Promise.all([
      this.prisma.device.findMany({
        where,
        include: {
          category: true,
          model: true,
          status: true,
          supplier: true,
          purchaseOrder: true,
          assignments: {
            where: { returnedAt: null },
            include: {
              person: true,
              department: true,
            },
          },
        },
        orderBy: { tag: 'asc' },
        skip: page * limit,
        take: limit,
      }),
      this.prisma.device.count({ where }),
    ]);

    return {
      data: devices,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  // Todo el resultado de la búsqueda (sin paginar) con los datos completos, para Excel.
  async export(filters: FindDevicesDto) {
    const where = this.buildWhere(filters);
    const total = await this.prisma.device.count({ where });
    if (total > DEVICE_EXPORT_LIMIT) {
      throw new BadRequestException(
        `La búsqueda tiene ${total} equipos; el máximo para exportar es ${DEVICE_EXPORT_LIMIT}. Agregá filtros.`,
      );
    }

    return this.prisma.device.findMany({
      where,
      include: {
        category: true,
        model: true,
        status: true,
        supplier: true,
        purchaseOrder: { select: { id: true, number: true } },
        assignments: {
          where: { returnedAt: null },
          include: { person: true, department: true },
        },
        components: { where: { status: 'INSTALADO' }, orderBy: { type: 'asc' } },
      },
      orderBy: { tag: 'asc' },
    });
  }

  private buildWhere(filters: FindDevicesDto) {
    const where: any = {};

    if (filters.search) {
      where.OR = [
        { tag: { contains: filters.search, mode: 'insensitive' } },
        { serialNumber: { contains: filters.search, mode: 'insensitive' } },
        { macAddress: { contains: filters.search, mode: 'insensitive' } },
        { hostname: { contains: filters.search, mode: 'insensitive' } },
        { location: { contains: filters.search, mode: 'insensitive' } },
        { model: { model: { contains: filters.search, mode: 'insensitive' } } },
        { model: { brand: { contains: filters.search, mode: 'insensitive' } } },
        { category: { name: { contains: filters.search, mode: 'insensitive' } } },
        { status: { name: { contains: filters.search, mode: 'insensitive' } } },
        {
          assignments: {
            some: {
              returnedAt: null,
              person: { fullName: { contains: filters.search, mode: 'insensitive' } },
            },
          },
        },
        {
          assignments: {
            some: {
              returnedAt: null,
              person: { employeeId: { contains: filters.search, mode: 'insensitive' } },
            },
          },
        },
      ];
    }

    if (filters.statusId !== undefined) where.statusId = filters.statusId;
    if (filters.categoryId !== undefined) where.categoryId = filters.categoryId;
    if (filters.modelId !== undefined) where.modelId = filters.modelId;
    if (filters.purchaseOrderId !== undefined) where.purchaseOrderId = filters.purchaseOrderId;

    if (filters.assigned === true) {
      where.assignments = { some: { returnedAt: null } };
    }
    if (filters.assigned === false) {
      where.assignments = { none: { returnedAt: null } };
    }

    if (filters.statusCode) {
      where.status = { code: filters.statusCode };
    }

    if (filters.categoryName) {
      where.category = { name: filters.categoryName };
    }

    if (filters.assignedTo) {
      where.assignments = {
        some: {
          returnedAt: null,
          OR: [
            { person: { fullName: { contains: filters.assignedTo, mode: 'insensitive' } } },
            { department: { name: { contains: filters.assignedTo, mode: 'insensitive' } } },
          ],
        },
      };
    }

    if (filters.location?.trim()) {
      where.location = { contains: filters.location.trim(), mode: 'insensitive' };
    }

    return where;
  }

  async findOne(id: number) {
    const device = await this.prisma.device.findUnique({
      where: { id },
      include: {
        category: true,
        model: true,
        status: true,
        supplier: true,
        purchaseOrder: true,
      },
    });

    if (!device) {
      throw new NotFoundException(`No se encontró el dispositivo con id ${id}`);
    }

    return device;
  }

  

  async update(id: number, updateDeviceDto: UpdateDeviceDto) {
  const existingDevice = await this.prisma.device.findUnique({
    where: { id },
    include: {
      status: true,
      category: true,
      model: true,
      supplier: true,
      purchaseOrder: true,
    },
  });

  if (!existingDevice) {
    throw new NotFoundException(`No se encontró el dispositivo con id ${id}`);
  }

  // El estado solo cambia por asignación, devolución o PATCH /devices/:id/status,
  // que validan las reglas y dejan el movimiento. statusCode y categoryName
  // vienen del formulario pero no son columnas.
  const { statusId, statusCode, categoryName, ...editableFields } = updateDeviceDto;

  // El técnico (ASIGNACION) solo corrige los datos de campo; el resto es CARGA.
  if (!CARGA.includes(getCurrentUserRole() as UserRole)) {
    const forbidden = Object.keys(editableFields).filter(
      (field) =>
        !TECHNICIAN_EDITABLE_FIELDS.includes(field) &&
        (editableFields as Record<string, unknown>)[field] !== undefined,
    );
    if (forbidden.length > 0) {
      throw new ForbiddenException('Solo podés editar hostname, ubicación y notas');
    }
  }

  if (statusId !== undefined && statusId !== existingDevice.statusId) {
    throw new BadRequestException(
      'El estado no se puede modificar desde la edición. Usá "Cambiar estado".',
    );
  }

  try {
    return await this.prisma.transaction(async (tx) => {
    const updatedDevice = await tx.device.update({
      where: { id },
      data: {
        ...editableFields,
        purchaseDate: updateDeviceDto.purchaseDate
          ? new Date(updateDeviceDto.purchaseDate)
          : undefined,
        entryDate: updateDeviceDto.entryDate
          ? new Date(updateDeviceDto.entryDate)
          : undefined,
        // Texto vacío se guarda como null: "sin dato" tiene una sola representación.
        hostname: this.optionalText(updateDeviceDto.hostname),
        location: this.optionalText(updateDeviceDto.location),
        notes: this.optionalText(updateDeviceDto.notes),
        macAddress: normalizeMac(updateDeviceDto.macAddress),
      },
      include: {
        category: true,
        model: true,
        status: true,
        supplier: true,
        purchaseOrder: true,
      },
    });

    // El detalle campo por campo queda en la auditoría; en el historial del
    // equipo se muestra el traslado, que es lo que más se consulta.
    if ((existingDevice.location ?? '') !== (updatedDevice.location ?? '')) {
      await tx.deviceMovement.create({
        data: {
          deviceId: updatedDevice.id,
          type: 'ACTUALIZACION',
          previousLocation: existingDevice.location,
          newLocation: updatedDevice.location,
          detail: 'Cambio de ubicación',
        },
      });
    }

    return updatedDevice;
    });
  } catch (error: any) {
    this.rethrowDuplicate(error);
  }
  }

  async remove(id: number) {
  await this.findOne(id);

  try {
    return await this.prisma.transaction((tx) =>
      tx.device.delete({
        where: { id },
      }),
    );
  } catch (error: any) {
    const message = String(error?.message ?? '');

    if (
      error.code === 'P2003' ||
      message.includes('foreign key constraint') ||
      message.includes('RESTRICT setting')
    ) {
      throw new BadRequestException(
        'No se puede eliminar el dispositivo porque tiene movimientos o asignaciones asociadas',
      );
    }

    throw error;
  }
}

  async findMovements(id: number) {
  await this.findOne(id);

  return this.prisma.deviceMovement.findMany({
    where: {
      deviceId: id,
    },
    include: {
      person: true,
      department: true,
      user: { select: { id: true, name: true } },
    },
    orderBy: [{ date: 'desc' }, { id: 'desc' }],
  });
 }
 
  async createSmart(createSmartDeviceDto: CreateSmartDeviceDto) {
  const { modelId, serialNumber, hostname, location, statusCode, notes } =
    createSmartDeviceDto;
  const macAddress = normalizeMac(createSmartDeviceDto.macAddress);

  const model = await this.prisma.deviceModel.findUnique({
    where: { id: modelId },
    include: {
      category: true,
    },
  });

  if (!model) {
    throw new NotFoundException('El modelo indicado no existe');
  }

  const status = await this.prisma.deviceStatus.findUnique({
    where: {
      code: statusCode ?? 'DISPONIBLE',
    },
  });

  if (!status) {
    throw new NotFoundException('El estado indicado no existe');
  }

  const prefix = tagPrefixFor(model.category);

  try {
    const device = await this.prisma.transaction(async (tx) => {
      const tag = await nextDeviceTag(tx, prefix);

      const createdDevice = await tx.device.create({
        data: {
          tag,
          serialNumber: serialNumber.trim(),
          macAddress,
          hostname: hostname?.trim(),
          categoryId: model.categoryId,
          modelId: model.id,
          statusId: status.id,
          location: location?.trim(),
          entryDate: new Date(),
          notes: notes?.trim(),
        },
        include: {
          category: true,
          model: true,
          status: true,
          supplier: true,
          purchaseOrder: true,
        },
      });

      await tx.deviceMovement.create({
        data: {
          deviceId: createdDevice.id,
          type: 'ALTA_MANUAL',
          newStatus: createdDevice.status.code,
          newLocation: createdDevice.location,
          detail: notes?.trim() || 'Alta manual inteligente del dispositivo',
        },
      });

      return createdDevice;
    });

    return device;
  } catch (error: any) {
    this.rethrowDuplicate(error);
  }
}

  private optionalText(value: string | undefined) {
    if (value === undefined) return undefined;
    return value.trim() || null;
  }

  // Traduce violaciones de unicidad a un mensaje que diga qué dato está repetido.
  private rethrowDuplicate(error: any): never {
    if (error?.code === 'P2002') {
      const target: string[] = Array.isArray(error.meta?.target) ? error.meta.target : [];

      if (target.includes('tag')) {
        throw new BadRequestException('Ya existe un dispositivo con esa etiqueta');
      }
      if (target.includes('serialNumber')) {
        throw new BadRequestException('Ya existe un dispositivo con ese número de serie');
      }
      if (target.includes('macAddress')) {
        throw new BadRequestException('Ya existe un dispositivo con esa MAC address');
      }
      throw new BadRequestException('Ya existe un registro duplicado');
    }

    throw error;
  }
 
 async changeStatus(id: number, dto: ChangeDeviceStatusDto) {
    const device = await this.prisma.device.findUnique({
      where: { id },
      include: {
        status: true,
      },
    });

    if (!device) {
      throw new NotFoundException(`No se encontró el dispositivo con id ${id}`);
    }

    const newStatus = await this.prisma.deviceStatus.findUnique({
      where: { code: dto.statusCode },
    });

    if (!newStatus) {
      throw new NotFoundException('El estado indicado no existe');
    }

    if (device.statusId === newStatus.id) {
      return this.findOne(id);
    }

    // Reglas del README: EN_FUNCIONAMIENTO se entra asignando y se sale devolviendo.
    if (newStatus.code === 'EN_FUNCIONAMIENTO') {
      throw new BadRequestException(
        'Para poner un dispositivo en funcionamiento hay que asignarlo',
      );
    }

    if (device.status.code === 'EN_FUNCIONAMIENTO') {
      throw new BadRequestException(
        'Un dispositivo en funcionamiento solo puede devolverse; no se le puede cambiar el estado directamente',
      );
    }

    const movementTypeByStatus: Record<string, DeviceMovementType> = {
      EN_REPARACION: 'REPARACION',
      EN_BAJA: 'BAJA',
    };

    return this.prisma.transaction(async (tx) => {
      // Condicionado al estado leído: si otro usuario lo cambió entretanto, se corta.
      const transition = await tx.device.updateMany({
        where: { id, statusId: device.statusId },
        data: { statusId: newStatus.id },
      });

      if (transition.count !== 1) {
        throw new BadRequestException(
          'El estado del dispositivo cambió mientras se procesaba. Actualizá la pantalla y volvé a intentar.',
        );
      }

      const activeAssignment = await tx.deviceAssignment.findFirst({
        where: { deviceId: id, returnedAt: null },
      });

      if (activeAssignment) {
        throw new BadRequestException(
          'El dispositivo tiene una asignación abierta. Primero hay que devolverlo.',
        );
      }

      await tx.deviceMovement.create({
        data: {
          deviceId: id,
          type: movementTypeByStatus[newStatus.code] ?? 'CAMBIO_ESTADO',
          previousStatus: device.status.code,
          newStatus: newStatus.code,
          detail:
            dto.notes?.trim() ||
            `Cambio de estado de ${device.status.name} a ${newStatus.name}`,
        },
      });

      return tx.device.findUniqueOrThrow({
        where: { id },
        include: {
          category: true,
          model: true,
          status: true,
          supplier: true,
          purchaseOrder: true,
        },
      });
    });
  }
}
