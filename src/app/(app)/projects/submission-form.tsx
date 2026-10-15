"use client";

import { useState, type ChangeEvent, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label, FieldHint } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Alert } from "@/components/ui/alert";
import { MAX_ARCHIVE_BYTES, MAX_FILES, MAX_TOTAL_BYTES } from "@/lib/submissions/constants";
import { ReviewResults, type ReviewView } from "./review-results";

export interface ExistingSubmission {
  id: string;
  kind: string | null;
  language: string | null;
  fileCount: number;
  totalBytes: number;
  reviewCount: number;
  repoUrl: string | null;
  liveUrl: string | null;
  notes: string | null;
  status: string;
  submittedAt: string | null;
  reviews: ReviewView[];
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function ProjectSubmissionForm({
  projectSlug,
  existing,
}: {
  projectSlug: string;
  existing: ExistingSubmission | null;
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [review, setReview] = useState<ReviewView | null>(existing?.reviews[0] ?? null);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);

    const repoUrl = String(data.get("repoUrl") ?? "").trim();
    const files = data.getAll("files").filter((value): value is File => value instanceof File && value.size > 0);
    const archives = data.getAll("archive").filter((value): value is File => value instanceof File && value.size > 0);

    if (files.length === 0 && archives.length === 0 && repoUrl === "") {
      setError("Attach at least one source file, a .zip archive, or a repository URL.");
      return;
    }

    setPending(true);
    setError(null);
    setWarnings([]);
    setProgress(0);

    const xhr = new XMLHttpRequest();
    xhr.open("POST", `/api/projects/${projectSlug}/submissions`);
    xhr.upload.onprogress = (progressEvent) => {
      if (progressEvent.lengthComputable) {
        setProgress(Math.round((progressEvent.loaded / progressEvent.total) * 100));
      }
    };
    xhr.onload = () => {
      setPending(false);
      setProgress(100);
      let payload: { error?: string; warnings?: string[]; review?: ReviewView };
      try {
        payload = JSON.parse(xhr.responseText) as typeof payload;
      } catch {
        setError("The server returned an unexpected response.");
        return;
      }
      if (xhr.status >= 400) {
        setError(payload.error ?? "The submission could not be processed.");
        return;
      }
      setReview(payload.review ?? null);
      setWarnings(payload.warnings ?? []);
      router.refresh();
    };
    xhr.onerror = () => {
      setPending(false);
      setError("A network error interrupted the upload. Please try again.");
    };
    xhr.send(data);
  }

  async function rerunReview() {
    if (!existing) return;
    setPending(true);
    setError(null);
    setWarnings([]);
    try {
      const response = await fetch(`/api/projects/submissions/${existing.id}/review`, {
        method: "POST",
      });
      const payload = (await response.json()) as {
        error?: string;
        warnings?: string[];
        review?: ReviewView;
      };
      if (!response.ok) {
        setError(payload.error ?? "The review could not be completed.");
        return;
      }
      setReview(payload.review ?? null);
      setWarnings(payload.warnings ?? []);
      router.refresh();
    } catch {
      setError("A network error interrupted the request. Please try again.");
    } finally {
      setPending(false);
    }
  }

  function handleFiles(event: ChangeEvent<HTMLInputElement>) {
    const selected = Array.from(event.target.files ?? []);
    if (selected.length > MAX_FILES) {
      setError(`Too many files selected; the limit is ${MAX_FILES} per submission.`);
      event.target.value = "";
    }
  }

  return (
    <div className="space-y-5">
      {existing ? (
        <div className="flex flex-wrap items-center gap-2 text-xs text-[var(--color-fg-muted)]">
          <span className="font-medium text-[var(--color-fg)]">Current submission</span>
          <span>·</span>
          <span>{existing.kind ?? "unknown"}</span>
          {existing.language ? (
            <>
              <span>·</span>
              <span>{existing.language}</span>
            </>
          ) : null}
          <span>·</span>
          <span>{existing.fileCount} file{existing.fileCount === 1 ? "" : "s"} ({formatBytes(existing.totalBytes)})</span>
          <span>·</span>
          <span>{existing.reviewCount} review{existing.reviewCount === 1 ? "" : "s"}</span>
        </div>
      ) : null}

      {review ? (
        <ReviewResults review={review} />
      ) : (
        <p className="text-sm text-[var(--color-fg-muted)]">
          No review yet. Upload your work below to run the automated checks.
        </p>
      )}

      {warnings.length > 0 ? (
        <Alert tone="warning" title="Some files were skipped">
          <ul className="list-disc space-y-1 pl-5">
            {warnings.map((warning) => (
              <li key={warning}>{warning}</li>
            ))}
          </ul>
        </Alert>
      ) : null}
      {error ? <Alert tone="danger">{error}</Alert> : null}

      {pending && progress > 0 && progress < 100 ? (
        <div className="h-1.5 w-full overflow-hidden bg-[var(--color-surface-2)]" aria-hidden>
          <div
            className="h-full bg-[var(--color-brand)] transition-[width] duration-200"
            style={{ width: `${progress}%` }}
          />
        </div>
      ) : null}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <Label htmlFor="files">Source files</Label>
          <input
            id="files"
            name="files"
            type="file"
            multiple
            onChange={handleFiles}
            className="block w-full cursor-pointer border border-[var(--color-border-strong)] bg-white px-3 py-2 text-sm file:mr-3 file:border-0 file:bg-[var(--color-surface-2)] file:px-3 file:py-1.5 file:text-sm file:font-medium"
          />
          <FieldHint>
            Text source files are analysed statically. Max {MAX_FILES} files, 2&nbsp;MB each, {formatBytes(MAX_TOTAL_BYTES)} total.
          </FieldHint>
        </div>

        <div>
          <Label htmlFor="archive">Or a .zip archive</Label>
          <input
            id="archive"
            name="archive"
            type="file"
            accept=".zip,application/zip"
            className="block w-full cursor-pointer border border-[var(--color-border-strong)] bg-white px-3 py-2 text-sm file:mr-3 file:border-0 file:bg-[var(--color-surface-2)] file:px-3 file:py-1.5 file:text-sm file:font-medium"
          />
          <FieldHint>Archives are inspected without running anything. Max {formatBytes(MAX_ARCHIVE_BYTES)}.</FieldHint>
        </div>

        <div>
          <Label htmlFor="repoUrl">Repository URL</Label>
          <Input
            id="repoUrl"
            name="repoUrl"
            type="url"
            placeholder="https://github.com/you/project"
            defaultValue={existing?.repoUrl ?? ""}
          />
        </div>

        <div>
          <Label htmlFor="liveUrl">Live demo URL (optional)</Label>
          <Input
            id="liveUrl"
            name="liveUrl"
            type="url"
            placeholder="https://your-demo.example.com"
            defaultValue={existing?.liveUrl ?? ""}
          />
        </div>

        <div>
          <Label htmlFor="notes">Notes / what you learned</Label>
          <Textarea
            id="notes"
            name="notes"
            rows={4}
            placeholder="Approach, trade-offs, what you would improve next…"
            defaultValue={existing?.notes ?? ""}
          />
          <FieldHint>
            Resubmitting replaces the stored files and runs a fresh review. Uploaded code is never executed in-process.
          </FieldHint>
        </div>

        <div className="flex flex-wrap gap-3">
          <Button type="submit" variant="gradient" disabled={pending}>
            {pending ? `Working… ${progress > 0 && progress < 100 ? `${progress}%` : ""}` : "Submit for review"}
          </Button>
          {existing && existing.fileCount > 0 ? (
            <Button type="button" variant="outline" onClick={rerunReview} disabled={pending}>
              Re-run review
            </Button>
          ) : null}
        </div>
      </form>
    </div>
  );
}
