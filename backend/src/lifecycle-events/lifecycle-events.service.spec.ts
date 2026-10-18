import { Test, TestingModule } from '@nestjs/testing';
import { LifecycleEventsService } from './lifecycle-events.service';

describe('LifecycleEventsService', () => {
  let service: LifecycleEventsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [LifecycleEventsService],
    }).compile();

    service = module.get<LifecycleEventsService>(LifecycleEventsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
