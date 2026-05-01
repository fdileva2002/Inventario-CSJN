import { IsOptional, IsString } from 'class-validator';

export class FindPeopleDto {
  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsString()
  department?: string;
}