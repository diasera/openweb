"use client";

import {
  boundedDimensions,
  canvasToBlob,
  releaseCanvas,
  throwIfAborted,
} from "@/lib/media-editor";
import { loadImageElement } from "@/lib/media/image-element";
import { UPLOAD_LIMITS } from "@/lib/constants";
import {
  canonicalMimeForFormat,
  resolveMediaFormat,
  type MediaFormatDefinition,
  type MediaFormatKind,
} from "./registry";
import { headerMatchesFormat, inspectBlobHeader } from "./sniff";

const PORTABLE_IMAGE_MAX_DIMENSION = 4096;
const PORTABLE_IMAGE_MAX_PIXELS = 80_000_000;
const HEIC_CONVERSION_TIMEOUT_MS = 60_000;

export interface PreparedMediaFile {
  file: File;
  format: MediaFormatDefinition;
  animated: boolean;
  notice: string | null;
}

function renamedFile(name: string, extension: string): string {
  const base = name.replace(/\.[^.]+$/, "").trim() || "media";
  return `${base}.${extension}`;
}

function canonicalFile(file: File, format: MediaFormatDefinition): File {
  const canonicalMime = canonicalMimeForFormat(format);
  const claimedMime = file.type.split(";", 1)[0]?.trim().toLowerCase() ?? "";
  if (claimedMime === canonicalMime) return file;
  return new File([file], file.name, {
    type: canonicalMime,
    lastModified: file.lastModified,
  });
}

async function portableJpegFile(blob: Blob, source: File): Promise<File> {
  if (blob.size <= 0) {
    throw new Error("Normalisasi gambar menghasilkan file kosong.");
  }
  if (blob.size > UPLOAD_LIMITS.imageMaxBytes) {
    throw new Error(
      `Hasil normalisasi terlalu besar (maks ${Math.round(
        UPLOAD_LIMITS.imageMaxBytes / 1048576,
      )} MB).`,
    );
  }
  const inspection = await inspectBlobHeader(blob);
  if (inspection.family !== "jpeg" || inspection.encrypted) {
    throw new Error("Normalisasi gambar tidak menghasilkan JPEG yang valid.");
  }
  return new File([blob], renamedFile(source.name, "jpg"), {
    type: "image/jpeg",
    lastModified: Date.now(),
  });
}

async function convertHeicOnMainThread(file: File): Promise<Blob> {
  const { heicTo, isHeic } = await import("heic-to/csp");
  if (!(await isHeic(file))) {
    throw new Error("Isi file tidak cocok dengan format HEIC/HEIF.");
  }
  return heicTo({ blob: file, type: "image/jpeg", quality: 0.92 });
}

async function convertHeicInWorker(
  file: File,
  signal?: AbortSignal,
): Promise<Blob> {
  throwIfAborted(signal);
  if (typeof Worker === "undefined") return convertHeicOnMainThread(file);

  const worker = new Worker(new URL("./heic.worker.ts", import.meta.url), {
    type: "module",
    name: "heic-normalizer",
  });
  try {
    return await new Promise<Blob>((resolve, reject) => {
      const cleanup = () => {
        window.clearTimeout(timer);
        signal?.removeEventListener("abort", onAbort);
        worker.onmessage = null;
        worker.onerror = null;
      };
      const onAbort = () => {
        cleanup();
        reject(new DOMException("Operasi dibatalkan.", "AbortError"));
      };
      const timer = window.setTimeout(() => {
        cleanup();
        reject(
          new Error(
            "Konversi HEIC terlalu lama. Coba foto lebih kecil atau perangkat yang lebih kuat.",
          ),
        );
      }, HEIC_CONVERSION_TIMEOUT_MS);
      worker.onmessage = (event: MessageEvent<{ blob?: Blob; error?: string }>) => {
        cleanup();
        if (event.data.blob) resolve(event.data.blob);
        else reject(new Error(event.data.error ?? "HEIC/HEIF gagal dikonversi."));
      };
      worker.onerror = () => {
        cleanup();
        reject(new Error("Pemroses HEIC/HEIF tidak dapat dijalankan."));
      };
      signal?.addEventListener("abort", onAbort, { once: true });
      if (signal?.aborted) {
        onAbort();
        return;
      }
      worker.postMessage({ file, quality: 0.92 });
    });
  } finally {
    worker.terminate();
  }
}

async function loadNativeImage(
  file: File,
  signal?: AbortSignal,
): Promise<HTMLImageElement> {
  const url = URL.createObjectURL(file);
  try {
    const image = await loadImageElement(url, {
      signal,
      errorMessage:
        "Browser ini tidak dapat mendecode format tersebut. " +
        "Gunakan HEIC, AVIF, WebP, JPEG, atau PNG.",
    });
    throwIfAborted(signal);
    return image;
  } catch (cause) {
    URL.revokeObjectURL(url);
    throw cause;
  }
}

async function normalizeNativeImage(
  file: File,
  signal?: AbortSignal,
): Promise<Blob> {
  const image = await loadNativeImage(file, signal);
  const sourceUrl = image.src;
  let canvas: HTMLCanvasElement | null = null;
  try {
    const width = image.naturalWidth;
    const height = image.naturalHeight;
    if (
      width <= 0 ||
      height <= 0 ||
      width * height > PORTABLE_IMAGE_MAX_PIXELS
    ) {
      throw new Error("Dimensi gambar tidak valid atau terlalu besar.");
    }
    const output = boundedDimensions(
      width,
      height,
      PORTABLE_IMAGE_MAX_DIMENSION,
    );
    canvas = document.createElement("canvas");
    canvas.width = output.width;
    canvas.height = output.height;
    const context = canvas.getContext("2d", { alpha: false });
    if (!context) throw new Error("Canvas tidak tersedia di browser ini.");
    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, output.width, output.height);
    context.imageSmoothingEnabled = true;
    context.imageSmoothingQuality = "high";
    context.drawImage(image, 0, 0, output.width, output.height);
    throwIfAborted(signal);
    return await canvasToBlob(canvas, "image/jpeg", 0.92);
  } finally {
    image.src = "";
    URL.revokeObjectURL(sourceUrl);
    if (canvas) releaseCanvas(canvas);
  }
}

function processorRequired(format: MediaFormatDefinition): Error {
  return new Error(
    format.rejectionMessage ??
      `${format.label} memerlukan pemroses media sebelum dapat dipublikasikan.`,
  );
}

export async function prepareMediaFile(
  file: File,
  kinds: readonly MediaFormatKind[],
  signal?: AbortSignal,
): Promise<PreparedMediaFile> {
  throwIfAborted(signal);
  const resolved = resolveMediaFormat(file, kinds);
  if (!resolved.ok) throw new Error(resolved.error);
  const { format } = resolved;
  if (file.size <= 0) {
    throw new Error("File kosong tidak dapat dipublikasikan.");
  }
  const maxBytes =
    format.kind === "image"
      ? UPLOAD_LIMITS.imageMaxBytes
      : format.kind === "video"
        ? UPLOAD_LIMITS.videoMaxBytes
        : UPLOAD_LIMITS.audioMaxBytes;
  if (file.size > maxBytes) {
    throw new Error(
      `File terlalu besar (maks ${Math.round(maxBytes / 1048576)} MB).`,
    );
  }
  if (format.preparation === "external" || format.preparation === "blocked") {
    throw processorRequired(format);
  }

  const inspection = await inspectBlobHeader(file);
  throwIfAborted(signal);
  if (!headerMatchesFormat(format, inspection)) {
    throw new Error(
      `Isi file tidak cocok dengan format ${format.label}. Jangan hanya mengganti ekstensi.`,
    );
  }

  if (
    inspection.animated &&
    (format.preparation === "heic" ||
      format.preparation === "native-image")
  ) {
    throw new Error(
      `${format.label} berisi beberapa frame atau halaman. Ekspor satu frame ` +
        "sebagai JPEG/PNG, atau gunakan format animasi yang dapat dipertahankan.",
    );
  }

  if (format.preparation === "heic") {
    const blob = await convertHeicInWorker(file, signal);
    throwIfAborted(signal);
    const portable = await portableJpegFile(blob, file);
    throwIfAborted(signal);
    return {
      file: portable,
      format,
      animated: false,
      notice:
        "HEIC/HEIF satu frame dinormalisasi ke JPEG agar dapat diedit dan tampil konsisten.",
    };
  }

  if (format.preparation === "native-image") {
    const blob = await normalizeNativeImage(file, signal);
    throwIfAborted(signal);
    const portable = await portableJpegFile(blob, file);
    throwIfAborted(signal);
    return {
      file: portable,
      format,
      animated: false,
      notice: `${format.label} dinormalisasi ke JPEG portabel sebelum disimpan.`,
    };
  }

  const normalized = canonicalFile(file, format);
  const compatibilityNotice =
    format.compatibility === "device-dependent"
      ? `${format.label} dapat bergantung pada codec perangkat. ` +
        "MP4 H.264/AAC adalah pilihan video paling kompatibel."
      : null;
  const animationNotice = inspection.animated
    ? `${format.label} animasi dipertahankan utuh dan editor foto dinonaktifkan.`
    : null;
  return {
    file: normalized,
    format,
    animated: inspection.animated,
    notice: animationNotice ?? compatibilityNotice,
  };
}

export function prepareImageFile(file: File, signal?: AbortSignal) {
  return prepareMediaFile(file, ["image"], signal);
}

export function preparePublicMediaFile(file: File, signal?: AbortSignal) {
  return prepareMediaFile(file, ["image", "video"], signal);
}

export function prepareAudioFile(file: File, signal?: AbortSignal) {
  return prepareMediaFile(file, ["audio"], signal);
}
