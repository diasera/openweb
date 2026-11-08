import type { MetadataRoute } from "next";
import { getSettings } from "@/lib/data";
import { absoluteUrl, getSiteUrl } from "@/lib/seo";
import { ADMIN_MANAGED_PATHS } from "@/lib/constants";

export const revalidate = 3600;

export default async function robots(): Promise<MetadataRoute.Robots> {
  const settings = await getSettings();
  const adminRoutes = [
    "/api/",
    ...ADMIN_MANAGED_PATHS.flatMap((path) => [
      `${path}$`,
      `${path}?`,
      `${path}/`,
    ]),
  ];
  return {
    rules: settings.seo_indexing_enabled
      ? { userAgent: "*", allow: "/", disallow: adminRoutes }
      : { userAgent: "*", disallow: "/" },
    sitemap: settings.seo_indexing_enabled
      ? absoluteUrl("/sitemap.xml", settings)
      : undefined,
    host: getSiteUrl(settings),
  };
}
