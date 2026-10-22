
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service';

type Field = {
  fieldName: string;
  normalizedValue: string | null;
};

@Injectable()
export class DocumentMatchingService {
  constructor(
    private readonly prisma: PrismaService,
  ) {}

  async match(fields: Field[]) {
    const getValue = (name: string) =>
      fields.find((field) => field.fieldName === name)
        ?.normalizedValue?.trim() || null;

    const assetCode = getValue('Asset ID');
    const serialNumber = getValue('Serial Number');
    const partNumber = getValue('Part Number');

    const asset = assetCode
      ? await this.prisma.asset.findUnique({
          where: { assetCode },
        })
      : null;

    const components = serialNumber
      ? await this.prisma.component.findMany({
          where: {
            serialNumber,
            ...(partNumber ? { partNumber } : {}),
          },
        })
      : [];

    return {
      asset: {
        identifier: assetCode,
        status: !assetCode
          ? 'NOT_PROVIDED'
          : asset
            ? 'MATCHED'
            : 'NOT_FOUND',
        record: asset,
      },

      component: {
        identifier: serialNumber,
        status: !serialNumber
          ? 'NOT_PROVIDED'
          : components.length === 0
            ? 'NOT_FOUND'
            : components.length === 1
              ? 'MATCHED'
              : 'AMBIGUOUS',
        records: components,
      },
    };
  }
}
