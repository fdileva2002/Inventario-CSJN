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
import { LECTURA, ASIGNACION, CARGA, TOTAL } from '../auth/roles';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('devices')
export class DevicesController {
  constructor(private readonly devicesService: DevicesService) {}

  @Roles(...CARGA)
  @Post()
  create(@Body() createDeviceDto: CreateDeviceDto) {
    return this.devicesService.create(createDeviceDto);
  }

  @Roles(...LECTURA)
  @Get()
  findAll(@Query() filters: FindDevicesDto) {
    return this.devicesService.findAll(filters);
  }

  // Antes de ':id' para que 'export' no se tome como id.
  @Roles(...LECTURA)
  @Get('export')
  export(@Query() filters: FindDevicesDto) {
    return this.devicesService.export(filters);
  }

  @Roles(...LECTURA)
  @Get(':id/movements')
  findMovements(@Param('id', ParseIntPipe) id: number) {
    return this.devicesService.findMovements(id);
  }

  @Roles(...LECTURA)
  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.devicesService.findOne(id);
  }

  @Roles(...ASIGNACION)
  @Patch(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateDeviceDto: UpdateDeviceDto,
  ) {
    return this.devicesService.update(id, updateDeviceDto);
  }

  @Roles(...TOTAL)
  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.devicesService.remove(id);
  }
  
  @Roles(...CARGA)
  @Post('manual-smart')
  createSmart(@Body() createSmartDeviceDto: CreateSmartDeviceDto) {
    return this.devicesService.createSmart(createSmartDeviceDto);
  }

  @Roles(...CARGA)
  @Patch(':id/status')
  changeStatus(
    @Param('id', ParseIntPipe) id: number,
    @Body() changeDeviceStatusDto: ChangeDeviceStatusDto,
  ) {
    return this.devicesService.changeStatus(id, changeDeviceStatusDto);
  }
}

