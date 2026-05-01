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

class UpdateReceiptItemDto {
  @IsOptional()
  @IsInt()
  id?: number;

  @IsInt()
  purchaseOrderItemId!: number;

  @IsInt()
  @Min(1)
  receivedQuantity!: number;
}

export class UpdateReceiptDto {
  @IsOptional()
  @IsInt()
  purchaseOrderId?: number;

  @IsOptional()
  @IsString()
  receiptNumber?: string;

  @IsOptional()
  @IsDateString()
  receivedAt?: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsInt()
  receivedById?: number;

  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => UpdateReceiptItemDto)
  @ArrayMinSize(1)
  items?: UpdateReceiptItemDto[];
}