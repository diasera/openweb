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
} from "./options";
import { normalizeStringList } from "./normalize";

/**
 * Skema Setting dipecah per tab agar tiap tab punya form + server action
 * sendiri (simpan per-section). Semua modul yang diimpor murni isomorfik,
 * jadi skema ini juga dipakai ulang untuk validasi inline di sisi klien.
 */

const optionalUrl = z
  .string()
  .trim()
  .max(SITE_CONFIG_LIMITS.socialUrl)
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

const memberLabel = z
  .string()
  .trim()
  .min(2, "Minimal 2 karakter.")
  .max(SITE_CONFIG_LIMITS.memberLabel);

const hexColor = (label: string) =>
  z.string().regex(/^#[0-9a-f]{6}$/i, `${label} tidak valid.`);

export const identityConfigSchema = z.object({
  site_name: z
    .string()
    .trim()
    .min(2, "Nama website wajib diisi.")
    .max(SITE_CONFIG_LIMITS.siteName),
  site_alternate_name: z.string().trim().max(SITE_CONFIG_LIMITS.siteAlternateName),
  site_type: z.enum(SITE_TYPE_VALUES),
  locale: z.enum(LOCALE_OPTIONS.map((option) => option.value)),
  tagline: z.string().trim().max(SITE_CONFIG_LIMITS.tagline),
  description: z.string().trim().max(SITE_CONFIG_LIMITS.description),
  member_label_singular: memberLabel,
  member_label_plural: memberLabel,
  member_identifier_label: memberLabel,
  member_core_group_label: memberLabel,
  primary_hex: hexColor("Warna utama"),
  accent_hex: hexColor("Warna aksen"),
});

export const homeConfigSchema = z.object({
  hero_title: z.string().trim().max(SITE_CONFIG_LIMITS.heroTitle),
  hero_subtitle: z.string().trim().max(SITE_CONFIG_LIMITS.heroSubtitle),
  visi: z.string().trim().max(SITE_CONFIG_LIMITS.visi),
  misi: z
    .array(z.string().trim().min(2, "Minimal 2 karakter.").max(SITE_CONFIG_LIMITS.misiItem))
    .max(SITE_CONFIG_LIMITS.missions),
  footer_text: z.string().trim().max(SITE_CONFIG_LIMITS.footerText),
});

export const seoConfigSchema = z.object({
  site_url: canonicalUrl,
  seo_indexing_enabled: z.boolean(),
  google_site_verification: z.string().trim().max(SITE_CONFIG_LIMITS.verification),
  bing_site_verification: z.string().trim().max(SITE_CONFIG_LIMITS.verification),
});

export const contactConfigSchema = z.object({
  contact_email: optionalEmail,
  contact_phone: z.string().trim().max(SITE_CONFIG_LIMITS.contactPhone),
  contact_address: z.string().trim().max(SITE_CONFIG_LIMITS.contactAddress),
  social: z.object(
    Object.fromEntries(SOCIAL_NETWORKS.map(({ key }) => [key, optionalUrl])) as Record<
      (typeof SOCIAL_NETWORKS)[number]["key"],
      typeof optionalUrl
    >,
  ),
  google_analytics_id: z
    .string()
    .trim()
    .max(SITE_CONFIG_LIMITS.analyticsId)
    .refine(
      (value) => !value || normalizeAnalyticsId(value) !== null,
      "Google Analytics ID tidak valid.",
    ),
  google_adsense_client_id: z
    .string()
    .trim()
    .max(SITE_CONFIG_LIMITS.adsenseClientId)
    .refine(
      (value) => !value || normalizeAdsenseClientId(value) !== null,
      "AdSense ID harus berbentuk ca-pub- diikuti 16 angka.",
    ),
  google_adsense_auto_ads: z.boolean(),
});

/** Kunci section = kunci tab di URL; satu sumber untuk parser & updater. */
export const SITE_SECTION_SCHEMAS = {
  identity: identityConfigSchema,
  home: homeConfigSchema,
  seo: seoConfigSchema,
  contact: contactConfigSchema,
} as const;

export type SiteSettingsSection = keyof typeof SITE_SECTION_SCHEMAS;

type SectionInput = {
  identity: z.infer<typeof identityConfigSchema>;
  home: z.infer<typeof homeConfigSchema>;
  seo: z.infer<typeof seoConfigSchema>;
  contact: z.infer<typeof contactConfigSchema>;
};

export type IdentityConfigInput = SectionInput["identity"];
export type HomeConfigInput = SectionInput["home"];
export type SeoConfigInput = SectionInput["seo"];
export type ContactConfigInput = SectionInput["contact"];

export function isSiteSettingsSection(value: string): value is SiteSettingsSection {
  return value in SITE_SECTION_SCHEMAS;
}

function text(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
}

function flag(formData: FormData, key: string) {
  return formData.get(key) === "on";
}

function socialPayload(formData: FormData) {
  return Object.fromEntries(
    SOCIAL_NETWORKS.map(({ key }) => [key, text(formData, `social_${key}`)]),
  ) as Record<(typeof SOCIAL_NETWORKS)[number]["key"], string>;
}

const SECTION_PARSERS: {
  [S in SiteSettingsSection]: (formData: FormData) => SectionInput[S];
} = {
  identity: (formData) => ({
    site_name: text(formData, "site_name"),
    site_alternate_name: text(formData, "site_alternate_name"),
    site_type: text(formData, "site_type") as SectionInput["identity"]["site_type"],
    locale: text(formData, "locale") as SectionInput["identity"]["locale"],
    tagline: text(formData, "tagline"),
    description: text(formData, "description"),
    member_label_singular: text(formData, "member_label_singular"),
    member_label_plural: text(formData, "member_label_plural"),
    member_identifier_label: text(formData, "member_identifier_label"),
    member_core_group_label: text(formData, "member_core_group_label"),
    primary_hex: text(formData, "primary_hex"),
    accent_hex: text(formData, "accent_hex"),
  }),
  home: (formData) => ({
    hero_title: text(formData, "hero_title"),
    hero_subtitle: text(formData, "hero_subtitle"),
    visi: text(formData, "visi"),
    misi: normalizeStringList(
      text(formData, "misi").split("\n"),
      SITE_CONFIG_LIMITS.missions,
    ),
    footer_text: text(formData, "footer_text"),
  }),
  seo: (formData) => ({
    site_url: text(formData, "site_url"),
    seo_indexing_enabled: flag(formData, "seo_indexing_enabled"),
    google_site_verification: text(formData, "google_site_verification"),
    bing_site_verification: text(formData, "bing_site_verification"),
  }),
  contact: (formData) => ({
    contact_email: text(formData, "contact_email"),
    contact_phone: text(formData, "contact_phone"),
    contact_address: text(formData, "contact_address"),
    social: socialPayload(formData),
    google_analytics_id: text(formData, "google_analytics_id"),
    google_adsense_client_id: text(formData, "google_adsense_client_id"),
    google_adsense_auto_ads: flag(formData, "google_adsense_auto_ads"),
  }),
};

/** Parser tunggal: FormData satu section -> hasil safeParse skema section itu. */
export function parseSiteSectionFormData<S extends SiteSettingsSection>(
  section: S,
  formData: FormData,
) {
  return SITE_SECTION_SCHEMAS[section].safeParse(SECTION_PARSERS[section](formData));
}

/**
 * Validasi inline sisi klien: null bila lolos, atau peta {namaField: pesan}
 * (jalur zod diratakan, mis. social.instagram -> social_instagram) supaya bisa
 * langsung dialirkan ke prop error komponen field.
 */
export function validateSiteSection(
  section: SiteSettingsSection,
  formData: FormData,
): Record<string, string> | null {
  const parsed = parseSiteSectionFormData(section, formData);
  if (parsed.success) return null;
  const errors: Record<string, string> = {};
  for (const issue of parsed.error.issues) {
    if (issue.path.length === 0) continue;
    const key =
      issue.path[0] === "social"
        ? `social_${String(issue.path[1] ?? "")}`
        : String(issue.path[0]);
    if (!(key in errors)) errors[key] = issue.message;
  }
  return errors;
}

function nullable(value: string) {
  return value || null;
}

const SECTION_UPDATERS: {
  [S in SiteSettingsSection]: (input: SectionInput[S]) => Partial<SiteSettingsRow>;
} = {
  identity: (input) => {
    const primary = hexToRgbChannels(input.primary_hex);
    const accent = hexToRgbChannels(input.accent_hex);
    const theme: ThemeTokens = {};
    if (primary) theme.primary = primary;
    if (accent) theme.accent = accent;
    return {
      site_name: input.site_name,
      site_alternate_name: nullable(input.site_alternate_name),
      site_type: input.site_type,
      locale: input.locale,
      tagline: nullable(input.tagline),
      description: nullable(input.description),
      content_labels: {
        memberSingular: input.member_label_singular,
        memberPlural: input.member_label_plural,
        memberIdentifier: input.member_identifier_label,
        memberCoreGroup: input.member_core_group_label,
      },
      theme: Object.keys(theme).length ? theme : null,
    };
  },
  home: (input) => ({
    hero_title: nullable(input.hero_title),
    hero_subtitle: nullable(input.hero_subtitle),
    visi: nullable(input.visi),
    misi: input.misi.length ? input.misi : null,
    footer_text: nullable(input.footer_text),
  }),
  seo: (input) => ({
    site_url: new URL(input.site_url).origin,
    seo_indexing_enabled: input.seo_indexing_enabled,
    google_site_verification: nullable(input.google_site_verification),
    bing_site_verification: nullable(input.bing_site_verification),
  }),
  contact: (input) => {
    const social = Object.fromEntries(
      Object.entries(input.social).filter((entry): entry is [keyof SocialLinks, string] =>
        Boolean(entry[1]),
      ),
    ) as SocialLinks;
    return {
      contact_email: nullable(input.contact_email),
      contact_phone: nullable(input.contact_phone),
      contact_address: nullable(input.contact_address),
      social: Object.keys(social).length ? social : null,
      google_analytics_id: nullable(input.google_analytics_id.toUpperCase()),
      google_adsense_client_id: nullable(input.google_adsense_client_id),
      google_adsense_auto_ads: input.google_adsense_auto_ads,
    };
  },
};

/** Transformasi tunggal: data form tervalidasi satu section -> kolom database. */
export function toSiteSectionUpdate<S extends SiteSettingsSection>(
  section: S,
  input: SectionInput[S],
) {
  return SECTION_UPDATERS[section](input);
}
