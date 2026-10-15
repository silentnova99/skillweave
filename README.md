# SkillWeave

**Curated career roadmaps built from free, high-quality resources on the web.**

[![Next.js](https://img.shields.io/badge/Next.js-16-000000?logo=nextdotjs&logoColor=white)](https://nextjs.org)
[![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=black)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![Prisma](https://img.shields.io/badge/Prisma-7-2D3748?logo=prisma&logoColor=white)](https://www.prisma.io)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-4169E1?logo=postgresql&logoColor=white)](https://www.postgresql.org)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-4-06B6D4?logo=tailwindcss&logoColor=white)](https://tailwindcss.com)
[![Vitest](https://img.shields.io/badge/tested_with-Vitest-6E9F18?logo=vitest&logoColor=white)](https://vitest.dev)

SkillWeave turns free, high-quality resources that already exist across the web into
**ordered career roadmaps** with objectives, practice, assessments, projects and interview
preparation. It never re-hosts or redistributes third-party content — it curates,
sequences and verifies links, then tracks a learner's progress through them.

> **Status:** early production. Core curriculum, assessment, progress, project-review and
> admin subsystems are implemented and covered by tests.

---

## Table of contents

- [Overview](#overview)
- [Features](#features)
- [Architecture](#architecture)
- [Tech stack](#tech-stack)
- [Getting started](#getting-started)
- [Environment variables](#environment-variables)
- [Scripts](#scripts)
- [Project structure](#project-structure)
- [Data model](#data-model)
- [How progression works](#how-progression-works)
- [Curation policy](#curation-policy)
- [Project submissions & review](#project-submissions--review)
- [Testing](#testing)
- [Deployment](#deployment)
- [Branching model](#branching-model)
- [Roadmap](#roadmap)
- [Contributing](#contributing)
- [Credits](#credits)

---

## Overview

Most self-taught developers drown in a sea of free tutorials with no ordering, no
feedback and no way to know whether they are actually ready for a job. SkillWeave closes
that gap:

- **Ordering** — a curated prerequisite graph turns scattered resources into a path.
- **Feedback** — deterministic assessments and a per-skill mastery estimate.
- **Proof of work** — project briefs with automated structural / compile / test review.
- **Trust** — every resource carries a verification status and a curator note.

Progression, scoring and recommendations are computed by **pure, unit-tested functions**,
never by a language model. This keeps results reproducible, auditable and cheap to run.

---

## Features

- **Structured curriculum** — Career path → Phase → Module → Chapter → Objectives →
  Resources → Practice → Assessment → Project, with an explicit prerequisite DAG between
  modules.
- **Career-path catalogue** — browsable by category (Software Engineering, Data & AI,
  Cloud & DevOps, Cybersecurity, Product & Design, Foundations), with curated and
  community-collected tracks.
- **Deterministic progression** — modules unlock when prerequisites complete; chapters
  unlock in order.
- **Deterministic recommendations** — "what to do next" is derived from curriculum state,
  failed attempts and skill evidence.
- **Assessments** — chapter quizzes (10 questions), module mock exams (20 questions), a
  baseline diagnostic, a timed mock exam and an interview question bank. Every answer is
  graded instantly.
- **External-only code execution** — coding answers never run in-process. They route to a
  configured isolated runner, and are otherwise left ungraded rather than faked.
- **Project submissions** — upload source or an archive; SkillWeave runs structural
  checks, then compile/test checks when an isolated runner is configured.
- **Skill profile** — per-question skill tags fold into a mastery estimate using an
  exponentially weighted moving average.
- **Curation & verification** — resources carry a role per chapter (`PRIMARY`,
  `ALTERNATIVE`, `EXAMPLE`, `EXERCISE`, `ADVANCED_REFERENCE`, `REVISION`) and a status
  (`VERIFIED` / `UNVERIFIED` / `BROKEN` / `DEPRECATED`).
- **Admin tooling** — resource verification, report triage, bulk JSON import and an audit
  log of every curation change.

---

## Architecture

SkillWeave is a single Next.js App Router application with a clean separation between
**presentation**, **domain logic** (pure modules under `src/lib`), and **persistence**
(Prisma over PostgreSQL).

```
                       ┌──────────────────────────────┐
   Browser  ──────────▶│  Next.js (App Router, RSC)    │
                       │  public · auth · onboarding   │
                       │  app shell · admin            │
                       └───────────────┬──────────────┘
                                       │ server actions / route handlers
                       ┌───────────────▼──────────────┐
                       │  Domain logic (src/lib)       │
                       │  curriculum · gating · mock   │
                       │  scoring · recommendation     │
                       │  attempts · submissions/*     │
                       └───────────────┬──────────────┘
             Prisma Client (adapter)  │
                       ┌───────────────▼──────────────┐
                       │  PostgreSQL                   │
                       └──────────────────────────────┘
                                       ▲
                       ┌───────────────┴──────────────┐
                       │  External isolated runner     │
                       │  (optional, sandboxed)        │
                       └───────────────────────────────┘
```

See [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) for the full design: request flows,
the gating algorithm, the submission/review pipeline, security posture and extension
points.

---

## Tech stack

| Layer      | Choice                                                                 |
| ---------- | ---------------------------------------------------------------------- |
| Framework  | Next.js 16 (App Router, React Server Components, Turbopack)            |
| Language   | TypeScript 5                                                           |
| UI         | React 19, Tailwind CSS v4, hand-built component primitives             |
| Auth       | Auth.js / next-auth v5 (credentials provider, JWT sessions)            |
| ORM        | Prisma 7 with the `@prisma/adapter-pg` driver adapter                  |
| Database   | PostgreSQL                                                             |
| Validation | Zod 4                                                                  |
| Testing    | Vitest                                                                 |

---

## Getting started

**Prerequisites:** Node.js 20+ and a PostgreSQL database.

```bash
# 1. Install dependencies
npm install

# 2. Configure the environment
cp .env.example .env        # then fill in DATABASE_URL and AUTH_SECRET

# 3. Apply migrations and seed the catalogue + demo accounts
npm run db:deploy
npm run db:seed

# 4. Start the dev server
npm run dev
```

Open <http://localhost:3000>.

### Seeded accounts

| Role    | Email                      | Password             |
| ------- | -------------------------- | -------------------- |
| Admin   | `admin@skillweave.local`   | `skillweave-admin`   |
| Learner | `learner@skillweave.local` | `skillweave-learner` |

The demo learner targets **Backend Developer (Python)** with the first chapters completed,
so the dashboard shows real progress and recommendations immediately.

---

## Environment variables

Copy `.env.example` to `.env` and set the values below.

| Variable                | Required | Purpose                                                                 |
| ----------------------- | :------: | ----------------------------------------------------------------------- |
| `DATABASE_URL`          |    yes   | PostgreSQL connection string (keep `?sslmode=require` for managed DBs)  |
| `AUTH_SECRET`           |    yes   | Secret used to sign session JWTs                                        |
| `AUTH_TRUST_HOST`       |    no    | Set `true` behind a proxy or when running `next start` on a host        |
| `ADMIN_EMAILS`          |    no    | Comma-separated emails auto-promoted to `ADMIN` on registration         |
| `UPLOAD_DIR`            |    no    | Where submission uploads are written (defaults to `.uploads/`)          |
| `CODE_JUDGE_URL`        |    no    | Optional isolated judge for coding answers                              |
| `CODE_JUDGE_TOKEN`      |    no    | Bearer token for the code judge                                         |
| `SANDBOX_RUNNER_URL`    |    no    | Isolated runner for compile/test checks on submissions                  |
| `SANDBOX_RUNNER_TOKEN`  |    no    | Bearer token for the sandbox runner                                     |
| `SANDBOX_MODE`          |    no    | `remote` or `disabled` (defaults to `disabled` when no runner is set)   |
| `SEED_ADMIN_EMAIL`      |    no    | Override the seeded admin email                                         |
| `SEED_ADMIN_PASSWORD`   |    no    | Override the seeded admin password                                      |
| `SEED_DEMO_EMAIL`       |    no    | Override the seeded learner email                                       |
| `SEED_DEMO_PASSWORD`    |    no    | Override the seeded learner password                                    |

> Without an isolated runner configured, compile/test checks report `SKIPPED` and coding
> answers are left ungraded. SkillWeave never fabricates execution results.

---

## Scripts

| Script                 | Description                                          |
| ---------------------- | ---------------------------------------------------- |
| `npm run dev`          | Development server                                   |
| `npm run build`        | Production build                                     |
| `npm run start`        | Run the production build                             |
| `npm run lint`         | ESLint                                               |
| `npm run typecheck`    | `tsc --noEmit`                                       |
| `npm test`             | Run the Vitest suite                                 |
| `npm run test:watch`   | Vitest in watch mode                                 |
| `npm run db:generate`  | Generate the Prisma client                           |
| `npm run db:migrate`   | Create/apply a development migration                 |
| `npm run db:deploy`    | Apply migrations (no prompts)                        |
| `npm run db:seed`      | Idempotent catalogue + demo data seed                |
| `npm run db:studio`    | Prisma Studio                                        |
| `npm run db:reset`     | Drop, re-migrate and re-seed                         |
| `npm run verify:seed`  | Print seeded learner progress and recommendations    |

---

## Project structure

```
.
├─ prisma/
│  ├─ schema.prisma          domain model (source of truth)
│  ├─ migrations/            versioned SQL migrations
│  ├─ seed.ts                idempotent seed runner
│  ├─ seed-data.ts           curated paths, resources, projects
│  ├─ question-bank.ts       merged topic bank (base + packs)
│  ├─ topics/                question packs by subject
│  ├─ paths/                 generated catalogue (career paths + resources)
│  └─ data/                  source CSV for the generated catalogue
├─ scripts/
│  ├─ generate-course-catalog.mts   regenerate prisma/paths/course-catalog.ts
│  └─ verify-progress.mts           integration check against a seeded DB
├─ src/
│  ├─ app/
│  │  ├─ (public)/           landing, /paths catalogue, /paths/[slug] roadmap
│  │  ├─ (auth)/             login, register
│  │  ├─ (onboarding)/       profile setup + baseline diagnostic
│  │  ├─ (app)/              dashboard, learn, assessments, projects, admin
│  │  └─ api/                auth, reports, code/run, project submissions
│  ├─ components/            UI primitives (ui/*) + feature components
│  ├─ lib/                   domain logic and infrastructure
│  │  └─ submissions/        upload ingest, detection, storage, review
│  ├─ generated/             Prisma client (generated; contents git-ignored)
│  └─ types/                 ambient type augmentation
└─ docs/                     architecture and design notes
```

---

## Data model

The curriculum is a strict hierarchy with cross-cutting tables for progress:

- **Curriculum** — `CareerPath → Phase → Module → Chapter → LearningObjective`, with an
  explicit `Prerequisite` edge between modules.
- **Resources** — `Resource` (canonical metadata + verification) linked to chapters through
  `ChapterResource` (pedagogical role per mapping).
- **Assessment** — `Assessment`, `Question`, `QuestionOption`, `CodingProblem`, `Attempt`,
  `Answer`.
- **Progress** — `Profile`, `ChapterProgress`, `ResourceCompletion`, `Note`, `Bookmark`,
  `SkillScore`.
- **Projects** — `Project`, `ProjectSubmission`, `SubmissionFile`, `SubmissionReview`.
- **Ops** — `Recommendation`, `ResourceReport`, `AdminAuditLog`.

See [`prisma/schema.prisma`](prisma/schema.prisma) for the authoritative definition.

---

## How progression works

1. An assessment is submitted through a server action.
2. `src/lib/attempts.ts` grades it with the pure `gradeAttempt`, stores the attempt and its
   answers, then updates the learner's `SkillScore` rows.
3. `ChapterProgress` is toggled explicitly by the learner from the chapter page.
4. `loadPathProgress` recomputes progression state; the dashboard and roadmap render from
   that state, and `getRecommendationsForPath` produces the next steps.

Unlocking rules live in pure, unit-tested modules:

- `src/lib/curriculum.ts` — path/module/chapter ordering and prerequisites.
- `src/lib/gating.ts` — chapter and module unlock decisions.
- `src/lib/mock.ts` — deterministic mock-exam assembly from the question bank.
- `src/lib/scoring.ts` — mastery estimate from skill evidence.
- `src/lib/recommendation.ts` — next-step selection.

---

## Curation policy

Resources are curated with a pedagogical role per chapter (`PRIMARY`, `ALTERNATIVE`,
`EXAMPLE`, `EXERCISE`, `ADVANCED_REFERENCE`, `REVISION`). Canonical sources are marked
`VERIFIED` with a note describing why; everything else defaults to `UNVERIFIED`. Admins can
re-verify, deprecate or replace resources, and every change is recorded in the audit log.
Learner reports feed the same triage queue.

Community-collected tracks (for example, coupon-link course bundles) are seeded as
`UNVERIFIED` with their provenance preserved, and are explicitly labelled as external.

---

## Project submissions & review

Learners submit projects as source files or an archive. `src/lib/submissions/*`:

- **ingests** the upload safely (size/type limits, path sanitisation, no symlink escape),
- **detects** the language and project shape,
- **stores** files on disk outside the web root (`UPLOAD_DIR`),
- **reviews** structure, then compile/tests when an isolated runner is configured.

Each review produces per-category, per-check results (`PASS` / `FAIL` / `WARN` /
`SKIPPED`) so learners see exactly which dimension was judged and which could not run.
When no runner is configured, execution checks are marked `SKIPPED` — never faked.

---

## Testing

- **Unit tests** cover the pure logic: curriculum gating, recommendation ordering, grading
  and mastery maths, mock assembly, the submission pipeline, and Zod schemas.
- `npm run verify:seed` is a lightweight integration check that exercises the real Prisma
  read paths (`loadPathProgress`, `getRecommendationsForPath`) against a seeded database.

```bash
npm run typecheck
npm run lint
npm test
npm run build
```

---

## Deployment

SkillWeave runs on any Node host with a PostgreSQL database.

```bash
npm ci
npm run build
npm run db:deploy     # apply migrations
npm run start
```

Set all required environment variables from the [table above](#environment-variables). When
serving behind a proxy or on a non-localhost host, set `AUTH_TRUST_HOST=true` and provide a
strong `AUTH_SECRET`.

---

## Branching model

This repository follows **Git Flow**:

| Branch             | Purpose                                                        |
| ------------------ | -------------------------------------------------------------- |
| `main`             | Production. Only receives merges from `release/*` and `hotfix/*`. |
| `develop`          | Integration. All feature work merges here first.               |
| `feature/<name>`   | New work, branched from and merged back into `develop`.         |
| `release/<version>`| Release candidate, branched from `develop`, merged to `main` + tagged. |
| `hotfix/<version>` | Urgent production fix, branched from `main`, merged to `main` and `develop`. |

Commit messages follow [Conventional Commits](https://www.conventionalcommits.org/).

---

## Roadmap

- [ ] Author 40+ broad/thin career paths across all categories
- [ ] Per-chapter project suggestions
- [ ] Curriculum versioning and pinned question banks
- [ ] CSV/JSON curriculum import and export
- [ ] Verified video ingestion into the seeded catalogue
- [ ] CI (typecheck, lint, test, build) and branch protection

---

## Contributing

Contributions are welcome. Please:

1. Branch from `develop` using `feature/<name>`.
2. Keep the pure domain logic covered by unit tests.
3. Run `npm run typecheck && npm run lint && npm test` before opening a pull request.
4. Never invent execution results, resource verification, or assessment data.

---

## Credits

Built and maintained by **Diwanshu Daware**.

Third-party curricula and resources referenced by SkillWeave belong to their respective
owners; SkillWeave links to them and does not redistribute their content.
