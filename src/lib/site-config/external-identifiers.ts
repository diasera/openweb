const ANALYTICS_ID_PATTERN = /^(G-[A-Z0-9]{6,20}|GT-[A-Z0-9]{6,20})$/;
const ADSENSE_CLIENT_ID_PATTERN = /^ca-pub-\d{16}$/;
/** Token verifikasi Google/Bing: base64url atau hex, tanpa spasi/tanda kutip. */
const VERIFICATION_TOKEN_PATTERN = /^[A-Za-z0-9_-]{8,200}$/;
const META_CONTENT_PATTERN = /content\s*=\s*["']([^"']+)["']/i;
const DNS_RECORD_PATTERN = /^(?:google-site-verification|msvalidate\.01)\s*=\s*(.+)$/i;

export function normalizeAnalyticsId(value: string | null | undefined) {
  const normalized = value?.trim().toUpperCase() ?? "";
  return ANALYTICS_ID_PATTERN.test(normalized) ? normalized : null;
}

export function normalizeAdsenseClientId(value: string | null | undefined) {
  const normalized = value?.trim() ?? "";
  return ADSENSE_CLIENT_ID_PATTERN.test(normalized) ? normalized : null;
}

/**
 * Kode verifikasi Search Console/Bing dari bentuk apa pun yang biasa ditempel
 * admin: token mentah, seluruh tag `<meta … content="…">`, atau rekaman DNS
 * `google-site-verification=…`. Hasilnya token bersih atau null; tag meta
 * mentah tidak pernah sampai ke `<head>` (dulu menghasilkan atribut rusak).
 */
export function normalizeVerificationCode(value: string | null | undefined) {
  let token = value?.trim() ?? "";
  if (!token) return null;
  const fromMeta = token.match(META_CONTENT_PATTERN);
  if (fromMeta) token = fromMeta[1]!.trim();
  const fromDns = token.match(DNS_RECORD_PATTERN);
  if (fromDns) token = fromDns[1]!.trim();
  token = token.replace(/^["']|["']$/g, "");
  return VERIFICATION_TOKEN_PATTERN.test(token) ? token : null;
}
