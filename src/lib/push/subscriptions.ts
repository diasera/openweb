import "server-only";
import { createAdminSupabase } from "@/lib/supabase/admin";
import {
  checkedDatabaseCall,
  checkedMutation,
} from "@/lib/database/mutation";
import type { ActionResult } from "@/lib/action-result";
import type { PushSubscriptionRow } from "@/lib/types/database";

export interface PushSubscriptionInput {
  visitorId: string;
  endpoint: string;
  p256dh: string;
  auth: string;
  userAgent: string | null;
}

/** Simpan/perbarui langganan per perangkat. Konflik endpoint berarti
 *  browser yang sama kembali — ikat ulang ke visitor terbaru. */
export async function savePushSubscription(
  input: PushSubscriptionInput,
): Promise<ActionResult> {
  const sb = createAdminSupabase();
  const saved = await checkedMutation(
    "push-subscriptions.upsert",
    "Gagal menyimpan langganan push.",
    sb
      .from("push_subscriptions")
      .upsert(
        {
          visitor_id: input.visitorId,
          endpoint: input.endpoint,
          p256dh: input.p256dh,
          auth: input.auth,
          user_agent: input.userAgent,
        },
        { onConflict: "endpoint" },
      )
      .select("id")
      .maybeSingle(),
  );
  return saved.ok ? {} : { error: saved.error };
}

/** Hapus semua langganan milik satu pengunjung (lonceng dimatikan). */
export async function removePushSubscriptionsByVisitor(
  visitorId: string,
): Promise<void> {
  const sb = createAdminSupabase();
  await checkedDatabaseCall(
    "push-subscriptions.clear-visitor",
    "Gagal membersihkan langganan push.",
    sb.from("push_subscriptions").delete().eq("visitor_id", visitorId),
  );
}

/** Hapus satu langganan yang sudah mati (endpoint 404/410 saat kirim). */
export async function removePushSubscriptionByEndpoint(
  endpoint: string,
): Promise<void> {
  const sb = createAdminSupabase();
  await checkedDatabaseCall(
    "push-subscriptions.prune",
    "Gagal menghapus langganan push mati.",
    sb.from("push_subscriptions").delete().eq("endpoint", endpoint),
  );
}

/** Seluruh langganan aktif untuk pengiriman massal notifikasi admin. */
export async function getPushSubscriptions(): Promise<PushSubscriptionRow[]> {
  const sb = createAdminSupabase();
  const { data } = await sb
    .from("push_subscriptions")
    .select("id, visitor_id, endpoint, p256dh, auth, user_agent, created_at")
    .order("created_at", { ascending: true })
    .limit(1000);
  return data ?? [];
}

/** Jumlah perangkat terhubung — untuk statistik halaman Pengunjung. */
export async function countPushSubscriptions(): Promise<number> {
  const sb = createAdminSupabase();
  const { count } = await sb
    .from("push_subscriptions")
    .select("id", { count: "exact", head: true });
  return count ?? 0;
}
