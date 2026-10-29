import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
} from '@nestjs/common';
import { AssignmentsService } from './assignments.service';
import { CreateAssignmentDto } from './dto/create-assignment.dto';
import { ReturnAssignmentDto } from './dto/return-assignment.dto';
import { UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { LECTURA, ASIGNACION } from '../auth/roles';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('assignments')
export class AssignmentsController {
  constructor(private readonly assignmentsService: AssignmentsService) {}

  @Roles(...ASIGNACION)
  @Post()
  create(@Body() createAssignmentDto: CreateAssignmentDto) {
    return this.assignmentsService.create(createAssignmentDto);
  }

  @Roles(...LECTURA)
  @Get()
  findAll() {
    return this.assignmentsService.findAll();
  }

  @Roles(...LECTURA)
  @Get('active')
  findActive() {
    return this.assignmentsService.findActive();
  }

  @Roles(...ASIGNACION)
  @Patch(':id/return')
  returnDevice(
    @Param('id', ParseIntPipe) id: number,
    @Body() returnAssignmentDto: ReturnAssignmentDto,
  ) {
    return this.assignmentsService.returnDevice(id, returnAssignmentDto);
  }

  @Roles(...LECTURA)
  @Get('device/:deviceId')
  findHistoryByDevice(@Param('deviceId', ParseIntPipe) deviceId: number) {
    return this.assignmentsService.findHistoryByDevice(deviceId);
  }

  @Roles(...LECTURA)
  @Get('person/:personId')
  findHistoryByPerson(@Param('personId', ParseIntPipe) personId: number) {
    return this.assignmentsService.findHistoryByPerson(personId);
  }
}