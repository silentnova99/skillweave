import { describe, expect, it } from "vitest";
import { deflateRawSync } from "node:zlib";
import { readZip } from "@/lib/submissions/zip";

function makeZip(entries: { name: string; content: string; deflate?: boolean }[]): Buffer {
  const localParts: Buffer[] = [];
  const centralParts: Buffer[] = [];
  let offset = 0;

  for (const entry of entries) {
    const nameBuf = Buffer.from(entry.name, "utf8");
    const method = entry.deflate ? 8 : 0;
    const raw = Buffer.from(entry.content, "utf8");
    const data = entry.deflate ? deflateRawSync(raw) : raw;

    const local = Buffer.alloc(30);
    local.writeUInt32LE(0x04034b50, 0);
    local.writeUInt16LE(20, 4);
    local.writeUInt16LE(method, 8);
    local.writeUInt32LE(data.length, 18);
    local.writeUInt32LE(raw.length, 22);
    local.writeUInt16LE(nameBuf.length, 26);
    localParts.push(local, nameBuf, data);

    const central = Buffer.alloc(46);
    central.writeUInt32LE(0x02014b50, 0);
    central.writeUInt16LE(method, 10);
    central.writeUInt32LE(data.length, 20);
    central.writeUInt32LE(raw.length, 24);
    central.writeUInt16LE(nameBuf.length, 28);
    central.writeUInt32LE(offset, 42);
    centralParts.push(central, nameBuf);

    offset += local.length + nameBuf.length + data.length;
  }

  const localBuf = Buffer.concat(localParts);
  const centralBuf = Buffer.concat(centralParts);
  const eocd = Buffer.alloc(22);
  eocd.writeUInt32LE(0x06054b50, 0);
  eocd.writeUInt16LE(entries.length, 8);
  eocd.writeUInt16LE(entries.length, 10);
  eocd.writeUInt32LE(centralBuf.length, 12);
  eocd.writeUInt32LE(localBuf.length, 16);

  return Buffer.concat([localBuf, centralBuf, eocd]);
}

const limits = { maxEntries: 100, maxFileBytes: 1024 * 1024, maxTotalBytes: 5 * 1024 * 1024 };

describe("readZip", () => {
  it("reads stored and deflated entries", () => {
    const zip = makeZip([
      { name: "src/main.py", content: "print('hi')\n" },
      { name: "README.md", content: "# Project", deflate: true },
    ]);
    const { entries, errors } = readZip(zip, limits);
    expect(errors).toHaveLength(0);
    expect(entries.map((e) => e.name).sort()).toEqual(["README.md", "src/main.py"]);
    expect(entries.find((e) => e.name === "README.md")?.data.toString()).toBe("# Project");
  });

  it("skips directory entries", () => {
    const zip = makeZip([
      { name: "src/", content: "" },
      { name: "src/app.js", content: "const x = 1;" },
    ]);
    const { entries } = readZip(zip, limits);
    expect(entries.map((e) => e.name)).toEqual(["src/app.js"]);
  });

  it("rejects non-zip input", () => {
    const { entries, errors } = readZip(Buffer.from("definitely not a zip file"), limits);
    expect(entries).toHaveLength(0);
    expect(errors.length).toBeGreaterThan(0);
  });

  it("enforces the entry-count limit", () => {
    const zip = makeZip([{ name: "a.txt", content: "a" }]);
    const { errors } = readZip(zip, { ...limits, maxEntries: 0 });
    expect(errors[0]).toMatch(/limit/i);
  });
});
