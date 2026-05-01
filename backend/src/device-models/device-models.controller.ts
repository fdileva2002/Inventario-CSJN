import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { DeviceModelsService } from './device-models.service';
import { CreateDeviceModelDto } from './dto/create-device-model.dto';
import { UpdateDeviceModelDto } from './dto/update-device-model.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('device-models')
export class DeviceModelsController {
  constructor(private readonly deviceModelsService: DeviceModelsService) {}

  @Roles('EDICION')
  @Post()
  create(@Body() createDeviceModelDto: CreateDeviceModelDto) {
    return this.deviceModelsService.create(createDeviceModelDto);
  }

  @Roles('EDICION', 'CONSULTA')
  @Get()
  findAll(@Query('search') search?: string) {
    return this.deviceModelsService.findAll(search);
  }

  @Roles('EDICION', 'CONSULTA')
  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.deviceModelsService.findOne(id);
  }

  @Roles('EDICION')
  @Patch(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateDeviceModelDto: UpdateDeviceModelDto,
  ) {
    return this.deviceModelsService.update(id, updateDeviceModelDto);
  }

  @Roles('EDICION')
  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.deviceModelsService.remove(id);
  }
}