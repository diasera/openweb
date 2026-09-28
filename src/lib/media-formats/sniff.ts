import type { MediaFormatDefinition } from "./registry";
import { hasAscii } from "@/lib/media/binary";

export const MEDIA_HEADER_BYTES = 1024 * 1024;

export type MediaHeaderFamily =
  | "jpeg"
  | "png"
  | "gif"
  | "webp"
  | "avif"
  | "heif"
  | "bmp"
  | "tiff"
  | "jxl"
  | "iso-bmff"
  | "webm"
  | "matroska"
  | "mp3"
  | "aac"
  | "ogg"
  | "flac"
  | "wav"
  | "unknown";

export type IsoBmffContainer =
  | "mp4"
  | "quicktime"
  | "m4a"
  | "3gp"
  | "unknown";

export interface MediaHeaderInspection {
  family: MediaHeaderFamily;
  animated: boolean;
  encrypted: boolean;
  container: IsoBmffContainer | null;
}

function inspection(
  family: MediaHeaderFamily,
  options: Partial<Omit<MediaHeaderInspection, "family">> = {},
): MediaHeaderInspection {
  return {
    family,
    animated: options.animated ?? false,
    encrypted: options.encrypted ?? false,
    container: options.container ?? null,
  };
}

function ascii(bytes: Uint8Array, offset: number, length: number): string {
  if (offset < 0 || offset + length > bytes.length) return "";
  return String.fromCharCode(...bytes.subarray(offset, offset + length));
}

function hasBytes(
  bytes: Uint8Array,
  offset: number,
  signature: readonly number[],
): boolean {
  if (offset < 0 || offset + signature.length > bytes.length) return false;
  return signature.every((value, index) => bytes[offset + index] === value);
}

function readUint32(
  bytes: Uint8Array,
  offset: number,
  littleEndian = false,
): number | null {
  if (offset < 0 || offset + 4 > bytes.length) return null;
  return new DataView(
    bytes.buffer,
    bytes.byteOffset + offset,
    4,
  ).getUint32(0, littleEndian);
}

function isAnimatedPng(bytes: Uint8Array): boolean {
  let offset = 8;
  while (offset + 12 <= bytes.length) {
    const length = readUint32(bytes, offset);
    if (length === null || length > 0x7fffffff) return false;
    const type = ascii(bytes, offset + 4, 4);
    const next = offset + 12 + length;
    if (next > bytes.length) return false;
    if (type === "acTL") return length === 8;
    if (type === "IDAT" || type === "IEND") return false;
    offset = next;
  }
  return false;
}

function skipGifSubBlocks(bytes: Uint8Array, start: number): number {
  let offset = start;
  while (offset < bytes.length) {
    const length = bytes[offset];
    offset += 1;
    if (length === 0) return offset;
    if (offset + length > bytes.length) return -1;
    offset += length;
  }
  return -1;
}

/** Truncated GIF dianggap animasi agar editor tidak meratakan frame berikutnya. */
function isAnimatedGif(bytes: Uint8Array): boolean {
  if (bytes.length < 13) return true;
  const packed = bytes[10];
  let offset = 13;
  if ((packed & 0x80) !== 0) {
    offset += 3 * 2 ** ((packed & 0x07) + 1);
  }

  let frames = 0;
  while (offset < bytes.length) {
    const marker = bytes[offset];
    if (marker === 0x3b) return frames > 1;
    if (marker === 0x21) {
      if (offset + 2 > bytes.length) return true;
      offset = skipGifSubBlocks(bytes, offset + 2);
      if (offset < 0) return true;
      continue;
    }
    if (marker !== 0x2c || offset + 10 > bytes.length) return true;

    frames += 1;
    if (frames > 1) return true;
    const imagePacked = bytes[offset + 9];
    offset += 10;
    if ((imagePacked & 0x80) !== 0) {
      offset += 3 * 2 ** ((imagePacked & 0x07) + 1);
    }
    if (offset >= bytes.length) return true;
    offset = skipGifSubBlocks(bytes, offset + 1);
    if (offset < 0) return true;
  }
  return true;
}

function isAnimatedWebp(bytes: Uint8Array): boolean {
  const declaredSize = readUint32(bytes, 4, true);
  const end = Math.min(
    bytes.length,
    declaredSize === null ? bytes.length : declaredSize + 8,
  );
  let offset = 12;
  while (offset + 8 <= end) {
    const type = ascii(bytes, offset, 4);
    const length = readUint32(bytes, offset + 4, true);
    if (length === null) return false;
    const dataStart = offset + 8;
    const dataEnd = dataStart + length;
    if (dataEnd > end) return false;
    if (type === "ANIM" || type === "ANMF") return true;
    if (type === "VP8X" && length >= 1 && (bytes[dataStart] & 0x02) !== 0) {
      return true;
    }
    offset = dataEnd + (length & 1);
  }
  return false;
}

interface IsoBrandInspection {
  brands: string[];
  container: IsoBmffContainer;
  encrypted: boolean;
}

function ebmlDocType(bytes: Uint8Array): string | null {
  const limit = Math.min(bytes.length, 4096);
  for (let offset = 4; offset + 3 <= limit; offset += 1) {
    if (bytes[offset] !== 0x42 || bytes[offset + 1] !== 0x82) continue;
    const firstSizeByte = bytes[offset + 2];
    let marker = 0x80;
    let sizeLength = 1;
    while (sizeLength <= 8 && (firstSizeByte & marker) === 0) {
      marker >>= 1;
      sizeLength += 1;
    }
    if (sizeLength > 4 || offset + 2 + sizeLength > limit) continue;

    let size = firstSizeByte & (marker - 1);
    for (let index = 1; index < sizeLength; index += 1) {
      size = size * 256 + bytes[offset + 2 + index];
    }
    const valueOffset = offset + 2 + sizeLength;
    if (size <= 0 || size > 32 || valueOffset + size > limit) continue;
    return ascii(bytes, valueOffset, size).toLowerCase();
  }
  return null;
}

function findFtypOffset(bytes: Uint8Array): number | null {
  let offset = 0;
  while (offset + 8 <= Math.min(bytes.length, 64 * 1024)) {
    const size = readUint32(bytes, offset);
    const type = ascii(bytes, offset + 4, 4);
    if (type === "ftyp") return offset;
    if (size === null || size < 8 || offset + size > bytes.length) break;
    offset += size;
  }
  return null;
}

function containsSizedIsoBox(bytes: Uint8Array, type: string): boolean {
  const limit = Math.min(bytes.length, 256 * 1024);
  for (let typeOffset = 4; typeOffset + 4 <= limit; typeOffset += 1) {
    if (!hasAscii(bytes, typeOffset, type)) continue;
    const size = readUint32(bytes, typeOffset - 4);
    if (size !== null && size >= 8 && typeOffset - 4 + size <= limit) {
      return true;
    }
  }
  return false;
}

function inspectIsoBrands(bytes: Uint8Array): IsoBrandInspection | null {
  const offset = findFtypOffset(bytes);
  if (offset === null) return null;
  const size = readUint32(bytes, offset);
  if (size === null || size < 16 || offset + size > bytes.length) return null;

  const brands = [ascii(bytes, offset + 8, 4)];
  for (
    let brandOffset = offset + 16;
    brandOffset + 4 <= offset + size;
    brandOffset += 4
  ) {
    brands.push(ascii(bytes, brandOffset, 4));
  }

  const lowerBrands = brands.map((brand) => brand.toLowerCase());
  let container: IsoBmffContainer = "unknown";
  if (brands.includes("qt  ")) container = "quicktime";
  else if (lowerBrands.some((brand) => brand.startsWith("3g"))) {
    container = "3gp";
  } else if (
    lowerBrands.some((brand) =>
      ["m4a ", "m4b ", "m4p ", "f4a "].includes(brand),
    )
  ) {
    container = "m4a";
  } else if (
    lowerBrands.some((brand) =>
      [
        "isom",
        "iso2",
        "iso4",
        "iso5",
        "iso6",
        "mp41",
        "mp42",
        "avc1",
        "dash",
        "m4v ",
      ].includes(brand),
    )
  ) {
    container = "mp4";
  }

  const encrypted =
    lowerBrands.includes("m4p ") ||
    ["drms", "enca", "encv", "sinf", "pssh"].some((type) =>
      containsSizedIsoBox(bytes, type),
    );
  return { brands, container, encrypted };
}

function isMultiPageTiff(bytes: Uint8Array, littleEndian: boolean): boolean {
  const magic = new DataView(
    bytes.buffer,
    bytes.byteOffset,
    bytes.byteLength,
  );
  if (bytes.length < 8 || magic.getUint16(2, littleEndian) !== 42) return true;
  const firstIfd = magic.getUint32(4, littleEndian);
  if (firstIfd === 0) return false;
  if (firstIfd + 2 > bytes.length) return true;
  const entries = magic.getUint16(firstIfd, littleEndian);
  const nextOffsetPosition = firstIfd + 2 + entries * 12;
  if (nextOffsetPosition + 4 > bytes.length) return true;
  return magic.getUint32(nextOffsetPosition, littleEndian) !== 0;
}

function isValidMp3Frame(bytes: Uint8Array): boolean {
  if (bytes.length < 4 || bytes[0] !== 0xff || (bytes[1] & 0xe0) !== 0xe0) {
    return false;
  }
  const version = (bytes[1] >> 3) & 0x03;
  const layer = (bytes[1] >> 1) & 0x03;
  const bitrate = (bytes[2] >> 4) & 0x0f;
  const sampleRate = (bytes[2] >> 2) & 0x03;
  return (
    version !== 1 &&
    layer !== 0 &&
    bitrate !== 0 &&
    bitrate !== 15 &&
    sampleRate !== 3
  );
}

function isValidAdts(bytes: Uint8Array): boolean {
  if (bytes.length < 7 || bytes[0] !== 0xff || (bytes[1] & 0xf6) !== 0xf0) {
    return false;
  }
  return ((bytes[2] >> 2) & 0x0f) !== 15;
}

export function inspectMediaHeader(bytes: Uint8Array): MediaHeaderInspection {
  if (hasBytes(bytes, 0, [0xff, 0xd8, 0xff])) return inspection("jpeg");
  if (
    hasBytes(bytes, 0, [
      0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
    ])
  ) {
    return inspection("png", { animated: isAnimatedPng(bytes) });
  }
  if (hasAscii(bytes, 0, "GIF87a") || hasAscii(bytes, 0, "GIF89a")) {
    return inspection("gif", { animated: isAnimatedGif(bytes) });
  }
  if (hasAscii(bytes, 0, "RIFF") && hasAscii(bytes, 8, "WEBP")) {
    return inspection("webp", { animated: isAnimatedWebp(bytes) });
  }

  const iso = inspectIsoBrands(bytes);
  if (iso) {
    const lowerBrands = iso.brands.map((brand) => brand.toLowerCase());
    if (lowerBrands.some((brand) => brand === "avif" || brand === "avis")) {
      return inspection("avif", {
        animated: lowerBrands.includes("avis"),
        encrypted: iso.encrypted,
      });
    }
    if (
      lowerBrands.some((brand) =>
        [
          "heic",
          "heix",
          "hevc",
          "hevx",
          "heim",
          "heis",
          "mif1",
          "msf1",
        ].includes(brand),
      )
    ) {
      return inspection("heif", {
        animated: ["hevc", "hevx", "msf1"].some((brand) =>
          lowerBrands.includes(brand),
        ),
        encrypted: iso.encrypted,
      });
    }
    return inspection("iso-bmff", {
      container: iso.container,
      encrypted: iso.encrypted,
    });
  }

  if (hasAscii(bytes, 0, "BM")) {
    const pixelOffset = readUint32(bytes, 10, true);
    const dibSize = readUint32(bytes, 14, true);
    if (pixelOffset !== null && dibSize !== null && pixelOffset >= 26 && dibSize >= 12) {
      return inspection("bmp");
    }
  }
  if (hasBytes(bytes, 0, [0x49, 0x49, 0x2a, 0x00])) {
    return inspection("tiff", { animated: isMultiPageTiff(bytes, true) });
  }
  if (hasBytes(bytes, 0, [0x4d, 0x4d, 0x00, 0x2a])) {
    return inspection("tiff", { animated: isMultiPageTiff(bytes, false) });
  }
  if (
    hasBytes(bytes, 0, [0x49, 0x49, 0x2b, 0x00]) ||
    hasBytes(bytes, 0, [0x4d, 0x4d, 0x00, 0x2b])
  ) {
    return inspection("tiff", { animated: true });
  }
  if (
    hasBytes(bytes, 0, [0xff, 0x0a]) ||
    hasBytes(bytes, 0, [
      0x00, 0x00, 0x00, 0x0c, 0x4a, 0x58, 0x4c, 0x20, 0x0d, 0x0a, 0x87,
      0x0a,
    ])
  ) {
    return inspection("jxl");
  }
  if (hasBytes(bytes, 0, [0x1a, 0x45, 0xdf, 0xa3])) {
    const documentType = ebmlDocType(bytes);
    if (documentType === "webm") return inspection("webm");
    if (documentType === "matroska") return inspection("matroska");
    return inspection("unknown");
  }
  if (hasAscii(bytes, 0, "OggS") && bytes.length >= 27 && bytes[4] === 0) {
    return inspection("ogg");
  }
  if (hasAscii(bytes, 0, "fLaC")) return inspection("flac");
  if (hasAscii(bytes, 0, "RIFF") && hasAscii(bytes, 8, "WAVE")) {
    return inspection("wav");
  }
  if (
    hasAscii(bytes, 0, "ID3") &&
    bytes.length >= 10 &&
    bytes[3] >= 2 &&
    bytes[3] <= 4 &&
    bytes.subarray(6, 10).every((value) => value < 0x80)
  ) {
    return inspection("mp3");
  }
  if (isValidAdts(bytes)) return inspection("aac");
  if (isValidMp3Frame(bytes)) return inspection("mp3");
  if (
    bytes.length >= 8 &&
    ["moov", "mdat", "wide", "free"].some((atom) => hasAscii(bytes, 4, atom))
  ) {
    return inspection("iso-bmff", { container: "unknown" });
  }
  return inspection("unknown");
}

const EXPECTED_FAMILIES: Readonly<Record<string, readonly MediaHeaderFamily[]>> = {
  jpeg: ["jpeg"],
  png: ["png"],
  apng: ["png"],
  gif: ["gif"],
  webp: ["webp"],
  avif: ["avif"],
  heic: ["heif"],
  heif: ["heif"],
  bmp: ["bmp"],
  tiff: ["tiff"],
  jxl: ["jxl"],
  "mp4-video": ["iso-bmff"],
  quicktime: ["iso-bmff"],
  "3gp-video": ["iso-bmff"],
  "webm-video": ["webm"],
  "mp3-audio": ["mp3"],
  "mp4-audio": ["iso-bmff"],
  "aac-audio": ["aac"],
  "ogg-audio": ["ogg"],
  "webm-audio": ["webm"],
  "flac-audio": ["flac"],
  "wav-audio": ["wav"],
};

const EXPECTED_ISO_CONTAINERS: Readonly<
  Record<string, readonly IsoBmffContainer[]>
> = {
  "mp4-video": ["mp4", "quicktime", "unknown"],
  quicktime: ["quicktime", "mp4", "unknown"],
  "3gp-video": ["3gp"],
  "mp4-audio": ["m4a", "mp4", "unknown"],
};

export function headerMatchesFormat(
  format: MediaFormatDefinition,
  header: MediaHeaderInspection,
): boolean {
  if (header.encrypted) return false;
  const families = EXPECTED_FAMILIES[format.id];
  if (!families?.includes(header.family)) return false;
  if (format.id === "apng" && !header.animated) return false;

  const containers = EXPECTED_ISO_CONTAINERS[format.id];
  return (
    !containers ||
    (header.container !== null && containers.includes(header.container))
  );
}

export async function inspectBlobHeader(
  blob: Blob,
): Promise<MediaHeaderInspection> {
  const bytes = new Uint8Array(
    await blob.slice(0, Math.min(blob.size, MEDIA_HEADER_BYTES)).arrayBuffer(),
  );
  return inspectMediaHeader(bytes);
}
