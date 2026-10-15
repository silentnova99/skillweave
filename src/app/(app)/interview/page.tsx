import type { Metadata } from "next";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";

export const metadata: Metadata = { title: "Interview preparation" };

export default async function InterviewPage() {
  const user = await requireUser();
  const pathId = user.profile?.targetCareerPathId ?? null;

  const [banks, roles] = await Promise.all([
    prisma.assessment.findMany({
      where: { moduleId: null, chapterId: null, type: { in: ["INTERVIEW_BANK", "MOCK_EXAM"] } },
      orderBy: { createdAt: "asc" },
    }),
    pathId
      ? prisma.jobRole.findMany({
          where: { careerPathId: pathId },
          orderBy: { order: "asc" },
          include: { skills: { orderBy: { order: "asc" } } },
        })
      : Promise.resolve([]),
  ]);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="display-title text-2xl">Interview preparation</h1>
        <p className="mt-1 text-sm text-[var(--color-fg-muted)]">
          Question banks, timed mocks and role checklists so you can practise before
          the real thing.
        </p>
      </div>

      <section className="space-y-4">
        <h2 className="section-title text-lg">Question banks &amp; mocks</h2>
        {banks.length === 0 ? (
          <EmptyState
            title="No interview material yet"
            description="Interview banks and mock exams will appear here once published."
          />
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {banks.map((bank) => (
              <Card key={bank.id}>
                <CardHeader>
                  <div className="flex items-start justify-between gap-3">
                    <CardTitle>{bank.title}</CardTitle>
                    <Badge tone="brand">
                      {bank.type === "MOCK_EXAM" ? "Timed mock" : "Question bank"}
                    </Badge>
                  </div>
                  <CardDescription>{bank.description}</CardDescription>
                </CardHeader>
                <CardContent className="flex items-center justify-between">
                  <span className="text-sm text-[var(--color-fg-muted)]">
                    Pass mark {bank.passingScore}%
                    {bank.timeLimitMinutes ? ` · ${bank.timeLimitMinutes} min` : ""}
                  </span>
                  <Link href={`/assessments/${bank.id}`}>
                    <Button variant="outline" size="sm">
                      Start
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </section>

      {roles.length > 0 ? (
        <section className="space-y-4">
          <h2 className="section-title text-lg">Role checklists</h2>
          <p className="text-sm text-[var(--color-fg-muted)]">
            The skills employers expect for your target roles. Use them as a
            self-check during interview prep.
          </p>
          <div className="grid gap-4 md:grid-cols-2">
            {roles.map((role) => (
              <Card key={role.id}>
                <CardHeader>
                  <CardTitle>{role.title}</CardTitle>
                  <CardDescription>{role.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2 text-sm">
                    {role.skills.map((skill) => (
                      <li key={skill.id} className="flex items-start gap-2">
                        <span aria-hidden className="mt-0.5">
                          {skill.required ? "▢" : "◻"}
                        </span>
                        <span>
                          <span className="text-[var(--color-fg)]">{skill.name}</span>
                          {skill.required ? (
                            <span className="ml-1 text-xs text-[var(--color-fg-subtle)]">required</span>
                          ) : (
                            <span className="ml-1 text-xs text-[var(--color-fg-subtle)]">nice to have</span>
                          )}
                          {skill.detail ? (
                            <span className="block text-[var(--color-fg-muted)]">{skill.detail}</span>
                          ) : null}
                        </span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}
