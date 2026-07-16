import type {
  ContentLabels,
  SiteSettingsRow,
} from "@/lib/types/database";

export const DEFAULT_SITE_NAME = "Ruang Bersama";
export const DEFAULT_SITE_DESCRIPTION =
  "Ruang digital untuk berbagi profil, kegiatan, karya, artikel, dan informasi terbaru.";

export const DEFAULT_CONTENT_LABELS: Required<ContentLabels> = {
  memberSingular: "anggota",
  memberPlural: "anggota",
  memberIdentifier: "Nomor identitas",
  memberCoreGroup: "Pengurus",
};

export const DEFAULT_SITE_CONFIG = {
  site_name: DEFAULT_SITE_NAME,
  site_type: "community",
  locale: "id-ID",
  timezone: "Asia/Jakarta",
  description: DEFAULT_SITE_DESCRIPTION,
  seo_indexing_enabled: true,
  google_adsense_auto_ads: false,
  content_labels: DEFAULT_CONTENT_LABELS,
} satisfies Pick<
  SiteSettingsRow,
  | "site_name"
  | "site_type"
  | "locale"
  | "timezone"
  | "description"
  | "seo_indexing_enabled"
  | "google_adsense_auto_ads"
  | "content_labels"
>;

export function getContentLabels(
  settings: Pick<SiteSettingsRow, "content_labels">,
): Required<ContentLabels> {
  return {
    memberSingular:
      settings.content_labels?.memberSingular?.trim() ||
      DEFAULT_CONTENT_LABELS.memberSingular,
    memberPlural:
      settings.content_labels?.memberPlural?.trim() ||
      DEFAULT_CONTENT_LABELS.memberPlural,
    memberIdentifier:
      settings.content_labels?.memberIdentifier?.trim() ||
      DEFAULT_CONTENT_LABELS.memberIdentifier,
    memberCoreGroup:
      settings.content_labels?.memberCoreGroup?.trim() ||
      DEFAULT_CONTENT_LABELS.memberCoreGroup,
  };
}

export function toDisplayLabel(value: string, locale = "id-ID") {
  const normalized = value.trim();
  if (!normalized) return normalized;
  const [first, ...rest] = Array.from(normalized);
  return `${first?.toLocaleUpperCase(locale) ?? ""}${rest.join("")}`;
}

/** Melindungi render saat aplikasi di-deploy sesaat sebelum migrasi database dijalankan. */
export function normalizeSiteSettings(settings: SiteSettingsRow): SiteSettingsRow {
  const legacy = settings as Partial<SiteSettingsRow>;
  return {
    ...settings,
    site_name: legacy.site_name?.trim() || DEFAULT_SITE_CONFIG.site_name,
    site_type: legacy.site_type || DEFAULT_SITE_CONFIG.site_type,
    locale: legacy.locale || DEFAULT_SITE_CONFIG.locale,
    timezone: legacy.timezone || DEFAULT_SITE_CONFIG.timezone,
    description: legacy.description ?? DEFAULT_SITE_CONFIG.description,
    content_labels: getContentLabels(settings),
    seo_indexing_enabled: legacy.seo_indexing_enabled !== false,
    google_adsense_auto_ads: legacy.google_adsense_auto_ads === true,
    hero_image_width: legacy.hero_image_width ?? null,
    hero_image_height: legacy.hero_image_height ?? null,
    contact_phone: legacy.contact_phone ?? null,
    contact_address: legacy.contact_address ?? null,
    bing_site_verification: legacy.bing_site_verification ?? null,
  };
}
