"use server";

import { revalidatePath } from "next/cache";
import { requireFeature } from "@/lib/auth";
import { createAdminSupabase } from "@/lib/supabase/admin";
import { setIpBlocked } from "@/lib/admin/ip-bans";
import { INVALID_INPUT, isValidId } from "@/lib/admin/guard";
import { adminFeatureHref } from "@/lib/constants";
import {
  checkedDatabaseCall,
  checkedMutation,
} from "@/lib/database/mutation";
import type { ActionResult } from "@/lib/action-result";

/** Pesan tampil di kotak admin, dasbor, beranda (yang dipin), dan /pesan. */
function revalidateMessages() {
  revalidatePath(adminFeatureHref("pesan"));
  revalidatePath("/profil");
  revalidatePath("/");
  revalidatePath("/pesan");
}

export async function togglePinMessage(id: string, pinned: boolean): Promise<ActionResult> {
  await requireFeature("pesan");
  if (!isValidId(id) || typeof pinned !== "boolean") return INVALID_INPUT;
  const saved = await checkedMutation(
    "messages.pin",
    "Gagal mengubah sematan pesan.",
    createAdminSupabase()
      .from("messages")
      // Pesan yang disematkan ke beranda sudah pasti dibaca admin.
      .update(pinned ? { is_pinned: true, is_read: true } : { is_pinned: false })
      .eq("id", id)
      .select("id")
      .maybeSingle(),
  );
  if (!saved.ok) return { error: saved.error };
  revalidateMessages();
  return {};
}

export async function setMessageRead(id: string, read: boolean): Promise<ActionResult> {
  await requireFeature("pesan");
  if (!isValidId(id) || typeof read !== "boolean") return INVALID_INPUT;
  const saved = await checkedMutation(
    "messages.read",
    "Gagal mengubah status baca pesan.",
    createAdminSupabase()
      .from("messages")
      .update({ is_read: read })
      .eq("id", id)
      .select("id")
      .maybeSingle(),
  );
  if (!saved.ok) return { error: saved.error };
  revalidateMessages();
  return {};
}

export async function deleteMessage(id: string): Promise<ActionResult> {
  await requireFeature("pesan");
  if (!isValidId(id)) return INVALID_INPUT;
  const deleted = await checkedMutation(
    "messages.delete",
    "Gagal menghapus pesan.",
    createAdminSupabase().from("messages").delete().eq("id", id).select("id").maybeSingle(),
  );
  if (!deleted.ok) return { error: deleted.error };
  revalidateMessages();
  return {};
}

/** Blokir IP pengirim + hapus semua pesan dari IP tersebut. */
export async function banMessageIp(id: string): Promise<ActionResult> {
  const admin = await requireFeature("pesan");
  if (!isValidId(id)) return INVALID_INPUT;
  const sb = createAdminSupabase();
  const message = await checkedMutation(
    "messages.load-ip",
    "Gagal membaca IP pengirim.",
    sb.from("messages").select("id, ip_address").eq("id", id).maybeSingle(),
  );
  if (!message.ok) return { error: message.error };
  if (!message.data.ip_address) return { error: "IP pengirim tidak tersedia." };

  const blocked = await setIpBlocked(sb, {
    ip: message.data.ip_address,
    blocked: true,
    reason: "Diblokir dari pesan anonim",
    createdBy: admin.id,
  });
  if (blocked.error) return blocked;

  const deleted = await checkedDatabaseCall(
    "messages.delete-blocked-ip",
    "IP diblokir, tetapi pesan terkait gagal dihapus.",
    sb.from("messages").delete().eq("ip_address", message.data.ip_address),
  );
  if (!deleted.ok) return { error: deleted.error };
  revalidateMessages();
  return {};
}

export async function markAllMessagesRead(): Promise<ActionResult> {
  await requireFeature("pesan");
  const saved = await checkedDatabaseCall(
    "messages.read-all",
    "Gagal menandai pesan sebagai sudah dibaca.",
    createAdminSupabase().from("messages").update({ is_read: true }).eq("is_read", false),
  );
  if (!saved.ok) return { error: saved.error };
  revalidateMessages();
  return {};
}
