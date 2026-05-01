import { IsOptional, IsString } from 'class-validator';

export class ReturnAssignmentDto {
  @IsOptional()
  @IsString()
  notes?: string;
}