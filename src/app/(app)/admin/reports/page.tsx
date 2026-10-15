import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { resolveReportAction } from "../actions";

export const metadata: Metadata = { title: "Admin · Reports" };

const KIND_LABEL: Record<string, string> = {
  BROKEN_LINK: "Broken link",
  INCORRECT_MAPPING: "Incorrect mapping",
  ACCESS_CHANGED: "Access changed",
  OTHER: "Other",
};

export default async function AdminReportsPage() {
  const [open, closed] = await Promise.all([
    prisma.resourceReport.findMany({
      where: { status: "OPEN" },
      orderBy: { createdAt: "asc" },
      include: {
        resource: { select: { title: true, url: true } },
        chapter: { select: { title: true } },
        user: { select: { email: true } },
      },
    }),
    prisma.resourceReport.findMany({
      where: { status: { in: ["RESOLVED", "DISMISSED"] } },
      orderBy: { resolvedAt: "desc" },
      take: 15,
      include: { resource: { select: { title: true } }, resolvedBy: { select: { email: true } } },
    }),
  ]);

  return (
    <div className="space-y-6">
      <section className="space-y-3">
        <h2 className="section-title text-lg">
          Open reports ({open.length})
        </h2>
        {open.length === 0 ? (
          <p className="text-sm text-[var(--color-fg-muted)]">No open reports. Nice.</p>
        ) : (
          open.map((report) => (
            <Card key={report.id}>
              <CardContent className="space-y-3 p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <Badge tone="warning">{KIND_LABEL[report.kind] ?? report.kind}</Badge>
                      <span className="text-sm text-[var(--color-fg-muted)]">
                        {report.user?.email ?? "anonymous"} ·{" "}
                        {new Date(report.createdAt).toLocaleString()}
                      </span>
                    </div>
                    <p className="mt-1 text-sm text-[var(--color-fg)]">{report.message}</p>
                    <p className="text-xs text-[var(--color-fg-subtle)]">
                      {report.resource ? `Resource: ${report.resource.title}` : ""}
                      {report.chapter ? ` · Chapter: ${report.chapter.title}` : ""}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <form action={resolveReportAction}>
                      <input type="hidden" name="reportId" value={report.id} />
                      <input type="hidden" name="status" value="RESOLVED" />
                      <Button variant="outline" size="sm" type="submit">
                        Resolve
                      </Button>
                    </form>
                    <form action={resolveReportAction}>
                      <input type="hidden" name="reportId" value={report.id} />
                      <input type="hidden" name="status" value="DISMISSED" />
                      <Button variant="ghost" size="sm" type="submit">
                        Dismiss
                      </Button>
                    </form>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </section>

      <section className="space-y-3">
        <h2 className="section-title text-lg">Recently closed</h2>
        {closed.length === 0 ? (
          <p className="text-sm text-[var(--color-fg-muted)]">Nothing closed yet.</p>
        ) : (
          <ul className="divide-y divide-[var(--color-border)] rounded-none border border-[var(--color-border)] bg-white text-sm">
            {closed.map((report) => (
              <li key={report.id} className="flex items-center justify-between gap-3 px-4 py-3">
                <span className="text-[var(--color-fg)]">
                  {report.resource?.title ?? "—"} · {KIND_LABEL[report.kind] ?? report.kind}
                </span>
                <span className="text-xs text-[var(--color-fg-subtle)]">
                  {report.status.toLowerCase()} by {report.resolvedBy?.email ?? "—"}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
