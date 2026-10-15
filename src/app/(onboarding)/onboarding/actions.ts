"use server";

import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { onboardingSchema, idSchema } from "@/lib/validation";
import { submitAttempt } from "@/lib/attempts";
import type { QuestionResponse } from "@/lib/scoring";

export type OnboardingState = { error?: string } | null;

export async function saveOnboardingAction(
  _prev: OnboardingState,
  formData: FormData,
): Promise<OnboardingState> {
  const parsed = onboardingSchema.safeParse({
    targetCareerPathId: formData.get("targetCareerPathId"),
    targetRole: formData.get("targetRole") ?? "",
    skillLevel: formData.get("skillLevel"),
    existingKnowledge: formData.get("existingKnowledge") ?? "",
    weeklyHours: formData.get("weeklyHours"),
    targetWeeks: formData.get("targetWeeks") ?? "",
    preferReading: formData.get("preferReading"),
    preferVideo: formData.get("preferVideo"),
    preferPractice: formData.get("preferPractice"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const user = await requireUser();
  const path = await prisma.careerPath.findFirst({
    where: { id: parsed.data.targetCareerPathId, published: true },
    select: { id: true },
  });
  if (!path) {
    return { error: "Please choose one of the listed career paths." };
  }

  const data = {
    targetCareerPathId: path.id,
    targetRole: parsed.data.targetRole || null,
    skillLevel: parsed.data.skillLevel,
    existingKnowledge: parsed.data.existingKnowledge || null,
    weeklyHours: parsed.data.weeklyHours,
    targetWeeks:
      typeof parsed.data.targetWeeks === "number" ? parsed.data.targetWeeks : null,
    preferReading: parsed.data.preferReading ?? false,
    preferVideo: parsed.data.preferVideo ?? false,
    preferPractice: parsed.data.preferPractice ?? false,
    onboardingCompletedAt: new Date(),
  };

  await prisma.profile.upsert({
    where: { userId: user.id },
    update: data,
    create: { userId: user.id, ...data },
  });

  redirect("/onboarding/diagnostic");
}

export async function skipOnboardingAction() {
  const user = await requireUser();
  await prisma.profile.upsert({
    where: { userId: user.id },
    update: { onboardingCompletedAt: new Date() },
    create: { userId: user.id, onboardingCompletedAt: new Date() },
  });
  redirect("/dashboard");
}

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

export async function submitDiagnosticAction(
  _prev: OnboardingState,
  formData: FormData,
): Promise<OnboardingState> {
  const user = await requireUser();
  if (!user.profile?.onboardingCompletedAt) redirect("/onboarding");

  const assessmentId = idSchema.safeParse(formData.get("assessmentId"));
  if (!assessmentId.success) return { error: "Invalid diagnostic assessment." };

  const responses = parseResponses(formData.get("responses"));
  if (responses === null) {
    return { error: "We could not read your answers. Please try again." };
  }

  await submitAttempt({
    userId: user.id,
    assessmentId: assessmentId.data,
    responses,
  });

  await prisma.profile.update({
    where: { userId: user.id },
    data: { diagnosticCompletedAt: new Date() },
  });

  redirect("/dashboard?diagnostic=done");
}
