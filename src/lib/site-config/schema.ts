import { z } from "zod";
import {
  normalizeAdsenseClientId,
  normalizeAnalyticsId,
} from "./external-identifiers";
import { hexToRgbChannels } from "@/lib/theme";
import type {
  SiteSettingsRow,
  SocialLinks,
  ThemeTokens,
} from "@/lib/types/database";
import {
  LOCALE_OPTIONS,
  SITE_CONFIG_LIMITS,
  SITE_TYPE_VALUES,
  SOCIAL_NETWORKS,
  TIMEZONE_OPTIONS,
} from "./options";
import { normalizeStringList } from "./normalize";

const optionalUrl = z
  .string()
  .trim()
  .max(500)
  .refine((value) => {
    if (!value) return true;
    try {
      const url = new URL(value);
      return url.protocol === "https:" || url.protocol === "http:";
    } catch {
      return false;
    }
  }, "Tautan harus berupa URL lengkap yang valid.");

const canonicalUrl = z
  .string()
  .trim()
  .url("URL utama tidak valid.")
  .refine((value) => {
    const url = new URL(value);
    return url.protocol === "https:" || url.hostname === "localhost";
  }, "Gunakan HTTPS untuk website publik.");

const optionalEmail = z
  .string()
  .trim()
  .max(160)
  .refine(
    (value) => !value || z.email().safeParse(value).success,
    "Alamat email tidak valid.",
  );

const keywordSchema = z.string().trim().min(2).max(SITE_CONFIG_LIMITS.keywordLength);

export const siteConfigSchema = z.object({
  site_name: z.string().trim().min(2, "Nama website wajib diisi.").max(80),
  site_alternate_name: z.string().trim().max(100),
  site_url: canonicalUrl,
  site_type: z.enum(SITE_TYPE_VALUES),
  locale: z.enum(LOCALE_OPTIONS.map((option) => option.value)),
  timezone: z.enum(TIMEZONE_OPTIONS.map((option) => option.value)),
  description: z.string().trim().max(320),
  tagline: z.string().trim().max(140),
  member_label_singular: z.string().trim().min(2).max(40),
  member_label_plural: z.string().trim().min(2).max(40),
  member_identifier_label: z.string().trim().min(2).max(40),
  member_core_group_label: z.string().trim().min(2).max(40),
  keywords: z.array(keywordSchema).max(SITE_CONFIG_LIMITS.keywords),
  hero_title: z.string().trim().max(120),
  hero_subtitle: z.string().trim().max(220),
  footer_text: z.string().trim().max(220),
  contact_email: optionalEmail,
  contact_phone: z.string().trim().max(50),
  contact_address: z.string().trim().max(300),
  social: z.object(
    Object.fromEntries(SOCIAL_NETWORKS.map(({ key }) => [key, optionalUrl])) as Record<
      (typeof SOCIAL_NETWORKS)[number]["key"],
      typeof optionalUrl
    >,
  ),
  visi: z.string().trim().max(600),
  misi: z.array(z.string().trim().min(2).max(300)).max(SITE_CONFIG_LIMITS.missions),
  google_site_verification: z.string().trim().max(240),
  bing_site_verification: z.string().trim().max(240),
  google_analytics_id: z
    .string()
    .trim()
    .max(40)
    .refine(
      (value) => !value || normalizeAnalyticsId(value) !== null,
      "Google Analytics ID tidak valid.",
    ),
  seo_home_title: z.string().trim().max(80),
  seo_home_description: z.string().trim().max(220),
  seo_indexing_enabled: z.boolean(),
  google_adsense_client_id: z
    .string()
    .trim()
    .max(32)
    .refine(
      (value) => !value || normalizeAdsenseClientId(value) !== null,
      "AdSense ID harus berbentuk ca-pub- diikuti 16 angka.",
    ),
  google_adsense_auto_ads: z.boolean(),
  primary_hex: z.string().regex(/^#[0-9a-f]{6}$/i, "Warna utama tidak valid."),
  accent_hex: z.string().regex(/^#[0-9a-f]{6}$/i, "Warna aksen tidak valid."),
});

export type SiteConfigInput = z.infer<typeof siteConfigSchema>;

function text(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
}

function parseKeywordPayload(value: string) {
  try {
    const parsed: unknown = JSON.parse(value);
    if (Array.isArray(parsed)) {
      return normalizeStringList(
        parsed.filter((item): item is string => typeof item === "string"),
        SITE_CONFIG_LIMITS.keywords,
      );
    }
  } catch {
    // Fallback untuk instalasi lama yang menyimpan daftar dipisah koma/baris.
  }
  return normalizeStringList(value.split(/[,;\n]/), SITE_CONFIG_LIMITS.keywords);
}

export function parseSiteConfigFormData(formData: FormData) {
  const social = Object.fromEntries(
    SOCIAL_NETWORKS.map(({ key }) => [key, text(formData, `social_${key}`)]),
  );
  return siteConfigSchema.safeParse({
    site_name: text(formData, "site_name"),
    site_alternate_name: text(formData, "site_alternate_name"),
    site_url: text(formData, "site_url"),
    site_type: text(formData, "site_type"),
    locale: text(formData, "locale"),
    timezone: text(formData, "timezone"),
    description: text(formData, "description"),
    tagline: text(formData, "tagline"),
    member_label_singular: text(formData, "member_label_singular"),
    member_label_plural: text(formData, "member_label_plural"),
    member_identifier_label: text(formData, "member_identifier_label"),
    member_core_group_label: text(formData, "member_core_group_label"),
    keywords: parseKeywordPayload(text(formData, "keywords")),
    hero_title: text(formData, "hero_title"),
    hero_subtitle: text(formData, "hero_subtitle"),
    footer_text: text(formData, "footer_text"),
    contact_email: text(formData, "contact_email"),
    contact_phone: text(formData, "contact_phone"),
    contact_address: text(formData, "contact_address"),
    social,
    visi: text(formData, "visi"),
    misi: normalizeStringList(
      text(formData, "misi").split("\n"),
      SITE_CONFIG_LIMITS.missions,
    ),
    google_site_verification: text(formData, "google_site_verification"),
    bing_site_verification: text(formData, "bing_site_verification"),
    google_analytics_id: text(formData, "google_analytics_id"),
    seo_home_title: text(formData, "seo_home_title"),
    seo_home_description: text(formData, "seo_home_description"),
    seo_indexing_enabled: formData.get("seo_indexing_enabled") === "on",
    google_adsense_client_id: text(formData, "google_adsense_client_id"),
    google_adsense_auto_ads: formData.get("google_adsense_auto_ads") === "on",
    primary_hex: text(formData, "primary_hex"),
    accent_hex: text(formData, "accent_hex"),
  });
}

function nullable(value: string) {
  return value || null;
}

/** Transformasi tunggal dari data form tervalidasi ke kontrak database. */
export function toSiteSettingsUpdate(input: SiteConfigInput): Partial<SiteSettingsRow> {
  const primary = hexToRgbChannels(input.primary_hex);
  const accent = hexToRgbChannels(input.accent_hex);
  const theme: ThemeTokens = {};
  if (primary) theme.primary = primary;
  if (accent) theme.accent = accent;

  const social = Object.fromEntries(
    Object.entries(input.social).filter((entry): entry is [keyof SocialLinks, string] =>
      Boolean(entry[1]),
    ),
  ) as SocialLinks;

  return {
    site_name: input.site_name,
    site_alternate_name: nullable(input.site_alternate_name),
    site_url: new URL(input.site_url).origin,
    site_type: input.site_type,
    locale: input.locale,
    timezone: input.timezone,
    description: nullable(input.description),
    tagline: nullable(input.tagline),
    content_labels: {
      memberSingular: input.member_label_singular,
      memberPlural: input.member_label_plural,
      memberIdentifier: input.member_identifier_label,
      memberCoreGroup: input.member_core_group_label,
    },
    keywords: input.keywords.length ? input.keywords : null,
    hero_title: nullable(input.hero_title),
    hero_subtitle: nullable(input.hero_subtitle),
    footer_text: nullable(input.footer_text),
    contact_email: nullable(input.contact_email),
    contact_phone: nullable(input.contact_phone),
    contact_address: nullable(input.contact_address),
    social: Object.keys(social).length ? social : null,
    visi: nullable(input.visi),
    misi: input.misi.length ? input.misi : null,
    google_site_verification: nullable(input.google_site_verification),
    bing_site_verification: nullable(input.bing_site_verification),
    google_analytics_id: nullable(input.google_analytics_id.toUpperCase()),
    seo_home_title: nullable(input.seo_home_title),
    seo_home_description: nullable(input.seo_home_description),
    seo_indexing_enabled: input.seo_indexing_enabled,
    google_adsense_client_id: nullable(input.google_adsense_client_id),
    google_adsense_auto_ads: input.google_adsense_auto_ads,
    theme: Object.keys(theme).length ? theme : null,
  };
}
