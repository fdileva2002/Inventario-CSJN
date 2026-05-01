import {
  ArrayMinSize,
  IsDateString,
  IsInt,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

class CreateReceiptItemDto {
  @IsInt()
  purchaseOrderItemId!: number;

  @IsInt()
  @Min(1)
  receivedQuantity!: number;
}

export class CreateReceiptDto {
  @IsInt()
  purchaseOrderId!: number;

  @IsOptional()
  @IsString()
  receiptNumber?: string;

  @IsDateString()
  receivedAt!: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsInt()
  receivedById?: number;

  @ValidateNested({ each: true })
  @Type(() => CreateReceiptItemDto)
  @ArrayMinSize(1)
  items!: CreateReceiptItemDto[];
}