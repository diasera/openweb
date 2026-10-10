import type { MetadataRoute } from "next";
import {
  getAlbumSummaries,
  getApprovedMedia,
  getMembers,
  getPublishedPosts,
  getSettings,
} from "@/lib/data";
import { optionalRead } from "@/lib/data/read";
import { absoluteUrl } from "@/lib/seo";
import { memberProfilePath } from "@/lib/members/slug";
import { slidePreviewUrl } from "@/lib/media/slides";

export const revalidate = 3600;

const STATIC_PAGES = [
  { path: "/", priority: 1, changeFrequency: "daily" },
  { path: "/galeri", priority: 0.9, changeFrequency: "daily" },
  { path: "/blog", priority: 0.9, changeFrequency: "weekly" },
  { path: "/anggota", priority: 0.8, changeFrequency: "weekly" },
  { path: "/album", priority: 0.7, changeFrequency: "weekly" },
  { path: "/agenda", priority: 0.7, changeFrequency: "daily" },
  { path: "/tentang", priority: 0.6, changeFrequency: "monthly" },
  { path: "/profil", priority: 0.5, changeFrequency: "weekly" },
  { path: "/pesan", priority: 0.5, changeFrequency: "weekly" },
  { path: "/privasi", priority: 0.3, changeFrequency: "yearly" },
] as const;

/** ISO 8601 bersih: mikrodetik Postgres dibuang dan nilai rusak dilewati. */
function lastModified(...values: Array<string | null | undefined>) {
  for (const value of values) {
    const time = value ? Date.parse(value) : Number.NaN;
    if (Number.isFinite(time)) return new Date(time).toISOString();
  }
  return undefined;
}

function images(...urls: Array<string | null | undefined>) {
  const list = urls.filter((url): url is string => Boolean(url));
  return list.length > 0 ? list : undefined;
}

/**
 * Sitemap dinamis. Setiap sumber konten dibaca terpisah lewat optionalRead:
 * satu tabel bermasalah hanya mengosongkan bagiannya, tidak membuat seluruh
 * /sitemap.xml gagal (HTTP 500) yang di Search Console tampil "Tidak dapat
 * mengambil peta situs".
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const settings = await getSettings();
  if (!settings.seo_indexing_enabled) return [];

  const [members, media, posts, albums] = await Promise.all([
    optionalRead("sitemap-members", () => getMembers(), []),
    optionalRead(
      "sitemap-media",
      () => getApprovedMedia({ limit: 1000, slideCounts: false }),
      [],
    ),
    optionalRead("sitemap-posts", () => getPublishedPosts(1000), []),
    optionalRead("sitemap-albums", () => getAlbumSummaries(), []),
  ]);
  const siteUpdated = lastModified(settings.updated_at);
  const url = (path: string) => absoluteUrl(path, settings);

  return [
    ...STATIC_PAGES.map((page) => ({
      url: url(page.path),
      lastModified: siteUpdated,
      changeFrequency: page.changeFrequency,
      priority: page.priority,
    })),
    ...posts.map((post) => ({
      url: url(`/blog/${post.slug}`),
      lastModified: lastModified(post.updated_at, post.published_at, settings.updated_at),
      changeFrequency: "monthly" as const,
      priority: 0.8,
      images: images(post.cover_image_url),
    })),
    ...media.map((item) => ({
      url: url(`/pin/${item.id}`),
      lastModified: lastModified(item.created_at),
      changeFrequency: "monthly" as const,
      priority: 0.6,
      images: images(slidePreviewUrl(item)),
    })),
    ...albums
      .filter((album) => album.media_count > 0)
      .map((album) => ({
        url: url(`/album/${album.slug}`),
        lastModified: lastModified(album.latest_media_at, album.updated_at),
        changeFrequency: "weekly" as const,
        priority: 0.6,
      })),
    ...members.map((member) => ({
      url: url(memberProfilePath(member)),
      lastModified: lastModified(member.updated_at),
      changeFrequency: "monthly" as const,
      priority: 0.7,
      images: images(member.photo_url),
    })),
  ];
}
