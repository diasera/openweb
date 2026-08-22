/**
 * Entrypoint site-config yang aman untuk Client Components.
 * Jaga file ini bebas dari Zod, server-only, dan dependency khusus Node.
 */
export {
  DEFAULT_CONTENT_LABELS,
  getContentLabels,
  toDisplayLabel,
} from "./defaults";
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
export { getSiteOrigin } from "./runtime";
