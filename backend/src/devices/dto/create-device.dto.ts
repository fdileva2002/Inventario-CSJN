import {
  IsDateString,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
} from 'class-validator';

export class CreateDeviceDto {
  @IsString()
  @IsNotEmpty()
  tag!: string;

  @IsString()
  @IsNotEmpty()
  serialNumber!: string;

  @IsInt()
  categoryId!: number;

  @IsInt()
  modelId!: number;

  @IsInt()
  statusId!: number;

  @IsOptional()
  @IsString()
  location?: string;

  @IsOptional()
  @IsInt()
  supplierId?: number;

  @IsOptional()
  @IsInt()
  purchaseOrderId?: number;

  @IsOptional()
  @IsDateString()
  purchaseDate?: string;

  @IsDateString()
  entryDate!: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsString()
  hostname?: string;

}