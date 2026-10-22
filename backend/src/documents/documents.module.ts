
import { Module } from '@nestjs/common';

import { DocumentsController } from './documents.controller';
import { DocumentsService } from './documents.service';
import { PdfExtractionService } from './pdf-extraction.service';
import { FieldExtractionService } from './field-extraction.service';
import { DocumentMatchingService } from './document-matching.service';

import { PrismaService } from '../prisma.service';

@Module({
  controllers: [DocumentsController],

  providers: [
    DocumentsService,
    PdfExtractionService,
    FieldExtractionService,
    DocumentMatchingService,
    PrismaService,
  ],
})
export class DocumentsModule {}
