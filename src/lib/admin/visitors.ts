import "server-only";
import { createAdminSupabase } from "@/lib/supabase/admin";
import type { VisitorRow, NotificationRow } from "@/lib/types/database";
import { getBlockedIpSet } from "@/lib/admin/ip-bans";

export type AdminVisitorRow = VisitorRow & { is_banned: boolean };

/** Data pengunjung untuk halaman pengelolaan admin. */
export async function getVisitors(limit = 200): Promise<AdminVisitorRow[]> {
  const sb = createAdminSupabase();
  const { data } = await sb
    .from("visitors")
    .select("*")
    .order("last_seen_at", { ascending: false })
    .limit(limit);
  const visitors = data ?? [];
  const blockedIps = await getBlockedIpSet(
    sb,
    visitors.map((visitor) => visitor.ip_address),
  );
  return visitors.map((visitor) => ({
    ...visitor,
    is_banned: Boolean(
      visitor.ip_address && blockedIps.has(visitor.ip_address),
    ),
  }));
}

export async function getSentNotifications(limit = 30): Promise<NotificationRow[]> {
  const sb = createAdminSupabase();
  const { data } = await sb
    .from("notifications")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);
  return data ?? [];
}

export async function getBellCount(): Promise<number> {
  const sb = createAdminSupabase();
  const { count } = await sb
    .from("visitors")
    .select("id", { count: "exact", head: true })
    .eq("notifications_enabled", true);
  return count ?? 0;
}
