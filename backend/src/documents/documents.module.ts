
import { Module } from '@nestjs/common';
import { DocumentsController } from './documents.controller';
import { DocumentsService } from './documents.service';
import { PdfExtractionService } from './pdf-extraction.service';
import { PrismaService } from '../prisma.service';
import { FieldExtractionService } from './field-extraction.service';

@Module({
  controllers: [DocumentsController],
  providers: [
    DocumentsService,
    PdfExtractionService,
    PrismaService,
    FieldExtractionService,
  ],
})
export class DocumentsModule {}
