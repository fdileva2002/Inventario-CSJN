import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class DashboardService {
  constructor(private readonly prisma: PrismaService) {}

  async getSummary() {
    const [
        devicesToConfigureList,
        devicesInRepair,
        lowStockConsumablesList,
      ] = await Promise.all([
        this.prisma.device.findMany({
          where: {
            status: { code: 'A_CONFIGURAR' },
          },
          take: 10,
          include: {
            model: true,
            category: true,
            status: true,
          },
          orderBy: { updatedAt: 'desc' },
        }),
      
        this.prisma.device.findMany({
          where: {
            status: { code: 'EN_REPARACION' },
          },
          take: 10,
          include: {
            model: true,
            category: true,
            status: true,
          },
          orderBy: { updatedAt: 'desc' },
        }),
      
        this.prisma.consumable.findMany({
          include: {
            stock: true,
          },
          orderBy: { name: 'asc' },
        }),
      ]);

    const lowStockList = lowStockConsumablesList.filter((item) => {
      const currentStock = item.stock?.currentStock ?? 0;
      return currentStock <= item.minimumStock;
    });

    const recentDeviceMovements = await this.prisma.deviceMovement.findMany({
      take: 10,
      orderBy: {
        date: 'desc',
      },
      include: {
        device: true,
        person: true,
      },
    });

    return {
      devicesToConfigure: devicesToConfigureList.length,
      lowStockConsumables: lowStockList.length,
      pendingPurchaseOrders: 0,
      partialPurchaseOrders: 0,
      
      alerts: {
      devicesToConfigure: devicesToConfigureList.map((device) => ({
        id: device.id,
        tag: device.tag,
        hostname: device.hostname,
        serialNumber: device.serialNumber,
        category: device.category.name,
        model: `${device.model.brand} ${device.model.model}`,
        status: device.status.name,
      })),
    
      devicesInRepair: devicesInRepair.map((device) => ({
        id: device.id,
        tag: device.tag,
        hostname: device.hostname,
        serialNumber: device.serialNumber,
        category: device.category.name,
        model: `${device.model.brand} ${device.model.model}`,
        status: device.status.name,
      })),
    
      lowStockConsumables: lowStockList.map((item) => ({
        id: item.id,
        name: item.name,
        brand: item.brand,
        model: item.model,
        variant: item.variant,
        currentStock: item.stock?.currentStock ?? 0,
        minimumStock: item.minimumStock,
        unitMeasure: item.unitMeasure,
      })),
    },

    recentDeviceMovements: recentDeviceMovements.map((movement) => ({
      id: movement.id,
      type: movement.type,
      previousStatus: movement.previousStatus,
      newStatus: movement.newStatus,
      detail: movement.detail,
      date: movement.date,
      deviceTag: movement.device.tag,
      deviceHostname: movement.device.hostname,
      personName: movement.person?.fullName ?? null,
    })),
  }
}
}