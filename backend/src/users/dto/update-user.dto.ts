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
  @IsIn(['EDICION', 'CONSULTA'])
  role?: 'EDICION' | 'CONSULTA';

  @IsOptional()
  @IsBoolean()
  active?: boolean;
}