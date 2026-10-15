export type CheckStatus = "PASS" | "FAIL" | "WARN" | "SKIPPED";

export type CheckCategory =
  | "STRUCTURE"
  | "COMPILE"
  | "TESTS"
  | "REQUIREMENTS"
  | "QUALITY"
  | "SECURITY"
  | "DOCUMENTATION";

export type SubmissionFileKind =
  | "SOURCE"
  | "TEST"
  | "CONFIG"
  | "README"
  | "SCREENSHOT"
  | "OTHER";

export interface SubmissionCheck {
  id: string;
  category: CheckCategory;
  label: string;
  status: CheckStatus;
  detail: string;
  evidence?: string[];
  weight?: number;
}

export interface ReviewFile {
  path: string;
  kind: SubmissionFileKind;
  language: string | null;
  sizeBytes: number;
  lines: number | null;
  text: string | null;
  binary: boolean;
}

export interface ReviewOutcome {
  status: "COMPLETED" | "FAILED";
  score: number | null;
  summary: string;
  checks: SubmissionCheck[];
  environment: string;
  nextActivity: string | null;
}
