import type { QuestionType } from "@/generated/prisma/enums";

export interface GradableOption {
  id: string;
  text: string;
  isCorrect: boolean;
}

export interface GradableQuestion {
  id: string;
  type: QuestionType;
  points: number;
  options: GradableOption[];
}

export type QuestionResponse = {
  selectedOptionIds?: string[];
  text?: string;
  code?: string;
};

export interface QuestionResult {
  questionId: string;
  correct: boolean | null; // null = not auto-gradable (e.g. code not executed)
  awardedPoints: number;
  feedback: string;
}

function normalizeText(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

function setsEqual(a: string[], b: string[]): boolean {
  if (a.length !== b.length) return false;
  const setB = new Set(b);
  return a.every((item) => setB.has(item));
}

export function gradeQuestion(
  question: GradableQuestion,
  response: QuestionResponse,
): QuestionResult {
  const correctOptionIds = question.options
    .filter((o) => o.isCorrect)
    .map((o) => o.id);

  switch (question.type) {
    case "SINGLE_CHOICE": {
      const selected = response.selectedOptionIds ?? [];
      const correct =
        selected.length === 1 && correctOptionIds.includes(selected[0]);
      return {
        questionId: question.id,
        correct,
        awardedPoints: correct ? question.points : 0,
        feedback: correct
          ? "Correct."
          : "That is not the best answer. Review the explanation below.",
      };
    }
    case "MULTIPLE_ANSWER": {
      const selected = response.selectedOptionIds ?? [];
      const correct = setsEqual(selected, correctOptionIds);
      return {
        questionId: question.id,
        correct,
        awardedPoints: correct ? question.points : 0,
        feedback: correct
          ? "All correct options selected."
          : "One or more expected options were missing or incorrect.",
      };
    }
    case "SHORT_ANSWER": {
      const provided = normalizeText(response.text ?? "");
      const accepted = question.options
        .filter((o) => o.isCorrect)
        .map((o) => normalizeText(o.text));
      const correct = provided.length > 0 && accepted.includes(provided);
      return {
        questionId: question.id,
        correct,
        awardedPoints: correct ? question.points : 0,
        feedback: correct
          ? "Correct."
          : "This does not match the expected answer. Compare with the explanation.",
      };
    }
    case "CODING": {
      // Coding answers are graded only by an isolated judge. Without a judge
      // configuration we never award points or claim success.
      return {
        questionId: question.id,
        correct: null,
        awardedPoints: 0,
        feedback:
          "This coding task requires the isolated code judge. No execution result is available, so it is left ungraded.",
      };
    }
    default: {
      return {
        questionId: question.id,
        correct: null,
        awardedPoints: 0,
        feedback: "Unsupported question type.",
      };
    }
  }
}

export interface AttemptGrade {
  results: QuestionResult[];
  score: number;
  maxScore: number;
  percent: number;
  passed: boolean;
  ungradedQuestionIds: string[];
}

export function gradeAttempt(
  questions: GradableQuestion[],
  responses: Record<string, QuestionResponse>,
  passingScore = 70,
): AttemptGrade {
  const results: QuestionResult[] = [];
  let score = 0;
  let maxScore = 0;
  const ungradedQuestionIds: string[] = [];

  for (const question of questions) {
    maxScore += question.points;
    const result = gradeQuestion(question, responses[question.id] ?? {});
    if (result.correct === null) ungradedQuestionIds.push(question.id);
    score += result.awardedPoints;
    results.push(result);
  }

  const gradedMax = questions
    .filter((q) => q.type !== "CODING")
    .reduce((sum, q) => sum + q.points, 0);

  const percent =
    gradedMax === 0 ? 0 : Math.round((score / gradedMax) * 100);

  return {
    results,
    score,
    maxScore,
    percent,
    passed: percent >= passingScore,
    ungradedQuestionIds,
  };
}

/** Maps per-question results to skill tags for the learner skill profile. */
export function skillEvidence(
  questions: GradableQuestion[] & { skillTags?: string[] }[],
  results: QuestionResult[],
): Array<{ skill: string; correct: boolean }> {
  const byId = new Map(questions.map((q) => [q.id, q]));
  const evidence: Array<{ skill: string; correct: boolean }> = [];
  for (const result of results) {
    if (result.correct === null) continue;
    const question = byId.get(result.questionId) as
      | (GradableQuestion & { skillTags?: string[] })
      | undefined;
    for (const skill of question?.skillTags ?? []) {
      evidence.push({ skill, correct: result.correct });
    }
  }
  return evidence;
}

/**
 * Updates a mastery score (0..100) with a simple exponentially weighted
 * moving average so recent evidence matters more.
 */
export function updateMastery(
  previousScore: number,
  previousEvidence: number,
  correct: boolean,
): number {
  const target = correct ? 100 : 0;
  const alpha = previousEvidence === 0 ? 1 : 0.4;
  return Math.round(previousScore * (1 - alpha) + target * alpha);
}
