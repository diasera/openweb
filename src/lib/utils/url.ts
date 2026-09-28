/**
 * Normalisasi tujuan notifikasi publik. Hanya path internal absolut dan HTTPS
 * yang boleh menjadi tautan; skema aktif seperti javascript:/data: ditolak.
 */
export function normalizeNotificationHref(value: string | null | undefined) {  const href = value?.trim() ?? "";
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
