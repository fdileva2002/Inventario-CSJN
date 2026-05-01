import { IsInt, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateSmartDeviceDto {
  @IsInt()
  modelId!: number;

  @IsString()
  @IsNotEmpty()
  serialNumber!: string;

  @IsOptional()
  @IsString()
  location?: string;

  @IsOptional()
  @IsString()
  statusCode?: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsString()
  hostname?: string;
}