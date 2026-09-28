import { getPublishedPosts, getSettings } from "@/lib/data";
import { getHomeSeoDescription, getSiteUrl } from "@/lib/seo";

export const revalidate = 3600;

const FEED_LIMIT = 20;

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
  const [settings, posts] = await Promise.all([
    getSettings(),
    getPublishedPosts(FEED_LIMIT),
  ]);
  const siteUrl = getSiteUrl(settings);

  const items = posts
    .filter((post) => post.published_at)
    .map((post) => {
      const url = `${siteUrl}/blog/${post.slug}`;
      const description = post.excerpt?.trim() || "";
      return [
        "    <item>",
        `      <title>${xmlEscape(post.title)}</title>`,
        `      <link>${xmlEscape(url)}</link>`,
        `      <guid isPermaLink="true">${xmlEscape(url)}</guid>`,
        `      <pubDate>${new Date(post.published_at as string).toUTCString()}</pubDate>`,
        post.category
          ? `      <category>${xmlEscape(post.category)}</category>`
          : "",
        description
          ? `      <description>${xmlEscape(description)}</description>`
          : "",
        "    </item>",
      ]
        .filter(Boolean)
        .join("\n");
    })
    .join("\n");

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>${xmlEscape(settings.site_name)}</title>
    <link>${xmlEscape(siteUrl)}</link>
    <description>${xmlEscape(getHomeSeoDescription(settings))}</description>
    <language>${xmlEscape(settings.locale)}</language>
    <atom:link href="${xmlEscape(`${siteUrl}/feed.xml`)}" rel="self" type="application/rss+xml"/>
${items}
  </channel>
</rss>`;

  return new Response(xml, {
    headers: {
      "Content-Type": "application/rss+xml; charset=utf-8",
      "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400",
    },
  });
}
