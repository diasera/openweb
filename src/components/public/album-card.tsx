import { Images } from "lucide-react";
import { MotionLink } from "@/components/motion";
import { MediaPreview } from "@/components/ui/media-preview";
import type { AlbumSummaryRow } from "@/lib/types/database";

/** Kartu album: sampul media terbaru + judul + jumlah media. */
export function AlbumCard({ album }: { album: AlbumSummaryRow }) {
  return (
    <MotionLink href={`/album/${album.slug}`} prefetch={false} className="group block">
      <div
        data-depth-tilt
        className="bg-surface-2 relative aspect-[4/3] overflow-hidden rounded-pin"
      >
        <MediaPreview
          media={{
            type: album.cover_type ?? "photo",
            url: album.cover_url ?? "",
            thumbnail_url: album.cover_thumbnail_url,
          }}
          alt=""
          sizes="(max-width: 768px) 50vw, 320px"
          seed={album.id}
          className="motion-media-image"
        />
        <span className="media-tint" aria-hidden="true" />
        <span className="media-badge absolute bottom-2 left-2 inline-flex items-center gap-1 rounded-full px-2 py-1 text-caption2 font-semibold">
          <Images className="h-3.5 w-3.5" aria-hidden="true" /> {album.media_count}
          <span className="sr-only">media</span>
        </span>
      </div>
      <p className="mt-2 line-clamp-1 px-1 text-footnote font-semibold">{album.title}</p>
      {album.description && (
        <p className="text-muted line-clamp-1 px-1 text-caption1">{album.description}</p>
      )}
    </MotionLink>
  );
}
