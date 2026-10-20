
import { Injectable } from '@nestjs/common';

@Injectable()
export class FieldExtractionService {
  extractFields(text: string) {
    const fields = [
      'Asset ID',
      'Component ID',
      'Part Number',
      'Serial Number',
      'Installation Date',
      'Removal Date',
      'Operating Hours',
      'Usage Count',
    ];

    return fields.flatMap((field) => {
      const escaped = field.replace(
        /[.*+?^${}()|[\]\\]/g,
        '\\$&',
      );

      const regex = new RegExp(
        `^${escaped}:\\s*(.+)$`,
        'im',
      );

      const match = text.match(regex);

      if (!match) return [];

      const rawValue = match[1].trim();

      return [{
        fieldName: field,
        rawValue,
        normalizedValue: rawValue,
        sourcePage: 1,
        extractionMethod: 'TEMPLATE',
      }];
    });
  }
}
