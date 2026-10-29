import { UserRole } from '@prisma/client';
import { IsEmail, IsIn, IsNotEmpty, IsString, MinLength } from 'class-validator';

export class CreateUserDto {
  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(6)
  password!: string;

  @IsString()
  @IsIn(['SUPERADMIN', 'ADMINISTRADOR', 'TECNICO', 'CONSULTA'])
  role!: UserRole;
}