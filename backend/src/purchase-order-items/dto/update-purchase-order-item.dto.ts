import {
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  ValidateIf,
} from 'class-validator';
import { Type } from 'class-transformer';

export class UpdatePurchaseOrderItemDto {
  @IsOptional()
  @IsInt()
  purchaseOrderId?: number;

  @IsOptional()
  @IsIn(['DEVICE', 'CONSUMABLE'])
  itemType?: 'DEVICE' | 'CONSUMABLE';

  @ValidateIf((o) => o.itemType === 'DEVICE')
  @IsOptional()
  @IsInt()
  deviceModelId?: number;

  @ValidateIf((o) => o.itemType === 'CONSUMABLE')
  @IsOptional()
  @IsInt()
  consumableId?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  quantity?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  unitPrice?: number;

  @IsOptional()
  @IsString()
  notes?: string;
}