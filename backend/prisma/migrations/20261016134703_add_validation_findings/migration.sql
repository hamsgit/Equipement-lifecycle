-- CreateTable
CREATE TABLE "validation_findings" (
    "id" TEXT NOT NULL,
    "ruleCode" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "severity" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "affectedRecords" JSONB,
    "evidenceDetails" JSONB,
    "detectedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "validation_findings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "validation_findings_ruleCode_idx" ON "validation_findings"("ruleCode");

-- CreateIndex
CREATE INDEX "validation_findings_severity_idx" ON "validation_findings"("severity");

-- CreateIndex
CREATE INDEX "validation_findings_status_idx" ON "validation_findings"("status");

-- CreateIndex
CREATE INDEX "validation_findings_detectedAt_idx" ON "validation_findings"("detectedAt");
