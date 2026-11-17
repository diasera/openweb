export interface ArticleHeading {
  id: string;
  text: string;
  level: 1 | 2 | 3;
  depth: 0 | 1;
}

const HEADING_PATTERN = /<h([123])(\b[^>]*)>([\s\S]*?)<\/h\1>/gi;

function decodeBasicEntities(value: string): string {
  return value
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;|&#160;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/\s+/g, " ")
    .trim();
}

function slugifyHeading(text: string): string {
  const slug = text
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
  return slug ? `bagian-${slug}` : "bagian";
}

/**
 * Menyuntikkan `id` deterministik pada subjudul `h1`/`h2`/`h3` di HTML artikel
 * yang sudah disanitasi, sekaligus mengekstrak struktur Daftar Isi (TOC).
 */
export function prepareArticleToc(cleanHtml: string): {
  html: string;
  headings: ArticleHeading[];
} {
  const rawHeadings: Array<{ id: string; text: string; level: 1 | 2 | 3 }> = [];
  const usedIds = new Map<string, number>();

  const html = cleanHtml.replace(
    HEADING_PATTERN,
    (fullMatch, rawLevel: string, rawAttrs: string, innerHtml: string) => {
      const text = decodeBasicEntities(innerHtml);
      if (!text) return fullMatch;

      const level = Number(rawLevel) as 1 | 2 | 3;
      const baseId = slugifyHeading(text);
      const seen = (usedIds.get(baseId) ?? 0) + 1;
      usedIds.set(baseId, seen);
      const id = seen === 1 ? baseId : `${baseId}-${seen}`;

      rawHeadings.push({ id, text, level });
      const cleanedAttrs = rawAttrs.replace(/\s+id=(?:"[^"]*"|'[^']*')/gi, "");
      return `<h${level} id="${id}"${cleanedAttrs}>${innerHtml}</h${level}>`;
    },
  );

  if (rawHeadings.length === 0) {
    return { html, headings: [] };
  }

  const minLevel = Math.min(...rawHeadings.map((item) => item.level));
  const headings: ArticleHeading[] = rawHeadings.map((item) => ({
    ...item,
    depth: item.level > minLevel ? 1 : 0,
  }));

  return { html, headings };
}
