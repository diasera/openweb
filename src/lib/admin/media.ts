import "server-only";
import { createAdminSupabase } from "@/lib/supabase/admin";
import { readableMediaUrls } from "@/lib/media/upload";
import { isSchemaOutdatedError } from "@/lib/database/errors";
import {
  composeMediaSlides,
  PUBLIC_MEDIA_SLIDE_COLUMNS,
  type MediaSlide,
  type StoredMediaSource,
} from "@/lib/media/slides";
import type { MediaRow, MediaSlideRow, MediaStatus } from "@/lib/types/database";
import { isUuid } from "@/lib/utils/id";
import { pageBounds, toPaged, type Paged } from "./paging";

export type MediaFilter = "pending" | "approved" | "rejected" | "all";

export const ADMIN_MEDIA_PAGE_SIZE = 48;

/**
 * Bentuk kartu moderasi untuk klien: IP mentah tidak ikut terserialisasi dan
 * seluruh item carousel (sampul + slide) memakai URL yang bisa dibuka — signed
 * URL inbox privat bila pin belum disetujui — agar moderator melihat semuanya.
 */
export type AdminMediaItem = Omit<MediaRow, "ip_address"> & {
  slides: MediaSlide[];
  has_ip: boolean;
};

/** Slide per pin untuk satu halaman moderasi. Gagal baca = halaman gagal (fail-closed). */
type AdminSlideRow = MediaSlide & Pick<MediaSlideRow, "media_id" | "position">;

async function getAdminSlides(
  mediaIds: readonly string[],
): Promise<Map<string, AdminSlideRow[]>> {
  const bySlide = new Map<string, AdminSlideRow[]>();
  if (mediaIds.length === 0) return bySlide;
  const { data, error } = await createAdminSupabase()
    .from("media_slides")
    .select(PUBLIC_MEDIA_SLIDE_COLUMNS)
    .in("media_id", [...mediaIds]);
  if (error) {
    if (isSchemaOutdatedError(error)) return bySlide;
    throw new Error(`[admin:media-slides] ${error.code ?? ""} ${error.message}`.trim());
  }
  for (const row of data) {
    bySlide.set(row.media_id, [...(bySlide.get(row.media_id) ?? []), row]);
  }
  return bySlide;
}

/** Kolom detail yang dapat diubah di halaman "Edit postingan". */
const EDITABLE_MEDIA_COLUMNS =
  "id, title, caption, category, uploader_name, allow_comments, album_id, is_pinned, status, source, created_at, type, url, mime_type, thumbnail_url, width, height" as const;

/** Data halaman "Edit postingan": seluruh detail pin + seluruh item berurutan. */
export type AdminEditableMedia = Pick<
  MediaRow,
  | "id"
  | "title"
  | "caption"
  | "category"
  | "uploader_name"
  | "allow_comments"
  | "album_id"
  | "is_pinned"
  | "status"
  | "source"
  | "created_at"
> & {
  items: StoredMediaSource[];
};

/** Media untuk moderasi profil admin, berhalaman (semua kolom, service role). */
export async function getAdminMedia(
  filter: MediaFilter = "all",
  page = 1,
): Promise<Paged<AdminMediaItem>> {
  const sb = createAdminSupabase();
  const { from, to } = pageBounds(page, ADMIN_MEDIA_PAGE_SIZE);
  let q = sb
    .from("media")
    .select("*", { count: "exact" })
    .order("created_at", { ascending: false })
    .range(from, to);
  if (filter !== "all") q = q.eq("status", filter);
  const { data, count } = await q;
  const rows = data ?? [];
  const slidesByMedia = await getAdminSlides(rows.map((row) => row.id));
  const withSlides = rows.map((row) => ({
    row,
    slides: composeMediaSlides(row, slidesByMedia.get(row.id) ?? []),
  }));
  const readable = await readableMediaUrls(
    withSlides.flatMap(({ row, slides }) =>
      slides.map((slide) => ({ url: slide.url, status: row.status })),
    ),
  );
  return toPaged(
    withSlides.map(({ row: { ip_address, ...row }, slides }) => ({
      ...row,
      slides: slides.map((slide) => ({
        ...slide,
        url: readable.get(slide.url) ?? slide.url,
      })),
      has_ip: Boolean(ip_address),
    })),
    count,
    page,
    ADMIN_MEDIA_PAGE_SIZE,
  );
}

/** Jumlah per status untuk label tab moderasi. */
export async function getMediaStatusCounts(): Promise<Record<MediaFilter, number>> {
  const sb = createAdminSupabase();
  const head = { count: "exact" as const, head: true };
  const byStatus = async (status?: MediaStatus) => {
    const query = sb.from("media").select("id", head);
    const { count } = await (status ? query.eq("status", status) : query);
    return count ?? 0;
  };
  const [pending, approved, rejected, all] = await Promise.all([
    byStatus("pending"),
    byStatus("approved"),
    byStatus("rejected"),
    byStatus(),
  ]);
  return { pending, approved, rejected, all };
}

/**
 * Ambil satu pin beserta detail dan SELURUH itemnya (sampul + slide) untuk
 * "Edit postingan". `url` tetap kanonis (identitas saat disimpan); `readUrl`
 * bisa dibuka editor (signed bila objek masih di inbox privat). Slide yang
 * gagal dibaca membuat halaman gagal: editor tidak boleh menyimpan susunan
 * yang tidak lengkap.
 */
export async function getAdminEditableMedia(
  id: string,
): Promise<AdminEditableMedia | null> {
  // Segmen URL bebas: tolak sebelum Postgres melempar 22P02 ke log.
  if (!isUuid(id)) return null;
  const { data, error } = await createAdminSupabase()
    .from("media")
    .select(EDITABLE_MEDIA_COLUMNS)
    .eq("id", id)
    .maybeSingle();

  if (error) {
    console.error("[admin:media-edit] gagal membaca media", {
      code: error.code,
      message: error.message,
    });
    return null;
  }
  if (!data) return null;
  const slides = composeMediaSlides(data, (await getAdminSlides([id])).get(id) ?? []);
  const readable = await readableMediaUrls(
    slides.map((slide) => ({ url: slide.url, status: data.status })),
  );
  return {
    id: data.id,
    title: data.title,
    caption: data.caption,
    category: data.category,
    uploader_name: data.uploader_name,
    allow_comments: data.allow_comments,
    album_id: data.album_id,
    is_pinned: data.is_pinned,
    status: data.status,
    source: data.source,
    created_at: data.created_at,
    items: slides.map((slide) => ({
      url: slide.url,
      readUrl: readable.get(slide.url) ?? slide.url,
      type: slide.type,
      mimeType: slide.mime_type,
      thumbnailUrl: slide.thumbnail_url,
      width: slide.width,
      height: slide.height,
    })),
  };
}
