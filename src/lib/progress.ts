import { prisma } from "@/lib/prisma";
import {
  computePathState,
  type ChapterNode,
  type ModuleNode,
  type PathState,
} from "@/lib/curriculum";
import {
  buildRecommendations,
  type Recommendation,
  type ChapterMeta,
  type FailedAttemptMeta,
  type ModuleAssessmentMeta,
  type ProjectMeta,
  type SkillMeta,
} from "@/lib/recommendation";

export interface ChapterInfo {
  id: string;
  slug: string;
  title: string;
  order: number;
  isOptional: boolean;
  kind: "STANDARD" | "OPTIONAL" | "REVISION";
  moduleId: string;
  moduleTitle: string;
  moduleSlug: string;
  phaseTitle: string;
}

export interface PathProgress {
  pathId: string;
  pathSlug: string;
  pathTitle: string;
  state: PathState;
  chapters: ChapterInfo[];
  completedChapterIds: string[];
  inProgressChapterIds: string[];
  /**
   * Whether a chapter's study content is done: either the chapter was marked
   * complete or every required resource in it has been completed. Chapter tests
   * only unlock once this is true.
   */
  chapterContentComplete: Record<string, boolean>;
}

/**
 * Loads a published career path with the learner's chapter progress and
 * computes the deterministic progression state (locks, eligibility, next step).
 */
export async function loadPathProgress(
  userId: string | null,
  pathSlug: string,
): Promise<PathProgress | null> {
  const path = await prisma.careerPath.findFirst({
    where: { slug: pathSlug, published: true },
    include: {
      phases: {
        orderBy: { order: "asc" },
        include: {
          modules: {
            orderBy: { order: "asc" },
            include: {
              prerequisites: true,
              chapters: {
                orderBy: { order: "asc" },
                select: {
                  id: true,
                  slug: true,
                  title: true,
                  order: true,
                  isOptional: true,
                  kind: true,
                  resources: { select: { id: true, isRequired: true } },
                },
              },
            },
          },
        },
      },
    },
  });
  if (!path) return null;

  const chapters: ChapterInfo[] = [];
  const moduleNodes: ModuleNode[] = [];
  const chapterNodes: ChapterNode[] = [];
  const requiredResourcesByChapter: Record<string, string[]> = {};

  for (const phase of path.phases) {
    for (const mod of phase.modules) {
      moduleNodes.push({
        id: mod.id,
        order: mod.order,
        prerequisiteModuleIds: mod.prerequisites.map((p) => p.requiredModuleId),
      });
      for (const chapter of mod.chapters) {
        chapterNodes.push({
          id: chapter.id,
          moduleId: mod.id,
          order: chapter.order,
          isOptional: chapter.isOptional,
          kind: chapter.kind,
        });
        requiredResourcesByChapter[chapter.id] = chapter.resources
          .filter((r) => r.isRequired)
          .map((r) => r.id);
        chapters.push({
          id: chapter.id,
          slug: chapter.slug,
          title: chapter.title,
          order: chapter.order,
          isOptional: chapter.isOptional,
          kind: chapter.kind,
          moduleId: mod.id,
          moduleTitle: mod.title,
          moduleSlug: mod.slug,
          phaseTitle: phase.title,
        });
      }
    }
  }

  const progress = userId
    ? await prisma.chapterProgress.findMany({
        where: { userId, chapter: { module: { phase: { careerPathId: path.id } } } },
        select: { chapterId: true, status: true },
      })
    : [];

  const resourceCompletions = userId
    ? await prisma.resourceCompletion.findMany({
        where: {
          userId,
          chapterResource: { chapter: { module: { phase: { careerPathId: path.id } } } },
        },
        select: { chapterResourceId: true },
      })
    : [];
  const completedResourceIds = new Set(resourceCompletions.map((r) => r.chapterResourceId));

  const completedChapterIds = progress
    .filter((p) => p.status === "COMPLETED")
    .map((p) => p.chapterId);
  const inProgressChapterIds = progress
    .filter((p) => p.status === "IN_PROGRESS")
    .map((p) => p.chapterId);
  const completedChapterSet = new Set(completedChapterIds);

  const state = computePathState({
    modules: moduleNodes,
    chapters: chapterNodes,
    completedChapterIds,
  });

  const chapterContentComplete: Record<string, boolean> = {};
  for (const chapter of chapters) {
    const required = requiredResourcesByChapter[chapter.id] ?? [];
    chapterContentComplete[chapter.id] =
      completedChapterSet.has(chapter.id) ||
      (required.length > 0 && required.every((id) => completedResourceIds.has(id)));
  }

  return {
    pathId: path.id,
    pathSlug: path.slug,
    pathTitle: path.title,
    state,
    chapters,
    completedChapterIds,
    inProgressChapterIds,
    chapterContentComplete,
  };
}

/**
 * Builds the deterministic "what should I do next" list for a learner on a
 * path. Curriculum rules decide; AI only ever rephrases the rationale.
 */
export async function getRecommendationsForPath(
  userId: string,
  pathSlug: string,
): Promise<Recommendation[]> {
  const progress = await loadPathProgress(userId, pathSlug);
  if (!progress) return [];

  const { pathId, state, chapters } = progress;

  const [failedAttempts, weakSkills, moduleAssessments, projects, attemptsByAssessment, diagnosticCount] =
    await Promise.all([
      prisma.attempt.findMany({
        where: {
          userId,
          status: "GRADED",
          passed: false,
          assessment: { chapter: { module: { phase: { careerPathId: pathId } } } },
        },
        orderBy: { submittedAt: "desc" },
        include: {
          assessment: {
            include: { chapter: { include: { module: true } } },
          },
        },
      }),
      prisma.skillScore.findMany({ where: { userId }, orderBy: { score: "asc" } }),
      prisma.assessment.findMany({
        where: {
          type: "MOCK_EXAM",
          module: { phase: { careerPathId: pathId } },
        },
        include: { module: { include: { phase: true } } },
      }),
      prisma.project.findMany({
        where: { careerPathId: pathId },
        orderBy: { order: "asc" },
        select: { id: true, slug: true, title: true, level: true },
      }),
      prisma.attempt.findMany({
        where: { userId, status: "GRADED", passed: true },
        select: { assessmentId: true },
      }),
      prisma.assessment.count({ where: { type: "DIAGNOSTIC" } }),
    ]);

  const passedAssessmentIds = new Set(attemptsByAssessment.map((a) => a.assessmentId));

  const chapterById: Record<string, ChapterMeta> = {};
  for (const chapter of chapters) {
    chapterById[chapter.id] = {
      id: chapter.id,
      slug: chapter.slug,
      title: chapter.title,
      moduleTitle: chapter.moduleTitle,
    };
  }

  const failed: FailedAttemptMeta[] = [];
  const seenChapter = new Set<string>();
  for (const attempt of failedAttempts) {
    const chapter = attempt.assessment.chapter;
    if (!chapter || seenChapter.has(chapter.id)) continue;
    seenChapter.add(chapter.id);
    failed.push({
      chapterId: chapter.id,
      chapterTitle: chapter.title,
      chapterSlug: chapter.slug,
      percent: attempt.percent ?? 0,
      passingScore: attempt.assessment.passingScore,
    });
  }

  const skills: SkillMeta[] = weakSkills.map((s) => ({
    skill: s.skill,
    score: s.score,
    evidenceCount: s.evidenceCount,
  }));

  const pendingModuleAssessments: ModuleAssessmentMeta[] = [];
  for (const assessment of moduleAssessments) {
    if (!assessment.module) continue;
    const moduleId = assessment.module.id;
    // Module has no gating chapters left and the assessment is not yet passed.
    if (state.moduleCompleted[moduleId] && !passedAssessmentIds.has(assessment.id)) {
      pendingModuleAssessments.push({
        id: assessment.id,
        title: assessment.title,
        moduleId,
        moduleTitle: assessment.module.title,
      });
    }
  }

  const projectMetas: ProjectMeta[] = projects.map((p) => ({
    id: p.id,
    slug: p.slug,
    title: p.title,
    level: p.level,
  }));

  const completedAllChapters = state.totalRequiredChapters > 0
    ? state.completedRequiredChapters >= state.totalRequiredChapters
    : chapters.length > 0 && progress.completedChapterIds.length >= chapters.length;

  return buildRecommendations({
    pathSlug,
    pathState: state,
    chapterById,
    moduleOrder: state ? Object.keys(state.moduleUnlocked) : [],
    failedAttempts: failed,
    weakSkills: skills,
    pendingModuleAssessments,
    projects: projectMetas,
    hasDiagnostic: diagnosticCount > 0,
    diagnosticCompleted: false,
    completedAllChapters,
  });
}

/** Counts of published catalogue content for the landing page and admin. */
export async function catalogueStats() {
  const [paths, modules, chapters, resources, projects] = await Promise.all([
    prisma.careerPath.count({ where: { published: true } }),
    prisma.module.count(),
    prisma.chapter.count(),
    prisma.resource.count(),
    prisma.project.count(),
  ]);
  return { paths, modules, chapters, resources, projects };
}
