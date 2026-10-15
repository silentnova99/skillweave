import type { Metadata } from "next";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export const metadata: Metadata = { title: "Admin overview" };

export default async function AdminOverviewPage() {
  const [
    users,
    paths,
    modules,
    chapters,
    resources,
    verified,
    unverified,
    broken,
    projects,
    assessments,
    questions,
    openReports,
    recentAudit,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.careerPath.count(),
    prisma.module.count(),
    prisma.chapter.count(),
    prisma.resource.count(),
    prisma.resource.count({ where: { status: "VERIFIED" } }),
    prisma.resource.count({ where: { status: "UNVERIFIED" } }),
    prisma.resource.count({ where: { status: { in: ["BROKEN", "DEPRECATED"] } } }),
    prisma.project.count(),
    prisma.assessment.count(),
    prisma.question.count(),
    prisma.resourceReport.count({ where: { status: "OPEN" } }),
    prisma.adminAuditLog.findMany({
      orderBy: { createdAt: "desc" },
      take: 10,
      include: { actor: { select: { email: true } } },
    }),
  ]);

  const stats = [
    { label: "Learners & admins", value: users },
    { label: "Career paths", value: paths },
    { label: "Modules", value: modules },
    { label: "Chapters", value: chapters },
    { label: "Resources", value: resources },
    { label: "Projects", value: projects },
    { label: "Assessments", value: assessments },
    { label: "Questions", value: questions },
  ];

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <Card key={stat.label}>
            <CardContent className="p-4">
              <p className="text-2xl font-semibold text-[var(--color-fg)]">{stat.value}</p>
              <p className="text-sm text-[var(--color-fg-muted)]">{stat.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Curation status</CardTitle>
            <CardDescription>Resource verification at a glance.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex items-center justify-between">
              <span>Verified</span>
              <Badge tone="success">{verified}</Badge>
            </div>
            <div className="flex items-center justify-between">
              <span>Unverified</span>
              <Badge tone="warning">{unverified}</Badge>
            </div>
            <div className="flex items-center justify-between">
              <span>Broken / deprecated</span>
              <Badge tone="danger">{broken}</Badge>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Open reports</CardTitle>
            <CardDescription>Learner-submitted issues awaiting review.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <p className="text-2xl font-semibold text-[var(--color-fg)]">{openReports}</p>
            <Link href="/admin/reports" className="text-[var(--color-brand)]">
              Review reports →
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Quick actions</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-2 text-sm">
            <Link href="/admin/resources" className="text-[var(--color-brand)]">
              Manage resources →
            </Link>
            <Link href="/admin/import" className="text-[var(--color-brand)]">
              Bulk import resources →
            </Link>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent admin activity</CardTitle>
          <CardDescription>Audit log of curation changes.</CardDescription>
        </CardHeader>
        <CardContent>
          {recentAudit.length === 0 ? (
            <p className="text-sm text-[var(--color-fg-muted)]">No admin activity yet.</p>
          ) : (
            <ul className="divide-y divide-[var(--color-border)] text-sm">
              {recentAudit.map((log) => (
                <li key={log.id} className="flex items-center justify-between gap-3 py-2">
                  <span className="text-[var(--color-fg)]">{log.summary}</span>
                  <span className="text-xs text-[var(--color-fg-subtle)]">
                    {log.actor?.email ?? "system"} ·{" "}
                    {new Date(log.createdAt).toLocaleString()}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
