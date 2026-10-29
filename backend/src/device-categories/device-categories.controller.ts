import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { DeviceCategoriesService } from './device-categories.service';
import { CreateDeviceCategoryDto } from './dto/create-device-category.dto';
import { UpdateDeviceCategoryDto } from './dto/update-device-category.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { LECTURA, CARGA, TOTAL } from '../auth/roles';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('device-categories')
export class DeviceCategoriesController {
  constructor(
    private readonly deviceCategoriesService: DeviceCategoriesService,
  ) {}

  @Roles(...CARGA)
  @Post()
  create(@Body() createDeviceCategoryDto: CreateDeviceCategoryDto) {
    return this.deviceCategoriesService.create(createDeviceCategoryDto);
  }

  @Roles(...LECTURA)
  @Get()
  findAll() {
    return this.deviceCategoriesService.findAll();
  }

  @Roles(...LECTURA)
  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.deviceCategoriesService.findOne(id);
  }

  @Roles(...CARGA)
  @Patch(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateDeviceCategoryDto: UpdateDeviceCategoryDto,
  ) {
    return this.deviceCategoriesService.update(id, updateDeviceCategoryDto);
  }

  @Roles(...TOTAL)
  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.deviceCategoriesService.remove(id);
  }
}