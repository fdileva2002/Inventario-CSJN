import { Body, Controller, Delete, Get, Param, Post, UseGuards } from '@nestjs/common';
import { DepartmentsService } from './departments.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('departments')
export class DepartmentsController {
  constructor(private readonly departmentsService: DepartmentsService) {}

  @Roles('EDICION', 'CONSULTA')
  @Get()
  findAll() {
    return this.departmentsService.findAll();
  }

  @Roles('EDICION')
  @Post()
  create(@Body() body: { name: string }) {
    return this.departmentsService.create(body.name);
  }

  @Roles('EDICION')
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.departmentsService.remove(+id);
  }
}
