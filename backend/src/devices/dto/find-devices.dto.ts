import { Transform, Type } from 'class-transformer';
import { IsBoolean, IsInt, IsOptional, IsString } from 'class-validator';

export class FindDevicesDto {
  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  statusId?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  categoryId?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  modelId?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  purchaseOrderId?: number;

  @IsOptional()
  @Transform(({ value }) => value === 'true')
  @IsBoolean()
  assigned?: boolean;

  @IsOptional()
  @IsString()
  statusCode?: string;
  
  @IsOptional()
  @IsString()
  categoryName?: string;

  @IsOptional()
  @IsString()
  assignedTo?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  page?: number;
  
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  limit?: number;
}