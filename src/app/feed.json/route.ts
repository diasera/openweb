import { getPublishedPosts, getSettings } from "@/lib/data";
import { getHomeSeoDescription, getSiteUrl } from "@/lib/seo";

export const revalidate = 3600;

const FEED_LIMIT = 20;

/** GET /feed.json — JSON Feed 1.1 (pembaca modern; isi sama dengan RSS). */
export async function GET() {
  const [settings, posts] = await Promise.all([
    getSettings(),
    getPublishedPosts(FEED_LIMIT),
  ]);
  const siteUrl = getSiteUrl(settings);

  const feed = {
    version: "https://jsonfeed.org/version/1.1",
    title: settings.site_name,
    home_page_url: siteUrl,
    feed_url: `${siteUrl}/feed.json`,
    description: getHomeSeoDescription(settings),
    language: settings.locale,
    items: posts
      .filter((post) => post.published_at)
      .map((post) => ({
        id: `${siteUrl}/blog/${post.slug}`,
        url: `${siteUrl}/blog/${post.slug}`,
        title: post.title,
        content_text: post.excerpt?.trim() || undefined,
        date_published: post.published_at as string,
        ...(post.category ? { tags: [post.category] } : {}),
      })),
  };

  return new Response(JSON.stringify(feed, null, 2), {
    headers: {
      "Content-Type": "application/feed+json; charset=utf-8",
      "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400",
    },
  });
}
