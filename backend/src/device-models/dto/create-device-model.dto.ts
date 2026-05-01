import { IsInt, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateDeviceModelDto {
  @IsInt()
  categoryId!: number;

  @IsString()
  @IsNotEmpty()
  brand!: string;

  @IsString()
  @IsNotEmpty()
  model!: string;

  @IsOptional()
  @IsString()
  description?: string;
}