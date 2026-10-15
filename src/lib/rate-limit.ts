import { prisma } from "@/lib/prisma";

/**
 * Very small in-memory fixed-window rate limiter. Suitable for a single
 * instance; swap for Redis/Upstash in a multi-instance deployment.
 */
type Bucket = { count: number; resetAt: number };

const buckets = new Map<string, Bucket>();

export function rateLimit(
  key: string,
  limit: number,
  windowMs: number,
): { ok: boolean; remaining: number; resetAt: number } {
  const now = Date.now();
  const existing = buckets.get(key);

  if (!existing || existing.resetAt <= now) {
    const resetAt = now + windowMs;
    buckets.set(key, { count: 1, resetAt });
    return { ok: true, remaining: limit - 1, resetAt };
  }

  if (existing.count >= limit) {
    return { ok: false, remaining: 0, resetAt: existing.resetAt };
  }

  existing.count += 1;
  return { ok: true, remaining: limit - existing.count, resetAt: existing.resetAt };
}

export async function audit(params: {
  actorId?: string | null;
  action: string;
  entityType: string;
  entityId?: string | null;
  summary: string;
  diff?: unknown;
}) {
  await prisma.adminAuditLog.create({
    data: {
      actorId: params.actorId ?? null,
      action: params.action,
      entityType: params.entityType,
      entityId: params.entityId ?? null,
      summary: params.summary,
      diff: params.diff === undefined ? undefined : (params.diff as object),
    },
  });
}
