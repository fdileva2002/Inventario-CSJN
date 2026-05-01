import { Test, TestingModule } from '@nestjs/testing';
import { ConsumableAssignmentsService } from './consumable-assignments.service';

describe('ConsumableAssignmentsService', () => {
  let service: ConsumableAssignmentsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ConsumableAssignmentsService],
    }).compile();

    service = module.get<ConsumableAssignmentsService>(ConsumableAssignmentsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
