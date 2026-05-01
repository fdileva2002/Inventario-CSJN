import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateDeviceModelDto } from './dto/create-device-model.dto';
import { UpdateDeviceModelDto } from './dto/update-device-model.dto';

@Injectable()
export class DeviceModelsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(createDeviceModelDto: CreateDeviceModelDto) {
    const category = await this.prisma.deviceCategory.findUnique({
      where: { id: createDeviceModelDto.categoryId },
    });

    if (!category) {
      throw new NotFoundException('La categoría indicada no existe');
    }

    try {
      return await this.prisma.deviceModel.create({
        data: createDeviceModelDto,
        include: {
          category: true,
        },
      });
    } catch (error: any) {
      if (error.code === 'P2002') {
        throw new BadRequestException(
          'Ya existe un modelo con esa marca y nombre dentro de la categoría',
        );
      }

      throw error;
    }
  }

  async findAll(search?: string) {
    return this.prisma.deviceModel.findMany({
      where: search
        ? {
            OR: [
              {
                brand: {
                  contains: search,
                  mode: 'insensitive',
                },
              },
              {
                model: {
                  contains: search,
                  mode: 'insensitive',
                },
              },
              {
                category: {
                  name: {
                    contains: search,
                    mode: 'insensitive',
                  },
                },
              },
            ],
          }
        : undefined,
      include: {
        category: true,
      },
      orderBy: [
        {
          brand: 'asc',
        },
        {
          model: 'asc',
        },
      ],
    });
  }

  async findOne(id: number) {
    const deviceModel = await this.prisma.deviceModel.findUnique({
      where: { id },
      include: {
        category: true,
      },
    });

    if (!deviceModel) {
      throw new NotFoundException(
        `No se encontró el modelo de dispositivo con id ${id}`,
      );
    }

    return deviceModel;
  }

  async update(id: number, updateDeviceModelDto: UpdateDeviceModelDto) {
    await this.findOne(id);

    if (updateDeviceModelDto.categoryId !== undefined) {
      const category = await this.prisma.deviceCategory.findUnique({
        where: { id: updateDeviceModelDto.categoryId },
      });

      if (!category) {
        throw new NotFoundException('La categoría indicada no existe');
      }
    }

    try {
      return await this.prisma.deviceModel.update({
        where: { id },
        data: updateDeviceModelDto,
        include: {
          category: true,
        },
      });
    } catch (error: any) {
      const message = String(error?.message ?? '');

      if (error.code === 'P2002') {
        throw new BadRequestException(
          'Ya existe un modelo con esa marca y nombre dentro de la categoría',
        );
      }

      if (
        error.code === 'P2003' ||
        message.includes('foreign key constraint') ||
        message.includes('violates foreign key constraint')
      ) {
        throw new BadRequestException(
          'La categoría indicada no existe o no se puede usar',
        );
      }

      throw error;
    }
  }

  async remove(id: number) {
    await this.findOne(id);

    try {
      return await this.prisma.deviceModel.delete({
        where: { id },
      });
    } catch (error: any) {
      const message = String(error?.message ?? '');

      if (
        error.code === 'P2003' ||
        message.includes('violates RESTRICT setting') ||
        message.includes('foreign key constraint')
      ) {
        throw new BadRequestException(
          'No se puede eliminar el modelo porque tiene dispositivos asociados',
        );
      }

      throw error;
    }
  }
}