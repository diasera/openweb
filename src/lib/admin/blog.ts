import "server-only";
import { createAdminSupabase } from "@/lib/supabase/admin";
import type { BlogPostRow, PostStatus } from "@/lib/types/database";
import { isUuid } from "@/lib/utils/id";
import { pageBounds, toPaged, type Paged } from "./paging";

/** Filter artikel yang digunakan halaman pengelolaan blog. */
export type BlogFilter = "all" | PostStatus;

export const ADMIN_POSTS_PAGE_SIZE = 30;

export async function getAdminPosts(
  filter: BlogFilter = "all",
  page = 1,
): Promise<Paged<BlogPostRow>> {
  const sb = createAdminSupabase();
  const { from, to } = pageBounds(page, ADMIN_POSTS_PAGE_SIZE);
  let q = sb
    .from("blog_posts")
    .select("*", { count: "exact" })
    .order("updated_at", { ascending: false })
    .range(from, to);
  if (filter !== "all") q = q.eq("status", filter);
  const { data, count } = await q;
  return toPaged(data ?? [], count, page, ADMIN_POSTS_PAGE_SIZE);
}

/** Jumlah artikel per status untuk label tab pengelolaan blog. */
export async function getPostStatusCounts(): Promise<Record<BlogFilter, number>> {
  const sb = createAdminSupabase();
  const head = { count: "exact" as const, head: true };
  const byStatus = async (status?: PostStatus) => {
    const query = sb.from("blog_posts").select("id", head);
    const { count } = await (status ? query.eq("status", status) : query);
    return count ?? 0;
  };
  const [all, published, draft, archived] = await Promise.all([
    byStatus(),
    byStatus("published"),
    byStatus("draft"),
    byStatus("archived"),
  ]);
  return { all, published, draft, archived };
}

export async function getPostById(id: string): Promise<BlogPostRow | null> {
  if (!isUuid(id)) return null;
  const sb = createAdminSupabase();
  const { data } = await sb
    .from("blog_posts")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  return data ?? null;
}
