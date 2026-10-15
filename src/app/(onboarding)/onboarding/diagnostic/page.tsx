import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { AssessmentRunner, type RunnerAssessment } from "@/components/assessment-runner";
import { EmptyState } from "@/components/ui/empty-state";
import { Button } from "@/components/ui/button";
import { submitDiagnosticAction } from "../actions";

export const metadata: Metadata = { title: "Diagnostic" };

export default async function DiagnosticPage() {
  const user = await requireUser();
  if (!user.profile?.onboardingCompletedAt) redirect("/onboarding");

  const assessment = await prisma.assessment.findFirst({
    where: { type: "DIAGNOSTIC", moduleId: null, chapterId: null },
    orderBy: { createdAt: "asc" },
    include: {
      questions: {
        orderBy: { order: "asc" },
        include: {
          question: {
            include: { options: { orderBy: { order: "asc" } } },
          },
        },
      },
    },
  });

  if (!assessment || assessment.questions.length === 0) {
    return (
      <EmptyState
        title="No diagnostic available yet"
        description="The diagnostic assessment has not been published. You can continue straight to your dashboard."
        action={
          <Link href="/dashboard">
            <Button>Go to dashboard</Button>
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

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm font-medium text-[var(--color-brand)]">Step 2 of 2</p>
        <h1 className="display-title mt-1 text-2xl">
          Baseline diagnostic
        </h1>
        <p className="mt-1 text-sm text-[var(--color-fg-muted)]">
          Optional but recommended. It measures your current level across core
          topics and seeds your skill profile — it is not a grade.
        </p>
      </div>

      <AssessmentRunner assessment={runnerAssessment} action={submitDiagnosticAction} />

      <p className="text-center text-sm text-[var(--color-fg-muted)]">
        <Link href="/dashboard" className="font-medium text-[var(--color-brand)]">
          Skip the diagnostic and go to my dashboard
        </Link>
      </p>
    </div>
  );
}
