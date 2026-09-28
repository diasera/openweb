import Image from "next/image";
import { MotionLink } from "@/components/motion";
import {
  MEDIA_ASPECT_LIMITS,
  mediaDisplayAspectRatio,
} from "@/lib/media/display";
import { gradientCss } from "@/lib/utils/color";
import { timeAgo } from "@/lib/utils/time";
import { slidePreviewUrl, type MediaWithSlideCount } from "@/lib/media/slides";
import { MediaBadges } from "./media-badges";

/**
 * Kartu media untuk masonry dengan anatomi pin Pinterest: tinggi mengikuti
 * rasio asli, radius 16px, tanpa bayangan, tint tipis, tilt 3D + pantulan
 * cahaya mengikuti kursor, dan tekan-dalam 0.96 saat disentuh.
 * `showMeta` (Galeri) menampilkan judul + "uploader · waktu" DI BAWAH gambar;
 * tanpa showMeta (Sorotan beranda) caption menumpuk di atas gradasi gelap.
 * Pin carousel menampilkan badge jumlah item seperti Instagram.
 */
export function MediaCard({
  media,
  showMeta,
}: {
  media: MediaWithSlideCount;
  showMeta?: boolean;
}) {
  const ratio = mediaDisplayAspectRatio(
    media.width,
    media.height,
    3 / 4,
    MEDIA_ASPECT_LIMITS.card,
  );
  const overlayCaption = !showMeta ? media.caption : null;
  const previewUrl = slidePreviewUrl(media);

  return (
    <MotionLink
      href={`/pin/${media.id}`}
      prefetch={false}
      className="group block"
    >
      <div
        data-depth-tilt
        className="bg-surface-2 relative overflow-hidden rounded-pin"
        style={{ aspectRatio: ratio, viewTransitionName: `pin-${media.id}` }}
      >
        {previewUrl ? (
          <Image
            src={previewUrl}
            alt={media.title ?? media.caption ?? "Media"}
            fill
            // Lebar kolom nyata Masonry: 2 kolom <768px, 3 kolom di max-w-4xl, 4 kolom di max-w-5xl.
            sizes="(max-width: 767px) 50vw, (max-width: 1023px) 288px, 240px"
            className="motion-media-image object-cover"
          />
        ) : (
          <div
            className="absolute inset-0"
            style={{ background: gradientCss(media.id) }}
          />
        )}
        <span className="media-tint" aria-hidden="true" />

        <MediaBadges type={media.type} slideCount={media.slide_count} />

        {overlayCaption && (
          <div className="absolute inset-x-0 bottom-0 bg-linear-to-t from-black/70 via-black/10 to-transparent p-2.5 pt-6">
            <p className="line-clamp-2 text-caption1 font-medium text-white">
              {overlayCaption}
            </p>
          </div>
        )}
      </div>

      {showMeta && (
        <div className="px-1 pb-1 pt-2">
          <p className="line-clamp-1 text-footnote font-semibold">
            {media.title || media.caption || "Tanpa judul"}
          </p>
          <p className="text-muted text-caption1">
            {media.uploader_name || "Anonim"} · {timeAgo(media.created_at)}
          </p>
        </div>
      )}
    </MotionLink>
  );
}
