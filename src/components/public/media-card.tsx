import Image from "next/image";
import { Play } from "lucide-react";
import { MotionLink } from "@/components/motion";
import {
  MEDIA_ASPECT_LIMITS,
  mediaDisplayAspectRatio,
} from "@/lib/media/display";
import { gradientCss } from "@/lib/utils/color";
import { timeAgo } from "@/lib/utils/time";
import type { MediaRow } from "@/lib/types/database";

/**
 * Kartu media untuk masonry. Tinggi mengikuti rasio asli (efek Pinterest).
 * `showMeta` (Galeri) menampilkan judul + "uploader · waktu" DI BAWAH gambar;
 * tanpa showMeta (Sorotan beranda) gambar diberi overlay gradient halus supaya
 * caption (bila ada) tetap terbaca di atas foto, ala Pinterest.
 */
export function MediaCard({
  media,
  showMeta,
}: {
  media: MediaRow;
  showMeta?: boolean;
}) {
  const ratio = mediaDisplayAspectRatio(
    media.width,
    media.height,
    3 / 4,
    MEDIA_ASPECT_LIMITS.card,
  );
  const overlayCaption = !showMeta ? media.caption : null;
  const previewUrl =
    media.type === "video" ? media.thumbnail_url : media.url;

  return (
    <MotionLink
      href={`/pin/${media.id}`}
      prefetch={false}
      className="group block"
    >
      <div
        className="motion-card bg-surface-2 shadow-soft relative overflow-hidden rounded-card"
        style={{ aspectRatio: ratio }}
      >
        {previewUrl ? (
          <Image
            src={previewUrl}
            alt={media.title ?? media.caption ?? "Media"}
            fill
            sizes="(max-width: 672px) 50vw, 224px"
            className="motion-media-image object-cover"
          />
        ) : (
          <div
            className="absolute inset-0"
            style={{ background: gradientCss(media.id) }}
          />
        )}

        {media.type === "video" && (
          <span className="glass-panel absolute left-1/2 top-1/2 grid h-11 w-11 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full">
            <Play className="h-5 w-5 fill-current" />
          </span>
        )}

        {overlayCaption && (
          <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent p-2.5 pt-6">
            <p className="line-clamp-2 text-[12px] font-medium leading-snug text-white">
              {overlayCaption}
            </p>
          </div>
        )}
      </div>

      {showMeta && (
        <div className="px-0.5 pb-1 pt-1.5">
          <p className="line-clamp-1 text-sm font-semibold">
            {media.title || media.caption || "Tanpa judul"}
          </p>
          <p className="text-muted text-xs">
            {media.uploader_name || "Anonim"} · {timeAgo(media.created_at)}
          </p>
        </div>
      )}
    </MotionLink>
  );
}
