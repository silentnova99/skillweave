import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { loadPathProgress } from "@/lib/progress";
import { chapterTestGate, moduleMockGate } from "@/lib/gating";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Alert } from "@/components/ui/alert";
import { AssessmentRunner, type RunnerAssessment } from "@/components/assessment-runner";
import { submitAssessmentAction } from "../actions";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const assessment = await prisma.assessment.findUnique({
    where: { id },
    select: { title: true },
  });
  return { title: assessment?.title ?? "Assessment" };
}

export default async function TakeAssessmentPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await requireUser();

  const assessment = await prisma.assessment.findUnique({
    where: { id },
    include: {
      module: {
        select: {
          id: true,
          title: true,
          phase: { select: { careerPath: { select: { slug: true } } } },
        },
      },
      chapter: {
        select: {
          id: true,
          title: true,
          module: {
            select: { id: true, phase: { select: { careerPath: { select: { slug: true } } } } },
          },
        },
      },
      questions: {
        orderBy: { order: "asc" },
        include: {
          question: { include: { options: { orderBy: { order: "asc" } } } },
        },
      },
    },
  });
  if (!assessment) notFound();

  const pathSlug =
    assessment.chapter?.module.phase.careerPath.slug ??
    assessment.module?.phase.careerPath.slug ??
    null;

  if (pathSlug) {
    const progress = await loadPathProgress(user.id, pathSlug);
    if (progress) {
      const gate = assessment.chapter
        ? chapterTestGate(progress, assessment.chapter.id)
        : assessment.module
          ? moduleMockGate(progress, assessment.module.id)
          : { unlocked: true, reason: null };
      if (!gate.unlocked) {
        return (
          <EmptyState
            title="This assessment is locked"
            description={gate.reason ?? "Complete the required content to unlock it."}
            action={
              <Link href={`/paths/${pathSlug}`}>
                <Button>Back to the path</Button>
              </Link>
            }
          />
        );
      }
    }
  }

  const attempts = await prisma.attempt.findMany({
    where: { userId: user.id, assessmentId: assessment.id, status: "GRADED" },
    orderBy: { submittedAt: "desc" },
    select: { id: true, percent: true, passed: true },
  });
  const bestPercent = attempts.reduce((max, a) => Math.max(max, a.percent ?? 0), 0);
  const passed = attempts.some((a) => a.passed);

  if (assessment.questions.length === 0) {
    return (
      <EmptyState
        title="This assessment has no questions yet"
        description="It has not been published with content. Please check back later."
        action={
          <Link href="/assessments">
            <Button>Back to assessments</Button>
          </Link>
        }
      />
    );
  }

  const runnerAssessment: RunnerAssessment = {
    id: assessment.id,
    title: assessment.title,
    description: assessment.description,
    timeLimitMinutes: assessment.timeLimitMinutes,
    questions: assessment.questions.map((aq) => ({
      id: aq.questionId,
      prompt: aq.question.prompt,
      type: aq.question.type,
      points: aq.points ?? aq.question.points,
      codeSnippet: aq.question.codeSnippet,
      options: aq.question.options.map((o) => ({ id: o.id, text: o.text })),
    })),
  };

  const context = assessment.module?.title ?? assessment.chapter?.title ?? "Standalone practice";

  return (
    <div className="space-y-4">
      <Link href="/assessments" className="text-sm text-[var(--color-fg-muted)] hover:text-[var(--color-brand)]">
        ← All assessments
      </Link>

      <div className="flex flex-wrap items-center gap-2 text-sm">
        <Badge tone="outline">{context}</Badge>
        {attempts.length > 0 ? (
          <Badge tone={passed ? "success" : "warning"}>
            {attempts.length} previous attempt{attempts.length > 1 ? "s" : ""} · best {bestPercent}%
          </Badge>
        ) : null}
      </div>

      {passed ? (
        <Alert tone="success" title="Already passed">
          You have passed this assessment. You can retake it any time to improve your score.
        </Alert>
      ) : null}

      <AssessmentRunner assessment={runnerAssessment} action={submitAssessmentAction} />
    </div>
  );
}
