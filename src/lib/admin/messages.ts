import "server-only";
import { createAdminSupabase } from "@/lib/supabase/admin";
import type { MessageRow } from "@/lib/types/database";
import { pageBounds, toPaged, type Paged } from "./paging";

export const ADMIN_MESSAGES_PAGE_SIZE = 30;

/** Filter kotak pesan admin; satu daftar untuk tab dan validasi URL. */
export const MESSAGE_FILTERS = ["all", "unread", "pinned"] as const;
export type MessageFilter = (typeof MESSAGE_FILTERS)[number];

/** Pesan anonim untuk profil admin — semua kolom (IP, device) via service role. */
export async function getAdminMessages(
  page = 1,
  filter: MessageFilter = "all",
): Promise<Paged<MessageRow>> {
  const sb = createAdminSupabase();
  const { from, to } = pageBounds(page, ADMIN_MESSAGES_PAGE_SIZE);
  let query = sb
    .from("messages")
    .select("*", { count: "exact" })
    .order("created_at", { ascending: false })
    .range(from, to);
  if (filter === "unread") query = query.eq("is_read", false);
  if (filter === "pinned") query = query.eq("is_pinned", true);
  const { data, count } = await query;
  return toPaged(data ?? [], count, page, ADMIN_MESSAGES_PAGE_SIZE);
}

/** Jumlah per filter untuk label tab kotak pesan. */
export async function getMessageCounts(): Promise<Record<MessageFilter, number>> {
  const sb = createAdminSupabase();
  const head = { count: "exact" as const, head: true };
  const [all, unread, pinned] = await Promise.all([
    sb.from("messages").select("id", head),
    sb.from("messages").select("id", head).eq("is_read", false),
    sb.from("messages").select("id", head).eq("is_pinned", true),
  ]);
  return {
    all: all.count ?? 0,
    unread: unread.count ?? 0,
    pinned: pinned.count ?? 0,
  };
}
