-- CreateTable
CREATE TABLE "extracted_fields" (
    "id" TEXT NOT NULL,
    "documentId" TEXT NOT NULL,
    "fieldName" TEXT NOT NULL,
    "rawValue" TEXT NOT NULL,
    "normalizedValue" TEXT,
    "pageNumber" INTEGER,
    "sourceText" TEXT,
    "boundingBox" JSONB,
    "extractionMethod" TEXT,
    "confidence" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "extracted_fields_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "extracted_fields_documentId_idx" ON "extracted_fields"("documentId");

-- CreateIndex
CREATE INDEX "extracted_fields_fieldName_idx" ON "extracted_fields"("fieldName");

-- AddForeignKey
ALTER TABLE "extracted_fields" ADD CONSTRAINT "extracted_fields_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "documents"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
