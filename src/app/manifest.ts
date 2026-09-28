import type { MetadataRoute } from "next";
import { getSettings } from "@/lib/data";
import { getHomeSeoDescription } from "@/lib/seo";
import { themeBackgroundHex } from "@/lib/theme";
import { SHARE_TARGET } from "@/lib/share-target";

export const revalidate = 3600;

export default async function manifest(): Promise<MetadataRoute.Manifest> {
  const settings = await getSettings();
  const icon = settings.favicon_url || "/icon.svg";
  const background = themeBackgroundHex(settings.theme).light;
  return {
    // Nama aplikasi terpasang = Nama website, sama dengan judul tab dan island.
    // Nama alternatif khusus structured data mesin pencari.
    name: settings.site_name,
    short_name: settings.site_name,
    description: getHomeSeoDescription(settings),
    id: "/",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: background,
    theme_color: background,
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
      { name: "Agenda", url: "/agenda" },
    ],
    share_target: {
      action: SHARE_TARGET.action,
      method: "POST",
      enctype: "multipart/form-data",
      params: {
        title: "title",
        text: "text",
        files: [{ name: SHARE_TARGET.fileField, accept: ["image/*", "video/*"] }],
      },
    },
  };
}
