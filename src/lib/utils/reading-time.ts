/** Konversi HTML/teks ber-entitas menjadi teks polos ringkas yang aman untuk UI & SEO. */
export function plainText(value: string | null | undefined, max = 170): string {
  if (!value) return "";
  const text = value
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;|&#160;|&#x0*a0;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&quot;/gi, '"')
    .replace(/\s+/g, " ")
    .trim();
  if (text.length <= max) return text;
  return `${text.slice(0, Math.max(0, max - 1)).trimEnd()}…`;
}

/** Jumlah kata teks artikel dari HTML (tag dibuang). */
export function wordCount(html: string): number {
  const text = html.replace(/<[^>]+>/g, " ");
  return text.trim().split(/\s+/).filter(Boolean).length;
}

/** Estimasi waktu baca artikel (menit) dari HTML. ~200 kata/menit. */
export function readingTime(html: string): number {
  return Math.max(1, Math.round(wordCount(html) / 200));
}
