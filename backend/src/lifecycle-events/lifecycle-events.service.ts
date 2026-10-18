
import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { PrismaService } from '../prisma.service';
import { CreateLifecycleEventDto } from './dto/create-lifecycle-event.dto';

@Injectable()
export class LifecycleEventsService {
  constructor(
    private readonly prisma: PrismaService,
  ) {}

  // ==========================================
  // 1. GET ALL LIFECYCLE EVENTS
  // ==========================================

  async findAll() {
    return this.prisma.lifecycleEvent.findMany({
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  // ==========================================
  // 2. CREATE A NEW LIFECYCLE EVENT
  // ==========================================

  async create(data: CreateLifecycleEventDto) {
    // At least one identifier is required
    if (!data.assetId && !data.componentId) {
      throw new BadRequestException(
        'Either assetId or componentId is required',
      );
    }

    // Validate UUID v4 identifiers
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

    // Verify that the asset exists
    if (data.assetId) {
      const asset = await this.prisma.asset.findUnique({
        where: {
          id: data.assetId,
        },
      });

      if (!asset) {
        throw new NotFoundException(
          `Asset with ID '${data.assetId}' not found`,
        );
      }
    }

    // Verify that the component exists
    if (data.componentId) {
      const component = await this.prisma.component.findUnique({
        where: {
          id: data.componentId,
        },
      });

      if (!component) {
        throw new NotFoundException(
          `Component with ID '${data.componentId}' not found`,
        );
      }
    }

    // Save the event to PostgreSQL
    return this.prisma.lifecycleEvent.create({
      data: {
        eventType: data.eventType,
        assetId: data.assetId,
        componentId: data.componentId,
        eventDate: data.eventDate
          ? new Date(data.eventDate)
          : new Date(),
        description: data.description,
      },
    });
  }

  // ==========================================
  // 3. GET LIFECYCLE HISTORY BY ASSET ID
  // ==========================================

  async findByAsset(assetId: string) {
    // Verify that the asset exists
    const asset = await this.prisma.asset.findUnique({
      where: {
        id: assetId,
      },
    });

    if (!asset) {
      throw new NotFoundException(
        `Asset with ID '${assetId}' not found`,
      );
    }

    // Retrieve events belonging to this asset
    return this.prisma.lifecycleEvent.findMany({
      where: {
        assetId: assetId,
      },
      orderBy: [
        {
          eventDate: 'desc',
        },
        {
          createdAt: 'desc',
        },
      ],
    });
  }
}
