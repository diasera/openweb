import "server-only";
import { createPublicSupabase, isSupabaseConfigured } from "@/lib/supabase/public";
import { DEMO_MEDIA, DEMO_MEMBERS, DEMO_POSTS } from "@/lib/data/demo";
import type { BlogPostRow, MediaRow, MemberRow } from "@/lib/types/database";
import {
  buildActivityHeatmap,
  type ActivityHeatmap,
  type ActivityHeatmapDay,
  type ActivityHeatmapMonthMark,
  type MemberActivityItem,
} from "./activity-shared";
import { textMentionsMember } from "./name-match";
import { blogMentionValues, mediaMentionValues } from "./mention-values";
import { ensureMemberSlugs } from "./slug";

export {
  buildActivityHeatmap,
  type ActivityHeatmap,
  type ActivityHeatmapDay,
  type ActivityHeatmapMonthMark,
  type MemberActivityItem,
};

function mediaItem(media: {
  id: string;
  type: "photo" | "video";
  title: string | null;
  caption: string | null;
  uploader_name: string | null;
  url: string;
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
    mediaUrl: media.url,
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
        "id, type, title, category, caption, uploader_name, url, created_at",
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

/** Feed profil membaca indeks kecil; pemindaian teks dipakai bila indeks
 *  bermasalah ATAU belum terisi (konten lama sebelum indeks menyala). */
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
  if (error || !mentions || mentions.length === 0) {
    return fallbackScan(member);
  }

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
          .select("id, type, title, caption, uploader_name, url, created_at")
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

type MentionLookupSource =
  | {
      column: "media_id";
      id: string;
      values: unknown[];
    }
  | {
      column: "blog_post_id";
      id: string;
      values: unknown[];
    };

function matchMembersByText(
  members: readonly MemberRow[],
  values: unknown[],
): MemberRow[] {
  return ensureMemberSlugs(members).filter((member) =>
    textMentionsMember(member.name, values),
  );
}

async function resolveMentionedMembers(
  source: MentionLookupSource,
): Promise<MemberRow[]> {
  const hasText = source.values.some((value) =>
    Array.isArray(value)
      ? value.length > 0
      : typeof value === "string" && value.trim().length > 0,
  );
  if (!hasText) return [];
  if (!isSupabaseConfigured()) {
    return matchMembersByText(DEMO_MEMBERS, source.values);
  }

  const sb = createPublicSupabase();
  const { data: mentions, error } = await sb
    .from("member_mentions")
    .select("member_id")
    .eq(source.column, source.id)
    .limit(60);

  if (!error && mentions && mentions.length > 0) {
    const memberIds = [...new Set(mentions.map((item) => item.member_id))];
    const { data: members } = await sb
      .from("members")
      .select("*")
      .in("id", memberIds)
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: true })
      .order("id", { ascending: true });
    return ensureMemberSlugs(members ?? []);
  }

  const { data: allMembers } = await sb
    .from("members")
    .select("*")
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true })
    .order("id", { ascending: true });
  return matchMembersByText(allMembers ?? [], source.values);
}

/** Anggota yang disebut pada pin admin; kiriman pengunjung tidak menandai profil. */
export async function getMentionedMembersForMedia(
  media: Pick<
    MediaRow,
    "id" | "source" | "title" | "category" | "caption" | "uploader_name"
  >,
): Promise<MemberRow[]> {
  if (media.source !== "admin") return [];
  return resolveMentionedMembers({
    column: "media_id",
    id: media.id,
    values: mediaMentionValues(media),
  });
}

/** Anggota yang disebut pada artikel terbit. */
export async function getMentionedMembersForPost(
  post: Pick<
    BlogPostRow,
    | "id"
    | "title"
    | "excerpt"
    | "category"
    | "tags"
    | "author_name"
    | "content_html"
  >,
): Promise<MemberRow[]> {
  return resolveMentionedMembers({
    column: "blog_post_id",
    id: post.id,
    values: blogMentionValues(post),
  });
}
