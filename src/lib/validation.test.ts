import { describe, expect, it } from "vitest";
import {
  onboardingSchema,
  reportSchema,
  noteSchema,
  codeRunSchema,
  registerSchema,
} from "@/lib/validation";

describe("onboardingSchema", () => {
  const base = {
    targetCareerPathId: "path_1",
    skillLevel: "BEGINNER",
    weeklyHours: "8",
  };

  it("coerces weekly hours from a form string", () => {
    const parsed = onboardingSchema.safeParse(base);
    expect(parsed.success).toBe(true);
    if (parsed.success) expect(parsed.data.weeklyHours).toBe(8);
  });

  it("rejects an empty career path", () => {
    const parsed = onboardingSchema.safeParse({ ...base, targetCareerPathId: "" });
    expect(parsed.success).toBe(false);
  });

  it("rejects impossible weekly hours", () => {
    expect(onboardingSchema.safeParse({ ...base, weeklyHours: "0" }).success).toBe(false);
    expect(onboardingSchema.safeParse({ ...base, weeklyHours: "200" }).success).toBe(false);
  });

  it("treats blank optional fields as empty", () => {
    const parsed = onboardingSchema.safeParse({ ...base, targetWeeks: "", targetRole: "" });
    expect(parsed.success).toBe(true);
  });
});

describe("registerSchema", () => {
  it("requires a strong enough password", () => {
    expect(
      registerSchema.safeParse({ name: "Ada", email: "a@b.com", password: "short" }).success,
    ).toBe(false);
    expect(
      registerSchema.safeParse({ name: "Ada", email: "a@b.com", password: "longenough" }).success,
    ).toBe(true);
  });
});

describe("reportSchema", () => {
  it("accepts a report with only kind and message", () => {
    const parsed = reportSchema.safeParse({ kind: "BROKEN_LINK", message: "Link 404s now" });
    expect(parsed.success).toBe(true);
  });

  it("rejects unknown kinds and too-short messages", () => {
    expect(reportSchema.safeParse({ kind: "NOPE", message: "valid message" }).success).toBe(false);
    expect(reportSchema.safeParse({ kind: "OTHER", message: "hi" }).success).toBe(false);
  });
});

describe("noteSchema", () => {
  it("requires a chapter and non-empty body", () => {
    expect(noteSchema.safeParse({ chapterId: "c1", body: "" }).success).toBe(false);
    expect(noteSchema.safeParse({ chapterId: "c1", body: "Remember this" }).success).toBe(true);
  });
});

describe("codeRunSchema", () => {
  it("requires a question and non-empty code", () => {
    expect(codeRunSchema.safeParse({ questionId: "q1", code: "" }).success).toBe(false);
    expect(codeRunSchema.safeParse({ questionId: "q1", code: "print(1)" }).success).toBe(true);
  });
});
