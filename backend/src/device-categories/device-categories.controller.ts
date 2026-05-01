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

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('device-categories')
export class DeviceCategoriesController {
  constructor(
    private readonly deviceCategoriesService: DeviceCategoriesService,
  ) {}

  @Roles('EDICION')
  @Post()
  create(@Body() createDeviceCategoryDto: CreateDeviceCategoryDto) {
    return this.deviceCategoriesService.create(createDeviceCategoryDto);
  }

  @Roles('EDICION', 'CONSULTA')
  @Get()
  findAll() {
    return this.deviceCategoriesService.findAll();
  }

  @Roles('EDICION', 'CONSULTA')
  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.deviceCategoriesService.findOne(id);
  }

  @Roles('EDICION')
  @Patch(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateDeviceCategoryDto: UpdateDeviceCategoryDto,
  ) {
    return this.deviceCategoriesService.update(id, updateDeviceCategoryDto);
  }

  @Roles('EDICION')
  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.deviceCategoriesService.remove(id);
  }
}