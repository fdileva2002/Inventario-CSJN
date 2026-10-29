import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { AuditService } from './audit.service';
import { FindAuditDto } from './dto/find-audit.dto';
import { LECTURA } from '../auth/roles';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('audit')
export class AuditController {
  constructor(private readonly auditService: AuditService) {}

  @Roles(...LECTURA)
  @Get()
  findAll(@Query() filters: FindAuditDto) {
    return this.auditService.findAll(filters);
  }
}
