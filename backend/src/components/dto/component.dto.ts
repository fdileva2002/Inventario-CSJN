import { Type } from 'class-transformer';
import { IsIn, IsInt, IsNotEmpty, IsOptional, IsString, Max, Min } from 'class-validator';

export class CreateComponentDto {
  // Libre (Memoria RAM, Disco, Fuente...); el frontend sugiere los ya usados.
  @IsString()
  @IsNotEmpty()
  type!: string;

  @IsOptional()
  @IsString()
  brand?: string;

  @IsOptional()
  @IsString()
  model?: string;

  @IsOptional()
  @IsString()
  serialNumber?: string;

  // Ej: "16 GB", "512 GB SSD", "650 W".
  @IsOptional()
  @IsString()
  capacity?: string;

  @IsOptional()
  @IsString()
  notes?: string;

  // Si viene, se da de alta ya instalado en ese equipo.
  @IsOptional()
  @IsInt()
  deviceId?: number;
}

export class UpdateComponentDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  type?: string;

  @IsOptional()
  @IsString()
  brand?: string;

  @IsOptional()
  @IsString()
  model?: string;

  @IsOptional()
  @IsString()
  serialNumber?: string;

  @IsOptional()
  @IsString()
  capacity?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class InstallComponentDto {
  @IsInt()
  deviceId!: number;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class ComponentNotesDto {
  @IsOptional()
  @IsString()
  notes?: string;
}

export class FindComponentsDto {
  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsString()
  type?: string;

  @IsOptional()
  @IsIn(['DISPONIBLE', 'INSTALADO', 'BAJA'])
  status?: 'DISPONIBLE' | 'INSTALADO' | 'BAJA';

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  deviceId?: number;

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
