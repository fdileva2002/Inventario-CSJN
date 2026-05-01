import {
  IsDateString,
  IsInt,
  IsOptional,
  IsString,
  IsIn,
} from 'class-validator';

export class UpdatePurchaseOrderDto {
  @IsOptional()
  @IsString()
  number?: string;

  @IsOptional()
  @IsInt()
  supplierId?: number;

  @IsOptional()
  @IsDateString()
  date?: string;

  @IsOptional()
  @IsIn(['PENDIENTE', 'PARCIAL', 'COMPLETA', 'ANULADA'])
  status?: 'PENDIENTE' | 'PARCIAL' | 'COMPLETA' | 'ANULADA';

  @IsOptional()
  @IsString()
  notes?: string;
}