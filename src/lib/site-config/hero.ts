import type { SiteSettingsRow } from "@/lib/types/database";

export type HeroSettings = Pick<
  SiteSettingsRow,
  "site_name" | "hero_badge" | "hero_title" | "hero_subtitle"
>;

export interface HeroContent {
  title: string;
  subtitle: string | null;
  badge: string | null;
}

function comparable(value: string) {
  return value.replace(/\s+/g, " ").trim().toLocaleLowerCase();
}

/**
 * Teks hero beranda bersumber HANYA dari tab Beranda. Satu-satunya fallback:
 * judul kosong memakai Nama website. Nama alternatif tidak pernah dipakai di
 * sini (khusus mesin pencari). Dipakai halaman depan dan pratinjau admin.
 */
export function resolveHeroContent(settings: HeroSettings): HeroContent {
  const title = settings.hero_title?.trim() || settings.site_name;
  const badge = settings.hero_badge?.trim() || null;
  return {
    title,
    subtitle: settings.hero_subtitle?.trim() || null,
    // Label yang identik dengan judul hanya membuat teks tampil ganda.
    badge: badge && comparable(badge) !== comparable(title) ? badge : null,
  };
}
