import type { MediaRow, MediaSlideRow } from "@/lib/types/database";

/**
 * Satu item carousel yang dirender. Sampul (baris `media`) dan slide
 * (`media_slides`) berbagi bentuk ini sehingga kartu, detail pin, dan
 * moderasi memakai satu renderer.
 */
export type MediaSlide = Pick<
  MediaSlideRow,
  "id" | "type" | "url" | "mime_type" | "width" | "height"
>;

/** Kolom slide yang boleh dibaca anon (sinkron dengan grant di schema.sql). */
export const PUBLIC_MEDIA_SLIDE_COLUMNS =
  "id, media_id, position, type, url, mime_type, width, height" as const;

/** Daftar/kartu cukup tahu jumlah item untuk badge carousel. */
export type MediaWithSlideCount = MediaRow & { slide_count?: number };

function coverSlide(
  media: Pick<MediaRow, keyof MediaSlide>,
): MediaSlide {
  return {
    id: media.id,
    type: media.type,
    url: media.url,
    mime_type: media.mime_type,
    width: media.width,
    height: media.height,
  };
}

/** Urutan tampil carousel: sampul, lalu slide menurut posisi. */
export function composeMediaSlides(
  media: Pick<MediaRow, keyof MediaSlide>,
  slides: ReadonlyArray<MediaSlide & Pick<MediaSlideRow, "position">>,
): MediaSlide[] {
  return [
    coverSlide(media),
    ...[...slides]
      .sort((a, b) => a.position - b.position)
      .map((slide) => coverSlide(slide)),
  ];
}

/**
 * Item yang sudah tersimpan di sebuah pin, untuk editor "Edit postingan" admin.
 * `url` kanonis menjadi identitas item saat susunan disimpan; `readUrl` yang
 * dibuka browser (signed URL inbox bila pin belum terbit).
 */
export interface StoredMediaSource {
  url: string;
  readUrl: string;
  type: MediaSlide["type"];
  mimeType: string | null;
  width: number | null;
  height: number | null;
}

/** Gambar diam yang mewakili slide (hanya untuk foto). */
export function slidePreviewUrl(slide: Pick<MediaSlide, "type" | "url">) {
  return slide.type === "video" ? null : slide.url || null;
}
