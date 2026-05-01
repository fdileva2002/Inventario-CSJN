import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { PurchaseOrderItemsService } from './purchase-order-items.service';
import { CreatePurchaseOrderItemDto } from './dto/create-purchase-order-item.dto';
import { UpdatePurchaseOrderItemDto } from './dto/update-purchase-order-item.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('purchase-order-items')
export class PurchaseOrderItemsController {
  constructor(
    private readonly purchaseOrderItemsService: PurchaseOrderItemsService,
  ) {}

  @Roles('EDICION')
  @Post()
  create(@Body() createPurchaseOrderItemDto: CreatePurchaseOrderItemDto) {
    return this.purchaseOrderItemsService.create(createPurchaseOrderItemDto);
  }

  @Roles('EDICION', 'CONSULTA')
  @Get()
  findAll(@Query('purchaseOrderId') purchaseOrderId?: string) {
    return this.purchaseOrderItemsService.findAll(
      purchaseOrderId ? Number(purchaseOrderId) : undefined,
    );
  }

  @Roles('EDICION', 'CONSULTA')
  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.purchaseOrderItemsService.findOne(id);
  }

  @Roles('EDICION')
  @Patch(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updatePurchaseOrderItemDto: UpdatePurchaseOrderItemDto,
  ) {
    return this.purchaseOrderItemsService.update(id, updatePurchaseOrderItemDto);
  }

  @Roles('EDICION')
  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.purchaseOrderItemsService.remove(id);
  }
}