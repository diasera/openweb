import { GalleryHorizontalEnd, Play } from "lucide-react";
import type { MediaType } from "@/lib/types/database";

/**
 * Badge di atas pratinjau pin: video di kiri, jumlah item carousel di kanan
 * (pola Instagram). Dipakai kartu galeri dan rail Kenangan agar markupnya
 * tidak ditulis ulang.
 */
export function MediaBadges({
  type,
  slideCount = 1,
}: {
  type: MediaType;
  slideCount?: number;
}) {
  return (
    <>
      {type === "video" && (
        <span className="media-badge absolute left-2 top-2 grid size-7 place-items-center rounded-full">
          <Play className="size-3.5 fill-current" aria-hidden="true" />
          <span className="sr-only">Video</span>
        </span>
      )}
      {slideCount > 1 && (
        <span className="media-badge absolute right-2 top-2 flex h-7 items-center gap-1 rounded-full px-2 text-caption1 font-semibold tabular-nums">
          <GalleryHorizontalEnd className="size-3.5" aria-hidden="true" />
          {slideCount}
          <span className="sr-only"> item</span>
        </span>
      )}
    </>
  );
}
