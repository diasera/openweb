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

/** Hapus langganan yang sudah mati (endpoint 404/410 saat kirim) dalam satu query. */
export async function removePushSubscriptionsByEndpoints(
  endpoints: readonly string[],
): Promise<void> {
  if (endpoints.length === 0) return;
  const sb = createAdminSupabase();
  await checkedDatabaseCall(
    "push-subscriptions.prune",
    "Gagal menghapus langganan push mati.",
    sb.from("push_subscriptions").delete().in("endpoint", [...endpoints]),
  );
}

// PostgREST Supabase membatasi 1000 baris per respons; keyset menjamin semua terbaca.
const SUBSCRIPTION_PAGE = 1000;

/** Seluruh langganan aktif untuk pengiriman massal notifikasi admin. */
export async function getPushSubscriptions(): Promise<PushSubscriptionRow[]> {
  const sb = createAdminSupabase();
  const rows: PushSubscriptionRow[] = [];
  let lastId: string | null = null;
  for (;;) {
    let query = sb
      .from("push_subscriptions")
      .select("id, visitor_id, endpoint, p256dh, auth, user_agent, created_at")
      .order("id", { ascending: true })
      .limit(SUBSCRIPTION_PAGE);
    if (lastId) query = query.gt("id", lastId);
    const { data, error } = await query;
    if (error) {
      console.error("[push:subscriptions] gagal membaca langganan", {
        code: error.code,
        message: error.message,
      });
      break;
    }
    rows.push(...data);
    if (data.length < SUBSCRIPTION_PAGE) break;
    lastId = data[data.length - 1]!.id;
  }
  return rows;
}

/** Jumlah perangkat terhubung — untuk statistik halaman Pengunjung. */
export async function countPushSubscriptions(): Promise<number> {
  const sb = createAdminSupabase();
  const { count } = await sb
    .from("push_subscriptions")
    .select("id", { count: "exact", head: true });
  return count ?? 0;
}
