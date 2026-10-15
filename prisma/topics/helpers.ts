// Shared authoring helper for topic packs.
//
// Every topic is a list of single-choice questions with exactly one correct
// option and a short explanation. Packs live in `prisma/topics/*` and are merged
// into TOPIC_BANK in `prisma/question-bank.ts`.

import type { QuestionDef } from "../seed-data";

export function t(
  prompt: string,
  options: Array<[string, boolean?]>,
  explanation: string,
  skillTags: string[] = [],
): QuestionDef {
  return {
    prompt,
    explanation,
    options,
    type: "SINGLE_CHOICE",
    difficulty: "BEGINNER",
    skillTags,
    points: 1,
  };
}
