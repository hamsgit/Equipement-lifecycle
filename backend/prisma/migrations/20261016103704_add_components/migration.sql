-- CreateTable
CREATE TABLE "components" (
    "id" TEXT NOT NULL,
    "serialNumber" TEXT NOT NULL,
    "partNumber" TEXT,
    "componentType" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'UNKNOWN',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "components_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "components_serialNumber_idx" ON "components"("serialNumber");

-- CreateIndex
CREATE INDEX "components_partNumber_idx" ON "components"("partNumber");
