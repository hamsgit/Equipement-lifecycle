import { Test, TestingModule } from '@nestjs/testing';
import { FieldExtractionService } from './field-extraction.service';

describe('FieldExtractionService', () => {
  let service: FieldExtractionService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [FieldExtractionService],
    }).compile();

    service = module.get<FieldExtractionService>(FieldExtractionService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
