import { describe, expect, it } from "vitest";
import { isBinary, normalizeEntryPath } from "@/lib/submissions/paths";
import { ingest } from "@/lib/submissions/ingest";

describe("normalizeEntryPath", () => {
  it("accepts and normalises nested paths", () => {
    expect(normalizeEntryPath("src\\app\\main.py")).toBe("src/app/main.py");
    expect(normalizeEntryPath("./a/./b.txt")).toBe("a/b.txt");
  });

  it("rejects traversal, absolute, drive and control sequences", () => {
    expect(normalizeEntryPath("../secret")).toBeNull();
    expect(normalizeEntryPath("a/../../b")).toBeNull();
    expect(normalizeEntryPath("/etc/passwd")).toBeNull();
    expect(normalizeEntryPath("C:\\Windows\\system32")).toBeNull();
    expect(normalizeEntryPath("a\0b")).toBeNull();
    expect(normalizeEntryPath("")).toBeNull();
  });
});

describe("isBinary", () => {
  it("detects null bytes", () => {
    expect(isBinary(Buffer.from([0x50, 0x4b, 0x00, 0x01]))).toBe(true);
    expect(isBinary(Buffer.from("plain text"))).toBe(false);
  });
});

describe("ingest", () => {
  it("indexes source files and detects language", () => {
    const result = ingest([
      { name: "main.py", data: Buffer.from("print('hi')\n") },
      { name: "README.md", data: Buffer.from("# Title\n") },
    ]);
    expect(result.errors).toHaveLength(0);
    expect(result.language).toBe("python");
    expect(result.files.find((f) => f.path === "README.md")?.kind).toBe("README");
    expect(result.stored).toHaveLength(2);
  });

  it("rejects executables and unsafe paths", () => {
    const result = ingest([
      { name: "malware.exe", data: Buffer.from("MZ") },
      { name: "../escape.py", data: Buffer.from("x=1") },
    ]);
    expect(result.files).toHaveLength(0);
    expect(result.errors.length).toBe(2);
  });

  it("rejects files over the per-file limit", () => {
    const big = Buffer.alloc(3 * 1024 * 1024, 0x61);
    const result = ingest([{ name: "big.txt", data: big }]);
    expect(result.files).toHaveLength(0);
    expect(result.errors[0]).toMatch(/per-file limit/i);
  });
});
