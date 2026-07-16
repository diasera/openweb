const ANALYTICS_ID_PATTERN = /^(G-[A-Z0-9]{6,20}|GT-[A-Z0-9]{6,20})$/;
const ADSENSE_CLIENT_ID_PATTERN = /^ca-pub-\d{16}$/;

export function normalizeAnalyticsId(value: string | null | undefined) {
  const normalized = value?.trim().toUpperCase() ?? "";
  return ANALYTICS_ID_PATTERN.test(normalized) ? normalized : null;
}

export function normalizeAdsenseClientId(value: string | null | undefined) {
  const normalized = value?.trim() ?? "";
  return ADSENSE_CLIENT_ID_PATTERN.test(normalized) ? normalized : null;
}
