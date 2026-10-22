/*
  Warnings:

  - A unique constraint covering the columns `[findingKey]` on the table `validation_findings` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "extracted_fields" ADD COLUMN     "reviewStatus" TEXT NOT NULL DEFAULT 'UNREVIEWED';

-- AlterTable
ALTER TABLE "lifecycle_events" ADD COLUMN     "operatingHours" DECIMAL(14,3),
ADD COLUMN     "usageCount" INTEGER;

-- AlterTable
ALTER TABLE "validation_findings" ADD COLUMN     "findingKey" TEXT,
ADD COLUMN     "recommendedAction" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "validation_findings_findingKey_key" ON "validation_findings"("findingKey");
