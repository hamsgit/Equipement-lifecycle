
import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { PrismaService } from '../prisma.service';
import { CreateLifecycleEventDto } from './dto/create-lifecycle-event.dto';

@Injectable()
export class LifecycleEventsService {
  constructor(private readonly prisma: PrismaService) {}

  private readonly evidenceInclude = {
    eventEvidence: {
      include: {
        document: {
          select: {
            id: true,
            originalFilename: true,
            processingStatus: true,
          },
        },
      },
    },
  };

  // Deterministic chronological ordering
  private readonly chronologicalOrder = [
    { eventDate: 'asc' as const },
    { createdAt: 'asc' as const },
    { id: 'asc' as const },
  ];

  // GET /lifecycle-events
  async findAll() {
    return this.prisma.lifecycleEvent.findMany({
      include: this.evidenceInclude,
      orderBy: this.chronologicalOrder,
    });
  }

  // POST /lifecycle-events
  async create(data: CreateLifecycleEventDto) {
    if (!data.assetId && !data.componentId) {
      throw new BadRequestException(
        'Either assetId or componentId is required',
      );
    }

    const uuidV4 =
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

    if (
      (data.assetId && !uuidV4.test(data.assetId)) ||
      (data.componentId && !uuidV4.test(data.componentId))
    ) {
      throw new BadRequestException(
        'assetId and componentId must be valid UUID v4 values',
      );
    }

    if (data.assetId) {
      const asset = await this.prisma.asset.findUnique({
        where: { id: data.assetId },
      });

      if (!asset) {
        throw new NotFoundException(
          `Asset with ID '${data.assetId}' not found`,
        );
      }
    }

    if (data.componentId) {
      const component = await this.prisma.component.findUnique({
        where: { id: data.componentId },
      });

      if (!component) {
        throw new NotFoundException(
          `Component with ID '${data.componentId}' not found`,
        );
      }
    }

    const eventDate = data.eventDate
      ? new Date(data.eventDate)
      : new Date();

    if (Number.isNaN(eventDate.getTime())) {
      throw new BadRequestException(
        'Invalid eventDate',
      );
    }

    return this.prisma.lifecycleEvent.create({
      data: {
        eventType: data.eventType,
        assetId: data.assetId,
        componentId: data.componentId,
        eventDate,
        description: data.description,
      },
      include: this.evidenceInclude,
    });
  }

  // GET /lifecycle-events/asset/:assetId
  async findByAsset(assetId: string) {
    const asset = await this.prisma.asset.findUnique({
      where: { id: assetId },
    });

    if (!asset) {
      throw new NotFoundException(
        `Asset with ID '${assetId}' not found`,
      );
    }

    return this.prisma.lifecycleEvent.findMany({
      where: { assetId },
      include: this.evidenceInclude,
      orderBy: this.chronologicalOrder,
    });
  }

  // GET /lifecycle-events/component/:componentId
  async findByComponent(componentId: string) {
    const component = await this.prisma.component.findUnique({
      where: { id: componentId },
    });

    if (!component) {
      throw new NotFoundException(
        `Component with ID '${componentId}' not found`,
      );
    }

    return this.prisma.lifecycleEvent.findMany({
      where: { componentId },
      include: this.evidenceInclude,
      orderBy: this.chronologicalOrder,
    });
  }

  // GET /lifecycle-events/:id
  async findOne(id: string) {
    const event = await this.prisma.lifecycleEvent.findUnique({
      where: { id },
      include: this.evidenceInclude,
    });

    if (!event) {
      throw new NotFoundException(
        `Lifecycle event '${id}' not found`,
      );
    }

    return event;
  }

  // POST /lifecycle-events/reconstruct/:documentId
  async reconstructFromDocument(documentId: string) {
    const document = await this.prisma.document.findUnique({
      where: { id: documentId },
      include: { extractedFields: true },
    });

    if (!document) {
      throw new NotFoundException(
        `Document '${documentId}' not found`,
      );
    }

    const getField = (name: string) =>
      document.extractedFields
        .find((field) => field.fieldName === name)
        ?.normalizedValue?.trim() || null;

    const assetCode = getField('Asset ID');
    const serialNumber = getField('Serial Number');
    const partNumber = getField('Part Number');

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

    const issues: string[] = [];

    if (assetCode && !asset) {
      issues.push(`Asset '${assetCode}' not found`);
    }

    if (serialNumber && components.length === 0) {
      issues.push(
        `Component '${serialNumber}' not found or part number conflicts`,
      );
    }

    if (components.length > 1) {
      issues.push(
        `Ambiguous component match for '${serialNumber}'`,
      );
    }

    if (issues.length > 0) {
      return {
        documentId,
        status: 'REVIEW_REQUIRED',
        issues,
        createdEvents: [],
      };
    }

    if (!asset && components.length !== 1) {
      return {
        documentId,
        status: 'REVIEW_REQUIRED',
        issues: ['No matching asset or component'],
        createdEvents: [],
      };
    }

    const installationDate = getField('Installation Date');
    const removalDate = getField('Removal Date');
    const operatingHours = getField('Operating Hours');
    const usageCount = getField('Usage Count');

    const events: {
      eventType: string;
      date: string;
    }[] = [];

    if (installationDate) {
      events.push({
        eventType: 'INSTALLED',
        date: installationDate,
      });
    }

    if (removalDate) {
      events.push({
        eventType: 'REMOVED',
        date: removalDate,
      });
    }

    if (events.length === 0) {
      return {
        documentId,
        status: 'REVIEW_REQUIRED',
        issues: ['No supported lifecycle event date found'],
        createdEvents: [],
      };
    }

    for (const event of events) {
      const date = new Date(event.date);

      if (Number.isNaN(date.getTime())) {
        return {
          documentId,
          status: 'REVIEW_REQUIRED',
          issues: [
            `Invalid ${event.eventType} date: ${event.date}`,
          ],
          createdEvents: [],
        };
      }
    }

    const parseMeasurement = (
      value: string | null,
      label: string,
    ) => {
      if (value === null) return null;

      const cleaned = value.replace(/,/g, '').trim();

      if (!/^\d+(\.\d+)?$/.test(cleaned)) {
        throw new BadRequestException(
          `Invalid ${label}: ${value}`,
        );
      }

      return cleaned;
    };

    const hours = parseMeasurement(
      operatingHours,
      'Operating Hours',
    );

    const count = parseMeasurement(
      usageCount,
      'Usage Count',
    );

    if (count !== null && !/^\d+$/.test(count)) {
      throw new BadRequestException(
        'Usage Count must be a whole number',
      );
    }

    const countNumber = count === null ? null : Number(count);

    if (
      countNumber !== null &&
      !Number.isSafeInteger(countNumber)
    ) {
      throw new BadRequestException(
        'Usage Count exceeds the supported integer range',
      );
    }

    // Use a transaction so all event/evidence writes succeed together.
    return this.prisma.$transaction(async (tx) => {
      const existingEvidence = await tx.eventEvidence.findMany({
        where: { documentId },
        include: { event: true },
      });

      const createdEvents: unknown[] = [];
      const skippedEvents: string[] = [];

      for (const event of events) {
        const eventDate = new Date(event.date);

        const alreadyExists = existingEvidence.some(
          (evidence) =>
            evidence.event.eventType === event.eventType &&
            evidence.event.eventDate?.getTime() ===
              eventDate.getTime(),
        );

        if (alreadyExists) {
          skippedEvents.push(event.eventType);
          continue;
        }

        const created = await tx.lifecycleEvent.create({
          data: {
            eventType: event.eventType,
            assetId: asset?.id ?? null,
            componentId: components[0]?.id ?? null,
            eventDate,
            description:
              `Reconstructed from ${document.originalFilename}`,
            operatingHours: hours,
            usageCount: countNumber,
            eventEvidence: {
              create: {
                documentId,
                pageNumber:
                  document.extractedFields.find(
                    (field) =>
                      field.fieldName ===
                      (event.eventType === 'INSTALLED'
                        ? 'Installation Date'
                        : 'Removal Date'),
                  )?.pageNumber ?? null,
                sourceText:
                  `${event.eventType} date: ${event.date}`,
              },
            },
          },
          include: this.evidenceInclude,
        });

        createdEvents.push(created);
      }

      return {
        documentId,
        status:
          createdEvents.length > 0
            ? 'RECONSTRUCTED'
            : 'ALREADY_PROCESSED',
        createdEvents,
        skippedEvents,
      };
    });
  }
}
