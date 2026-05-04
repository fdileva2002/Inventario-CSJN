import { IsInt, IsOptional, IsString } from 'class-validator';

export class CreateAssignmentDto {
  @IsInt()
  deviceId!: number;

  @IsOptional()
  @IsInt()
  personId?: number;

  @IsOptional()
  @IsInt()
  departmentId?: number;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsString()
  location?: string;
}