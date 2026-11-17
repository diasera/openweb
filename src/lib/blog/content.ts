import "server-only";
import sanitizeHtml from "sanitize-html";
import { normalizeArticleResourceHref } from "@/lib/utils/url";
import { normalizeCalloutTone } from "./callout";
import { isProseMirrorDoc } from "./doc";

function normalizeSpaces(value: string) {
  return value
    .replace(/&nbsp;|&#160;|&#x0*a0;/gi, " ")
    .replace(/\u00a0/g, " ");
}

const ARTICLE_TAGS = [
  "p",
  "h1",
  "h2",
  "h3",
  "h4",
  "h5",
  "h6",
  "ul",
  "ol",
  "li",
  "blockquote",
  "aside",
  "pre",
  "code",
  "br",
  "hr",
  "strong",
  "b",
  "em",
  "i",
  "u",
  "s",
  "strike",
  "a",
  "img",
] as const;

const UNSAFE_OBJECT_KEYS: ReadonlySet<string> = new Set([
  "__proto__",
  "constructor",
  "prototype",
]);
const MAX_ARTICLE_JSON_DEPTH = 32;

/**
 * Membersihkan HTML TipTap di satu pintu. Fungsi ini dipakai saat penyimpanan
 * dan saat render, sehingga artikel lama ikut aman dari stored XSS.
 */
export function normalizeArticleHtml(html: string) {
  return sanitizeHtml(normalizeSpaces(html), {
    allowedTags: [...ARTICLE_TAGS],
    allowedAttributes: {
      a: ["href", "target", "rel"],
      img: ["src", "alt", "title", "width", "height"],
      ol: ["start"],
      li: ["value"],
      p: ["style"],
      h1: ["style"],
      h2: ["style"],
      h3: ["style"],
      h4: ["style"],
      h5: ["style"],
      h6: ["style"],
      aside: ["data-callout"],
      code: ["class"],
    },
    allowedClasses: {
      code: [/^language-[a-z0-9-]+$/i],
    },
    allowedStyles: {
      "*": {
        "text-align": [/^(?:left|center|right|justify)$/],
      },
    },
    allowedSchemes: ["https", "http", "mailto", "tel"],
    allowedSchemesByTag: { img: ["https", "http"] },
    allowProtocolRelative: false,
    transformTags: {
      aside: (_tagName, attributes) => ({
        tagName: "aside",
        attribs: {
          "data-callout": normalizeCalloutTone(attributes["data-callout"]),
        },
      }),
      a: (_tagName, attributes) => {
        const href = normalizeArticleResourceHref(attributes.href);
        if (!href) return { tagName: "a", attribs: {} };
        const target = attributes.target === "_blank" ? "_blank" : "";
        return {
          tagName: "a",
          attribs: {
            href,
            ...(target
              ? { target, rel: "noopener noreferrer" }
              : {}),
          },
        };
      },
      img: (_tagName, attributes) => {
        const src = normalizeArticleResourceHref(attributes.src, { image: true });
        if (!src) return { tagName: "img", attribs: {} };
        return {
          tagName: "img",
          attribs: {
            src,
            ...(attributes.alt ? { alt: attributes.alt } : {}),
            ...(attributes.title ? { title: attributes.title } : {}),
            ...(attributes.width ? { width: attributes.width } : {}),
            ...(attributes.height ? { height: attributes.height } : {}),
          },
        };
      },
    },
  });
}

function normalizeArticleJsonNode(
  value: unknown,
  key = "",
  depth = 0,
): unknown {
  if (depth > MAX_ARTICLE_JSON_DEPTH) {
    throw new RangeError("Struktur JSON artikel terlalu dalam.");
  }
  if (typeof value === "string") {
    const normalized = normalizeSpaces(value);
    if (key === "href") return normalizeArticleResourceHref(normalized);
    if (key === "src") {
      return normalizeArticleResourceHref(normalized, { image: true });
    }
    return normalized;
  }
  if (Array.isArray(value)) {
    return value.map((item) => normalizeArticleJsonNode(item, "", depth + 1));
  }
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value)
        .filter(([itemKey]) => !UNSAFE_OBJECT_KEYS.has(itemKey))
        .map(([itemKey, item]) => [
          itemKey,
          normalizeArticleJsonNode(item, itemKey, depth + 1),
        ]),
    );
  }
  return value;
}

/** JSON TipTap ikut dinormalisasi & divalidasi sebagai dokumen ProseMirror sah. */
export function normalizeArticleJson(value: unknown): unknown {
  if (!isProseMirrorDoc(value)) return null;
  const normalized = normalizeArticleJsonNode(value);
  return isProseMirrorDoc(normalized) ? normalized : null;
}

const IMAGE_SOURCE = /<img\b[^>]*?\bsrc\s*=\s*(?:"([^"]*)"|'([^']*)')/gi;

/** Seluruh URL gambar dalam HTML artikel (hasil normalizeArticleHtml). */
export function articleImageSources(html: string): string[] {
  const sources = new Set<string>();
  for (const match of html.matchAll(IMAGE_SOURCE)) {
    const raw = match[1] ?? match[2];
    if (raw) sources.add(raw.replace(/&amp;/g, "&").trim());
  }
  return [...sources];
}
