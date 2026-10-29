import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { getCurrentUserId } from '../common/request-context';
import { CreatePurchaseOrderDto } from './dto/create-purchase-order.dto';
import { UpdatePurchaseOrderDto } from './dto/update-purchase-order.dto';

@Injectable()
export class PurchaseOrdersService {
  constructor(private readonly prisma: PrismaService) {}

  async create(createPurchaseOrderDto: CreatePurchaseOrderDto) {
    const supplier = await this.prisma.supplier.findUnique({
      where: { id: createPurchaseOrderDto.supplierId },
    });

    if (!supplier) {
      throw new NotFoundException('El proveedor indicado no existe');
    }

    if (createPurchaseOrderDto.parentOrderId) {
      const parent = await this.prisma.purchaseOrder.findUnique({
        where: { id: createPurchaseOrderDto.parentOrderId },
      });
      if (!parent) {
        throw new NotFoundException('La orden original indicada no existe');
      }
    }

    try {
      return await this.prisma.transaction((tx) => tx.purchaseOrder.create({
        data: {
          number: createPurchaseOrderDto.number.trim(),
          supplierId: createPurchaseOrderDto.supplierId,
          date: new Date(createPurchaseOrderDto.date),
          status: createPurchaseOrderDto.status ?? 'PENDIENTE',
          notes: createPurchaseOrderDto.notes,
          parentOrderId: createPurchaseOrderDto.parentOrderId ?? null,
          createdById: getCurrentUserId(),
        },
        include: {
          supplier: true,
          parentOrder: true,
        },
      }));
    } catch (error: any) {
      if (error.code === 'P2002') {
        throw new BadRequestException(
          'Ya existe una orden de compra con ese número',
        );
      }

      throw error;
    }
  }

  async findAll(search?: string, year?: string) {
    const where: any = {};
    const validStatuses = ['PENDIENTE', 'PARCIAL', 'COMPLETA', 'ANULADA'];

    if (search) {
      where.OR = [
        { number: { contains: search, mode: 'insensitive' } },
        { supplier: { name: { contains: search, mode: 'insensitive' } } },
        ...(validStatuses.includes(search.toUpperCase())
          ? [{ status: { equals: search.toUpperCase() as any } }]
          : []),
      ];
    }

    if (year) {
      where.number = {
        contains: year,
        mode: 'insensitive',
      };
    }

    return this.prisma.purchaseOrder.findMany({
      where,
      include: {
        supplier: true,
        parentOrder: { select: { id: true, number: true } },
        childOrders: { select: { id: true, number: true }, orderBy: { date: 'asc' } },
      },
      orderBy: { date: 'desc' },
    });
  }

  async findOne(id: number) {
    const purchaseOrder = await this.prisma.purchaseOrder.findUnique({
      where: { id },
      include: {
        supplier: true,
        parentOrder: { select: { id: true, number: true } },
        childOrders: { select: { id: true, number: true }, orderBy: { date: 'asc' } },
      },
    });

    if (!purchaseOrder) {
      throw new NotFoundException(
        `No se encontró la orden de compra con id ${id}`,
      );
    }

    return purchaseOrder;
  }

  async update(id: number, updatePurchaseOrderDto: UpdatePurchaseOrderDto) {
    await this.findOne(id);

    if (updatePurchaseOrderDto.supplierId !== undefined) {
      const supplier = await this.prisma.supplier.findUnique({
        where: { id: updatePurchaseOrderDto.supplierId },
      });

      if (!supplier) {
        throw new NotFoundException('El proveedor indicado no existe');
      }
    }

    try {
      return await this.prisma.transaction((tx) => tx.purchaseOrder.update({
        where: { id },
        data: {
          ...updatePurchaseOrderDto,
          number:
            updatePurchaseOrderDto.number !== undefined
              ? updatePurchaseOrderDto.number.trim()
              : undefined,
          date: updatePurchaseOrderDto.date
            ? new Date(updatePurchaseOrderDto.date)
            : undefined,
        },
        include: {
          supplier: true,
        },
      }));
    } catch (error: any) {
      if (error.code === 'P2002') {
        throw new BadRequestException(
          'Ya existe una orden de compra con ese número',
        );
      }

      throw error;
    }
  }

  async remove(id: number) {
    const order = await this.findOne(id);

    // La relación de ampliación es opcional: sin este control, borrar la original
    // dejaría a sus ampliaciones sin referencia en silencio.
    if (order.childOrders.length > 0) {
      throw new BadRequestException(
        `No se puede eliminar: es la orden original de ${order.childOrders.map((o) => o.number).join(', ')}`,
      );
    }

    try {
      return await this.prisma.transaction((tx) => tx.purchaseOrder.delete({
        where: { id },
      }));
    } catch (error: any) {
      const message = String(error?.message ?? '');

      if (
        error.code === 'P2003' ||
        message.includes('violates RESTRICT setting') ||
        message.includes('foreign key constraint')
      ) {
        throw new BadRequestException(
          'No se puede eliminar la orden de compra porque tiene ítems, recepciones o dispositivos asociados',
        );
      }

      throw error;
    }
  }
}