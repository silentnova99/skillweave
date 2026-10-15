import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Alert } from "@/components/ui/alert";

export const metadata: Metadata = { title: "Assessment result" };

type StoredResponse = {
  selectedOptionIds?: string[];
  text?: string;
  code?: string;
};

export default async function ResultPage({
  params,
}: {
  params: Promise<{ id: string; attemptId: string }>;
}) {
  const { id, attemptId } = await params;
  const user = await requireUser();

  const attempt = await prisma.attempt.findFirst({
    where: { id: attemptId, userId: user.id, assessmentId: id },
    include: {
      answers: true,
      assessment: {
        include: {
          questions: {
            orderBy: { order: "asc" },
            include: {
              question: { include: { options: { orderBy: { order: "asc" } } } },
            },
          },
        },
      },
    },
  });
  if (!attempt) notFound();

  const answerByQuestion = new Map(attempt.answers.map((a) => [a.questionId, a]));
  const percent = attempt.percent ?? 0;
  const passed = Boolean(attempt.passed);

  return (
    <div className="space-y-6">
      <Link
        href={`/assessments/${id}`}
        className="text-sm text-[var(--color-fg-muted)] hover:text-[var(--color-brand)]"
      >
        ← Back to assessment
      </Link>

      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <CardTitle>{attempt.assessment.title}</CardTitle>
            <Badge tone={passed ? "success" : "warning"}>
              {passed ? "Passed" : "Not passed"}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-end justify-between">
            <span className="text-3xl font-semibold text-[var(--color-fg)]">{percent}%</span>
            <span className="text-sm text-[var(--color-fg-muted)]">
              {attempt.score ?? 0} / {attempt.maxScore ?? 0} points · pass mark{" "}
              {attempt.assessment.passingScore}%
            </span>
          </div>
          <Progress value={percent} label="Score" />
          {attempt.timeSpentSeconds ? (
            <p className="text-xs text-[var(--color-fg-subtle)]">
              Time spent: {Math.floor(attempt.timeSpentSeconds / 60)}m{" "}
              {attempt.timeSpentSeconds % 60}s
            </p>
          ) : null}
        </CardContent>
      </Card>

      {!passed ? (
        <Alert tone="warning" title="Keep going">
          Review the explanations below, revisit the chapter resources, then retake
          this assessment. Your best score is what counts.
        </Alert>
      ) : null}

      <section className="space-y-4">
        <h2 className="section-title text-lg">Review</h2>
        {attempt.assessment.questions.map((aq, index) => {
          const answer = answerByQuestion.get(aq.questionId);
          const response = (answer?.response ?? {}) as StoredResponse;
          const selected = new Set(response.selectedOptionIds ?? []);
          const correctOptions = aq.question.options.filter((o) => o.isCorrect);

          return (
            <Card key={aq.questionId}>
              <CardHeader>
                <div className="flex items-start justify-between gap-3">
                  <CardTitle className="text-sm font-medium">
                    {index + 1}. {aq.question.prompt}
                  </CardTitle>
                  <Badge
                    tone={
                      answer?.isCorrect === true
                        ? "success"
                        : answer?.isCorrect === false
                          ? "danger"
                          : "neutral"
                    }
                  >
                    {answer?.isCorrect === true
                      ? "Correct"
                      : answer?.isCorrect === false
                        ? "Incorrect"
                        : "Not graded"}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                {aq.question.type === "SHORT_ANSWER" ? (
                  <p className="text-[var(--color-fg)]">
                    Your answer:{" "}
                    <span className="font-mono">{response.text?.trim() || "—"}</span>
                  </p>
                ) : null}

                {aq.question.type === "CODING" ? (
                  <p className="text-[var(--color-fg-muted)]">
                    Coding responses are graded only by an isolated judge, which is
                    not configured here, so this answer was left ungraded.
                  </p>
                ) : null}

                {aq.question.options.length > 0 ? (
                  <ul className="space-y-2">
                    {aq.question.options.map((option) => {
                      const isSelected = selected.has(option.id);
                      const isCorrect = option.isCorrect;
                      return (
                        <li
                          key={option.id}
                          className={`rounded-none border p-3 ${
                            isCorrect
                              ? "border-[var(--color-success)] bg-[var(--color-success-soft)]"
                              : isSelected
                                ? "border-[var(--color-danger)] bg-[var(--color-danger-soft)]"
                                : "border-[var(--color-border)]"
                          }`}
                        >
                          <span className="flex items-center gap-2">
                            {isCorrect ? <Badge tone="success">Correct</Badge> : null}
                            {isSelected && !isCorrect ? (
                              <Badge tone="danger">Your choice</Badge>
                            ) : null}
                            {isSelected && isCorrect ? (
                              <Badge tone="success">Your choice</Badge>
                            ) : null}
                            <span>{option.text}</span>
                          </span>
                          {option.rationale ? (
                            <p className="mt-1 text-xs text-[var(--color-fg-muted)]">
                              {option.rationale}
                            </p>
                          ) : null}
                        </li>
                      );
                    })}
                  </ul>
                ) : null}

                <div className="rounded-none bg-[var(--color-surface)] p-3">
                  <p className="font-medium text-[var(--color-fg)]">Explanation</p>
                  <p className="mt-1 text-[var(--color-fg-muted)]">
                    {aq.question.explanation}
                  </p>
                  {answer?.feedback ? (
                    <p className="mt-2 text-xs text-[var(--color-fg-subtle)]">
                      {answer.feedback}
                    </p>
                  ) : null}
                  {correctOptions.length === 0 ? null : (
                    <p className="mt-2 text-xs text-[var(--color-fg-subtle)]">
                      Correct answer: {correctOptions.map((o) => o.text).join("; ")}
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </section>

      <div className="flex flex-wrap gap-3">
        <Link href={`/assessments/${id}`}>
          <Button variant="outline">Retake</Button>
        </Link>
        <Link href="/dashboard">
          <Button>Back to dashboard</Button>
        </Link>
      </div>
    </div>
  );
}
