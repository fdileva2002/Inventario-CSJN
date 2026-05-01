import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateDeviceCategoryDto {
  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsOptional()
  @IsString()
  code?: string;
}