import { Test, TestingModule } from '@nestjs/testing';
import { ConsumableMovementsService } from './consumable-movements.service';

describe('ConsumableMovementsService', () => {
  let service: ConsumableMovementsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ConsumableMovementsService],
    }).compile();

    service = module.get<ConsumableMovementsService>(ConsumableMovementsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
