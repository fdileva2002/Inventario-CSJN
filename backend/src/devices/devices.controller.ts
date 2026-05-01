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
  UseGuards
} from '@nestjs/common';
import { DevicesService } from './devices.service';
import { CreateDeviceDto } from './dto/create-device.dto';
import { UpdateDeviceDto } from './dto/update-device.dto';
import { CreateSmartDeviceDto } from './dto/create-smart-device.dto';
import { FindDevicesDto } from './dto/find-devices.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { ChangeDeviceStatusDto } from './dto/change-devices-status.dto';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('devices')
export class DevicesController {
  constructor(private readonly devicesService: DevicesService) {}

  @Roles('EDICION')
  @Post()
  create(@Body() createDeviceDto: CreateDeviceDto) {
    return this.devicesService.create(createDeviceDto);
  }

  @Roles('EDICION', 'CONSULTA')
  @Get()
  findAll(@Query() filters: FindDevicesDto) {
    return this.devicesService.findAll(filters);
  }

  @Roles('EDICION', 'CONSULTA')
  @Get(':id/movements')
  findMovements(@Param('id', ParseIntPipe) id: number) {
    return this.devicesService.findMovements(id);
  }

  @Roles('EDICION', 'CONSULTA')
  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.devicesService.findOne(id);
  }

  @Roles('EDICION')
  @Patch(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateDeviceDto: UpdateDeviceDto,
  ) {
    return this.devicesService.update(id, updateDeviceDto);
  }

  @Roles('EDICION')
  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.devicesService.remove(id);
  }
  
  @Roles('EDICION')
  @Post('manual-smart')
  createSmart(@Body() createSmartDeviceDto: CreateSmartDeviceDto) {
    return this.devicesService.createSmart(createSmartDeviceDto);
  }

  @Roles('EDICION')
  @Patch(':id/status')
  changeStatus(
    @Param('id', ParseIntPipe) id: number,
    @Body() changeDeviceStatusDto: ChangeDeviceStatusDto,
  ) {
    return this.devicesService.changeStatus(id, changeDeviceStatusDto);
  }
}

