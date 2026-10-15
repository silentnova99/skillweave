import { createHash } from "node:crypto";
import {
  BLOCKED_EXTENSIONS,
  MAX_FILES,
  MAX_FILE_BYTES,
  MAX_TOTAL_BYTES,
  extensionOf,
} from "@/lib/submissions/constants";
import { detectKind, detectLanguage, dominantLanguage } from "@/lib/submissions/detect";
import { isBinary, normalizeEntryPath } from "@/lib/submissions/paths";
import type { ReviewFile } from "@/lib/submissions/types";

export interface RawUpload {
  name: string;
  data: Buffer;
}

export interface IngestedFile extends ReviewFile {
  sha256: string;
}

export interface IngestResult {
  files: IngestedFile[];
  stored: { path: string; data: Buffer }[];
  errors: string[];
  totalBytes: number;
  language: string | null;
}

const MAX_DECODE_CHARS = 1_000_000;

export function ingest(uploads: RawUpload[]): IngestResult {
  const files: IngestedFile[] = [];
  const stored: { path: string; data: Buffer }[] = [];
  const errors: string[] = [];
  let totalBytes = 0;

  for (const upload of uploads) {
    const safePath = normalizeEntryPath(upload.name);
    if (!safePath) {
      errors.push(`Rejected unsafe path "${upload.name}".`);
      continue;
    }
    if (files.length >= MAX_FILES) {
      errors.push(`Too many files; the limit is ${MAX_FILES}. Remaining files were ignored.`);
      break;
    }

    const ext = extensionOf(safePath);
    if (BLOCKED_EXTENSIONS.has(ext)) {
      errors.push(`Rejected executable/binary "${safePath}" (.${ext}).`);
      continue;
    }
    if (upload.data.length > MAX_FILE_BYTES) {
      errors.push(`Rejected "${safePath}": ${upload.data.length} bytes exceeds the per-file limit of ${MAX_FILE_BYTES}.`);
      continue;
    }
    if (totalBytes + upload.data.length > MAX_TOTAL_BYTES) {
      errors.push(`Rejected "${safePath}": total upload size would exceed ${MAX_TOTAL_BYTES} bytes.`);
      continue;
    }

    const binary = isBinary(upload.data);
    let text: string | null = null;
    let lines: number | null = null;

    if (!binary) {
      const slice = upload.data.subarray(0, MAX_DECODE_CHARS);
      text = slice.toString("utf8");
      lines = text.split("\n").length;
    }

    const kind = detectKind(safePath);
    files.push({
      path: safePath,
      kind,
      language: detectLanguage(safePath),
      sizeBytes: upload.data.length,
      lines,
      text,
      binary,
      sha256: createHash("sha256").update(upload.data).digest("hex"),
    });
    stored.push({ path: safePath, data: upload.data });
    totalBytes += upload.data.length;
  }

  return {
    files,
    stored,
    errors,
    totalBytes,
    language: dominantLanguage(files.map((file) => file.language)),
  };
}
