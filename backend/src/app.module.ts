import { Module } from '@nestjs/common';
import { PrismaModule } from './prisma/prisma.module';
import { PeopleModule } from './people/people.module';
import { DevicesModule } from './devices/devices.module';
import { AssignmentsModule } from './assignments/assignments.module';
import { DeviceCategoriesModule } from './device-categories/device-categories.module';
import { DeviceModelsModule } from './device-models/device-models.module';
import { SuppliersModule } from './suppliers/suppliers.module';
import { PurchaseOrdersModule } from './purchase-orders/purchase-orders.module';
import { PurchaseOrderItemsModule } from './purchase-order-items/purchase-order-items.module';
import { ReceiptsModule } from './receipts/receipts.module';
import { ConsumablesModule } from './consumables/consumables.module';
import { ConsumableMovementsController } from './consumable-movements/consumable-movements.controller';
import { ConsumableMovementsService } from './consumable-movements/consumable-movements.service';
import { ConsumableMovementsModule } from './consumable-movements/consumable-movements.module';
import { ConsumableAssignmentsController } from './consumable-assignments/consumable-assignments.controller';
import { ConsumableAssignmentsService } from './consumable-assignments/consumable-assignments.service';
import { ConsumableAssignmentsModule } from './consumable-assignments/consumable-assignments.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { DepartmentsModule } from './departments/departments.module';

@Module({
  imports: [
    PrismaModule,
    PeopleModule,
    DevicesModule,
    AssignmentsModule,
    DeviceCategoriesModule,
    DeviceModelsModule,
    SuppliersModule,
    PurchaseOrdersModule,
    PurchaseOrderItemsModule,
    ReceiptsModule,
    ConsumablesModule,
    ConsumableMovementsModule,
    ConsumableAssignmentsModule,
    DashboardModule,
    AuthModule,
    UsersModule,
    DepartmentsModule,
  ],
  controllers: [ConsumableMovementsController, ConsumableAssignmentsController],
  providers: [ConsumableMovementsService, ConsumableAssignmentsService],
})
export class AppModule {}