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
      .slice(0, 80) || "artikel"
  );
}
