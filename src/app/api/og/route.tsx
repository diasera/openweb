import { ImageResponse } from "next/og";
import { getSettings } from "@/lib/data";
import { getHomeSeoDescription, getHomeSeoTitle, OG_CARD_HEIGHT, OG_CARD_WIDTH } from "@/lib/seo";
import { renderOgCard } from "@/lib/og/card";
import { rgbChannelsToHex } from "@/lib/theme";

/**
 * Kartu sosial default situs: rung terakhir rantai gambar OG, sehingga semua
 * halaman selalu punya preview saat dibagikan. Di-cache ISR 1 jam.
 */
export const revalidate = 3600;

export async function GET() {
  const settings = await getSettings();
  const primaryHex = settings.theme?.primary
    ? rgbChannelsToHex(settings.theme.primary)
    : "#e60023";
  return new ImageResponse(
    renderOgCard({
      siteName: settings.site_name,
      title: getHomeSeoTitle(settings),
      description: getHomeSeoDescription(settings),
      primaryHex,
    }),
    { width: OG_CARD_WIDTH, height: OG_CARD_HEIGHT },
  );
}
