"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireFeature } from "@/lib/auth";
import { createAdminSupabase } from "@/lib/supabase/admin";
import { setIpBlocked } from "@/lib/admin/ip-bans";
import { checkedMutation } from "@/lib/database/mutation";
import {
  validationErrorMessage,
  type ActionResult,
} from "@/lib/action-result";
import { normalizeNotificationHref } from "@/lib/utils/url";
import { dispatchPushNotification } from "@/lib/push/send";

const notifSchema = z.object({
  title: z.string().trim().min(1, "Judul wajib diisi").max(120),
  body: z.string().trim().max(400),
  url: z
    .string()
    .trim()
    .max(300)
    .refine(
      (value) => !value || normalizeNotificationHref(value) !== null,
      "Tautan harus berupa path internal (/blog/...) atau URL HTTPS.",
    ),
});

export async function sendNotification(
  fd: FormData,
): Promise<ActionResult> {
  const admin = await requireFeature("pengunjung");
  const parsed = notifSchema.safeParse({
    title: fd.get("title") ?? "",
    body: fd.get("body") ?? "",
    url: fd.get("url") ?? "",
  });
  if (!parsed.success) {
    return { error: validationErrorMessage(parsed) };
  }
  const sb = createAdminSupabase();
  const sent = await checkedMutation(
    "notifications.create",
    "Gagal mengirim notifikasi.",
    sb
      .from("notifications")
      .insert({
        title: parsed.data.title,
        body: parsed.data.body || null,
        url: normalizeNotificationHref(parsed.data.url),
        created_by: admin.id,
      })
      .select("id")
      .maybeSingle(),
  );
  if (!sent.ok) return { error: sent.error };

  // Notifikasi tersimpan — kirim push ke semua perangkat (best-effort;
  // kegagalan kirim tidak membatalkan notifikasi yang sudah terekam).
  try {
    await dispatchPushNotification({
      title: parsed.data.title,
      body: parsed.data.body || null,
      url: normalizeNotificationHref(parsed.data.url),
    });
  } catch (error) {
    console.error("[push:dispatch] gagal mengirim push", {
      message: error instanceof Error ? error.message : String(error),
    });
  }

  revalidatePath("/profil/pengunjung");
  revalidatePath("/notifikasi");
  return {};
}

export async function deleteVisitor(id: string): Promise<ActionResult> {
  await requireFeature("pengunjung");
  const sb = createAdminSupabase();
  const deleted = await checkedMutation(
    "visitors.delete",
    "Gagal menghapus data pengunjung.",
    sb.from("visitors").delete().eq("id", id).select("id").maybeSingle(),
  );
  if (!deleted.ok) return { error: deleted.error };
  revalidatePath("/profil/pengunjung");
  return {};
}

/** Blokir hanya interaksi publik; akses dan pencatatan kunjungan tetap berjalan. */
export async function setVisitorIpBlocked(
  blocked: boolean,
  id: string,
): Promise<ActionResult> {
  const admin = await requireFeature("pengunjung");
  const sb = createAdminSupabase();
  const visitor = await checkedMutation(
    "visitors.load-ip",
    "Gagal membaca IP pengunjung.",
    sb.from("visitors").select("id, ip_address").eq("id", id).maybeSingle(),
  );
  if (!visitor.ok) return { error: visitor.error };

  if (!visitor.data.ip_address) return { error: "IP pengunjung tidak tersedia." };

  const saved = await setIpBlocked(sb, {
    ip: visitor.data.ip_address,
    blocked,
    reason: "Diblokir dari interaksi publik melalui menu Pengunjung",
    createdBy: admin.id,
  });
  if (saved.error) return saved;
  revalidatePath("/profil/pengunjung");
  return {};
}

export async function deleteNotification(id: string): Promise<ActionResult> {
  await requireFeature("pengunjung");
  const sb = createAdminSupabase();
  const deleted = await checkedMutation(
    "notifications.delete",
    "Gagal menghapus notifikasi.",
    sb
      .from("notifications")
      .delete()
      .eq("id", id)
      .select("id")
      .maybeSingle(),
  );
  if (!deleted.ok) return { error: deleted.error };
  revalidatePath("/profil/pengunjung");
  revalidatePath("/notifikasi");
  return {};
}
