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
          prefetch={false}
          className="group animate-rise motion-pressable relative aspect-3/4 w-32 shrink-0 overflow-hidden rounded-pin sm:w-40"
          style={{ animationDelay: staggerDelay(index, 50) }}
        >
          <MediaPreview
            media={item}
            alt={item.title ?? item.caption ?? "Kenangan"}
            sizes="160px"
            seed={item.id}
            className="motion-media-image"
          />
          <span className="media-tint" aria-hidden="true" />
          <MediaBadges type={item.type} slideCount={item.slide_count} />
          <div className="absolute inset-x-0 bottom-0 bg-linear-to-t from-black/75 to-transparent p-2.5 pt-10">
            <p className="text-caption2 font-semibold uppercase tracking-wide text-white/85">
              {yearsAgoLabel(item.created_at)}
            </p>
            {item.title && (
              <p className="line-clamp-1 text-footnote font-semibold text-white">{item.title}</p>
            )}
          </div>
        </MotionLink>
      ))}
    </div>
  );
}
