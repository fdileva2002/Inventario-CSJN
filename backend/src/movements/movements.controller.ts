import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { LECTURA } from '../auth/roles';
import { MovementsService } from './movements.service';
import { FindMovementsDto } from './dto/find-movements.dto';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('movements')
export class MovementsController {
  constructor(private readonly movementsService: MovementsService) {}

  // Página de movimientos + totales por tipo con los mismos filtros.
  @Roles(...LECTURA)
  @Get()
  findAll(@Query() filters: FindMovementsDto) {
    return this.movementsService.findAll(filters);
  }

  // Todas las filas que cumplen los filtros, para exportar a Excel.
  @Roles(...LECTURA)
  @Get('export')
  export(@Query() filters: FindMovementsDto) {
    return this.movementsService.export(filters);
  }
}
