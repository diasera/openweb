/**
 * Kategori media & blog + warna labelnya. Warna merujuk token tone iOS
 * (globals.css) varian `-text` sehingga lolos kontras AA di light & dark.
 */

export const MEDIA_CATEGORIES = [
  "Kegiatan",
  "Akademik",
  "Prestasi",
  "Cerita",
  "Lainnya",
] as const;

export const BLOG_CATEGORIES = [
  "Kegiatan",
  "Akademik",
  "Cerita",
  "Opini",
  "Tips & Panduan",
] as const;

const PRIMARY_TEXT = "rgb(var(--primary-readable))";
const toneText = (tone: string) => `rgb(var(--tone-${tone}-text))`;

const CATEGORY_COLORS: Record<string, string> = {
  Kegiatan: PRIMARY_TEXT,
  Akademik: toneText("blue"),
  Prestasi: toneText("orange"),
  Cerita: toneText("indigo"),
  Opini: toneText("green"),
  "Tips & Panduan": toneText("teal"),
  Lainnya: toneText("gray"),
};

export function categoryColor(cat?: string | null): string {
  if (!cat) return toneText("gray");
  return CATEGORY_COLORS[cat] ?? PRIMARY_TEXT;
}
