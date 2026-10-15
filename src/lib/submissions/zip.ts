import { inflateRawSync } from "node:zlib";

export interface ZipEntry {
  name: string;
  data: Buffer;
}

export interface ZipResult {
  entries: ZipEntry[];
  errors: string[];
}

const SIGNATURE_EOCD = 0x06054b50;
const SIGNATURE_CENTRAL = 0x02014b50;
const SIGNATURE_LOCAL = 0x04034b50;

export interface ZipLimits {
  maxEntries: number;
  maxFileBytes: number;
  maxTotalBytes: number;
}

/**
 * Minimal, dependency-free, read-only ZIP extractor.
 *
 * Deliberately conservative: rejects ZIP64, skips encrypted entries, and
 * enforces per-file and total uncompressed-size limits before inflating so a
 * "zip bomb" cannot exhaust memory. Nothing here executes entry contents.
 */
export function readZip(buffer: Buffer, limits: ZipLimits): ZipResult {
  const entries: ZipEntry[] = [];
  const errors: string[] = [];

  let eocd = -1;
  const earliest = Math.max(0, buffer.length - 65557);
  for (let i = buffer.length - 22; i >= earliest; i -= 1) {
    if (buffer.readUInt32LE(i) === SIGNATURE_EOCD) {
      eocd = i;
      break;
    }
  }
  if (eocd < 0) {
    return { entries, errors: ["Not a valid ZIP archive (no end-of-central-directory record)."] };
  }

  const totalEntries = buffer.readUInt16LE(eocd + 10);
  const centralSize = buffer.readUInt32LE(eocd + 12);
  const centralOffset = buffer.readUInt32LE(eocd + 16);

  if (totalEntries === 0xffff || centralOffset === 0xffffffff) {
    return { entries, errors: ["ZIP64 archives are not supported."] };
  }
  if (totalEntries > limits.maxEntries) {
    return {
      entries,
      errors: [`Archive declares ${totalEntries} entries; the limit is ${limits.maxEntries}.`],
    };
  }
  if (centralOffset + centralSize > buffer.length) {
    return { entries, errors: ["Corrupt ZIP: central directory is out of bounds."] };
  }

  let pointer = centralOffset;
  let totalUncompressed = 0;

  for (let index = 0; index < totalEntries; index += 1) {
    if (pointer + 46 > buffer.length || buffer.readUInt32LE(pointer) !== SIGNATURE_CENTRAL) {
      errors.push("Corrupt ZIP: malformed central directory entry.");
      break;
    }

    const flags = buffer.readUInt16LE(pointer + 8);
    const method = buffer.readUInt16LE(pointer + 10);
    const compressedSize = buffer.readUInt32LE(pointer + 20);
    const uncompressedSize = buffer.readUInt32LE(pointer + 24);
    const nameLength = buffer.readUInt16LE(pointer + 28);
    const extraLength = buffer.readUInt16LE(pointer + 30);
    const commentLength = buffer.readUInt16LE(pointer + 32);
    const localOffset = buffer.readUInt32LE(pointer + 42);
    const name = buffer.toString("utf8", pointer + 46, pointer + 46 + nameLength);

    pointer += 46 + nameLength + extraLength + commentLength;

    if (name.endsWith("/")) continue;
    if (flags & 0x1) {
      errors.push(`Skipped encrypted entry "${name}".`);
      continue;
    }
    if (uncompressedSize > limits.maxFileBytes) {
      errors.push(`Skipped "${name}": ${uncompressedSize} bytes exceeds the per-file limit.`);
      continue;
    }
    if (totalUncompressed + uncompressedSize > limits.maxTotalBytes) {
      errors.push(`Skipped "${name}": archive exceeds the total uncompressed limit.`);
      continue;
    }
    if (localOffset + 30 > buffer.length || buffer.readUInt32LE(localOffset) !== SIGNATURE_LOCAL) {
      errors.push(`Skipped "${name}": bad local header.`);
      continue;
    }

    const localNameLength = buffer.readUInt16LE(localOffset + 26);
    const localExtraLength = buffer.readUInt16LE(localOffset + 28);
    const dataStart = localOffset + 30 + localNameLength + localExtraLength;
    const dataEnd = dataStart + compressedSize;
    if (dataEnd > buffer.length) {
      errors.push(`Skipped "${name}": truncated entry data.`);
      continue;
    }

    const raw = buffer.subarray(dataStart, dataEnd);
    let data: Buffer;
    if (method === 0) {
      data = Buffer.from(raw);
    } else if (method === 8) {
      try {
        data = inflateRawSync(raw);
      } catch {
        errors.push(`Skipped "${name}": could not inflate deflated data.`);
        continue;
      }
    } else {
      errors.push(`Skipped "${name}": unsupported compression method ${method}.`);
      continue;
    }

    totalUncompressed += data.length;
    entries.push({ name, data });
  }

  return { entries, errors };
}
