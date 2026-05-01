import {
  IsDateString,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsIn,
} from 'class-validator';

export class CreatePurchaseOrderDto {
  @IsString()
  @IsNotEmpty()
  number!: string;

  @IsInt()
  supplierId!: number;

  @IsDateString()
  date!: string;

  @IsOptional()
  @IsIn(['PENDIENTE', 'PARCIAL', 'COMPLETA', 'ANULADA'])
  status?: 'PENDIENTE' | 'PARCIAL' | 'COMPLETA' | 'ANULADA';

  @IsOptional()
  @IsString()
  notes?: string;
}