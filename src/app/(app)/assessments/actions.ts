"use server";

import { redirect } from "next/navigation";
import { requireUser } from "@/lib/session";
import { submitAttempt } from "@/lib/attempts";
import { idSchema } from "@/lib/validation";
import type { QuestionResponse } from "@/lib/scoring";

export type AssessmentState = { error?: string } | null;

function parseResponses(raw: FormDataEntryValue | null): Record<string, QuestionResponse> | null {
  if (typeof raw !== "string" || !raw.trim()) return {};
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return null;
    return parsed as Record<string, QuestionResponse>;
  } catch {
    return null;
  }
}

export async function submitAssessmentAction(
  _prev: AssessmentState,
  formData: FormData,
): Promise<AssessmentState> {
  const user = await requireUser();

  const assessmentId = idSchema.safeParse(formData.get("assessmentId"));
  if (!assessmentId.success) return { error: "Invalid assessment." };

  const responses = parseResponses(formData.get("responses"));
  if (responses === null) {
    return { error: "We could not read your answers. Please try again." };
  }

  const timeRaw = formData.get("timeSpentSeconds");
  const timeSpentSeconds =
    typeof timeRaw === "string" && timeRaw.trim() ? Number(timeRaw) : undefined;

  const { attemptId } = await submitAttempt({
    userId: user.id,
    assessmentId: assessmentId.data,
    responses,
    timeSpentSeconds: Number.isFinite(timeSpentSeconds) ? timeSpentSeconds : undefined,
  });

  redirect(`/assessments/${assessmentId.data}/result/${attemptId}`);
}
