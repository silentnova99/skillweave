import Link from "next/link";
import type { ReactNode } from "react";
import { requireUser } from "@/lib/session";
import { Wordmark } from "@/components/wordmark";

export default async function OnboardingLayout({
  children,
}: {
  children: ReactNode;
}) {
  const user = await requireUser();

  return (
    <div className="flex min-h-screen flex-col bg-[var(--color-surface)]">
      <header className="bg-[var(--color-ink)]">
        <div className="container-page flex h-16 items-center justify-between">
          <Link href="/" aria-label="SkillWeave home">
            <Wordmark onDark />
          </Link>
          <span className="text-sm text-[var(--color-on-ink-muted)]">
            {user.name ?? user.email}
          </span>
        </div>
      </header>
      <main className="container-page flex flex-1 items-start justify-center py-10">
        <div className="w-full max-w-2xl">{children}</div>
      </main>
    </div>
  );
}
