/**
 * Curriculum gating for assessments.
 *
 * A chapter test (10 questions) unlocks once the chapter's study content is
 * done — every required resource completed or the chapter explicitly marked
 * complete. A module mock (20 questions) unlocks once every gating chapter in
 * the module is complete. Standalone practice is always available.
 *
 * These functions are pure so the rules can be unit tested without a database.
 */

import type { PathProgress } from "@/lib/progress";

export interface AssessmentGate {
  unlocked: boolean;
  reason: string | null;
}

export const CHAPTER_TEST_LOCKED_REASON =
  "Finish this chapter's required resources to unlock the test.";

export const MODULE_MOCK_LOCKED_REASON =
  "Complete every chapter in this module to unlock the mock exam.";

export function chapterTestGate(progress: PathProgress, chapterId: string): AssessmentGate {
  const unlocked = progress.chapterContentComplete[chapterId] === true;
  return { unlocked, reason: unlocked ? null : CHAPTER_TEST_LOCKED_REASON };
}

export function moduleMockGate(progress: PathProgress, moduleId: string): AssessmentGate {
  const unlocked = progress.state.moduleCompleted[moduleId] === true;
  return { unlocked, reason: unlocked ? null : MODULE_MOCK_LOCKED_REASON };
}
