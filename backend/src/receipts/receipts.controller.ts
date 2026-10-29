import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  UploadedFile,
  UseInterceptors,
  UseGuards,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ReceiptsService } from './receipts.service';
import { CreateReceiptDto } from './dto/create-receipt.dto';
import { UpdateReceiptDto } from './dto/update-receipt.dto';
import { CreateDevicesFromReceiptDto } from './dto/create-devices-from-receipt.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { LECTURA, CARGA } from '../auth/roles';


@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('receipts')
export class ReceiptsController {
  constructor(private readonly receiptsService: ReceiptsService) {}

  @Roles(...CARGA)
  @Post()
  create(@Body() createReceiptDto: CreateReceiptDto) {
    return this.receiptsService.create(createReceiptDto);
  }

  @Roles(...LECTURA)
  @Get()
  findAll(@Query('purchaseOrderId') purchaseOrderId?: string) {
    return this.receiptsService.findAll(
      purchaseOrderId ? Number(purchaseOrderId) : undefined,
    );
  }

  @Roles(...LECTURA)
  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.receiptsService.findOne(id);
  }

  @Roles(...CARGA)
  @Patch(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateReceiptDto: UpdateReceiptDto,
  ) {
    return this.receiptsService.update(id, updateReceiptDto);
  }

  @Roles(...CARGA)
  @Post(':id/devices')
  createDevicesFromReceipt(
    @Param('id', ParseIntPipe) id: number,
    @Body() createDevicesFromReceiptDto: CreateDevicesFromReceiptDto,
  ) {
    return this.receiptsService.createDevicesFromReceipt(
      id,
      createDevicesFromReceiptDto,
    );
  }

  @Roles(...CARGA)
  @Post(':id/devices/import')
  @UseInterceptors(FileInterceptor('file'))
  importDevicesFromReceipt(
    @Param('id', ParseIntPipe) id: number,
    @UploadedFile() file: any,
  ) {
    return this.receiptsService.importDevicesFromReceipt(id, file);
  }
}