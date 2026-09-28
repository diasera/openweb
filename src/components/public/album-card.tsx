import Image from "next/image";
import { Images } from "lucide-react";
import { MotionLink } from "@/components/motion";
import { gradientCss } from "@/lib/utils/color";
import type { AlbumSummaryRow } from "@/lib/types/database";

/** Kartu album: sampul media terbaru + judul + jumlah media. */
export function AlbumCard({ album }: { album: AlbumSummaryRow }) {
  const cover = album.cover_type === "video" ? album.cover_thumbnail_url : album.cover_url;
  return (
    <MotionLink href={`/album/${album.slug}`} prefetch={false} className="group block">
      <div
        data-depth-tilt
        className="bg-surface-2 relative aspect-[4/3] overflow-hidden rounded-pin"
      >
        {cover ? (
          <Image
            src={cover}
            alt=""
            fill
            sizes="(max-width: 768px) 50vw, 320px"
            className="motion-media-image object-cover"
          />
        ) : (
          <div className="absolute inset-0" style={{ background: gradientCss(album.id) }} />
        )}
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
