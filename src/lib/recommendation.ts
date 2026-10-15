/**
 * Deterministic recommendation engine.
 *
 * Curriculum rules — not an AI model — decide what to study next. AI may later
 * rephrase the `rationale` text, but it must never invent curriculum facts,
 * assessment results, or resource verification status.
 */
import type { PathState } from "@/lib/curriculum";

export type RecommendationKind =
  | "REVISION"
  | "ASSESSMENT"
  | "NEXT_CHAPTER"
  | "PROJECT"
  | "INTERVIEW"
  | "DIAGNOSTIC"
  | "BLOCKED";

export interface Recommendation {
  kind: RecommendationKind;
  title: string;
  rationale: string;
  targetType?: "chapter" | "assessment" | "project" | "path";
  targetId?: string;
  href?: string;
  priority: number;
}

export interface ChapterMeta {
  id: string;
  slug: string;
  title: string;
  moduleTitle: string;
}

export interface FailedAttemptMeta {
  chapterId: string;
  chapterTitle: string;
  chapterSlug: string;
  percent: number;
  passingScore: number;
}

export interface SkillMeta {
  skill: string;
  score: number;
  evidenceCount: number;
}

export interface ModuleAssessmentMeta {
  id: string;
  title: string;
  moduleId: string;
  moduleTitle: string;
}

export interface ProjectMeta {
  id: string;
  slug: string;
  title: string;
  level: string;
}

export interface RecommendationInput {
  pathSlug: string;
  pathState: PathState;
  chapterById: Record<string, ChapterMeta>;
  moduleOrder: string[];
  failedAttempts: FailedAttemptMeta[];
  weakSkills: SkillMeta[];
  pendingModuleAssessments: ModuleAssessmentMeta[];
  projects: ProjectMeta[];
  hasDiagnostic: boolean;
  diagnosticCompleted: boolean;
  completedAllChapters: boolean;
}

const WEAK_SKILL_THRESHOLD = 60;

export function buildRecommendations(
  input: RecommendationInput,
): Recommendation[] {
  const recs: Recommendation[] = [];
  const chapterHref = (slug: string) =>
    `/learn/${input.pathSlug}/${slug}`;

  // 1. Retake failed chapter quizzes first — they block progress.
  const sortedFailures = [...input.failedAttempts].sort(
    (a, b) => a.percent - b.percent,
  );
  sortedFailures.forEach((failure, index) => {
    recs.push({
      kind: "REVISION",
      title: `Revise and retake: ${failure.chapterTitle}`,
      rationale: `Your last attempt scored ${failure.percent}%, below the ${failure.passingScore}% pass mark. Review the revision resources before retrying.`,
      targetType: "chapter",
      targetId: failure.chapterId,
      href: chapterHref(failure.chapterSlug),
      priority: 100 - index,
    });
  });

  // 2. Weak skills suggest topic revision.
  const weak = [...input.weakSkills]
    .filter(
      (s) => s.score < WEAK_SKILL_THRESHOLD && s.evidenceCount >= 2,
    )
    .sort((a, b) => a.score - b.score)
    .slice(0, 3);
  weak.forEach((skill, index) => {
    recs.push({
      kind: "REVISION",
      title: `Strengthen: ${skill.skill.replace(/[-_]/g, " ")}`,
      rationale: `Assessment evidence shows ${skill.score}% mastery in "${skill.skill.replace(/[-_]/g, " ")}" across ${skill.evidenceCount} questions. Target this before moving on.`,
      targetType: "path",
      targetId: input.pathSlug,
      href: `/progress`,
      priority: 80 - index,
    });
  });

  // 3. Complete module assessments once their module chapters are done.
  for (const assessment of input.pendingModuleAssessments) {
    recs.push({
      kind: "ASSESSMENT",
      title: `Take module assessment: ${assessment.title}`,
      rationale:
        "All chapters in this module are complete. Passing the module assessment confirms mastery before the next module.",
      targetType: "assessment",
      targetId: assessment.id,
      href: `/assessments/${assessment.id}`,
      priority: 70,
    });
  }

  // 4. Continue with the next eligible chapter.
  if (input.pathState.nextEligibleChapterId && !input.completedAllChapters) {
    const chapter = input.chapterById[input.pathState.nextEligibleChapterId];
    if (chapter) {
      recs.push({
        kind: "NEXT_CHAPTER",
        title: `Continue: ${chapter.title}`,
        rationale: `Prerequisites are satisfied and this is the next chapter in "${chapter.moduleTitle}".`,
        targetType: "chapter",
        targetId: chapter.id,
        href: chapterHref(chapter.slug),
        priority: 60,
      });
    }
  }

  // 5. If blocked, explain the missing prerequisites.
  if (!input.pathState.nextEligibleChapterId && !input.completedAllChapters) {
    const blockedModule = input.moduleOrder.find(
      (moduleId) =>
        input.pathState.moduleUnlocked[moduleId] === false,
    );
    recs.push({
      kind: "BLOCKED",
      title: "Complete prerequisite modules to continue",
      rationale: blockedModule
        ? "The next module is locked until its prerequisite modules are marked complete. Finish any remaining required chapters there."
        : "No eligible chapter was found. Complete your in-progress chapters to unlock the next one.",
      targetType: "path",
      targetId: input.pathSlug,
      href: `/paths/${input.pathSlug}`,
      priority: 50,
    });
  }

  // 6. Diagnostic encouragement.
  if (input.hasDiagnostic && !input.diagnosticCompleted) {
    recs.push({
      kind: "DIAGNOSTIC",
      title: "Take the optional diagnostic",
      rationale:
        "The diagnostic can test you out of chapters you already know, so you only study what is new to you.",
      targetType: "path",
      targetId: input.pathSlug,
      href: `/onboarding/diagnostic`,
      priority: 55,
    });
  }

  // 7. Once the path is complete, move to portfolio + interview readiness.
  if (input.completedAllChapters) {
    for (const project of input.projects.slice(0, 2)) {
      recs.push({
        kind: "PROJECT",
        title: `Build: ${project.title}`,
        rationale:
          "You have finished the required chapters. A project turns knowledge into portfolio evidence.",
        targetType: "project",
        targetId: project.id,
        href: `/projects/${project.slug}`,
        priority: 65,
      });
    }
    recs.push({
      kind: "INTERVIEW",
      title: "Prepare for interviews",
      rationale:
        "Coursework is complete. Work through role checklists, timed mock assessments and the interview question bank.",
      targetType: "path",
      targetId: input.pathSlug,
      href: `/interview`,
      priority: 64,
    });
  }

  return recs
    .sort((a, b) => b.priority - a.priority)
    .filter(
      (rec, index, all) =>
        all.findIndex(
          (r) => r.kind === rec.kind && r.title === rec.title,
        ) === index,
    );
}
