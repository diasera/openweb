import "server-only";
import { createAdminSupabase } from "@/lib/supabase/admin";
import type { BlogPostRow, PostStatus } from "@/lib/types/database";

/** Filter artikel yang digunakan halaman pengelolaan blog. */
export type BlogFilter = "all" | PostStatus;

export async function getAdminPosts(
  filter: BlogFilter = "all",
): Promise<BlogPostRow[]> {
  const sb = createAdminSupabase();
  let q = sb
    .from("blog_posts")
    .select("*")
    .order("updated_at", { ascending: false })
    .limit(100);
  if (filter !== "all") q = q.eq("status", filter);
  const { data } = await q;
  return data ?? [];
}

export async function getPostById(id: string): Promise<BlogPostRow | null> {
  const sb = createAdminSupabase();
  const { data } = await sb
    .from("blog_posts")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  return data ?? null;
}
