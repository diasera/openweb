import "server-only";
import { createAdminSupabase } from "@/lib/supabase/admin";
import { STORAGE_BUCKETS, UPLOAD_LIMITS } from "@/lib/constants";
import {
  getStoragePublicUrl,
  getSignedReadUrls,
  moveStorageObject,
  removeStorageObject,
} from "@/lib/storage";
import { checkedDatabaseCall, checkedMutation } from "@/lib/database/mutation";
import { isSchemaOutdatedError, SCHEMA_OUTDATED_MESSAGE } from "@/lib/database/errors";
import type { MediaDetails } from "./metadata-schema";
import type {
  MediaRow,
  MediaSlideRow,
  MediaStatus,
  MediaSource,
  MediaType,
} from "@/lib/types/database";
import type { ActionResult } from "@/lib/action-result";
import { syncMediaMentions } from "@/lib/members/mentions";

/**
 * Invarian moderasi: byte media berada di bucket publik `media` HANYA saat
 * barisnya berstatus approved; selain itu objek tinggal di inbox privat.
 * Kolom `url` selalu menyimpan public URL kanonis (path sama di kedua bucket)
 * sehingga unique index tetap menjadi pengaman replay finalisasi.
 */
function mediaPathFromUrl(publicUrl: string): string | null {
  const marker = `/${STORAGE_BUCKETS.media}/`;
  const idx = publicUrl.indexOf(marker);
  if (idx === -1) return null;
  const rawPath = publicUrl.slice(idx + marker.length).split("?")[0];
  return rawPath ? decodeURIComponent(rawPath) : null;
}

/** Pindahkan objek media ke bucket publik (true) atau kembali ke inbox privat. */
export async function setMediaObjectPublic(
  publicUrl: string,
  visible: boolean,
): Promise<boolean> {
  const path = mediaPathFromUrl(publicUrl);
  if (!path) return false;
  return visible
    ? moveStorageObject(STORAGE_BUCKETS.mediaInbox, STORAGE_BUCKETS.media, path)
    : moveStorageObject(STORAGE_BUCKETS.media, STORAGE_BUCKETS.mediaInbox, path);
}

/**
 * Pindahkan seluruh objek satu pin sekaligus. Bila salah satu gagal, objek yang
 * sudah pindah dikembalikan agar sampul dan slide tidak pernah beda visibilitas.
 */
export async function setMediaObjectsPublic(
  publicUrls: readonly string[],
  visible: boolean,
): Promise<boolean> {
  const moved = await Promise.all(
    publicUrls.map((url) => setMediaObjectPublic(url, visible)),
  );
  if (moved.every(Boolean)) return true;
  await Promise.all(
    publicUrls
      .filter((_, index) => moved[index])
      .map((url) => setMediaObjectPublic(url, !visible)),
  );
  return false;
}

/** URL yang bisa dibuka admin: publik bila approved, signed URL inbox bila belum. */
export async function readableMediaUrls(
  rows: ReadonlyArray<Pick<MediaRow, "url" | "status">>,
): Promise<Map<string, string>> {
  const hiddenPath = (row: Pick<MediaRow, "url" | "status">) =>
    row.status === "approved" ? null : mediaPathFromUrl(row.url);
  const signed = await getSignedReadUrls(
    STORAGE_BUCKETS.mediaInbox,
    rows.flatMap((row) => hiddenPath(row) ?? []),
  );
  return new Map(
    rows.map((row) => {
      const path = hiddenPath(row);
      // Kiriman pending dari versi lama mungkin masih berada di bucket publik.
      return [row.url, (path && signed.get(path)) || row.url];
    }),
  );
}

/** Satu file terverifikasi yang menjadi sampul atau slide carousel sebuah pin. */
export interface MediaRecordItem {
  path: string;
  mediaType: MediaType;
  mimeType: string;
  width: number | null;
  height: number | null;
}

/**
 * Finalisasi metadata media publik dan admin. Byte file sudah dikirim langsung
 * ke Storage oleh browser; fungsi ini menyimpan satu pin terverifikasi: item
 * pertama menjadi baris `media` (sampul), sisanya slide carousel.
 */
export async function saveMediaRecord(params: {
  items: readonly MediaRecordItem[];
  title: string | null;
  category: string | null;
  caption: string | null;
  uploaderName: string | null;
  allowComments: boolean;
  status: MediaStatus;
  source: MediaSource;
  ip: string | null;
  reviewedBy: string | null;
}): Promise<ActionResult> {
  const [cover, ...slides] = params.items;
  if (!cover) return { error: "Media tidak ditemukan." };
  const sb = createAdminSupabase();
  const urls = params.items.map((item) =>
    getStoragePublicUrl(STORAGE_BUCKETS.media, item.path),
  );
  const cleanup = () => Promise.all(urls.map(removeMediaObjectIfUnused));
  // Media admin langsung tampil, jadi objeknya dipublikasikan sebelum barisnya ada.
  if (params.status === "approved" && !(await setMediaObjectsPublic(urls, true))) {
    await cleanup();
    return { error: "Gagal memublikasikan media. Coba lagi." };
  }
  const saved = await checkedMutation(
    "media-upload.create",
    "Gagal menyimpan data media.",
    sb
      .from("media")
      .insert({
        type: cover.mediaType,
        mime_type: cover.mimeType,
        title: params.title,
        category: params.category,
        url: urls[0],
        caption: params.caption,
        uploader_name: params.uploaderName,
        allow_comments: params.allowComments,
        status: params.status,
        source: params.source,
        width: cover.width,
        height: cover.height,
        ip_address: params.ip,
        reviewed_by: params.reviewedBy,
        reviewed_at:
          params.status === "approved" ? new Date().toISOString() : null,
      })
      .select("id")
      .maybeSingle(),
    { duplicateMessage: "Tiket unggahan ini sudah digunakan." },
  );
  if (!saved.ok) {
    // Unique URL membuat replay kalah secara atomik. Jangan menghapus objek
    // milik request pemenang; bersihkan hanya bila tak ada referensi DB.
    await cleanup();
    return { error: saved.error };
  }
  if (slides.length > 0) {
    const inserted = await checkedDatabaseCall(
      "media-upload.create-slides",
      "Gagal menyimpan slide media.",
      sb.from("media_slides").insert(
        slides.map((item, index) => ({
          media_id: saved.data.id,
          position: index + 1,
          type: item.mediaType,
          url: urls[index + 1],
          mime_type: item.mimeType,
          width: item.width,
          height: item.height,
        })),
      ),
      { duplicateMessage: "Tiket unggahan ini sudah digunakan." },
    );
    if (!inserted.ok) {
      // Pin tanpa slide lengkap tidak boleh tersisa: batalkan baris induk dulu
      // agar objeknya menjadi tak terpakai dan aman dibersihkan.
      const { error } = await sb.from("media").delete().eq("id", saved.data.id);
      if (error) {
        console.error("[media-upload:create-slides] rollback pin gagal", {
          id: saved.data.id,
          code: error.code,
          message: error.message,
        });
      }
      await cleanup();
      return { error: inserted.error };
    }
  }
  await syncMediaMentions(saved.data.id, {
    source: params.source,
    title: params.title,
    category: params.category,
    caption: params.caption,
    uploader_name: params.uploaderName,
  });
  return {};
}

/**
 * URL objek slide carousel sebuah pin (tanpa sampul). `null` bila status
 * tidak pasti: pemanggil wajib berhenti agar tidak ada objek tertinggal di
 * bucket publik. Sebelum schema.sql terbaru, pin memang belum punya slide.
 */
export async function getMediaSlideUrls(mediaId: string): Promise<string[] | null> {
  const { data, error } = await createAdminSupabase()
    .from("media_slides")
    .select("url")
    .eq("media_id", mediaId)
    .order("position", { ascending: true });
  if (error) {
    if (isSchemaOutdatedError(error)) return [];
    console.error("[media:slides] gagal membaca slide", {
      code: error.code,
      message: error.message,
    });
    return null;
  }
  return data.map((row) => row.url);
}

/** Hapus objek dari kedua bucket (best-effort). Dipakai saat hapus media. */
export async function removeMediaObject(publicUrl: string): Promise<void> {
  const path = mediaPathFromUrl(publicUrl);
  if (!path) return;
  await Promise.all([
    removeStorageObject(STORAGE_BUCKETS.media, path),
    removeStorageObject(STORAGE_BUCKETS.mediaInbox, path),
  ]);
}

/**
 * Apakah objek masih dirujuk sampul atau slide mana pun; `null` bila tidak
 * pasti. Tabel slide yang belum dimigrasi berarti memang belum ada slide.
 */
async function mediaObjectReferenced(publicUrl: string): Promise<boolean | null> {
  const sb = createAdminSupabase();
  const [covers, slides] = await Promise.all([
    sb.from("media").select("id").eq("url", publicUrl).limit(1),
    sb.from("media_slides").select("id").eq("url", publicUrl).limit(1),
  ]);
  const error =
    covers.error ??
    (slides.error && !isSchemaOutdatedError(slides.error) ? slides.error : null);
  if (error) {
    console.warn("[media-upload:cleanup] status referensi objek tidak diketahui", {
      code: error.code,
      message: error.message,
    });
    return null;
  }
  return (covers.data?.length ?? 0) > 0 || (slides.data?.length ?? 0) > 0;
}

/**
 * Bersihkan objek hanya bila tidak lagi direferensikan. Pemeriksaan ini wajib
 * untuk membuat replay/concurrent finalize tidak menghapus objek yang aktif.
 */
async function removeMediaObjectIfUnused(publicUrl: string): Promise<void> {
  if ((await mediaObjectReferenced(publicUrl)) !== false) return;
  try {
    await removeMediaObject(publicUrl);
  } catch (error) {
    console.warn("[media-upload:cleanup] objek gagal dibersihkan", {
      cause: error instanceof Error ? error.message : String(error),
    });
  }
}

/** Pembersihan aman untuk path hasil direct-upload yang finalisasinya ditolak. */
export async function removeMediaPathIfUnused(path: string): Promise<void> {
  await removeMediaObjectIfUnused(
    getStoragePublicUrl(STORAGE_BUCKETS.media, path),
  );
}

/** Satu slot pada susunan baru: item lama (URL kanonis) atau unggahan baru. */
export type MediaItemPlan =
  | { keep: string }
  | { upload: MediaRecordItem };

type StoredMediaItem = Pick<
  MediaSlideRow,
  "type" | "url" | "mime_type" | "thumbnail_url" | "width" | "height"
>;

const STALE_MEDIA_MESSAGE =
  "Media sudah berubah di sesi lain. Muat ulang sebelum menyimpan lagi.";

/** Sampul + slide berurutan; `null` bila tidak bisa dibaca dengan pasti. */
async function loadMediaItems(mediaId: string) {
  const sb = createAdminSupabase();
  const [cover, slides] = await Promise.all([
    sb
      .from("media")
      .select("status, source, type, url, mime_type, thumbnail_url, width, height")
      .eq("id", mediaId)
      .maybeSingle(),
    sb
      .from("media_slides")
      .select("type, url, mime_type, thumbnail_url, width, height")
      .eq("media_id", mediaId)
      .order("position", { ascending: true }),
  ]);
  if (cover.error || (slides.error && !isSchemaOutdatedError(slides.error))) {
    console.error("[media-upload:load-items] gagal membaca susunan pin", {
      code: cover.error?.code ?? slides.error?.code,
      message: cover.error?.message ?? slides.error?.message,
    });
    return null;
  }
  if (!cover.data) return { found: false as const };
  const { status, source, ...coverItem } = cover.data;
  return {
    found: true as const,
    status,
    source,
    items: [coverItem, ...(slides.data ?? [])] as StoredMediaItem[],
  };
}

/** Kegagalan RPC update_media_post → pesan untuk admin. */
function updatePostErrorMessage(error: { code?: string; message?: string }): string {
  if (isSchemaOutdatedError(error)) return SCHEMA_OUTDATED_MESSAGE;
  if (error.code === "23503") return "Album tidak ditemukan. Muat ulang lalu pilih lagi.";
  return "Gagal menyimpan postingan.";
}

/**
 * "Edit postingan": simpan seluruh isi pin dalam satu transaksi — susunan item
 * (urutkan, jadikan sampul, tambah, hapus, ganti foto hasil editor) bila
 * `items` diisi, serta detail teks/album/sorotan/tanggal. `expected` adalah
 * URL yang dilihat editor (optimistic lock). Invarian moderasi tetap: objek
 * baru ikut visibilitas pin, objek yang tidak lagi dipakai dibersihkan
 * setelah DB menunjuk susunan baru. Status moderasi tidak berubah.
 */
export async function updateMediaPost(params: {
  id: string;
  expected: readonly string[];
  /** `null` = susunan media tidak berubah (hanya detail). */
  items: readonly MediaItemPlan[] | null;
  details: MediaDetails;
}): Promise<ActionResult> {
  const plan = params.items ?? [];
  const uploads = plan.flatMap((item) => ("upload" in item ? [item.upload] : []));
  const newUrls = uploads.map((item) => getStoragePublicUrl(STORAGE_BUCKETS.media, item.path));
  const discardUploads = () => Promise.all(newUrls.map(removeMediaObjectIfUnused));

  const current = await loadMediaItems(params.id);
  if (!current?.found) {
    await discardUploads();
    return { error: current ? "Postingan tidak ditemukan." : "Gagal membaca postingan. Coba lagi." };
  }
  const currentUrls = current.items.map((item) => item.url);
  if (
    currentUrls.length !== params.expected.length ||
    currentUrls.some((url, index) => url !== params.expected[index])
  ) {
    await discardUploads();
    return { error: STALE_MEDIA_MESSAGE };
  }

  const byUrl = new Map(current.items.map((item) => [item.url, item]));
  const kept = plan.flatMap((item) => ("keep" in item ? [item.keep] : []));
  if (
    params.items &&
    (plan.length === 0 ||
      plan.length > UPLOAD_LIMITS.mediaPerPost ||
      new Set(kept).size !== kept.length ||
      kept.some((url) => !byUrl.has(url)))
  ) {
    await discardUploads();
    return { error: "Susunan media tidak valid. Muat ulang lalu coba lagi." };
  }

  // Tiket yang sudah pernah dipakai (replay) tidak boleh mengambil alih objek.
  const referenced = await Promise.all(newUrls.map(mediaObjectReferenced));
  if (referenced.some((value) => value !== false)) {
    return {
      error: referenced.includes(null)
        ? "Gagal memeriksa unggahan baru. Silakan coba lagi."
        : "Tiket unggahan ini sudah digunakan.",
    };
  }
  // Item baru mengikuti visibilitas pin agar invarian moderasi tetap utuh.
  if (
    current.status === "approved" &&
    newUrls.length > 0 &&
    !(await setMediaObjectsPublic(newUrls, true))
  ) {
    await discardUploads();
    return { error: "Gagal memublikasikan media baru. Coba lagi." };
  }

  let uploadIndex = 0;
  const nextItems: StoredMediaItem[] | null = params.items
    ? plan.map((item) => {
        if ("keep" in item) return byUrl.get(item.keep)!;
        const url = newUrls[uploadIndex++];
        return {
          type: item.upload.mediaType,
          url,
          mime_type: item.upload.mimeType,
          thumbnail_url: null,
          width: item.upload.width,
          height: item.upload.height,
        };
      })
    : null;

  const { data: saved, error } = await createAdminSupabase().rpc("update_media_post", {
    p_media_id: params.id,
    p_expected: currentUrls,
    p_items: nextItems,
    p_details: params.details,
  });
  if (error || !saved) {
    await discardUploads();
    if (error) {
      console.error("[media-upload:update-post]", { code: error.code, message: error.message });
      return { error: updatePostErrorMessage(error) };
    }
    return { error: STALE_MEDIA_MESSAGE };
  }

  // DB sudah menunjuk susunan baru; objek yang dibuang kini aman dibersihkan.
  if (params.items) {
    const keptSet = new Set(kept);
    await Promise.all(
      currentUrls.filter((url) => !keptSet.has(url)).map(removeMediaObjectIfUnused),
    );
  }
  await syncMediaMentions(params.id, { ...params.details, source: current.source });
  return {};
}

