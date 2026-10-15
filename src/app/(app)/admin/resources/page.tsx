import type { Metadata } from "next";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { setResourceStatusAction } from "../actions";

export const metadata: Metadata = { title: "Admin · Resources" };

const STATUS_TONE: Record<string, "success" | "warning" | "danger" | "neutral"> = {
  VERIFIED: "success",
  UNVERIFIED: "warning",
  BROKEN: "danger",
  DEPRECATED: "neutral",
};

const FILTERS = ["ALL", "UNVERIFIED", "VERIFIED", "BROKEN", "DEPRECATED"] as const;
type StatusFilter = (typeof FILTERS)[number];

export default async function AdminResourcesPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; q?: string }>;
}) {
  const sp = await searchParams;
  const requested = (sp.status ?? "ALL") as StatusFilter;
  const status: StatusFilter = FILTERS.includes(requested) ? requested : "ALL";
  const q = (sp.q ?? "").trim();

  const resources = await prisma.resource.findMany({
    where: {
      ...(status === "ALL" ? {} : { status }),
      ...(q
        ? {
            OR: [
              { title: { contains: q, mode: "insensitive" } },
              { publisher: { contains: q, mode: "insensitive" } },
            ],
          }
        : {}),
    },
    orderBy: [{ status: "asc" }, { title: "asc" }],
    take: 50,
    select: {
      id: true,
      title: true,
      url: true,
      publisher: true,
      type: true,
      status: true,
      lastVerifiedAt: true,
      verificationNote: true,
    },
  });

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <form className="flex items-center gap-2" action="/admin/resources">
          <Input
            name="q"
            defaultValue={q}
            placeholder="Search title or publisher"
            className="w-64"
          />
          <input type="hidden" name="status" value={status} />
          <Button type="submit" variant="outline" size="sm">
            Search
          </Button>
        </form>
        <div className="flex flex-wrap gap-2">
          {FILTERS.map((filter) => (
            <Link
              key={filter}
              href={`/admin/resources?status=${filter}${q ? `&q=${encodeURIComponent(q)}` : ""}`}
            >
              <Badge tone={status === filter ? "brand" : "outline"}>
                {filter.toLowerCase()}
              </Badge>
            </Link>
          ))}
        </div>
      </div>

      <p className="text-sm text-[var(--color-fg-muted)]">
        Showing {resources.length} resource{resources.length === 1 ? "" : "s"}.
      </p>

      <div className="space-y-3">
        {resources.map((resource) => (
          <Card key={resource.id}>
            <CardContent className="space-y-3 p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <a
                    href={resource.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-medium text-[var(--color-brand)] hover:underline"
                  >
                    {resource.title}
                  </a>
                  <p className="text-xs text-[var(--color-fg-muted)]">
                    {resource.publisher} · {resource.type.toLowerCase().replace(/_/g, " ")}
                    {resource.lastVerifiedAt
                      ? ` · verified ${new Date(resource.lastVerifiedAt).toLocaleDateString()}`
                      : ""}
                  </p>
                  {resource.verificationNote ? (
                    <p className="mt-1 text-xs text-[var(--color-fg-subtle)]">
                      {resource.verificationNote}
                    </p>
                  ) : null}
                </div>
                <Badge tone={STATUS_TONE[resource.status] ?? "neutral"}>
                  {resource.status.toLowerCase()}
                </Badge>
              </div>

              <form
                action={setResourceStatusAction}
                className="flex flex-wrap items-center gap-2"
              >
                <input type="hidden" name="resourceId" value={resource.id} />
                <Select name="status" defaultValue={resource.status} className="w-40" aria-label="Status">
                  <option value="VERIFIED">Verified</option>
                  <option value="UNVERIFIED">Unverified</option>
                  <option value="BROKEN">Broken</option>
                  <option value="DEPRECATED">Deprecated</option>
                </Select>
                <Input
                  name="note"
                  placeholder="Verification note (optional)"
                  defaultValue={resource.verificationNote ?? ""}
                  className="w-72"
                />
                <Button type="submit" size="sm">
                  Save
                </Button>
              </form>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
