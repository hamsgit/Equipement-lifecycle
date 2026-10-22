import { Prisma } from '../generated/prisma/client';
import { Injectable } from '@nestjs/common';
import { createHash } from 'crypto';
import { PrismaService } from '../prisma.service';

type FindingInput = {
  ruleCode: string;
  title: string;
  description: string;
  severity: string;
  recommendedAction: string;
  affectedRecords: Prisma.InputJsonObject;
  evidenceDetails: Prisma.InputJsonObject;
  identity: string[];
};

@Injectable()
export class ValidationService {
  constructor(private readonly prisma: PrismaService) {}

  private get gapDays() {
    const value = Number(process.env.VALIDATION_GAP_DAYS ?? 30);
    return Number.isFinite(value) && value >= 0 ? value : 30;
  }

  private get hoursTolerance() {
    const value = Number(
      process.env.VALIDATION_HOURS_TOLERANCE ?? 0,
    );
    return Number.isFinite(value) && value >= 0 ? value : 0;
  }

  private get countTolerance() {
    const value = Number(
      process.env.VALIDATION_COUNT_TOLERANCE ?? 0,
    );
    return Number.isFinite(value) && value >= 0 ? value : 0;
  }

  private day(value: Date | null | undefined) {
    return value?.toISOString().slice(0, 10) ?? null;
  }

  private daysBetween(a: Date, b: Date) {
    return (b.getTime() - a.getTime()) / 86400000;
  }

  private key(f: FindingInput) {
    return createHash('sha256')
      .update(JSON.stringify([f.ruleCode, ...f.identity]))
      .digest('hex');
  }

  async findAll(filters: {
    ruleCode?: string;
    severity?: string;
    status?: string;
    assetId?: string;
    componentId?: string;
  } = {}) {
    const findings = await this.prisma.validationFinding.findMany({
      where: {
        ...(filters.ruleCode
          ? { ruleCode: filters.ruleCode }
          : {}),
        ...(filters.severity
          ? { severity: filters.severity }
          : {}),
        ...(filters.status
          ? { status: filters.status }
          : {}),
      },
      include: {
        reviews: {
          orderBy: { reviewedAt: 'desc' },
        },
      },
      orderBy: { detectedAt: 'desc' },
    });

    return findings.filter((finding) => {
      const records = JSON.stringify(
        finding.affectedRecords ?? {},
      );

      if (filters.assetId && !records.includes(filters.assetId)) {
        return false;
      }

      if (
        filters.componentId &&
        !records.includes(filters.componentId)
      ) {
        return false;
      }

      return true;
    });
  }

  async run() {
    const [
      assets,
      components,
      assignments,
      events,
      documents,
    ] = await Promise.all([
      this.prisma.asset.findMany(),
      this.prisma.component.findMany(),
      this.prisma.assetAssignment.findMany({
        orderBy: [
          { installedAt: 'asc' },
          { id: 'asc' },
        ],
      }),
      this.prisma.lifecycleEvent.findMany({
        include: {
          eventEvidence: {
            include: {
              document: {
                select: {
                  id: true,
                  originalFilename: true,
                },
              },
            },
          },
        },
        orderBy: [
          { eventDate: 'asc' },
          { createdAt: 'asc' },
          { id: 'asc' },
        ],
      }),
      this.prisma.document.findMany({
        include: { extractedFields: true },
      }),
    ]);

    const findings: FindingInput[] = [];

    const add = (finding: FindingInput) => {
      findings.push(finding);
    };

    const field = (
      document: (typeof documents)[number],
      name: string,
    ) =>
      document.extractedFields.find(
        (item) => item.fieldName === name,
      )?.normalizedValue?.trim() ?? null;

    // VAL-01: Same component identifier, conflicting serials
    const serialsByComponent = new Map<
      string,
      Map<string, string[]>
    >();

    for (const document of documents) {
      const componentCode = field(document, 'Component ID');
      const serial = field(document, 'Serial Number');

      if (!componentCode || !serial) continue;

      if (!serialsByComponent.has(componentCode)) {
        serialsByComponent.set(componentCode, new Map());
      }

      const serials = serialsByComponent.get(componentCode)!;
      serials.set(serial, [
        ...(serials.get(serial) ?? []),
        document.id,
      ]);
    }

    for (const [componentCode, serials] of serialsByComponent) {
      if (serials.size <= 1) continue;

      const values = [...serials.keys()].sort();
      const documentIds = [
        ...new Set([...serials.values()].flat()),
      ].sort();

      add({
        ruleCode: 'VAL-01',
        title: 'Conflicting component serial numbers',
        description:
          `Component ${componentCode} appears with different serial numbers: ${values.join(', ')}`,
        severity: 'HIGH',
        recommendedAction:
          'Compare source documents and confirm the correct component identity.',
        affectedRecords: { componentCode, documentIds },
        evidenceDetails: {
          serialNumbers: values,
          documentIds,
        },
        identity: [componentCode],
      });
    }

    // VAL-02: Same serial identity, conflicting part numbers
    const partsBySerial = new Map<
      string,
      Map<string, string[]>
    >();

    for (const component of components) {
      if (!component.partNumber) continue;

      const parts =
        partsBySerial.get(component.serialNumber) ??
        new Map<string, string[]>();

      parts.set(component.partNumber, [
        ...(parts.get(component.partNumber) ?? []),
        component.id,
      ]);

      partsBySerial.set(component.serialNumber, parts);
    }

    for (const document of documents) {
      const serial = field(document, 'Serial Number');
      const part = field(document, 'Part Number');

      if (!serial || !part) continue;

      const parts =
        partsBySerial.get(serial) ??
        new Map<string, string[]>();

      parts.set(part, [
        ...(parts.get(part) ?? []),
        document.id,
      ]);

      partsBySerial.set(serial, parts);
    }

    for (const [serial, parts] of partsBySerial) {
      if (parts.size <= 1) continue;

      const values = [...parts.keys()].sort();
      const recordIds = [
        ...new Set([...parts.values()].flat()),
      ].sort();

      add({
        ruleCode: 'VAL-02',
        title: 'Part number conflict',
        description:
          `Serial ${serial} has conflicting part numbers: ${values.join(', ')}`,
        severity: 'HIGH',
        recommendedAction:
          'Verify part numbers against original component records.',
        affectedRecords: { serialNumber: serial, recordIds },
        evidenceDetails: { partNumbers: values, recordIds },
        identity: [serial],
      });
    }

    // VAL-03: Removal earlier than installation
    for (const assignment of assignments) {
      if (
        assignment.installedAt &&
        assignment.removedAt &&
        assignment.removedAt < assignment.installedAt
      ) {
        add({
          ruleCode: 'VAL-03',
          title: 'Removal before installation',
          description:
            'The removal date precedes the installation date.',
          severity: 'HIGH',
          recommendedAction:
            'Review installation and removal dates.',
          affectedRecords: {
            assetId: assignment.assetId,
            componentId: assignment.componentId,
            assignmentId: assignment.id,
          },
          evidenceDetails: {
            installedAt: assignment.installedAt.toISOString(),
            removedAt: assignment.removedAt.toISOString(),
          },
          identity: [assignment.id],
        });
      }
    }

    // VAL-04: Removal event without a preceding installation
    for (const removal of events) {
      if (
        !['REMOVED', 'REMOVAL'].includes(
          removal.eventType.toUpperCase(),
        ) ||
        !removal.componentId ||
        !removal.eventDate
      ) {
        continue;
      }

      const hasInstallationEvent = events.some(
        (event) =>
          event.componentId === removal.componentId &&
          event.assetId === removal.assetId &&
          ['INSTALLED', 'INSTALLATION'].includes(
            event.eventType.toUpperCase(),
          ) &&
          event.eventDate !== null &&
          event.eventDate <= removal.eventDate!,
      );

      const hasInstallationRecord = assignments.some(
        (assignment) =>
          assignment.componentId === removal.componentId &&
          assignment.assetId === removal.assetId &&
          assignment.installedAt !== null &&
          assignment.installedAt <= removal.eventDate!,
      );

      if (!hasInstallationEvent && !hasInstallationRecord) {
        add({
          ruleCode: 'VAL-04',
          title: 'Unmatched component removal',
          description:
            'A removal event has no preceding installation record.',
          severity: 'HIGH',
          recommendedAction:
            'Locate the missing installation evidence or correct the event.',
          affectedRecords: {
            assetId: removal.assetId,
            componentId: removal.componentId,
            eventId: removal.id,
          },
          evidenceDetails: {
            removalDate: removal.eventDate.toISOString(),
            documentIds: removal.eventEvidence.map(
              (e) => e.documentId,
            ),
          },
          identity: [removal.id],
        });
      }
    }

    // VAL-05: Overlapping component installation intervals
    const byComponent = new Map<
      string,
      typeof assignments
    >();

    for (const assignment of assignments) {
      const group =
        byComponent.get(assignment.componentId) ?? [];
      group.push(assignment);
      byComponent.set(assignment.componentId, group);
    }

    for (const [componentId, group] of byComponent) {
      const sorted = group
        .filter((a) => a.installedAt !== null)
        .sort(
          (a, b) =>
            a.installedAt!.getTime() -
            b.installedAt!.getTime(),
        );

      for (let i = 0; i < sorted.length; i++) {
        for (let j = i + 1; j < sorted.length; j++) {
          const a = sorted[i];
          const b = sorted[j];

          const endA =
            a.removedAt?.getTime() ?? Infinity;
          const endB =
            b.removedAt?.getTime() ?? Infinity;

          if (
            a.installedAt!.getTime() < endB &&
            b.installedAt!.getTime() < endA
          ) {
            const ids = [a.id, b.id].sort();

            add({
              ruleCode: 'VAL-05',
              title: 'Overlapping installation periods',
              description:
                'The same component has overlapping installation intervals.',
              severity: 'HIGH',
              recommendedAction:
                'Verify installation/removal dates and asset assignments.',
              affectedRecords: {
                componentId,
                assetIds: [a.assetId, b.assetId],
                assignmentIds: ids,
              },
              evidenceDetails: {
                first: {
                  installedAt: a.installedAt,
                  removedAt: a.removedAt,
                },
                second: {
                  installedAt: b.installedAt,
                  removedAt: b.removedAt,
                },
              },
              identity: ids,
            });
          }
        }
      }

      // VAL-06: Historical coverage gaps
      const closed = sorted
        .filter((a) => a.removedAt !== null)
        .sort(
          (a, b) =>
            a.removedAt!.getTime() -
            b.removedAt!.getTime(),
        );

      for (const previous of closed) {
        const next = sorted.find(
          (candidate) =>
            candidate.id !== previous.id &&
            candidate.installedAt! >
              previous.removedAt!,
        );

        if (!next) continue;

        const gap = this.daysBetween(
          previous.removedAt!,
          next.installedAt!,
        );

        if (gap > this.gapDays) {
          const ids = [previous.id, next.id].sort();

          add({
            ruleCode: 'VAL-06',
            title: 'Historical coverage gap',
            description:
              `Component history contains a ${gap.toFixed(1)}-day gap.`,
            severity: 'MEDIUM',
            recommendedAction:
              'Locate missing transfer, storage, or installation records.',
            affectedRecords: {
              componentId,
              assignmentIds: ids,
            },
            evidenceDetails: {
              previousRemoval: previous.removedAt,
              nextInstallation: next.installedAt,
              gapDays: gap,
              toleranceDays: this.gapDays,
            },
            identity: ids,
          });
        }
      }
    }

    // VAL-07 / VAL-08: Decreasing cumulative readings
    // Compare readings within the same component, or asset
    // when a component is not specified.
    const readingGroups = new Map<
      string,
      typeof events
    >();

    for (const event of events) {
      if (!event.eventDate) continue;

      const groupKey = event.componentId
        ? `component:${event.componentId}`
        : event.assetId
          ? `asset:${event.assetId}`
          : null;

      if (!groupKey) continue;

      const group = readingGroups.get(groupKey) ?? [];
      group.push(event);
      readingGroups.set(groupKey, group);
    }

    for (const [groupKey, group] of readingGroups) {
      const checks = [
        {
          ruleCode: 'VAL-07',
          title: 'Operating hours decreased',
          property: 'operatingHours' as const,
          tolerance: this.hoursTolerance,
        },
        {
          ruleCode: 'VAL-08',
          title: 'Usage count decreased',
          property: 'usageCount' as const,
          tolerance: this.countTolerance,
        },
      ];

      for (const check of checks) {
        const measured = group.filter(
          (event) => event[check.property] !== null,
        );

        for (let i = 1; i < measured.length; i++) {
          const previous = measured[i - 1];
          const current = measured[i];

          const previousValue = Number(
            previous[check.property],
          );
          const currentValue = Number(
            current[check.property],
          );

          if (
            currentValue <
            previousValue - check.tolerance
          ) {
            add({
              ruleCode: check.ruleCode,
              title: check.title,
              description:
                `${check.property} decreased from ${previousValue} to ${currentValue}.`,
              severity: 'HIGH',
              recommendedAction:
                'Verify readings and look for documented resets or replacements.',
              affectedRecords: {
                assetId: current.assetId,
                componentId: current.componentId,
                eventIds: [previous.id, current.id],
              },
              evidenceDetails: {
                previousValue,
                currentValue,
                tolerance: check.tolerance,
                documentIds: [
                  ...new Set([
                    ...previous.eventEvidence.map(
                      (e) => e.documentId,
                    ),
                    ...current.eventEvidence.map(
                      (e) => e.documentId,
                    ),
                  ]),
                ],
              },
              identity: [
                groupKey,
                previous.id,
                current.id,
              ],
            });
          }
        }
      }
    }

    // VAL-09: Conflicting values for apparently identical events
    const eventGroups = new Map<
      string,
      typeof events
    >();

    for (const event of events) {
      if (!event.eventDate) continue;

      const identity = [
        event.assetId ?? '',
        event.componentId ?? '',
        event.eventType,
        this.day(event.eventDate),
      ].join('|');

      const group = eventGroups.get(identity) ?? [];
      group.push(event);
      eventGroups.set(identity, group);
    }

    for (const [identity, group] of eventGroups) {
      if (group.length < 2) continue;

      const signatures = group.map((event) =>
        JSON.stringify({
          hours:
            event.operatingHours === null
              ? null
              : Number(event.operatingHours),
          count: event.usageCount,
        }),
      );

      if (new Set(signatures).size <= 1) continue;

      const ids = group.map((e) => e.id).sort();

      add({
        ruleCode: 'VAL-09',
        title: 'Conflicting event measurements',
        description:
          'Records for an apparently identical event contain different measurements.',
        severity: 'HIGH',
        recommendedAction:
          'Compare source documents and confirm the correct event values.',
        affectedRecords: {
          eventIds: ids,
          assetId: group[0].assetId,
          componentId: group[0].componentId,
        },
        evidenceDetails: {
          measurements: group.map((event) => ({
            eventId: event.id,
            operatingHours:
              event.operatingHours?.toString() ?? null,
            usageCount: event.usageCount,
            documentIds: event.eventEvidence.map(
              (e) => e.documentId,
            ),
          })),
        },
        identity: [identity],
      });
    }

    // VAL-10: Missing supporting document evidence
    const evidenceRequired = new Set([
      'INSTALLED',
      'INSTALLATION',
      'REMOVED',
      'REMOVAL',
      'TRANSFER',
      'TRANSFERRED',
      'MAINTENANCE',
      'MAINTENANCE_STARTED',
      'MAINTENANCE_COMPLETED',
      'OPERATING_READING',
    ]);

    for (const event of events) {
      if (
        !evidenceRequired.has(event.eventType.toUpperCase()) ||
        event.eventEvidence.length > 0
      ) {
        continue;
      }

      add({
        ruleCode: 'VAL-10',
        title: 'Missing supporting evidence',
        description:
          `Event ${event.id} has no linked supporting document.`,
        severity: 'MEDIUM',
        recommendedAction:
          'Attach the relevant technical record or document the missing evidence.',
        affectedRecords: {
          eventId: event.id,
          assetId: event.assetId,
          componentId: event.componentId,
        },
        evidenceDetails: {
          eventType: event.eventType,
          eventDate: event.eventDate,
          documentIds: [],
          missingEvidence: true,
        },
        identity: [event.id],
      });
    }

    // Remove duplicates within this run.
    const unique = new Map<string, FindingInput>();

    for (const finding of findings) {
      unique.set(this.key(finding), finding);
    }

    let created = 0;
    let updated = 0;
    let unchanged = 0;

    // Persist findings atomically.
    await this.prisma.$transaction(async (tx) => {
      for (const [findingKey, finding] of unique) {
        const existing =
          await tx.validationFinding.findUnique({
            where: { findingKey },
          });

        const data = {
          ruleCode: finding.ruleCode,
          title: finding.title,
          description: finding.description,
          severity: finding.severity,
          recommendedAction:
            finding.recommendedAction,
          affectedRecords: finding.affectedRecords,
          evidenceDetails: finding.evidenceDetails,
        };

        if (!existing) {
          await tx.validationFinding.create({
            data: {
              findingKey,
              ...data,
              status: 'OPEN',
            },
          });
          created++;
        } else if (
          existing.status === 'OPEN' ||
          existing.status === 'UNDER_REVIEW'
        ) {
          await tx.validationFinding.update({
            where: { id: existing.id },
            data,
          });
          updated++;
        } else {
          // Preserve reviewer decisions.
          unchanged++;
        }
      }
    }, { timeout: 30000 });

    const savedFindings =
      await this.prisma.validationFinding.findMany({
        where: {
          findingKey: { in: [...unique.keys()] },
        },
        orderBy: [
          { ruleCode: 'asc' },
          { detectedAt: 'asc' },
        ],
      });

    return {
      status: 'COMPLETED',
      scanned: {
        assets: assets.length,
        components: components.length,
        assignments: assignments.length,
        events: events.length,
        documents: documents.length,
      },
      configuration: {
        gapDays: this.gapDays,
        hoursTolerance: this.hoursTolerance,
        countTolerance: this.countTolerance,
      },
      summary: {
        detected: unique.size,
        created,
        updated,
        preservedReviewerDecisions: unchanged,
      },
      findings: savedFindings,
    };
  }
}
