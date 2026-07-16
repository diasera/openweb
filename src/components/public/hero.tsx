import Image from "next/image";
import { Chip } from "@/components/ui/chip";
import { UPLOAD_LIMITS } from "@/lib/constants";
import { normalizeMediaDimensions } from "@/lib/media/display";
import { cn } from "@/lib/utils/cn";

export interface HeroProps {
  title: string;
  subtitle?: string | null;
  imageUrl?: string | null;
  imageWidth?: number | null;
  imageHeight?: number | null;
  badge?: string | null;
}

/**
 * Hero intrinsik tanpa crop.
 *
 * Desktop mempertahankan komposisi overlay. Pada layar kecil, informasi
 * mengalir setelah media agar judul, subjudul, dan badge tidak menutupi wajah
 * pada foto portrait, panorama, maupun rasio ekstrem.
 */
export function Hero({
  title,
  subtitle,
  imageUrl,
  imageWidth,
  imageHeight,
  badge,
}: HeroProps) {
  const dimensions = normalizeMediaDimensions(
    imageWidth,
    imageHeight,
    UPLOAD_LIMITS.mediaMaxDimension,
  );
  const sizes =
    "(max-width: 671px) calc(100vw - 2rem), (max-width: 1023px) 640px, 976px";
  const imageRatio = dimensions
    ? dimensions.width / dimensions.height
    : null;
  const compactPanorama = Boolean(
    imageRatio && imageRatio >= 2.5,
  );
  const ultraWidePanorama = Boolean(imageRatio && imageRatio >= 4);
  const extremePanorama = Boolean(imageRatio && imageRatio >= 6);

  return (
    <section
      data-site-hero
      className="rounded-ios-lg bg-surface relative w-full overflow-hidden"
    >
      <div
        data-hero-media
        className={cn(
          "bg-surface-2 relative w-full",
          !imageUrl && "aspect-[366/220] sm:aspect-[16/9]",
        )}
      >
        {imageUrl && dimensions ? (
          <Image
            src={imageUrl}
            alt=""
            width={dimensions.width}
            height={dimensions.height}
            preload
            fetchPriority="high"
            sizes={sizes}
            className="block h-auto w-full"
          />
        ) : imageUrl ? (
          // Aset lama belum memiliki metadata. Browser memakai rasio intrinsik
          // tanpa crop; penyimpanan Setting berikutnya akan membackfill ukuran.
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={imageUrl}
            alt=""
            loading="eager"
            decoding="async"
            fetchPriority="high"
            className="block h-auto w-full"
          />
        ) : (
          <div className="liquid-gradient absolute inset-0" />
        )}

        <div className="pointer-events-none absolute inset-0 hidden bg-gradient-to-t from-black/70 via-black/15 to-black/5 sm:block" />
      </div>

      {badge && (
        <div
          className={cn(
            "relative mx-4 mt-4 w-fit max-w-[calc(100%_-_2rem)] sm:absolute sm:left-4 sm:top-4 sm:m-0",
            compactPanorama && "mt-3 sm:left-4 sm:top-4 sm:mt-0",
            ultraWidePanorama && "mt-2.5 sm:left-4 sm:top-4 sm:mt-0",
            extremePanorama && "mt-2 sm:left-3 sm:top-3 sm:mt-0",
          )}
        >
          <Chip
            variant="glass"
            className={cn(
              "max-w-full truncate",
              compactPanorama && "sm:px-3 sm:py-1 sm:text-xs",
              ultraWidePanorama && "sm:text-[10px]",
              extremePanorama && "sm:px-2 sm:py-0.5 sm:text-[11px]",
            )}
          >
            {badge}
          </Chip>
        </div>
      )}

      <div
        data-hero-copy
        className={cn(
          "relative px-4 pb-4 pt-3 text-foreground sm:absolute sm:inset-x-4 sm:bottom-4 sm:p-0 sm:text-white",
          !badge && "pt-4",
          compactPanorama && "sm:inset-x-4 sm:bottom-4",
          ultraWidePanorama && "sm:inset-x-4 sm:bottom-4",
          extremePanorama && "sm:inset-x-3 sm:bottom-3",
        )}
      >
        <h1
          className={cn(
            "font-display text-2xl font-bold leading-tight [overflow-wrap:anywhere] sm:text-3xl sm:drop-shadow-sm",
            compactPanorama && "sm:line-clamp-1 sm:text-2xl",
            ultraWidePanorama && "sm:text-2xl",
            extremePanorama && "sm:text-lg",
          )}
        >
          {title}
        </h1>
        {subtitle && (
          <p
            className={cn(
              "mt-1 max-w-md text-sm text-muted [overflow-wrap:anywhere] sm:text-white/85 sm:drop-shadow-sm",
              compactPanorama && "sm:mt-1 sm:line-clamp-1 sm:text-sm sm:leading-tight",
              ultraWidePanorama && "sm:text-sm",
              extremePanorama &&
                "sm:mt-0.5 sm:line-clamp-1 sm:text-[10px] sm:leading-tight",
            )}
          >
            {subtitle}
          </p>
        )}
      </div>
    </section>
  );
}
