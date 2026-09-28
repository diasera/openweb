/** Estimasi waktu baca artikel (menit) dari HTML. ~200 kata/menit. */
export function readingTime(html: string): number {
  const text = html.replace(/<[^>]+>/g, " ");
  const words = text.trim().split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.round(words / 200));
}
