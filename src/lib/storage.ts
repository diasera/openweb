import "server-only";
import { createAdminSupabase } from "@/lib/supabase/admin";
import { STORAGE_BUCKETS } from "@/lib/constants";
import {
  PUBLIC_UPLOAD_CACHE_CONTROL,
  validateImageFile,
} from "@/lib/uploads/policy";
import {
  canonicalMimeForFormat,
  headerMatchesFormat,
  inspectBlobHeader,
  inspectMediaHeader,
  MEDIA_HEADER_BYTES,
  resolveMediaFormat,
} from "@/lib/media-formats";

const STORED_HEADER_BYTES = Math.min(MEDIA_HEADER_BYTES, 64 * 1024);

/** Jenis media per bucket dan bucket privat — satu sumber untuk verifikasi & URL baca. */
const BUCKET_MEDIA_KINDS: Record<string, readonly ("image" | "video" | "audio")[]> = {
  [STORAGE_BUCKETS.music]: ["audio"],
  [STORAGE_BUCKETS.media]: ["image", "video"],
  [STORAGE_BUCKETS.mediaInbox]: ["image", "video"],
};
const PRIVATE_BUCKETS: ReadonlySet<string> = new Set([STORAGE_BUCKETS.mediaInbox]);
const SIGNED_READ_SECONDS = 60 * 60;

export type StoredObjectVerification =
  | { ok: true; mimeType: string }
  | { ok: false; reason: "invalid" | "unavailable" };

/** Helper upload gambar; kebijakan MIME/ukuran bersumber dari uploads/policy. */
export async function uploadToBucket(
  bucket: string,
  file: File,
  prefix = "",
): Promise<{ url?: string; error?: string }> {
  const valid = validateImageFile(file);
  if (!valid.ok) return { error: valid.error };
  const resolved = resolveMediaFormat(file, ["image"]);
  if (
    !resolved.ok ||
    resolved.format.preparation !== "direct" ||
    !headerMatchesFormat(resolved.format, await inspectBlobHeader(file))
  ) {
    return { error: "Isi file tidak cocok dengan format gambar." };
  }

  const sb = createAdminSupabase();
  const path = `${prefix}${crypto.randomUUID()}.${valid.extension}`;
  const { error } = await sb.storage
    .from(bucket)
    .upload(path, file, {
      cacheControl: PUBLIC_UPLOAD_CACHE_CONTROL,
      contentType: file.type,
      upsert: false,
    });
  if (error) return { error: "Gagal mengunggah gambar" };

  const { data } = sb.storage.from(bucket).getPublicUrl(path);
  return { url: data.publicUrl };
}

/** Validasi objek direct-upload terhadap ukuran dan MIME yang ditandatangani. */
export async function verifyStoredObject(
  bucket: string,
  path: string,
  expectedSize: number,
  expectedMime: string,
): Promise<StoredObjectVerification> {
  const sb = createAdminSupabase();
  const { data, error } = await sb.storage.from(bucket).info(path);
  if (error || !data) {
    console.warn("[storage:verify] metadata objek tidak tersedia", {
      bucket,
      code: error?.name,
      message: error?.message,
    });
    return { ok: false, reason: "unavailable" };
  }
  const contentType = data.contentType?.split(";", 1)[0]?.trim().toLowerCase();
  const expectedContentType = expectedMime
    .split(";", 1)[0]
    ?.trim()
    .toLowerCase();
  if (
    data.size !== expectedSize ||
    !expectedContentType ||
    contentType !== expectedContentType
  ) {
    return { ok: false, reason: "invalid" };
  }

  const resolved = resolveMediaFormat(
    { name: path, type: expectedMime },
    BUCKET_MEDIA_KINDS[bucket] ?? ["image"],
  );
  if (!resolved.ok || resolved.format.preparation !== "direct") {
    return { ok: false, reason: "invalid" };
  }

  try {
    const readUrl = await getStorageReadUrl(bucket, path, 60);
    if (!readUrl) return { ok: false, reason: "unavailable" };
    const response = await fetch(readUrl, {
      cache: "no-store",
      headers: { range: `bytes=0-${STORED_HEADER_BYTES - 1}` },
      signal: AbortSignal.timeout(10_000),
    });
    if (!response.ok || !response.body) {
      return {
        ok: false,
        reason:
          response.status === 404 || response.status === 416
            ? "invalid"
            : "unavailable",
      };
    }

    const reader = response.body.getReader();
    const chunks: Uint8Array[] = [];
    let total = 0;
    try {
      while (total < STORED_HEADER_BYTES) {
        const { done, value } = await reader.read();
        if (done) break;
        const remaining = STORED_HEADER_BYTES - total;
        const chunk =
          value.byteLength > remaining ? value.slice(0, remaining) : value;
        chunks.push(chunk);
        total += chunk.byteLength;
      }
    } finally {
      await reader.cancel().catch(() => undefined);
    }
    if (total === 0) return { ok: false, reason: "invalid" };
    const header = new Uint8Array(total);
    let offset = 0;
    for (const chunk of chunks) {
      header.set(chunk, offset);
      offset += chunk.byteLength;
    }
    return headerMatchesFormat(resolved.format, inspectMediaHeader(header))
      ? { ok: true, mimeType: canonicalMimeForFormat(resolved.format) }
      : { ok: false, reason: "invalid" };
  } catch (cause) {
    console.warn("[storage:verify] header objek tidak dapat diverifikasi", {
      bucket,
      cause: cause instanceof Error ? cause.message : String(cause),
    });
    return { ok: false, reason: "unavailable" };
  }
}

export function getStoragePublicUrl(bucket: string, path: string): string {
  return createAdminSupabase().storage.from(bucket).getPublicUrl(path).data
    .publicUrl;
}

/** URL baca: public URL untuk bucket publik, signed URL berumur pendek untuk bucket privat. */
export async function getStorageReadUrl(
  bucket: string,
  path: string,
  expiresIn = SIGNED_READ_SECONDS,
): Promise<string | null> {
  if (!PRIVATE_BUCKETS.has(bucket)) return getStoragePublicUrl(bucket, path);
  const { data, error } = await createAdminSupabase()
    .storage.from(bucket)
    .createSignedUrl(path, expiresIn);
  return error || !data ? null : data.signedUrl;
}

/** Signed URL massal untuk bucket privat; path yang gagal tidak ada di hasil. */
export async function getSignedReadUrls(
  bucket: string,
  paths: readonly string[],
  expiresIn = SIGNED_READ_SECONDS,
): Promise<Map<string, string>> {
  if (paths.length === 0) return new Map();
  const { data, error } = await createAdminSupabase()
    .storage.from(bucket)
    .createSignedUrls([...paths], expiresIn);
  if (error || !data) return new Map();
  return new Map(
    data.flatMap((item) =>
      item.path && item.signedUrl && !item.error ? [[item.path, item.signedUrl]] : [],
    ),
  );
}

/**
 * Pindahkan objek antarbucket dengan path yang sama. Idempoten: bila objek
 * sudah berada di tujuan (dipindah request lain/instalasi lama), dianggap sukses.
 */
export async function moveStorageObject(
  fromBucket: string,
  toBucket: string,
  path: string,
): Promise<boolean> {
  const storage = createAdminSupabase().storage;
  const { error } = await storage
    .from(fromBucket)
    .move(path, path, { destinationBucket: toBucket });
  if (!error) return true;

  const { data: exists } = await storage.from(toBucket).exists(path);
  if (exists) return true;
  console.warn("[storage:move] objek gagal dipindahkan", {
    fromBucket,
    toBucket,
    code: error.name,
    message: error.message,
  });
  return false;
}

/** Hapus objek storage dengan path tepercaya (best-effort). */
export async function removeStorageObject(
  bucket: string,
  path: string,
): Promise<boolean> {
  const { error } = await createAdminSupabase().storage.from(bucket).remove([path]);
  if (error) {
    console.warn("[storage:remove] objek gagal dibersihkan", {
      bucket,
      code: error.name,
      message: error.message,
    });
    return false;
  }
  return true;
}
