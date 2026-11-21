import { ArrowUpRight, Images } from "lucide-react";
import { MotionLink } from "@/components/motion";
import { MediaPreview } from "@/components/ui/media-preview";
import { formatSiteDate } from "@/lib/utils/time";
import type { AlbumSummaryRow } from "@/lib/types/database";

/**
 * Kartu album bergaya Stacked Folio: 2 lapisan kartu tipis mengintip di atas
 * sampul utama agar langsung terbaca sebagai tumpukan koleksi media.
 */
export function AlbumCard({ album }: { album: AlbumSummaryRow }) {
  const updatedLabel = album.latest_media_at
    ? formatSiteDate(album.latest_media_at, "monthYear")
    : null;

  return (
    <MotionLink href={`/album/${album.slug}`} prefetch={false} className="group block pt-2.5">
      <div className="relative">
        <span
          aria-hidden="true"
          className="border-border/65 bg-surface-2/70 pointer-events-none absolute inset-x-4 -top-2.5 h-4 rounded-t-xl border transition-transform duration-300 group-hover:-translate-y-0.5"
        />
        <span
          aria-hidden="true"
          className="border-border/80 bg-surface-2 pointer-events-none absolute inset-x-2 -top-1.25 h-4 rounded-t-xl border transition-transform duration-300 group-hover:-translate-y-0.25"
        />
        <div
          data-depth-tilt
          className="bg-surface-2 shadow-soft relative aspect-[4/3] overflow-hidden rounded-pin ring-1 ring-inset ring-black/8 dark:ring-white/12"
        >
          <MediaPreview
            media={{
              type: album.cover_type ?? "photo",
              url: album.cover_url ?? "",
            }}
            alt=""
            sizes="(max-width: 768px) 50vw, 320px"
            seed={album.id}
            className="motion-media-image"
          />
          <span className="media-tint" aria-hidden="true" />
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-0 bottom-0 h-1/2 bg-linear-to-t from-black/45 to-transparent"
          />
          <span className="media-badge absolute bottom-2 left-2 inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-caption2 font-semibold tabular-nums">
            <Images className="h-3.5 w-3.5" aria-hidden="true" /> {album.media_count}
            <span className="sr-only">media</span>
          </span>
          <span
            aria-hidden="true"
            className="media-badge pointer-events-none absolute right-2 top-2 hidden size-7 place-items-center rounded-full opacity-0 transition-opacity duration-250 group-hover:opacity-100 pointer-fine:grid"
          >
            <ArrowUpRight className="size-3.5" />
          </span>
        </div>
      </div>

      <div className="mt-2.5 px-1">
        <p className="font-display group-hover:text-primary-readable line-clamp-1 text-subhead font-bold leading-snug transition-colors">
          {album.title}
        </p>
        {(album.description || updatedLabel) && (
          <p className="text-muted mt-0.5 line-clamp-1 text-caption1">
            {album.description || updatedLabel}
          </p>
        )}
      </div>
    </MotionLink>
  );
}
