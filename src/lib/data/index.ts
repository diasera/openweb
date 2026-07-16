import { cache } from "react";
import { createPublicSupabase, isSupabaseConfigured } from "@/lib/supabase/public";
import { createAdminSupabase } from "@/lib/supabase/admin";
import type {
  SiteSettingsRow,
  MemberRow,
  MediaRow,
  MessageRow,
  BlogPostRow,
  CommentRow,
} from "@/lib/types/database";
import {
  DEMO_SETTINGS,
  DEMO_MEMBERS,
  DEMO_MEDIA,
  DEMO_MESSAGES,
  DEMO_POSTS,
  DEMO_COMMENTS,
} from "./demo";
import { ensureMemberSlugs } from "@/lib/members/slug";
import { normalizeSiteSettings } from "@/lib/site-config";
import { isUuid } from "@/lib/utils/id";

/** Pesan versi publik: hanya kolom aman (tanpa IP/device/user_agent). */
export type PublicMessage = Pick<
  MessageRow,
  "id" | "content" | "likes" | "created_at"
>;

type PublicListOptions = {
  limit?: number;
  pinnedOnly?: boolean;
};

const PUBLIC_MEDIA_COLUMNS =
  "id, type, title, category, url, mime_type, thumbnail_url, caption, uploader_name, status, is_pinned, allow_comments, source, width, height, created_at" as const;

const PUBLIC_POST_COLUMNS =
  "id, title, slug, excerpt, category, tags, content_html, cover_image_url, status, author_name, views, published_at, created_at, updated_at" as const;

function publicMediaRow(
  row: Omit<MediaRow, "ip_address" | "reviewed_by" | "reviewed_at">,
): MediaRow {
  return { ...row, ip_address: null, reviewed_by: null, reviewed_at: null };
}

function publicPostRow(
  row: Omit<BlogPostRow, "content_json" | "author_id">,
): BlogPostRow {
  return { ...row, content_json: null, author_id: null };
}

/** Kartu artikel di daftar blog (kolom yang diperlukan; content utk waktu baca). */
export type PublicPostCard = Pick<
  BlogPostRow,
  | "id"
  | "title"
  | "slug"
  | "excerpt"
  | "category"
  | "cover_image_url"
  | "published_at"
  | "updated_at"
  | "author_name"
  | "content_html"
>;

/** Komentar versi publik: tanpa IP/device. */
export type PublicComment = Pick<
  CommentRow,
  "id" | "author_name" | "content" | "created_at"
>;

/**
 * Lapisan akses data publik (dipakai Server Component). Pola tunggal:
 *  - Supabase belum dikonfigurasi -> pakai data demo (template langsung hidup).
 *  - Sudah dikonfigurasi -> baca data asli (boleh kosong -> tampil empty state).
 * Semua error di-catch agar halaman publik tak pernah tumbang.
 */
async function safe<T>(fn: () => Promise<T>, fallback: T): Promise<T> {
  try {
    return await fn();
  } catch {
    return fallback;
  }
}

// cache(): di-dedupe per request (root layout + halaman sama-sama membacanya).
export const getSettings = cache(async (): Promise<SiteSettingsRow> => {
  if (!isSupabaseConfigured()) return DEMO_SETTINGS;
  return safe(async () => {
    const sb = createPublicSupabase();
    const { data } = await sb
      .from("site_settings")
      .select("*")
      .eq("id", 1)
      .maybeSingle();
    return normalizeSiteSettings(data ?? DEMO_SETTINGS);
  }, DEMO_SETTINGS);
});

export async function getMembers(limit?: number): Promise<MemberRow[]> {
  if (!isSupabaseConfigured()) {
    return ensureMemberSlugs(DEMO_MEMBERS).slice(
      0,
      limit ?? DEMO_MEMBERS.length,
    );
  }
  return safe(async () => {
    const sb = createPublicSupabase();
    let q = sb
      .from("members")
      .select("*")
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: true })
      .order("id", { ascending: true });
    if (limit) q = q.limit(limit);
    const { data } = await q;
    return ensureMemberSlugs(data ?? []);
  }, []);
}

/**
 * Resolve URL profil canonical berbasis slug. UUID lama masih dikenali agar
 * halaman dapat mengarahkannya ke URL baru tanpa memutus tautan tersimpan.
 */
export const getMemberByProfileKey = cache(async (key: string): Promise<MemberRow | null> => {
  if (!isSupabaseConfigured()) {
    return DEMO_MEMBERS.find((member) => member.slug === key || member.id === key) ?? null;
  }
  return safe(async () => {
    const sb = createPublicSupabase();
    const { data: bySlug } = await sb
      .from("members")
      .select("*")
      .eq("slug", key)
      .maybeSingle();
    if (bySlug) return bySlug;

    if (isUuid(key)) {
      const { data: byId } = await sb
        .from("members")
        .select("*")
        .eq("id", key)
        .maybeSingle();
      if (byId && typeof byId.slug === "string" && byId.slug.trim()) {
        return ensureMemberSlugs([byId])[0] ?? null;
      }
    }

    // Instalasi sebelum migration belum memiliki kolom slug. Normalisasi daftar
    // lama memberi URL yang dapat dipakai segera, sambil tetap mendorong admin
    // menjalankan migration agar slug tersimpan dan unik di database.
    const members = await getMembers();
    return (
      members.find(
        (member) =>
          member.slug === key ||
          (isUuid(key) && member.id === key),
      ) ?? null
    );
  }, null);
});

export const getMediaById = cache(async (id: string): Promise<MediaRow | null> => {
  if (!isSupabaseConfigured()) {
    return DEMO_MEDIA.find((m) => m.id === id) ?? null;
  }
  return safe(async () => {
    const sb = createPublicSupabase();
    const { data } = await sb
      .from("media")
      .select(PUBLIC_MEDIA_COLUMNS)
      .eq("id", id)
      .eq("status", "approved")
      .maybeSingle();
    return data ? publicMediaRow(data) : null;
  }, null);
});

export async function getMemberCount(): Promise<number> {
  if (!isSupabaseConfigured()) return DEMO_MEMBERS.length;
  return safe(async () => {
    const sb = createPublicSupabase();
    const { count } = await sb
      .from("members")
      .select("id", { count: "exact", head: true });
    return count ?? 0;
  }, 0);
}

export async function getApprovedMediaCount(): Promise<number> {
  if (!isSupabaseConfigured()) return DEMO_MEDIA.length;
  return safe(async () => {
    const sb = createPublicSupabase();
    const { count } = await sb
      .from("media")
      .select("id", { count: "exact", head: true })
      .eq("status", "approved");
    return count ?? 0;
  }, 0);
}

export async function getPublishedPostCount(): Promise<number> {
  if (!isSupabaseConfigured()) return DEMO_POSTS.length;
  return safe(async () => {
    const sb = createPublicSupabase();
    const { count } = await sb
      .from("blog_posts")
      .select("id", { count: "exact", head: true })
      .eq("status", "published");
    return count ?? 0;
  }, 0);
}

/** Media publik approved; homepage dapat meminta hanya item yang dipin. */
export async function getApprovedMedia({
  limit = 60,
  pinnedOnly = false,
}: PublicListOptions = {}): Promise<MediaRow[]> {
  if (!isSupabaseConfigured()) {
    const media = pinnedOnly
      ? DEMO_MEDIA.filter((item) => item.is_pinned)
      : DEMO_MEDIA;
    return media.slice(0, limit);
  }
  return safe(async () => {
    const sb = createPublicSupabase();
    let query = sb
      .from("media")
      .select(PUBLIC_MEDIA_COLUMNS)
      .eq("status", "approved");
    if (pinnedOnly) query = query.eq("is_pinned", true);
    const { data } = await query
      .order("is_pinned", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(limit);
    return (data ?? []).map(publicMediaRow);
  }, []);
}

export async function getPublishedPosts(limit = 30): Promise<PublicPostCard[]> {
  if (!isSupabaseConfigured()) return DEMO_POSTS.slice(0, limit);
  return safe(async () => {
    const sb = createPublicSupabase();
    const { data } = await sb
      .from("blog_posts")
      .select(
        "id, title, slug, excerpt, category, cover_image_url, published_at, updated_at, author_name, content_html",
      )
      .eq("status", "published")
      .order("published_at", { ascending: false })
      .limit(limit);
    return data ?? [];
  }, []);
}

export const getPostBySlug = cache(async (slug: string): Promise<BlogPostRow | null> => {
  if (!isSupabaseConfigured()) {
    return DEMO_POSTS.find((p) => p.slug === slug) ?? null;
  }
  return safe(async () => {
    const sb = createPublicSupabase();
    const { data } = await sb
      .from("blog_posts")
      .select(PUBLIC_POST_COLUMNS)
      .eq("slug", slug)
      .eq("status", "published")
      .maybeSingle();
    return data ? publicPostRow(data) : null;
  }, null);
});

export async function getComments(mediaId: string): Promise<PublicComment[]> {
  if (!isSupabaseConfigured()) {
    return DEMO_COMMENTS.filter((c) => c.media_id === mediaId);
  }
  return safe(async () => {
    const sb = createPublicSupabase();
    const { data } = await sb
      .from("comments")
      .select("id, author_name, content, created_at")
      .eq("media_id", mediaId)
      .order("created_at", { ascending: true })
      .limit(100);
    return data ?? [];
  }, []);
}

export async function getNotifications(limit = 30) {
  if (!isSupabaseConfigured()) return [];
  return safe(async () => {
    const sb = createPublicSupabase();
    const { data } = await sb
      .from("notifications")
      .select("id, title, body, url, created_at")
      .order("created_at", { ascending: false })
      .limit(limit);
    return data ?? [];
  }, []);
}

/**
 * Pesan anonim untuk publik. Service role hanya memilih kolom aman;
 * IP/device/user_agent tidak pernah dikirim ke browser. Homepage dapat
 * meminta hanya pesan yang dipin melalui opsi yang sama.
 */
export async function getPublicMessages({
  limit = 60,
  pinnedOnly = false,
}: PublicListOptions = {}): Promise<PublicMessage[]> {
  if (!isSupabaseConfigured()) {
    const messages = DEMO_MESSAGES
      .filter((message) => !pinnedOnly || message.is_pinned)
      .sort(
        (a, b) =>
          Number(b.is_pinned) - Number(a.is_pinned) ||
          Date.parse(b.created_at) - Date.parse(a.created_at),
      );
    return messages.slice(0, limit);
  }
  return safe(async () => {
    const sb = createAdminSupabase();
    let query = sb
      .from("messages")
      .select("id, content, likes, created_at");
    if (pinnedOnly) query = query.eq("is_pinned", true);
    const { data } = await query
      .order("is_pinned", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(limit);
    return data ?? [];
  }, []);
}
