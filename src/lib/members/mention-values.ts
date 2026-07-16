import type { BlogPostRow, MediaRow } from "@/lib/types/database";

type MediaMentionSource = Pick<
  MediaRow,
  "title" | "category" | "caption" | "uploader_name"
>;

type BlogMentionSource = Pick<
  BlogPostRow,
  | "title"
  | "excerpt"
  | "category"
  | "tags"
  | "author_name"
  | "content_html"
>;

/** Field yang membentuk history tag media di save, rebuild, demo, dan fallback. */
export function mediaMentionValues(source: MediaMentionSource): unknown[] {
  return [
    source.title,
    source.category,
    source.caption,
    source.uploader_name,
  ];
}

/** Field yang membentuk history tag artikel di seluruh jalur indeks. */
export function blogMentionValues(source: BlogMentionSource): unknown[] {
  return [
    source.title,
    source.excerpt,
    source.category,
    source.tags,
    source.author_name,
    source.content_html,
  ];
}
