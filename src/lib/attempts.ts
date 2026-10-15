import { prisma } from "@/lib/prisma";
import {
  gradeAttempt,
  updateMastery,
  type AttemptGrade,
  type GradableQuestion,
  type QuestionResponse,
} from "@/lib/scoring";
import type { QuestionType } from "@/generated/prisma/enums";

export interface SubmitAttemptResult {
  attemptId: string;
  grade: AttemptGrade;
}

/**
 * Grades and records an assessment attempt, then folds per-question skill
 * evidence into the learner's skill profile. All grading is deterministic.
 */
export async function submitAttempt(input: {
  userId: string;
  assessmentId: string;
  responses: Record<string, QuestionResponse>;
  timeSpentSeconds?: number;
}): Promise<SubmitAttemptResult> {
  const assessment = await prisma.assessment.findUnique({
    where: { id: input.assessmentId },
    include: {
      questions: {
        orderBy: { order: "asc" },
        include: { question: { include: { options: true } } },
      },
    },
  });
  if (!assessment) throw new Error("Assessment not found");

  const gradable: GradableQuestion[] = assessment.questions.map((aq) => ({
    id: aq.questionId,
    type: aq.question.type as QuestionType,
    points: aq.points ?? aq.question.points,
    options: aq.question.options.map((o) => ({
      id: o.id,
      text: o.text,
      isCorrect: o.isCorrect,
    })),
  }));

  const grade = gradeAttempt(gradable, input.responses, assessment.passingScore);

  const attempt = await prisma.attempt.create({
    data: {
      userId: input.userId,
      assessmentId: assessment.id,
      status: "GRADED",
      score: grade.score,
      maxScore: grade.maxScore,
      percent: grade.percent,
      passed: grade.passed,
      timeSpentSeconds: input.timeSpentSeconds ?? null,
      submittedAt: new Date(),
      answers: {
        create: grade.results.map((result) => ({
          questionId: result.questionId,
          response: (input.responses[result.questionId] ?? {}) as object,
          isCorrect: result.correct,
          awardedPoints: result.awardedPoints,
          feedback: result.feedback,
        })),
      },
    },
    select: { id: true },
  });

  await updateSkillScores(
    input.userId,
    evidenceFromResults(
      assessment.questions.map((aq) => ({
        id: aq.questionId,
        skillTags: aq.question.skillTags,
      })),
      grade,
    ),
  );

  return { attemptId: attempt.id, grade };
}

function evidenceFromResults(
  questions: Array<{ id: string; skillTags: string[] }>,
  grade: AttemptGrade,
): Array<{ skill: string; correct: boolean }> {
  const tagsById = new Map(questions.map((q) => [q.id, q.skillTags]));
  const evidence: Array<{ skill: string; correct: boolean }> = [];
  for (const result of grade.results) {
    if (result.correct === null) continue;
    for (const skill of tagsById.get(result.questionId) ?? []) {
      evidence.push({ skill, correct: result.correct });
    }
  }
  return evidence;
}

/** Applies skill evidence with an exponentially weighted moving average. */
export async function updateSkillScores(
  userId: string,
  evidence: Array<{ skill: string; correct: boolean }>,
): Promise<void> {
  if (evidence.length === 0) return;

  const bySkill = new Map<string, { correct: number; total: number }>();
  for (const item of evidence) {
    const entry = bySkill.get(item.skill) ?? { correct: 0, total: 0 };
    entry.total += 1;
    if (item.correct) entry.correct += 1;
    bySkill.set(item.skill, entry);
  }

  for (const [skill, tally] of bySkill) {
    const existing = await prisma.skillScore.findUnique({
      where: { userId_skill: { userId, skill } },
    });
    let score = existing?.score ?? 0;
    let count = existing?.evidenceCount ?? 0;
    for (let i = 0; i < tally.total; i += 1) {
      const correct = i < tally.correct;
      score = updateMastery(score, count, correct);
      count += 1;
    }
    await prisma.skillScore.upsert({
      where: { userId_skill: { userId, skill } },
      update: { score, evidenceCount: count },
      create: { userId, skill, score, evidenceCount: count },
    });
  }
}
