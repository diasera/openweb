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
