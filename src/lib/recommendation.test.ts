import { describe, expect, it } from "vitest";
import { buildRecommendations, type RecommendationInput } from "@/lib/recommendation";
import { computePathState, type ChapterNode, type ModuleNode } from "@/lib/curriculum";

const modules: ModuleNode[] = [
  { id: "m1", order: 1, prerequisiteModuleIds: [] },
  { id: "m2", order: 2, prerequisiteModuleIds: ["m1"] },
];
const chapters: ChapterNode[] = [
  { id: "a1", moduleId: "m1", order: 1, isOptional: false, kind: "STANDARD" },
  { id: "a2", moduleId: "m1", order: 2, isOptional: false, kind: "STANDARD" },
  { id: "b1", moduleId: "m2", order: 1, isOptional: false, kind: "STANDARD" },
];

function baseInput(
  overrides: Partial<RecommendationInput> = {},
): RecommendationInput {
  return {
    pathSlug: "python",
    pathState: computePathState({
      modules,
      chapters,
      completedChapterIds: [],
    }),
    chapterById: {
      a1: { id: "a1", slug: "a1", title: "Basics", moduleTitle: "Getting Started" },
      a2: { id: "a2", slug: "a2", title: "Control Flow", moduleTitle: "Getting Started" },
      b1: { id: "b1", slug: "b1", title: "Functions", moduleTitle: "Core" },
    },
    moduleOrder: ["m1", "m2"],
    failedAttempts: [],
    weakSkills: [],
    pendingModuleAssessments: [],
    projects: [],
    hasDiagnostic: true,
    diagnosticCompleted: false,
    completedAllChapters: false,
    ...overrides,
  };
}

describe("buildRecommendations", () => {
  it("recommends the next eligible chapter first when nothing is failing", () => {
    const recs = buildRecommendations(baseInput());
    const next = recs.find((r) => r.kind === "NEXT_CHAPTER");
    expect(next?.targetId).toBe("a1");
    expect(next?.href).toBe("/learn/python/a1");
  });

  it("prioritises retaking a failed quiz above new content", () => {
    const recs = buildRecommendations(
      baseInput({
        failedAttempts: [
          {
            chapterId: "a1",
            chapterTitle: "Basics",
            chapterSlug: "a1",
            percent: 40,
            passingScore: 70,
          },
        ],
      }),
    );
    expect(recs[0].kind).toBe("REVISION");
    expect(recs[0].title).toContain("Basics");
  });

  it("exposes weak skills as revision guidance", () => {
    const recs = buildRecommendations(
      baseInput({
        weakSkills: [{ skill: "loops", score: 30, evidenceCount: 4 }],
      }),
    );
    expect(recs.some((r) => r.title.includes("loops"))).toBe(true);
  });

  it("nudges module assessments when chapters complete", () => {
    const recs = buildRecommendations(
      baseInput({
        pathState: computePathState({
          modules,
          chapters,
          completedChapterIds: ["a1", "a2"],
        }),
        pendingModuleAssessments: [
          {
            id: "asmt1",
            title: "Getting Started Assessment",
            moduleId: "m1",
            moduleTitle: "Getting Started",
          },
        ],
      }),
    );
    expect(recs.some((r) => r.kind === "ASSESSMENT")).toBe(true);
  });

  it("suggests portfolio and interview work when the path is complete", () => {
    const recs = buildRecommendations(
      baseInput({
        pathState: computePathState({
          modules,
          chapters,
          completedChapterIds: ["a1", "a2", "b1"],
        }),
        completedAllChapters: true,
        projects: [
          { id: "p1", slug: "cli-tool", title: "Build a CLI tool", level: "BEGINNER" },
        ],
      }),
    );
    expect(recs.some((r) => r.kind === "PROJECT")).toBe(true);
    expect(recs.some((r) => r.kind === "INTERVIEW")).toBe(true);
  });

  it("deduplicates recommendations", () => {
    const recs = buildRecommendations(baseInput());
    const keys = recs.map((r) => `${r.kind}:${r.title}`);
    expect(new Set(keys).size).toBe(keys.length);
  });
});
