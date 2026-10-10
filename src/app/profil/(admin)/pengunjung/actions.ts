"use server";

import { revalidatePath } from "next/cache";
import { after } from "next/server";
import { z } from "zod";
import { requireFeature } from "@/lib/auth";
import { createAdminSupabase } from "@/lib/supabase/admin";
import { setIpBlocked } from "@/lib/admin/ip-bans";
import { INVALID_INPUT, isValidId } from "@/lib/admin/guard";
import { adminFeatureHref } from "@/lib/constants";
import { checkedMutation } from "@/lib/database/mutation";
import {
  validationErrorMessage,
  type ActionResult,
} from "@/lib/action-result";
import { normalizeNotificationHref } from "@/lib/utils/url";
import { dispatchPushNotification } from "@/lib/push/send";
import { removePushSubscriptionsByVisitor } from "@/lib/push/subscriptions";

const notificationSchema = z.object({
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

function revalidateVisitors() {
  revalidatePath(adminFeatureHref("pengunjung"));
}

export async function sendNotification(formData: FormData): Promise<ActionResult> {
  const admin = await requireFeature("pengunjung");
  const parsed = notificationSchema.safeParse({
    title: formData.get("title") ?? "",
    body: formData.get("body") ?? "",
    url: formData.get("url") ?? "",
  });
  if (!parsed.success) return { error: validationErrorMessage(parsed) };
  const url = normalizeNotificationHref(parsed.data.url);
  const sent = await checkedMutation(
    "notifications.create",
    "Gagal mengirim notifikasi.",
    createAdminSupabase()
      .from("notifications")
      .insert({
        title: parsed.data.title,
        body: parsed.data.body || null,
        url,
        created_by: admin.id,
      })
      .select("id")
      .maybeSingle(),
  );
  if (!sent.ok) return { error: sent.error };

  // Notifikasi sudah tersimpan; push ke semua perangkat berjalan setelah respons
  // agar admin tidak menunggu pengiriman massal (best-effort, hanya dicatat).
  const payload = {
    id: sent.data.id,
    title: parsed.data.title,
    body: parsed.data.body || null,
    url,
  };
  after(async () => {
    try {
      await dispatchPushNotification(payload);
    } catch (error) {
      console.error("[push:dispatch] gagal mengirim push", {
        message: error instanceof Error ? error.message : String(error),
      });
    }
  });

  revalidateVisitors();
  revalidatePath("/notifikasi");
  return {};
}

export async function deleteVisitor(id: string): Promise<ActionResult> {
  await requireFeature("pengunjung");
  if (!isValidId(id)) return INVALID_INPUT;
  const deleted = await checkedMutation(
    "visitors.delete",
    "Gagal menghapus data pengunjung.",
    createAdminSupabase().from("visitors").delete().eq("id", id).select("id, visitor_id").maybeSingle(),
  );
  if (!deleted.ok) return { error: deleted.error };
  // push_subscriptions tidak ber-FK ke visitors: tanpa ini perangkatnya tetap
  // menerima push dan ikut terhitung sebagai "Perangkat push".
  await removePushSubscriptionsByVisitor(deleted.data.visitor_id);
  revalidateVisitors();
  return {};
}

/** Blokir hanya interaksi publik; akses dan pencatatan kunjungan tetap berjalan. */
export async function setVisitorIpBlocked(blocked: boolean, id: string): Promise<ActionResult> {
  const admin = await requireFeature("pengunjung");
  if (!isValidId(id) || typeof blocked !== "boolean") return INVALID_INPUT;
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
  revalidateVisitors();
  return {};
}

export async function deleteNotification(id: string): Promise<ActionResult> {
  await requireFeature("pengunjung");
  if (!isValidId(id)) return INVALID_INPUT;
  const deleted = await checkedMutation(
    "notifications.delete",
    "Gagal menghapus notifikasi.",
    createAdminSupabase().from("notifications").delete().eq("id", id).select("id").maybeSingle(),
  );
  if (!deleted.ok) return { error: deleted.error };
  revalidateVisitors();
  revalidatePath("/notifikasi");
  return {};
}
