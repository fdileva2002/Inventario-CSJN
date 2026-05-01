import { Test, TestingModule } from '@nestjs/testing';
import { ConsumableAssignmentsController } from './consumable-assignments.controller';

describe('ConsumableAssignmentsController', () => {
  let controller: ConsumableAssignmentsController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ConsumableAssignmentsController],
    }).compile();

    controller = module.get<ConsumableAssignmentsController>(ConsumableAssignmentsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
