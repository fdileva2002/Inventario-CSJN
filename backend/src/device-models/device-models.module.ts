import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { DeviceModelsController } from './device-models.controller';
import { DeviceModelsService } from './device-models.service';

@Module({
  imports: [PrismaModule],
  controllers: [DeviceModelsController],
  providers: [DeviceModelsService],
})
export class DeviceModelsModule {}