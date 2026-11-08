/** Normalisasi Unicode bersama sebelum aturan slug per-domain diterapkan. */
export function normalizeSlugSource(text: string): string {
  return text
    .trim()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

/** Ubah judul menjadi slug URL yang aman. Dipakai blog. */
export function slugify(text: string): string {
  return (
    normalizeSlugSource(text)
      .replace(/[^a-z0-9\s-]/g, "")
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 80)
      // Potongan 80 karakter bisa jatuh tepat setelah tanda hubung.
      .replace(/-+$/, "") || "artikel"
  );
}

/**
 * Apakah `slug` adalah `base` atau `base-<angka>` (suffix anti-bentrok maupun
 * cap waktu cadangan). Dipakai agar slug yang sedang dipakai tidak berpindah
 * hanya karena varian yang lebih pendek kebetulan kosong lagi.
 */
export function isSlugVariantOf(slug: string, base: string): boolean {
  if (slug === base) return true;
  const suffix = slug.startsWith(`${base}-`) ? slug.slice(base.length + 1) : "";
  return suffix !== "" && /^\d+$/.test(suffix);
}

const MAX_PREVIOUS_SLUGS = 20;

/** Riwayat slug untuk pengalihan URL lama: terbaru dulu, unik, tanpa slug aktif. */
export function withPreviousSlug(
  history: readonly string[] | null | undefined,
  previous: string,
  next: string,
): string[] {
  return [...new Set([previous, ...(history ?? [])])]
    .filter((slug) => slug && slug !== next)
    .slice(0, MAX_PREVIOUS_SLUGS);
}
