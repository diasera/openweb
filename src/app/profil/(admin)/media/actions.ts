"use server";

import { requireFeature } from "@/lib/auth";
import { createAdminSupabase } from "@/lib/supabase/admin";
import {
  getMediaSlideUrls,
  removeMediaObject,
  setMediaObjectsPublic,
} from "@/lib/media/upload";
import { revalidateMediaPages } from "@/lib/media/revalidate";
import { setIpBlocked } from "@/lib/admin/ip-bans";
import { INVALID_INPUT, isValidId } from "@/lib/admin/guard";
import { checkedMutation } from "@/lib/database/mutation";
import type { ActionResult } from "@/lib/action-result";

type MediaReviewStatus = "approved" | "rejected";

/** Sampul + seluruh slide carousel; `null` bila slide tidak dapat dipastikan. */
async function mediaObjectUrls(coverUrl: string, mediaId: string) {
  const slides = await getMediaSlideUrls(mediaId);
  return slides ? [coverUrl, ...slides] : null;
}

/**
 * Satu-satunya transisi status moderasi. Urutannya menjaga invarian "baris
 * tampil ⇒ objek publik" untuk sampul DAN semua slide: setujui = publikasikan
 * objek dulu; tolak = sembunyikan baris dulu, baru objek kembali ke inbox.
 */
async function reviewMedia(
  id: string,
  status: MediaReviewStatus,
  reviewedBy: string,
): Promise<ActionResult> {
  const sb = createAdminSupabase();
  const approving = status === "approved";
  const current = await checkedMutation(
    "media.load-review",
    "Gagal membaca media.",
    sb.from("media").select("id, url").eq("id", id).maybeSingle(),
  );
  if (!current.ok) return { error: current.error };
  const urls = await mediaObjectUrls(current.data.url, id);
  if (!urls) return { error: "Gagal membaca slide media. Coba lagi." };

  if (approving && !(await setMediaObjectsPublic(urls, true))) {
    return { error: "File media tidak dapat dipublikasikan. Coba lagi." };
  }

  const saved = await checkedMutation(
    approving ? "media.approve" : "media.reject",
    approving ? "Gagal menyetujui media." : "Gagal menolak media.",
    sb
      .from("media")
      .update({
        status,
        ...(approving ? {} : { is_pinned: false }),
        reviewed_by: reviewedBy,
        reviewed_at: new Date().toISOString(),
      })
      .eq("id", id)
      .select("id")
      .maybeSingle(),
  );
  if (!saved.ok) {
    if (approving) await setMediaObjectsPublic(urls, false);
    return { error: saved.error };
  }
  if (!approving && !(await setMediaObjectsPublic(urls, false))) {
    console.warn("[media:reject] objek masih di bucket publik", { id });
  }
  revalidateMediaPages(id);
  return {};
}

export async function approveMedia(id: string): Promise<ActionResult> {
  const admin = await requireFeature("media");
  if (!isValidId(id)) return INVALID_INPUT;
  return reviewMedia(id, "approved", admin.id);
}

export async function rejectMedia(id: string): Promise<ActionResult> {
  const admin = await requireFeature("media");
  if (!isValidId(id)) return INVALID_INPUT;
  return reviewMedia(id, "rejected", admin.id);
}

export async function togglePinMedia(id: string, pinned: boolean): Promise<ActionResult> {
  await requireFeature("media");
  if (!isValidId(id) || typeof pinned !== "boolean") return INVALID_INPUT;
  const saved = await checkedMutation(
    "media.pin",
    "Gagal mengubah sorotan media.",
    createAdminSupabase()
      .from("media")
      .update({ is_pinned: pinned })
      .eq("id", id)
      .eq("status", "approved")
      .select("id")
      .maybeSingle(),
    { notFoundMessage: "Media harus disetujui sebelum dijadikan sorotan." },
  );
  if (!saved.ok) return { error: saved.error };
  revalidateMediaPages(id);
  return {};
}

export async function deleteMedia(id: string): Promise<ActionResult> {
  await requireFeature("media");
  if (!isValidId(id)) return INVALID_INPUT;
  const sb = createAdminSupabase();
  // Slide ikut terhapus (cascade), jadi URL-nya dibaca sebelum baris hilang;
  // tanpa itu objek slide tertinggal permanen di bucket publik.
  const slideUrls = await getMediaSlideUrls(id);
  if (!slideUrls) return { error: "Gagal membaca slide media. Coba lagi." };
  const deleted = await checkedMutation(
    "media.delete",
    "Gagal menghapus media.",
    sb.from("media").delete().eq("id", id).select("id, url").maybeSingle(),
  );
  if (!deleted.ok) return { error: deleted.error };

  // Baris dihapus lebih dulu agar kegagalan DB tidak meninggalkan URL rusak.
  // Pembersihan storage bersifat best-effort dan aman dijalankan setelahnya.
  await Promise.all(
    [deleted.data.url, ...slideUrls].filter(Boolean).map(removeMediaObject),
  );
  revalidateMediaPages(id);
  return {};
}

/** Blokir IP pengunggah + tolak media terkait. */
export async function banMediaIp(id: string): Promise<ActionResult> {
  const admin = await requireFeature("media");
  if (!isValidId(id)) return INVALID_INPUT;
  const sb = createAdminSupabase();
  const media = await checkedMutation(
    "media.load-ip",
    "Gagal membaca IP pengunggah.",
    sb.from("media").select("id, ip_address").eq("id", id).maybeSingle(),
  );
  if (!media.ok) return { error: media.error };
  if (!media.data.ip_address) return { error: "IP pengunggah tidak tersedia." };

  const blocked = await setIpBlocked(sb, {
    ip: media.data.ip_address,
    blocked: true,
    reason: "Diblokir dari moderasi media",
    createdBy: admin.id,
  });
  if (blocked.error) return blocked;

  const rejected = await reviewMedia(id, "rejected", admin.id);
  return rejected.error
    ? { error: `IP diblokir, tetapi media gagal ditolak: ${rejected.error}` }
    : {};
}
