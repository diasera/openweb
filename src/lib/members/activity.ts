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

/** Sel satu hari pada grafik aktivitas. */
export interface ActivityHeatmapDay {
  /** ISO date (yyyy-mm-dd) — kunci stabil untuk React. */
  date: string;
  /** 0 = kosong; 1..4 = intensitas naik. */
  level: 0 | 1 | 2 | 3 | 4;
  /** Jumlah momen pada hari itu. */
  count: number;
}

export interface ActivityHeatmap {
  days: ActivityHeatmapDay[];
  total: number;
  /** Senin di kolom pertama; minggu berjalan di kolom terakhir. */
  weeks: number;
}

/** Ambil level dari jumlah: 0 lalu 1..4 dengan batas 3+. */
function heatLevel(count: number): ActivityHeatmapDay["level"] {
  if (count <= 0) return 0;
  if (count === 1) return 1;
  if (count === 2) return 2;
  if (count <= 4) return 3;
  return 4;
}

/**
 * Bangun data grafik aktivitas (grid minggu × hari) dari item aktivitas yang
 * sudah ada — fungsi pure tanpa query tambahan. Kolom pertama = Senin pada
 * (hari ini - (weeks-1) minggu), dirotasi agar minggu berjalan paling kanan.
 */
export function buildActivityHeatmap(
  items: MemberActivityItem[],
  weeks = 26,
): ActivityHeatmap {
  const perDay = new Map<string, number>();
  for (const item of items) {
    const stamp = Date.parse(item.occurredAt);
    if (Number.isNaN(stamp)) continue;
    const day = new Date(stamp);
    const key = `${day.getFullYear()}-${String(day.getMonth() + 1).padStart(2, "0")}-${String(day.getDate()).padStart(2, "0")}`;
    perDay.set(key, (perDay.get(key) ?? 0) + 1);
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  // Mundur ke Senin minggu ini, lalu (weeks-1) minggu ke belakang.
  const monday = new Date(today);
  monday.setDate(monday.getDate() - ((monday.getDay() + 6) % 7) - (weeks - 1) * 7);

  const days: ActivityHeatmapDay[] = [];
  let total = 0;
  for (let offset = 0; offset < weeks * 7; offset += 1) {
    const day = new Date(monday);
    day.setDate(monday.getDate() + offset);
    const key = `${day.getFullYear()}-${String(day.getMonth() + 1).padStart(2, "0")}-${String(day.getDate()).padStart(2, "0")}`;
    const count = day > today ? 0 : (perDay.get(key) ?? 0);
    total += count;
    days.push({ date: key, level: heatLevel(count), count });
  }
  return { days, total, weeks };
}
