import Link from "next/link";
import { listPublishedPaths, pathCounts } from "@/lib/catalog";
import { catalogueStats } from "@/lib/progress";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Reveal } from "@/components/motion/reveal";

const INSIDE: { title: string; body: string }[] = [
  {
    title: "An ordered roadmap, not a bookmark dump",
    body: "Every path is a sequence of phases, modules and chapters with explicit prerequisites, so you always know what must come before what — and what to open today.",
  },
  {
    title: "One strong primary resource per chapter",
    body: "We point at the best free resource for each chapter and keep optional extras out of the way. No forty-tab rabbit holes, no resource hoarding.",
  },
  {
    title: "Objectives and practice you can finish",
    body: "Each chapter states what you should be able to do, then gives you quizzes and coding practice to prove you can actually do it.",
  },
  {
    title: "Assessments that trigger revision",
    body: "Module assessments are scored, and the topics you get wrong come back as targeted revision later instead of being quietly forgotten.",
  },
  {
    title: "Portfolio projects, not toy exercises",
    body: "Every path includes project briefs you can build, ship and show — the artifacts that actually matter in an interview.",
  },
  {
    title: "Interview preparation from your own gaps",
    body: "Mock interview questions and revision are drawn from your assessment evidence, so practice targets the areas you are genuinely weakest in.",
  },
];

const CAPABILITIES: string[] = [
  "Official documentation",
  "Interactive tutorials",
  "Open video courses",
  "Practice platforms",
  "Open textbooks",
  "Community guides",
];

const VALUES: { title: string; body: string }[] = [
  {
    title: "Structured, not scattered",
    body: "The curriculum decides the order. You stop curating links and start finishing chapters.",
  },
  {
    title: "Deterministic recommendations",
    body: "The engine picks your next step from prerequisites, assessment evidence and gaps — and explains why.",
  },
  {
    title: "Progress you can prove",
    body: "Chapter completion, skill scores and project submissions build a record you can point to.",
  },
  {
    title: "Genuinely free",
    body: "We link to existing free resources. SkillWeave never re-hosts or resells third-party content.",
  },
];

const STEPS: { title: string; body: string }[] = [
  {
    title: "Tell us your goal",
    body: "Choose a target career, your current level and how many hours a week you can give it.",
  },
  {
    title: "Take an optional diagnostic",
    body: "Prove what you already know so you can test out of chapters instead of repeating them.",
  },
  {
    title: "Follow an ordered roadmap",
    body: "Work through prerequisites and modules with one strong primary resource per chapter.",
  },
  {
    title: "Practise and get interview-ready",
    body: "Quizzes, coding practice, projects and mock interviews, with revision for your weak topics.",
  },
];

const ABOUT_POINTS: string[] = [
  "No paywalls, no re-hosted content — SkillWeave only points at resources that are already free.",
  "The order is the product: prerequisites, phases and modules that mirror how skills actually stack.",
  "Feedback loops built in — assessments feed revision, and revision feeds interview practice.",
];

export default async function LandingPage() {
  const [paths, stats] = await Promise.all([
    listPublishedPaths(),
    catalogueStats(),
  ]);

  const statItems = [
    { value: stats.paths, label: "Career paths" },
    { value: stats.modules, label: "Modules" },
    { value: stats.chapters, label: "Chapters" },
    { value: stats.resources, label: "Free resources" },
    { value: stats.projects, label: "Projects" },
  ];

  return (
    <div>
      {/* Hero */}
      <section className="relative overflow-hidden">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 -z-10 bg-brand-gradient-soft"
        />
        <div
          aria-hidden
          className="animate-float pointer-events-none absolute -top-40 right-[-12%] -z-10 h-[36rem] w-[36rem] rounded-full bg-[radial-gradient(circle,rgba(235,63,67,0.22),transparent_65%)] blur-3xl"
        />
        <div
          aria-hidden
          className="animate-float pointer-events-none absolute top-24 left-[-12%] -z-10 h-[30rem] w-[30rem] rounded-full bg-[radial-gradient(circle,rgba(71,58,146,0.20),transparent_65%)] blur-3xl [animation-delay:-3s]"
        />

        <div className="container-page py-20 sm:py-28">
          <Reveal>
            <span className="inline-flex items-center gap-2 border border-[var(--color-border-strong)] bg-white/70 px-3 py-1 text-xs font-semibold tracking-[0.16em] text-[var(--color-fg-muted)] uppercase backdrop-blur">
              <span className="h-1.5 w-1.5 rounded-full bg-[var(--color-brand)]" />
              Free · Curated · In the right order
            </span>
          </Reveal>

          <Reveal delay={80}>
            <h1 className="display-title mt-6 max-w-4xl text-5xl sm:text-6xl lg:text-7xl">
              Learn tech from zero to{" "}
              <span className="gradient-text">interview-ready</span>.
            </h1>
          </Reveal>

          <Reveal delay={160}>
            <p className="mt-6 max-w-2xl text-base leading-relaxed text-[var(--color-fg-muted)] sm:text-lg">
              SkillWeave turns free, high-quality resources from across the
              internet into ordered career roadmaps — with prerequisites,
              practice, assessments and interview preparation. One clear step at
              a time.
            </p>
          </Reveal>

          <Reveal delay={240}>
            <div className="mt-9 flex flex-wrap gap-3">
              <Link href="/register">
                <Button size="lg" variant="gradient">
                  Start a free roadmap
                </Button>
              </Link>
              <Link href="/paths">
                <Button size="lg" variant="outline">
                  Browse career paths
                </Button>
              </Link>
            </div>
          </Reveal>

          <Reveal delay={320}>
            <p className="mt-6 text-xs text-[var(--color-fg-subtle)]">
              No credit card. No paywalled content. We link to free resources
              only.
            </p>
          </Reveal>
        </div>

        {/* Stat band */}
        <div className="relative border-t border-[var(--color-ink-border)] bg-[var(--color-ink)]">
          <div
            aria-hidden
            className="absolute inset-x-0 top-0 h-px bg-brand-gradient"
          />
          <div className="container-page grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5">
            {statItems.map((item, index) => (
              <Reveal
                key={item.label}
                variant="up"
                delay={index * 70}
                className="border-t border-[var(--color-ink-border)] px-1 py-7 sm:px-6 lg:border-t-0 lg:border-l lg:first:border-l-0"
              >
                <p className="text-3xl font-extrabold tracking-tight text-[var(--color-on-ink)] sm:text-4xl">
                  {item.value}
                </p>
                <p className="eyebrow mt-2 text-[var(--color-on-ink-muted)]">
                  {item.label}
                </p>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* What's inside */}
      <section id="inside" className="container-page py-16 sm:py-24">
        <Reveal className="max-w-2xl">
          <p className="eyebrow text-[var(--color-brand)]">What&apos;s inside</p>
          <h2 className="section-title mt-3 text-3xl sm:text-4xl">
            Pick a goal. We engineer the path.
          </h2>
          <p className="mt-4 text-[var(--color-fg-muted)]">
            Every SkillWeave roadmap is built from the same six things — the
            parts that actually get people from &ldquo;where do I start&rdquo; to
            hired.
          </p>
        </Reveal>

        <div className="mt-10 border-t border-[var(--color-border)]">
          {INSIDE.map((item, index) => (
            <details
              key={item.title}
              className="accordion-item group border-b border-[var(--color-border)]"
            >
              <summary className="flex items-center gap-5 py-6 transition-colors hover:text-[var(--color-brand)] sm:gap-8">
                <span className="font-mono text-sm text-[var(--color-fg-subtle)]">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <span className="flex-1 text-base font-bold tracking-tight text-current sm:text-lg">
                  {item.title}
                </span>
                <span
                  aria-hidden
                  className="accordion-plus grid h-8 w-8 shrink-0 place-items-center rounded-full border border-[var(--color-border-strong)] text-lg leading-none text-[var(--color-brand)] transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]"
                >
                  +
                </span>
              </summary>
              <div className="pb-7 pl-10 sm:pl-[4.5rem]">
                <p className="max-w-2xl text-sm leading-relaxed text-[var(--color-fg-muted)] sm:text-base">
                  {item.body}
                </p>
              </div>
            </details>
          ))}
        </div>
      </section>

      {/* Career paths */}
      <section className="bg-[var(--color-surface)] py-16 sm:py-24">
        <div className="container-page">
          <Reveal className="mb-10 flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="eyebrow text-[var(--color-brand)]">Career paths</p>
              <h2 className="section-title mt-3 text-3xl sm:text-4xl">
                Roadmaps you can start today
              </h2>
            </div>
            <Link
              href="/paths"
              className="link-underline text-sm font-semibold text-[var(--color-brand)]"
            >
              View all paths →
            </Link>
          </Reveal>

          {paths.length === 0 ? (
            <div className="border border-dashed border-[var(--color-border-strong)] bg-white p-10 text-center text-sm text-[var(--color-fg-muted)]">
              Career paths will appear here once the catalogue is seeded. Run
              <code className="mx-1 bg-[var(--color-surface-2)] px-1.5 py-0.5 font-mono text-xs">
                npm run db:seed
              </code>
              to load the curated catalogue.
            </div>
          ) : (
            <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {paths.map((path, index) => {
                const counts = pathCounts(path);
                return (
                  <li key={path.id}>
                    <Reveal delay={(index % 3) * 90} className="h-full">
                      <Link
                        href={`/paths/${path.slug}`}
                        className="card-lift group flex h-full flex-col border border-[var(--color-border)] bg-white p-6 hover:border-[var(--color-brand)]"
                      >
                        <div
                          aria-hidden
                          className="h-1 w-10 bg-brand-gradient"
                        />
                        <h3 className="mt-5 text-lg font-bold tracking-tight text-[var(--color-fg)]">
                          {path.title}
                        </h3>
                        <p className="mt-3 flex-1 text-sm leading-relaxed text-[var(--color-fg-muted)]">
                          {path.summary}
                        </p>
                        <div className="mt-5 flex flex-wrap gap-2 text-xs">
                          <Badge tone="outline">{counts.phases} phases</Badge>
                          <Badge tone="outline">{counts.modules} modules</Badge>
                          <Badge tone="outline">
                            {counts.chapters} chapters
                          </Badge>
                        </div>
                        <span className="mt-5 text-xs font-semibold tracking-[0.08em] text-[var(--color-brand)] uppercase">
                          View roadmap →
                        </span>
                      </Link>
                    </Reveal>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </section>

      {/* Sources strip */}
      <section className="overflow-hidden border-b border-[var(--color-border)] bg-white py-12">
        <p className="container-page eyebrow text-center text-[var(--color-fg-subtle)]">
          Free resources, from the sources you already trust
        </p>
        <div className="marquee-mask mt-6 flex overflow-hidden">
          <div className="flex w-max animate-marquee gap-4 pr-4">
            {[...CAPABILITIES, ...CAPABILITIES, ...CAPABILITIES].map(
              (label, index) => (
                <span
                  key={`${label}-${index}`}
                  className="whitespace-nowrap border border-[var(--color-border)] px-5 py-2 text-sm font-medium text-[var(--color-fg-muted)]"
                >
                  {label}
                </span>
              ),
            )}
          </div>
        </div>
      </section>

      {/* Why SkillWeave */}
      <section className="container-page py-16 sm:py-24">
        <Reveal className="max-w-2xl">
          <p className="eyebrow text-[var(--color-brand)]">Why SkillWeave</p>
          <h2 className="section-title mt-3 text-3xl sm:text-4xl">
            Built to be finished, not bookmarked
          </h2>
        </Reveal>
        <div className="mt-10 grid gap-px border border-[var(--color-border)] bg-[var(--color-border)] sm:grid-cols-2 lg:grid-cols-4">
          {VALUES.map((value, index) => (
            <Reveal
              key={value.title}
              delay={index * 80}
              className="group bg-white p-6 transition-colors hover:bg-[var(--color-surface)]"
            >
              <span
                aria-hidden
                className="block h-1 w-10 bg-brand-gradient transition-all duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:w-16"
              />
              <h3 className="mt-5 text-base font-bold tracking-tight text-[var(--color-fg)]">
                {value.title}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-[var(--color-fg-muted)]">
                {value.body}
              </p>
            </Reveal>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section
        id="how-it-works"
        className="relative overflow-hidden bg-[var(--color-ink)] text-[var(--color-on-ink)]"
      >
        <div
          aria-hidden
          className="pointer-events-none absolute -top-32 right-[-10%] h-[30rem] w-[30rem] rounded-full bg-[radial-gradient(circle,rgba(235,63,67,0.28),transparent_65%)] blur-3xl"
        />
        <div className="container-page relative py-16 sm:py-24">
          <Reveal className="max-w-2xl">
            <p className="eyebrow text-[var(--color-brand-bright)]">
              How it works
            </p>
            <h2 className="section-title mt-3 text-3xl sm:text-4xl">
              From cold start to interview-ready
            </h2>
            <p className="mt-4 text-[var(--color-on-ink-muted)]">
              Four steps, in order. No guessing what to study next.
            </p>
          </Reveal>

          <ol className="mt-12 grid gap-px overflow-hidden border border-[var(--color-ink-border)] bg-[var(--color-ink-border)] sm:grid-cols-2 lg:grid-cols-4">
            {STEPS.map((step, index) => (
              <li
                key={step.title}
                className="group bg-[var(--color-ink-2)] transition-colors hover:bg-[var(--color-ink-3)]"
              >
                <Reveal delay={index * 90} className="p-6">
                  <span className="font-mono text-sm text-[var(--color-brand-bright)]">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <h3 className="mt-4 text-base font-bold tracking-tight text-[var(--color-on-ink)]">
                    {step.title}
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-[var(--color-on-ink-muted)]">
                    {step.body}
                  </p>
                </Reveal>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* About */}
      <section id="about" className="bg-[var(--color-surface)] py-16 sm:py-24">
        <div className="container-page grid items-start gap-12 lg:grid-cols-[1.15fr_1fr]">
          <Reveal variant="left">
            <p className="eyebrow text-[var(--color-brand)]">About</p>
            <h2 className="section-title mt-3 text-3xl sm:text-4xl">
              Built by Diwanshu Daware
            </h2>
            <p className="mt-4 text-[var(--color-fg-muted)]">
              SkillWeave started from a familiar frustration: there has never
              been more free, world-class learning material online — and it has
              never been harder to know what to learn next. Tutorials pile up,
              bookmarks rot, and momentum dies somewhere between tab forty and
              tab forty-one.
            </p>
            <p className="mt-4 text-[var(--color-fg-muted)]">
              So I built the missing layer on top of the free internet: a
              curriculum that decides the order, tracks what you have proved, and
              tells you the one chapter worth opening today. SkillWeave is my
              attempt to make self-taught technical education feel less like
              drowning in options and more like walking a path.
            </p>
            <ul className="mt-6 space-y-3">
              {ABOUT_POINTS.map((point) => (
                <li key={point} className="flex gap-3 text-sm text-[var(--color-fg)]">
                  <span
                    aria-hidden
                    className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--color-brand)]"
                  />
                  <span className="leading-relaxed">{point}</span>
                </li>
              ))}
            </ul>
            <Link
              href="/paths"
              className="link-underline mt-8 inline-block text-sm font-semibold text-[var(--color-brand)]"
            >
              Explore the roadmaps →
            </Link>
          </Reveal>

          <Reveal variant="right" delay={120}>
            <div className="relative border border-[var(--color-border)] bg-white p-8 shadow-[0_30px_70px_-45px_rgba(20,20,28,0.5)]">
              <div
                aria-hidden
                className="absolute inset-x-0 top-0 h-1 bg-brand-gradient"
              />
              <div className="flex items-center gap-4">
                <span className="grid h-16 w-16 place-items-center bg-brand-gradient text-xl font-black text-white">
                  DD
                </span>
                <div>
                  <p className="text-base font-bold tracking-tight text-[var(--color-fg)]">
                    Diwanshu Daware
                  </p>
                  <p className="text-sm text-[var(--color-fg-muted)]">
                    Creator &amp; maintainer, SkillWeave
                  </p>
                </div>
              </div>
              <p className="mt-6 text-sm leading-relaxed text-[var(--color-fg-muted)]">
                &ldquo;If the resources are already free, the only thing missing
                is the order. SkillWeave is that order.&rdquo;
              </p>
              <dl className="mt-8 grid grid-cols-2 gap-px border border-[var(--color-border)] bg-[var(--color-border)]">
                <div className="bg-white p-4">
                  <dt className="text-xs tracking-[0.14em] text-[var(--color-fg-subtle)] uppercase">
                    Focus
                  </dt>
                  <dd className="mt-1 text-sm font-semibold text-[var(--color-fg)]">
                    Structured self-teaching
                  </dd>
                </div>
                <div className="bg-white p-4">
                  <dt className="text-xs tracking-[0.14em] text-[var(--color-fg-subtle)] uppercase">
                    Content
                  </dt>
                  <dd className="mt-1 text-sm font-semibold text-[var(--color-fg)]">
                    Free, linked, credited
                  </dd>
                </div>
              </dl>
            </div>
          </Reveal>
        </div>
      </section>

      {/* CTA */}
      <section className="relative overflow-hidden bg-brand-gradient text-white">
        <div className="container-page flex flex-col items-start justify-between gap-6 py-16 sm:flex-row sm:items-center">
          <Reveal>
            <h2 className="section-title text-3xl sm:text-4xl">
              Your next chapter is one click away.
            </h2>
            <p className="mt-3 max-w-xl text-sm text-white/85">
              Set a goal, get an ordered roadmap, and start the first chapter in
              minutes. Free forever, because the resources already are.
            </p>
          </Reveal>
          <Reveal delay={120} className="shrink-0">
            <Link href="/register">
              <Button size="lg" variant="light">
                Start a free roadmap
              </Button>
            </Link>
          </Reveal>
        </div>
      </section>
    </div>
  );
}
