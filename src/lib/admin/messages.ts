import "server-only";
import { createAdminSupabase } from "@/lib/supabase/admin";
import type { MessageRow } from "@/lib/types/database";
import { pageBounds, toPaged, type Paged } from "./paging";

export const ADMIN_MESSAGES_PAGE_SIZE = 30;

/** Pesan anonim untuk profil admin — semua kolom (IP, device) via service role. */
export async function getAdminMessages(page = 1): Promise<Paged<MessageRow>> {
  const sb = createAdminSupabase();
  const { from, to } = pageBounds(page, ADMIN_MESSAGES_PAGE_SIZE);
  const { data, count } = await sb
    .from("messages")
    .select("*", { count: "exact" })
    .order("created_at", { ascending: false })
    .range(from, to);
  return toPaged(data ?? [], count, page, ADMIN_MESSAGES_PAGE_SIZE);
}

export async function countUnreadMessages(): Promise<number> {
  const { count } = await createAdminSupabase()
    .from("messages")
    .select("id", { count: "exact", head: true })
    .eq("is_read", false);
  return count ?? 0;
}
