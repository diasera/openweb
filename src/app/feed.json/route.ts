import { FEED_CACHE_CONTROL, getSiteFeed } from "@/lib/seo/feed";

export const revalidate = 3600;

/** GET /feed.json — JSON Feed 1.1 (pembaca modern; isi sama dengan RSS). */
export async function GET() {
  const feed = await getSiteFeed();

  const body = {
    version: "https://jsonfeed.org/version/1.1",
    title: feed.title,
    home_page_url: feed.siteUrl,
    feed_url: `${feed.siteUrl}/feed.json`,
    description: feed.description,
    language: feed.language,
    items: feed.entries.map((entry) => ({
      id: entry.url,
      url: entry.url,
      title: entry.title,
      // JSON Feed 1.1 mewajibkan content_text atau content_html di tiap item;
      // artikel tanpa ringkasan memakai judul agar feed tetap valid.
      content_text: entry.summary ?? entry.title,
      ...(entry.summary ? { summary: entry.summary } : {}),
      date_published: entry.publishedAt,
      ...(entry.category ? { tags: [entry.category] } : {}),
    })),
  };

  return new Response(JSON.stringify(body, null, 2), {
    headers: {
      "Content-Type": "application/feed+json; charset=utf-8",
      "Cache-Control": FEED_CACHE_CONTROL,
    },
  });
}
