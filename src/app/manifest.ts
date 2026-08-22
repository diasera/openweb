import type { MetadataRoute } from "next";
import { getSettings } from "@/lib/data";
import { getHomeSeoDescription, getSiteAlternateName } from "@/lib/seo";
import { rgbChannelsToHex } from "@/lib/theme";

export const revalidate = 3600;

export default async function manifest(): Promise<MetadataRoute.Manifest> {
  const settings = await getSettings();
  const icon = settings.favicon_url || "/icon.svg";
  const primary = settings.theme?.primary
    ? rgbChannelsToHex(settings.theme.primary)
    : "#000000";
  return {
    name: getSiteAlternateName(settings) || settings.site_name,
    short_name: settings.site_name,
    description: getHomeSeoDescription(settings),
    id: "/",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#f2f2f7",
    theme_color: primary,
    lang: settings.locale,
    icons: [
      {
        src: icon,
        sizes: "any",
        type: icon.endsWith(".svg") ? "image/svg+xml" : undefined,
      },
      { src: "/api/pwa/192", sizes: "192x192", type: "image/png" },
      { src: "/api/pwa/512", sizes: "512x512", type: "image/png" },
      {
        src: "/api/pwa/maskable",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
    shortcuts: [
      { name: "Beranda", url: "/" },
      { name: "Galeri", url: "/galeri" },
      { name: "Buat Pin", url: "/buat" },
    ],
  };
}
