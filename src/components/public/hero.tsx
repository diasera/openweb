import Image from "next/image";
import { UPLOAD_LIMITS } from "@/lib/constants";
import { normalizeMediaDimensions } from "@/lib/media/display";
import { cn } from "@/lib/utils/cn";
import { KineticWords, blurDelay, wordsDelay } from "@/components/motion";
import styles from "./hero.module.css";

export interface HeroProps {
  /** Judul di atas foto; null = disembunyikan admin (h1 tetap ada, sr-only). */
  title: string | null;
  /** Teks h1. Sama dengan title saat tampil, nama website saat disembunyikan. */
  headline: string;
  subtitle?: string | null;
  imageUrl?: string | null;
  imageWidth?: number | null;
  imageHeight?: number | null;
  badge?: string | null;
  /** Gambar LCP halaman depan; pratinjau admin mematikannya. */
  priority?: boolean;
  /** Kedalaman berbasis scroll; pratinjau admin diam mengikuti scroll form. */
  scrollMotion?: boolean;
  /** Pratinjau admin: h1 menjadi elemen biasa agar halaman admin tidak punya dua h1. */
  headingLevel?: "h1" | "p";
}

/**
 * Hero intrinsik tanpa crop dengan tipografi kartu "Today" App Store:
 * eyebrow (badge), judul besar, dan subjudul menumpuk di atas scrim gelap.
 * Saat dimuat, foto "mengendap" dari zoom tipis (hanya scale — tidak menunda
 * LCP), judul masuk per kata, lalu subjudul menyusul dari blur. Lapisan media,
 * orb, dan teks berada di kedalaman berbeda (hero.module.css): kursor
 * memiringkan kartu, scroll membuat hero mundur. Tanpa foto, hero memakai
 * mesh aurora warna utama + aksen. Isi teks disusun resolveHeroContent
 * (site-config). Aturan responsif memakai container query (lebar hero
 * sendiri), sehingga pratinjau admin yang sempit tampil sama dengan ponsel.
 */
export function Hero({
  title,
  headline,
  subtitle,
  imageUrl,
  imageWidth,
  imageHeight,
  badge,
  priority = true,
  scrollMotion = true,
  headingLevel = "h1",
}: HeroProps) {
  const dimensions = normalizeMediaDimensions(
    imageWidth,
    imageHeight,
    UPLOAD_LIMITS.mediaMaxDimension,
  );
  // Tier lebar mengikuti kolom PageShell: <lg padding 1rem/sisi, md tutup
  // max-w-4xl, lg max-w-5xl + padding 1.5rem.
  const sizes = "(max-width: 1023px) min(calc(100vw - 2rem), 896px), 976px";
  const imageRatio = dimensions ? dimensions.width / dimensions.height : null;
  const compactPanorama = Boolean(imageRatio && imageRatio >= 2.5);
  const ultraWidePanorama = Boolean(imageRatio && imageRatio >= 4);
  const extremePanorama = Boolean(imageRatio && imageRatio >= 6);
  const Heading = headingLevel;
  const hasCopy = Boolean(title || subtitle || badge);
  // Kata judul menunggu badge muncul lebih dulu.
  const titleDelay = badge ? 140 : 0;
  const subtitleDelay = titleDelay + (title ? 260 : 0);

  return (
    <section
      data-site-hero
      aria-label={headingLevel === "h1" ? undefined : "Pratinjau hero"}
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
          "rounded-ios-lg bg-surface shadow-elevated relative w-full overflow-hidden @min-[56rem]:rounded-[2rem]",
        )}
      >
        <div
          data-hero-media
          className={cn(
            styles.media,
            "bg-surface-2 relative w-full",
            // 38rem = lebar hero saat viewport 640px. Layar lebar tanpa foto
            // dibuat sinematik agar tidak memenuhi satu layar.
            !imageUrl && "aspect-366/250 @min-[38rem]:aspect-2/1 @min-[56rem]:aspect-5/2",
          )}
        >
          <div className={cn(styles.settle, !imageUrl && "absolute inset-0")}>
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
              // tanpa crop; penyimpanan Setting berikutnya membackfill ukuran.
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
              <div
                className="liquid-gradient grain absolute inset-0 overflow-hidden"
                aria-hidden="true"
              >
                <span className={styles.blob} />
                <span className={styles.blob} />
                <span className={styles.blob} />
              </div>
            )}
          </div>

          {/* Scrim bawah agar teks putih tetap terbaca di foto terang (WCAG F83).
              Tanpa teks sama sekali, foto tampil polos. */}
          {hasCopy && (
            <div
              className={cn(
                "pointer-events-none absolute inset-0 bg-linear-to-t to-transparent",
                title
                  ? "from-black/75 via-black/20"
                  : "from-black/60 via-black/5 via-35%",
              )}
            />
          )}
        </div>

        {!imageUrl && (
          <div
            className={cn(styles.orbs, "pointer-events-none absolute inset-0")}
            aria-hidden="true"
          >
            <span className={styles.orb} />
            <span className={styles.orb} />
            <span className={styles.orb} />
          </div>
        )}

        {/* Tepi spekular tipis: kartu terasa seperti kaca tebal, bukan foto datar. */}
        <span className={styles.rim} aria-hidden="true" />

        <div
          data-hero-copy
          className={cn(
            styles.copy,
            "text-shadow-sm absolute inset-x-4 bottom-4 text-white",
            !compactPanorama && "@min-[38rem]:inset-x-7 @min-[38rem]:bottom-7",
            extremePanorama && "inset-x-3 bottom-3",
          )}
        >
          {badge && (
            <p
              title={compactPanorama ? badge : undefined}
              className={cn(
                styles.badge,
                "motion-blur-in mb-2.5 inline-flex max-w-full items-center gap-1.5 rounded-full py-1 pl-2 pr-2.5 text-caption1 font-semibold uppercase tracking-wide text-white/95",
                // Panorama sempit terlalu pendek untuk label + judul + subjudul.
                compactPanorama && "@max-[40rem]:hidden",
                ultraWidePanorama && "text-caption2",
              )}
            >
              <span className={styles.badgeDot} aria-hidden="true" />
              <span className="truncate">{badge}</span>
            </p>
          )}
          <Heading
            title={compactPanorama && title ? title : undefined}
            style={wordsDelay(titleDelay)}
            className={cn(
              title
                ? "font-display max-w-2xl text-title1 font-bold tracking-tight text-balance wrap-break-word @min-[38rem]:text-large-title @min-[56rem]:text-display"
                : "sr-only",
              // Foto lonjong tidak punya ruang tinggi: satu baris + elipsis.
              title && compactPanorama && "truncate text-title3 @min-[38rem]:text-title2",
              title && ultraWidePanorama && "text-headline @min-[38rem]:text-title3",
              title && extremePanorama && "text-subhead @min-[38rem]:text-headline",
            )}
          >
            {title && !compactPanorama ? <KineticWords text={headline} /> : headline}
          </Heading>
          {subtitle && (
            <p
              style={blurDelay(subtitleDelay)}
              className={cn(
                "motion-blur-in max-w-md text-subhead text-white/88 wrap-anywhere @min-[56rem]:text-callout",
                title ? "mt-2" : "mt-0",
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
