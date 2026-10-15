import type { Metadata } from "next";
import Link from "next/link";
import { listPublishedPaths, pathCounts } from "@/lib/catalog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata: Metadata = {
  title: "Career paths",
  description:
    "Ordered, free roadmaps for in-demand tech careers. Each path is built from curated existing resources with practice and assessments.",
};

const LEVEL_LABEL: Record<string, string> = {
  ABSOLUTE_BEGINNER: "Absolute beginner",
  BEGINNER: "Beginner",
  INTERMEDIATE: "Intermediate",
  ADVANCED: "Advanced",
};

const CATEGORY_LABEL: Record<string, string> = {
  SOFTWARE_ENGINEERING: "Software Engineering",
  DATA_AND_AI: "Data & AI",
  CLOUD_AND_DEVOPS: "Cloud & DevOps",
  CYBERSECURITY: "Cybersecurity",
  PRODUCT_AND_DESIGN: "Product & Design",
  FOUNDATIONS: "Foundations",
  OTHER: "Professional Skills",
};

export default async function PathsPage() {
  const paths = await listPublishedPaths();

  return (
    <div>
      <section className="relative overflow-hidden bg-[var(--color-ink)] text-[var(--color-on-ink)]">
        <div aria-hidden className="absolute inset-x-0 top-0 h-px bg-brand-gradient" />
        <div
          aria-hidden
          className="pointer-events-none absolute -top-32 right-[-8%] h-[26rem] w-[26rem] rounded-full bg-[radial-gradient(circle,rgba(235,63,67,0.28),transparent_65%)] blur-3xl"
        />
        <div className="container-page relative py-16 sm:py-20">
          <p className="eyebrow text-[var(--color-brand-bright)]">
            Career paths
          </p>
          <h1 className="display-title mt-4 max-w-3xl text-3xl sm:text-5xl">
            Ordered roadmaps for in-demand tech careers
          </h1>
          <p className="mt-5 max-w-2xl text-base text-[var(--color-on-ink-muted)]">
            Every path is a sequence of phases and modules built from free,
            existing resources — with objectives, practice, assessments and
            projects.
          </p>
        </div>
      </section>

      <div className="container-page py-14">
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {paths.map((path) => {
            const counts = pathCounts(path);
            return (
              <Card
                key={path.id}
                className="card-lift flex flex-col hover:border-[var(--color-brand)]"
              >
                <CardHeader>
                  <CardTitle className="text-lg font-bold tracking-tight">
                    {path.title}
                  </CardTitle>
                  <CardDescription>{path.summary}</CardDescription>
                </CardHeader>
                <CardContent className="flex flex-1 flex-col justify-between gap-4">
                  <div className="flex flex-wrap gap-2 text-xs">
                    {path.featured ? <Badge tone="brand">Featured</Badge> : null}
                    {path.category ? (
                      <Badge tone="neutral">{CATEGORY_LABEL[path.category] ?? path.category}</Badge>
                    ) : null}
                    <Badge tone="brand">{LEVEL_LABEL[path.level] ?? path.level}</Badge>
                    <Badge tone="outline">{counts.phases} phases</Badge>
                    <Badge tone="outline">{counts.modules} modules</Badge>
                    <Badge tone="outline">{counts.chapters} chapters</Badge>
                  </div>
                  {path.roles.length > 0 ? (
                    <p className="text-sm text-[var(--color-fg-muted)]">
                      Roles: {path.roles.map((r) => r.title).join(", ")}
                    </p>
                  ) : null}
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-[var(--color-fg-subtle)]">
                      {path.estimatedHours ? `~${path.estimatedHours} h` : ""}
                    </span>
                    <Link href={`/paths/${path.slug}`}>
                      <Button variant="outline" size="sm">
                        View roadmap
                      </Button>
                    </Link>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
}
