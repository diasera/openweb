import "server-only";
import { createAdminSupabase } from "@/lib/supabase/admin";
import { STORAGE_BUCKETS } from "@/lib/constants";
import { getStoragePublicUrl, removeStorageObject } from "@/lib/storage";
import { checkedMutation } from "@/lib/database/mutation";
import type {
  MediaStatus,
  MediaSource,
  MediaType,
} from "@/lib/types/database";
import type { ActionResult } from "@/lib/action-result";
import { syncMemberMentions } from "@/lib/members/mentions";
import { mediaMentionValues } from "@/lib/members/mention-values";

/**
 * Finalisasi metadata media publik dan admin. Byte file sudah dikirim langsung
 * ke Storage oleh browser; fungsi ini hanya menyimpan satu catatan terverifikasi.
 */
export async function saveMediaRecord(params: {
  path: string;
  mediaType: MediaType;
  mimeType: string;
  title: string | null;
  category: string | null;
  caption: string | null;
  uploaderName: string | null;
  allowComments: boolean;
  width: number | null;
  height: number | null;
  status: MediaStatus;
  source: MediaSource;
  ip: string | null;
  reviewedBy: string | null;
}): Promise<ActionResult> {
  const sb = createAdminSupabase();
  const publicUrl = getStoragePublicUrl(STORAGE_BUCKETS.media, params.path);
  const saved = await checkedMutation(
    "media-upload.create",
    "Gagal menyimpan data media.",
    sb
      .from("media")
      .insert({
        type: params.mediaType,
        mime_type: params.mimeType,
        title: params.title,
        category: params.category,
        url: publicUrl,
        caption: params.caption,
        uploader_name: params.uploaderName,
        allow_comments: params.allowComments,
        status: params.status,
        source: params.source,
        width: params.width,
        height: params.height,
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
    await removeMediaObjectIfUnused(publicUrl);
    return { error: saved.error };
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

/** Hapus objek storage dari public URL-nya (best-effort). Dipakai saat hapus media. */
export async function removeMediaObject(publicUrl: string): Promise<void> {
  const marker = `/${STORAGE_BUCKETS.media}/`;
  const idx = publicUrl.indexOf(marker);
  if (idx === -1) return;
  const rawPath = publicUrl.slice(idx + marker.length).split("?")[0];
  if (!rawPath) return;
  await removeStorageObject(
    STORAGE_BUCKETS.media,
    decodeURIComponent(rawPath),
  );
}

/**
 * Bersihkan objek hanya bila tidak lagi direferensikan. Pemeriksaan ini wajib
 * untuk membuat replay/concurrent finalize tidak menghapus objek yang aktif.
 */
async function removeMediaObjectIfUnused(publicUrl: string): Promise<void> {
  const { data, error } = await createAdminSupabase()
    .from("media")
    .select("id")
    .eq("url", publicUrl)
    .limit(1);

  if (error) {
    console.warn("[media-upload:cleanup] status referensi objek tidak diketahui", {
      code: error.code,
      message: error.message,
    });
    return;
  }
  if (data.length > 0) return;

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
      .select("id, type, url, mime_type, thumbnail_url, width, height")
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

  const { data: activeReplacement, error: activeReplacementError } = await sb
    .from("media")
    .select("id")
    .eq("url", nextUrl)
    .limit(1);
  if (activeReplacementError) {
    console.error("[media-upload:replace-photo] pemeriksaan replay gagal", {
      code: activeReplacementError.code,
      message: activeReplacementError.message,
    });
    await removeMediaObjectIfUnused(nextUrl);
    return { error: "Gagal memeriksa hasil edit. Silakan coba lagi." };
  }
  if (activeReplacement.length > 0) {
    return { error: "Tiket hasil edit ini sudah digunakan." };
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
