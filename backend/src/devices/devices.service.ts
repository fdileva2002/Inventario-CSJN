import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateDeviceDto } from './dto/create-device.dto';
import { UpdateDeviceDto } from './dto/update-device.dto';
import { CreateSmartDeviceDto } from './dto/create-smart-device.dto';
import { FindDevicesDto } from './dto/find-devices.dto';
import { hostname } from 'os';
import { contain } from 'supertest/lib/cookies';
import { ChangeDeviceStatusDto } from './dto/change-devices-status.dto';

@Injectable()
export class DevicesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(createDeviceDto: CreateDeviceDto) {
    try {
      const device = await this.prisma.device.create({
        data: {
          tag: createDeviceDto.tag,
          serialNumber: createDeviceDto.serialNumber,
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

      await this.prisma.deviceMovement.create({
        data: {
          deviceId: device.id,
          type: 'ALTA_MANUAL',
          newStatus: device.status.code,
          detail: 'Alta manual del dispositivo',
        },
      });

      return device;
    } catch (error: any) {
      if (error.code === 'P2002') {
        const target = error.meta?.target;

        if (Array.isArray(target) && target.includes('tag')) {
          throw new BadRequestException('Ya existe un dispositivo con esa etiqueta');
        }

        if (Array.isArray(target) && target.includes('serialNumber')) {
          throw new BadRequestException('Ya existe un dispositivo con ese número de serie');
        }

        throw new BadRequestException('Ya existe un registro duplicado');
      }

      throw error;
    }
  }

  async findAll(filters: FindDevicesDto) {
  const where: any = {};

  if (filters.search) {
    where.OR = [
      {
        tag: {
          contains: filters.search,
          mode: 'insensitive',
        },
      },
      {
        serialNumber: {
          contains: filters.search,
          mode: 'insensitive',
        },
      },
      {
        hostname: {
          contains: filters.search,
          mode: 'insensitive'
        }
      },
      {
        location: {
          contains: filters.search,
          mode: 'insensitive',
        },
      },
      {
        model: {
          model: {
            contains: filters.search,
            mode: 'insensitive',
          },
        },
      },
      {
        model: {
          brand: {
            contains: filters.search,
            mode: 'insensitive',
          },
        },
      },
      {
        category: {
          name: {
            contains: filters.search,
            mode: 'insensitive',
          },
        },
      },
      {
        status: {
          name: {
            contains: filters.search,
            mode: 'insensitive',
          },
        },
      },

      // Buscar por persona asignada
      {
        assignments: {
          some: {
            returnedAt: null,
            person: {
              fullName: {
                contains: filters.search,
                mode: 'insensitive',
              },
            },
          },
        },
      },
      {
        assignments: {
          some: {
            returnedAt: null,
            person: {
              employeeId: {
                contains: filters.search,
                mode: 'insensitive',
              },
            },
          },
        },
      },
    
    ];
  }

  if (filters.statusId !== undefined) {
    where.statusId = filters.statusId;
  }

  if (filters.categoryId !== undefined) {
    where.categoryId = filters.categoryId;
  }

  if (filters.modelId !== undefined) {
    where.modelId = filters.modelId;
  }

  if (filters.purchaseOrderId !== undefined) {
    where.purchaseOrderId = filters.purchaseOrderId;
  }

  if (filters.assigned === true) {
    where.assignments = {
      some: {
        returnedAt: null,
      },
    };
  }

  if (filters.assigned === false) {
    where.assignments = {
      none: {
        returnedAt: null,
      },
    };
  }

  if (filters.statusCode) {
         where.status = {
          code: filters.statusCode,
         }; 
  };

    if (filters.categoryName) {
         where.category = {
          name: filters.categoryName,
         }; 
  };
  
  if (filters.assignedTo) {
    where.assignments = {
      some: {
        returnedAt: null,
        OR: [
          {
            person: {
              fullName: {
                contains: filters.assignedTo,
                mode: 'insensitive',
              },
            },
          },
          {
            department: {
              name: {
                contains: filters.assignedTo,
                mode: 'insensitive',
              },
            },
          },
        ],
      },
    };
  }

  return this.prisma.device.findMany({
    where,
    include: {
      category: true,
      model: true,
      status: true,
      supplier: true,
      purchaseOrder: true,
      assignments: {
        where: {
          returnedAt: null,
        },
        include: {
          person: true,
          department: true,
        },
      },
    },
    orderBy: {
      tag: 'asc',
    },
  });
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

  try {
    const updatedDevice = await this.prisma.device.update({
      where: { id },
      data: {
        ...updateDeviceDto,
        purchaseDate: updateDeviceDto.purchaseDate
          ? new Date(updateDeviceDto.purchaseDate)
          : undefined,
        entryDate: updateDeviceDto.entryDate
          ? new Date(updateDeviceDto.entryDate)
          : undefined,
        hostname:
          updateDeviceDto.hostname !== undefined
          ? updateDeviceDto.hostname.trim()
          : undefined,
      },
      include: {
        category: true,
        model: true,
        status: true,
        supplier: true,
        purchaseOrder: true,
      },
    });

    if (
      updateDeviceDto.statusId !== undefined &&
      existingDevice.statusId !== updatedDevice.statusId
    ) {
      await this.prisma.deviceMovement.create({
        data: {
          deviceId: updatedDevice.id,
          type: 'CAMBIO_ESTADO',
          previousStatus: existingDevice.status.code,
          newStatus: updatedDevice.status.code,
          detail: `Cambio de estado de ${existingDevice.status.name} a ${updatedDevice.status.name}`,
        },
      });
    }

    return updatedDevice;
  } catch (error: any) {
    if (error.code === 'P2002') {
      const target = error.meta?.target;

      if (Array.isArray(target) && target.includes('tag')) {
        throw new BadRequestException(
          'Ya existe un dispositivo con esa etiqueta',
        );
      }

      if (Array.isArray(target) && target.includes('serialNumber')) {
        throw new BadRequestException(
          'Ya existe un dispositivo con ese número de serie',
        );
      }

      throw new BadRequestException('Ya existe un registro duplicado');
    }

    throw error;
    }
  }

  async remove(id: number) {
  await this.findOne(id);

  try {
    return await this.prisma.device.delete({
      where: { id },
    });
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
    },
    orderBy: {
      date: 'desc',
    },
  });
 }
 
  async createSmart(createSmartDeviceDto: CreateSmartDeviceDto) {
  const { modelId, serialNumber, hostname, location, statusCode, notes } =
    createSmartDeviceDto;

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

  const prefix = this.getTagPrefixByCategory(model.category.name, model.category.code);

  try {
    const device = await this.prisma.$transaction(async (tx) => {
      const tag = await this.generateNextTag(tx, prefix);

      const createdDevice = await tx.device.create({
        data: {
          tag,
          serialNumber: serialNumber.trim(),
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
          detail: notes?.trim() || 'Alta manual inteligente del dispositivo',
        },
      });

      return createdDevice;
    });

    return device;
  } catch (error: any) {
    if (error.code === 'P2002') {
      const target = error.meta?.target;

      if (Array.isArray(target) && target.includes('tag')) {
        throw new BadRequestException('Ya existe un dispositivo con esa etiqueta');
      }

      if (Array.isArray(target) && target.includes('serialNumber')) {
        throw new BadRequestException('Ya existe un dispositivo con ese número de serie');
      }

      throw new BadRequestException('Ya existe un registro duplicado');
    }

    throw error;
  }
}

  private getTagPrefixByCategory(categoryName: string, categoryCode?: string | null) {
    if (categoryCode) return categoryCode;

    const prefixes: Record<string, string> = {
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

    return prefixes[categoryName] ?? 'DEV';
  }

private async generateNextTag(tx: any, prefix: string) {
  const lastDevice = await tx.device.findFirst({
    where: {
      tag: {
        startsWith: prefix,
      },
    },
    orderBy: {
      tag: 'desc',
    },
  });

  if (!lastDevice) {
    return `${prefix}0001`;
  }

  const numericPart = lastDevice.tag.slice(prefix.length);
  const lastNumber = Number.parseInt(numericPart, 10);
  const nextNumber = Number.isNaN(lastNumber) ? 1 : lastNumber + 1;

  return `${prefix}${nextNumber.toString().padStart(4, '0')}`;
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

    const updatedDevice = await this.prisma.device.update({
      where: { id },
      data: {
        statusId: newStatus.id,
      },
      include: {
        category: true,
        model: true,
        status: true,
        supplier: true,
        purchaseOrder: true,
      },
    });

    await this.prisma.deviceMovement.create({
      data: {
        deviceId: id,
        type: 'CAMBIO_ESTADO',
        previousStatus: device.status.code,
        newStatus: newStatus.code,
        detail:
          dto.notes?.trim() ||
          `Cambio de estado de ${device.status.name} a ${newStatus.name}`,
      },
    });

    return updatedDevice;
  }
}
