-- CreateEnum
CREATE TYPE "PathCategory" AS ENUM ('SOFTWARE_ENGINEERING', 'DATA_AND_AI', 'CLOUD_AND_DEVOPS', 'CYBERSECURITY', 'PRODUCT_AND_DESIGN', 'FOUNDATIONS', 'OTHER');

-- AlterTable
ALTER TABLE "CareerPath" ADD COLUMN     "category" "PathCategory" NOT NULL DEFAULT 'OTHER',
ADD COLUMN     "featured" BOOLEAN NOT NULL DEFAULT false;

-- CreateIndex
CREATE INDEX "CareerPath_category_idx" ON "CareerPath"("category");
