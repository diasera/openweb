import "server-only";
import { createAdminSupabase } from "@/lib/supabase/admin";
import { STORAGE_BUCKETS } from "@/lib/constants";
import {
  getStoragePublicUrl,
  getSignedReadUrls,
  moveStorageObject,
  removeStorageObject,
} from "@/lib/storage";
import { checkedDatabaseCall, checkedMutation } from "@/lib/database/mutation";
import { isSchemaOutdatedError } from "@/lib/database/errors";
import type {
  MediaRow,
  MediaStatus,
  MediaSource,
  MediaType,
} from "@/lib/types/database";
import type { ActionResult } from "@/lib/action-result";
import { syncMemberMentions } from "@/lib/members/mentions";
import { mediaMentionValues } from "@/lib/members/mention-values";

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
  if (params.source === "admin") {
    await syncMemberMentions(
      { mediaId: saved.data.id },
      mediaMentionValues({
        title: params.title,
        category: params.category,
        caption: params.caption,
        uploader_name: params.uploaderName,
      }),
    );
  }
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

/**
 * Ganti objek foto dengan optimistic guard pada URL lama. Kolom status dan
 * metadata moderasi sengaja tidak ikut di-update agar proses edit tetap netral.
 */
export async function replaceMediaPhoto(params: {
  id: string;
  path: string;
  mimeType: string;
  width: number;
  height: number;
}): Promise<ActionResult> {
  const sb = createAdminSupabase();
  const nextUrl = getStoragePublicUrl(STORAGE_BUCKETS.media, params.path);
  const current = await checkedMutation(
    "media-upload.load-photo-replacement",
    "Gagal membaca media yang akan diedit.",
    sb
      .from("media")
      .select("id, type, status, url, mime_type, thumbnail_url, width, height")
      .eq("id", params.id)
      .maybeSingle(),
    { notFoundMessage: "Media tidak ditemukan." },
  );

  if (!current.ok || current.data.type !== "photo") {
    await removeMediaObjectIfUnused(nextUrl);
    return current.ok
      ? { error: "Hanya foto yang dapat diedit." }
      : { error: current.error };
  }

  if (current.data.url === nextUrl) {
    return { error: "Tiket hasil edit ini sudah digunakan." };
  }

  const replacementReferenced = await mediaObjectReferenced(nextUrl);
  if (replacementReferenced === null) {
    return { error: "Gagal memeriksa hasil edit. Silakan coba lagi." };
  }
  if (replacementReferenced) {
    return { error: "Tiket hasil edit ini sudah digunakan." };
  }

  // Hasil edit mengikuti visibilitas media aslinya agar invarian tetap utuh.
  if (
    current.data.status === "approved" &&
    !(await setMediaObjectPublic(nextUrl, true))
  ) {
    await removeMediaObjectIfUnused(nextUrl);
    return { error: "Gagal memublikasikan hasil edit. Coba lagi." };
  }

  const replaced = await checkedMutation(
    "media-upload.replace-photo",
    "Gagal menyimpan hasil edit media.",
    sb
      .from("media")
      .update({
        url: nextUrl,
        mime_type: params.mimeType,
        thumbnail_url: null,
        width: params.width,
        height: params.height,
      })
      .eq("id", params.id)
      .eq("type", "photo")
      .eq("url", current.data.url)
      .select("id")
      .maybeSingle(),
    {
      notFoundMessage:
        "Media sudah berubah di sesi lain. Muat ulang sebelum menyimpan lagi.",
    },
  );

  if (!replaced.ok) {
    await removeMediaObjectIfUnused(nextUrl);
    return { error: replaced.error };
  }

  const rollbackReplacement = async () => {
    const rolledBack = await checkedMutation(
      "media-upload.rollback-photo-replacement",
      "Gagal membatalkan penggantian media yang bentrok.",
      sb
        .from("media")
        .update({
          url: current.data.url,
          mime_type: current.data.mime_type,
          thumbnail_url: current.data.thumbnail_url,
          width: current.data.width,
          height: current.data.height,
        })
        .eq("id", params.id)
        .eq("url", nextUrl)
        .select("id")
        .maybeSingle(),
    );
    if (rolledBack.ok) await removeMediaObjectIfUnused(nextUrl);
    return rolledBack.ok;
  };

  // Menutup race ketika satu tiket dicoba bersamaan pada dua media berbeda.
  const { data: replacementReferences, error: referencesError } = await sb
    .from("media")
    .select("id")
    .eq("url", nextUrl)
    .limit(2);
  if (
    referencesError ||
    replacementReferences.length !== 1 ||
    replacementReferences[0]?.id !== params.id
  ) {
    const rolledBack = await rollbackReplacement();
    if (!rolledBack) {
      console.error("[media-upload:replace-photo] rollback konflik gagal", {
        id: params.id,
        code: referencesError?.code,
        message: referencesError?.message,
      });
    }
    return {
      error: referencesError
        ? "Gagal memastikan hasil edit tersimpan dengan aman."
        : "Tiket hasil edit dipakai oleh permintaan lain.",
    };
  }

  // DB sudah menunjuk objek baru; pembersihan objek lama sekarang aman dilakukan.
  await removeMediaObjectIfUnused(current.data.url);
  return {};
}
