import { Test, TestingModule } from '@nestjs/testing';
import { PurchaseOrderItemsController } from './purchase-order-items.controller';

describe('PurchaseOrderItemsController', () => {
  let controller: PurchaseOrderItemsController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [PurchaseOrderItemsController],
    }).compile();

    controller = module.get<PurchaseOrderItemsController>(PurchaseOrderItemsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
