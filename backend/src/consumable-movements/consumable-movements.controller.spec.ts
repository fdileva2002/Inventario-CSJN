import { Test, TestingModule } from '@nestjs/testing';
import { ConsumableMovementsController } from './consumable-movements.controller';

describe('ConsumableMovementsController', () => {
  let controller: ConsumableMovementsController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ConsumableMovementsController],
    }).compile();

    controller = module.get<ConsumableMovementsController>(ConsumableMovementsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
