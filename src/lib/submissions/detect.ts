import {
  CONFIG_EXTENSIONS,
  CONFIG_NAMES,
  DATA_EXTENSIONS,
  DOC_EXTENSIONS,
  IMAGE_EXTENSIONS,
  NOTEBOOK_EXTENSIONS,
  SOURCE_EXTENSIONS,
  extensionOf,
} from "@/lib/submissions/constants";
import type { SubmissionFileKind } from "@/lib/submissions/types";

const LANGUAGE_BY_EXTENSION: Record<string, string> = {
  py: "python", pyw: "python",
  js: "javascript", mjs: "javascript", cjs: "javascript", jsx: "javascript",
  ts: "typescript", mts: "typescript", cts: "typescript", tsx: "typescript",
  java: "java", kt: "kotlin", kts: "kotlin", scala: "scala",
  go: "go", rs: "rust", rb: "ruby", php: "php", cs: "csharp",
  c: "c", h: "c", cc: "cpp", cpp: "cpp", cxx: "cpp", hpp: "cpp", hh: "cpp",
  swift: "swift", m: "objective-c", mm: "objective-c", dart: "dart",
  lua: "lua", r: "r", jl: "julia", pl: "perl", ex: "elixir", exs: "elixir",
  erl: "erlang", hs: "haskell", clj: "clojure",
  sh: "shell", bash: "shell", zsh: "shell",
  ps1: "powershell", psd1: "powershell",
  sql: "sql", html: "html", htm: "html", css: "css", scss: "scss",
  sass: "scss", less: "less", vue: "vue", svelte: "svelte", astro: "astro",
  sol: "solidity", tf: "hcl", hcl: "hcl", groovy: "groovy", gradle: "groovy",
  cmake: "cmake", asm: "asm", s: "asm",
};

export function detectLanguage(path: string): string | null {
  const ext = extensionOf(path);
  return LANGUAGE_BY_EXTENSION[ext] ?? null;
}

export function detectKind(path: string): SubmissionFileKind {
  const lower = path.toLowerCase();
  const base = lower.split("/").pop() ?? lower;
  const ext = extensionOf(lower);

  if (base.startsWith("readme")) return "README";
  if (IMAGE_EXTENSIONS.has(ext)) return "SCREENSHOT";
  if (
    /(^|\/)(test|tests|spec|specs|__tests__)\//.test(lower) ||
    /\.(test|spec)\.[a-z0-9]+$/.test(lower) ||
    /^test_/.test(base)
  ) {
    return "TEST";
  }
  if (LANGUAGE_BY_EXTENSION[ext]) return "SOURCE";
  if (CONFIG_EXTENSIONS.has(ext) || CONFIG_NAMES.has(base)) return "CONFIG";
  if (
    DOC_EXTENSIONS.has(ext) ||
    DATA_EXTENSIONS.has(ext) ||
    NOTEBOOK_EXTENSIONS.has(ext) ||
    SOURCE_EXTENSIONS.has(ext)
  ) {
    return "OTHER";
  }
  return "OTHER";
}

export function isTextExtractable(path: string): boolean {
  const ext = extensionOf(path);
  return (
    SOURCE_EXTENSIONS.has(ext) ||
    CONFIG_EXTENSIONS.has(ext) ||
    DOC_EXTENSIONS.has(ext) ||
    DATA_EXTENSIONS.has(ext) ||
    NOTEBOOK_EXTENSIONS.has(ext) ||
    ext === "svg"
  );
}

export function dominantLanguage(
  languages: (string | null)[],
): string | null {
  const counts = new Map<string, number>();
  for (const language of languages) {
    if (!language) continue;
    counts.set(language, (counts.get(language) ?? 0) + 1);
  }
  let best: string | null = null;
  let bestCount = 0;
  for (const [language, count] of counts) {
    if (count > bestCount) {
      best = language;
      bestCount = count;
    }
  }
  return best;
}
