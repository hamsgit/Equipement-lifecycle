
import {
  BadRequestException,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';

import { FileInterceptor } from '@nestjs/platform-express';
import { DocumentsService } from './documents.service';

@Controller('documents')
export class DocumentsController {
  constructor(
    private readonly documentsService: DocumentsService,
  ) {}

  // Retrieve all documents
  @Get()
  findAll() {
    return this.documentsService.findAll();
  }

  // Retrieve one document with extracted fields
  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.documentsService.findOne(id);
  }
  
@Get(':id/matches')
findMatches(@Param('id', ParseUUIDPipe) id: string) {
    return this.documentsService.findMatches(id);
}

  // Upload PDF
  @Post('upload')
  @UseInterceptors(
    FileInterceptor('file', {
      limits: {
        fileSize: 10 * 1024 * 1024,
      },
    }),
  )
  upload(@UploadedFile() file: any) {
    if (!file) {
      throw new BadRequestException(
        'Please select a PDF file',
      );
    }

    return this.documentsService.upload(file);
  }
}
