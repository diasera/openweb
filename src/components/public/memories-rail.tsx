import { MotionLink, staggerDelay } from "@/components/motion";
import { MediaPreview } from "@/components/ui/media-preview";
import { zonedParts } from "@/lib/utils/time";
import type { MediaWithSlideCount } from "@/lib/media/slides";
import { MediaBadges } from "./media-badges";

function yearsAgoLabel(iso: string): string {
  const years = zonedParts(new Date()).year - zonedParts(new Date(iso)).year;
  return years <= 1 ? "1 tahun lalu" : `${years} tahun lalu`;
}

/**
 * "Kenangan hari ini": rail horizontal media pada tanggal yang sama tahun-tahun
 * lalu. Kartu 3:4 bertepi pudar, foto memperbesar pelan saat hover.
 */
export function MemoriesRail({ media }: { media: MediaWithSlideCount[] }) {
  return (
    <div className="motion-horizontal-scroll no-scrollbar edge-fade-x -mx-4 flex scroll-px-4 gap-3 overflow-x-auto px-4 pb-1 lg:-mx-6 lg:scroll-px-6 lg:px-6">
      {media.map((item, index) => (
        <MotionLink
          key={item.id}
          href={`/pin/${item.id}`}
          className="group animate-rise motion-pressable relative aspect-3/4 w-38 shrink-0 overflow-hidden rounded-pin ring-1 ring-inset ring-black/8 dark:ring-white/12 sm:w-46"
          style={{ animationDelay: staggerDelay(index, 50) }}
        >
          <MediaPreview
            media={item}
            alt={item.title ?? item.caption ?? "Kenangan"}
            sizes="184px"
            seed={item.id}
            className="motion-media-image"
          />
          <span className="media-tint" aria-hidden="true" />
          <span className="media-badge absolute left-2.5 top-2.5 rounded-full px-2.5 py-0.5 text-caption2 font-semibold tracking-wide">
            {yearsAgoLabel(item.created_at)}
          </span>
          <MediaBadges type={item.type} slideCount={item.slide_count} />
          {item.title && (
            <div className="absolute inset-x-0 bottom-0 bg-linear-to-t from-black/82 via-black/35 to-transparent p-3 pt-12">
              <p className="font-display line-clamp-2 text-subhead font-bold leading-snug text-white">
                {item.title}
              </p>
            </div>
          )}
        </MotionLink>
      ))}
    </div>
  );
}
