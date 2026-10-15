import type { Metadata } from "next";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { loadPathProgress, getRecommendationsForPath } from "@/lib/progress";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Alert } from "@/components/ui/alert";
import { EmptyState } from "@/components/ui/empty-state";

export const metadata: Metadata = { title: "Dashboard" };

const KIND_TONE: Record<string, "brand" | "warning" | "success" | "neutral" | "danger"> = {
  REVISION: "warning",
  ASSESSMENT: "brand",
  NEXT_CHAPTER: "brand",
  PROJECT: "success",
  INTERVIEW: "success",
  DIAGNOSTIC: "neutral",
  BLOCKED: "danger",
};

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ diagnostic?: string }>;
}) {
  const sp = await searchParams;
  const user = await requireUser();
  const profile = user.profile;

  const skills = await prisma.skillScore.findMany({
    where: { userId: user.id },
    orderBy: { score: "asc" },
    take: 6,
  });

  if (!profile?.targetCareerPathId) {
    return (
      <div className="space-y-6">
        <h1 className="display-title text-2xl">Welcome, {user.name ?? "learner"}</h1>
        <EmptyState
          title="Choose a career path to begin"
          description="Pick a target path and SkillWeave will build your ordered roadmap, assessments and projects."
          action={
            <Link href="/onboarding">
              <Button>Set up your goal</Button>
            </Link>
          }
        />
      </div>
    );
  }

  const targetPath = await prisma.careerPath.findUnique({
    where: { id: profile.targetCareerPathId },
    select: { slug: true, title: true, estimatedHours: true },
  });

  if (!targetPath) {
    return (
      <EmptyState
        title="Career path unavailable"
        description="Your selected path is no longer published. Please choose another."
        action={
          <Link href="/paths">
            <Button>Browse paths</Button>
          </Link>
        }
      />
    );
  }

  const [progress, recommendations] = await Promise.all([
    loadPathProgress(user.id, targetPath.slug),
    getRecommendationsForPath(user.id, targetPath.slug),
  ]);

  const state = progress?.state;
  const completed = state?.completedRequiredChapters ?? 0;
  const total = state?.totalRequiredChapters ?? 0;

  return (
    <div className="space-y-6">
      {sp.diagnostic === "done" ? (
        <Alert tone="success" title="Diagnostic complete">
          Your baseline has been recorded. Recommendations now reflect your
          starting level.
        </Alert>
      ) : null}

      <section className="relative overflow-hidden bg-[var(--color-ink)] px-6 py-8 text-[var(--color-on-ink)] sm:px-8">
        <div aria-hidden className="absolute inset-x-0 top-0 h-px bg-brand-gradient" />
        <div
          aria-hidden
          className="pointer-events-none absolute -top-24 right-[-6%] -z-10 h-[22rem] w-[22rem] rounded-full bg-[radial-gradient(circle,rgba(235,63,67,0.30),transparent_65%)] blur-3xl"
        />
        <p className="eyebrow text-[var(--color-brand-bright)]">Your cockpit</p>
        <h1 className="display-title mt-3 text-2xl sm:text-3xl">
          Welcome back, {user.name ?? "learner"}
        </h1>
        <p className="mt-2 text-sm text-[var(--color-on-ink-muted)]">
          {profile.targetRole ? `${profile.targetRole} · ` : ""}
          {targetPath.title}
        </p>
        <div className="mt-6 flex flex-wrap gap-2">
          <span className="rounded-full border border-white/20 px-3 py-1 text-xs font-semibold uppercase tracking-[0.1em] text-[var(--color-on-ink)]">
            {profile.weeklyHours} h/week
          </span>
          {profile.targetWeeks ? (
            <span className="rounded-full border border-white/20 px-3 py-1 text-xs font-semibold uppercase tracking-[0.1em] text-[var(--color-on-ink)]">
              {profile.targetWeeks}-week target
            </span>
          ) : null}
          <span className="rounded-full border border-white/20 px-3 py-1 text-xs font-semibold uppercase tracking-[0.1em] text-[var(--color-on-ink)]">
            {completed}/{total} chapters
          </span>
          <span className="rounded-full bg-[var(--color-brand)] px-3 py-1 text-xs font-semibold uppercase tracking-[0.1em] text-white">
            {state?.percentComplete ?? 0}% complete
          </span>
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-base font-bold tracking-tight">
                Your next steps
              </CardTitle>
              <CardDescription>
                Ordered by the curriculum rules — not by guesswork.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {recommendations.length === 0 ? (
                <p className="text-sm text-[var(--color-fg-muted)]">
                  Nothing actionable right now. Explore your roadmap to plan ahead.
                </p>
              ) : (
                <ul className="space-y-3">
                  {recommendations.slice(0, 6).map((rec, index) => (
                    <li
                      key={`${rec.kind}-${index}`}
                      className="flex flex-col gap-2 rounded-none border border-[var(--color-border)] p-4 sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <Badge tone={KIND_TONE[rec.kind] ?? "neutral"}>
                            {rec.kind.replace(/_/g, " ").toLowerCase()}
                          </Badge>
                          <p className="font-medium text-[var(--color-fg)]">{rec.title}</p>
                        </div>
                        <p className="mt-1 text-sm text-[var(--color-fg-muted)]">
                          {rec.rationale}
                        </p>
                      </div>
                      {rec.href ? (
                        <Link href={rec.href} className="shrink-0">
                          <Button variant="outline" size="sm">
                            Open
                          </Button>
                        </Link>
                      ) : null}
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>{targetPath.title}</CardTitle>
              <CardDescription>
                {completed} of {total} required chapters complete
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Progress value={completed} max={total || 1} label="Path progress" />
              <p className="text-sm text-[var(--color-fg-muted)]">
                {state?.percentComplete ?? 0}% complete
              </p>
              <div className="flex flex-wrap gap-2">
                <Link href={`/paths/${targetPath.slug}`}>
                  <Button variant="outline" size="sm">
                    View roadmap
                  </Button>
                </Link>
                {state?.nextEligibleChapterId ? (
                  <Link
                    href={`/learn/${targetPath.slug}/${
                      progress?.chapters.find((c) => c.id === state.nextEligibleChapterId)?.slug ?? ""
                    }`}
                  >
                    <Button size="sm">Continue learning</Button>
                  </Link>
                ) : null}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base font-bold tracking-tight">
                Skill profile
              </CardTitle>
              <CardDescription>Mastery built from assessment evidence.</CardDescription>
            </CardHeader>
            <CardContent>
              {skills.length === 0 ? (
                <p className="text-sm text-[var(--color-fg-muted)]">
                  No skill evidence yet. Take an assessment to build your profile.
                </p>
              ) : (
                <ul className="space-y-3">
                  {skills.map((skill) => (
                    <li key={skill.id}>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-[var(--color-fg)]">
                          {skill.skill.replace(/[-_]/g, " ")}
                        </span>
                        <span className="text-[var(--color-fg-muted)]">{skill.score}%</span>
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
              <CardTitle className="text-base font-bold tracking-tight">
                Quick links
              </CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-2 text-sm">
              <Link href="/assessments" className="text-[var(--color-brand)]">
                Assessments &amp; practice →
              </Link>
              <Link href="/projects" className="text-[var(--color-brand)]">
                Portfolio projects →
              </Link>
              <Link href="/interview" className="text-[var(--color-brand)]">
                Interview preparation →
              </Link>
              <Link href="/progress" className="text-[var(--color-brand)]">
                Full progress &amp; skills →
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
