import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateDeviceCategoryDto } from './dto/create-device-category.dto';
import { UpdateDeviceCategoryDto } from './dto/update-device-category.dto';

@Injectable()
export class DeviceCategoriesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(createDeviceCategoryDto: CreateDeviceCategoryDto) {
    try {
      return await this.prisma.deviceCategory.create({
        data: createDeviceCategoryDto,
      });
    } catch (error: any) {
      if (error.code === 'P2002') {
        throw new BadRequestException('Ya existe una categoría con ese nombre');
      }

      throw error;
    }
  }

  async findAll() {
    return this.prisma.deviceCategory.findMany({
      orderBy: {
        name: 'asc',
      },
    });
  }

  async findOne(id: number) {
    const category = await this.prisma.deviceCategory.findUnique({
      where: { id },
    });

    if (!category) {
      throw new NotFoundException(
        `No se encontró la categoría de dispositivo con id ${id}`,
      );
    }

    return category;
  }

  async update(id: number, updateDeviceCategoryDto: UpdateDeviceCategoryDto) {
    await this.findOne(id);

    try {
      return await this.prisma.deviceCategory.update({
        where: { id },
        data: updateDeviceCategoryDto,
      });
    } catch (error: any) {
      if (error.code === 'P2002') {
        throw new BadRequestException('Ya existe una categoría con ese nombre');
      }

      throw error;
    }
  }

  async remove(id: number) {
  await this.findOne(id);

  try {
    return await this.prisma.deviceCategory.delete({
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
        'No se puede eliminar la categoría porque tiene modelos o dispositivos asociados',
      );
    }

        throw error;
        }
    }
}