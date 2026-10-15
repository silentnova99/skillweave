# Architecture

This document describes how SkillWeave is put together: the layering, the request flows,
the algorithms behind progression and review, the security posture, and the extension
points for future work.

---

## 1. Principles

1. **Deterministic core.** Progression, scoring, recommendations and mock assembly are
   computed by pure functions in `src/lib`. They take plain data in and return plain data
   out, so they are reproducible, auditable and trivially unit-testable.
2. **Never fake work.** Code is never executed in the web process, and execution results
   are never invented. If no isolated runner is configured, execution checks report
   `SKIPPED`.
3. **Curate, do not re-host.** SkillWeave stores metadata and links to third-party
   resources; it does not redistribute their content.
4. **Server-first.** Data access happens in React Server Components and server actions.
   The client receives only what it renders.
5. **Boundaries over magic.** Presentation (`src/app`, `src/components`), domain
   (`src/lib`), and persistence (`prisma/`) are kept separate.

---

## 2. Layers

```
┌───────────────────────────────────────────────────────────────┐
│ Presentation                                                   │
│   src/app/**          routes, layouts, server actions          │
│   src/components/**    UI primitives + feature components      │
├───────────────────────────────────────────────────────────────┤
│ Domain (pure, tested)                                          │
│   curriculum · gating · mock · scoring · recommendation        │
│   attempts · validation · catalog · progress                   │
│   submissions/{detect,analyze,ingest,zip,review,storage}       │
├───────────────────────────────────────────────────────────────┤
│ Infrastructure                                                 │
│   prisma (client) · pg (driver adapter) · auth · session       │
│   rate-limit · video                                           │
├───────────────────────────────────────────────────────────────┤
│ Persistence                                                    │
│   PostgreSQL (via Prisma 7 + @prisma/adapter-pg)               │
└───────────────────────────────────────────────────────────────┘
```

### Presentation (`src/app`)

Route groups keep concerns separate:

| Group           | Routes                                                        |
| --------------- | ------------------------------------------------------------- |
| `(public)`      | landing page, `/paths` catalogue, `/paths/[slug]` roadmap     |
| `(auth)`        | `/login`, `/register`                                         |
| `(onboarding)`  | profile setup and the baseline diagnostic                     |
| `(app)`         | authenticated shell: dashboard, learn, assessments, projects, interview, progress, admin |
| `api`           | `auth/[...nextauth]`, `reports`, `code/run`, project submissions |

### Domain (`src/lib`)

| Module               | Responsibility                                             |
| -------------------- | --------------------------------------------------------- |
| `curriculum.ts`      | ordering of phases/modules/chapters and prerequisites      |
| `gating.ts`          | chapter and module unlock decisions                        |
| `mock.ts`            | deterministic mock-exam assembly                           |
| `scoring.ts`         | mastery estimate (exponentially weighted moving average)   |
| `recommendation.ts`  | next-step selection from curriculum state                  |
| `attempts.ts`        | grading a submitted assessment and persisting results      |
| `progress.ts`        | deriving a learner's path progress                         |
| `catalog.ts`         | catalogue queries for the public browse experience         |
| `validation.ts`      | Zod schemas shared by forms and server actions             |
| `submissions/*`      | upload ingest, language detection, analysis, storage, review |

### Infrastructure (`src/lib`)

`prisma.ts` exposes the client; `pg.ts` builds the `PrismaPg` driver adapter (normalising
`sslmode` into an explicit `ssl` option and configuring the pool). `auth.ts` wires Auth.js.
`session.ts` resolves the current user. `rate-limit.ts` throttles sensitive endpoints.
`video.ts` derives safe embed URLs for video resources.

---

## 3. Data model

The curriculum is a strict hierarchy with explicit cross-cutting tables. Full definition:
[`prisma/schema.prisma`](../prisma/schema.prisma).

```
CareerPath
  └─ Phase
       └─ Module ──(Prerequisite)──▶ Module      (explicit prerequisite DAG)
            ├─ LearningObjective
            ├─ Assessment  (MODULE_ASSESSMENT / MOCK_EXAM)
            └─ Chapter
                 ├─ LearningObjective
                 ├─ ChapterResource ──▶ Resource         (role per mapping)
                 ├─ Question                             (chapter practice)
                 │    ├─ QuestionOption
                 │    └─ CodingProblem
                 ├─ ChapterProgress                      (per learner)
                 ├─ Note / Bookmark
                 └─ ResourceReport
```

Assessment and progress tables:

```
Assessment ──▶ AssessmentQuestion ──▶ Question
Attempt ──▶ Answer                       (per learner, per assessment)
SkillScore                               (per learner, per skill; 0..100)
```

Projects and review:

```
Project ──▶ ProjectSubmission ──▶ SubmissionFile
                              └─▶ SubmissionReview ──▶ checks[]   (JSON, per category)
```

Operational:

```
Recommendation   ResourceReport   AdminAuditLog
```

### Keys and constraints

- `CareerPath.slug` is globally unique. `Phase`, `Module` and `Chapter` slugs are unique
  **within their parent** (`@@unique([parentId, slug])`).
- `ChapterResource` is unique on `(chapterId, resourceId, role)`.
- `Resource` has no slug; its `url` is unique.
- `Question` may attach to a `chapter` and/or a `learningObjective`.

---

## 4. Progression algorithm

Progression is derived, not stored as a single flag. `src/lib/gating.ts` and
`src/lib/curriculum.ts` compute state from three inputs:

1. **Prerequisite graph** — a module is *available* when every `requiredModule` is complete.
2. **Chapter ordering** — a chapter is *unlocked* when all earlier non-optional chapters in
   its module are complete, and the module is available.
3. **Completion signals** — `ChapterProgress` (learner-toggled, or `tested-out`) and
   assessment attempts (chapter tests / module mocks) feed `chapterContentComplete`.

`loadPathProgress` folds these into a per-path state object that pages render directly, so
the UI never re-derives rules. `getRecommendationsForPath` consumes the same state to
produce the next steps (next chapter, revision, assessment, project, interview practice).

### Assessment sizing

- **Chapter test:** `CHAPTER_TEST_SIZE = 10` questions, drawn deterministically from the
  chapter's topic. The topic slice is rotated by a stable hash of the chapter slug so the
  full question bank is exercised across chapters.
- **Module mock:** `MODULE_MOCK_SIZE = 20` questions, assembled from the module's chapter
  questions by `selectMockQuestions`, de-duplicated by prompt.

---

## 5. Assessment flow

```
form submit ─▶ server action ─▶ gradeAttempt (pure) ─▶ persist Attempt + Answers
                                                    └▶ update SkillScore rows
                                                    └▶ ChapterProgress (when applicable)
```

- `gradeAttempt` compares responses against correct options / expected answers and returns
  per-question correctness and awarded points.
- Coding answers are **not** graded in-process. `api/code/run` forwards them to
  `CODE_JUDGE_URL` when configured and otherwise returns an explicit "not run" result.
- Passing thresholds come from `Assessment.passingScore` (default 70).

---

## 6. Project submission & review pipeline

```
upload ─▶ ingest (limits, path safety) ─▶ detect language/shape ─▶ store (UPLOAD_DIR)
                                                             └▶ analyze structure
                                                             └▶ runner compile/test (optional)
                                                             └▶ SubmissionReview (checks[])
```

- **Ingest** enforces size and file-count limits, rejects path traversal and symlinks, and
  classifies each file (`SOURCE`, `TEST`, `CONFIG`, `README`, `SCREENSHOT`, `OTHER`).
- **Detection** identifies the language and project shape (single file, archive, repo).
- **Storage** writes files under `UPLOAD_DIR` (outside the web root) and records `sha256`,
  size and line counts.
- **Review** produces per-category checks (`STRUCTURE`, `COMPILE`, `TESTS`, `REQUIREMENTS`,
  `QUALITY`, `SECURITY`, `DOCUMENTATION`) with a status of `PASS` / `FAIL` / `WARN` /
  `SKIPPED`. Compile and test categories run only when an isolated runner is configured
  (`SANDBOX_RUNNER_URL`, falling back to `CODE_JUDGE_URL`); otherwise they are `SKIPPED`.

The runner contract:

```
POST ${SANDBOX_RUNNER_URL}/review
{ "action": "compile" | "test", "language": string, "files": [{ "path", "content" }] }
→ { "status": "PASS" | "FAIL" | "ERROR", "detail"?, "stdout"?, "stderr"? }
```

---

## 7. Auth & session

- Auth.js / next-auth v5 with a credentials provider and JWT sessions.
- Passwords hashed with bcryptjs.
- The Prisma adapter persists `Account` / `Session` / `VerificationToken`.
- `ADMIN_EMAILS` auto-promotes matching accounts to `ADMIN` on registration.
- Route protection is enforced in layouts and server actions via `session.ts`, not only in
  middleware.

---

## 8. Security posture

- **No in-process execution.** Untrusted code is never run by the web app.
- **Upload safety.** Size/type limits, path sanitisation, no symlink escape, storage
  outside the web root.
- **Secrets.** All credentials live in `.env` (git-ignored); `.env.example` contains
  placeholders only.
- **Validation.** Every form and server action validates input with Zod.
- **Rate limiting.** Sensitive endpoints (code run, reports, submissions) are throttled.
- **Auditability.** Curation changes are recorded in `AdminAuditLog`.

---

## 9. Testing strategy

- Pure domain modules are unit-tested with Vitest: `curriculum`, `gating`, `mock`,
  `scoring`, `recommendation`, `validation`, and the `submissions/*` pipeline.
- `scripts/verify-progress.mts` (`npm run verify:seed`) is an integration smoke test that
  reads through the real Prisma client against a seeded database.

---

## 10. Extension points

| Area                | Where to extend                                                     |
| ------------------- | ------------------------------------------------------------------- |
| New career path     | add to `prisma/seed-data.ts` or regenerate `prisma/paths/course-catalog.ts` |
| New question topic  | add a pack under `prisma/topics/` and register it in `prisma/question-bank.ts` |
| New assessment kind | extend `AssessmentType` and the assembly in `src/lib/mock.ts`       |
| New review check    | add a checker under `src/lib/submissions/` and a `CheckCategory`    |
| AI-assisted text    | wrap `recommendation.ts` output for rephrasing only — never for facts |
| Video verification  | extend `src/lib/video.ts` and the resource metadata                 |

---

## 11. Regenerating the course catalogue

`prisma/paths/course-catalog.ts` is generated from `prisma/data/free-courses-final.csv`:

```bash
npx tsx scripts/generate-course-catalog.mts [input.csv] [output.ts]
```

Each row becomes a `Resource` and a chapter mapped onto a broad/thin career path grouped by
its catalogue category. Do not hand-edit the generated file.
