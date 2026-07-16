import "server-only";
import { createAdminSupabase } from "@/lib/supabase/admin";
import type { MessageRow } from "@/lib/types/database";

/** Pesan anonim untuk profil admin — semua kolom (IP, device) via service role. */
export async function getAdminMessages(limit = 200): Promise<MessageRow[]> {
  const sb = createAdminSupabase();
  const { data } = await sb
    .from("messages")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);
  return data ?? [];
}
