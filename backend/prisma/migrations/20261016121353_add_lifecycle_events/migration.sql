-- CreateTable
CREATE TABLE "lifecycle_events" (
    "id" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "assetId" TEXT,
    "componentId" TEXT,
    "eventDate" TIMESTAMP(3),
    "description" TEXT,
    "usageValue" DECIMAL(14,3),
    "usageUnit" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "lifecycle_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "lifecycle_events_assetId_idx" ON "lifecycle_events"("assetId");

-- CreateIndex
CREATE INDEX "lifecycle_events_componentId_idx" ON "lifecycle_events"("componentId");

-- CreateIndex
CREATE INDEX "lifecycle_events_eventType_idx" ON "lifecycle_events"("eventType");

-- CreateIndex
CREATE INDEX "lifecycle_events_eventDate_idx" ON "lifecycle_events"("eventDate");

-- AddForeignKey
ALTER TABLE "lifecycle_events" ADD CONSTRAINT "lifecycle_events_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "assets"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lifecycle_events" ADD CONSTRAINT "lifecycle_events_componentId_fkey" FOREIGN KEY ("componentId") REFERENCES "components"("id") ON DELETE SET NULL ON UPDATE CASCADE;
