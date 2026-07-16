import { STORAGE_BUCKETS, UPLOAD_LIMITS } from "@/lib/constants";
import {
  resolveMediaFormat,
  storageFormatForMime,
  type MediaFormatKind,
} from "@/lib/media-formats/registry";
import type { DirectUploadKind, UploadDescriptor } from "./types";

/**
 * Semua objek upload memakai nama unik dan `upsert: false`, sehingga URL lama
 * tidak pernah diam-diam menunjuk isi baru. Satu TTL panjang aman dipakai oleh
 * upload server, signed PUT, dan TUS agar aset publik tidak terus diambil ulang.
 */
export const PUBLIC_UPLOAD_CACHE_CONTROL = String(365 * 24 * 60 * 60);

export type UploadPolicyResult =
  | {
      ok: true;
      bucket: string;
      extension: string;
      mediaType?: "photo" | "video";
    }
  | { ok: false; error: string };

/** Satu kebijakan ukuran/MIME untuk validasi browser dan server penandatangan. */
export function validateUploadDescriptor(
  descriptor: UploadDescriptor,
): UploadPolicyResult {
  if (!Number.isSafeInteger(descriptor.size) || descriptor.size <= 0) {
    return { ok: false, error: "Ukuran file tidak valid." };
  }

  if (descriptor.kind === "music") {
    const resolved = resolveMediaFormat(descriptor, ["audio"]);
    if (!resolved.ok) return resolved;
    const format = storageFormatForMime("audio", descriptor.type);
    if (!format || format.id !== resolved.format.id) {
      return {
        ok: false,
        error: "Audio perlu dinormalisasi ke format web sebelum diunggah.",
      };
    }
    if (descriptor.size > UPLOAD_LIMITS.audioMaxBytes) {
      return { ok: false, error: "Audio terlalu besar (maks 50 MB)." };
    }
    return {
      ok: true,
      bucket: STORAGE_BUCKETS.music,
      extension: format.storageExtension,
    };
  }

  const resolved = resolveMediaFormat(descriptor, ["image", "video"]);
  if (!resolved.ok) return resolved;
  const mediaKind: MediaFormatKind = resolved.format.kind;
  const format = storageFormatForMime(mediaKind, descriptor.type);
  if (!format || format.id !== resolved.format.id) {
    return {
      ok: false,
      error: "Media perlu dinormalisasi ke format web sebelum diunggah.",
    };
  }
  const isVideo = mediaKind === "video";
  const maxBytes = isVideo
    ? UPLOAD_LIMITS.videoMaxBytes
    : UPLOAD_LIMITS.imageMaxBytes;
  if (descriptor.size > maxBytes) {
    return {
      ok: false,
      error: `File terlalu besar (maks ${Math.round(maxBytes / 1048576)} MB).`,
    };
  }
  return {
    ok: true,
    bucket: STORAGE_BUCKETS.media,
    extension: format.storageExtension,
    mediaType: isVideo ? "video" : "photo",
  };
}

export function descriptorFromFile(
  kind: DirectUploadKind,
  file: File,
): UploadDescriptor {
  return { kind, name: file.name, type: file.type, size: file.size };
}

/** Kebijakan gambar tunggal untuk field aset, avatar, cover, dan isi artikel. */
export function validateImageFile(file: File): UploadPolicyResult {
  const result = validateUploadDescriptor(descriptorFromFile("media", file));
  if (!result.ok) return result;
  if (result.mediaType !== "photo") {
    return { ok: false, error: "File harus berupa gambar yang didukung." };
  }
  return result;
}
