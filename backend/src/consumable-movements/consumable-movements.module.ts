import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { ConsumableMovementsController } from './consumable-movements.controller';
import { ConsumableMovementsService } from './consumable-movements.service';

@Module({
  imports: [PrismaModule],
  controllers: [ConsumableMovementsController],
  providers: [ConsumableMovementsService],
})
export class ConsumableMovementsModule {}