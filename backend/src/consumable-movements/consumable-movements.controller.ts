import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Query,
  UseGuards
} from '@nestjs/common';
import { ConsumableMovementsService } from './consumable-movements.service';
import { CreateConsumableMovementDto } from './dto/create-consumable-movement.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('consumable-movements')
export class ConsumableMovementsController {
  constructor(
    private readonly consumableMovementsService: ConsumableMovementsService,
  ) {}

  @Roles('EDICION')
  @Post()
  create(@Body() createConsumableMovementDto: CreateConsumableMovementDto) {
    return this.consumableMovementsService.create(createConsumableMovementDto);
  }

  @Roles('EDICION', 'CONSULTA')
  @Get()
  findAll(@Query('consumableId') consumableId?: string) {
    return this.consumableMovementsService.findAll(
      consumableId ? Number(consumableId) : undefined,
    );
  }

  @Roles('EDICION', 'CONSULTA')
  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.consumableMovementsService.findOne(id);
  }
}