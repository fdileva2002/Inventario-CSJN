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

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('assignments')
export class AssignmentsController {
  constructor(private readonly assignmentsService: AssignmentsService) {}

  @Roles('EDICION')
  @Post()
  create(@Body() createAssignmentDto: CreateAssignmentDto) {
    return this.assignmentsService.create(createAssignmentDto);
  }

  @Roles('EDICION', 'CONSULTA')
  @Get()
  findAll() {
    return this.assignmentsService.findAll();
  }

  @Roles('EDICION', 'CONSULTA')
  @Get('active')
  findActive() {
    return this.assignmentsService.findActive();
  }

  @Roles('EDICION')
  @Patch(':id/return')
  returnDevice(
    @Param('id', ParseIntPipe) id: number,
    @Body() returnAssignmentDto: ReturnAssignmentDto,
  ) {
    return this.assignmentsService.returnDevice(id, returnAssignmentDto);
  }

  @Roles('EDICION', 'CONSULTA')
  @Get('device/:deviceId')
  findHistoryByDevice(@Param('deviceId', ParseIntPipe) deviceId: number) {
    return this.assignmentsService.findHistoryByDevice(deviceId);
  }

  @Roles('EDICION', 'CONSULTA')
  @Get('person/:personId')
  findHistoryByPerson(@Param('personId', ParseIntPipe) personId: number) {
    return this.assignmentsService.findHistoryByPerson(personId);
  }
}