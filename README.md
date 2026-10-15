# SkillWeave

SkillWeave turns free, high-quality resources that already exist across the web into
**ordered career roadmaps** with objectives, practice, assessments, projects and
interview preparation. It never re-hosts or redistributes third-party content — it
curates, sequences and verifies links, then tracks a learner's progress through them.

## What it does

- **Structured curriculum**: Career path → Phase → Module → Chapter → Objectives →
  Resources → Practice → Assessment → Project, with an explicit prerequisite DAG
  between modules.
- **Deterministic progression**: modules unlock when their prerequisites complete;
  chapters unlock in order. Rules live in pure, unit-tested functions
  (`src/lib/curriculum.ts`), not in an AI model.
- **Deterministic recommendations**: "what to do next" is computed from curriculum
  state, failed attempts and skill evidence (`src/lib/recommendation.ts`). AI may later
  rephrase the rationale text, but never invents facts.
- **Curation & verification**: every resource carries a verification status
  (`VERIFIED` / `UNVERIFIED` / `BROKEN` / `DEPRECATED`), a curator note, and licence
  metadata. Learners can report problems; admins triage them.
- **Assessments**: chapter quizzes, module assessments, a diagnostic, an interview
  question bank and timed mock exams — all graded instantly and deterministically.
  Coding answers are never executed in-process; they route to an external isolated
  judge when one is configured, and are otherwise left ungraded.
- **Projects**: briefs with milestones, acceptance criteria, a rubric and a
  submission/review workflow.
- **Skill profile**: per-question skill tags fold into a mastery estimate using an
  exponentially weighted moving average (`src/lib/scoring.ts`).
- **Admin tooling**: resource verification, report triage, bulk JSON import, and an
  audit log of every curation change.

## Tech stack

Next.js 16 (App Router, Turbopack) · React 19 · Tailwind CSS v4 · Auth.js
(next-auth v5) with JWT sessions and a credentials provider · Prisma 7 with the
`@prisma/adapter-pg` driver adapter · PostgreSQL · Zod · Vitest.

## Getting started

```bash
npm install
cp .env.example .env        # then fill in the values below
npm run db:deploy           # apply migrations
npm run db:seed             # load the curated catalogue + demo accounts
npm run dev
```

Open http://localhost:3000.

### Seeded accounts

| Role    | Email                    | Password           |
| ------- | ------------------------ | ------------------ |
| Admin   | `admin@skillweave.local`   | `skillweave-admin`   |
| Learner | `learner@skillweave.local` | `skillweave-learner` |

The demo learner targets **Backend Developer (Python)** with the first two chapters
completed, so the dashboard shows real progress and recommendations immediately.

## Environment variables

| Variable                                                     | Purpose                                         |
| ------------------------------------------------------------ | ----------------------------------------------- |
| `DATABASE_URL`                                               | PostgreSQL connection string                    |
| `AUTH_SECRET`                                                | Secret used to sign session JWTs                |
| `AUTH_TRUST_HOST`                                            | Set `true` behind proxies (needed for `next start`) |
| `ADMIN_EMAILS`                                               | Comma-separated emails auto-promoted to `ADMIN` on register |
| `SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD`                   | Override seeded admin credentials               |
| `SEED_DEMO_EMAIL` / `SEED_DEMO_PASSWORD`                     | Override seeded learner credentials             |
| `CODE_JUDGE_URL` / `CODE_JUDGE_TOKEN`                        | Optional external sandboxed judge for coding answers |

## Scripts

| Script              | Description                                      |
| ------------------- | ------------------------------------------------ |
| `npm run dev`       | Development server                               |
| `npm run build`     | Production build                                 |
| `npm run start`     | Run the production build                         |
| `npm run lint`      | ESLint                                           |
| `npm run typecheck` | `tsc --noEmit`                                   |
| `npm test`          | Vitest unit tests                                |
| `npm run db:migrate`| Create/apply a dev migration                     |
| `npm run db:deploy` | Apply migrations (no prompts)                    |
| `npm run db:seed`   | Idempotent catalogue + demo data seed            |
| `npm run db:studio` | Prisma Studio                                    |
| `npm run db:reset`  | Drop, re-migrate and re-seed                     |
| `npm run verify:seed` | Print seeded learner progress + recommendations |

## Architecture

```
src/
  app/
    (public)/      marketing landing, /paths catalog, /paths/[slug] roadmap
    (onboarding)/  profile setup + baseline diagnostic
    (app)/         authenticated shell: dashboard, assessments, projects,
                   interview, progress, admin
    api/           /api/auth, /api/reports, /api/code/run
  components/      UI primitives (ui/*) + feature components
  lib/             prisma, auth, session, validation, rate-limit,
                   curriculum, scoring, recommendation, catalog, progress, attempts
  generated/       Prisma client (generated, git-ignored contents)
prisma/
  schema.prisma    domain model (source of truth)
  seed-data.ts     curated resources, paths, projects, assessments
  seed.ts          idempotent seed runner
```

### Grading & progress flow

1. An assessment is submitted through a server action.
2. `src/lib/attempts.ts` grades it with `gradeAttempt` (pure), stores the attempt and
   per-question answers, then updates the learner's `SkillScore` rows.
3. `ChapterProgress` is toggled explicitly by the learner from the chapter page.
4. `loadPathProgress` recomputes progression state; the dashboard and roadmap render
   from that state, and `getRecommendationsForPath` produces the next steps.

### Curation policy

Resources are curated with a pedagogical role per chapter (`PRIMARY`, `ALTERNATIVE`,
`EXAMPLE`, `EXERCISE`, `ADVANCED_REFERENCE`, `REVISION`). Canonical sources are marked
`VERIFIED` with a note describing why; everything else defaults to `UNVERIFIED`.
Admins can re-verify, deprecate or replace resources, and every change is recorded in
the audit log. Learner reports feed the same triage queue.

## Testing

- Unit tests cover the pure logic: curriculum gating, recommendation ordering, grading
  and mastery maths, and the Zod validation schemas.
- `npm run verify:seed` is a lightweight integration check that exercises the real
  Prisma read paths (`loadPathProgress`, `getRecommendationsForPath`) against a seeded
  database.

## Deployment

Provide the environment variables above and run:

```bash
npm run build
npm run db:deploy
npm run start
```

Any Node host with PostgreSQL works. Auth.js requires `AUTH_SECRET` and, when serving
over a proxy or non-localhost host, `AUTH_TRUST_HOST=true`.
