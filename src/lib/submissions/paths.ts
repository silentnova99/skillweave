import { MAX_PATH_LENGTH } from "@/lib/submissions/constants";

/**
 * Normalises an untrusted archive/upload entry name into a safe relative POSIX
 * path, or returns null when it must be rejected (traversal, absolute paths,
 * drive letters, null bytes, control characters, over-long names).
 */
export function normalizeEntryPath(raw: string): string | null {
  const asPosix = raw.replace(/\\/g, "/").trim();
  if (!asPosix) return null;
  if (asPosix.includes("\0")) return null;
  if (/[\u0000-\u001f]/.test(asPosix)) return null;
  if (asPosix.startsWith("/")) return null;
  if (/^[a-zA-Z]:/.test(asPosix)) return null;

  const segments = asPosix.split("/");
  if (segments.some((segment) => segment === "..")) return null;

  const clean = segments
    .filter((segment) => segment !== "" && segment !== ".")
    .join("/");

  if (!clean) return null;
  if (clean.length > MAX_PATH_LENGTH) return null;
  return clean;
}

export function isBinary(buffer: Buffer): boolean {
  const sample = buffer.subarray(0, Math.min(buffer.length, 8000));
  for (let i = 0; i < sample.length; i += 1) {
    if (sample[i] === 0) return true;
  }
  return false;
}
