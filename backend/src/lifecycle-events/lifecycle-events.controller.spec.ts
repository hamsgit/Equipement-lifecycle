import { Test, TestingModule } from '@nestjs/testing';
import { LifecycleEventsController } from './lifecycle-events.controller';

describe('LifecycleEventsController', () => {
  let controller: LifecycleEventsController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [LifecycleEventsController],
    }).compile();

    controller = module.get<LifecycleEventsController>(LifecycleEventsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
