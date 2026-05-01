import {
  ArrayMinSize,
  IsArray,
  IsNotEmpty,
  IsString,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

class ReceiptDeviceInputDto {
  @IsString()
  @IsNotEmpty()
  serialNumber!: string;
}

export class CreateDevicesFromReceiptDto {
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => ReceiptDeviceInputDto)
  devices!: ReceiptDeviceInputDto[];
}