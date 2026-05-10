import { Transform, Type } from 'class-transformer';
import { IsBoolean, IsOptional, IsString, IsInt } from 'class-validator';

export class FindConsumablesDto {
  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @Transform(({ value }) => value === 'true')
  @IsBoolean()
  belowMinimum?: boolean;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  page?: number;
  
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  limit?: number;

  @IsOptional()
  @IsString()
  type?: string;
}