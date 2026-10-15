import type { ZipLimits } from "@/lib/submissions/zip";

export const MAX_FILES = 250;
export const MAX_FILE_BYTES = 2 * 1024 * 1024;
export const MAX_ARCHIVE_BYTES = 15 * 1024 * 1024;
export const MAX_TOTAL_BYTES = 25 * 1024 * 1024;
export const MAX_PATH_LENGTH = 240;

export const ZIP_LIMITS: ZipLimits = {
  maxEntries: MAX_FILES,
  maxFileBytes: MAX_FILE_BYTES,
  maxTotalBytes: MAX_TOTAL_BYTES,
};

export const SOURCE_EXTENSIONS = new Set([
  "py", "pyw", "js", "mjs", "cjs", "jsx", "ts", "mts", "cts", "tsx",
  "java", "kt", "kts", "scala", "go", "rs", "rb", "php", "cs", "c", "h",
  "cc", "cpp", "cxx", "hpp", "hh", "swift", "m", "mm", "dart", "lua", "r",
  "jl", "pl", "ex", "exs", "erl", "hs", "clj", "sh", "bash", "zsh", "ps1",
  "psd1", "sql", "html", "htm", "css", "scss", "sass", "less", "vue",
  "svelte", "astro", "sol", "tf", "hcl", "groovy", "gradle", "cmake", "asm", "s",
]);

export const CONFIG_EXTENSIONS = new Set([
  "json", "jsonc", "yaml", "yml", "toml", "ini", "cfg", "conf", "env",
  "properties", "xml", "plist", "lock", "mk",
]);

export const DOC_EXTENSIONS = new Set([
  "md", "markdown", "mdx", "txt", "rst", "adoc", "org", "tex",
]);

export const DATA_EXTENSIONS = new Set([
  "csv", "tsv", "jsonl", "ndjson",
]);

export const NOTEBOOK_EXTENSIONS = new Set(["ipynb"]);

export const IMAGE_EXTENSIONS = new Set([
  "png", "jpg", "jpeg", "gif", "webp", "bmp", "svg", "ico", "avif",
]);

export const CONFIG_NAMES = new Set([
  "dockerfile", "makefile", ".gitignore", ".dockerignore", "requirements.txt",
  "package.json", "package-lock.json", "pyproject.toml", "cargo.toml",
  "go.mod", "go.sum", "pom.xml", "build.gradle", "composer.json", "gemfile",
  ".env.example", "tsconfig.json", "makefile.am",
]);

export const BLOCKED_EXTENSIONS = new Set([
  "exe", "dll", "so", "dylib", "com", "msi", "scr", "jar", "class", "apk",
  "bin", "iso", "elf", "o", "obj", "lib", "a", "dmg", "pkg", "deb", "rpm",
  "wasm", "pyc", "pyo", "node", "swf", "cab", "sys", "drv", "bat", "cmd",
]);

export function extensionOf(name: string): string {
  const base = name.split("/").pop() ?? name;
  const dot = base.lastIndexOf(".");
  if (dot <= 0 || dot === base.length - 1) return "";
  return base.slice(dot + 1).toLowerCase();
}
