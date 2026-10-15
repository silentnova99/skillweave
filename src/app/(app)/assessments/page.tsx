import type { Metadata } from "next";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";

export const metadata: Metadata = { title: "Assessments" };

const TYPE_LABEL: Record<string, string> = {
  DIAGNOSTIC: "Diagnostic",
  CHAPTER_QUIZ: "Chapter quiz",
  MODULE_ASSESSMENT: "Module assessment",
  REVISION: "Revision",
  MOCK_EXAM: "Mock exam",
  INTERVIEW_BANK: "Interview bank",
};

export default async function AssessmentsPage() {
  const user = await requireUser();
  const pathId = user.profile?.targetCareerPathId ?? null;

  const [pathAssessments, standalone, attempts] = await Promise.all([
    pathId
      ? prisma.assessment.findMany({
          where: {
            OR: [
              { chapter: { module: { phase: { careerPathId: pathId } } } },
              { module: { phase: { careerPathId: pathId } } },
            ],
          },
          include: {
            chapter: { select: { title: true, module: { select: { title: true } } } },
            module: { select: { title: true } },
          },
          orderBy: { createdAt: "asc" },
        })
      : Promise.resolve([]),
    prisma.assessment.findMany({
      where: { moduleId: null, chapterId: null, type: { in: ["DIAGNOSTIC", "INTERVIEW_BANK", "MOCK_EXAM", "REVISION"] } },
      orderBy: { createdAt: "asc" },
    }),
    prisma.attempt.findMany({
      where: { userId: user.id, status: "GRADED" },
      orderBy: { submittedAt: "desc" },
      select: {
        id: true,
        assessmentId: true,
        percent: true,
        passed: true,
        assessment: { select: { title: true } },
      },
    }),
  ]);

  const bestByAssessment = new Map<
    string,
    { percent: number; passed: boolean }
  >();
  for (const attempt of attempts) {
    const current = bestByAssessment.get(attempt.assessmentId);
    const percent = attempt.percent ?? 0;
    if (!current || percent > current.percent) {
      bestByAssessment.set(attempt.assessmentId, {
        percent,
        passed: current?.passed || Boolean(attempt.passed),
      });
    }
  }

  function statusBadge(assessmentId: string) {
    const best = bestByAssessment.get(assessmentId);
    if (!best) return <Badge tone="neutral">Not started</Badge>;
    if (best.passed) return <Badge tone="success">Passed · {best.percent}%</Badge>;
    return <Badge tone="warning">Best {best.percent}%</Badge>;
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="display-title text-2xl">Assessments</h1>
        <p className="mt-1 text-sm text-[var(--color-fg-muted)]">
          Chapter quizzes confirm understanding; module assessments unlock the next
          module. All grading is deterministic and instant.
        </p>
      </div>

      <section className="space-y-4">
        <h2 className="section-title text-lg">Path assessments</h2>
        {pathAssessments.length === 0 ? (
          <EmptyState
            title="No path assessments yet"
            description="Set a target career path to see its quizzes and module assessments."
            action={
              <Link href="/onboarding">
                <Button>Choose a path</Button>
              </Link>
            }
          />
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {pathAssessments.map((assessment) => (
              <Card key={assessment.id}>
                <CardHeader>
                  <div className="flex items-start justify-between gap-3">
                    <CardTitle>{assessment.title}</CardTitle>
                    {statusBadge(assessment.id)}
                  </div>
                  <CardDescription>
                    {TYPE_LABEL[assessment.type] ?? assessment.type}
                    {assessment.module ? ` · ${assessment.module.title}` : ""}
                    {assessment.chapter ? ` · ${assessment.chapter.module.title}` : ""}
                  </CardDescription>
                </CardHeader>
                <CardContent className="flex items-center justify-between">
                  <span className="text-sm text-[var(--color-fg-muted)]">
                    Pass mark {assessment.passingScore}%
                    {assessment.timeLimitMinutes
                      ? ` · ${assessment.timeLimitMinutes} min`
                      : ""}
                  </span>
                  <Link href={`/assessments/${assessment.id}`}>
                    <Button variant="outline" size="sm">
                      {bestByAssessment.has(assessment.id) ? "Retake" : "Start"}
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </section>

      {standalone.length > 0 ? (
        <section className="space-y-4">
          <h2 className="section-title text-lg">Standalone practice</h2>
          <div className="grid gap-4 md:grid-cols-2">
            {standalone.map((assessment) => (
              <Card key={assessment.id}>
                <CardHeader>
                  <div className="flex items-start justify-between gap-3">
                    <CardTitle>{assessment.title}</CardTitle>
                    {statusBadge(assessment.id)}
                  </div>
                  <CardDescription>
                    {TYPE_LABEL[assessment.type] ?? assessment.type} ·{" "}
                    {assessment.description}
                  </CardDescription>
                </CardHeader>
                <CardContent className="flex items-center justify-between">
                  <span className="text-sm text-[var(--color-fg-muted)]">
                    Pass mark {assessment.passingScore}%
                  </span>
                  <Link href={`/assessments/${assessment.id}`}>
                    <Button variant="outline" size="sm">
                      {bestByAssessment.has(assessment.id) ? "Retake" : "Start"}
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>
      ) : null}

      <section className="space-y-4">
        <h2 className="section-title text-lg">Recent attempts</h2>
        {attempts.length === 0 ? (
          <p className="text-sm text-[var(--color-fg-muted)]">No attempts recorded yet.</p>
        ) : (
          <ul className="divide-y divide-[var(--color-border)] rounded-none border border-[var(--color-border)] bg-white">
            {attempts.slice(0, 10).map((attempt) => (
              <li
                key={attempt.id}
                className="flex items-center justify-between px-4 py-3 text-sm"
              >
                <span className="text-[var(--color-fg)]">
                  {attempt.assessment.title} · {attempt.percent ?? 0}% ·{" "}
                  {attempt.passed ? "passed" : "not passed"}
                </span>
                <Link
                  href={`/assessments/${attempt.assessmentId}/result/${attempt.id}`}
                  className="text-[var(--color-brand)]"
                >
                  Review
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
