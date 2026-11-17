/** Apakah tautan mengarah ke skema HTTP(S) eksternal (peka huruf besar/kecil). */
export function isExternalHref(href: string): boolean {
  return /^https?:\/\//i.test(href.trim());
}

const ARTICLE_IMAGE_PROTOCOLS: ReadonlySet<string> = new Set(["https:", "http:"]);
const ARTICLE_LINK_PROTOCOLS: ReadonlySet<string> = new Set([
  "https:",
  "http:",
  "mailto:",
  "tel:",
]);

/**
 * Pusat validasi URL tautan & sumber gambar artikel/editor kaya.
 * Menolak karakter kontrol, `//`, `/\`, kredensial URL, serta skema aktif
 * (`javascript:`, `data:`, `vbscript:`). `autoHttps` membantu input toolbar.
 */
export function normalizeArticleResourceHref(
  value: string | null | undefined,
  options: { image?: boolean; autoHttps?: boolean } = {},
): string {
  const href = value?.trim() ?? "";
  if (!href || /[\u0000-\u001f\u007f]/.test(href)) return "";

  if (href.startsWith("/")) {
    if (href.startsWith("//") || href.startsWith("/\\")) return "";
    try {
      const url = new URL(href, "https://internal.invalid");
      return url.origin === "https://internal.invalid"
        ? `${url.pathname}${url.search}${url.hash}`
        : "";
    } catch {
      return "";
    }
  }

  if (!options.image && href.startsWith("#")) return href;

  const candidate =
    options.autoHttps && !/^[a-z][a-z0-9+.-]*:/i.test(href)
      ? `https://${href}`
      : href;

  try {
    const url = new URL(candidate);
    if (url.username || url.password) return "";
    const protocols = options.image ? ARTICLE_IMAGE_PROTOCOLS : ARTICLE_LINK_PROTOCOLS;
    if (!protocols.has(url.protocol)) return "";
    return options.autoHttps ? url.toString() : candidate;
  } catch {
    return "";
  }
}

/**
 * Normalisasi tujuan notifikasi publik. Hanya path internal absolut dan HTTPS
 * yang boleh menjadi tautan; skema aktif seperti javascript:/data: ditolak.
 */
export function normalizeNotificationHref(value: string | null | undefined) {
  const href = value?.trim() ?? "";
  if (!href || /[\u0000-\u001f\u007f]/.test(href)) return null;

  if (
    href.startsWith("/") &&
    !href.startsWith("//") &&
    !href.startsWith("/\\")
  ) {
    try {
      const url = new URL(href, "https://internal.invalid");
      if (url.origin !== "https://internal.invalid") return null;
      return `${url.pathname}${url.search}${url.hash}`;
    } catch {
      return null;
    }
  }

  try {
    const url = new URL(href);
    if (url.protocol !== "https:" || url.username || url.password) return null;
    return url.toString();
  } catch {
    return null;
  }
}

/** Baca parameter ?page= dari searchParams menjadi nomor halaman >= 1. */
export function parsePageParam(value: string | undefined): number {
  const page = Number.parseInt(value ?? "1", 10);
  return Number.isInteger(page) && page >= 1 ? page : 1;
}

/** Normalisasi parameter filter teks dari query string (kategori, tag, dsb.). */
export function normalizeQueryFilter(
  value: string | undefined,
  maxLength = 60,
): string | undefined {
  const trimmed = value?.replace(/\s+/g, " ").trim();
  if (!trimmed || trimmed.length > maxLength) return undefined;
  return trimmed;
}

/** Bangun href bersih dengan query string tanpa nilai kosong. */
export function buildQueryHref(
  basePath: string,
  query: Record<string, string | undefined>,
): string {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value) params.set(key, value);
  }
  const search = params.toString();
  return search ? `${basePath}?${search}` : basePath;
}
