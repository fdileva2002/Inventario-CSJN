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
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('consumable-assignments')
export class ConsumableAssignmentsController {
  constructor(
    private readonly consumableAssignmentsService: ConsumableAssignmentsService,
  ) {}

  @Roles('EDICION')
  @Post()
  create(@Body() createConsumableAssignmentDto: CreateConsumableAssignmentDto) {
    return this.consumableAssignmentsService.create(
      createConsumableAssignmentDto,
    );
  }

  @Roles('EDICION', 'CONSULTA')
  @Get()
  findAll() {
    return this.consumableAssignmentsService.findAll();
  }

  @Roles('EDICION', 'CONSULTA')
  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.consumableAssignmentsService.findOne(id);
  }

  @Roles('EDICION', 'CONSULTA')
  @Get('person/:personId')
  findByPerson(@Param('personId', ParseIntPipe) personId: number) {
    return this.consumableAssignmentsService.findByPerson(personId);
  }

  @Roles('EDICION', 'CONSULTA')
  @Get('consumable/:consumableId')
  findByConsumable(
    @Param('consumableId', ParseIntPipe) consumableId: number,
  ) {
    return this.consumableAssignmentsService.findByConsumable(consumableId);
  }
}