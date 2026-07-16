"use server";

import { revalidatePath } from "next/cache";
import { requireFeature } from "@/lib/auth";
import { createAdminSupabase } from "@/lib/supabase/admin";
import { removeMediaObject } from "@/lib/media/upload";
import { setIpBlocked } from "@/lib/admin/ip-bans";
import { checkedMutation } from "@/lib/database/mutation";
import type { ActionResult } from "@/lib/action-result";

/** Segarkan halaman yang menampilkan media agar perubahan langsung terlihat. */
function revalidateMedia() {
  revalidatePath("/profil/media");
  revalidatePath("/profil");
  revalidatePath("/");
  revalidatePath("/galeri");
}

type MediaReviewStatus = "approved" | "rejected";

async function reviewMedia(
  id: string,
  status: MediaReviewStatus,
  reviewedBy: string,
): Promise<ActionResult> {
  const sb = createAdminSupabase();
  const approving = status === "approved";
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
  if (!saved.ok) return { error: saved.error };
  revalidateMedia();
  return {};
}

export async function approveMedia(id: string): Promise<ActionResult> {
  const admin = await requireFeature("media");
  return reviewMedia(id, "approved", admin.id);
}

export async function rejectMedia(id: string): Promise<ActionResult> {
  const admin = await requireFeature("media");
  return reviewMedia(id, "rejected", admin.id);
}

export async function togglePinMedia(
  id: string,
  pinned: boolean,
): Promise<ActionResult> {
  await requireFeature("media");
  const sb = createAdminSupabase();
  const saved = await checkedMutation(
    "media.pin",
    "Gagal mengubah sematan media.",
    sb
      .from("media")
      .update({ is_pinned: pinned })
      .eq("id", id)
      .eq("status", "approved")
      .select("id")
      .maybeSingle(),
    { notFoundMessage: "Media harus berstatus disetujui sebelum disematkan." },
  );
  if (!saved.ok) return { error: saved.error };
  revalidateMedia();
  return {};
}

export async function deleteMedia(id: string): Promise<ActionResult> {
  await requireFeature("media");
  const sb = createAdminSupabase();
  const deleted = await checkedMutation(
    "media.delete",
    "Gagal menghapus media.",
    sb
      .from("media")
      .delete()
      .eq("id", id)
      .select("id, url")
      .maybeSingle(),
  );
  if (!deleted.ok) return { error: deleted.error };

  // Hapus baris lebih dulu agar kegagalan DB tidak meninggalkan URL rusak.
  // Pembersihan storage bersifat best-effort dan aman dijalankan setelahnya.
  if (deleted.data.url) await removeMediaObject(deleted.data.url);
  revalidateMedia();
  return {};
}

/** Blokir IP pengunggah + tolak media terkait. */
export async function banMediaIp(id: string): Promise<ActionResult> {
  const admin = await requireFeature("media");
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

  const rejected = await checkedMutation(
    "media.reject-blocked",
    "IP diblokir, tetapi media gagal ditolak.",
    sb
      .from("media")
      .update({ status: "rejected", is_pinned: false })
      .eq("id", id)
      .select("id")
      .maybeSingle(),
  );
  if (!rejected.ok) return { error: rejected.error };
  revalidateMedia();
  return {};
}
