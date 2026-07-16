import type { MetadataRoute } from "next";
import {
  getApprovedMedia,
  getMembers,
  getPublishedPosts,
  getSettings,
} from "@/lib/data";
import { absoluteUrl } from "@/lib/seo";
import { memberProfilePath } from "@/lib/members/slug";

export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [settings, members, media, posts] = await Promise.all([
    getSettings(),
    getMembers(),
    getApprovedMedia({ limit: 1000 }),
    getPublishedPosts(1000),
  ]);
  if (!settings.seo_indexing_enabled) return [];
  const siteUpdated = settings.updated_at;

  const staticPages = [
    { path: "/", priority: 1, changeFrequency: "daily" },
    { path: "/galeri", priority: 0.9, changeFrequency: "daily" },
    { path: "/blog", priority: 0.9, changeFrequency: "weekly" },
    { path: "/anggota", priority: 0.8, changeFrequency: "weekly" },
    { path: "/profil", priority: 0.7, changeFrequency: "weekly" },
    { path: "/pesan", priority: 0.5, changeFrequency: "weekly" },
    { path: "/tentang", priority: 0.6, changeFrequency: "monthly" },
    { path: "/privasi", priority: 0.3, changeFrequency: "yearly" },
  ] as const;
  const staticEntries: MetadataRoute.Sitemap = staticPages.map((page) => ({
    url: absoluteUrl(page.path, settings),
    lastModified: siteUpdated,
    changeFrequency: page.changeFrequency,
    priority: page.priority,
  }));

  return [
    ...staticEntries,
    ...posts.map((post) => ({
      url: absoluteUrl(`/blog/${post.slug}`, settings),
      lastModified: post.updated_at || post.published_at || siteUpdated,
      changeFrequency: "monthly" as const,
      priority: 0.8,
    })),
    ...media.map((item) => ({
      url: absoluteUrl(`/pin/${item.id}`, settings),
      lastModified: item.reviewed_at || item.created_at,
      changeFrequency: "monthly" as const,
      priority: 0.6,
    })),
    ...members.map((member) => ({
      url: absoluteUrl(memberProfilePath(member), settings),
      lastModified: member.updated_at,
      changeFrequency: "monthly" as const,
      priority: 0.7,
    })),
  ];
}
