import { describe, expect, it } from "vitest";
import { computePathState, type ChapterNode, type ModuleNode } from "@/lib/curriculum";

const modules: ModuleNode[] = [
  { id: "m1", order: 1, prerequisiteModuleIds: [] },
  { id: "m2", order: 2, prerequisiteModuleIds: ["m1"] },
  { id: "m3", order: 3, prerequisiteModuleIds: ["m1"] },
];

const chapters: ChapterNode[] = [
  { id: "a1", moduleId: "m1", order: 1, isOptional: false, kind: "STANDARD" },
  { id: "a2", moduleId: "m1", order: 2, isOptional: false, kind: "STANDARD" },
  { id: "b1", moduleId: "m2", order: 1, isOptional: false, kind: "STANDARD" },
  { id: "b2", moduleId: "m2", order: 2, isOptional: true, kind: "OPTIONAL" },
  { id: "c1", moduleId: "m3", order: 1, isOptional: false, kind: "STANDARD" },
];

describe("computePathState", () => {
  it("unlocks only the first module at the start", () => {
    const state = computePathState({
      modules,
      chapters,
      completedChapterIds: [],
    });
    expect(state.moduleUnlocked.m1).toBe(true);
    expect(state.moduleUnlocked.m2).toBe(false);
    expect(state.moduleUnlocked.m3).toBe(false);
    expect(state.chapterEligible.a1).toBe(true);
    expect(state.chapterEligible.a2).toBe(false);
    expect(state.chapterEligible.b1).toBe(false);
    expect(state.nextEligibleChapterId).toBe("a1");
  });

  it("unlocks the next required chapter after completing the previous one", () => {
    const state = computePathState({
      modules,
      chapters,
      completedChapterIds: ["a1"],
    });
    expect(state.chapterEligible.a1).toBe(true);
    expect(state.chapterEligible.a2).toBe(true);
    expect(state.chapterEligible.b1).toBe(false);
    expect(state.nextEligibleChapterId).toBe("a2");
  });

  it("unlocks dependent modules only when all gating chapters complete", () => {
    const state = computePathState({
      modules,
      chapters,
      completedChapterIds: ["a1", "a2"],
    });
    expect(state.moduleCompleted.m1).toBe(true);
    expect(state.moduleUnlocked.m2).toBe(true);
    expect(state.moduleUnlocked.m3).toBe(true);
    expect(state.chapterEligible.b1).toBe(true);
    expect(state.chapterEligible.b2).toBe(true);
    expect(state.chapterEligible.c1).toBe(true);
  });

  it("does not let an optional chapter block module completion", () => {
    const state = computePathState({
      modules,
      chapters,
      completedChapterIds: ["a1", "a2", "b1"],
    });
    expect(state.moduleCompleted.m2).toBe(true);
  });

  it("computes completion percentage on gating chapters only", () => {
    const state = computePathState({
      modules,
      chapters,
      completedChapterIds: ["a1", "a2"],
    });
    // gating chapters: a1, a2, b1, c1 = 4; completed = 2 => 50%
    expect(state.totalRequiredChapters).toBe(4);
    expect(state.completedRequiredChapters).toBe(2);
    expect(state.percentComplete).toBe(50);
  });

  it("reports missing prerequisites for a locked module", () => {
    const state = computePathState({
      modules,
      chapters,
      completedChapterIds: [],
    });
    expect(state.moduleMissingPrereqs.m2).toEqual(["m1"]);
    expect(state.moduleMissingPrereqs.m1).toEqual([]);
  });
});
