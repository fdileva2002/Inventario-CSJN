import { UserRole } from '@prisma/client';
import { IsBoolean, IsEmail, IsIn, IsOptional, IsString } from 'class-validator';

export class UpdateUserDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  @IsIn(['SUPERADMIN', 'ADMINISTRADOR', 'TECNICO', 'CONSULTA'])
  role?: UserRole;

  @IsOptional()
  @IsBoolean()
  active?: boolean;
}