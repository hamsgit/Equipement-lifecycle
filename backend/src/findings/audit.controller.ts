
import { Controller, Get, Query } from '@nestjs/common';
import { FindingsService } from './findings.service';

@Controller('audit')
export class AuditController {
  constructor(private readonly service: FindingsService) {}

  @Get()
  findAll(
    @Query('entityType') entityType?: string,
    @Query('entityId') entityId?: string,
  ) {
    return this.service.auditHistory(
      entityType,
      entityId,
    );
  }
}
