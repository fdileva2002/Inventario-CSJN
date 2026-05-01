import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateSupplierDto } from './dto/create-supplier.dto';
import { UpdateSupplierDto } from './dto/update-supplier.dto';

@Injectable()
export class SuppliersService {
  constructor(private readonly prisma: PrismaService) {}

  async create(createSupplierDto: CreateSupplierDto) {
    try {
      return await this.prisma.supplier.create({
        data: createSupplierDto,
      });
    } catch (error: any) {
      if (error.code === 'P2002') {
        throw new BadRequestException('Ya existe un proveedor duplicado');
      }

      throw error;
    }
  }

  async findAll(search?: string) {
    return this.prisma.supplier.findMany({
      where: search
        ? {
            OR: [
              {
                name: {
                  contains: search,
                  mode: 'insensitive',
                },
              },
              {
                taxId: {
                  contains: search,
                  mode: 'insensitive',
                },
              },
              {
                email: {
                  contains: search,
                  mode: 'insensitive',
                },
              },
              {
                phone: {
                  contains: search,
                  mode: 'insensitive',
                },
              },
            ],
          }
        : undefined,
      orderBy: {
        name: 'asc',
      },
    });
  }

  async findOne(id: number) {
    const supplier = await this.prisma.supplier.findUnique({
      where: { id },
    });

    if (!supplier) {
      throw new NotFoundException(
        `No se encontró el proveedor con id ${id}`,
      );
    }

    return supplier;
  }

  async update(id: number, updateSupplierDto: UpdateSupplierDto) {
    await this.findOne(id);

    try {
      return await this.prisma.supplier.update({
        where: { id },
        data: updateSupplierDto,
      });
    } catch (error: any) {
      if (error.code === 'P2002') {
        throw new BadRequestException('Ya existe un proveedor duplicado');
      }

      throw error;
    }
  }

  async remove(id: number) {
    await this.findOne(id);

    try {
      return await this.prisma.supplier.delete({
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
          'No se puede eliminar el proveedor porque tiene órdenes de compra o dispositivos asociados',
        );
      }

      throw error;
    }
  }
}