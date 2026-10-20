
import { Injectable } from '@nestjs/common';
import { PDFParse } from 'pdf-parse';

@Injectable()
export class PdfExtractionService {
  async extractText(buffer: Buffer) {
    const parser = new PDFParse({
      data: new Uint8Array(buffer),
    });

    try {
      const result = await parser.getText();

      return {
        text: result.text,
        totalPages: result.total,
      };
    } finally {
      await parser.destroy();
    }
  }
}
