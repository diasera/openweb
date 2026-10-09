/**
 * Entrypoint site-config yang aman untuk Client Components.
 * Jaga file ini bebas dari Zod, server-only, dan dependency khusus Node.
 */
export {
  DEFAULT_CONTENT_LABELS,
  getContentLabels,
  toDisplayLabel,
} from "./defaults";
export { resolveHeroContent } from "./hero";
export type { HeroContent, HeroSettings } from "./hero";
export {
  LOCALE_OPTIONS,
  SITE_CONFIG_LIMITS,
  SITE_SETTINGS_TABS,
  SITE_TYPE_OPTIONS,
  SOCIAL_NETWORKS,
  isSiteSettingsTabId,
} from "./options";
export type { SiteSettingsTabId } from "./options";
export { normalizeStringList } from "./normalize";
// getSiteOrigin sengaja TIDAK diekspor di sini: fallback env Vercel hanya ada di
// server, sehingga hasilnya di browser berbeda dan memicu hydration mismatch.
// Hitung di Server Component lalu oper sebagai prop.
