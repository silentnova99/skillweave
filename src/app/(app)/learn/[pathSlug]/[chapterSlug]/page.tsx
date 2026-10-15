import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { loadPathProgress } from "@/lib/progress";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ResourceCard, type ResourceCardData } from "@/components/resource-card";
import { ChapterNotes } from "@/components/chapter-notes";
import { CHAPTER_TEST_LOCKED_REASON } from "@/lib/gating";
import {
  markChapterCompleteAction,
  reopenChapterAction,
  toggleBookmarkAction,
} from "../../actions";

const ROLE_ORDER = [
  "PRIMARY",
  "ALTERNATIVE",
  "EXAMPLE",
  "EXERCISE",
  "ADVANCED_REFERENCE",
  "REVISION",
] as const;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ pathSlug: string; chapterSlug: string }>;
}): Promise<Metadata> {
  const { chapterSlug } = await params;
  const chapter = await prisma.chapter.findFirst({
    where: { slug: chapterSlug },
    select: { title: true },
  });
  return { title: chapter?.title ?? "Chapter" };
}

export default async function LearnChapterPage({
  params,
}: {
  params: Promise<{ pathSlug: string; chapterSlug: string }>;
}) {
  const { pathSlug, chapterSlug } = await params;
  const user = await requireUser();

  const progress = await loadPathProgress(user.id, pathSlug);
  if (!progress) notFound();

  const chapter = await prisma.chapter.findFirst({
    where: {
      slug: chapterSlug,
      module: { phase: { careerPath: { slug: pathSlug, published: true } } },
    },
    include: {
      module: {
        include: {
          phase: true,
          objectives: { orderBy: { order: "asc" } },
        },
      },
      objectives: { orderBy: { order: "asc" } },
      resources: { orderBy: { order: "asc" }, include: { resource: true } },
      assessments: { where: { type: "CHAPTER_QUIZ" }, select: { id: true, title: true, description: true } },
      notes: { where: { userId: user.id }, orderBy: { createdAt: "desc" } },
      bookmarks: { where: { userId: user.id } },
    },
  });
  if (!chapter) notFound();

  const completed = progress.state.chapterCompleted[chapter.id] === true;
  const eligible = progress.state.chapterEligible[chapter.id] === true;
  const contentComplete = progress.chapterContentComplete[chapter.id] === true;
  if (!eligible && !completed) {
    redirect(`/paths/${pathSlug}`);
  }

  const chapterResourceIds = chapter.resources.map((r) => r.id);
  const completions = chapterResourceIds.length
    ? await prisma.resourceCompletion.findMany({
        where: { userId: user.id, chapterResourceId: { in: chapterResourceIds } },
        select: { chapterResourceId: true },
      })
    : [];
  const completedResources = new Set(completions.map((c) => c.chapterResourceId));

  const orderedChapters = progress.chapters;
  const index = orderedChapters.findIndex((c) => c.id === chapter.id);
  const prev = index > 0 ? orderedChapters[index - 1] : null;
  const next = index >= 0 && index < orderedChapters.length - 1 ? orderedChapters[index + 1] : null;
  const nextUnlocked = next ? progress.state.chapterEligible[next.id] !== false : false;

  const isBookmarked = chapter.bookmarks.length > 0;

  const groupedResources = ROLE_ORDER.map((role) => ({
    role,
    items: chapter.resources.filter((r) => r.role === role),
  })).filter((group) => group.items.length > 0);

  const cardData = (cr: (typeof chapter.resources)[number]): ResourceCardData => ({
    chapterResourceId: cr.id,
    chapterId: chapter.id,
    pathSlug,
    chapterSlug,
    role: cr.role,
    chapterNote: cr.note,
    completed: completedResources.has(cr.id),
    resource: {
      id: cr.resource.id,
      title: cr.resource.title,
      url: cr.resource.url,
      publisher: cr.resource.publisher,
      author: cr.resource.author,
      type: cr.resource.type,
      provider: cr.resource.provider,
      videoKind: cr.resource.videoKind,
      difficulty: cr.resource.difficulty,
      estimatedMinutes: cr.resource.estimatedMinutes,
      isFree: cr.resource.isFree,
      accessNotes: cr.resource.accessNotes,
      license: cr.resource.license,
      licenseUrl: cr.resource.licenseUrl,
      status: cr.resource.status,
      verificationNote: cr.resource.verificationNote,
      lastVerifiedAt: cr.resource.lastVerifiedAt?.toISOString() ?? null,
    },
  });

  return (
    <div className="space-y-6">
      <nav className="text-sm text-[var(--color-fg-muted)]" aria-label="Breadcrumb">
        <Link href={`/paths/${pathSlug}`} className="hover:text-[var(--color-brand)]">
          {progress.pathTitle}
        </Link>
        <span className="mx-2">/</span>
        <span>{chapter.module.phase.title}</span>
        <span className="mx-2">/</span>
        <span>{chapter.module.title}</span>
      </nav>

      <header className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <Badge tone={completed ? "success" : "brand"}>
            {completed ? "Completed" : "In progress"}
          </Badge>
          {chapter.isOptional ? <Badge tone="neutral">Optional</Badge> : null}
          {chapter.estimatedMinutes ? (
            <Badge tone="outline">~{chapter.estimatedMinutes} min</Badge>
          ) : null}
        </div>
        <h1 className="display-title text-2xl">{chapter.title}</h1>
        <p className="text-[var(--color-fg-muted)]">{chapter.summary}</p>
        <p className="text-sm text-[var(--color-fg-muted)]">{chapter.intro}</p>

        <div className="flex flex-wrap items-center gap-2">
          <form action={completed ? reopenChapterAction : markChapterCompleteAction}>
            <input type="hidden" name="chapterId" value={chapter.id} />
            <input type="hidden" name="pathSlug" value={pathSlug} />
            <input type="hidden" name="chapterSlug" value={chapterSlug} />
            <Button type="submit" variant={completed ? "outline" : "primary"} size="sm">
              {completed ? "Mark as not complete" : "Mark chapter complete"}
            </Button>
          </form>
          <form action={toggleBookmarkAction}>
            <input type="hidden" name="chapterId" value={chapter.id} />
            <input type="hidden" name="pathSlug" value={pathSlug} />
            <input type="hidden" name="chapterSlug" value={chapterSlug} />
            <Button type="submit" variant="ghost" size="sm">
              {isBookmarked ? "Remove bookmark" : "Bookmark"}
            </Button>
          </form>
        </div>
      </header>

      {chapter.objectives.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>Learning objectives</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 text-sm">
              {chapter.objectives.map((objective) => (
                <li key={objective.id} className="flex items-start gap-2">
                  <span aria-hidden className="mt-1 text-[var(--color-brand)]">
                    ✓
                  </span>
                  <span>{objective.text}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      ) : null}

      {chapter.completionCriteria ? (
        <p className="text-sm text-[var(--color-fg-muted)]">
          <span className="font-medium text-[var(--color-fg)]">Completion criteria: </span>
          {chapter.completionCriteria}
        </p>
      ) : null}

      <section className="space-y-6">
        <h2 className="section-title text-lg">Study resources</h2>
        {chapter.resources.length === 0 ? (
          <p className="text-sm text-[var(--color-fg-muted)]">
            No resources mapped to this chapter yet.
          </p>
        ) : (
          groupedResources.map((group) => (
            <div key={group.role} className="space-y-3">
              <h3 className="text-sm font-semibold tracking-tight text-[var(--color-fg-subtle)]">
                {group.role.replace(/_/g, " ").toLowerCase()}
              </h3>
              <div className="space-y-3">
                {group.items.map((cr) => (
                  <ResourceCard key={cr.id} data={cardData(cr)} />
                ))}
              </div>
            </div>
          ))
        )}
      </section>

      {chapter.assessments.length > 0 ? (
        <section className="space-y-3">
          <h2 className="section-title text-lg">Check your understanding</h2>
          {contentComplete ? (
            chapter.assessments.map((assessment) => (
              <Card key={assessment.id}>
                <CardContent className="flex flex-wrap items-center justify-between gap-3 p-4">
                  <div>
                    <p className="font-medium text-[var(--color-fg)]">{assessment.title}</p>
                    <p className="text-sm text-[var(--color-fg-muted)]">{assessment.description}</p>
                  </div>
                  <Link href={`/assessments/${assessment.id}`}>
                    <Button size="sm">Take test</Button>
                  </Link>
                </CardContent>
              </Card>
            ))
          ) : (
            <Alert tone="info" title="Test locked">
              {CHAPTER_TEST_LOCKED_REASON}
            </Alert>
          )}
        </section>
      ) : null}

      <section className="space-y-3">
        <h2 className="section-title text-lg">Your notes</h2>
        <ChapterNotes
          chapterId={chapter.id}
          pathSlug={pathSlug}
          chapterSlug={chapterSlug}
          notes={chapter.notes.map((n) => ({
            id: n.id,
            body: n.body,
            createdAt: n.createdAt.toISOString(),
          }))}
        />
      </section>

      <nav className="flex items-center justify-between gap-3 border-t border-[var(--color-border)] pt-4">
        {prev ? (
          <Link href={`/learn/${pathSlug}/${prev.slug}`} className="min-w-0">
            <Button variant="outline" size="sm">
              ← {prev.title}
            </Button>
          </Link>
        ) : (
          <span />
        )}
        {next ? (
          nextUnlocked ? (
            <Link href={`/learn/${pathSlug}/${next.slug}`} className="min-w-0 text-right">
              <Button variant="outline" size="sm">
                {next.title} →
              </Button>
            </Link>
          ) : (
            <span className="text-sm text-[var(--color-fg-subtle)]">
              Next chapter locked
            </span>
          )
        ) : (
          <span />
        )}
      </nav>
    </div>
  );
}
