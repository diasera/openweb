import "server-only";
import { createAdminSupabase } from "@/lib/supabase/admin";

/** Ringkasan angka untuk halaman Ringkasan profil admin. */
export interface AdminStats {
  mediaPending: number;
  mediaApproved: number;
  mediaTotal: number;
  members: number;
  messagesUnread: number;
  messagesTotal: number;
  visitors: number;
  bellSubscribers: number;
  postsPublished: number;
  postsTotal: number;
}

/** Ambil count dari sebuah query builder head:true (DRY untuk semua statistik). */
async function cnt(q: PromiseLike<{ count: number | null }>): Promise<number> {
  return (await q).count ?? 0;
}

const HEAD = { count: "exact" as const, head: true };

export async function getAdminStats(): Promise<AdminStats> {
  const sb = createAdminSupabase();

  const [
    mediaPending,
    mediaApproved,
    mediaTotal,
    members,
    messagesUnread,
    messagesTotal,
    visitors,
    bellSubscribers,
    postsPublished,
    postsTotal,
  ] = await Promise.all([
    cnt(sb.from("media").select("id", HEAD).eq("status", "pending")),
    cnt(sb.from("media").select("id", HEAD).eq("status", "approved")),
    cnt(sb.from("media").select("id", HEAD)),
    cnt(sb.from("members").select("id", HEAD)),
    cnt(sb.from("messages").select("id", HEAD).eq("is_read", false)),
    cnt(sb.from("messages").select("id", HEAD)),
    cnt(sb.from("visitors").select("id", HEAD)),
    cnt(
      sb
        .from("visitors")
        .select("id", HEAD)
        .eq("notifications_enabled", true),
    ),
    cnt(
      sb
        .from("blog_posts")
        .select("id", HEAD)
        .eq("status", "published"),
    ),
    cnt(sb.from("blog_posts").select("id", HEAD)),
  ]);

  return {
    mediaPending,
    mediaApproved,
    mediaTotal,
    members,
    messagesUnread,
    messagesTotal,
    visitors,
    bellSubscribers,
    postsPublished,
    postsTotal,
  };
}
