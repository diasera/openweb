import "server-only";
import sanitizeHtml from "sanitize-html";

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

function safeArticleResource(value: string, image = false): string {
  const href = value.trim();
  if (!href || /[\u0000-\u001f\u007f]/.test(href)) return "";
  if (href.startsWith("/") && !href.startsWith("//") && !href.startsWith("/\\")) {
    return href;
  }
  if (!image && href.startsWith("#")) return href;

  try {
    const url = new URL(href);
    const protocols = image
      ? new Set(["https:", "http:"])
      : new Set(["https:", "http:", "mailto:", "tel:"]);
    return protocols.has(url.protocol) ? href : "";
  } catch {
    return "";
  }
}

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
      code: ["class"],
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
      a: (_tagName, attributes) => {
        const href = safeArticleResource(attributes.href ?? "");
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
        const src = safeArticleResource(attributes.src ?? "", true);
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

/** JSON TipTap ikut dinormalisasi agar edit berikutnya tidak menghidupkan bug lama. */
export function normalizeArticleJson(value: unknown, key = ""): unknown {
  if (typeof value === "string") {
    const normalized = normalizeSpaces(value);
    if (key === "href") return safeArticleResource(normalized);
    if (key === "src") return safeArticleResource(normalized, true);
    return normalized;
  }
  if (Array.isArray(value)) {
    return value.map((item) => normalizeArticleJson(item));
  }
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([itemKey, item]) => [
        itemKey,
        normalizeArticleJson(item, itemKey),
      ]),
    );
  }
  return value;
}
