import type { SiteType } from "@/lib/types/database";

export const SITE_TYPE_OPTIONS: ReadonlyArray<{
  value: SiteType;
  label: string;
}> = [
  { value: "class", label: "Kelas" },
  { value: "school", label: "Sekolah" },
  { value: "campus", label: "Kampus / program studi" },
  { value: "community", label: "Komunitas" },
  { value: "organization", label: "Organisasi" },
  { value: "business", label: "Usaha" },
  { value: "portfolio", label: "Portofolio" },
  { value: "other", label: "Lainnya" },
];

export const SITE_TYPE_VALUES = SITE_TYPE_OPTIONS.map((option) => option.value) as [
  SiteType,
  ...SiteType[],
];

export const LOCALE_OPTIONS = [
  { value: "id-ID", label: "Bahasa Indonesia" },
  { value: "en-US", label: "English (United States)" },
  { value: "en-GB", label: "English (United Kingdom)" },
] as const;

export const SOCIAL_NETWORKS = [
  { key: "instagram", label: "Instagram", placeholder: "https://instagram.com/nama" },
  { key: "youtube", label: "YouTube", placeholder: "https://youtube.com/@nama" },
  { key: "tiktok", label: "TikTok", placeholder: "https://tiktok.com/@nama" },
  { key: "facebook", label: "Facebook", placeholder: "https://facebook.com/nama" },
  { key: "linkedin", label: "LinkedIn", placeholder: "https://linkedin.com/company/nama" },
  { key: "x", label: "X", placeholder: "https://x.com/nama" },
] as const;

export const SITE_HERO_IMAGE_FIELD = {
  formKey: "hero_image",
  column: "hero_image_url",
  kind: "site-hero",
  widthColumn: "hero_image_width",
  heightColumn: "hero_image_height",
} as const;

export const SITE_IMAGE_FIELDS = [
  SITE_HERO_IMAGE_FIELD,
  { formKey: "logo", column: "logo_url", kind: "site-logo" },
  { formKey: "favicon", column: "favicon_url", kind: "site-favicon" },
  { formKey: "seo_image", column: "seo_image_url", kind: "site-seo" },
] as const;

/**
 * Batas panjang satu-satunya sumber kebenaran: dipakai zod di schema.ts DAN
 * atribut maxLength komponen field di panel Setting agar tidak dobel nilai.
 */
export const SITE_CONFIG_LIMITS = {
  siteName: 80,
  siteAlternateName: 100,
  tagline: 140,
  description: 320,
  memberLabel: 40,
  heroTitle: 120,
  heroSubtitle: 220,
  visi: 600,
  misiItem: 300,
  missions: 20,
  footerText: 220,
  contactPhone: 50,
  contactAddress: 300,
  verification: 240,
  analyticsId: 40,
  adsenseClientId: 32,
  socialUrl: 500,
} as const;

/** Tab panel Setting = section server action; id dipakai sebagai ?tab= di URL. */
export const SITE_SETTINGS_TABS = [
  { id: "identity", label: "Identitas" },
  { id: "home", label: "Beranda" },
  { id: "seo", label: "SEO" },
  { id: "contact", label: "Kontak & Integrasi" },
] as const;

export type SiteSettingsTabId = (typeof SITE_SETTINGS_TABS)[number]["id"];

export function isSiteSettingsTabId(value: string): value is SiteSettingsTabId {
  return SITE_SETTINGS_TABS.some((tab) => tab.id === value);
}
