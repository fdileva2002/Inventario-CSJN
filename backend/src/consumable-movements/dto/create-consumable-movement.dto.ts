import {
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';

export class CreateConsumableMovementDto {
  @IsInt()
  consumableId!: number;

  @IsIn(['SALIDA_POR_CONSUMO', 'AJUSTE_POSITIVO', 'AJUSTE_NEGATIVO'])
  type!: 'SALIDA_POR_CONSUMO' | 'AJUSTE_POSITIVO' | 'AJUSTE_NEGATIVO';

  @IsInt()
  @Min(1)
  quantity!: number;

  @IsOptional()
  @IsString()
  detail?: string;

  @IsOptional()
  @IsInt()
  userId?: number;
}