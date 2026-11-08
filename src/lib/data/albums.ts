import { cache } from "react";
import { createPublicSupabase, isSupabaseConfigured } from "@/lib/supabase/public";
import type { AlbumRow, AlbumSummaryRow } from "@/lib/types/database";
import { isUuid } from "@/lib/utils/id";
import { DEMO_ALBUMS, DEMO_MEDIA } from "./demo";
import { isLookupSlug, unwrapFeature } from "./read";

/** Album versi publik (tanpa id pembuat). */
export type PublicAlbum = Omit<AlbumRow, "created_by">;

const PUBLIC_ALBUM_COLUMNS =
  "id, slug, previous_slugs, title, description, event_id, created_at, updated_at" as const;

function demoSummaries(): AlbumSummaryRow[] {
  return DEMO_ALBUMS.map((album) => {
    const media = DEMO_MEDIA.filter((item) => item.album_id === album.id).sort(
      (a, b) => Date.parse(b.created_at) - Date.parse(a.created_at),
    );
    const cover = media[0];
    return {
      id: album.id,
      slug: album.slug,
      title: album.title,
      description: album.description,
      event_id: album.event_id,
      created_at: album.created_at,
      updated_at: album.updated_at,
      media_count: media.length,
      cover_url: cover?.url || null,
      cover_type: cover?.type ?? null,
      cover_thumbnail_url: cover?.thumbnail_url ?? null,
      latest_media_at: cover?.created_at ?? null,
    };
  });
}

/** Kartu album publik: jumlah media tampil + sampul media terbaru. */
export async function getAlbumSummaries(): Promise<AlbumSummaryRow[]> {
  if (!isSupabaseConfigured()) return demoSummaries();
  const data = unwrapFeature(
    "album-summaries",
    await createPublicSupabase().rpc("album_summaries"),
    [],
  );
  return data.map((row) => ({ ...row, media_count: Number(row.media_count) }));
}

/** Media approved milik album, untuk chip "Album" di Detail Pin. */
export async function getAlbumForMedia(mediaId: string): Promise<PublicAlbum | null> {
  if (!isSupabaseConfigured()) {
    const albumId = DEMO_MEDIA.find((item) => item.id === mediaId)?.album_id;
    return albumId ? (DEMO_ALBUMS.find((album) => album.id === albumId) ?? null) : null;
  }
  if (!isUuid(mediaId)) return null;
  const row = unwrapFeature(
    "media-album",
    await createPublicSupabase()
      .from("media")
      .select("album_id")
      .eq("id", mediaId)
      .eq("status", "approved")
      .maybeSingle(),
    null,
  );
  return row?.album_id ? getAlbumById(row.album_id) : null;
}

/** Slug kanonis; slug lama (album diganti nama) dialihkan oleh halaman. */
export const getAlbumBySlug = cache(async (slug: string): Promise<PublicAlbum | null> => {
  if (!isSupabaseConfigured()) {
    return DEMO_ALBUMS.find((album) => album.slug === slug) ?? null;
  }
  const sb = createPublicSupabase();
  const exact = unwrapFeature(
    "album-by-slug",
    await sb.from("albums").select(PUBLIC_ALBUM_COLUMNS).eq("slug", slug).maybeSingle(),
    null,
  );
  if (exact) return exact;
  if (!isLookupSlug(slug)) return null;
  return unwrapFeature(
    "album-by-previous-slug",
    await sb
      .from("albums")
      .select(PUBLIC_ALBUM_COLUMNS)
      .contains("previous_slugs", [slug])
      .limit(1)
      .maybeSingle(),
    null,
  );
});

export const getAlbumById = cache(async (id: string): Promise<PublicAlbum | null> => {
  if (!isSupabaseConfigured()) {
    return DEMO_ALBUMS.find((album) => album.id === id) ?? null;
  }
  if (!isUuid(id)) return null;
  return unwrapFeature(
    "album-by-id",
    await createPublicSupabase()
      .from("albums")
      .select(PUBLIC_ALBUM_COLUMNS)
      .eq("id", id)
      .maybeSingle(),
    null,
  );
});
