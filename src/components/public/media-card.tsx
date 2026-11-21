import { ArrowUpRight } from "lucide-react";
import { MotionLink, SharedMorph } from "@/components/motion";
import {
  MEDIA_ASPECT_LIMITS,
  mediaDisplayAspectRatio,
} from "@/lib/media/display";
import { MediaPreview } from "@/components/ui/media-preview";
import { RelativeTime } from "@/components/ui/relative-time";
import type { MediaWithSlideCount } from "@/lib/media/slides";
import { MediaBadges } from "./media-badges";

/**
 * Kartu media untuk masonry dengan anatomi pin Pinterest Editorial: tinggi
 * mengikuti rasio asli, bingkai konsentris halus, tilt 3D + pantulan cahaya,
 * serta *hover glass overlay* halus khusus pointer desktop (chip kategori +
 * ikon buka) tanpa mengganggu sentuhan di ponsel.
 */
export function MediaCard({
  media,
  showMeta,
  enableMorph = true,
}: {
  media: MediaWithSlideCount;
  showMeta?: boolean;
  enableMorph?: boolean;
}) {
  const ratio = mediaDisplayAspectRatio(
    media.width,
    media.height,
    3 / 4,
    MEDIA_ASPECT_LIMITS.card,
  );
  const overlayCaption = !showMeta ? media.caption : null;

  return (
    <MotionLink href={`/pin/${media.id}`} className="group block">
      <SharedMorph name={`pin-${media.id}`} enabled={enableMorph}>
        <div
          data-depth-tilt
          className="bg-surface-2 relative overflow-hidden rounded-pin ring-1 ring-inset ring-black/6 dark:ring-white/10"
          style={{ aspectRatio: ratio }}
        >
          <MediaPreview
            media={media}
            alt={media.title ?? media.caption ?? "Media"}
            // Lebar kolom nyata Masonry: 2 kolom <768px, 3 kolom di max-w-4xl, 4 kolom di max-w-5xl.
            sizes="(max-width: 767px) 50vw, (max-width: 1023px) 288px, 240px"
            seed={media.id}
            className="motion-media-image"
          />
          <span className="media-tint" aria-hidden="true" />

          <MediaBadges type={media.type} slideCount={media.slide_count} />

          {overlayCaption && (
            <div className="absolute inset-x-0 bottom-0 bg-linear-to-t from-black/76 via-black/22 to-transparent p-2.5 pt-9">
              <p className="line-clamp-2 text-caption1 font-medium text-white">
                {overlayCaption}
              </p>
            </div>
          )}

          {/* Hover glass overlay khusus desktop pointer halus (tanpa ganggu ponsel) */}
          <div
            aria-hidden="true"
            className={
              overlayCaption
                ? "pointer-events-none absolute right-2.5 top-2.5 hidden opacity-0 transition-opacity duration-250 group-hover:opacity-100 pointer-fine:flex"
                : "pointer-events-none absolute inset-x-0 bottom-0 hidden items-end justify-between gap-2 bg-linear-to-t from-black/62 via-black/16 to-transparent p-2.5 pt-8 opacity-0 transition-opacity duration-250 group-hover:opacity-100 pointer-fine:flex"
            }
          >
            {!overlayCaption &&
              (media.category ? (
                <span className="media-badge max-w-[75%] truncate rounded-full px-2.5 py-0.5 text-[0.68rem] font-semibold">
                  {media.category}
                </span>
              ) : (
                <span />
              ))}
            <span className="media-badge grid size-7 shrink-0 place-items-center rounded-full">
              <ArrowUpRight className="size-3.5" />
            </span>
          </div>
        </div>
      </SharedMorph>

      {showMeta && (
        <div className="px-1 pb-1 pt-2">
          <p className="font-display group-hover:text-primary-readable line-clamp-1 text-footnote font-semibold transition-colors">
            {media.title || media.caption || "Tanpa judul"}
          </p>
          <p className="text-muted text-caption2">
            {media.uploader_name || "Anonim"} ·{" "}
            <RelativeTime iso={media.created_at} />
          </p>
        </div>
      )}
    </MotionLink>
  );
}
