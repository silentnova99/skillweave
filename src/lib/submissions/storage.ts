import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";

export function uploadRoot(): string {
  return process.env.UPLOAD_DIR
    ? path.resolve(process.env.UPLOAD_DIR)
    : path.join(process.cwd(), ".uploads");
}

/**
 * Persists accepted submission files under a per-submission directory. Paths are
 * re-validated against the target directory so nothing can escape the root.
 */
export async function saveSubmissionFiles(
  submissionId: string,
  files: { path: string; data: Buffer }[],
): Promise<Record<string, string>> {
  const root = uploadRoot();
  const dir = path.resolve(path.join(root, submissionId));
  const keys: Record<string, string> = {};

  await mkdir(dir, { recursive: true });

  for (const file of files) {
    const target = path.resolve(path.join(dir, file.path));
    if (target !== dir && !target.startsWith(dir + path.sep)) continue;
    await mkdir(path.dirname(target), { recursive: true });
    await writeFile(target, file.data);
    keys[file.path] = path.relative(root, target).split(path.sep).join("/");
  }

  return keys;
}

export async function removeSubmissionFiles(submissionId: string): Promise<void> {
  await rm(path.join(uploadRoot(), submissionId), { recursive: true, force: true });
}

export async function readSubmissionFile(storageKey: string): Promise<Buffer | null> {
  const root = uploadRoot();
  const target = path.resolve(path.join(root, storageKey));
  if (target !== root && !target.startsWith(root + path.sep)) return null;
  try {
    return await readFile(target);
  } catch {
    return null;
  }
}
