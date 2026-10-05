import { FEED_CACHE_CONTROL, getSiteFeed } from "@/lib/seo/feed";

export const revalidate = 3600;

function xmlEscape(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

/** GET /feed.xml — RSS 2.0 artikel terbit (autodiscovery ada di metadata blog). */
export async function GET() {
  const feed = await getSiteFeed();

  const items = feed.entries
    .map((entry) =>
      [
        "    <item>",
        `      <title>${xmlEscape(entry.title)}</title>`,
        `      <link>${xmlEscape(entry.url)}</link>`,
        `      <guid isPermaLink="true">${xmlEscape(entry.url)}</guid>`,
        `      <pubDate>${new Date(entry.publishedAt).toUTCString()}</pubDate>`,
        entry.category
          ? `      <category>${xmlEscape(entry.category)}</category>`
          : "",
        entry.summary
          ? `      <description>${xmlEscape(entry.summary)}</description>`
          : "",
        "    </item>",
      ]
        .filter(Boolean)
        .join("\n"),
    )
    .join("\n");

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>${xmlEscape(feed.title)}</title>
    <link>${xmlEscape(feed.siteUrl)}</link>
    <description>${xmlEscape(feed.description)}</description>
    <language>${xmlEscape(feed.language)}</language>
    <atom:link href="${xmlEscape(`${feed.siteUrl}/feed.xml`)}" rel="self" type="application/rss+xml"/>
${items}
  </channel>
</rss>`;

  return new Response(xml, {
    headers: {
      "Content-Type": "application/rss+xml; charset=utf-8",
      "Cache-Control": FEED_CACHE_CONTROL,
    },
  });
}
