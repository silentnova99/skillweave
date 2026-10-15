/**
 * Deterministic curriculum progression rules.
 *
 * A module is complete when every non-optional chapter inside it is complete
 * (or the module has no chapters). A module is unlocked when all of its
 * prerequisite modules are complete. A required chapter is eligible when its
 * module is unlocked and every earlier required chapter in the same module is
 * complete. Optional and revision chapters are eligible as soon as their
 * module is unlocked.
 *
 * All functions here are pure so they can be unit tested without a database.
 */

export type ChapterKind = "STANDARD" | "OPTIONAL" | "REVISION";

export interface ChapterNode {
  id: string;
  moduleId: string;
  order: number;
  isOptional: boolean;
  kind: ChapterKind;
}

export interface ModuleNode {
  id: string;
  order: number;
  prerequisiteModuleIds: string[];
}

export interface PathState {
  moduleCompleted: Record<string, boolean>;
  moduleUnlocked: Record<string, boolean>;
  moduleMissingPrereqs: Record<string, string[]>;
  chapterEligible: Record<string, boolean>;
  chapterCompleted: Record<string, boolean>;
  nextChapterId: string | null;
  nextEligibleChapterId: string | null;
  totalRequiredChapters: number;
  completedRequiredChapters: number;
  percentComplete: number;
}

function isGatingChapter(chapter: ChapterNode): boolean {
  return !chapter.isOptional && chapter.kind !== "OPTIONAL";
}

export function computePathState(input: {
  modules: ModuleNode[];
  chapters: ChapterNode[];
  completedChapterIds: Iterable<string>;
}): PathState {
  const { modules, chapters } = input;
  const completed = new Set(input.completedChapterIds);

  const chaptersByModule = new Map<string, ChapterNode[]>();
  for (const chapter of chapters) {
    const list = chaptersByModule.get(chapter.moduleId) ?? [];
    list.push(chapter);
    chaptersByModule.set(chapter.moduleId, list);
  }
  for (const list of chaptersByModule.values()) {
    list.sort((a, b) => a.order - b.order);
  }
  const moduleCompleted: Record<string, boolean> = {};
  for (const mod of modules) {
    const modChapters = chaptersByModule.get(mod.id) ?? [];
    const gating = modChapters.filter(isGatingChapter);
    moduleCompleted[mod.id] =
      gating.length === 0 || gating.every((c) => completed.has(c.id));
  }

  const moduleUnlocked: Record<string, boolean> = {};
  const moduleMissingPrereqs: Record<string, string[]> = {};
  for (const mod of modules) {
    const missing = mod.prerequisiteModuleIds.filter(
      (prereqId) => moduleCompleted[prereqId] !== true,
    );
    moduleMissingPrereqs[mod.id] = missing;
    moduleUnlocked[mod.id] = missing.length === 0;
  }

  const chapterEligible: Record<string, boolean> = {};
  for (const mod of modules) {
    const modChapters = chaptersByModule.get(mod.id) ?? [];
    let gateOpen = moduleUnlocked[mod.id];
    for (const chapter of modChapters) {
      const alreadyDone = completed.has(chapter.id);
      if (isGatingChapter(chapter)) {
        chapterEligible[chapter.id] = gateOpen || alreadyDone;
        // once this chapter is done the next gating chapter opens
        if (!alreadyDone) gateOpen = false;
      } else {
        chapterEligible[chapter.id] = moduleUnlocked[mod.id] || alreadyDone;
      }
    }
  }

  const gatingChapters = chapters.filter(isGatingChapter);
  const completedGating = gatingChapters.filter((c) => completed.has(c.id));

  // Deterministic "next" chapter: first incomplete chapter in curriculum
  // order that is either already eligible or in the immediate frontier.
  const ordered = [...chapters].sort((a, b) => {
    const ma = modules.find((m) => m.id === a.moduleId)?.order ?? 0;
    const mb = modules.find((m) => m.id === b.moduleId)?.order ?? 0;
    if (ma !== mb) return ma - mb;
    return a.order - b.order;
  });

  let nextChapterId: string | null = null;
  let nextEligibleChapterId: string | null = null;
  for (const chapter of ordered) {
    if (completed.has(chapter.id)) continue;
    if (nextChapterId === null) nextChapterId = chapter.id;
    if (chapterEligible[chapter.id]) {
      nextEligibleChapterId = chapter.id;
      break;
    }
  }

  const totalRequiredChapters = gatingChapters.length;
  const completedRequiredChapters = completedGating.length;
  const percentComplete =
    totalRequiredChapters === 0
      ? 0
      : Math.round((completedRequiredChapters / totalRequiredChapters) * 100);

  return {
    moduleCompleted,
    moduleUnlocked,
    moduleMissingPrereqs,
    chapterEligible,
    chapterCompleted: Object.fromEntries(
      chapters.map((c) => [c.id, completed.has(c.id)]),
    ),
    nextChapterId,
    nextEligibleChapterId,
    totalRequiredChapters,
    completedRequiredChapters,
    percentComplete,
  };
}

/** Returns prerequisite module titles that still block a module. */
export function missingPrerequisiteTitles(
  moduleId: string,
  moduleTitleById: Record<string, string>,
  missingIds: string[],
): string[] {
  return missingIds
    .map((id) => moduleTitleById[id] ?? id)
    .filter(Boolean);
}
