-- CreateTable
CREATE TABLE "finding_reviews" (
    "id" TEXT NOT NULL,
    "findingId" TEXT NOT NULL,
    "reviewerName" TEXT NOT NULL,
    "previousStatus" TEXT NOT NULL,
    "newStatus" TEXT NOT NULL,
    "comment" TEXT,
    "reviewedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "finding_reviews_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "finding_reviews_findingId_idx" ON "finding_reviews"("findingId");

-- CreateIndex
CREATE INDEX "finding_reviews_reviewedAt_idx" ON "finding_reviews"("reviewedAt");

-- AddForeignKey
ALTER TABLE "finding_reviews" ADD CONSTRAINT "finding_reviews_findingId_fkey" FOREIGN KEY ("findingId") REFERENCES "validation_findings"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
