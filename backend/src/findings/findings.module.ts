
import { Module } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { FindingsService } from './findings.service';
import { FindingsController } from './findings.controller';
import { AuditController } from './audit.controller';

@Module({
  controllers: [
    FindingsController,
    AuditController,
  ],
  providers: [
    FindingsService,
    PrismaService,
  ],
  exports: [FindingsService],
})
export class FindingsModule {}
