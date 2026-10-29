import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
  UseGuards
} from '@nestjs/common';
import { ConsumableAssignmentsService } from './consumable-assignments.service';
import { CreateConsumableAssignmentDto } from './dto/create-consumable-assignment.dto';
import { CreateConsumableAssignmentBatchDto } from './dto/create-consumable-assignment-batch.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { LECTURA, ASIGNACION } from '../auth/roles';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('consumable-assignments')
export class ConsumableAssignmentsController {
  constructor(
    private readonly consumableAssignmentsService: ConsumableAssignmentsService,
  ) {}

  @Roles(...ASIGNACION)
  @Post()
  create(@Body() createConsumableAssignmentDto: CreateConsumableAssignmentDto) {
    return this.consumableAssignmentsService.create(
      createConsumableAssignmentDto,
    );
  }

  // Varios consumibles en una sola entrega: se descuentan todos o ninguno.
  @Roles(...ASIGNACION)
  @Post('batch')
  createBatch(@Body() dto: CreateConsumableAssignmentBatchDto) {
    return this.consumableAssignmentsService.createBatch(dto);
  }

  @Roles(...LECTURA)
  @Get()
  findAll() {
    return this.consumableAssignmentsService.findAll();
  }

  @Roles(...LECTURA)
  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.consumableAssignmentsService.findOne(id);
  }

  @Roles(...LECTURA)
  @Get('person/:personId')
  findByPerson(@Param('personId', ParseIntPipe) personId: number) {
    return this.consumableAssignmentsService.findByPerson(personId);
  }

  @Roles(...LECTURA)
  @Get('consumable/:consumableId')
  findByConsumable(
    @Param('consumableId', ParseIntPipe) consumableId: number,
  ) {
    return this.consumableAssignmentsService.findByConsumable(consumableId);
  }
}