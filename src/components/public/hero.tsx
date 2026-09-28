import Image from "next/image";
import { UPLOAD_LIMITS } from "@/lib/constants";
import { normalizeMediaDimensions } from "@/lib/media/display";
import { cn } from "@/lib/utils/cn";
import styles from "./hero.module.css";

export interface HeroProps {
  title: string;
  subtitle?: string | null;
  imageUrl?: string | null;
  imageWidth?: number | null;
  imageHeight?: number | null;
  badge?: string | null;
  /** Gambar LCP halaman depan; pratinjau admin mematikannya. */
  priority?: boolean;
  /** Kedalaman berbasis scroll; pratinjau admin diam mengikuti scroll form. */
  scrollMotion?: boolean;
}

/**
 * Hero intrinsik tanpa crop dengan tipografi kartu "Today" App Store:
 * eyebrow (badge), judul besar, dan subjudul menumpuk di atas scrim gelap.
 * Lapisan media, orb, dan teks berada di kedalaman berbeda (hero.module.css):
 * kursor memiringkan kartu, scroll membuat hero mundur. Tanpa foto, hero
 * memakai mesh aurora yang bergerak pelan. Tier panorama mengecilkan teks
 * agar tidak memenuhi foto yang sangat lonjong. Isi teks disusun
 * resolveHeroContent (site-config), bukan di komponen ini. Aturan responsif
 * memakai container query (lebar hero sendiri), sehingga pratinjau admin
 * yang sempit tampil sama dengan layar ponsel.
 */
export function Hero({
  title,
  subtitle,
  imageUrl,
  imageWidth,
  imageHeight,
  badge,
  priority = true,
  scrollMotion = true,
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
      className={cn(
        "@container relative w-full",
        styles.stage,
        scrollMotion && styles.scrollDepth,
      )}
    >
      <div
        data-depth-tilt
        className={cn(
          styles.card,
          "rounded-ios-lg bg-surface shadow-elevated relative w-full overflow-hidden",
        )}
      >
        <div
          data-hero-media
          className={cn(
            styles.media,
            "bg-surface-2 relative w-full",
            // 38rem = lebar hero saat viewport 640px (breakpoint sm lama). Layar
            // lebar tanpa foto dibuat sinematik agar tidak memenuhi satu layar.
            !imageUrl && "aspect-366/250 @min-[38rem]:aspect-2/1 @min-[56rem]:aspect-5/2",
          )}
        >
          {imageUrl && dimensions ? (
            <Image
              src={imageUrl}
              alt=""
              width={dimensions.width}
              height={dimensions.height}
              preload={priority}
              fetchPriority={priority ? "high" : undefined}
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
              loading={priority ? "eager" : undefined}
              decoding="async"
              fetchPriority={priority ? "high" : undefined}
              className="block h-auto w-full"
            />
          ) : (
            <div className="liquid-gradient grain absolute inset-0 overflow-hidden" aria-hidden="true">
              <span className={styles.blob} />
              <span className={styles.blob} />
            </div>
          )}

          {/* Scrim bawah agar teks putih tetap terbaca di foto terang (WCAG F83). */}
          <div className="pointer-events-none absolute inset-0 bg-linear-to-t from-black/75 via-black/20 to-transparent" />
        </div>

        {!imageUrl && (
          <div className={cn(styles.orbs, "pointer-events-none absolute inset-0")} aria-hidden="true">
            <span className={styles.orb} />
            <span className={styles.orb} />
            <span className={styles.orb} />
          </div>
        )}

        <div
          data-hero-copy
          className={cn(
            styles.copy,
            "text-shadow-sm absolute inset-x-4 bottom-4 text-white",
            !compactPanorama && "@min-[38rem]:inset-x-6 @min-[38rem]:bottom-6",
            extremePanorama && "inset-x-3 bottom-3",
          )}
        >
          {badge && (
            <p
              title={compactPanorama ? badge : undefined}
              className={cn(
                styles.badge,
                "mb-2 inline-block max-w-full truncate rounded-full px-2.5 py-1 text-caption1 font-semibold uppercase tracking-wide text-white/90",
                // Panorama sempit terlalu pendek untuk label + judul + subjudul.
                compactPanorama && "@max-[40rem]:hidden",
                ultraWidePanorama && "text-caption2",
              )}
            >
              {badge}
            </p>
          )}
          <h1
            title={compactPanorama ? title : undefined}
            className={cn(
              "font-display max-w-2xl text-title1 font-bold tracking-tight text-balance wrap-break-word @min-[38rem]:text-large-title @min-[56rem]:text-display",
              // Foto lonjong tidak punya ruang tinggi: satu baris + elipsis.
              compactPanorama && "truncate text-title3 @min-[38rem]:text-title2",
              ultraWidePanorama && "text-headline @min-[38rem]:text-title3",
              extremePanorama && "text-subhead @min-[38rem]:text-headline",
            )}
          >
            {title}
          </h1>
          {subtitle && (
            <p
              className={cn(
                "mt-1.5 max-w-md text-subhead text-white/85 wrap-anywhere",
                compactPanorama && "mt-1 line-clamp-1",
                ultraWidePanorama && "text-footnote",
                extremePanorama && "mt-0.5 text-caption1",
                extremePanorama && "@max-[28rem]:hidden",
              )}
            >
              {subtitle}
            </p>
          )}
        </div>
      </div>
    </section>
  );
}
