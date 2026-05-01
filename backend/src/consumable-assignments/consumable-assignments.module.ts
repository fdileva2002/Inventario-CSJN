import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { ConsumableAssignmentsController } from './consumable-assignments.controller';
import { ConsumableAssignmentsService } from './consumable-assignments.service';

@Module({
  imports: [PrismaModule],
  controllers: [ConsumableAssignmentsController],
  providers: [ConsumableAssignmentsService],
})
export class ConsumableAssignmentsModule {}