import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { DeviceCategoriesController } from './device-categories.controller';
import { DeviceCategoriesService } from './device-categories.service';

@Module({
  imports: [PrismaModule],
  controllers: [DeviceCategoriesController],
  providers: [DeviceCategoriesService],
})
export class DeviceCategoriesModule {}