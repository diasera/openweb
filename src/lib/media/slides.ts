import type { MediaRow, MediaSlideRow } from "@/lib/types/database";

/**
 * Satu item carousel yang dirender. Sampul (baris `media`) dan slide
 * (`media_slides`) berbagi bentuk ini sehingga kartu, detail pin, dan
 * moderasi memakai satu renderer.
 */
export type MediaSlide = Pick<
  MediaSlideRow,
  "id" | "type" | "url" | "mime_type" | "thumbnail_url" | "width" | "height"
>;

/** Kolom slide yang boleh dibaca anon (sinkron dengan grant di schema.sql). */
export const PUBLIC_MEDIA_SLIDE_COLUMNS =
  "id, media_id, position, type, url, mime_type, thumbnail_url, width, height" as const;

/** Daftar/kartu cukup tahu jumlah item untuk badge carousel. */
export type MediaWithSlideCount = MediaRow & { slide_count?: number };

export function coverSlide(
  media: Pick<MediaRow, keyof MediaSlide>,
): MediaSlide {
  return {
    id: media.id,
    type: media.type,
    url: media.url,
    mime_type: media.mime_type,
    thumbnail_url: media.thumbnail_url,
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

/** Gambar diam yang mewakili slide (poster untuk video). */
export function slidePreviewUrl(slide: Pick<MediaSlide, "type" | "url" | "thumbnail_url">) {
  return slide.type === "video" ? slide.thumbnail_url : slide.url;
}
