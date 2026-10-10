import type { SiteSettingsRow } from "@/lib/types/database";

export type HeroSettings = Pick<
  SiteSettingsRow,
  "site_name" | "hero_badge" | "hero_title" | "hero_subtitle" | "hero_show_title"
>;

export interface HeroContent {
  /** Judul yang tampil di atas foto; null = admin menyembunyikannya. */
  title: string | null;
  /** Teks h1 halaman depan. Selalu terisi agar mesin pencari punya judul utama. */
  headline: string;
  subtitle: string | null;
  badge: string | null;
}

function comparable(value: string) {
  return value.replace(/\s+/g, " ").trim().toLocaleLowerCase();
}

/** Teks yang berisi minimal satu huruf/angka (bukan sekadar "." atau "-"). */
export function hasReadableText(value: string | null | undefined): value is string {
  return Boolean(value && /[\p{L}\p{N}]/u.test(value));
}

/**
 * Teks hero beranda bersumber HANYA dari tab Beranda. Judul kosong memakai
 * Nama website; judul yang hanya simbol (cara lama menyembunyikan judul,
 * mis. ".") diperlakukan sama dengan sakelar "Tampilkan judul" mati. Nama
 * alternatif tidak pernah dipakai di sini (khusus mesin pencari). Dipakai
 * halaman depan dan pratinjau admin.
 */
export function resolveHeroContent(settings: HeroSettings): HeroContent {
  const rawTitle = settings.hero_title?.trim() ?? "";
  const legacyHidden = rawTitle.length > 0 && !hasReadableText(rawTitle);
  const showTitle = settings.hero_show_title !== false && !legacyHidden;
  const headline = hasReadableText(rawTitle) ? rawTitle : settings.site_name;
  const badge = settings.hero_badge?.trim() || null;
  const subtitle = settings.hero_subtitle?.trim() || null;
  return {
    title: showTitle ? headline : null,
    headline,
    subtitle: hasReadableText(subtitle) ? subtitle : null,
    // Label yang identik dengan judul hanya membuat teks tampil ganda.
    badge:
      hasReadableText(badge) && comparable(badge) !== comparable(headline)
        ? badge
        : null,
  };
}
