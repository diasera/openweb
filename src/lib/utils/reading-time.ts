/** Jumlah kata teks artikel dari HTML (tag dibuang). */
export function wordCount(html: string): number {
  const text = html.replace(/<[^>]+>/g, " ");
  return text.trim().split(/\s+/).filter(Boolean).length;
}

/** Estimasi waktu baca artikel (menit) dari HTML. ~200 kata/menit. */
export function readingTime(html: string): number {
  return Math.max(1, Math.round(wordCount(html) / 200));
}
