"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { idSchema, noteSchema, reportSchema } from "@/lib/validation";

export type NoteState = { error?: string; ok?: boolean } | null;
export type ReportState = { error?: string; ok?: boolean } | null;

function refreshLearn(formData: FormData) {
  const pathSlug = formData.get("pathSlug");
  const chapterSlug = formData.get("chapterSlug");
  if (typeof pathSlug === "string" && typeof chapterSlug === "string") {
    revalidatePath(`/learn/${pathSlug}/${chapterSlug}`);
    revalidatePath(`/paths/${pathSlug}`);
  }
  revalidatePath("/dashboard");
  revalidatePath("/progress");
}

export async function markChapterCompleteAction(formData: FormData) {
  const user = await requireUser();
  const chapterId = idSchema.safeParse(formData.get("chapterId"));
  if (!chapterId.success) return;

  await prisma.chapterProgress.upsert({
    where: { userId_chapterId: { userId: user.id, chapterId: chapterId.data } },
    update: { status: "COMPLETED", completedAt: new Date(), lastViewedAt: new Date() },
    create: {
      userId: user.id,
      chapterId: chapterId.data,
      status: "COMPLETED",
      source: "study",
      completedAt: new Date(),
    },
  });

  refreshLearn(formData);
}

export async function reopenChapterAction(formData: FormData) {
  const user = await requireUser();
  const chapterId = idSchema.safeParse(formData.get("chapterId"));
  if (!chapterId.success) return;

  await prisma.chapterProgress.upsert({
    where: { userId_chapterId: { userId: user.id, chapterId: chapterId.data } },
    update: { status: "IN_PROGRESS", completedAt: null, lastViewedAt: new Date() },
    create: { userId: user.id, chapterId: chapterId.data, status: "IN_PROGRESS" },
  });

  refreshLearn(formData);
}

export async function toggleResourceCompleteAction(formData: FormData) {
  const user = await requireUser();
  const chapterResourceId = idSchema.safeParse(formData.get("chapterResourceId"));
  if (!chapterResourceId.success) return;

  const existing = await prisma.resourceCompletion.findUnique({
    where: {
      userId_chapterResourceId: { userId: user.id, chapterResourceId: chapterResourceId.data },
    },
  });

  if (existing) {
    await prisma.resourceCompletion.delete({ where: { id: existing.id } });
  } else {
    await prisma.resourceCompletion.create({
      data: { userId: user.id, chapterResourceId: chapterResourceId.data },
    });
  }

  refreshLearn(formData);
}

export async function saveNoteAction(
  _prev: NoteState,
  formData: FormData,
): Promise<NoteState> {
  const user = await requireUser();
  const parsed = noteSchema.safeParse({
    chapterId: formData.get("chapterId"),
    body: formData.get("body"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid note" };
  }

  await prisma.note.create({
    data: { userId: user.id, chapterId: parsed.data.chapterId, body: parsed.data.body },
  });

  refreshLearn(formData);
  return { ok: true };
}

export async function deleteNoteAction(formData: FormData) {
  const user = await requireUser();
  const id = idSchema.safeParse(formData.get("noteId"));
  if (!id.success) return;
  await prisma.note.deleteMany({ where: { id: id.data, userId: user.id } });
  refreshLearn(formData);
}

export async function reportResourceAction(
  _prev: ReportState,
  formData: FormData,
): Promise<ReportState> {
  const user = await requireUser();
  const parsed = reportSchema.safeParse({
    resourceId: formData.get("resourceId") ?? "",
    chapterId: formData.get("chapterId") ?? "",
    kind: formData.get("kind"),
    message: formData.get("message"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid report" };
  }

  await prisma.resourceReport.create({
    data: {
      userId: user.id,
      resourceId: parsed.data.resourceId || null,
      chapterId: parsed.data.chapterId || null,
      kind: parsed.data.kind,
      message: parsed.data.message,
    },
  });

  return { ok: true };
}

export async function toggleBookmarkAction(formData: FormData) {
  const user = await requireUser();
  const chapterId = idSchema.safeParse(formData.get("chapterId"));
  if (!chapterId.success) return;

  const existing = await prisma.bookmark.findFirst({
    where: { userId: user.id, chapterId: chapterId.data, resourceId: null },
  });

  if (existing) {
    await prisma.bookmark.delete({ where: { id: existing.id } });
  } else {
    await prisma.bookmark.create({ data: { userId: user.id, chapterId: chapterId.data } });
  }

  refreshLearn(formData);
}
