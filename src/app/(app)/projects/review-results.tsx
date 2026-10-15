import { Badge } from "@/components/ui/badge";
import type { CheckCategory, CheckStatus, SubmissionCheck } from "@/lib/submissions/types";
import { cn } from "@/lib/utils";

const CATEGORY_ORDER: CheckCategory[] = [
  "STRUCTURE",
  "COMPILE",
  "TESTS",
  "REQUIREMENTS",
  "QUALITY",
  "SECURITY",
  "DOCUMENTATION",
];

const CATEGORY_LABEL: Record<CheckCategory, string> = {
  STRUCTURE: "Structure",
  COMPILE: "Compilation",
  TESTS: "Tests",
  REQUIREMENTS: "Requirements",
  QUALITY: "Code quality",
  SECURITY: "Security",
  DOCUMENTATION: "Documentation",
};

const STATUS_TONE: Record<CheckStatus, "success" | "danger" | "warning" | "neutral"> = {
  PASS: "success",
  FAIL: "danger",
  WARN: "warning",
  SKIPPED: "neutral",
};

const STATUS_LABEL: Record<CheckStatus, string> = {
  PASS: "pass",
  FAIL: "fail",
  WARN: "warning",
  SKIPPED: "skipped",
};

export interface ReviewView {
  runNumber: number;
  status: string;
  score: number | null;
  summary: string;
  checks: SubmissionCheck[];
  environment: string | null;
  nextActivity: string | null;
  createdAt?: string;
}

export function ReviewResults({ review }: { review: ReviewView }) {
  const byCategory = CATEGORY_ORDER.map((category) => ({
    category,
    checks: review.checks.filter((check) => check.category === category),
  })).filter((group) => group.checks.length > 0);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-4 border border-[var(--color-border)] bg-[var(--color-surface-2)] px-4 py-3">
        <div className="flex items-baseline gap-1">
          <span className="text-3xl font-semibold text-[var(--color-fg)]">
            {review.score === null ? "—" : review.score}
          </span>
          <span className="text-sm text-[var(--color-fg-muted)]">/ 100</span>
        </div>
        <div className="min-w-0">
          <p className="text-sm font-medium text-[var(--color-fg)]">
            Review run #{review.runNumber}
          </p>
          <p className="text-xs text-[var(--color-fg-muted)]">{review.summary}</p>
        </div>
        {review.environment ? (
          <span className="ml-auto text-xs text-[var(--color-fg-subtle)]">{review.environment}</span>
        ) : null}
      </div>

      <div className="space-y-4">
        {byCategory.map((group) => (
          <div key={group.category}>
            <p className="eyebrow mb-2 text-[var(--color-fg-subtle)]">
              {CATEGORY_LABEL[group.category]}
            </p>
            <ul className="divide-y divide-[var(--color-border)] border border-[var(--color-border)]">
              {group.checks.map((check) => (
                <li key={check.id} className="px-4 py-3">
                  <div className="flex items-start justify-between gap-3">
                    <p className="text-sm font-medium text-[var(--color-fg)]">{check.label}</p>
                    <Badge tone={STATUS_TONE[check.status]}>{STATUS_LABEL[check.status]}</Badge>
                  </div>
                  <p className="mt-1 text-sm text-[var(--color-fg-muted)]">{check.detail}</p>
                  {check.evidence && check.evidence.length > 0 ? (
                    <pre className="thin-scroll mt-2 max-h-48 overflow-auto whitespace-pre-wrap border border-[var(--color-border)] bg-[var(--color-surface-2)] p-2 text-xs text-[var(--color-fg-muted)]">
                      {check.evidence.join("\n")}
                    </pre>
                  ) : null}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      {review.nextActivity ? (
        <div
          className={cn(
            "border-l-2 border-[var(--color-brand)] bg-[var(--color-brand-soft)] px-4 py-3 text-sm text-[var(--color-fg)]",
          )}
        >
          <p className="font-medium">Next step</p>
          <p className="text-[var(--color-fg-muted)]">{review.nextActivity}</p>
        </div>
      ) : null}
    </div>
  );
}
