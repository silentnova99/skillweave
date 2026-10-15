-- CreateEnum
CREATE TYPE "SubmissionFileKind" AS ENUM ('SOURCE', 'TEST', 'CONFIG', 'README', 'SCREENSHOT', 'OTHER');

-- CreateEnum
CREATE TYPE "ReviewStatus" AS ENUM ('QUEUED', 'RUNNING', 'COMPLETED', 'FAILED');

-- CreateEnum
CREATE TYPE "CheckCategory" AS ENUM ('STRUCTURE', 'COMPILE', 'TESTS', 'REQUIREMENTS', 'QUALITY', 'SECURITY', 'DOCUMENTATION');

-- CreateEnum
CREATE TYPE "CheckStatus" AS ENUM ('PASS', 'FAIL', 'WARN', 'SKIPPED');

-- AlterTable
ALTER TABLE "ProjectSubmission" ADD COLUMN     "fileCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "kind" TEXT,
ADD COLUMN     "language" TEXT,
ADD COLUMN     "lastScore" INTEGER,
ADD COLUMN     "reviewCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "reviewStatus" "ReviewStatus",
ADD COLUMN     "totalBytes" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "SubmissionFile" (
    "id" TEXT NOT NULL,
    "submissionId" TEXT NOT NULL,
    "path" TEXT NOT NULL,
    "kind" "SubmissionFileKind" NOT NULL DEFAULT 'OTHER',
    "language" TEXT,
    "sizeBytes" INTEGER NOT NULL,
    "lines" INTEGER,
    "sha256" TEXT NOT NULL,
    "storageKey" TEXT,
    "excerpt" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SubmissionFile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SubmissionReview" (
    "id" TEXT NOT NULL,
    "submissionId" TEXT NOT NULL,
    "runNumber" INTEGER NOT NULL DEFAULT 1,
    "trigger" TEXT NOT NULL DEFAULT 'SUBMITTED',
    "status" "ReviewStatus" NOT NULL DEFAULT 'COMPLETED',
    "score" INTEGER,
    "summary" TEXT NOT NULL,
    "checks" JSONB NOT NULL DEFAULT '[]',
    "environment" TEXT,
    "nextActivity" TEXT,
    "durationMs" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SubmissionReview_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SubmissionFile_submissionId_idx" ON "SubmissionFile"("submissionId");

-- CreateIndex
CREATE UNIQUE INDEX "SubmissionFile_submissionId_path_key" ON "SubmissionFile"("submissionId", "path");

-- CreateIndex
CREATE INDEX "SubmissionReview_submissionId_idx" ON "SubmissionReview"("submissionId");

-- AddForeignKey
ALTER TABLE "SubmissionFile" ADD CONSTRAINT "SubmissionFile_submissionId_fkey" FOREIGN KEY ("submissionId") REFERENCES "ProjectSubmission"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SubmissionReview" ADD CONSTRAINT "SubmissionReview_submissionId_fkey" FOREIGN KEY ("submissionId") REFERENCES "ProjectSubmission"("id") ON DELETE CASCADE ON UPDATE CASCADE;
