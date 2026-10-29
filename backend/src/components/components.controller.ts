import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { ASIGNACION, CARGA, LECTURA } from '../auth/roles';
import { ComponentsService } from './components.service';
import {
  ComponentNotesDto,
  CreateComponentDto,
  FindComponentsDto,
  InstallComponentDto,
  UpdateComponentDto,
} from './dto/component.dto';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('components')
export class ComponentsController {
  constructor(private readonly componentsService: ComponentsService) {}

  @Roles(...LECTURA)
  @Get()
  findAll(@Query() filters: FindComponentsDto) {
    return this.componentsService.findAll(filters);
  }

  @Roles(...LECTURA)
  @Get('types')
  findTypes() {
    return this.componentsService.findTypes();
  }

  // ?deviceId=N: todo lo que se instaló o retiró de ese equipo.
  @Roles(...LECTURA)
  @Get('movements')
  findMovementsByDevice(@Query('deviceId', ParseIntPipe) deviceId: number) {
    return this.componentsService.findMovements({ deviceId });
  }

  @Roles(...LECTURA)
  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.componentsService.findOne(id);
  }

  @Roles(...LECTURA)
  @Get(':id/movements')
  findMovements(@Param('id', ParseIntPipe) id: number) {
    return this.componentsService.findMovements({ componentId: id });
  }

  @Roles(...CARGA)
  @Post()
  create(@Body() dto: CreateComponentDto) {
    return this.componentsService.create(dto);
  }

  @Roles(...CARGA)
  @Patch(':id')
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateComponentDto) {
    return this.componentsService.update(id, dto);
  }

  @Roles(...ASIGNACION)
  @Post(':id/install')
  install(@Param('id', ParseIntPipe) id: number, @Body() dto: InstallComponentDto) {
    return this.componentsService.install(id, dto);
  }

  @Roles(...ASIGNACION)
  @Post(':id/uninstall')
  uninstall(@Param('id', ParseIntPipe) id: number, @Body() dto: ComponentNotesDto) {
    return this.componentsService.uninstall(id, dto.notes);
  }

  @Roles(...CARGA)
  @Post(':id/discard')
  discard(@Param('id', ParseIntPipe) id: number, @Body() dto: ComponentNotesDto) {
    return this.componentsService.discard(id, dto.notes);
  }
}
