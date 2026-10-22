
import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '../generated/prisma/client';
import { PrismaService } from '../prisma.service';

export const REVIEW_STATUSES = [
  'OPEN',
  'UNDER_REVIEW',
  'RESOLVED',
  'ACCEPTED_EXCEPTION',
] as const;

export type ReviewStatus =
  (typeof REVIEW_STATUSES)[number];

export interface ReviewFindingInput {
  reviewerName: string;
  status: ReviewStatus;
  comment: string;
}

export interface FindingFilters {
  ruleCode?: string;
  severity?: string;
  status?: string;
  assetId?: string;
  componentId?: string;
}

@Injectable()
export class FindingsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(filters: FindingFilters = {}) {
    const findings =
      await this.prisma.validationFinding.findMany({
        where: {
          ...(filters.ruleCode && {
            ruleCode: filters.ruleCode,
          }),
          ...(filters.severity && {
            severity: filters.severity,
          }),
          ...(filters.status && {
            status: filters.status,
          }),
        },
        include: {
          reviews: {
            orderBy: { reviewedAt: 'desc' },
          },
        },
        orderBy: [
          { detectedAt: 'desc' },
          { id: 'asc' },
        ],
      });

    return findings.filter((finding) => {
      const affected = finding.affectedRecords;

      if (!filters.assetId && !filters.componentId) {
        return true;
      }

      if (
        !affected ||
        typeof affected !== 'object' ||
        Array.isArray(affected)
      ) {
        return false;
      }

      if (
        filters.assetId &&
        affected.assetId !== filters.assetId &&
        !(
          Array.isArray(affected.assetIds) &&
          affected.assetIds.includes(filters.assetId)
        )
      ) {
        return false;
      }

      if (
        filters.componentId &&
        affected.componentId !== filters.componentId
      ) {
        return false;
      }

      return true;
    });
  }

  async findOne(id: string) {
    const finding =
      await this.prisma.validationFinding.findUnique({
        where: { id },
        include: {
          reviews: {
            orderBy: { reviewedAt: 'desc' },
          },
        },
      });

    if (!finding) {
      throw new NotFoundException('Finding not found');
    }

    const auditHistory =
      await this.prisma.auditLog.findMany({
        where: {
          entityType: 'ValidationFinding',
          entityId: id,
        },
        orderBy: { createdAt: 'asc' },
      });

    return { ...finding, auditHistory };
  }

  async review(id: string, input: ReviewFindingInput) {
    const reviewerName = input.reviewerName?.trim();
    const comment = input.comment?.trim();

    if (!reviewerName) {
      throw new BadRequestException(
        'Reviewer name is required',
      );
    }

    if (!comment) {
      throw new BadRequestException(
        'A review explanation is required',
      );
    }

    if (!REVIEW_STATUSES.includes(input.status)) {
      throw new BadRequestException(
        'Invalid finding review status',
      );
    }

    return this.prisma.$transaction(async (tx) => {
      // Lock the finding row to prevent concurrent reviews
      // from recording an incorrect previous status.
      const rows = await tx.$queryRaw<
        Array<{ id: string; status: string }>
      >`
        SELECT id, status
        FROM validation_findings
        WHERE id = ${id}
        FOR UPDATE
      `;

      if (rows.length === 0) {
        throw new NotFoundException('Finding not found');
      }

      const previousStatus = rows[0].status;

      const updated = await tx.validationFinding.update({
        where: { id },
        data: {
          status: input.status,
          resolvedAt:
            input.status === 'RESOLVED' ||
            input.status === 'ACCEPTED_EXCEPTION'
              ? new Date()
              : null,
        },
      });

      const review = await tx.findingReview.create({
        data: {
          findingId: id,
          reviewerName,
          previousStatus,
          newStatus: input.status,
          comment,
        },
      });

      const audit = await tx.auditLog.create({
        data: {
          actorName: reviewerName,
          action: 'FINDING_REVIEW',
          entityType: 'ValidationFinding',
          entityId: id,
          previousData: {
            status: previousStatus,
          } satisfies Prisma.InputJsonObject,
          newData: {
            status: input.status,
            reviewId: review.id,
            comment,
          } satisfies Prisma.InputJsonObject,
          reason: comment,
        },
      });

      return {
        message: 'Review saved successfully',
        finding: updated,
        review,
        audit,
      };
    });
  }

  async auditHistory(
    entityType?: string,
    entityId?: string,
  ) {
    return this.prisma.auditLog.findMany({
      where: {
        ...(entityType && { entityType }),
        ...(entityId && { entityId }),
      },
      orderBy: { createdAt: 'desc' },
      take: 500,
    });
  }
}

