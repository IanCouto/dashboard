-- CreateEnum
CREATE TYPE "SavedChartType" AS ENUM ('bar', 'line');

-- CreateEnum
CREATE TYPE "SavedChartOperator" AS ENUM ('eq', 'neq', 'gt', 'gte', 'lt', 'lte', 'contains', 'in');

-- CreateTable
CREATE TABLE "saved_charts" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "chartType" "SavedChartType" NOT NULL,
    "xField" TEXT NOT NULL,
    "yField" TEXT NOT NULL,
    "comparisonField" TEXT,
    "comparisonOperator" "SavedChartOperator",
    "comparisonValue" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "saved_charts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "saved_charts_name_idx" ON "saved_charts"("name");

-- CreateIndex
CREATE INDEX "saved_charts_updatedAt_idx" ON "saved_charts"("updatedAt" DESC);
