
import {
  Injectable,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';

import { PrismaService } from '../prisma.service';
import { Prisma } from '../generated/prisma/client';

import { CreateAssetDto } from './dto/create-asset.dto';
import { UpdateAssetDto } from './dto/update-asset.dto';

@Injectable()
export class AssetsService {
  constructor(private readonly prisma: PrismaService) {}

  // ==========================================
  // 1. GET ALL ASSETS
  // ==========================================

  async findAll() {
    return this.prisma.asset.findMany({
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  // ==========================================
  // 2. GET ASSET BY ID
  // ==========================================

  async findOne(id: string) {
    const asset = await this.prisma.asset.findUnique({
      where: { id },
    });

    if (!asset) {
      throw new NotFoundException(
        `Asset with ID '${id}' not found`,
      );
    }

    return asset;
  }

  // ==========================================
  // 3. CREATE ASSET
  // ==========================================

  async create(data: CreateAssetDto) {
    try {
      return await this.prisma.asset.create({
        data: {
          assetCode: data.assetCode,
          assetType: data.assetType,
        },
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException(
          `Asset code '${data.assetCode}' already exists`,
        );
      }

      throw error;
    }
  }

  // ==========================================
  // 4. UPDATE ASSET WITH LIFECYCLE TRACKING
  // ==========================================

  async update(id: string, data: UpdateAssetDto) {
    try {
      return await this.prisma.$transaction(
        async (tx) => {
          // Retrieve current asset inside transaction
          const existingAsset = await tx.asset.findUnique({
            where: { id },
          });

          if (!existingAsset) {
            throw new NotFoundException(
              `Asset with ID '${id}' not found`,
            );
          }

          // Determine whether status is changing
          const statusChanged =
            data.status !== undefined &&
            data.status !== existingAsset.status;

          // Update equipment information
          const updatedAsset = await tx.asset.update({
            where: { id },
            data: {
              ...(data.assetCode !== undefined && {
                assetCode: data.assetCode,
              }),
              ...(data.assetType !== undefined && {
                assetType: data.assetType,
              }),
              ...(data.status !== undefined && {
                status: data.status,
              }),
            },
          });

          // Automatically record status changes
          if (statusChanged) {
            await tx.lifecycleEvent.create({
              data: {
                eventType: 'STATUS_CHANGED',
                assetId: id,
                eventDate: new Date(),
                description:
                  `Equipment status changed from ` +
                  `${existingAsset.status} to ${data.status}`,
              },
            });
          }

          return updatedAsset;
        },
        {
          isolationLevel:
            Prisma.TransactionIsolationLevel.Serializable,
        },
      );
    } catch (error) {
      // Handle duplicate equipment codes
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException(
          `Asset code '${data.assetCode}' already exists`,
        );
      }

      // Handle concurrent transaction conflicts
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2034'
      ) {
        throw new ConflictException(
          'Equipment was modified concurrently. Please retry.',
        );
      }

      throw error;
    }
  }
}
