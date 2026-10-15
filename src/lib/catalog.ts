import { prisma } from "@/lib/prisma";

export async function listPublishedPaths() {
  return prisma.careerPath.findMany({
    where: { published: true },
    orderBy: [{ order: "asc" }, { title: "asc" }],
    include: {
      roles: { orderBy: { order: "asc" } },
      phases: {
        orderBy: { order: "asc" },
        include: { modules: { select: { id: true, chapters: { select: { id: true } } } } },
      },
    },
  });
}

export type PublishedPath = Awaited<ReturnType<typeof listPublishedPaths>>[number];

export function pathCounts(path: PublishedPath) {
  const modules = path.phases.flatMap((phase) => phase.modules);
  const chapters = modules.flatMap((m) => m.chapters);
  return {
    phases: path.phases.length,
    modules: modules.length,
    chapters: chapters.length,
  };
}

export async function getPathBySlug(slug: string) {
  return prisma.careerPath.findFirst({
    where: { slug, published: true },
    include: {
      roles: { orderBy: { order: "asc" }, include: { skills: { orderBy: { order: "asc" } } } },
      phases: {
        orderBy: { order: "asc" },
        include: {
          modules: {
            orderBy: { order: "asc" },
            include: {
              chapters: {
                orderBy: { order: "asc" },
                include: {
                  objectives: { orderBy: { order: "asc" } },
                  resources: { include: { resource: true } },
                },
              },
              prerequisites: { include: { requiredModule: { select: { id: true, title: true } } } },
              objectives: { orderBy: { order: "asc" } },
              assessments: { where: { type: "MOCK_EXAM" }, select: { id: true, title: true } },
            },
          },
        },
      },
      projects: { orderBy: { order: "asc" } },
    },
  });
}

export type FullPath = NonNullable<Awaited<ReturnType<typeof getPathBySlug>>>;
