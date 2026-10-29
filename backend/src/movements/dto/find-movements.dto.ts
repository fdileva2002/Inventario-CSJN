import { Transform, Type } from 'class-transformer';
import {
  IsArray,
  IsDateString,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';

export const MOVEMENT_KINDS = ['DEVICE', 'CONSUMABLE', 'COMPONENT'] as const;
export type MovementKind = (typeof MOVEMENT_KINDS)[number];

export class FindMovementsDto {
  @IsIn(MOVEMENT_KINDS)
  kind!: MovementKind;

  // Varios tipos separados por coma: ?types=ASIGNACION,DEVOLUCION
  @IsOptional()
  @Transform(({ value }) =>
    (Array.isArray(value) ? value : String(value).split(',')).map((v: string) => v.trim()).filter(Boolean),
  )
  @IsArray()
  @IsString({ each: true })
  types?: string[];

  // Desde (incluido) y hasta (excluido), en ISO. El frontend manda el inicio del día
  // siguiente como "hasta" para que el último día entre completo en hora local.
  @IsOptional()
  @IsDateString()
  from?: string;

  @IsOptional()
  @IsDateString()
  to?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  personId?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  departmentId?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  userId?: number;

  // Tag, serie u hostname del equipo; nombre o modelo del consumible; tipo o serie del componente.
  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  page?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(200)
  limit?: number;
}
