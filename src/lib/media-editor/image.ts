import type {
  BoundedImagePreview,
  MediaEditorDimensions,
  PhotoEditRecipe,
  PreviewOptions,
} from "./types";
import { resolvedPhotoAdjustments } from "./filters";
import { UPLOAD_LIMITS } from "@/lib/constants";
import { hasAscii } from "@/lib/media/binary";
import { loadImageElement } from "@/lib/media/image-element";
import { createCanvas } from "./canvas";

export const EDITOR_PREVIEW_MAX_DIMENSION = 1600;
export const EDITOR_DECODE_MAX_DIMENSION = 2304;
export const EDITOR_OUTPUT_MAX_DIMENSION = 2048;
const SAFARI_FALLBACK_MAX_PIXELS = 24_000_000;
const HEADER_READ_LIMIT = 1024 * 1024;

export function throwIfAborted(signal?: AbortSignal): void {
  if (signal?.aborted) throw new DOMException("Operasi dibatalkan.", "AbortError");
}

export function boundedDimensions(
  width: number,
  height: number,
  maxDimension: number,
): MediaEditorDimensions {
  const safeWidth = Math.max(1, Math.round(width));
  const safeHeight = Math.max(1, Math.round(height));
  const safeMax = Math.max(1, Math.round(maxDimension));
  const scale = Math.min(1, safeMax / Math.max(safeWidth, safeHeight));
  return {
    width: Math.max(1, Math.round(safeWidth * scale)),
    height: Math.max(1, Math.round(safeHeight * scale)),
  };
}

function validDimensions(width: number, height: number): MediaEditorDimensions {
  if (
    !Number.isSafeInteger(width) ||
    !Number.isSafeInteger(height) ||
    width <= 0 ||
    height <= 0 ||
    width > UPLOAD_LIMITS.mediaMaxDimension ||
    height > UPLOAD_LIMITS.mediaMaxDimension
  ) {
    throw new Error("Dimensi foto tidak valid atau terlalu besar.");
  }
  return { width, height };
}

function malformedHeader(format: string): Error {
  return new Error(
    `Header dimensi ${format} tidak valid atau tidak ditemukan dalam ${
      HEADER_READ_LIMIT / (1024 * 1024)
    } MB pertama.`,
  );
}

function gifDimensions(
  bytes: Uint8Array,
  view: DataView,
): MediaEditorDimensions {
  if (
    bytes.length < 10 ||
    (!hasAscii(bytes, 0, "GIF87a") && !hasAscii(bytes, 0, "GIF89a"))
  ) {
    throw malformedHeader("GIF");
  }
  return validDimensions(view.getUint16(6, true), view.getUint16(8, true));
}

function uint24LittleEndian(bytes: Uint8Array, offset: number): number {
  return (
    bytes[offset] | (bytes[offset + 1] << 8) | (bytes[offset + 2] << 16)
  );
}

function webpDimensions(
  bytes: Uint8Array,
  view: DataView,
  fileSize: number,
): MediaEditorDimensions {
  if (
    bytes.length < 12 ||
    !hasAscii(bytes, 0, "RIFF") ||
    !hasAscii(bytes, 8, "WEBP")
  ) {
    throw malformedHeader("WebP");
  }

  const riffEnd = view.getUint32(4, true) + 8;
  if (riffEnd < 12 || riffEnd > fileSize) throw malformedHeader("WebP");

  let offset = 12;
  const availableEnd = Math.min(bytes.length, riffEnd);
  while (offset + 8 <= availableEnd) {
    const chunkType = String.fromCharCode(
      bytes[offset],
      bytes[offset + 1],
      bytes[offset + 2],
      bytes[offset + 3],
    );
    const chunkSize = view.getUint32(offset + 4, true);
    const payloadStart = offset + 8;
    const payloadEnd = payloadStart + chunkSize;
    if (payloadEnd > riffEnd || !Number.isSafeInteger(payloadEnd)) {
      throw malformedHeader("WebP");
    }

    if (chunkType === "VP8X") {
      if (chunkSize < 10 || payloadStart + 10 > availableEnd) {
        throw malformedHeader("WebP");
      }
      return validDimensions(
        uint24LittleEndian(bytes, payloadStart + 4) + 1,
        uint24LittleEndian(bytes, payloadStart + 7) + 1,
      );
    }

    if (chunkType === "VP8L") {
      if (
        chunkSize < 5 ||
        payloadStart + 5 > availableEnd ||
        bytes[payloadStart] !== 0x2f
      ) {
        throw malformedHeader("WebP");
      }
      const byte1 = bytes[payloadStart + 1];
      const byte2 = bytes[payloadStart + 2];
      const byte3 = bytes[payloadStart + 3];
      const byte4 = bytes[payloadStart + 4];
      return validDimensions(
        1 + byte1 + ((byte2 & 0x3f) << 8),
        1 + (byte2 >> 6) + (byte3 << 2) + ((byte4 & 0x0f) << 10),
      );
    }

    if (chunkType === "VP8 ") {
      if (
        chunkSize < 10 ||
        payloadStart + 10 > availableEnd ||
        (bytes[payloadStart] & 0x01) !== 0 ||
        bytes[payloadStart + 3] !== 0x9d ||
        bytes[payloadStart + 4] !== 0x01 ||
        bytes[payloadStart + 5] !== 0x2a
      ) {
        throw malformedHeader("WebP");
      }
      return validDimensions(
        view.getUint16(payloadStart + 6, true) & 0x3fff,
        view.getUint16(payloadStart + 8, true) & 0x3fff,
      );
    }

    if (payloadEnd > availableEnd) break;
    offset = payloadEnd + (chunkSize & 1);
  }
  throw malformedHeader("WebP");
}

interface IsoBox {
  type: string;
  contentStart: number;
  availableEnd: number;
  declaredEnd: number;
}

function readIsoBox(
  bytes: Uint8Array,
  view: DataView,
  offset: number,
  parentEnd: number,
): IsoBox | null {
  if (offset + 8 > parentEnd) return null;
  const size32 = view.getUint32(offset, false);
  const type = String.fromCharCode(
    bytes[offset + 4],
    bytes[offset + 5],
    bytes[offset + 6],
    bytes[offset + 7],
  );
  let headerSize = 8;
  let size = size32;
  if (size32 === 1) {
    if (offset + 16 > parentEnd) return null;
    const high = view.getUint32(offset + 8, false);
    const low = view.getUint32(offset + 12, false);
    size = high * 0x1_0000_0000 + low;
    headerSize = 16;
  } else if (size32 === 0) {
    size = parentEnd - offset;
  }
  if (!Number.isSafeInteger(size) || size < headerSize) return null;
  const declaredEnd = offset + size;
  if (!Number.isSafeInteger(declaredEnd)) return null;
  return {
    type,
    contentStart: offset + headerSize,
    availableEnd: Math.min(declaredEnd, parentEnd),
    declaredEnd,
  };
}

function avifBrandsAreValid(bytes: Uint8Array, view: DataView): boolean {
  let offset = 0;
  while (offset + 8 <= bytes.length) {
    const box = readIsoBox(bytes, view, offset, bytes.length);
    if (!box) return false;
    if (box.type === "ftyp") {
      if (box.contentStart + 8 > box.availableEnd) return false;
      if (
        hasAscii(bytes, box.contentStart, "avif") ||
        hasAscii(bytes, box.contentStart, "avis")
      ) {
        return true;
      }
      for (
        let brandOffset = box.contentStart + 8;
        brandOffset + 4 <= box.availableEnd;
        brandOffset += 4
      ) {
        if (
          hasAscii(bytes, brandOffset, "avif") ||
          hasAscii(bytes, brandOffset, "avis")
        ) {
          return true;
        }
      }
      return false;
    }
    if (box.declaredEnd > bytes.length) return false;
    offset = box.declaredEnd;
  }
  return false;
}

function findAvifDimensions(
  bytes: Uint8Array,
  view: DataView,
  start: number,
  end: number,
  inPropertyContainer = false,
  depth = 0,
): MediaEditorDimensions | null {
  if (depth > 8) return null;
  let offset = start;
  while (offset + 8 <= end) {
    const box = readIsoBox(bytes, view, offset, end);
    if (!box) return null;
    if (
      box.type === "ispe" &&
      inPropertyContainer &&
      box.contentStart + 12 <= box.availableEnd
    ) {
      return validDimensions(
        view.getUint32(box.contentStart + 4, false),
        view.getUint32(box.contentStart + 8, false),
      );
    }

    let childStart = box.contentStart;
    let nextInPropertyContainer = inPropertyContainer;
    if (box.type === "meta") childStart += 4;
    if (box.type === "ipco") nextInPropertyContainer = true;
    if (
      (box.type === "meta" || box.type === "iprp" || box.type === "ipco") &&
      childStart <= box.availableEnd
    ) {
      const dimensions = findAvifDimensions(
        bytes,
        view,
        childStart,
        box.availableEnd,
        nextInPropertyContainer,
        depth + 1,
      );
      if (dimensions) return dimensions;
    }

    if (box.declaredEnd > end) break;
    offset = box.declaredEnd;
  }
  return null;
}

function avifDimensions(
  bytes: Uint8Array,
  view: DataView,
): MediaEditorDimensions {
  if (!avifBrandsAreValid(bytes, view)) throw malformedHeader("AVIF");
  const dimensions = findAvifDimensions(bytes, view, 0, bytes.length);
  if (!dimensions) throw malformedHeader("AVIF");
  return dimensions;
}

function jpegOrientation(
  bytes: Uint8Array,
  segmentStart: number,
  segmentEnd: number,
): number {
  if (
    segmentEnd - segmentStart < 14 ||
    !hasAscii(bytes, segmentStart, "Exif\0\0")
  ) {
    return 1;
  }
  const tiff = segmentStart + 6;
  const little = hasAscii(bytes, tiff, "II");
  if (!little && !hasAscii(bytes, tiff, "MM")) return 1;
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const uint16 = (offset: number) => view.getUint16(offset, little);
  const uint32 = (offset: number) => view.getUint32(offset, little);
  if (tiff + 8 > segmentEnd || uint16(tiff + 2) !== 42) return 1;
  const ifd = tiff + uint32(tiff + 4);
  if (ifd < tiff || ifd + 2 > segmentEnd) return 1;
  const count = uint16(ifd);
  for (let index = 0; index < count; index += 1) {
    const entry = ifd + 2 + index * 12;
    if (entry + 12 > segmentEnd) break;
    if (uint16(entry) === 0x0112 && uint16(entry + 2) === 3) {
      const value = uint16(entry + 8);
      return value >= 1 && value <= 8 ? value : 1;
    }
  }
  return 1;
}

/** Header-only probe untuk menghindari decode penuh hanya demi metadata. */
export async function readPhotoDimensions(
  file: Blob,
  signal?: AbortSignal,
): Promise<MediaEditorDimensions> {
  throwIfAborted(signal);
  const bytes = new Uint8Array(
    await file.slice(0, Math.min(file.size, HEADER_READ_LIMIT)).arrayBuffer(),
  );
  throwIfAborted(signal);
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  if (
    bytes.length >= 24 &&
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47
  ) {
    return validDimensions(view.getUint32(16, false), view.getUint32(20, false));
  }
  if (hasAscii(bytes, 0, "GIF87a") || hasAscii(bytes, 0, "GIF89a")) {
    return gifDimensions(bytes, view);
  }
  if (hasAscii(bytes, 0, "RIFF") && hasAscii(bytes, 8, "WEBP")) {
    return webpDimensions(bytes, view, file.size);
  }
  if (
    file.type.toLowerCase() === "image/avif" ||
    (bytes.length >= 12 && hasAscii(bytes, 4, "ftyp"))
  ) {
    return avifDimensions(bytes, view);
  }
  if (bytes[0] !== 0xff || bytes[1] !== 0xd8) {
    const mime = file.type.toLowerCase();
    const label =
      mime === "image/png"
        ? "PNG"
        : mime === "image/gif"
          ? "GIF"
          : mime === "image/webp"
            ? "WebP"
            : mime === "image/jpeg"
              ? "JPEG"
              : null;
    if (label) throw malformedHeader(label);
    throw new Error("Format foto tidak didukung atau header file rusak.");
  }
  const frames = new Set([
    0xc0, 0xc1, 0xc2, 0xc3, 0xc5, 0xc6, 0xc7, 0xc9, 0xca, 0xcb, 0xcd,
    0xce, 0xcf,
  ]);
  let offset = 2;
  let orientation = 1;
  let dimensions: MediaEditorDimensions | null = null;
  while (offset + 4 <= bytes.length) {
    while (offset < bytes.length && bytes[offset] !== 0xff) offset += 1;
    while (offset < bytes.length && bytes[offset] === 0xff) offset += 1;
    if (offset >= bytes.length) break;
    const marker = bytes[offset];
    offset += 1;
    if (marker === 0xda || marker === 0xd9) break;
    if (marker === 0xd8 || (marker >= 0xd0 && marker <= 0xd7)) continue;
    if (offset + 2 > bytes.length) break;
    const length = view.getUint16(offset, false);
    if (length < 2 || offset + length > bytes.length) break;
    const segmentStart = offset + 2;
    const segmentEnd = offset + length;
    if (marker === 0xe1) {
      orientation = jpegOrientation(bytes, segmentStart, segmentEnd);
    }
    if (frames.has(marker) && segmentStart + 5 <= segmentEnd) {
      dimensions = validDimensions(
        view.getUint16(segmentStart + 3, false),
        view.getUint16(segmentStart + 1, false),
      );
    }
    offset = segmentEnd;
  }
  if (!dimensions) throw malformedHeader("JPEG");
  return orientation >= 5 && orientation <= 8
    ? { width: dimensions.height, height: dimensions.width }
    : dimensions;
}

export function releaseCanvas(canvas: HTMLCanvasElement): void {
  canvas.width = 0;
  canvas.height = 0;
}

function canvasToBlob(
  canvas: HTMLCanvasElement,
  type: string,
  quality: number,
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) =>
        blob
          ? resolve(blob)
          : reject(new Error("Browser gagal membuat hasil foto.")),
      type,
      quality,
    );
  });
}

interface DecodedSource {
  source: CanvasImageSource;
  width: number;
  height: number;
  close: () => void;
}

async function decodeWithImageElement(
  file: File,
  signal?: AbortSignal,
): Promise<DecodedSource> {
  const url = URL.createObjectURL(file);

  try {
    const image = await loadImageElement(url, {
      signal,
      errorMessage: "Foto tidak dapat dibaca oleh browser ini.",
    });
    throwIfAborted(signal);
    return {
      source: image,
      width: image.naturalWidth,
      height: image.naturalHeight,
      close: () => {
        image.src = "";
        URL.revokeObjectURL(url);
      },
    };
  } catch (error) {
    URL.revokeObjectURL(url);
    throw error;
  }
}

async function decodeSource(
  file: File,
  maxDimension: number,
  sourceDimensions: MediaEditorDimensions | null | undefined,
  signal?: AbortSignal,
): Promise<DecodedSource> {
  throwIfAborted(signal);
  const dimensions =
    sourceDimensions ?? (await readPhotoDimensions(file, signal));
  if (typeof createImageBitmap === "function") {
    let bitmap: ImageBitmap | null = null;
    try {
      const target = dimensions
        ? boundedDimensions(
            dimensions.width,
            dimensions.height,
            maxDimension,
          )
        : null;
      bitmap = await createImageBitmap(file, {
        ...(target
          ? { resizeWidth: target.width, resizeHeight: target.height }
          : {}),
        resizeQuality: "high",
        imageOrientation: "from-image",
      });
      if (signal?.aborted) {
        bitmap.close();
        bitmap = null;
        throwIfAborted(signal);
      }
      const resolved = bitmap;
      bitmap = null;
      if (!resolved) throw new Error("Foto gagal didecode.");
      return {
        source: resolved,
        width: resolved.width,
        height: resolved.height,
        close: () => resolved.close(),
      };
    } catch (error) {
      bitmap?.close();
      if (signal?.aborted) throw error;
      // Safari lama dapat menolak opsi resize; fallback tetap dibatasi saat draw.
    }
  }
  if (
    dimensions &&
    dimensions.width * dimensions.height > SAFARI_FALLBACK_MAX_PIXELS
  ) {
    throw new Error(
      "Foto ini terlalu besar untuk editor di browser ini. Gunakan browser terbaru atau foto beresolusi lebih kecil.",
    );
  }
  return decodeWithImageElement(file, signal);
}

/**
 * Decode sekali lalu segera raster ke canvas bounded. Canvas dimiliki pemanggil
 * dan wajib dilepas dengan releaseCanvas setelah selesai.
 */
export async function renderFileToBoundedCanvas(
  file: File,
  maxDimension: number,
  sourceDimensions?: MediaEditorDimensions | null,
  signal?: AbortSignal,
): Promise<HTMLCanvasElement> {
  const decoded = await decodeSource(
    file,
    maxDimension,
    sourceDimensions,
    signal,
  );
  try {
    throwIfAborted(signal);
    const size = boundedDimensions(decoded.width, decoded.height, maxDimension);
    const canvas = createCanvas(size.width, size.height);
    const context = canvas.getContext("2d", { alpha: true });
    if (!context) {
      releaseCanvas(canvas);
      throw new Error("Canvas tidak tersedia di browser ini.");
    }
    context.imageSmoothingEnabled = true;
    context.imageSmoothingQuality = "high";
    try {
      context.drawImage(decoded.source, 0, 0, size.width, size.height);
      throwIfAborted(signal);
      return canvas;
    } catch (error) {
      releaseCanvas(canvas);
      throw error;
    }
  } finally {
    decoded.close();
  }
}

/** Preview bounded memakai WebP modern; PNG tetap menjaga alpha tanpa rugi. */
export async function createBoundedImagePreview(
  file: File,
  options: PreviewOptions = {},
): Promise<BoundedImagePreview> {
  const maxDimension =
    options.maxDimension ?? EDITOR_PREVIEW_MAX_DIMENSION;
  const canvas = await renderFileToBoundedCanvas(
    file,
    maxDimension,
    options.sourceDimensions,
    options.signal,
  );
  try {
    const width = canvas.width;
    const height = canvas.height;
    const context = canvas.getContext("2d");
    if (!context) throw new Error("Canvas tidak tersedia di browser ini.");
    const previewMime = file.type === "image/png" ? "image/png" : "image/webp";
    const blob = await canvasToBlob(
      canvas,
      previewMime,
      options.quality ?? 0.86,
    );
    throwIfAborted(options.signal);
    return { blob, width, height };
  } finally {
    releaseCanvas(canvas);
  }
}

function adjustmentFactor(value: number, span: number): number {
  const safe = Math.max(-100, Math.min(100, value));
  return Math.max(0, 1 + (safe / 100) * span);
}

/** Aproksimasi CSS memakai profil yang sama dengan renderer pixel final. */
export function buildPhotoFilter(recipe: PhotoEditRecipe): string {
  const { exposure, brightness, contrast, saturation, warmth } =
    resolvedPhotoAdjustments(recipe);
  const exposureBrightness = Math.max(0, 2 ** ((exposure / 100) * 0.7));
  const warmthStrength = Math.abs(warmth) / 100;
  return [
    `brightness(${exposureBrightness * adjustmentFactor(brightness, 0.55)})`,
    `contrast(${adjustmentFactor(contrast, 0.65)})`,
    `saturate(${adjustmentFactor(saturation, 0.9)})`,
    warmthStrength > 0 ? `sepia(${warmthStrength * 0.18})` : "",
    warmthStrength > 0 ? `hue-rotate(${warmth > 0 ? -8 : 172}deg)` : "",
  ]
    .filter(Boolean)
    .join(" ");
}

export { canvasToBlob };
