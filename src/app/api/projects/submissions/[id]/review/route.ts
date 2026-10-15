import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getCurrentUser, isAdmin } from "@/lib/session";
import { rateLimit } from "@/lib/rate-limit";
import { detectKind, detectLanguage } from "@/lib/submissions/detect";
import { isBinary, normalizeEntryPath } from "@/lib/submissions/paths";
import { runRepositoryReview, runReview } from "@/lib/submissions/review";
import { readSubmissionFile } from "@/lib/submissions/storage";
import type { ReviewFile } from "@/lib/submissions/types";

export const runtime = "nodejs";

const MAX_DECODE_CHARS = 1_000_000;

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  }

  const limit = rateLimit(`review:${user.id}`, 20, 60_000);
  if (!limit.ok) {
    return NextResponse.json(
      { error: "Too many review requests. Please wait a moment and try again." },
      { status: 429 },
    );
  }

  const submission = await prisma.projectSubmission.findUnique({
    where: { id },
    include: {
      project: { select: { slug: true, acceptanceCriteria: true } },
      files: true,
    },
  });
  if (!submission) {
    return NextResponse.json({ error: "Submission not found." }, { status: 404 });
  }
  if (submission.userId !== user.id && !isAdmin(user)) {
    return NextResponse.json({ error: "Not allowed." }, { status: 403 });
  }

  try {
    const reviewFiles: ReviewFile[] = [];
    for (const file of submission.files) {
      const buffer = file.storageKey ? await readSubmissionFile(file.storageKey) : null;
      const binary = buffer === null ? true : isBinary(buffer);
      const text =
        buffer !== null && !binary
          ? buffer.subarray(0, MAX_DECODE_CHARS).toString("utf8")
          : null;
      const path = normalizeEntryPath(file.path) ?? file.path;
      reviewFiles.push({
        path,
        kind: detectKind(path),
        language: detectLanguage(path),
        sizeBytes: file.sizeBytes,
        lines: file.lines,
        text,
        binary,
      });
    }

    const started = Date.now();
    const outcome =
      reviewFiles.length === 0
        ? runRepositoryReview(submission.repoUrl)
        : await runReview({
            files: reviewFiles,
            acceptanceCriteria: submission.project.acceptanceCriteria,
            language: submission.language,
          });

    const runNumber = submission.reviewCount + 1;
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
        trigger: "MANUAL",
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
    revalidatePath(`/projects/${submission.project.slug}`);

    return NextResponse.json({
      ok: true,
      submissionId: submission.id,
      status: nextStatus,
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
      { error: "The review could not be completed. Please try again." },
      { status: 500 },
    );
  }
}
