import { IsOptional, IsString, MinLength } from 'class-validator';

export class UpdateUserPasswordDto {
  @IsOptional()
  @IsString()
  currentPassword?: string;

  @IsString()
  @MinLength(6)
  password!: string;
}