import { Module } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { PrismaModule } from './prisma/prisma.module';
import { RequestContextInterceptor } from './common/request-context';
import { AuditModule } from './audit/audit.module';
import { ComponentsModule } from './components/components.module';
import { MovementsModule } from './movements/movements.module';
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
import { ConsumableMovementsModule } from './consumable-movements/consumable-movements.module';
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
    AuditModule,
    ComponentsModule,
    MovementsModule,
  ],
  providers: [{ provide: APP_INTERCEPTOR, useClass: RequestContextInterceptor }],
})
export class AppModule {}