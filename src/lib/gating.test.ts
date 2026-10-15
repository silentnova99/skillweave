import { describe, expect, it } from "vitest";
import type { PathState } from "@/lib/curriculum";
import type { PathProgress } from "@/lib/progress";
import {
  CHAPTER_TEST_LOCKED_REASON,
  MODULE_MOCK_LOCKED_REASON,
  chapterTestGate,
  moduleMockGate,
} from "@/lib/gating";

function makeProgress(overrides: {
  chapterContentComplete?: Record<string, boolean>;
  moduleCompleted?: Record<string, boolean>;
}): PathProgress {
  const state: PathState = {
    moduleCompleted: overrides.moduleCompleted ?? {},
    moduleUnlocked: {},
    moduleMissingPrereqs: {},
    chapterEligible: {},
    chapterCompleted: {},
    nextChapterId: null,
    nextEligibleChapterId: null,
    totalRequiredChapters: 0,
    completedRequiredChapters: 0,
    percentComplete: 0,
  };
  return {
    pathId: "p1",
    pathSlug: "frontend-developer",
    pathTitle: "Frontend Developer",
    state,
    chapters: [],
    completedChapterIds: [],
    inProgressChapterIds: [],
    chapterContentComplete: overrides.chapterContentComplete ?? {},
  };
}

describe("chapterTestGate", () => {
  it("unlocks when content is complete", () => {
    const gate = chapterTestGate(makeProgress({ chapterContentComplete: { c1: true } }), "c1");
    expect(gate.unlocked).toBe(true);
    expect(gate.reason).toBeNull();
  });

  it("locks when content is not complete", () => {
    const gate = chapterTestGate(makeProgress({ chapterContentComplete: { c1: false } }), "c1");
    expect(gate.unlocked).toBe(false);
    expect(gate.reason).toBe(CHAPTER_TEST_LOCKED_REASON);
  });

  it("locks when the chapter is unknown", () => {
    const gate = chapterTestGate(makeProgress({}), "missing");
    expect(gate.unlocked).toBe(false);
  });
});

describe("moduleMockGate", () => {
  it("unlocks when the module is complete", () => {
    const gate = moduleMockGate(makeProgress({ moduleCompleted: { m1: true } }), "m1");
    expect(gate.unlocked).toBe(true);
    expect(gate.reason).toBeNull();
  });

  it("locks when the module is incomplete", () => {
    const gate = moduleMockGate(makeProgress({ moduleCompleted: { m1: false } }), "m1");
    expect(gate.unlocked).toBe(false);
    expect(gate.reason).toBe(MODULE_MOCK_LOCKED_REASON);
  });
});
