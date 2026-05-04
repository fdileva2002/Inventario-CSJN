import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateConsumableDto } from './dto/create-consumable.dto';
import { UpdateConsumableDto } from './dto/update-consumable.dto';
import { FindConsumablesDto } from './dto/find-consumables.dto';

@Injectable()
export class ConsumablesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(createConsumableDto: CreateConsumableDto) {
    try {
      const consumable = await this.prisma.consumable.create({
        data: {
          ...createConsumableDto,
          minimumStock: createConsumableDto.minimumStock ?? 0,
        },
      });

      // Crear stock inicial
      await this.prisma.consumableStock.create({
        data: {
          consumableId: consumable.id,
          currentStock: 0,
        },
      });

      return this.findOne(consumable.id);
    } catch (error: any) {
      if (error.code === 'P2002') {
        throw new BadRequestException(
          'Ya existe un consumible con esos datos',
        );
      }
      throw error;
    }
  }

  async findAll(filters: FindConsumablesDto) {
    const where: any = { active: true };
    
    if (filters.search) {
      where.OR = [
        { name: { contains: filters.search, mode: 'insensitive' } },
        { brand: { contains: filters.search, mode: 'insensitive' } },
        { model: { contains: filters.search, mode: 'insensitive' } },
        { variant: { contains: filters.search, mode: 'insensitive' } },
      ];
    }
  
    const page = filters.page ?? 0;
    const limit = filters.limit ?? 40;
  
    const allConsumables = await this.prisma.consumable.findMany({
      where,
      include: { stock: true },
      orderBy: [{ name: 'asc' }, { model: 'asc' }],
    });
  
    const filtered = filters.belowMinimum === true
      ? allConsumables.filter(c => (c.stock?.currentStock ?? 0) <= c.minimumStock)
      : allConsumables;
  
    const total = filtered.length;
    const data = filtered.slice(page * limit, page * limit + limit);
  
    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async findOne(id: number) {
    const consumable = await this.prisma.consumable.findUnique({
      where: { id },
      include: {
        stock: true,
        movements: {
          orderBy: { date: 'desc' },
          take: 10,
        },
      },
    });

    if (!consumable) {
      throw new NotFoundException(
        `No se encontró el consumible con id ${id}`,
      );
    }

    return consumable;
  }

  async update(id: number, updateConsumableDto: UpdateConsumableDto) {
    await this.findOne(id);

    try {
      return await this.prisma.consumable.update({
        where: { id },
        data: updateConsumableDto,
      });
    } catch (error: any) {
      if (error.code === 'P2002') {
        throw new BadRequestException(
          'Ya existe un consumible con esos datos',
        );
      }
      throw error;
    }
  }

  async remove(id: number) {
    await this.findOne(id);

    try {
      return await this.prisma.consumable.delete({
        where: { id },
      });
    } catch (error: any) {
      const message = String(error?.message ?? '');

      if (
        error.code === 'P2003' ||
        message.includes('foreign key constraint')
      ) {
        throw new BadRequestException(
          'No se puede eliminar porque tiene movimientos asociados',
        );
      }

      throw error;
    }
  }
}