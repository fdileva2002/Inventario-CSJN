import { IsInt, IsOptional, IsString } from 'class-validator';

export class CreateAssignmentDto {
  @IsInt()
  deviceId!: number;

  @IsInt()
  personId!: number;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsString()
  location?: string;
}