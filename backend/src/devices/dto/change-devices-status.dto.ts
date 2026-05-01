import { IsIn, IsOptional, IsString } from 'class-validator';

export class ChangeDeviceStatusDto {
  @IsIn([
    'A_CONFIGURAR',
    'DISPONIBLE',
    'EN_FUNCIONAMIENTO',
    'EN_REPARACION',
    'EN_BAJA',
  ])
  statusCode!: string;

  @IsOptional()
  @IsString()
  notes?: string;
}