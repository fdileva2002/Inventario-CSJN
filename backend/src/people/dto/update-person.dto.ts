import { IsEmail, IsInt, IsNotEmpty, IsOptional, IsString, IsNumber, IsBoolean } from 'class-validator';
import { Type } from 'class-transformer';

export class UpdatePersonDto {
  @IsOptional()
  @IsString()
  firstName?: string;

  @IsOptional()
  @IsString()
  lastName?: string;

  @IsOptional()
  @IsString()
  fullName?: string;

  @IsOptional()
  @IsString()
  employeeId?: string;

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

  @IsOptional()
  @IsBoolean()
  active?: boolean;
}