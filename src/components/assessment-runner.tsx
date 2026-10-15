"use client";

import { useActionState, useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export interface RunnerOption {
  id: string;
  text: string;
}

export interface RunnerQuestion {
  id: string;
  prompt: string;
  type: "SINGLE_CHOICE" | "MULTIPLE_ANSWER" | "SHORT_ANSWER" | "CODING";
  points: number;
  codeSnippet?: string | null;
  options: RunnerOption[];
}

export interface RunnerAssessment {
  id: string;
  title: string;
  description: string;
  timeLimitMinutes: number | null;
  questions: RunnerQuestion[];
}

type FormState = { error?: string } | null;

type Response = { selectedOptionIds?: string[]; text?: string; code?: string };

export function AssessmentRunner({
  assessment,
  action,
}: {
  assessment: RunnerAssessment;
  action: (state: FormState, formData: FormData) => Promise<FormState>;
}) {
  const [state, formAction, pending] = useActionState(action, null);
  const [responses, setResponses] = useState<Record<string, Response>>({});
  const [remaining, setRemaining] = useState<number | null>(
    assessment.timeLimitMinutes ? assessment.timeLimitMinutes * 60 : null,
  );

  useEffect(() => {
    if (remaining === null) return;
    if (remaining <= 0) return;
    const id = setTimeout(() => setRemaining((r) => (r === null ? null : r - 1)), 1000);
    return () => clearTimeout(id);
  }, [remaining]);

  const answeredCount = useMemo(
    () => assessment.questions.filter((q) => hasAnswer(responses[q.id])).length,
    [assessment.questions, responses],
  );

  function setResponse(questionId: string, update: Partial<Response>) {
    setResponses((prev) => ({
      ...prev,
      [questionId]: { ...prev[questionId], ...update },
    }));
  }

  function toggleOption(questionId: string, optionId: string, multi: boolean) {
    setResponses((prev) => {
      const current = prev[questionId]?.selectedOptionIds ?? [];
      if (multi) {
        const next = current.includes(optionId)
          ? current.filter((id) => id !== optionId)
          : [...current, optionId];
        return { ...prev, [questionId]: { ...prev[questionId], selectedOptionIds: next } };
      }
      return { ...prev, [questionId]: { ...prev[questionId], selectedOptionIds: [optionId] } };
    });
  }

  const serialized = JSON.stringify(responses);

  return (
    <form action={formAction} className="space-y-6">
      <input type="hidden" name="assessmentId" value={assessment.id} />
      <input type="hidden" name="responses" value={serialized} />
      <input
        type="hidden"
        name="timeSpentSeconds"
        value={
          assessment.timeLimitMinutes
            ? String(assessment.timeLimitMinutes * 60 - (remaining ?? 0))
            : ""
        }
      />

      {state?.error ? <Alert tone="danger">{state.error}</Alert> : null}

      <div className="flex flex-wrap items-center justify-between gap-3 rounded-none border border-[var(--color-border)] bg-white p-4">
        <div>
          <h1 className="text-lg font-semibold text-[var(--color-fg)]">
            {assessment.title}
          </h1>
          <p className="mt-1 text-sm text-[var(--color-fg-muted)]">
            {assessment.description}
          </p>
        </div>
        <div className="flex items-center gap-3 text-sm">
          <Badge tone="neutral">
            {answeredCount}/{assessment.questions.length} answered
          </Badge>
          {remaining !== null ? (
            <Badge tone={remaining <= 60 ? "danger" : "brand"}>
              {formatTime(remaining)}
            </Badge>
          ) : null}
        </div>
      </div>

      <ol className="space-y-5">
        {assessment.questions.map((question, index) => (
          <li
            key={question.id}
            className="rounded-none border border-[var(--color-border)] bg-white p-5"
          >
            <div className="flex items-start justify-between gap-3">
              <p className="font-medium text-[var(--color-fg)]">
                <span className="mr-2 text-[var(--color-fg-subtle)]">
                  {index + 1}.
                </span>
                {question.prompt}
              </p>
              <Badge tone="outline">{question.points} pt</Badge>
            </div>

            {question.codeSnippet ? (
              <pre className="mt-3 overflow-x-auto rounded-none bg-[var(--color-surface-2)] p-3 text-xs">
                <code>{question.codeSnippet}</code>
              </pre>
            ) : null}

            {question.type === "SINGLE_CHOICE" || question.type === "MULTIPLE_ANSWER" ? (
              <fieldset className="mt-3 space-y-2">
                <legend className="sr-only">{question.prompt}</legend>
                {question.options.map((option) => {
                  const selected =
                    responses[question.id]?.selectedOptionIds?.includes(option.id) ?? false;
                  const multi = question.type === "MULTIPLE_ANSWER";
                  return (
                    <label
                      key={option.id}
                      className={cn(
                        "flex cursor-pointer items-start gap-3 rounded-none border p-3 text-sm",
                        selected
                          ? "border-[var(--color-brand)] bg-[var(--color-brand-soft)]"
                          : "border-[var(--color-border)] hover:bg-[var(--color-surface)]",
                      )}
                    >
                      <input
                        type={multi ? "checkbox" : "radio"}
                        name={`q-${question.id}`}
                        value={option.id}
                        checked={selected}
                        onChange={() => toggleOption(question.id, option.id, multi)}
                        className="mt-0.5"
                      />
                      <span>{option.text}</span>
                    </label>
                  );
                })}
              </fieldset>
            ) : null}

            {question.type === "SHORT_ANSWER" ? (
              <div className="mt-3">
                <label className="sr-only" htmlFor={`q-${question.id}`}>
                  {question.prompt}
                </label>
                <textarea
                  id={`q-${question.id}`}
                  value={responses[question.id]?.text ?? ""}
                  onChange={(e) => setResponse(question.id, { text: e.target.value })}
                  rows={2}
                  className="w-full rounded-none border border-[var(--color-border-strong)] bg-white px-3 py-2 text-sm focus:border-[var(--color-brand)] focus:ring-2 focus:ring-[var(--color-brand-soft)] focus:outline-none"
                  placeholder="Type your answer"
                />
              </div>
            ) : null}

            {question.type === "CODING" ? (
              <div className="mt-3 space-y-2">
                <textarea
                  value={responses[question.id]?.code ?? ""}
                  onChange={(e) => setResponse(question.id, { code: e.target.value })}
                  rows={6}
                  spellCheck={false}
                  className="w-full rounded-none border border-[var(--color-border-strong)] bg-[var(--color-surface-2)] px-3 py-2 font-mono text-xs focus:border-[var(--color-brand)] focus:outline-none"
                  placeholder="// write your solution"
                />
                <p className="text-xs text-[var(--color-fg-subtle)]">
                  Coding answers are graded only when an isolated code judge is configured.
                </p>
              </div>
            ) : null}
          </li>
        ))}
      </ol>

      <div className="flex items-center justify-end gap-3">
        <Button type="submit" size="lg" disabled={pending}>
          {pending ? "Submitting…" : "Submit answers"}
        </Button>
      </div>
    </form>
  );
}

function hasAnswer(response: Response | undefined): boolean {
  if (!response) return false;
  if (response.selectedOptionIds?.length) return true;
  if (response.text && response.text.trim()) return true;
  if (response.code && response.code.trim()) return true;
  return false;
}

function formatTime(totalSeconds: number): string {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}
