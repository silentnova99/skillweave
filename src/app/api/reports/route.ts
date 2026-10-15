import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { reportSchema } from "@/lib/validation";
import { rateLimit } from "@/lib/rate-limit";

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const parsed = reportSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid report." },
      { status: 422 },
    );
  }

  const user = await getCurrentUser();
  const key = user ? `report:${user.id}` : "report:anon";
  const limit = rateLimit(key, 10, 60_000);
  if (!limit.ok) {
    return NextResponse.json({ error: "Too many reports. Try again shortly." }, { status: 429 });
  }

  await prisma.resourceReport.create({
    data: {
      userId: user?.id ?? null,
      resourceId: parsed.data.resourceId || null,
      chapterId: parsed.data.chapterId || null,
      kind: parsed.data.kind,
      message: parsed.data.message,
    },
  });

  return NextResponse.json({ ok: true }, { status: 201 });
}
