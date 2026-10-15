import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert } from "@/components/ui/alert";
import { ProjectSubmissionForm } from "../submission-form";
import type { SubmissionCheck } from "@/lib/submissions/types";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const project = await prisma.project.findUnique({ where: { slug }, select: { title: true } });
  return { title: project?.title ?? "Project" };
}

interface Milestone {
  title: string;
  detail: string;
}

interface RubricItem {
  criterion: string;
  weight: number;
  description: string;
}

export default async function ProjectDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const user = await requireUser();

  const project = await prisma.project.findUnique({
    where: { slug },
    include: {
      submissions: {
        where: { userId: user.id },
        orderBy: { updatedAt: "desc" },
        take: 1,
        include: {
          reviews: { orderBy: { runNumber: "desc" }, take: 5 },
        },
      },
    },
  });
  if (!project) notFound();

  const submission = project.submissions[0] ?? null;
  const milestones = (project.milestones as Milestone[] | null) ?? [];
  const rubric = (project.rubric as RubricItem[] | null) ?? [];

  return (
    <div className="space-y-6">
      <Link href="/projects" className="text-sm text-[var(--color-fg-muted)] hover:text-[var(--color-brand)]">
        ← All projects
      </Link>

      <div>
        <div className="flex flex-wrap items-center gap-2">
          <Badge tone="neutral">{project.level.toLowerCase()}</Badge>
          {submission ? (
            <Badge tone={submission.status === "PASSED" ? "success" : "brand"}>
              {submission.status.toLowerCase().replace(/_/g, " ")}
            </Badge>
          ) : null}
          {submission && submission.lastScore !== null ? (
            <Badge tone="outline">score {submission.lastScore}/100</Badge>
          ) : null}
        </div>
        <h1 className="display-title mt-2 text-2xl">{project.title}</h1>
        <p className="mt-1 text-[var(--color-fg-muted)]">{project.summary}</p>
      </div>

      {submission?.feedback ? (
        <Alert tone={submission.status === "PASSED" ? "success" : "warning"} title="Reviewer feedback">
          {submission.feedback}
        </Alert>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>Brief</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-[var(--color-fg-muted)]">
          <p>{project.description}</p>
          <div>
            <p className="font-medium text-[var(--color-fg)]">Requirements</p>
            <p className="whitespace-pre-wrap">{project.requirements}</p>
          </div>
          {project.prerequisitesText ? (
            <p className="text-[var(--color-fg-subtle)]">Prerequisites: {project.prerequisitesText}</p>
          ) : null}
        </CardContent>
      </Card>

      {project.objectives.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>Objectives</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="list-disc space-y-1 pl-5 text-sm">
              {project.objectives.map((objective) => (
                <li key={objective}>{objective}</li>
              ))}
            </ul>
          </CardContent>
        </Card>
      ) : null}

      {milestones.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>Milestones</CardTitle>
          </CardHeader>
          <CardContent>
            <ol className="space-y-3">
              {milestones.map((milestone, index) => (
                <li key={index} className="flex gap-3">
                  <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-[var(--color-brand-soft)] text-xs font-semibold text-[var(--color-brand)]">
                    {index + 1}
                  </span>
                  <div>
                    <p className="text-sm font-medium text-[var(--color-fg)]">{milestone.title}</p>
                    <p className="text-sm text-[var(--color-fg-muted)]">{milestone.detail}</p>
                  </div>
                </li>
              ))}
            </ol>
          </CardContent>
        </Card>
      ) : null}

      <div className="grid gap-5 md:grid-cols-2">
        {project.acceptanceCriteria.length > 0 ? (
          <Card>
            <CardHeader>
              <CardTitle>Acceptance criteria</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="list-disc space-y-1 pl-5 text-sm">
                {project.acceptanceCriteria.map((criterion) => (
                  <li key={criterion}>{criterion}</li>
                ))}
              </ul>
            </CardContent>
          </Card>
        ) : null}

        {project.starterResources.length > 0 ? (
          <Card>
            <CardHeader>
              <CardTitle>Starter resources</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-1 text-sm">
                {project.starterResources.map((url) => (
                  <li key={url}>
                    <a
                      href={url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[var(--color-brand)] hover:underline"
                    >
                      {url.replace(/^https?:\/\//, "")}
                    </a>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        ) : null}
      </div>

      {rubric.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>Grading rubric</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="divide-y divide-[var(--color-border)]">
              {rubric.map((item) => (
                <li key={item.criterion} className="flex items-start justify-between gap-4 py-3 text-sm">
                  <div>
                    <p className="font-medium text-[var(--color-fg)]">{item.criterion}</p>
                    <p className="text-[var(--color-fg-muted)]">{item.description}</p>
                  </div>
                  <Badge tone="outline">{item.weight}%</Badge>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      ) : null}

      {project.hints.length > 0 ? (
        <details className="rounded-none border border-[var(--color-border)] bg-white p-4">
          <summary className="cursor-pointer text-sm font-medium text-[var(--color-fg)]">
            Hints (open only if stuck)
          </summary>
          <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-[var(--color-fg-muted)]">
            {project.hints.map((hint) => (
              <li key={hint}>{hint}</li>
            ))}
          </ul>
        </details>
      ) : null}

      {project.extensions.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>Extensions</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="list-disc space-y-1 pl-5 text-sm text-[var(--color-fg-muted)]">
              {project.extensions.map((extension) => (
                <li key={extension}>{extension}</li>
              ))}
            </ul>
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>Submit your work</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-[var(--color-fg-muted)]">{project.submissionInstructions}</p>
          <ProjectSubmissionForm
            projectSlug={project.slug}
            existing={
              submission
                ? {
                    id: submission.id,
                    kind: submission.kind,
                    language: submission.language,
                    fileCount: submission.fileCount,
                    totalBytes: submission.totalBytes,
                    reviewCount: submission.reviewCount,
                    repoUrl: submission.repoUrl,
                    liveUrl: submission.liveUrl,
                    notes: submission.notes,
                    status: submission.status,
                    submittedAt: submission.submittedAt?.toISOString() ?? null,
                    reviews: submission.reviews.map((run) => ({
                      runNumber: run.runNumber,
                      status: run.status,
                      score: run.score,
                      summary: run.summary,
                      checks: (run.checks as unknown as SubmissionCheck[]) ?? [],
                      environment: run.environment,
                      nextActivity: run.nextActivity,
                      createdAt: run.createdAt.toISOString(),
                    })),
                  }
                : null
            }
          />
        </CardContent>
      </Card>
    </div>
  );
}
