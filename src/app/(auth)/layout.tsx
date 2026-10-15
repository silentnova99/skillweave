import Link from "next/link";
import type { ReactNode } from "react";
import { Wordmark } from "@/components/wordmark";

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-[var(--color-surface)]">
      <header className="container-page flex h-16 items-center">
        <Link href="/" aria-label="SkillWeave home">
          <Wordmark />
        </Link>
      </header>
      <main className="container-page flex flex-1 items-start justify-center py-10">
        <div className="w-full max-w-md border border-[var(--color-border)] bg-white p-6 shadow-[0_24px_60px_-38px_rgba(20,20,28,0.45)] sm:p-8">
          <div
            aria-hidden
            className="mb-6 h-1 w-16 bg-brand-gradient"
          />
          {children}
        </div>
      </main>
    </div>
  );
}
