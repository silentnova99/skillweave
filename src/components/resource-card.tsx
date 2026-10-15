"use client";

import { useActionState, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Alert } from "@/components/ui/alert";
import {
  toggleResourceCompleteAction,
  reportResourceAction,
  type ReportState,
} from "@/app/(app)/learn/actions";
import { getVideoEmbed, VIDEO_KIND_LABEL } from "@/lib/video";

export interface ResourceCardData {
  chapterResourceId: string;
  chapterId: string;
  pathSlug: string;
  chapterSlug: string;
  role: string;
  chapterNote: string | null;
  completed: boolean;
  resource: {
    id: string;
    title: string;
    url: string;
    publisher: string;
    author: string | null;
    type: string;
    provider: string | null;
    videoKind: string | null;
    difficulty: string;
    estimatedMinutes: number | null;
    isFree: boolean;
    accessNotes: string | null;
    license: string | null;
    licenseUrl: string | null;
    status: string;
    verificationNote: string | null;
    lastVerifiedAt: string | null;
  };
}

const ROLE_LABEL: Record<string, string> = {
  PRIMARY: "Primary",
  ALTERNATIVE: "Alternative",
  EXAMPLE: "Example",
  EXERCISE: "Exercise",
  ADVANCED_REFERENCE: "Advanced",
  REVISION: "Revision",
};

const STATUS_TONE: Record<string, "success" | "warning" | "neutral" | "danger"> = {
  VERIFIED: "success",
  UNVERIFIED: "warning",
  BROKEN: "danger",
  DEPRECATED: "neutral",
};

export function ResourceCard({ data }: { data: ResourceCardData }) {
  const [reportState, reportAction, reportPending] = useActionState<ReportState, FormData>(
    reportResourceAction,
    null,
  );
  const [showReport, setShowReport] = useState(false);
  const { resource } = data;
  const embed = resource.type === "VIDEO" ? getVideoEmbed(resource.url, resource.videoKind) : null;

  return (
    <div className="rounded-none border border-[var(--color-border)] bg-white p-4">
      <div className="flex flex-wrap items-center gap-2">
        <Badge tone="outline">{ROLE_LABEL[data.role] ?? data.role}</Badge>
        <Badge tone={STATUS_TONE[resource.status] ?? "neutral"}>
          {resource.status.toLowerCase()}
        </Badge>
        {embed ? <Badge tone="brand">{VIDEO_KIND_LABEL[embed.kind]}</Badge> : null}
        {resource.isFree ? <Badge tone="neutral">Free</Badge> : null}
        {data.completed ? <Badge tone="success">Completed</Badge> : null}
      </div>

      {embed ? (
        <div className="mt-3 overflow-hidden rounded-none border border-[var(--color-border)] bg-black">
          <iframe
            src={embed.embedUrl}
            title={resource.title}
            loading="lazy"
            className="aspect-video w-full"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            referrerPolicy="strict-origin-when-cross-origin"
            allowFullScreen
          />
        </div>
      ) : null}

      <a
        href={resource.url}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-2 block font-medium text-[var(--color-brand)] hover:underline"
      >
        {resource.title}
      </a>

      <p className="mt-1 text-xs text-[var(--color-fg-muted)]">
        {resource.publisher}
        {resource.author ? ` · ${resource.author}` : ""} · {resource.type.toLowerCase().replace(/_/g, " ")}
        {resource.estimatedMinutes ? ` · ~${resource.estimatedMinutes} min` : ""} ·{" "}
        {resource.difficulty.toLowerCase().replace(/_/g, " ")}
      </p>

      {data.chapterNote ? (
        <p className="mt-2 text-sm text-[var(--color-fg)]">{data.chapterNote}</p>
      ) : null}

      {resource.accessNotes ? (
        <p className="mt-2 text-sm text-[var(--color-fg-muted)]">{resource.accessNotes}</p>
      ) : null}

      {resource.license ? (
        <p className="mt-2 text-xs text-[var(--color-fg-subtle)]">
          License: {resource.licenseUrl ? (
            <a
              href={resource.licenseUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[var(--color-brand)] hover:underline"
            >
              {resource.license}
            </a>
          ) : (
            resource.license
          )}
        </p>
      ) : null}

      {resource.verificationNote ? (
        <p className="mt-2 text-xs text-[var(--color-fg-subtle)]">
          Curation note: {resource.verificationNote}
        </p>
      ) : null}

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <form action={toggleResourceCompleteAction}>
          <input type="hidden" name="chapterResourceId" value={data.chapterResourceId} />
          <input type="hidden" name="chapterId" value={data.chapterId} />
          <input type="hidden" name="pathSlug" value={data.pathSlug} />
          <input type="hidden" name="chapterSlug" value={data.chapterSlug} />
          <Button variant={data.completed ? "secondary" : "outline"} size="sm" type="submit">
            {data.completed ? "Completed ✓" : "Mark as read"}
          </Button>
        </form>

        <Button variant="ghost" size="sm" onClick={() => setShowReport((v) => !v)}>
          {showReport ? "Cancel report" : "Report a problem"}
        </Button>
      </div>

      {showReport ? (
        <form action={reportAction} className="mt-3 space-y-2 rounded-none bg-[var(--color-surface)] p-3">
          {reportState?.ok ? (
            <Alert tone="success">Thanks — your report was submitted for review.</Alert>
          ) : null}
          {reportState?.error ? <Alert tone="danger">{reportState.error}</Alert> : null}
          <input type="hidden" name="resourceId" value={resource.id} />
          <input type="hidden" name="chapterId" value={data.chapterId} />
          <Select name="kind" defaultValue="BROKEN_LINK" aria-label="Report kind">
            <option value="BROKEN_LINK">Broken link</option>
            <option value="INCORRECT_MAPPING">Incorrect mapping</option>
            <option value="ACCESS_CHANGED">Access or pricing changed</option>
            <option value="OTHER">Other</option>
          </Select>
          <Textarea
            name="message"
            rows={2}
            required
            placeholder="What is wrong with this resource?"
            aria-label="Report message"
          />
          <Button type="submit" size="sm" disabled={reportPending}>
            {reportPending ? "Sending…" : "Submit report"}
          </Button>
        </form>
      ) : null}
    </div>
  );
}
