import { IsEmail, IsInt, IsNotEmpty, IsOptional, IsString, IsNumber } from 'class-validator';
import { Type } from 'class-transformer';

export class CreatePersonDto {
  @IsString()
  @IsNotEmpty()
  firstName!: string;

  @IsString()
  @IsNotEmpty()
  lastName!: string;

  @IsString()
  @IsNotEmpty()
  fullName!: string;

  @IsString()
  @IsNotEmpty()
  employeeId!: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  departmentId?: number;
}
