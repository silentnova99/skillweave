import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { rateLimit } from "@/lib/rate-limit";
import { MAX_ARCHIVE_BYTES, ZIP_LIMITS } from "@/lib/submissions/constants";
import { ingest, type RawUpload } from "@/lib/submissions/ingest";
import { readZip } from "@/lib/submissions/zip";
import { runRepositoryReview, runReview } from "@/lib/submissions/review";
import { saveSubmissionFiles } from "@/lib/submissions/storage";
import type { ReviewFile } from "@/lib/submissions/types";

export const runtime = "nodejs";

const metaSchema = z.object({
  repoUrl: z.string().trim().url("Enter a valid repository URL").optional().or(z.literal("")),
  liveUrl: z.string().trim().url("Enter a valid live URL").optional().or(z.literal("")),
  notes: z.string().trim().max(4000).optional().or(z.literal("")),
});

async function readArchive(file: File, errors: string[]): Promise<RawUpload[]> {
  const buffer = Buffer.from(await file.arrayBuffer());
  if (buffer.length > MAX_ARCHIVE_BYTES) {
    errors.push(`Archive "${file.name}" exceeds the ${MAX_ARCHIVE_BYTES}-byte limit.`);
    return [];
  }
  const { entries, errors: zipErrors } = readZip(buffer, ZIP_LIMITS);
  errors.push(...zipErrors);
  return entries.map((entry) => ({ name: entry.name, data: entry.data }));
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;

  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  }

  const limit = rateLimit(`submission:${user.id}`, 10, 60_000);
  if (!limit.ok) {
    return NextResponse.json(
      { error: "Too many submissions. Please wait a moment and try again." },
      { status: 429 },
    );
  }

  const project = await prisma.project.findUnique({
    where: { slug },
    select: { id: true, acceptanceCriteria: true },
  });
  if (!project) {
    return NextResponse.json({ error: "Project not found." }, { status: 404 });
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json({ error: "Invalid upload payload." }, { status: 400 });
  }

  const parsedMeta = metaSchema.safeParse({
    repoUrl: formData.get("repoUrl") ?? "",
    liveUrl: formData.get("liveUrl") ?? "",
    notes: formData.get("notes") ?? "",
  });
  if (!parsedMeta.success) {
    return NextResponse.json(
      { error: parsedMeta.error.issues[0]?.message ?? "Invalid submission." },
      { status: 422 },
    );
  }

  const errors: string[] = [];
  const uploads: RawUpload[] = [];
  let usedArchive = false;
  let usedFiles = false;

  for (const entry of formData.getAll("files")) {
    if (entry instanceof File && entry.size > 0) {
      usedFiles = true;
      uploads.push({ name: entry.name, data: Buffer.from(await entry.arrayBuffer()) });
    }
  }
  for (const entry of formData.getAll("archive")) {
    if (entry instanceof File && entry.size > 0) {
      usedArchive = true;
      uploads.push(...(await readArchive(entry, errors)));
    }
  }

  const repoUrl = parsedMeta.data.repoUrl || null;
  const liveUrl = parsedMeta.data.liveUrl || null;
  const notes = parsedMeta.data.notes || null;

  if (uploads.length === 0 && repoUrl === null) {
    return NextResponse.json(
      { error: "Attach your source files or a .zip archive, or provide a repository URL." },
      { status: 422 },
    );
  }

  try {
    const ingested = ingest(uploads);
    errors.push(...ingested.errors);

    if (ingested.files.length === 0 && repoUrl === null) {
      return NextResponse.json(
        { error: errors[0] ?? "No usable files were found in the upload." },
        { status: 422 },
      );
    }

    const existing = await prisma.projectSubmission.findFirst({
      where: { userId: user.id, projectId: project.id },
      select: { id: true, reviewCount: true },
    });

    const kind =
      ingested.files.length === 0 ? "repository" : usedArchive ? "archive" : usedFiles ? "source" : "repository";

    const baseData = {
      repoUrl,
      liveUrl,
      notes,
      kind,
      language: ingested.language,
      fileCount: ingested.files.length,
      totalBytes: ingested.totalBytes,
      status: "SUBMITTED" as const,
      submittedAt: new Date(),
    };

    const submission = existing
      ? await prisma.projectSubmission.update({ where: { id: existing.id }, data: baseData })
      : await prisma.projectSubmission.create({
          data: { userId: user.id, projectId: project.id, ...baseData },
        });

    if (ingested.files.length > 0) {
      await prisma.submissionFile.deleteMany({ where: { submissionId: submission.id } });
      const keys = await saveSubmissionFiles(submission.id, ingested.stored);
      await prisma.submissionFile.createMany({
        data: ingested.files.map((file) => ({
          submissionId: submission.id,
          path: file.path,
          kind: file.kind,
          language: file.language,
          sizeBytes: file.sizeBytes,
          lines: file.lines,
          sha256: file.sha256,
          storageKey: keys[file.path] ?? null,
          excerpt: file.text === null ? null : file.text.slice(0, 400),
        })),
      });
    }

    const started = Date.now();
    const reviewFiles: ReviewFile[] = ingested.files.map((file) => ({
      path: file.path,
      kind: file.kind,
      language: file.language,
      sizeBytes: file.sizeBytes,
      lines: file.lines,
      text: file.text,
      binary: file.binary,
    }));

    const outcome =
      reviewFiles.length === 0
        ? runRepositoryReview(repoUrl)
        : await runReview({
            files: reviewFiles,
            acceptanceCriteria: project.acceptanceCriteria,
            language: ingested.language,
          });

    const runNumber = (existing?.reviewCount ?? 0) + 1;
    const hasFailure = outcome.checks.some((check) => check.status === "FAIL");
    const nextStatus =
      reviewFiles.length === 0
        ? "SUBMITTED"
        : hasFailure
          ? "NEEDS_WORK"
          : outcome.score !== null && outcome.score >= 70
            ? "PASSED"
            : "SUBMITTED";

    await prisma.submissionReview.create({
      data: {
        submissionId: submission.id,
        runNumber,
        trigger: existing ? "RESUBMITTED" : "SUBMITTED",
        status: outcome.status,
        score: outcome.score,
        summary: outcome.summary,
        checks: outcome.checks as unknown as object,
        environment: outcome.environment,
        nextActivity: outcome.nextActivity,
        durationMs: Date.now() - started,
      },
    });

    await prisma.projectSubmission.update({
      where: { id: submission.id },
      data: {
        status: nextStatus,
        reviewStatus: outcome.status,
        lastScore: outcome.score,
        reviewCount: runNumber,
        reviewedAt: new Date(),
      },
    });

    revalidatePath("/projects");
    revalidatePath(`/projects/${slug}`);

    return NextResponse.json({
      ok: true,
      submissionId: submission.id,
      status: nextStatus,
      warnings: errors,
      review: {
        runNumber,
        status: outcome.status,
        score: outcome.score,
        summary: outcome.summary,
        checks: outcome.checks,
        environment: outcome.environment,
        nextActivity: outcome.nextActivity,
      },
    });
  } catch {
    return NextResponse.json(
      { error: "The submission could not be processed. Please try again." },
      { status: 500 },
    );
  }
}
