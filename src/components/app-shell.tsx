"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Wordmark } from "@/components/wordmark";
import { logoutAction } from "@/app/(auth)/actions";

interface NavItem {
  href: string;
  label: string;
  adminOnly?: boolean;
}

const NAV: NavItem[] = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/paths", label: "Career paths" },
  { href: "/assessments", label: "Assessments" },
  { href: "/projects", label: "Projects" },
  { href: "/interview", label: "Interview prep" },
  { href: "/progress", label: "Progress" },
  { href: "/admin", label: "Admin", adminOnly: true },
];

export function AppShell({
  children,
  user,
}: {
  children: ReactNode;
  user: { name: string | null; email: string; isAdmin: boolean };
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  const items = NAV.filter((item) => !item.adminOnly || user.isAdmin);

  const isActive = (href: string) =>
    pathname === href || pathname.startsWith(`${href}/`);

  const links = (
    <nav aria-label="Application" className="flex flex-col gap-1">
      {items.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          onClick={() => setOpen(false)}
          aria-current={isActive(item.href) ? "page" : undefined}
          className={cn(
            "rounded-none border-l-2 px-3 py-2 text-sm font-semibold tracking-wide transition-colors",
            isActive(item.href)
              ? "border-[var(--color-brand)] bg-[var(--color-brand-soft)] text-[var(--color-brand)]"
              : "border-transparent text-[var(--color-fg-muted)] hover:bg-[var(--color-surface-2)] hover:text-[var(--color-fg)]",
          )}
        >
          {item.label}
        </Link>
      ))}
    </nav>
  );

  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-30 bg-[var(--color-ink)]">
        <div className="container-page flex h-16 items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button
              type="button"
              className="grid h-9 w-9 place-items-center rounded-none border border-[var(--color-ink-border)] text-[var(--color-on-ink)] transition-colors hover:bg-[var(--color-ink-2)] md:hidden"
              aria-label={open ? "Close navigation" : "Open navigation"}
              aria-expanded={open}
              onClick={() => setOpen((v) => !v)}
            >
              <span aria-hidden className="block text-lg leading-none">
                {open ? "×" : "≡"}
              </span>
            </button>
            <Link href="/dashboard" aria-label="SkillWeave dashboard">
              <Wordmark onDark />
            </Link>
          </div>

          <div className="flex items-center gap-3">
            <span className="hidden text-sm text-[var(--color-on-ink-muted)] sm:inline">
              {user.name ?? user.email}
            </span>
            <form action={logoutAction}>
              <Button variant="outlineLight" size="sm" type="submit">
                Sign out
              </Button>
            </form>
          </div>
        </div>

        {open ? (
          <div className="border-t border-[var(--color-ink-border)] bg-[var(--color-ink-2)] p-3 md:hidden">
            {links}
          </div>
        ) : null}
      </header>

      <div className="container-page flex flex-1 gap-8 py-8">
        <aside className="hidden w-56 shrink-0 md:block">
          <div className="sticky top-24 space-y-4">
            <p className="eyebrow px-3 text-[var(--color-fg-subtle)]">Menu</p>
            {links}
          </div>
        </aside>
        <main className="min-w-0 flex-1">{children}</main>
      </div>
    </div>
  );
}
