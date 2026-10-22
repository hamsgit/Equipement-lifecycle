
import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { createHash } from 'crypto';
import { mkdir, writeFile } from 'fs/promises';
import { join } from 'path';

import { PrismaService } from '../prisma.service';
import { PdfExtractionService } from './pdf-extraction.service';
import { FieldExtractionService } from './field-extraction.service';
import { DocumentMatchingService } from './document-matching.service';

type UploadedPdf = {
  originalname: string;
  mimetype: string;
  size: number;
  buffer: Buffer;
};

@Injectable()
export class DocumentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly pdfExtraction: PdfExtractionService,
    private readonly fieldExtraction: FieldExtractionService,
    private readonly documentMatching: DocumentMatchingService,
  ) {}

  // GET /documents
  // Retrieve all uploaded documents
  async findAll() {
    return this.prisma.document.findMany({
      orderBy: {
        uploadedAt: 'desc',
      },
    });
  }

  // GET /documents/:id
  // Retrieve one document with all extracted fields
  async findOne(id: string) {
    const document = await this.prisma.document.findUnique({
      where: {
        id,
      },
      include: {
        extractedFields: {
          orderBy: {
            createdAt: 'asc',
          },
        },
      },
    });

    if (!document) {
      throw new NotFoundException(
        `Document with ID ${id} not found`,
      );
    }

    return document;
  }

  // GET /documents/:id/matches
  // Match extracted identifiers against database records
  async findMatches(id: string) {
    const document = await this.findOne(id);

    const matches = await this.documentMatching.match(
      document.extractedFields,
    );

    return {
      documentId: document.id,
      filename: document.originalFilename,
      matches,
    };
  }

  // POST /documents/upload
  // Upload, extract, and save PDF information
  async upload(file: UploadedPdf) {
    // Step 1: Validate file presence
    if (!file) {
      throw new BadRequestException(
        'PDF file is required',
      );
    }

    // Step 2: Validate PDF format
    if (
      file.mimetype !== 'application/pdf' ||
      file.buffer.subarray(0, 5).toString() !== '%PDF-'
    ) {
      throw new BadRequestException(
        'Only PDF files are allowed',
      );
    }

    // Step 3: Validate file size
    if (file.size > 10 * 1024 * 1024) {
      throw new BadRequestException(
        'Maximum PDF size is 10 MB',
      );
    }

    // Step 4: Generate SHA256 checksum
    const sha256Hash = createHash('sha256')
      .update(file.buffer)
      .digest('hex');

    // Step 5: Check for duplicate documents
    const existing = await this.prisma.document.findUnique({
      where: {
        sha256Hash,
      },
    });

    if (existing) {
      throw new ConflictException({
        message: 'This PDF has already been uploaded',
        documentId: existing.id,
      });
    }

    // Step 6: Create uploads directory
    const uploadDirectory = join(
      process.cwd(),
      'uploads',
    );

    await mkdir(uploadDirectory, {
      recursive: true,
    });

    // Step 7: Save PDF
    const storagePath = join(
      uploadDirectory,
      `${sha256Hash}.pdf`,
    );

    await writeFile(storagePath, file.buffer);

    // Step 8: Extract PDF text
    const extraction =
      await this.pdfExtraction.extractText(file.buffer);

    // Step 9: Extract structured engineering fields
    const fields = this.fieldExtraction.extractFields(
      extraction.text,
    );

    console.log('STRUCTURED PDF EXTRACTION RESULT');
    console.log('Total pages:', extraction.totalPages);
    console.log(JSON.stringify(fields, null, 2));

    // Step 10: Save document and extracted fields
    const document = await this.prisma.document.create({
      data: {
        originalFilename: file.originalname,
        mimeType: file.mimetype,
        fileSize: file.size,
        storagePath,
        sha256Hash,

        processingStatus:
          fields.length > 0 ? 'PROCESSED' : 'PARTIAL',

        extractedFields: {
          create: fields.map((field) => ({
            fieldName: field.fieldName,
            rawValue: field.rawValue,
            normalizedValue: field.normalizedValue,
            pageNumber: field.sourcePage,
            sourceText:
              `${field.fieldName}: ${field.rawValue}`,
            extractionMethod: field.extractionMethod,
          })),
        },
      },

      include: {
        extractedFields: true,
      },
    });

    console.log(`Document saved: ${document.id}`);
    console.log(
      `Extracted fields saved: ${document.extractedFields.length}`,
    );

    return document;
  }
}
