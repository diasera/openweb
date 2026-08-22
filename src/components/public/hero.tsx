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
 * Hero intrinsik tanpa crop. Judul, subjudul, dan badge selalu menumpuk di
 * atas gambar (bermanding gradasi gelap) di semua ukuran layar; tier panorama
 * mengecilkan teks agar tidak memenuhi foto yang sangat lonjong.
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
  // Tier lebar mengikuti kolom PageShell: <lg padding 1rem/sisi, md tutup
  // max-w-4xl, lg max-w-5xl + padding 1.5rem.
  const sizes =
    "(max-width: 1023px) min(calc(100vw - 2rem), 896px), 976px";
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

        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/70 via-black/15 to-black/5" />
      </div>

      {badge && (
        <div
          className={cn(
            "absolute left-4 top-4 w-fit max-w-[calc(100%_-_2rem)]",
            extremePanorama && "left-3 top-3",
          )}
        >
          <Chip
            variant="glass"
            className={cn(
              "max-w-full truncate",
              compactPanorama && "px-3 py-1 text-xs",
              ultraWidePanorama && "text-[10px]",
              extremePanorama && "px-2 py-0.5 text-[11px]",
            )}
          >
            {badge}
          </Chip>
        </div>
      )}

      <div
        data-hero-copy
        className={cn(
          "absolute inset-x-4 bottom-4 text-white",
          extremePanorama && "inset-x-3 bottom-3",
        )}
      >
        {/* Judul hero = chip identitas yang dipindahkan ke overlay bawah;
            tetap H1 demi SEO, material kacanya dari Chip (dipakai ulang). */}
        <h1 className="w-fit max-w-full drop-shadow-sm">
          <Chip
            variant="glass"
            className={cn(
              "max-w-full truncate font-display text-sm font-bold leading-tight sm:text-base",
              compactPanorama && "text-xs",
              ultraWidePanorama && "text-[11px]",
              extremePanorama && "px-2.5 py-0.5 text-[10px]",
            )}
          >
            {title}
          </Chip>
        </h1>
        {subtitle && (
          <p
            className={cn(
              "mt-1 max-w-md text-sm text-white/85 drop-shadow-sm [overflow-wrap:anywhere]",
              compactPanorama && "line-clamp-1 leading-tight",
              ultraWidePanorama && "line-clamp-1 text-xs",
              extremePanorama && "mt-0.5 line-clamp-1 text-[10px] leading-tight",
            )}
          >
            {subtitle}
          </p>
        )}
      </div>
    </section>
  );
}
