import "server-only";
import { getPublishedPosts, getSettings } from "@/lib/data";
import { getHomeSeoDescription, getSiteUrl } from "@/lib/seo";

/** Jumlah artikel terbaru di RSS maupun JSON Feed. */
const FEED_LIMIT = 20;

/** Header cache bersama; `revalidate` di route tetap literal (statis). */
export const FEED_CACHE_CONTROL =
  "public, s-maxage=3600, stale-while-revalidate=86400";

export interface SiteFeedEntry {
  url: string;
  title: string;
  summary: string | null;
  publishedAt: string;
  category: string | null;
}

export interface SiteFeed {
  title: string;
  siteUrl: string;
  description: string;
  language: string;
  entries: SiteFeedEntry[];
}

/** Satu sumber isi feed agar RSS dan JSON Feed tidak pernah menyimpang. */
export async function getSiteFeed(): Promise<SiteFeed> {
  const [settings, posts] = await Promise.all([
    getSettings(),
    getPublishedPosts(FEED_LIMIT),
  ]);
  const siteUrl = getSiteUrl(settings);
  return {
    title: settings.site_name,
    siteUrl,
    description: getHomeSeoDescription(settings),
    language: settings.locale,
    entries: posts.flatMap((post) =>
      post.published_at
        ? [
            {
              url: `${siteUrl}/blog/${post.slug}`,
              title: post.title,
              summary: post.excerpt?.trim() || null,
              publishedAt: post.published_at,
              category: post.category || null,
            },
          ]
        : [],
    ),
  };
}
