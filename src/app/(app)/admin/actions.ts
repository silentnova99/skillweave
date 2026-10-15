"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/session";

export type AdminState = { error?: string; ok?: string } | null;

async function audit(
  actorId: string,
  action: string,
  entityType: string,
  entityId: string | null,
  summary: string,
  diff?: unknown,
) {
  await prisma.adminAuditLog.create({
    data: {
      actorId,
      action,
      entityType,
      entityId,
      summary,
      diff: diff === undefined ? undefined : (diff as object),
    },
  });
}

export async function setResourceStatusAction(formData: FormData) {
  const admin = await requireAdmin();
  const id = z.string().min(1).safeParse(formData.get("resourceId"));
  const status = z
    .enum(["UNVERIFIED", "VERIFIED", "BROKEN", "DEPRECATED"])
    .safeParse(formData.get("status"));
  if (!id.success || !status.success) return;

  const note = formData.get("note");
  const verificationNote = typeof note === "string" && note.trim() ? note.trim() : null;

  const updated = await prisma.resource.update({
    where: { id: id.data },
    data: {
      status: status.data,
      verificationNote,
      lastVerifiedAt: status.data === "VERIFIED" ? new Date() : null,
      verifiedById: status.data === "VERIFIED" ? admin.id : null,
    },
    select: { id: true, title: true, status: true, url: true },
  });

  await audit(admin.id, "resource.status", "Resource", updated.id, `Set ${updated.title} → ${status.data}`, {
    url: updated.url,
    status: updated.status,
  });

  revalidatePath("/admin");
  revalidatePath("/admin/resources");
}

export async function resolveReportAction(formData: FormData) {
  const admin = await requireAdmin();
  const id = z.string().min(1).safeParse(formData.get("reportId"));
  const status = z.enum(["RESOLVED", "DISMISSED"]).safeParse(formData.get("status"));
  if (!id.success || !status.success) return;

  const updated = await prisma.resourceReport.update({
    where: { id: id.data },
    data: { status: status.data, resolvedById: admin.id, resolvedAt: new Date() },
    select: { id: true, kind: true },
  });

  await audit(admin.id, "report.resolve", "ResourceReport", updated.id, `Report ${updated.id} → ${status.data}`, {
    kind: updated.kind,
  });

  revalidatePath("/admin");
  revalidatePath("/admin/reports");
}

const importSchema = z.array(
  z.object({
    title: z.string().min(1),
    url: z.string().url(),
    publisher: z.string().min(1),
    author: z.string().optional(),
    type: z.enum([
      "OFFICIAL_DOCS",
      "TEXTBOOK",
      "UNIVERSITY_COURSE",
      "VIDEO",
      "TUTORIAL",
      "OPEN_SOURCE",
      "PRACTICE_EXERCISES",
      "CODING_CHALLENGE",
      "REFERENCE",
      "ARTICLE",
    ]),
    difficulty: z
      .enum(["ABSOLUTE_BEGINNER", "BEGINNER", "INTERMEDIATE", "ADVANCED"])
      .optional(),
    concepts: z.array(z.string()).optional(),
    estimatedMinutes: z.number().int().positive().optional(),
    isFree: z.boolean().optional(),
    license: z.string().optional(),
    licenseUrl: z.string().url().optional(),
    accessNotes: z.string().optional(),
    status: z.enum(["UNVERIFIED", "VERIFIED", "BROKEN", "DEPRECATED"]).optional(),
    verificationNote: z.string().optional(),
  }),
);

export async function importResourcesAction(
  _prev: AdminState,
  formData: FormData,
): Promise<AdminState> {
  const admin = await requireAdmin();
  const raw = formData.get("payload");
  if (typeof raw !== "string" || !raw.trim()) {
    return { error: "Paste a JSON array of resources." };
  }

  let parsedJson: unknown;
  try {
    parsedJson = JSON.parse(raw);
  } catch {
    return { error: "That is not valid JSON." };
  }

  const parsed = importSchema.safeParse(parsedJson);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    return {
      error: `Invalid resource at position ${issue?.path?.join(".") ?? "?"}: ${issue?.message ?? "unknown error"}`,
    };
  }

  let created = 0;
  let updatedCount = 0;

  for (const item of parsed.data) {
    const existing = await prisma.resource.findUnique({
      where: { url: item.url },
      select: { id: true },
    });
    const data = {
      title: item.title,
      publisher: item.publisher,
      author: item.author ?? null,
      type: item.type,
      difficulty: item.difficulty ?? "BEGINNER",
      concepts: item.concepts ?? [],
      estimatedMinutes: item.estimatedMinutes ?? null,
      isFree: item.isFree ?? true,
      license: item.license ?? null,
      licenseUrl: item.licenseUrl ?? null,
      accessNotes: item.accessNotes ?? null,
      status: item.status ?? "UNVERIFIED",
      verificationNote: item.verificationNote ?? null,
    };

    if (existing) {
      await prisma.resource.update({ where: { id: existing.id }, data });
      updatedCount += 1;
    } else {
      await prisma.resource.create({ data: { url: item.url, ...data } });
      created += 1;
    }
  }

  await audit(
    admin.id,
    "resource.import",
    "Resource",
    null,
    `Bulk import: ${created} created, ${updatedCount} updated`,
    { created, updated: updatedCount },
  );

  revalidatePath("/admin");
  revalidatePath("/admin/resources");
  return { ok: `Imported ${created} new and updated ${updatedCount} resources.` };
}
