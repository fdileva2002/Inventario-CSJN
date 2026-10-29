import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsInt,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';

export class ConsumableAssignmentItemDto {
  @IsInt()
  consumableId!: number;

  @IsInt()
  @Min(1)
  quantity!: number;
}

// Una entrega con varios consumibles al mismo destinatario.
export class CreateConsumableAssignmentBatchDto {
  @IsOptional()
  @IsInt()
  personId?: number;

  @IsOptional()
  @IsInt()
  departmentId?: number;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(100)
  @ValidateNested({ each: true })
  @Type(() => ConsumableAssignmentItemDto)
  items!: ConsumableAssignmentItemDto[];
}
