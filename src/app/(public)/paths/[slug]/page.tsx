import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getPathBySlug } from "@/lib/catalog";
import { getSession } from "@/lib/session";
import { loadPathProgress } from "@/lib/progress";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";

const LEVEL_LABEL: Record<string, string> = {
  ABSOLUTE_BEGINNER: "Absolute beginner",
  BEGINNER: "Beginner",
  INTERMEDIATE: "Intermediate",
  ADVANCED: "Advanced",
};

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const path = await getPathBySlug(slug);
  if (!path) return { title: "Path not found" };
  return { title: path.title, description: path.summary };
}

export default async function PathDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const path = await getPathBySlug(slug);
  if (!path) notFound();

  const session = await getSession();
  const userId = session?.user?.id ?? null;
  const progress = userId ? await loadPathProgress(userId, slug) : null;
  const state = progress?.state;

  const totalChapters = path.phases.reduce(
    (sum, phase) => sum + phase.modules.reduce((m, mod) => m + mod.chapters.length, 0),
    0,
  );

  return (
    <div>
      <section className="relative overflow-hidden bg-[var(--color-ink)] text-[var(--color-on-ink)]">
        <div aria-hidden className="absolute inset-x-0 top-0 h-px bg-brand-gradient" />
        <div
          aria-hidden
          className="pointer-events-none absolute -top-32 left-[-8%] h-[26rem] w-[26rem] rounded-full bg-[radial-gradient(circle,rgba(71,58,146,0.35),transparent_65%)] blur-3xl"
        />
        <div className="container-page relative py-14 sm:py-16">
          <div className="max-w-3xl">
            <div className="flex flex-wrap items-center gap-2">
              <Badge tone="brand">{LEVEL_LABEL[path.level] ?? path.level}</Badge>
              {path.estimatedHours ? (
                <span className="rounded-full border border-white/20 px-3 py-0.5 text-xs font-medium text-[var(--color-on-ink-muted)]">
                  ~{path.estimatedHours} hours
                </span>
              ) : null}
              <span className="rounded-full border border-white/20 px-3 py-0.5 text-xs font-medium text-[var(--color-on-ink-muted)]">
                {totalChapters} chapters
              </span>
            </div>
            <h1 className="display-title mt-5 text-3xl sm:text-5xl">{path.title}</h1>
            <p className="mt-5 text-base text-[var(--color-on-ink-muted)]">
              {path.description}
            </p>

            <div className="mt-8 flex flex-wrap gap-3">
              {userId ? (
                state?.nextEligibleChapterId ? (
                  <Link
                    href={`/learn/${path.slug}/${
                      progress?.chapters.find((c) => c.id === state.nextEligibleChapterId)?.slug ?? ""
                    }`}
                  >
                    <Button variant="gradient">Continue learning</Button>
                  </Link>
                ) : (
                  <Link href="/dashboard">
                    <Button variant="gradient">Go to dashboard</Button>
                  </Link>
                )
              ) : (
                <Link href="/register">
                  <Button variant="gradient">Start this path</Button>
                </Link>
              )}
            </div>

            {state ? (
              <div className="mt-8 rounded-none border border-[var(--color-ink-border)] bg-[var(--color-ink-2)] p-5">
                <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
                  <span className="font-semibold tracking-tight text-[var(--color-on-ink)]">
                    Your progress
                  </span>
                  <span className="text-[var(--color-on-ink-muted)]">
                    {state.completedRequiredChapters}/{state.totalRequiredChapters} required chapters ·{" "}
                    {state.percentComplete}%
                  </span>
                </div>
                <Progress
                  value={state.completedRequiredChapters}
                  max={state.totalRequiredChapters || 1}
                  className="mt-3 bg-[var(--color-ink-3)]"
                  label="Your progress on this path"
                />
              </div>
            ) : null}
          </div>
        </div>
      </section>

      <div className="container-page py-14">

      {path.roles.length > 0 ? (
        <section className="mt-10">
          <h2 className="section-title text-2xl">Target roles</h2>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            {path.roles.map((role) => (
              <Card key={role.id}>
                <CardHeader>
                  <CardTitle>{role.title}</CardTitle>
                  <CardDescription>{role.description}</CardDescription>
                </CardHeader>
                {role.skills.length > 0 ? (
                  <CardContent>
                    <ul className="space-y-1 text-sm text-[var(--color-fg-muted)]">
                      {role.skills.map((skill) => (
                        <li key={skill.id} className="flex items-start gap-2">
                          <span aria-hidden className="mt-1 text-[var(--color-brand)]">
                            •
                          </span>
                          <span>
                            <span className="text-[var(--color-fg)]">{skill.name}</span>
                            {skill.required ? "" : " (nice to have)"}
                            {skill.detail ? ` — ${skill.detail}` : ""}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                ) : null}
              </Card>
            ))}
          </div>
        </section>
      ) : null}

      <section className="mt-10">
        <h2 className="section-title text-2xl">Roadmap</h2>
        <div className="mt-4 space-y-8">
          {path.phases.map((phase) => (
            <div key={phase.id}>
              <div className="flex flex-wrap items-baseline gap-3">
                <h3 className="text-lg font-bold tracking-tight text-[var(--color-fg)]">{phase.title}</h3>
                {phase.estimatedHours ? (
                  <span className="text-sm text-[var(--color-fg-subtle)]">
                    ~{phase.estimatedHours} h
                  </span>
                ) : null}
              </div>
              <p className="mt-1 text-sm text-[var(--color-fg-muted)]">{phase.summary}</p>

              <div className="mt-4 space-y-4">
                {phase.modules.map((mod) => {
                  const locked = state ? state.moduleUnlocked[mod.id] === false : false;
                  const complete = state ? state.moduleCompleted[mod.id] === true : false;
                  return (
                    <Card key={mod.id}>
                      <CardHeader>
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <CardTitle>{mod.title}</CardTitle>
                          <div className="flex items-center gap-2">
                            {complete ? <Badge tone="success">Complete</Badge> : null}
                            {locked ? <Badge tone="warning">Locked</Badge> : null}
                          </div>
                        </div>
                        <CardDescription>{mod.summary}</CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        {mod.prerequisites.length > 0 ? (
                          <p className="text-xs text-[var(--color-fg-muted)]">
                            Prerequisites:{" "}
                            {mod.prerequisites.map((p) => p.requiredModule.title).join(", ")}
                          </p>
                        ) : null}

                        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                          {mod.chapters.map((chapter) => {
                            const done = state?.chapterCompleted[chapter.id] ?? false;
                            const eligible = state ? state.chapterEligible[chapter.id] !== false : true;
                            const canOpen = Boolean(userId) && (eligible || done);
                            const card = (
                              <>
                                <div className="flex items-center justify-between gap-2">
                                  {done ? (
                                    <Badge tone="success">Done</Badge>
                                  ) : (
                                    <Badge tone="outline">Ch {chapter.order + 1}</Badge>
                                  )}
                                  <div className="flex items-center gap-1">
                                    {!eligible && !done ? <Badge tone="warning">Locked</Badge> : null}
                                    {chapter.isOptional ? <Badge tone="neutral">Optional</Badge> : null}
                                  </div>
                                </div>
                                <p className="mt-3 text-sm font-semibold tracking-tight text-[var(--color-fg)]">
                                  {chapter.title}
                                </p>
                                {chapter.summary ? (
                                  <p className="mt-1 line-clamp-3 text-xs text-[var(--color-fg-muted)]">
                                    {chapter.summary}
                                  </p>
                                ) : null}
                                <p className="mt-3 text-xs font-medium text-[var(--color-brand)]">
                                  {canOpen
                                    ? done
                                      ? "Review chapter"
                                      : "Open chapter"
                                    : "Complete earlier chapters first"}
                                </p>
                              </>
                            );
                            return canOpen ? (
                              <Link
                                key={chapter.id}
                                href={`/learn/${path.slug}/${chapter.slug}`}
                                className="flex flex-col rounded-none border border-[var(--color-border)] p-4 transition hover:border-[var(--color-brand)] hover:shadow-sm"
                              >
                                {card}
                              </Link>
                            ) : (
                              <div
                                key={chapter.id}
                                className="flex flex-col rounded-none border border-[var(--color-border)] p-4 opacity-70"
                              >
                                {card}
                              </div>
                            );
                          })}
                        </div>

                        {mod.assessments.length > 0 ? (
                          <div className="flex flex-wrap gap-2">
                            {mod.assessments.map((assessment) => {
                              const mockUnlocked = state ? complete : true;
                              return mockUnlocked ? (
                                <Link key={assessment.id} href={`/assessments/${assessment.id}`}>
                                  <Button variant="outline" size="sm">
                                    Module mock: {assessment.title}
                                  </Button>
                                </Link>
                              ) : (
                                <Badge key={assessment.id} tone="warning">
                                  Mock exam unlocks when the module is complete
                                </Badge>
                              );
                            })}
                          </div>
                        ) : null}
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </section>

      {path.projects.length > 0 ? (
        <section className="mt-10">
          <h2 className="section-title text-2xl">Portfolio projects</h2>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            {path.projects.map((project) => (
              <Card key={project.id}>
                <CardHeader>
                  <div className="flex items-center justify-between gap-2">
                    <CardTitle>{project.title}</CardTitle>
                    <Badge tone="neutral">{project.level.toLowerCase()}</Badge>
                  </div>
                  <CardDescription>{project.summary}</CardDescription>
                </CardHeader>
                <CardContent>
                  <Link href={`/projects/${project.slug}`}>
                    <Button variant="outline" size="sm">
                      View project
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>
      ) : null}
      </div>
    </div>
  );
}
