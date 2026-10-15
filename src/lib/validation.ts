import { z } from "zod";

export const emailSchema = z
  .string()
  .trim()
  .min(1, "Email is required")
  .email("Enter a valid email address")
  .max(200);

export const passwordSchema = z
  .string()
  .min(8, "Password must be at least 8 characters")
  .max(200, "Password is too long");

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, "Password is required"),
});

export const registerSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(120),
  email: emailSchema,
  password: passwordSchema,
});

export const skillLevelSchema = z.enum([
  "ABSOLUTE_BEGINNER",
  "BEGINNER",
  "INTERMEDIATE",
  "ADVANCED",
]);

export const onboardingSchema = z.object({
  targetCareerPathId: z.string().min(1, "Choose a career path"),
  targetRole: z.string().trim().max(160).optional().or(z.literal("")),
  skillLevel: skillLevelSchema,
  existingKnowledge: z.string().trim().max(4000).optional().or(z.literal("")),
  weeklyHours: z.coerce
    .number()
    .int("Enter whole hours")
    .min(1, "At least 1 hour per week")
    .max(80, "That seems too high"),
  targetWeeks: z.coerce
    .number()
    .int()
    .min(1)
    .max(260)
    .optional()
    .or(z.literal("")),
  preferReading: z.coerce.boolean().optional(),
  preferVideo: z.coerce.boolean().optional(),
  preferPractice: z.coerce.boolean().optional(),
});

export type OnboardingInput = z.infer<typeof onboardingSchema>;

export const reportSchema = z.object({
  resourceId: z.string().optional().or(z.literal("")),
  chapterId: z.string().optional().or(z.literal("")),
  kind: z.enum(["BROKEN_LINK", "INCORRECT_MAPPING", "ACCESS_CHANGED", "OTHER"]),
  message: z.string().trim().min(5, "Please describe the problem").max(2000),
});

export const noteSchema = z.object({
  chapterId: z.string().min(1),
  body: z.string().trim().min(1, "Note cannot be empty").max(10000),
});

export const codeRunSchema = z.object({
  questionId: z.string().min(1),
  code: z.string().min(1).max(20000),
});

export const idSchema = z.string().min(1).max(64);
