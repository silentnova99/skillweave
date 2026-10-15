import {
  checkDocumentation,
  checkPlaintextSecrets,
  checkProviderSecrets,
  checkQuality,
  checkRequirements,
  checkRiskyPatterns,
  checkStructure,
} from "@/lib/submissions/analyze";
import type {
  ReviewFile,
  ReviewOutcome,
  SubmissionCheck,
} from "@/lib/submissions/types";

export interface ReviewContext {
  files: ReviewFile[];
  acceptanceCriteria: string[];
  language: string | null;
}

function sandboxConfig(): { mode: string; runner: string | null } {
  const runner = process.env.SANDBOX_RUNNER_URL ?? process.env.CODE_JUDGE_URL ?? null;
  const mode = process.env.SANDBOX_MODE ?? (runner ? "remote" : "disabled");
  return { mode, runner };
}

function sandboxPayload(files: ReviewFile[]): { path: string; content: string }[] {
  const payload: { path: string; content: string }[] = [];
  let total = 0;
  for (const file of files) {
    if (file.text === null) continue;
    if (total + file.text.length > 1_500_000) break;
    payload.push({ path: file.path, content: file.text });
    total += file.text.length;
  }
  return payload;
}

async function runSandboxCheck(
  action: "compile" | "test",
  ctx: ReviewContext,
): Promise<SubmissionCheck> {
  const { runner, mode } = sandboxConfig();
  const label = action === "compile" ? "Compilation / syntax" : "Automated tests";

  if (runner === null) {
    return {
      id: action === "compile" ? "compile" : "tests",
      category: action === "compile" ? "COMPILE" : "TESTS",
      label,
      status: "SKIPPED",
      detail:
        "This check only runs inside an isolated sandbox. Configure SANDBOX_RUNNER_URL to execute it — SkillWeave never runs uploaded code in-process.",
      weight: action === "test" ? 3 : 1,
    };
  }

  try {
    const response = await fetch(`${runner.replace(/\/$/, "")}/review`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        ...(process.env.SANDBOX_RUNNER_TOKEN
          ? { authorization: `Bearer ${process.env.SANDBOX_RUNNER_TOKEN}` }
          : {}),
      },
      body: JSON.stringify(
        {
          action,
          language: ctx.language,
          files: sandboxPayload(ctx.files),
        },
        null,
        0,
      ),
      signal: AbortSignal.timeout(90_000),
    });

    if (!response.ok) {
      return {
        id: action === "compile" ? "compile" : "tests",
        category: action === "compile" ? "COMPILE" : "TESTS",
        label,
        status: "SKIPPED",
        detail: `The sandbox runner responded with HTTP ${response.status}; ${label.toLowerCase()} could not be evaluated.`,
        weight: action === "test" ? 3 : 1,
      };
    }

    const data = (await response.json()) as {
      status?: string;
      detail?: string;
      stdout?: string;
      stderr?: string;
    };
    const raw = (data.status ?? "").toUpperCase();
    const status = raw === "PASS" ? "PASS" : raw === "FAIL" ? "FAIL" : "WARN";
    const output = [data.stdout, data.stderr]
      .filter((value): value is string => Boolean(value && value.trim()))
      .join("\n")
      .split("\n")
      .slice(0, 20);

    return {
      id: action === "compile" ? "compile" : "tests",
      category: action === "compile" ? "COMPILE" : "TESTS",
      label,
      status,
      detail: data.detail ?? `${label} executed in the isolated sandbox.`,
      evidence: output.length > 0 ? output : undefined,
      weight: action === "test" ? 3 : 1,
    };
  } catch {
    return {
      id: action === "compile" ? "compile" : "tests",
      category: action === "compile" ? "COMPILE" : "TESTS",
      label,
      status: "SKIPPED",
      detail: `The sandbox runner (${mode}) was unreachable, so "${label.toLowerCase()}" could not be evaluated.`,
      weight: action === "test" ? 3 : 1,
    };
  }
}

function scoreOf(checks: SubmissionCheck[]): number | null {
  const scored = checks.filter(
    (check) => check.status === "PASS" || check.status === "FAIL" || check.status === "WARN",
  );
  const denominator = scored.reduce((sum, check) => sum + (check.weight ?? 1), 0);
  if (denominator === 0) return null;
  const numerator = scored.reduce((sum, check) => {
    const weight = check.weight ?? 1;
    const value = check.status === "PASS" ? 1 : check.status === "WARN" ? 0.5 : 0;
    return sum + weight * value;
  }, 0);
  return Math.round((numerator / denominator) * 100);
}

function nextActivityFor(checks: SubmissionCheck[]): string {
  const failing = checks.find((check) => check.status === "FAIL");
  if (failing) return `${failing.label}: ${failing.detail}`;

  const testsSkipped = checks.find((check) => check.id === "tests" && check.status === "SKIPPED");
  const docsWarn = checks.find((check) => check.category === "DOCUMENTATION" && check.status !== "PASS");
  if (docsWarn) return "Add a README that explains setup, usage and how to run your tests, then resubmit.";

  const structureWarn = checks.find((check) => check.category === "STRUCTURE" && check.status !== "PASS");
  if (structureWarn) return `${structureWarn.label}: ${structureWarn.detail}`;

  if (testsSkipped) return "Enable the sandboxed test runner to execute your suite automatically, or run the tests locally and paste the output into your notes.";

  const securityWarn = checks.find((check) => check.category === "SECURITY" && check.status === "WARN");
  if (securityWarn) return "Review the flagged security warnings and confirm each is intentional.";

  return "All automated checks passed. Consider the extension challenges, or move on to the next project.";
}

export function runRepositoryReview(repoUrl: string | null): ReviewOutcome {
  const checks: SubmissionCheck[] = [
    {
      id: "structure-repository",
      category: "STRUCTURE",
      label: "Repository provided",
      status: repoUrl ? "WARN" : "FAIL",
      detail: repoUrl
        ? "Only a repository URL was submitted, so source analysis could not run. Upload files or a .zip archive for automated checks."
        : "No repository URL or source files were provided.",
      weight: 2,
    },
  ];

  return {
    status: "COMPLETED",
    score: null,
    summary: "Repository-only submission · automated source analysis skipped",
    checks,
    environment: "repository-only",
    nextActivity:
      "Upload your source files (or a .zip archive) to run static analysis, security scanning and test execution.",
  };
}

export async function runReview(ctx: ReviewContext): Promise<ReviewOutcome> {
  const { mode } = sandboxConfig();

  const [compile, tests] = await Promise.all([
    runSandboxCheck("compile", ctx),
    runSandboxCheck("test", ctx),
  ]);

  const checks: SubmissionCheck[] = [
    ...checkStructure(ctx.files),
    ...checkDocumentation(ctx.files),
    compile,
    tests,
    ...checkQuality(ctx.files),
    checkProviderSecrets(ctx.files),
    checkPlaintextSecrets(ctx.files),
    checkRiskyPatterns(ctx.files),
    checkRequirements(ctx.acceptanceCriteria, ctx.files),
  ];

  const passed = checks.filter((check) => check.status === "PASS").length;
  const warnings = checks.filter((check) => check.status === "WARN").length;
  const failed = checks.filter((check) => check.status === "FAIL").length;
  const skipped = checks.filter((check) => check.status === "SKIPPED").length;
  const score = scoreOf(checks);

  const summary = [
    `${passed} passed`,
    `${warnings} warning${warnings === 1 ? "" : "s"}`,
    `${failed} failed`,
    `${skipped} skipped`,
    score === null ? "no score" : `score ${score}/100`,
  ].join(" · ");

  return {
    status: "COMPLETED",
    score,
    summary,
    checks,
    environment: `static-analysis; sandbox=${mode}`,
    nextActivity: nextActivityFor(checks),
  };
}
