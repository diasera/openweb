import "server-only";
import { createPublicSupabase, isSupabaseConfigured } from "@/lib/supabase/public";
import { DEMO_MEDIA, DEMO_POSTS } from "@/lib/data/demo";
import type { MemberRow } from "@/lib/types/database";
import { textMentionsMember } from "./name-match";
import { blogMentionValues, mediaMentionValues } from "./mention-values";

export type MemberActivityItem =
  | {
      kind: "media";
      id: string;
      href: string;
      title: string;
      description: string | null;
      occurredAt: string;
      mediaType: "photo" | "video";
      imageUrl: string | null;
    }
  | {
      kind: "blog";
      id: string;
      href: string;
      title: string;
      description: string | null;
      occurredAt: string;
      imageUrl: string | null;
    };

function mediaItem(media: {
  id: string;
  type: "photo" | "video";
  title: string | null;
  caption: string | null;
  uploader_name: string | null;
  url: string;
  thumbnail_url: string | null;
  created_at: string;
}): MemberActivityItem {
  return {
    kind: "media",
    id: media.id,
    href: `/pin/${media.id}`,
    title: media.title || media.caption || "Momen bersama",
    description: media.caption || media.uploader_name,
    occurredAt: media.created_at,
    mediaType: media.type,
    imageUrl: media.type === "photo" ? media.url : media.thumbnail_url,
  };
}

function blogItem(post: {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  cover_image_url: string | null;
  published_at: string | null;
  created_at: string;
}): MemberActivityItem {
  return {
    kind: "blog",
    id: post.id,
    href: `/blog/${post.slug}`,
    title: post.title,
    description: post.excerpt,
    occurredAt: post.published_at || post.created_at,
    imageUrl: post.cover_image_url,
  };
}

function sortActivity(items: MemberActivityItem[]) {
  return items
    .sort((a, b) => Date.parse(b.occurredAt) - Date.parse(a.occurredAt))
    .slice(0, 60);
}

function demoActivity(member: MemberRow) {
  const media = DEMO_MEDIA.filter(
    (item) =>
      item.source === "admin" &&
      textMentionsMember(member.name, mediaMentionValues(item)),
  ).map(mediaItem);
  const posts = DEMO_POSTS.filter((post) =>
    textMentionsMember(member.name, blogMentionValues(post)),
  ).map(blogItem);
  return sortActivity([...media, ...posts]);
}

async function fallbackScan(member: MemberRow): Promise<MemberActivityItem[]> {
  const sb = createPublicSupabase();
  const [mediaResult, blogResult] = await Promise.all([
    sb
      .from("media")
      .select(
        "id, type, title, category, caption, uploader_name, url, thumbnail_url, created_at",
      )
      .eq("status", "approved")
      .eq("source", "admin")
      .order("created_at", { ascending: false })
      .limit(120),
    sb
      .from("blog_posts")
      .select(
        "id, title, slug, excerpt, category, tags, author_name, content_html, cover_image_url, published_at, created_at",
      )
      .eq("status", "published")
      .order("published_at", { ascending: false })
      .limit(120),
  ]);
  const media = (mediaResult.data ?? [])
    .filter((item) =>
      textMentionsMember(member.name, mediaMentionValues(item)),
    )
    .map(mediaItem);
  const posts = (blogResult.data ?? [])
    .filter((post) =>
      textMentionsMember(member.name, blogMentionValues(post)),
    )
    .map(blogItem);
  return sortActivity([...media, ...posts]);
}

/** Feed profil membaca indeks kecil; pemindaian hanya fallback sebelum migrasi. */
export async function getMemberActivity(
  member: MemberRow,
): Promise<MemberActivityItem[]> {
  if (!isSupabaseConfigured()) return demoActivity(member);
  const sb = createPublicSupabase();
  const { data: mentions, error } = await sb
    .from("member_mentions")
    .select("media_id, blog_post_id")
    .eq("member_id", member.id)
    .limit(120);
  if (error) return fallbackScan(member);

  const mediaIds = [
    ...new Set((mentions ?? []).flatMap((item) => (item.media_id ? [item.media_id] : []))),
  ];
  const blogIds = [
    ...new Set(
      (mentions ?? []).flatMap((item) =>
        item.blog_post_id ? [item.blog_post_id] : [],
      ),
    ),
  ];
  const [mediaResult, blogResult] = await Promise.all([
    mediaIds.length > 0
      ? sb
          .from("media")
          .select("id, type, title, caption, uploader_name, url, thumbnail_url, created_at")
          .in("id", mediaIds)
          .eq("status", "approved")
      : Promise.resolve({ data: [] }),
    blogIds.length > 0
      ? sb
          .from("blog_posts")
          .select("id, title, slug, excerpt, cover_image_url, published_at, created_at")
          .in("id", blogIds)
          .eq("status", "published")
      : Promise.resolve({ data: [] }),
  ]);
  return sortActivity([
    ...(mediaResult.data ?? []).map(mediaItem),
    ...(blogResult.data ?? []).map(blogItem),
  ]);
}
