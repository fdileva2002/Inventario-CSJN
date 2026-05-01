import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { PurchaseOrderItemsController } from './purchase-order-items.controller';
import { PurchaseOrderItemsService } from './purchase-order-items.service';

@Module({
  imports: [PrismaModule],
  controllers: [PurchaseOrderItemsController],
  providers: [PurchaseOrderItemsService],
})
export class PurchaseOrderItemsModule {}