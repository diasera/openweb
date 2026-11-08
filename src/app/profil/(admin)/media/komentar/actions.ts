"use server";

import { revalidatePath } from "next/cache";
import { requireFeature } from "@/lib/auth";
import { createAdminSupabase } from "@/lib/supabase/admin";
import { setIpBlocked } from "@/lib/admin/ip-bans";
import { INVALID_INPUT, isValidId } from "@/lib/admin/guard";
import {
  checkedDatabaseCall,
  checkedMutation,
} from "@/lib/database/mutation";
import { MEDIA_ADMIN_SECTIONS } from "@/lib/constants";
import type { ActionResult } from "@/lib/action-result";

function revalidateComments(mediaIds: readonly string[]) {
  revalidatePath(MEDIA_ADMIN_SECTIONS.komentar.href);
  for (const id of new Set(mediaIds)) revalidatePath(`/pin/${id}`);
}

export async function deleteComment(id: string): Promise<ActionResult> {
  await requireFeature("media");
  if (!isValidId(id)) return INVALID_INPUT;
  const deleted = await checkedMutation(
    "comments.delete",
    "Gagal menghapus komentar.",
    createAdminSupabase()
      .from("comments")
      .delete()
      .eq("id", id)
      .select("id, media_id")
      .maybeSingle(),
  );
  if (!deleted.ok) return { error: deleted.error };
  revalidateComments([deleted.data.media_id]);
  return {};
}

/** Blokir IP penulis + hapus semua komentar dari IP tersebut (pola moderasi pesan). */
export async function banCommentIp(id: string): Promise<ActionResult> {
  const admin = await requireFeature("media");
  if (!isValidId(id)) return INVALID_INPUT;
  const sb = createAdminSupabase();
  const comment = await checkedMutation(
    "comments.load-ip",
    "Gagal membaca IP penulis.",
    sb.from("comments").select("id, ip_address").eq("id", id).maybeSingle(),
  );
  if (!comment.ok) return { error: comment.error };
  if (!comment.data.ip_address) return { error: "IP penulis tidak tersedia." };

  const blocked = await setIpBlocked(sb, {
    ip: comment.data.ip_address,
    blocked: true,
    reason: "Diblokir dari moderasi komentar",
    createdBy: admin.id,
  });
  if (blocked.error) return blocked;

  const removed = await checkedDatabaseCall(
    "comments.delete-blocked-ip",
    "IP diblokir, tetapi komentar terkait gagal dihapus.",
    sb.from("comments").delete().eq("ip_address", comment.data.ip_address).select("media_id"),
  );
  if (!removed.ok) return { error: removed.error };
  revalidateComments((removed.data ?? []).map((row) => row.media_id));
  return {};
}
