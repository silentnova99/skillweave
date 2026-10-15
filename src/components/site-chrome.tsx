import Link from "next/link";
import { getSession } from "@/lib/session";
import { Button } from "@/components/ui/button";
import { Wordmark } from "@/components/wordmark";
import { logoutAction } from "@/app/(auth)/actions";

const PRIMARY_NAV = [
  { href: "/paths", label: "Career paths" },
  { href: "/#inside", label: "What's inside" },
  { href: "/#how-it-works", label: "How it works" },
  { href: "/#about", label: "About" },
];

export async function SiteHeader() {
  const session = await getSession();

  return (
    <header className="sticky top-0 z-20 border-b border-[var(--color-border)] bg-white/85 backdrop-blur-md">
      <div className="container-page flex h-16 items-center justify-between gap-4">
        <Link href="/" aria-label="SkillWeave home">
          <Wordmark />
        </Link>

        <nav aria-label="Primary" className="hidden items-center gap-7 md:flex">
          {PRIMARY_NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="link-underline text-sm font-medium text-[var(--color-fg-muted)] transition-colors hover:text-[var(--color-fg)]"
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          {session?.user ? (
            <>
              <Link href="/dashboard">
                <Button variant="outline" size="sm">
                  Dashboard
                </Button>
              </Link>
              <form action={logoutAction}>
                <Button variant="ghost" size="sm" type="submit">
                  Sign out
                </Button>
              </form>
            </>
          ) : (
            <>
              <Link href="/login" className="hidden sm:block">
                <Button variant="ghost" size="sm">
                  Sign in
                </Button>
              </Link>
              <Link href="/register">
                <Button size="sm">Get started</Button>
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}

const FOOTER_NAV: { heading: string; links: { href: string; label: string }[] }[] =
  [
    {
      heading: "Learn",
      links: [
        { href: "/paths", label: "Career paths" },
        { href: "/dashboard", label: "Dashboard" },
        { href: "/assessments", label: "Assessments" },
        { href: "/projects", label: "Projects" },
        { href: "/interview", label: "Interview prep" },
      ],
    },
    {
      heading: "Platform",
      links: [
        { href: "/#inside", label: "What's inside" },
        { href: "/#how-it-works", label: "How it works" },
        { href: "/#about", label: "About" },
        { href: "/register", label: "Create account" },
        { href: "/login", label: "Sign in" },
      ],
    },
  ];

export function SiteFooter() {
  return (
    <footer className="relative mt-auto overflow-hidden bg-[var(--color-ink)] text-[var(--color-on-ink-muted)]">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-px bg-brand-gradient"
      />
      <div className="container-page grid gap-10 py-16 md:grid-cols-[1.4fr_1fr_1fr]">
        <div className="max-w-sm">
          <Wordmark onDark />
          <p className="mt-4 text-sm leading-relaxed">
            SkillWeave organises free, high-quality resources from across the
            internet into ordered career roadmaps — with practice, assessments
            and interview preparation.
          </p>
        </div>

        {FOOTER_NAV.map((group) => (
          <div key={group.heading}>
            <p className="eyebrow text-[var(--color-brand-bright)]">
              {group.heading}
            </p>
            <ul className="mt-4 space-y-2.5 text-sm">
              {group.links.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="link-underline transition-colors hover:text-[var(--color-on-ink)]"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      <div className="border-t border-[var(--color-ink-border)]">
        <div className="container-page flex flex-col gap-2 py-6 text-xs sm:flex-row sm:items-center sm:justify-between">
          <p>
            We link to free resources. SkillWeave never re-hosts or redistributes
            third-party content.
          </p>
          <p>© {new Date().getFullYear()} SkillWeave · Built by Diwanshu Daware</p>
        </div>
      </div>
    </footer>
  );
}
