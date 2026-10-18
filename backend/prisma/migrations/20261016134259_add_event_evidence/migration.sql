-- CreateTable
CREATE TABLE "event_evidence" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "documentId" TEXT NOT NULL,
    "pageNumber" INTEGER,
    "sourceText" TEXT,
    "evidenceType" TEXT NOT NULL DEFAULT 'SUPPORTING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "event_evidence_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "event_evidence_eventId_idx" ON "event_evidence"("eventId");

-- CreateIndex
CREATE INDEX "event_evidence_documentId_idx" ON "event_evidence"("documentId");

-- CreateIndex
CREATE UNIQUE INDEX "event_evidence_eventId_documentId_pageNumber_key" ON "event_evidence"("eventId", "documentId", "pageNumber");

-- AddForeignKey
ALTER TABLE "event_evidence" ADD CONSTRAINT "event_evidence_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "lifecycle_events"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "event_evidence" ADD CONSTRAINT "event_evidence_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "documents"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
