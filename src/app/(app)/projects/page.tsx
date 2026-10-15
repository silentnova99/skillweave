import type { Metadata } from "next";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";

export const metadata: Metadata = { title: "Projects" };

const STATUS_TONE: Record<string, "neutral" | "brand" | "success" | "warning"> = {
  DRAFT: "neutral",
  SUBMITTED: "brand",
  PASSED: "success",
  NEEDS_WORK: "warning",
};

export default async function ProjectsPage() {
  const user = await requireUser();
  const pathId = user.profile?.targetCareerPathId ?? null;

  const projects = await prisma.project.findMany({
    where: pathId
      ? { OR: [{ careerPathId: pathId }, { careerPathId: null }] }
      : {},
    orderBy: { order: "asc" },
    include: {
      submissions: { where: { userId: user.id }, select: { status: true } },
    },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="display-title text-2xl">Portfolio projects</h1>
        <p className="mt-1 text-sm text-[var(--color-fg-muted)]">
          Build real artifacts to turn knowledge into evidence. Submit a repo and a
          live demo when you are ready.
        </p>
      </div>

      {projects.length === 0 ? (
        <EmptyState
          title="No projects yet"
          description="Choose a career path to unlock its project briefs."
          action={
            <Link href="/onboarding">
              <Button>Choose a path</Button>
            </Link>
          }
        />
      ) : (
        <div className="grid gap-5 md:grid-cols-2">
          {projects.map((project) => {
            const status = project.submissions[0]?.status;
            return (
              <Card key={project.id} className="flex flex-col">
                <CardHeader>
                  <div className="flex items-start justify-between gap-3">
                    <CardTitle>{project.title}</CardTitle>
                    <div className="flex flex-col items-end gap-1">
                      <Badge tone="neutral">{project.level.toLowerCase()}</Badge>
                      {status ? (
                        <Badge tone={STATUS_TONE[status] ?? "neutral"}>
                          {status.toLowerCase().replace(/_/g, " ")}
                        </Badge>
                      ) : null}
                    </div>
                  </div>
                  <CardDescription>{project.summary}</CardDescription>
                </CardHeader>
                <CardContent className="mt-auto flex items-center justify-between">
                  <span className="text-xs text-[var(--color-fg-subtle)]">
                    {project.objectives.length} objectives
                  </span>
                  <Link href={`/projects/${project.slug}`}>
                    <Button variant="outline" size="sm">
                      Open brief
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
