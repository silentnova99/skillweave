import type {
  CheckStatus,
  ReviewFile,
  SubmissionCheck,
} from "@/lib/submissions/types";

const PLACEHOLDER = /(example|sample|placeholder|changeme|change_me|your[_-]?|xxxx|dummy|redacted|<[^>]+>)/i;

const PROVIDER_SECRET_PATTERNS: { id: string; label: string; re: RegExp }[] = [
  { id: "aws-access-key", label: "AWS access key id", re: /AKIA[0-9A-Z]{16}/ },
  { id: "private-key", label: "Private key block", re: /-----BEGIN (?:[A-Z]+ )?PRIVATE KEY-----/ },
  { id: "github-token", label: "GitHub token", re: /gh[pousr]_[A-Za-z0-9]{36,}/ },
  { id: "slack-token", label: "Slack token", re: /xox[baprs]-[A-Za-z0-9-]{10,}/ },
  { id: "google-api-key", label: "Google API key", re: /AIza[0-9A-Za-z_-]{35}/ },
  { id: "stripe-secret", label: "Stripe secret key", re: /sk_live_[0-9A-Za-z]{20,}/ },
  { id: "jwt", label: "JSON Web Token", re: /eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{6,}/ },
];

const GENERIC_SECRET =
  /(password|passwd|pwd|secret|api[_-]?key|access[_-]?token|auth[_-]?token|client[_-]?secret)\s*[:=]\s*['"]([^'"\n]{6,})['"]/gi;

const DANGEROUS_PATTERNS: { id: string; label: string; re: RegExp }[] = [
  { id: "eval", label: "eval()", re: /\beval\s*\(/ },
  { id: "exec", label: "exec() / dynamic code execution", re: /\bexec\s*\(/ },
  { id: "os-system", label: "os.system()", re: /\bos\.system\s*\(/ },
  { id: "subprocess-shell", label: "subprocess with shell=True", re: /subprocess\.\w+\s*\([^)]*shell\s*=\s*True/ },
  { id: "pickle", label: "pickle deserialization", re: /\bpickle\.loads?\s*\(/ },
  { id: "yaml-load", label: "yaml.load() (prefer a safe loader)", re: /\byaml\.load\s*\(/ },
  { id: "innerhtml", label: "innerHTML assignment", re: /\.innerHTML\s*=/ },
  { id: "child-process", label: "child_process execution", re: /(require\(['"]child_process['"]\)|from\s+['"]child_process['"]|child_process\.(exec|spawn))/ },
  { id: "new-function", label: "Function constructor", re: /\bnew Function\s*\(/ },
  { id: "plain-http", label: "Plaintext http:// URL", re: /http:\/\/(?!localhost|127\.0\.0\.1)/ },
  { id: "sql-concat", label: "Possible SQL string building", re: /(SELECT|INSERT INTO|UPDATE|DELETE FROM)[^\n;]*(\+|\$\{|%s|\.format\(|f["'])/i },
];

function textFiles(files: ReviewFile[]): ReviewFile[] {
  return files.filter((file) => file.text !== null);
}

function scanLines(
  files: ReviewFile[],
  patterns: { id: string; label: string; re: RegExp }[],
  limit = 15,
): { id: string; label: string; path: string; line: number }[] {
  const found: { id: string; label: string; path: string; line: number }[] = [];
  for (const file of textFiles(files)) {
    const lines = (file.text ?? "").split("\n");
    for (let index = 0; index < lines.length; index += 1) {
      const line = lines[index];
      for (const pattern of patterns) {
        pattern.re.lastIndex = 0;
        if (pattern.re.test(line)) {
          found.push({ id: pattern.id, label: pattern.label, path: file.path, line: index + 1 });
        }
      }
    }
    if (found.length >= limit) break;
  }
  return found.slice(0, limit);
}

export function checkProviderSecrets(files: ReviewFile[]): SubmissionCheck {
  const findings = scanLines(files, PROVIDER_SECRET_PATTERNS);
  const evidence = findings.map((f) => `${f.path}:${f.line} — ${f.label}`);
  const status: CheckStatus = findings.length > 0 ? "FAIL" : "PASS";
  return {
    id: "security-provider-secrets",
    category: "SECURITY",
    label: "No committed provider credentials",
    status,
    detail:
      findings.length > 0
        ? `Found ${findings.length} likely live credential${findings.length === 1 ? "" : "s"}. Remove them, rotate the keys, and use environment variables.`
        : "No AWS keys, private keys or known provider tokens detected in the uploaded source.",
    evidence: evidence.length > 0 ? evidence : undefined,
    weight: 3,
  };
}

export function checkPlaintextSecrets(files: ReviewFile[]): SubmissionCheck {
  const evidence: string[] = [];
  for (const file of textFiles(files)) {
    const lines = (file.text ?? "").split("\n");
    for (let index = 0; index < lines.length; index += 1) {
      GENERIC_SECRET.lastIndex = 0;
      let match: RegExpExecArray | null;
      while ((match = GENERIC_SECRET.exec(lines[index])) !== null) {
        if (!PLACEHOLDER.test(match[2])) {
          evidence.push(`${file.path}:${index + 1} — ${match[1]} assigned a literal value`);
        }
      }
    }
    if (evidence.length >= 15) break;
  }
  return {
    id: "security-plaintext-secrets",
    category: "SECURITY",
    label: "No hardcoded secret assignments",
    status: evidence.length > 0 ? "WARN" : "PASS",
    detail:
      evidence.length > 0
        ? `${evidence.length} assignment${evidence.length === 1 ? "" : "s"} appear to hardcode a secret. Prefer environment variables or a secrets manager.`
        : "No literal values assigned to password/secret/token-style variables were detected.",
    evidence: evidence.length > 0 ? evidence.slice(0, 15) : undefined,
    weight: 2,
  };
}

export function checkRiskyPatterns(files: ReviewFile[]): SubmissionCheck {
  const findings = scanLines(files, DANGEROUS_PATTERNS);
  const evidence = findings.map((f) => `${f.path}:${f.line} — ${f.label}`);
  return {
    id: "security-risky-patterns",
    category: "SECURITY",
    label: "Risky code patterns reviewed",
    status: findings.length > 0 ? "WARN" : "PASS",
    detail:
      findings.length > 0
        ? `Flagged ${findings.length} construct${findings.length === 1 ? " that deserves" : "s that deserve"} a manual look (e.g. dynamic execution, unsafe deserialization). These are warnings, not failures.`
        : "No obviously risky constructs (eval/exec/unsafe deserialization/string-built SQL) were detected.",
    evidence: evidence.length > 0 ? evidence : undefined,
    weight: 1,
  };
}

export function checkStructure(files: ReviewFile[]): SubmissionCheck[] {
  const source = files.filter((f) => f.kind === "SOURCE");
  const tests = files.filter((f) => f.kind === "TEST");
  const manifest = files.filter(
    (f) =>
      f.kind === "CONFIG" &&
      ["package.json", "requirements.txt", "pyproject.toml", "go.mod", "pom.xml", "cargo.toml", "composer.json", "build.gradle", "gemfile", "makefile", "dockerfile"].includes(
        (f.path.split("/").pop() ?? "").toLowerCase(),
      ),
  );
  const binary = files.filter((f) => f.binary && f.kind !== "SCREENSHOT");

  const checks: SubmissionCheck[] = [];

  checks.push({
    id: "structure-source",
    category: "STRUCTURE",
    label: "Source files present",
    status: source.length > 0 ? "PASS" : "FAIL",
    detail:
      source.length > 0
        ? `${source.length} source file${source.length === 1 ? "" : "s"} detected.`
        : "No source files were found in the submission.",
    evidence: source.slice(0, 12).map((f) => f.path),
    weight: 3,
  });

  checks.push({
    id: "structure-manifest",
    category: "STRUCTURE",
    label: "Build / dependency manifest",
    status: manifest.length > 0 ? "PASS" : "WARN",
    detail:
      manifest.length > 0
        ? `Manifest detected: ${manifest.map((f) => f.path.split("/").pop()).join(", ")}.`
        : "No dependency manifest (package.json, requirements.txt, go.mod, …) was found; reviewers cannot reproduce your environment reliably.",
    evidence: manifest.map((f) => f.path),
    weight: 1,
  });

  checks.push({
    id: "structure-tests",
    category: "STRUCTURE",
    label: "Automated tests included",
    status: tests.length > 0 ? "PASS" : "WARN",
    detail:
      tests.length > 0
        ? `${tests.length} test file${tests.length === 1 ? "" : "s"} detected.`
        : "No test files were detected. Add tests so behaviour is verifiable.",
    evidence: tests.slice(0, 12).map((f) => f.path),
    weight: 2,
  });

  checks.push({
    id: "structure-binaries",
    category: "STRUCTURE",
    label: "No unexpected binaries",
    status: binary.length > 0 ? "WARN" : "PASS",
    detail:
      binary.length > 0
        ? `${binary.length} binary file${binary.length === 1 ? "" : "s"} uploaded. Binaries are stored but never executed or inspected.`
        : "Only text/source artifacts were uploaded.",
    evidence: binary.slice(0, 12).map((f) => f.path),
    weight: 1,
  });

  return checks;
}

export function checkDocumentation(files: ReviewFile[]): SubmissionCheck[] {
  const readme = files.find((f) => f.kind === "README");
  const readmeText = readme?.text ?? "";
  const hasInstructions = /(install|setup|getting started|usage|how to run|npm |pip |docker )/i.test(readmeText);
  const hasTestDocs = /(test|spec|lint)/i.test(readmeText);
  const license = files.find((f) => /^license(\.|$)/i.test(f.path.split("/").pop() ?? ""));

  return [
    {
      id: "docs-readme",
      category: "DOCUMENTATION",
      label: "README present",
      status: readme ? "PASS" : "FAIL",
      detail: readme ? `README found at ${readme.path}.` : "No README was found describing the project.",
      evidence: readme ? [readme.path] : undefined,
      weight: 3,
    },
    {
      id: "docs-setup",
      category: "DOCUMENTATION",
      label: "Setup / usage documented",
      status: !readme ? "SKIPPED" : hasInstructions ? "PASS" : "WARN",
      detail: !readme
        ? "Skipped because there is no README to inspect."
        : hasInstructions
          ? "The README appears to explain installation or usage."
          : "The README does not clearly explain how to install or run the project.",
      weight: 2,
    },
    {
      id: "docs-tests",
      category: "DOCUMENTATION",
      label: "How to run tests documented",
      status: !readme ? "SKIPPED" : hasTestDocs ? "PASS" : "WARN",
      detail: !readme
        ? "Skipped because there is no README to inspect."
        : hasTestDocs
          ? "The README mentions how to run tests."
          : "The README does not mention how to run tests or lint.",
      weight: 1,
    },
    {
      id: "docs-license",
      category: "DOCUMENTATION",
      label: "License file",
      status: license ? "PASS" : "WARN",
      detail: license ? `License file found at ${license.path}.` : "No LICENSE file was found.",
      evidence: license ? [license.path] : undefined,
      weight: 1,
    },
  ];
}

export function checkQuality(files: ReviewFile[]): SubmissionCheck[] {
  const source = textFiles(files).filter((f) => f.kind === "SOURCE" || f.kind === "TEST");
  const empty = source.filter((f) => (f.text ?? "").trim().length === 0);
  const oversized = source.filter((f) => (f.lines ?? 0) > 800);

  const todoEvidence: string[] = [];
  for (const file of source) {
    const lines = (file.text ?? "").split("\n");
    for (let index = 0; index < lines.length; index += 1) {
      if (/(TODO|FIXME|HACK|XXX)/.test(lines[index])) {
        todoEvidence.push(`${file.path}:${index + 1}`);
      }
    }
    if (todoEvidence.length >= 15) break;
  }

  return [
    {
      id: "quality-empty",
      category: "QUALITY",
      label: "No empty source files",
      status: empty.length > 0 ? "WARN" : "PASS",
      detail:
        empty.length > 0
          ? `${empty.length} source file${empty.length === 1 ? " is" : "s are"} empty.`
          : "No empty source files detected.",
      evidence: empty.map((f) => f.path),
      weight: 1,
    },
    {
      id: "quality-size",
      category: "QUALITY",
      label: "Files are reasonably sized",
      status: oversized.length > 0 ? "WARN" : "PASS",
      detail:
        oversized.length > 0
          ? `${oversized.length} file${oversized.length === 1 ? "" : "s"} exceed 800 lines; consider splitting them.`
          : "No source file exceeds 800 lines.",
      evidence: oversized.map((f) => f.path),
      weight: 1,
    },
    {
      id: "quality-todos",
      category: "QUALITY",
      label: "Unfinished markers reviewed",
      status: todoEvidence.length > 0 ? "WARN" : "PASS",
      detail:
        todoEvidence.length > 0
          ? `${todoEvidence.length} TODO/FIXME marker${todoEvidence.length === 1 ? "" : "s"} remain in the code.`
          : "No TODO/FIXME markers detected.",
      evidence: todoEvidence.length > 0 ? todoEvidence : undefined,
      weight: 1,
    },
  ];
}

const STOPWORDS = new Set([
  "the", "and", "for", "with", "that", "this", "from", "your", "have", "must",
  "should", "will", "into", "when", "then", "than", "using", "use", "can",
  "able", "make", "made", "each", "some", "such", "which", "their", "them",
  "build", "create", "write", "implement", "ensure", "provide", "support",
]);

export function checkRequirements(
  criteria: string[],
  files: ReviewFile[],
): SubmissionCheck {
  if (criteria.length === 0) {
    return {
      id: "requirements-coverage",
      category: "REQUIREMENTS",
      label: "Acceptance criteria coverage",
      status: "SKIPPED",
      detail: "This project defines no acceptance criteria, so no coverage check was possible.",
      weight: 0,
    };
  }

  const corpus = files
    .map((f) => `${f.path}\n${(f.text ?? "").slice(0, 200000)}`)
    .join("\n")
    .toLowerCase();

  const matched: string[] = [];
  const unmatched: string[] = [];

  for (const criterion of criteria) {
    const tokens = criterion
      .toLowerCase()
      .split(/[^a-z0-9+#]+/)
      .filter((token) => token.length >= 4 && !STOPWORDS.has(token));
    const unique = Array.from(new Set(tokens));
    const hits = unique.filter((token) => corpus.includes(token));
    const covered = unique.length === 0 ? false : hits.length / unique.length >= 0.4;
    if (covered) matched.push(criterion);
    else unmatched.push(criterion);
  }

  return {
    id: "requirements-coverage",
    category: "REQUIREMENTS",
    label: "Acceptance criteria coverage (heuristic)",
    status: unmatched.length === 0 ? "PASS" : "WARN",
    detail: `Heuristic keyword match: ${matched.length}/${criteria.length} criteria appear to be addressed. This cannot prove correctness — treat it as a checklist prompt, not a verdict.`,
    evidence:
      unmatched.length > 0
        ? unmatched.slice(0, 8).map((c) => `Not clearly addressed: ${c}`)
        : undefined,
    weight: 2,
  };
}
