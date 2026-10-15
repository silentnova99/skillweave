import "dotenv/config";
import bcrypt from "bcryptjs";
import { PrismaClient } from "../src/generated/prisma/client";
import { createPgAdapter } from "../src/lib/pg";
import { selectMockQuestions } from "../src/lib/mock";
import {
  MODULE_MOCK_SIZE,
  PATHS,
  RESOURCES,
  STANDALONE_ASSESSMENTS,
  resolveChapterQuestions,
  type ChapterDef,
  type ModuleDef,
  type PathDef,
  type QuestionDef,
} from "./seed-data";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("DATABASE_URL is not set. Copy .env.example to .env first.");
}

const prisma = new PrismaClient({ adapter: createPgAdapter(connectionString) });

const ADMIN_EMAIL = (process.env.SEED_ADMIN_EMAIL ?? "admin@skillweave.local").toLowerCase();
const ADMIN_PASSWORD = process.env.SEED_ADMIN_PASSWORD ?? "skillweave-admin";
const DEMO_EMAIL = (process.env.SEED_DEMO_EMAIL ?? "learner@skillweave.local").toLowerCase();
const DEMO_PASSWORD = process.env.SEED_DEMO_PASSWORD ?? "skillweave-learner";

// Managed Postgres endpoints (Supabase pooler, CI proxies) sometimes close a
// long-lived connection mid-seed. The pg pool transparently opens a fresh
// connection, so retrying the aborted operation is safe: nested writes and
// createMany calls are atomic, and the seed resets first anyway.
const RETRYABLE_CONNECTION_ERROR =
  /server has closed the connection|connectionclosed|connection closed|closed the connection|econnreset|terminating connection|connection error|client has encountered a connection error|p1001|p1017/i;

async function withRetry<T>(fn: () => Promise<T>, attempts = 10): Promise<T> {
  for (let attempt = 1; ; attempt++) {
    try {
      return await fn();
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (attempt >= attempts || !RETRYABLE_CONNECTION_ERROR.test(message)) throw error;
      console.warn(`  · transient connection error (retry ${attempt}/${attempts - 1})…`);
      await new Promise((resolve) => setTimeout(resolve, 200 * attempt));
    }
  }
}

function skillTagsFor(questions: QuestionDef[]): string[] {
  const set = new Set<string>();
  for (const question of questions) {
    for (const tag of question.skillTags ?? []) set.add(tag);
  }
  return [...set];
}

// Chapters store their test questions either inline (`quiz`) or by referencing a
// shared topic. Normalise once so the rest of the seed just sees a list.
function chapterQuestions(chapter: ChapterDef): QuestionDef[] {
  return resolveChapterQuestions(chapter);
}

async function resetCurriculum() {
  // Delete in dependency order. Users are preserved between seeds.
  await withRetry(() => prisma.resourceReport.deleteMany());
  await withRetry(() => prisma.answer.deleteMany());
  await withRetry(() => prisma.attempt.deleteMany());
  await withRetry(() => prisma.assessmentQuestion.deleteMany());
  await withRetry(() => prisma.questionOption.deleteMany());
  await withRetry(() => prisma.codingProblem.deleteMany());
  await withRetry(() => prisma.question.deleteMany());
  await withRetry(() => prisma.assessment.deleteMany());
  await withRetry(() => prisma.resourceCompletion.deleteMany());
  await withRetry(() => prisma.chapterProgress.deleteMany());
  await withRetry(() => prisma.note.deleteMany());
  await withRetry(() => prisma.bookmark.deleteMany());
  await withRetry(() => prisma.recommendation.deleteMany());
  await withRetry(() => prisma.skillScore.deleteMany());
  await withRetry(() => prisma.projectSubmission.deleteMany());
  await withRetry(() => prisma.project.deleteMany());
  await withRetry(() => prisma.chapterResource.deleteMany());
  await withRetry(() => prisma.resource.deleteMany());
  await withRetry(() => prisma.learningObjective.deleteMany());
  await withRetry(() => prisma.chapter.deleteMany());
  await withRetry(() => prisma.prerequisite.deleteMany());
  await withRetry(() => prisma.module.deleteMany());
  await withRetry(() => prisma.phase.deleteMany());
  await withRetry(() => prisma.jobRoleSkill.deleteMany());
  await withRetry(() => prisma.jobRole.deleteMany());
  await withRetry(() => prisma.careerPath.deleteMany());
}

async function seedResources(): Promise<Map<string, string>> {
  const idByKey = new Map<string, string>();
  for (const [key, def] of Object.entries(RESOURCES)) {
    const resource = await withRetry(() =>
      prisma.resource.create({
        data: {
          title: def.title,
          url: def.url,
          publisher: def.publisher,
          author: def.author,
          type: def.type,
          provider: def.provider,
          videoKind: def.videoKind,
          language: def.language ?? "en",
          concepts: def.concepts ?? [],
          difficulty: def.difficulty ?? "BEGINNER",
          estimatedMinutes: def.estimatedMinutes,
          accessNotes: def.accessNotes,
          isFree: def.isFree ?? true,
          license: def.license,
          licenseUrl: def.licenseUrl,
          isOpenLicense: def.isOpenLicense ?? false,
          status: def.status ?? "UNVERIFIED",
          lastVerifiedAt: def.status === "VERIFIED" ? new Date() : null,
          verificationNote: def.verificationNote,
        },
      }),
    );
    idByKey.set(key, resource.id);
  }
  return idByKey;
}

interface ChapterRef {
  id: string;
  slug: string;
  questionIds: string[];
  quizAssessmentId: string | null;
}

interface ModuleRef {
  id: string;
  slug: string;
  title: string;
  assessmentId: string | null;
  /** Chapter questions grouped per chapter, for balanced mock assembly. */
  chapterQuestions: Array<Array<{ id: string; prompt: string }>>;
}

interface PathRef {
  id: string;
  slug: string;
  moduleIdBySlug: Map<string, string>;
  chapters: ChapterRef[];
  modules: ModuleRef[];
}

async function seedPath(pathDef: PathDef, resourceIdByKey: Map<string, string>): Promise<PathRef> {
  const created = await withRetry(() =>
    prisma.careerPath.create({
    data: {
      slug: pathDef.slug,
      title: pathDef.title,
      summary: pathDef.summary,
      description: pathDef.description,
      level: pathDef.level,
      category: pathDef.category ?? "OTHER",
      featured: pathDef.featured ?? false,
      estimatedHours: pathDef.estimatedHours,
      order: pathDef.order,
      published: true,
      roles: {
        create: pathDef.roles.map((role, roleIndex) => ({
          slug: role.slug,
          title: role.title,
          description: role.description,
          order: roleIndex,
          skills: {
            create: role.skills.map((skill, skillIndex) => ({
              name: skill.name,
              detail: skill.detail,
              required: skill.required ?? true,
              order: skillIndex,
            })),
          },
        })),
      },
      projects: {
        create: pathDef.projects.map((project, projectIndex) => ({
          slug: project.slug,
          title: project.title,
          level: project.level,
          summary: project.summary,
          description: project.description,
          objectives: project.objectives ?? [],
          requirements: project.requirements,
          milestones: project.milestones ?? [],
          starterResources: (project.starterResources ?? []).map(
            (key) => RESOURCES[key]?.url ?? key,
          ),
          acceptanceCriteria: project.acceptanceCriteria ?? [],
          hints: project.hints ?? [],
          submissionInstructions: project.submissionInstructions,
          rubric: project.rubric ?? [],
          extensions: project.extensions ?? [],
          order: projectIndex,
        })),
      },
      phases: {
        create: pathDef.phases.map((phase, phaseIndex) => ({
          slug: phase.slug,
          title: phase.title,
          summary: phase.summary,
          description: phase.description,
          order: phaseIndex,
          estimatedHours: phase.estimatedHours,
          modules: {
            create: phase.modules.map((mod: ModuleDef, moduleIndex) => ({
              slug: mod.slug,
              title: mod.title,
              summary: mod.summary,
              description: mod.description,
              order: moduleIndex,
              estimatedMinutes: mod.estimatedMinutes,
              completionCriteria: mod.completionCriteria,
              objectives: mod.objectives
                ? { create: mod.objectives.map((text, index) => ({ text, order: index })) }
                : undefined,
              assessments: {
                create: [
                  {
                    slug: `${pathDef.slug}--${mod.slug}--mock`,
                    title: mod.assessment?.title ?? `Mock exam: ${mod.title}`,
                    description:
                      mod.assessment?.description ??
                      `A 20-question mock exam covering ${mod.title}. Unlocks once every chapter in the module is complete.`,
                    type: "MOCK_EXAM",
                    passingScore: mod.assessment?.passingScore ?? 70,
                    timeLimitMinutes: mod.assessment?.timeLimitMinutes ?? 25,
                    skillTags: mod.assessment?.skillTags ?? [],
                  },
                ],
              },
              chapters: {
                create: mod.chapters.map((chapter, chapterIndex) => {
                  const questions = chapterQuestions(chapter);
                  return {
                    slug: chapter.slug,
                    title: chapter.title,
                    summary: chapter.summary,
                    intro: chapter.intro,
                    order: chapterIndex,
                    estimatedMinutes: chapter.estimatedMinutes,
                    kind: chapter.kind ?? "STANDARD",
                    isOptional: chapter.isOptional ?? false,
                    completionCriteria: chapter.completionCriteria,
                    objectives: {
                      create: chapter.objectives.map((text, index) => ({ text, order: index })),
                    },
                    resources: {
                      create: chapter.resources.map((resourceLink, index) => ({
                        role: resourceLink.role,
                        order: index,
                        isRequired: resourceLink.isRequired ?? false,
                        note: resourceLink.note,
                        resource: { connect: { id: resourceIdByKey.get(resourceLink.key)! } },
                      })),
                    },
                    questions:
                      questions.length > 0
                        ? {
                            create: questions.map((question, index) => ({
                              prompt: question.prompt,
                              explanation: question.explanation,
                              type: question.type ?? "SINGLE_CHOICE",
                              difficulty: question.difficulty ?? "BEGINNER",
                              skillTags: question.skillTags ?? [],
                              points: question.points ?? 1,
                              codeSnippet: question.codeSnippet,
                              order: index,
                              options: {
                                create: question.options.map((option, optionIndex) => ({
                                  text: option[0],
                                  isCorrect: option[1] ?? false,
                                  order: optionIndex,
                                })),
                              },
                            })),
                          }
                        : undefined,
                    assessments:
                      questions.length > 0
                        ? {
                            create: [
                              {
                                slug: `${pathDef.slug}--${mod.slug}--${chapter.slug}--quiz`,
                                title: `Quiz: ${chapter.title}`,
                                description: `Check your understanding of ${chapter.title}.`,
                                type: "CHAPTER_QUIZ",
                                passingScore: 70,
                                skillTags: skillTagsFor(questions),
                              },
                            ],
                          }
                        : undefined,
                  };
                }),
              },
            })),
          },
        })),
      },
    },
    include: {
      phases: {
        include: {
          modules: {
            include: {
              chapters: { include: { questions: true, assessments: true } },
              assessments: true,
            },
          },
        },
      },
    },
    }),
  );

  const moduleIdBySlug = new Map<string, string>();
  const chapters: ChapterRef[] = [];
  const modules: ModuleRef[] = [];

  for (const phase of created.phases) {
    for (const mod of phase.modules) {
      moduleIdBySlug.set(mod.slug, mod.id);
      const chapterQuestions: Array<Array<{ id: string; prompt: string }>> = [];
      for (const chapter of mod.chapters) {
        const quiz = chapter.assessments[0] ?? null;
        const questionRefs = chapter.questions.map((question) => ({
          id: question.id,
          prompt: question.prompt,
        }));
        chapterQuestions.push(questionRefs);
        chapters.push({
          id: chapter.id,
          slug: chapter.slug,
          questionIds: questionRefs.map((ref) => ref.id),
          quizAssessmentId: quiz?.id ?? null,
        });
      }
      modules.push({
        id: mod.id,
        slug: mod.slug,
        title: mod.title,
        assessmentId: mod.assessments[0]?.id ?? null,
        chapterQuestions,
      });
    }
  }

  // Prerequisites (second pass, once all module ids are known).
  const prereqRows: Array<{ moduleId: string; requiredModuleId: string }> = [];
  for (const phase of pathDef.phases) {
    for (const mod of phase.modules) {
      const moduleId = moduleIdBySlug.get(mod.slug);
      if (!moduleId) continue;
      for (const prereqSlug of mod.prerequisiteSlugs ?? []) {
        const requiredModuleId = moduleIdBySlug.get(prereqSlug);
        if (requiredModuleId) prereqRows.push({ moduleId, requiredModuleId });
      }
    }
  }
  if (prereqRows.length > 0) {
    await withRetry(() => prisma.prerequisite.createMany({ data: prereqRows, skipDuplicates: true }));
  }

  // Chapter quiz links.
  for (const chapter of chapters) {
    if (!chapter.quizAssessmentId || chapter.questionIds.length === 0) continue;
    await withRetry(() =>
      prisma.assessmentQuestion.createMany({
        data: chapter.questionIds.map((questionId, index) => ({
          assessmentId: chapter.quizAssessmentId!,
          questionId,
          order: index,
        })),
        skipDuplicates: true,
      }),
    );
  }

  // Module assessment links: a balanced mock drawn from the module's chapters.
  for (const mod of modules) {
    if (!mod.assessmentId || mod.chapterQuestions.length === 0) continue;
    const questionIds = selectMockQuestions(
      mod.chapterQuestions,
      MODULE_MOCK_SIZE,
      (question) => question.prompt,
    ).map((question) => question.id);
    if (questionIds.length === 0) continue;
    await withRetry(() =>
      prisma.assessmentQuestion.createMany({
        data: questionIds.map((questionId, index) => ({
          assessmentId: mod.assessmentId!,
          questionId,
          order: index,
        })),
        skipDuplicates: true,
      }),
    );
  }

  return {
    id: created.id,
    slug: created.slug,
    moduleIdBySlug,
    chapters,
    modules,
  };
}

async function seedStandaloneAssessments() {
  for (const def of STANDALONE_ASSESSMENTS) {
    const assessment = await withRetry(() =>
      prisma.assessment.create({
        data: {
          slug: def.slug,
          title: def.title,
          description: def.description,
          type: def.type,
          passingScore: def.passingScore ?? 70,
          timeLimitMinutes: def.timeLimitMinutes,
          skillTags: def.skillTags ?? skillTagsFor(def.questions),
        },
      }),
    );

    const questionIds: string[] = [];
    for (let index = 0; index < def.questions.length; index++) {
      const question = def.questions[index];
      const created = await withRetry(() =>
        prisma.question.create({
          data: {
            prompt: question.prompt,
            explanation: question.explanation,
            type: question.type ?? "SINGLE_CHOICE",
            difficulty: question.difficulty ?? "INTERMEDIATE",
            skillTags: question.skillTags ?? [],
            points: question.points ?? 1,
            codeSnippet: question.codeSnippet,
            order: index,
            options: {
              create: question.options.map((option, optionIndex) => ({
                text: option[0],
                isCorrect: option[1] ?? false,
                order: optionIndex,
              })),
            },
          },
        }),
      );
      questionIds.push(created.id);
    }

    await withRetry(() =>
      prisma.assessmentQuestion.createMany({
        data: questionIds.map((questionId, index) => ({
          assessmentId: assessment.id,
          questionId,
          order: index,
        })),
        skipDuplicates: true,
      }),
    );
  }
}

async function upsertUser(params: {
  email: string;
  name: string;
  password: string;
  role: "ADMIN" | "LEARNER";
}) {
  const passwordHash = await bcrypt.hash(params.password, 12);
  return withRetry(() =>
    prisma.user.upsert({
      where: { email: params.email },
      update: { name: params.name, passwordHash, role: params.role },
      create: {
        email: params.email,
        name: params.name,
        passwordHash,
        role: params.role,
        profile: { create: {} },
      },
    }),
  );
}

async function seedDemoProgress(demoUserId: string, backend: PathRef) {
  const target = PATHS.find((p) => p.slug === "backend-python");
  const profileData = {
    targetCareerPathId: backend.id,
    targetRole: target?.roles[0]?.title,
    skillLevel: "BEGINNER" as const,
    weeklyHours: 8,
    targetWeeks: 24,
    preferReading: true,
    preferPractice: true,
    onboardingCompletedAt: new Date(),
  };
  await withRetry(() =>
    prisma.profile.upsert({
      where: { userId: demoUserId },
      update: profileData,
      create: { userId: demoUserId, ...profileData },
    }),
  );

  // Mark the first two chapters complete and the third in progress.
  const ordered = backend.chapters.slice(0, 3);
  for (let index = 0; index < ordered.length; index++) {
    const chapter = ordered[index];
    const completed = index < 2;
    await withRetry(() =>
      prisma.chapterProgress.create({
        data: {
          userId: demoUserId,
          chapterId: chapter.id,
          status: completed ? "COMPLETED" : "IN_PROGRESS",
          completedAt: completed ? new Date() : null,
        },
      }),
    );
  }
}

async function main() {
  console.log("Seeding SkillWeave catalogue…");
  await resetCurriculum();

  const resourceIdByKey = await seedResources();
  console.log(`  resources: ${resourceIdByKey.size}`);

  const pathRefs: PathRef[] = [];
  for (const pathDef of PATHS) {
    const ref = await seedPath(pathDef, resourceIdByKey);
    pathRefs.push(ref);
    console.log(`  path: ${pathDef.slug} (${ref.modules.length} modules)`);
  }

  await seedStandaloneAssessments();
  console.log(`  standalone assessments: ${STANDALONE_ASSESSMENTS.length}`);

  await upsertUser({
    email: ADMIN_EMAIL,
    name: "SkillWeave Admin",
    password: ADMIN_PASSWORD,
    role: "ADMIN",
  });

  const demo = await upsertUser({
    email: DEMO_EMAIL,
    name: "Demo Learner",
    password: DEMO_PASSWORD,
    role: "LEARNER",
  });

  const backend = pathRefs.find((p) => p.slug === "backend-python") ?? pathRefs[0];
  if (backend) await seedDemoProgress(demo.id, backend);

  const counts = {
    paths: await prisma.careerPath.count(),
    phases: await prisma.phase.count(),
    modules: await prisma.module.count(),
    chapters: await prisma.chapter.count(),
    resources: await prisma.resource.count(),
    assessments: await prisma.assessment.count(),
    questions: await prisma.question.count(),
    projects: await prisma.project.count(),
  };
  console.log("Done:", counts);
  console.log(
    `Admin login: ${ADMIN_EMAIL} / ${ADMIN_PASSWORD}\nDemo login:  ${DEMO_EMAIL} / ${DEMO_PASSWORD}`,
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
