import type { Metadata } from "next";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { loadPathProgress } from "@/lib/progress";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { EmptyState } from "@/components/ui/empty-state";

export const metadata: Metadata = { title: "Progress" };

export default async function ProgressPage() {
  const user = await requireUser();
  const pathId = user.profile?.targetCareerPathId ?? null;

  const path = pathId
    ? await prisma.careerPath.findUnique({
        where: { id: pathId },
        select: { slug: true, title: true },
      })
    : null;

  if (!path) {
    return (
      <div className="space-y-6">
        <h1 className="display-title text-2xl">Progress</h1>
        <EmptyState
          title="No target path yet"
          description="Set a career path to track structured progress, skills and history."
          action={
            <Link href="/onboarding">
              <Button>Choose a path</Button>
            </Link>
          }
        />
      </div>
    );
  }

  const [progress, skills, attempts, bookmarks] = await Promise.all([
    loadPathProgress(user.id, path.slug),
    prisma.skillScore.findMany({ where: { userId: user.id }, orderBy: { score: "desc" } }),
    prisma.attempt.findMany({
      where: { userId: user.id, status: "GRADED" },
      orderBy: { submittedAt: "desc" },
      take: 15,
      include: { assessment: { select: { title: true } } },
    }),
    prisma.bookmark.findMany({
      where: { userId: user.id, chapterId: { not: null } },
      orderBy: { createdAt: "desc" },
      include: { chapter: { select: { title: true, slug: true, module: { select: { slug: true } } } } },
    }),
  ]);

  const state = progress?.state;
  const moduleGroups = new Map<string, { title: string; total: number; done: number }>();
  for (const chapter of progress?.chapters ?? []) {
    const group = moduleGroups.get(chapter.moduleId) ?? {
      title: chapter.moduleTitle,
      total: 0,
      done: 0,
    };
    if (!chapter.isOptional) {
      group.total += 1;
      if (state?.chapterCompleted[chapter.id]) group.done += 1;
    }
    moduleGroups.set(chapter.moduleId, group);
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="display-title text-2xl">Progress</h1>
        <p className="mt-1 text-sm text-[var(--color-fg-muted)]">
          Everything you have completed on {path.title}.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{path.title}</CardTitle>
          <CardDescription>
            {state?.completedRequiredChapters ?? 0} of {state?.totalRequiredChapters ?? 0} required
            chapters · {state?.percentComplete ?? 0}%
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Progress
            value={state?.completedRequiredChapters ?? 0}
            max={state?.totalRequiredChapters || 1}
            label="Overall progress"
          />
          <div className="grid gap-3 sm:grid-cols-2">
            {[...moduleGroups.values()].map((group) => (
              <div
                key={group.title}
                className="flex items-center justify-between rounded-none border border-[var(--color-border)] px-3 py-2 text-sm"
              >
                <span className="truncate text-[var(--color-fg)]">{group.title}</span>
                <Badge tone={group.done >= group.total && group.total > 0 ? "success" : "neutral"}>
                  {group.done}/{group.total}
                </Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Skill profile</CardTitle>
            <CardDescription>Mastery estimated from assessment evidence.</CardDescription>
          </CardHeader>
          <CardContent>
            {skills.length === 0 ? (
              <p className="text-sm text-[var(--color-fg-muted)]">
                No skill evidence yet. Assessments build this profile over time.
              </p>
            ) : (
              <ul className="space-y-3">
                {skills.map((skill) => (
                  <li key={skill.id}>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-[var(--color-fg)]">
                        {skill.skill.replace(/[-_]/g, " ")}
                      </span>
                      <span className="text-[var(--color-fg-muted)]">
                        {skill.score}% · {skill.evidenceCount} answers
                      </span>
                    </div>
                    <Progress value={skill.score} className="mt-1" label={skill.skill} />
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Bookmarks</CardTitle>
            <CardDescription>Chapters you saved for later.</CardDescription>
          </CardHeader>
          <CardContent>
            {bookmarks.length === 0 ? (
              <p className="text-sm text-[var(--color-fg-muted)]">No bookmarked chapters yet.</p>
            ) : (
              <ul className="space-y-2 text-sm">
                {bookmarks.map((bookmark) =>
                  bookmark.chapter ? (
                    <li key={bookmark.id}>
                      <Link
                        href={`/learn/${path.slug}/${bookmark.chapter.slug}`}
                        className="text-[var(--color-brand)] hover:underline"
                      >
                        {bookmark.chapter.title}
                      </Link>
                    </li>
                  ) : null,
                )}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Assessment history</CardTitle>
          <CardDescription>Your most recent graded attempts.</CardDescription>
        </CardHeader>
        <CardContent>
          {attempts.length === 0 ? (
            <p className="text-sm text-[var(--color-fg-muted)]">No attempts recorded yet.</p>
          ) : (
            <ul className="divide-y divide-[var(--color-border)]">
              {attempts.map((attempt) => (
                <li key={attempt.id} className="flex items-center justify-between gap-3 py-3 text-sm">
                  <span className="text-[var(--color-fg)]">{attempt.assessment.title}</span>
                  <div className="flex items-center gap-3">
                    <Badge tone={attempt.passed ? "success" : "warning"}>
                      {attempt.percent ?? 0}%
                    </Badge>
                    <Link
                      href={`/assessments/${attempt.assessmentId}/result/${attempt.id}`}
                      className="text-[var(--color-brand)] hover:underline"
                    >
                      Review
                    </Link>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
