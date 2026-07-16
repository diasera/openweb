/** Kategori media & blog + warnanya (label kategori berwarna sesuai Figma). */

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

const CATEGORY_COLORS: Record<string, string> = {
  Kegiatan: "#E60023",
  Akademik: "#E60023",
  Prestasi: "#FF9500",
  Cerita: "#7A5CFF",
  Opini: "#34C759",
  "Tips & Panduan": "#E60023",
  Lainnya: "#808085",
};

export function categoryColor(cat?: string | null): string {
  if (!cat) return "#808085";
  return CATEGORY_COLORS[cat] ?? "#E60023";
}
