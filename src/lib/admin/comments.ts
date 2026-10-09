import "server-only";
import { createAdminSupabase } from "@/lib/supabase/admin";
import { readableMediaUrls } from "@/lib/media/upload";
import type { CommentRow, MediaRow } from "@/lib/types/database";
import { pageBounds, toPaged, type Paged } from "./paging";

export const ADMIN_COMMENTS_PAGE_SIZE = 30;

export type AdminComment = Omit<CommentRow, "ip_address" | "user_agent"> & {
  has_ip: boolean;
  /** `url` sudah bisa dibuka admin (signed URL inbox bila belum disetujui). */
  media: Pick<MediaRow, "id" | "title" | "type" | "status" | "url" | "thumbnail_url"> | null;
};

/** Komentar terbaru lintas pin untuk moderasi; IP mentah tidak dikirim ke klien. */
export async function getAdminComments(page = 1): Promise<Paged<AdminComment>> {
  const sb = createAdminSupabase();
  const { from, to } = pageBounds(page, ADMIN_COMMENTS_PAGE_SIZE);
  const { data, count } = await sb
    .from("comments")
    .select("*", { count: "exact" })
    .order("created_at", { ascending: false })
    .range(from, to);
  const comments = data ?? [];

  const mediaIds = [...new Set(comments.map((comment) => comment.media_id))];
  const { data: mediaRows } = mediaIds.length
    ? await sb
        .from("media")
        .select("id, title, type, status, url, thumbnail_url")
        .in("id", mediaIds)
    : { data: [] };
  const readable = await readableMediaUrls(mediaRows ?? []);
  const mediaById = new Map(
    (mediaRows ?? []).map((media) => [
      media.id,
      {
        id: media.id,
        title: media.title,
        type: media.type,
        status: media.status,
        url: readable.get(media.url) ?? media.url,
        thumbnail_url: media.thumbnail_url,
      },
    ]),
  );

  return toPaged(
    comments.map((comment) => ({
      id: comment.id,
      media_id: comment.media_id,
      author_name: comment.author_name,
      content: comment.content,
      device: comment.device,
      created_at: comment.created_at,
      has_ip: Boolean(comment.ip_address),
      media: mediaById.get(comment.media_id) ?? null,
    })),
    count,
    page,
    ADMIN_COMMENTS_PAGE_SIZE,
  );
}
