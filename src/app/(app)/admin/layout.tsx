import Link from "next/link";
import type { ReactNode } from "react";
import { requireAdmin } from "@/lib/session";
import { cn } from "@/lib/utils";

const TABS = [
  { href: "/admin", label: "Overview" },
  { href: "/admin/resources", label: "Resources" },
  { href: "/admin/reports", label: "Reports" },
  { href: "/admin/import", label: "Bulk import" },
];

export default async function AdminLayout({ children }: { children: ReactNode }) {
  await requireAdmin();

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="display-title text-2xl">Admin</h1>
          <p className="text-sm text-[var(--color-fg-muted)]">
            Curate resources, verify links and review learner reports.
          </p>
        </div>
      </div>

      <nav className="flex flex-wrap gap-2 border-b border-[var(--color-border)] pb-2">
        {TABS.map((tab) => (
          <Link
            key={tab.href}
            href={tab.href}
            className={cn(
              "rounded-none px-3 py-1.5 text-sm font-medium text-[var(--color-fg-muted)] hover:bg-[var(--color-surface-2)] hover:text-[var(--color-fg)]",
            )}
          >
            {tab.label}
          </Link>
        ))}
      </nav>

      {children}
    </div>
  );
}
