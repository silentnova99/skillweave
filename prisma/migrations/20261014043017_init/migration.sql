-- CreateEnum
CREATE TYPE "Role" AS ENUM ('LEARNER', 'ADMIN');

-- CreateEnum
CREATE TYPE "SkillLevel" AS ENUM ('ABSOLUTE_BEGINNER', 'BEGINNER', 'INTERMEDIATE', 'ADVANCED');

-- CreateEnum
CREATE TYPE "ResourceType" AS ENUM ('OFFICIAL_DOCS', 'TEXTBOOK', 'UNIVERSITY_COURSE', 'VIDEO', 'TUTORIAL', 'OPEN_SOURCE', 'PRACTICE_EXERCISES', 'CODING_CHALLENGE', 'REFERENCE', 'ARTICLE');

-- CreateEnum
CREATE TYPE "ResourceRole" AS ENUM ('PRIMARY', 'ALTERNATIVE', 'EXAMPLE', 'EXERCISE', 'ADVANCED_REFERENCE', 'REVISION');

-- CreateEnum
CREATE TYPE "ResourceStatus" AS ENUM ('UNVERIFIED', 'VERIFIED', 'BROKEN', 'DEPRECATED');

-- CreateEnum
CREATE TYPE "ChapterKind" AS ENUM ('STANDARD', 'OPTIONAL', 'REVISION');

-- CreateEnum
CREATE TYPE "QuestionType" AS ENUM ('SINGLE_CHOICE', 'MULTIPLE_ANSWER', 'SHORT_ANSWER', 'CODING');

-- CreateEnum
CREATE TYPE "AssessmentType" AS ENUM ('DIAGNOSTIC', 'CHAPTER_QUIZ', 'MODULE_ASSESSMENT', 'REVISION', 'MOCK_EXAM', 'INTERVIEW_BANK');

-- CreateEnum
CREATE TYPE "AttemptStatus" AS ENUM ('IN_PROGRESS', 'SUBMITTED', 'GRADED', 'ABANDONED');

-- CreateEnum
CREATE TYPE "ProgressStatus" AS ENUM ('NOT_STARTED', 'IN_PROGRESS', 'COMPLETED');

-- CreateEnum
CREATE TYPE "ProjectLevel" AS ENUM ('BEGINNER', 'INTERMEDIATE', 'ADVANCED');

-- CreateEnum
CREATE TYPE "SubmissionStatus" AS ENUM ('DRAFT', 'SUBMITTED', 'PASSED', 'NEEDS_WORK');

-- CreateEnum
CREATE TYPE "ReportKind" AS ENUM ('BROKEN_LINK', 'INCORRECT_MAPPING', 'ACCESS_CHANGED', 'OTHER');

-- CreateEnum
CREATE TYPE "ReportStatus" AS ENUM ('OPEN', 'RESOLVED', 'DISMISSED');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "name" TEXT,
    "email" TEXT NOT NULL,
    "emailVerified" TIMESTAMP(3),
    "image" TEXT,
    "passwordHash" TEXT,
    "role" "Role" NOT NULL DEFAULT 'LEARNER',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Account" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "providerAccountId" TEXT NOT NULL,
    "refresh_token" TEXT,
    "access_token" TEXT,
    "expires_at" INTEGER,
    "token_type" TEXT,
    "scope" TEXT,
    "id_token" TEXT,
    "session_state" TEXT,

    CONSTRAINT "Account_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL,
    "sessionToken" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VerificationToken" (
    "identifier" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL
);

-- CreateTable
CREATE TABLE "Profile" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "targetCareerPathId" TEXT,
    "targetRole" TEXT,
    "skillLevel" "SkillLevel" NOT NULL DEFAULT 'ABSOLUTE_BEGINNER',
    "existingKnowledge" TEXT,
    "experienceSummary" TEXT,
    "weeklyHours" INTEGER NOT NULL DEFAULT 5,
    "targetWeeks" INTEGER,
    "preferReading" BOOLEAN NOT NULL DEFAULT true,
    "preferVideo" BOOLEAN NOT NULL DEFAULT false,
    "preferPractice" BOOLEAN NOT NULL DEFAULT true,
    "onboardingCompletedAt" TIMESTAMP(3),
    "diagnosticCompletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Profile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CareerPath" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "level" "SkillLevel" NOT NULL DEFAULT 'ABSOLUTE_BEGINNER',
    "estimatedHours" INTEGER,
    "order" INTEGER NOT NULL DEFAULT 0,
    "published" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CareerPath_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "JobRole" (
    "id" TEXT NOT NULL,
    "careerPathId" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "JobRole_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "JobRoleSkill" (
    "id" TEXT NOT NULL,
    "jobRoleId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "detail" TEXT,
    "required" BOOLEAN NOT NULL DEFAULT true,
    "order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "JobRoleSkill_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Phase" (
    "id" TEXT NOT NULL,
    "careerPathId" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "estimatedHours" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Phase_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Module" (
    "id" TEXT NOT NULL,
    "phaseId" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "estimatedMinutes" INTEGER,
    "completionCriteria" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Module_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Prerequisite" (
    "id" TEXT NOT NULL,
    "moduleId" TEXT NOT NULL,
    "requiredModuleId" TEXT NOT NULL,
    "note" TEXT,

    CONSTRAINT "Prerequisite_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Chapter" (
    "id" TEXT NOT NULL,
    "moduleId" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "intro" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "estimatedMinutes" INTEGER,
    "kind" "ChapterKind" NOT NULL DEFAULT 'STANDARD',
    "isOptional" BOOLEAN NOT NULL DEFAULT false,
    "completionCriteria" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Chapter_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LearningObjective" (
    "id" TEXT NOT NULL,
    "moduleId" TEXT,
    "chapterId" TEXT,
    "code" TEXT,
    "text" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "LearningObjective_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Resource" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "canonicalUrl" TEXT,
    "publisher" TEXT NOT NULL,
    "author" TEXT,
    "type" "ResourceType" NOT NULL,
    "language" TEXT NOT NULL DEFAULT 'en',
    "concepts" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "difficulty" "SkillLevel" NOT NULL DEFAULT 'BEGINNER',
    "estimatedMinutes" INTEGER,
    "accessNotes" TEXT,
    "isFree" BOOLEAN NOT NULL DEFAULT true,
    "license" TEXT,
    "licenseUrl" TEXT,
    "isOpenLicense" BOOLEAN NOT NULL DEFAULT false,
    "status" "ResourceStatus" NOT NULL DEFAULT 'UNVERIFIED',
    "lastVerifiedAt" TIMESTAMP(3),
    "verificationNote" TEXT,
    "verifiedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Resource_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChapterResource" (
    "id" TEXT NOT NULL,
    "chapterId" TEXT NOT NULL,
    "resourceId" TEXT NOT NULL,
    "role" "ResourceRole" NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "note" TEXT,
    "isRequired" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ChapterResource_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Assessment" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "type" "AssessmentType" NOT NULL,
    "moduleId" TEXT,
    "chapterId" TEXT,
    "timeLimitMinutes" INTEGER,
    "passingScore" INTEGER NOT NULL DEFAULT 70,
    "skillTags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Assessment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Question" (
    "id" TEXT NOT NULL,
    "prompt" TEXT NOT NULL,
    "explanation" TEXT NOT NULL,
    "type" "QuestionType" NOT NULL,
    "difficulty" "SkillLevel" NOT NULL DEFAULT 'BEGINNER',
    "skillTags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "chapterId" TEXT,
    "learningObjectiveId" TEXT,
    "points" INTEGER NOT NULL DEFAULT 1,
    "codeSnippet" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Question_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "QuestionOption" (
    "id" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "isCorrect" BOOLEAN NOT NULL DEFAULT false,
    "rationale" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "QuestionOption_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CodingProblem" (
    "id" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,
    "language" TEXT NOT NULL DEFAULT 'python',
    "starterCode" TEXT NOT NULL,
    "functionName" TEXT,
    "testCases" JSONB NOT NULL DEFAULT '[]',
    "referenceSolution" TEXT,
    "timeLimitMs" INTEGER NOT NULL DEFAULT 4000,

    CONSTRAINT "CodingProblem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AssessmentQuestion" (
    "id" TEXT NOT NULL,
    "assessmentId" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "points" INTEGER,

    CONSTRAINT "AssessmentQuestion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Attempt" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "assessmentId" TEXT NOT NULL,
    "status" "AttemptStatus" NOT NULL DEFAULT 'IN_PROGRESS',
    "score" INTEGER,
    "maxScore" INTEGER,
    "percent" INTEGER,
    "passed" BOOLEAN,
    "timeSpentSeconds" INTEGER,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "submittedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Attempt_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Answer" (
    "id" TEXT NOT NULL,
    "attemptId" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,
    "response" JSONB NOT NULL,
    "isCorrect" BOOLEAN,
    "awardedPoints" INTEGER,
    "feedback" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Answer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChapterProgress" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "chapterId" TEXT NOT NULL,
    "status" "ProgressStatus" NOT NULL DEFAULT 'IN_PROGRESS',
    "source" TEXT NOT NULL DEFAULT 'study',
    "completedAt" TIMESTAMP(3),
    "lastViewedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ChapterProgress_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ResourceCompletion" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "chapterResourceId" TEXT NOT NULL,
    "completedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ResourceCompletion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Note" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "chapterId" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Note_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Bookmark" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "chapterId" TEXT,
    "resourceId" TEXT,
    "label" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Bookmark_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SkillScore" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "skill" TEXT NOT NULL,
    "score" INTEGER NOT NULL DEFAULT 0,
    "evidenceCount" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SkillScore_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Project" (
    "id" TEXT NOT NULL,
    "careerPathId" TEXT,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "level" "ProjectLevel" NOT NULL,
    "summary" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "prerequisitesText" TEXT,
    "objectives" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "requirements" TEXT NOT NULL,
    "milestones" JSONB NOT NULL DEFAULT '[]',
    "starterResources" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "acceptanceCriteria" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "hints" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "submissionInstructions" TEXT NOT NULL,
    "rubric" JSONB NOT NULL DEFAULT '[]',
    "extensions" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Project_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProjectSubmission" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "status" "SubmissionStatus" NOT NULL DEFAULT 'DRAFT',
    "repoUrl" TEXT,
    "liveUrl" TEXT,
    "notes" TEXT,
    "selfAssessment" JSONB NOT NULL DEFAULT '{}',
    "submittedAt" TIMESTAMP(3),
    "reviewedAt" TIMESTAMP(3),
    "reviewerId" TEXT,
    "feedback" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProjectSubmission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Recommendation" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "rationale" TEXT NOT NULL,
    "targetType" TEXT,
    "targetId" TEXT,
    "priority" INTEGER NOT NULL DEFAULT 0,
    "dismissedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Recommendation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ResourceReport" (
    "id" TEXT NOT NULL,
    "resourceId" TEXT,
    "chapterId" TEXT,
    "userId" TEXT,
    "kind" "ReportKind" NOT NULL,
    "message" TEXT NOT NULL,
    "status" "ReportStatus" NOT NULL DEFAULT 'OPEN',
    "resolvedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolvedAt" TIMESTAMP(3),

    CONSTRAINT "ResourceReport_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AdminAuditLog" (
    "id" TEXT NOT NULL,
    "actorId" TEXT,
    "action" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT,
    "summary" TEXT NOT NULL,
    "diff" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AdminAuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "Account_userId_idx" ON "Account"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Account_provider_providerAccountId_key" ON "Account"("provider", "providerAccountId");

-- CreateIndex
CREATE UNIQUE INDEX "Session_sessionToken_key" ON "Session"("sessionToken");

-- CreateIndex
CREATE INDEX "Session_userId_idx" ON "Session"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "VerificationToken_identifier_token_key" ON "VerificationToken"("identifier", "token");

-- CreateIndex
CREATE UNIQUE INDEX "Profile_userId_key" ON "Profile"("userId");

-- CreateIndex
CREATE INDEX "Profile_targetCareerPathId_idx" ON "Profile"("targetCareerPathId");

-- CreateIndex
CREATE UNIQUE INDEX "CareerPath_slug_key" ON "CareerPath"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "JobRole_slug_key" ON "JobRole"("slug");

-- CreateIndex
CREATE INDEX "JobRole_careerPathId_idx" ON "JobRole"("careerPathId");

-- CreateIndex
CREATE INDEX "JobRoleSkill_jobRoleId_idx" ON "JobRoleSkill"("jobRoleId");

-- CreateIndex
CREATE INDEX "Phase_careerPathId_idx" ON "Phase"("careerPathId");

-- CreateIndex
CREATE UNIQUE INDEX "Phase_careerPathId_slug_key" ON "Phase"("careerPathId", "slug");

-- CreateIndex
CREATE INDEX "Module_phaseId_idx" ON "Module"("phaseId");

-- CreateIndex
CREATE UNIQUE INDEX "Module_phaseId_slug_key" ON "Module"("phaseId", "slug");

-- CreateIndex
CREATE INDEX "Prerequisite_requiredModuleId_idx" ON "Prerequisite"("requiredModuleId");

-- CreateIndex
CREATE UNIQUE INDEX "Prerequisite_moduleId_requiredModuleId_key" ON "Prerequisite"("moduleId", "requiredModuleId");

-- CreateIndex
CREATE INDEX "Chapter_moduleId_idx" ON "Chapter"("moduleId");

-- CreateIndex
CREATE UNIQUE INDEX "Chapter_moduleId_slug_key" ON "Chapter"("moduleId", "slug");

-- CreateIndex
CREATE INDEX "LearningObjective_moduleId_idx" ON "LearningObjective"("moduleId");

-- CreateIndex
CREATE INDEX "LearningObjective_chapterId_idx" ON "LearningObjective"("chapterId");

-- CreateIndex
CREATE UNIQUE INDEX "Resource_url_key" ON "Resource"("url");

-- CreateIndex
CREATE INDEX "Resource_type_idx" ON "Resource"("type");

-- CreateIndex
CREATE INDEX "Resource_status_idx" ON "Resource"("status");

-- CreateIndex
CREATE INDEX "ChapterResource_chapterId_idx" ON "ChapterResource"("chapterId");

-- CreateIndex
CREATE INDEX "ChapterResource_resourceId_idx" ON "ChapterResource"("resourceId");

-- CreateIndex
CREATE UNIQUE INDEX "ChapterResource_chapterId_resourceId_role_key" ON "ChapterResource"("chapterId", "resourceId", "role");

-- CreateIndex
CREATE UNIQUE INDEX "Assessment_slug_key" ON "Assessment"("slug");

-- CreateIndex
CREATE INDEX "Assessment_moduleId_idx" ON "Assessment"("moduleId");

-- CreateIndex
CREATE INDEX "Assessment_chapterId_idx" ON "Assessment"("chapterId");

-- CreateIndex
CREATE INDEX "Question_chapterId_idx" ON "Question"("chapterId");

-- CreateIndex
CREATE INDEX "QuestionOption_questionId_idx" ON "QuestionOption"("questionId");

-- CreateIndex
CREATE UNIQUE INDEX "CodingProblem_questionId_key" ON "CodingProblem"("questionId");

-- CreateIndex
CREATE INDEX "AssessmentQuestion_assessmentId_idx" ON "AssessmentQuestion"("assessmentId");

-- CreateIndex
CREATE UNIQUE INDEX "AssessmentQuestion_assessmentId_questionId_key" ON "AssessmentQuestion"("assessmentId", "questionId");

-- CreateIndex
CREATE INDEX "Attempt_userId_assessmentId_idx" ON "Attempt"("userId", "assessmentId");

-- CreateIndex
CREATE INDEX "Answer_attemptId_idx" ON "Answer"("attemptId");

-- CreateIndex
CREATE UNIQUE INDEX "Answer_attemptId_questionId_key" ON "Answer"("attemptId", "questionId");

-- CreateIndex
CREATE INDEX "ChapterProgress_chapterId_idx" ON "ChapterProgress"("chapterId");

-- CreateIndex
CREATE UNIQUE INDEX "ChapterProgress_userId_chapterId_key" ON "ChapterProgress"("userId", "chapterId");

-- CreateIndex
CREATE INDEX "ResourceCompletion_chapterResourceId_idx" ON "ResourceCompletion"("chapterResourceId");

-- CreateIndex
CREATE UNIQUE INDEX "ResourceCompletion_userId_chapterResourceId_key" ON "ResourceCompletion"("userId", "chapterResourceId");

-- CreateIndex
CREATE INDEX "Note_userId_chapterId_idx" ON "Note"("userId", "chapterId");

-- CreateIndex
CREATE INDEX "Bookmark_userId_idx" ON "Bookmark"("userId");

-- CreateIndex
CREATE INDEX "SkillScore_userId_idx" ON "SkillScore"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "SkillScore_userId_skill_key" ON "SkillScore"("userId", "skill");

-- CreateIndex
CREATE UNIQUE INDEX "Project_slug_key" ON "Project"("slug");

-- CreateIndex
CREATE INDEX "Project_careerPathId_idx" ON "Project"("careerPathId");

-- CreateIndex
CREATE INDEX "ProjectSubmission_userId_idx" ON "ProjectSubmission"("userId");

-- CreateIndex
CREATE INDEX "ProjectSubmission_projectId_idx" ON "ProjectSubmission"("projectId");

-- CreateIndex
CREATE INDEX "Recommendation_userId_idx" ON "Recommendation"("userId");

-- CreateIndex
CREATE INDEX "ResourceReport_status_idx" ON "ResourceReport"("status");

-- CreateIndex
CREATE INDEX "AdminAuditLog_entityType_entityId_idx" ON "AdminAuditLog"("entityType", "entityId");

-- CreateIndex
CREATE INDEX "AdminAuditLog_createdAt_idx" ON "AdminAuditLog"("createdAt");

-- AddForeignKey
ALTER TABLE "Account" ADD CONSTRAINT "Account_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Profile" ADD CONSTRAINT "Profile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Profile" ADD CONSTRAINT "Profile_targetCareerPathId_fkey" FOREIGN KEY ("targetCareerPathId") REFERENCES "CareerPath"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JobRole" ADD CONSTRAINT "JobRole_careerPathId_fkey" FOREIGN KEY ("careerPathId") REFERENCES "CareerPath"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JobRoleSkill" ADD CONSTRAINT "JobRoleSkill_jobRoleId_fkey" FOREIGN KEY ("jobRoleId") REFERENCES "JobRole"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Phase" ADD CONSTRAINT "Phase_careerPathId_fkey" FOREIGN KEY ("careerPathId") REFERENCES "CareerPath"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Module" ADD CONSTRAINT "Module_phaseId_fkey" FOREIGN KEY ("phaseId") REFERENCES "Phase"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Prerequisite" ADD CONSTRAINT "Prerequisite_moduleId_fkey" FOREIGN KEY ("moduleId") REFERENCES "Module"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Prerequisite" ADD CONSTRAINT "Prerequisite_requiredModuleId_fkey" FOREIGN KEY ("requiredModuleId") REFERENCES "Module"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Chapter" ADD CONSTRAINT "Chapter_moduleId_fkey" FOREIGN KEY ("moduleId") REFERENCES "Module"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LearningObjective" ADD CONSTRAINT "LearningObjective_moduleId_fkey" FOREIGN KEY ("moduleId") REFERENCES "Module"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LearningObjective" ADD CONSTRAINT "LearningObjective_chapterId_fkey" FOREIGN KEY ("chapterId") REFERENCES "Chapter"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Resource" ADD CONSTRAINT "Resource_verifiedById_fkey" FOREIGN KEY ("verifiedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChapterResource" ADD CONSTRAINT "ChapterResource_chapterId_fkey" FOREIGN KEY ("chapterId") REFERENCES "Chapter"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChapterResource" ADD CONSTRAINT "ChapterResource_resourceId_fkey" FOREIGN KEY ("resourceId") REFERENCES "Resource"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Assessment" ADD CONSTRAINT "Assessment_moduleId_fkey" FOREIGN KEY ("moduleId") REFERENCES "Module"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Assessment" ADD CONSTRAINT "Assessment_chapterId_fkey" FOREIGN KEY ("chapterId") REFERENCES "Chapter"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Question" ADD CONSTRAINT "Question_chapterId_fkey" FOREIGN KEY ("chapterId") REFERENCES "Chapter"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Question" ADD CONSTRAINT "Question_learningObjectiveId_fkey" FOREIGN KEY ("learningObjectiveId") REFERENCES "LearningObjective"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuestionOption" ADD CONSTRAINT "QuestionOption_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "Question"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CodingProblem" ADD CONSTRAINT "CodingProblem_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "Question"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AssessmentQuestion" ADD CONSTRAINT "AssessmentQuestion_assessmentId_fkey" FOREIGN KEY ("assessmentId") REFERENCES "Assessment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AssessmentQuestion" ADD CONSTRAINT "AssessmentQuestion_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "Question"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Attempt" ADD CONSTRAINT "Attempt_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Attempt" ADD CONSTRAINT "Attempt_assessmentId_fkey" FOREIGN KEY ("assessmentId") REFERENCES "Assessment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Answer" ADD CONSTRAINT "Answer_attemptId_fkey" FOREIGN KEY ("attemptId") REFERENCES "Attempt"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Answer" ADD CONSTRAINT "Answer_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "Question"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChapterProgress" ADD CONSTRAINT "ChapterProgress_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChapterProgress" ADD CONSTRAINT "ChapterProgress_chapterId_fkey" FOREIGN KEY ("chapterId") REFERENCES "Chapter"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ResourceCompletion" ADD CONSTRAINT "ResourceCompletion_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ResourceCompletion" ADD CONSTRAINT "ResourceCompletion_chapterResourceId_fkey" FOREIGN KEY ("chapterResourceId") REFERENCES "ChapterResource"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Note" ADD CONSTRAINT "Note_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Note" ADD CONSTRAINT "Note_chapterId_fkey" FOREIGN KEY ("chapterId") REFERENCES "Chapter"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Bookmark" ADD CONSTRAINT "Bookmark_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Bookmark" ADD CONSTRAINT "Bookmark_chapterId_fkey" FOREIGN KEY ("chapterId") REFERENCES "Chapter"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Bookmark" ADD CONSTRAINT "Bookmark_resourceId_fkey" FOREIGN KEY ("resourceId") REFERENCES "Resource"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SkillScore" ADD CONSTRAINT "SkillScore_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Project" ADD CONSTRAINT "Project_careerPathId_fkey" FOREIGN KEY ("careerPathId") REFERENCES "CareerPath"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectSubmission" ADD CONSTRAINT "ProjectSubmission_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectSubmission" ADD CONSTRAINT "ProjectSubmission_reviewerId_fkey" FOREIGN KEY ("reviewerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectSubmission" ADD CONSTRAINT "ProjectSubmission_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Recommendation" ADD CONSTRAINT "Recommendation_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ResourceReport" ADD CONSTRAINT "ResourceReport_resourceId_fkey" FOREIGN KEY ("resourceId") REFERENCES "Resource"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ResourceReport" ADD CONSTRAINT "ResourceReport_chapterId_fkey" FOREIGN KEY ("chapterId") REFERENCES "Chapter"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ResourceReport" ADD CONSTRAINT "ResourceReport_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ResourceReport" ADD CONSTRAINT "ResourceReport_resolvedById_fkey" FOREIGN KEY ("resolvedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AdminAuditLog" ADD CONSTRAINT "AdminAuditLog_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
