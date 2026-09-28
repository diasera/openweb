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
  PublicMediaColumns,
  SiteSearchRow,
} from "@/lib/types/database";
import {
  DEMO_SETTINGS,
  DEMO_MEMBERS,
  DEMO_MEDIA,
  DEMO_MEDIA_SLIDES,
  DEMO_MESSAGES,
  DEMO_POSTS,
  DEMO_COMMENTS,
} from "./demo";
import { ensureMemberSlugs } from "@/lib/members/slug";
import { normalizeSiteSettings } from "@/lib/site-config";
import { isUuid } from "@/lib/utils/id";
import { isSchemaOutdatedError } from "@/lib/database/errors";
import { SITE_TIME_ZONE, zonedParts } from "@/lib/utils/time";
import { isLookupSlug, optionalRead, unwrap, unwrapCount, unwrapFeature } from "./read";
import {
  composeMediaSlides,
  PUBLIC_MEDIA_SLIDE_COLUMNS,
  type MediaSlide,
  type MediaWithSlideCount,
} from "@/lib/media/slides";

export * from "./events";
export * from "./albums";

/** Pesan versi publik: hanya kolom aman (tanpa IP/device/user_agent). */
export type PublicMessage = Pick<
  MessageRow,
  "id" | "content" | "likes" | "created_at"
>;

type PublicListOptions = {
  limit?: number;
  offset?: number;
  pinnedOnly?: boolean;
  /** Batasi ke satu album (halaman album). */
  albumId?: string;
  /** Badge carousel di kartu; matikan untuk daftar besar tanpa UI (sitemap). */
  slideCounts?: boolean;
};

const PUBLIC_MEDIA_COLUMNS =
  "id, type, title, category, url, mime_type, thumbnail_url, caption, uploader_name, status, is_pinned, allow_comments, source, width, height, created_at" as const;

const PUBLIC_POST_COLUMNS =
  "id, title, slug, excerpt, category, tags, content_html, cover_image_url, status, author_name, views, published_at, created_at, updated_at" as const;

/** album_id sengaja tidak di kolom umum: galeri tetap jalan sebelum schema.sql terbaru. */
function publicMediaRow(
  row: Omit<PublicMediaColumns, "album_id"> & { album_id?: string | null },
): MediaRow {
  return {
    ...row,
    album_id: row.album_id ?? null,
    ip_address: null,
    reviewed_by: null,
    reviewed_at: null,
  };
}

function publicPostRow(
  row: Omit<BlogPostRow, "content_json" | "author_id" | "previous_slugs">,
): BlogPostRow {
  return { ...row, content_json: null, author_id: null, previous_slugs: [] };
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
 * Error database DILEMPAR, bukan diganti data demo/kosong: ISR tetap menyajikan
 * versi terakhir yang sukses dan error.tsx menampilkan opsi coba lagi.
 */
// cache(): di-dedupe per request (root layout + halaman sama-sama membacanya).
export const getSettings = cache(async (): Promise<SiteSettingsRow> => {
  if (!isSupabaseConfigured()) return DEMO_SETTINGS;
  const data = unwrap(
    "settings",
    await createPublicSupabase()
      .from("site_settings")
      .select("*")
      .eq("id", 1)
      .maybeSingle(),
  );
  // Baris singleton hilang = schema.sql belum dijalankan; identitas default netral.
  return normalizeSiteSettings(data ?? DEMO_SETTINGS);
});

export async function getMembers(limit?: number): Promise<MemberRow[]> {
  if (!isSupabaseConfigured()) {
    return ensureMemberSlugs(DEMO_MEMBERS).slice(
      0,
      limit ?? DEMO_MEMBERS.length,
    );
  }
  let q = createPublicSupabase()
    .from("members")
    .select("*")
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true })
    .order("id", { ascending: true });
  if (limit) q = q.limit(limit);
  return ensureMemberSlugs(unwrap("members", await q) ?? []);
}

/**
 * Resolve URL profil canonical berbasis slug. UUID lama masih dikenali agar
 * halaman dapat mengarahkannya ke URL baru tanpa memutus tautan tersimpan.
 */
export const getMemberByProfileKey = cache(async (key: string): Promise<MemberRow | null> => {
  if (!isSupabaseConfigured()) {
    return DEMO_MEMBERS.find((member) => member.slug === key || member.id === key) ?? null;
  }
  const sb = createPublicSupabase();
  const bySlug = await sb.from("members").select("*").eq("slug", key).maybeSingle();
  if (bySlug.error && isSchemaOutdatedError(bySlug.error)) {
    // Instalasi lama tanpa kolom slug: normalisasi daftar memberi URL sementara
    // sambil tetap mendorong admin menjalankan ulang schema.sql.
    const members = await getMembers();
    return (
      members.find(
        (member) => member.slug === key || (isUuid(key) && member.id === key),
      ) ?? null
    );
  }
  const member = unwrap("member-by-slug", bySlug);
  if (member) return member;

  if (isUuid(key)) {
    const byId = unwrap(
      "member-by-id",
      await sb.from("members").select("*").eq("id", key).maybeSingle(),
    );
    if (byId) return ensureMemberSlugs([byId])[0] ?? null;
  }

  // Slug lama setelah nama anggota diganti: halaman mengalihkan ke slug baru.
  if (!isLookupSlug(key)) return null;
  const renamed = unwrap(
    "member-by-previous-slug",
    await sb
      .from("members")
      .select("*")
      .contains("previous_slugs", [key])
      .limit(1)
      .maybeSingle(),
  );
  return renamed;
});

export const getMediaById = cache(async (id: string): Promise<MediaRow | null> => {
  if (!isSupabaseConfigured()) {
    return DEMO_MEDIA.find((m) => m.id === id) ?? null;
  }
  if (!isUuid(id)) return null;
  const data = unwrap(
    "media-by-id",
    await createPublicSupabase()
      .from("media")
      .select(PUBLIC_MEDIA_COLUMNS)
      .eq("id", id)
      .eq("status", "approved")
      .maybeSingle(),
  );
  return data ? publicMediaRow(data) : null;
});

/**
 * Seluruh item carousel pin (sampul + slide) untuk halaman detail. Slide
 * adalah konten utama, jadi error database dilempar; sebelum schema.sql
 * terbaru dijalankan pin tampil sebagai satu media.
 */
export async function getMediaSlides(media: MediaRow): Promise<MediaSlide[]> {
  if (!isSupabaseConfigured()) {
    return composeMediaSlides(
      media,
      DEMO_MEDIA_SLIDES.filter((slide) => slide.media_id === media.id),
    );
  }
  const slides = unwrapFeature(
    "media-slides",
    await createPublicSupabase()
      .from("media_slides")
      .select(PUBLIC_MEDIA_SLIDE_COLUMNS)
      .eq("media_id", media.id)
      .order("position", { ascending: true }),
    [],
  );
  return composeMediaSlides(media, slides);
}

/** Jumlah item per pin untuk badge carousel; bagian opsional kartu. */
async function withSlideCounts(rows: MediaRow[]): Promise<MediaWithSlideCount[]> {
  if (rows.length === 0) return rows;
  const countSlides = (mediaIds: readonly string[]) => {
    const counts = new Map<string, number>();
    for (const id of mediaIds) counts.set(id, (counts.get(id) ?? 0) + 1);
    return rows.map((row) => ({ ...row, slide_count: 1 + (counts.get(row.id) ?? 0) }));
  };
  if (!isSupabaseConfigured()) {
    return countSlides(DEMO_MEDIA_SLIDES.map((slide) => slide.media_id));
  }
  return optionalRead(
    "media-slide-counts",
    async () => {
      const slides = unwrapFeature(
        "media-slide-counts",
        await createPublicSupabase()
          .from("media_slides")
          .select("media_id")
          .in("media_id", rows.map((row) => row.id)),
        [],
      );
      return countSlides(slides.map((slide) => slide.media_id));
    },
    rows,
  );
}

export async function getMemberCount(): Promise<number> {
  if (!isSupabaseConfigured()) return DEMO_MEMBERS.length;
  return unwrapCount(
    "member-count",
    await createPublicSupabase()
      .from("members")
      .select("id", { count: "exact", head: true }),
  );
}

export async function getApprovedMediaCount(albumId?: string): Promise<number> {
  if (!isSupabaseConfigured()) {
    return albumId
      ? DEMO_MEDIA.filter((item) => item.album_id === albumId).length
      : DEMO_MEDIA.length;
  }
  let query = createPublicSupabase()
    .from("media")
    .select("id", { count: "exact", head: true })
    .eq("status", "approved");
  if (albumId) query = query.eq("album_id", albumId);
  return unwrapCount("media-count", await query);
}

export async function getPublishedPostCount(): Promise<number> {
  if (!isSupabaseConfigured()) return DEMO_POSTS.length;
  return unwrapCount(
    "post-count",
    await createPublicSupabase()
      .from("blog_posts")
      .select("id", { count: "exact", head: true })
      .eq("status", "published"),
  );
}

/** Media publik approved; homepage dapat meminta hanya item yang dipin. */
export async function getApprovedMedia({
  limit = 60,
  offset = 0,
  pinnedOnly = false,
  albumId,
  slideCounts = true,
}: PublicListOptions = {}): Promise<MediaWithSlideCount[]> {
  if (!isSupabaseConfigured()) {
    const media = DEMO_MEDIA.filter(
      (item) =>
        (!pinnedOnly || item.is_pinned) && (!albumId || item.album_id === albumId),
    ).slice(offset, offset + limit);
    return slideCounts ? withSlideCounts(media) : media;
  }
  let query = createPublicSupabase()
    .from("media")
    .select(PUBLIC_MEDIA_COLUMNS)
    .eq("status", "approved");
  if (pinnedOnly) query = query.eq("is_pinned", true);
  if (albumId) query = query.eq("album_id", albumId);
  const data = unwrap(
    "approved-media",
    await query
      .order("is_pinned", { ascending: false })
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1),
  );
  const rows = (data ?? []).map(publicMediaRow);
  return slideCounts ? withSlideCounts(rows) : rows;
}

/** Maksimal item per jenis yang diambil sekaligus untuk koleksi Tersimpan. */
export const MAX_SAVED_PER_REQUEST = 60;

/** Pin approved berdasarkan daftar id, mengikuti urutan permintaan. */
export async function getMediaByIds(
  ids: readonly string[],
): Promise<MediaWithSlideCount[]> {
  const unique = [...new Set(ids)].slice(0, MAX_SAVED_PER_REQUEST);
  if (unique.length === 0) return [];
  if (!isSupabaseConfigured()) {
    return withSlideCounts(
      unique.flatMap((id) => DEMO_MEDIA.find((item) => item.id === id) ?? []),
    );
  }
  const valid = unique.filter(isUuid);
  if (valid.length === 0) return [];
  const data = unwrap(
    "media-by-ids",
    await createPublicSupabase()
      .from("media")
      .select(PUBLIC_MEDIA_COLUMNS)
      .eq("status", "approved")
      .in("id", valid),
  );
  const byId = new Map((data ?? []).map((row) => [row.id, publicMediaRow(row)]));
  return withSlideCounts(valid.flatMap((id) => byId.get(id) ?? []));
}

const MEMORY_LIMIT = 12;

/**
 * "Kenangan hari ini": media approved pada tanggal yang sama di tahun-tahun
 * sebelumnya (zona waktu situs). Bagian opsional beranda.
 */
export async function getMemoriesToday(): Promise<MediaWithSlideCount[]> {
  if (!isSupabaseConfigured()) {
    const today = zonedParts(new Date());
    return withSlideCounts(DEMO_MEDIA.filter((item) => {
      const taken = zonedParts(new Date(item.created_at));
      return (
        taken.month === today.month &&
        taken.day === today.day &&
        taken.year < today.year
      );
    }).slice(0, MEMORY_LIMIT));
  }
  return optionalRead(
    "memories",
    async () => {
      const data = unwrap(
        "memories",
        await createPublicSupabase().rpc("media_on_this_day", {
          p_time_zone: SITE_TIME_ZONE,
          p_limit: MEMORY_LIMIT,
        }),
      );
      return withSlideCounts((data ?? []).map(publicMediaRow));
    },
    [],
  );
}

export async function getPublishedPosts(
  limit = 30,
  offset = 0,
): Promise<PublicPostCard[]> {
  if (!isSupabaseConfigured()) {
    return DEMO_POSTS.slice(offset, offset + limit);
  }
  const data = unwrap(
    "published-posts",
    await createPublicSupabase()
      .from("blog_posts")
      .select(POST_CARD_COLUMNS)
      .eq("status", "published")
      .order("published_at", { ascending: false })
      .range(offset, offset + limit - 1),
  );
  return data ?? [];
}

const POST_CARD_COLUMNS =
  "id, title, slug, excerpt, category, cover_image_url, published_at, updated_at, author_name, content_html" as const;

/** Artikel terbit berdasarkan daftar id, mengikuti urutan permintaan. */
export async function getPublishedPostsByIds(
  ids: readonly string[],
): Promise<PublicPostCard[]> {
  const unique = [...new Set(ids)].slice(0, MAX_SAVED_PER_REQUEST);
  if (unique.length === 0) return [];
  if (!isSupabaseConfigured()) {
    return unique.flatMap((id) => DEMO_POSTS.find((post) => post.id === id) ?? []);
  }
  const valid = unique.filter(isUuid);
  if (valid.length === 0) return [];
  const data = unwrap(
    "posts-by-ids",
    await createPublicSupabase()
      .from("blog_posts")
      .select(POST_CARD_COLUMNS)
      .eq("status", "published")
      .in("id", valid),
  );
  const byId = new Map((data ?? []).map((row) => [row.id, row]));
  return valid.flatMap((id) => byId.get(id) ?? []);
}

export const getPostBySlug = cache(async (slug: string): Promise<BlogPostRow | null> => {
  if (!isSupabaseConfigured()) {
    return DEMO_POSTS.find((p) => p.slug === slug) ?? null;
  }
  const sb = createPublicSupabase();
  const data = unwrap(
    "post-by-slug",
    await sb
      .from("blog_posts")
      .select(PUBLIC_POST_COLUMNS)
      .eq("slug", slug)
      .eq("status", "published")
      .maybeSingle(),
  );
  if (data) return publicPostRow(data);

  // Slug lama setelah judul diganti: halaman mengalihkan ke slug baru.
  if (!isLookupSlug(slug)) return null;
  const renamed = unwrap(
    "post-by-previous-slug",
    await sb
      .from("blog_posts")
      .select(PUBLIC_POST_COLUMNS)
      .contains("previous_slugs", [slug])
      .eq("status", "published")
      .order("published_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
  );
  return renamed ? publicPostRow(renamed) : null;
});

/** Komentar yang ditampilkan per pin: yang terbaru, disajikan kronologis. */
export const COMMENT_DISPLAY_LIMIT = 100;

export async function getComments(
  mediaId: string,
): Promise<{ comments: PublicComment[]; total: number }> {
  if (!isSupabaseConfigured()) {
    const comments = DEMO_COMMENTS.filter((c) => c.media_id === mediaId);
    return { comments, total: comments.length };
  }
  const sb = createPublicSupabase();
  const [rows, total] = await Promise.all([
    sb
      .from("comments")
      .select("id, author_name, content, created_at")
      .eq("media_id", mediaId)
      .order("created_at", { ascending: false })
      .limit(COMMENT_DISPLAY_LIMIT),
    sb
      .from("comments")
      .select("id", { count: "exact", head: true })
      .eq("media_id", mediaId),
  ]);
  const newestFirst = unwrap("comments", rows) ?? [];
  return {
    comments: newestFirst.reverse(),
    total: unwrapCount("comments-count", total),
  };
}

export async function getNotifications(limit = 30) {
  if (!isSupabaseConfigured()) return [];
  const data = unwrap(
    "notifications",
    await createPublicSupabase()
      .from("notifications")
      .select("id, title, body, url, created_at")
      .order("created_at", { ascending: false })
      .limit(limit),
  );
  return data ?? [];
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
  let query = createAdminSupabase()
    .from("messages")
    .select("id, content, likes, created_at");
  if (pinnedOnly) query = query.eq("is_pinned", true);
  const data = unwrap(
    "messages",
    await query
      .order("is_pinned", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(limit),
  );
  return data ?? [];
}

/** Hasil pencarian situs (Spotlight island) lintas media, blog, dan anggota. */
export type SiteSearchResult = {
  kind: "media" | "blog" | "member";
  id: string;
  title: string;
  subtitle: string | null;
  href: string;
};

const SEARCH_LIMIT_PER_KIND = 5;

const SEARCH_KIND_ORDER: Record<SiteSearchResult["kind"], number> = {
  member: 0,
  media: 1,
  blog: 2,
};

function searchHref(row: SiteSearchRow): string {
  if (row.kind === "member") return `/profil/${row.slug}`;
  if (row.kind === "blog") return `/blog/${row.slug}`;
  return `/pin/${row.id}`;
}

function demoSearch(needle: string): SiteSearchRow[] {
  const matches = (...values: Array<string | null | undefined>) =>
    values.some((value) => value?.toLowerCase().includes(needle));
  return [
    ...ensureMemberSlugs(DEMO_MEMBERS)
      .filter((m) => matches(m.name, m.position, m.nim))
      .slice(0, SEARCH_LIMIT_PER_KIND)
      .map((m) => ({
        kind: "member" as const,
        id: m.id,
        title: m.name,
        subtitle: m.position ?? null,
        slug: m.slug,
      })),
    ...DEMO_MEDIA.filter((m) => matches(m.title, m.caption, m.category, m.uploader_name))
      .slice(0, SEARCH_LIMIT_PER_KIND)
      .map((m) => ({
        kind: "media" as const,
        id: m.id,
        title: m.title || "Media",
        subtitle: m.category ?? null,
        slug: null,
      })),
    ...DEMO_POSTS.filter((p) => matches(p.title, p.excerpt, p.content_html))
      .slice(0, SEARCH_LIMIT_PER_KIND)
      .map((p) => ({
        kind: "blog" as const,
        id: p.id,
        title: p.title,
        subtitle: p.category ?? null,
        slug: p.slug,
      })),
  ];
}

/**
 * Pencarian publik satu kotak untuk Spotlight island. Database memakai
 * full-text search bahasa Indonesia (stemming + awalan kata) dengan cadangan
 * substring; RLS memastikan hanya konten layak-publik yang bisa ditemukan.
 */
export async function searchSiteContent(
  query: string,
): Promise<SiteSearchResult[]> {
  const clean = query.trim();
  if (clean.length < 2) return [];

  const rows = !isSupabaseConfigured()
    ? demoSearch(clean.toLowerCase())
    : unwrapFeature(
        "search",
        await createPublicSupabase().rpc("search_site", {
          p_query: clean,
          p_limit: SEARCH_LIMIT_PER_KIND,
        }),
        [],
      );

  return rows
    .filter((row) => row.kind === "media" || row.slug)
    .sort((a, b) => SEARCH_KIND_ORDER[a.kind] - SEARCH_KIND_ORDER[b.kind])
    .map((row) => ({
      kind: row.kind,
      id: row.id,
      title: row.title,
      subtitle: row.subtitle,
      href: searchHref(row),
    }));
}
