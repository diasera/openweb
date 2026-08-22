import { ImageResponse } from "next/og";
import { getMemberByProfileKey, getSettings } from "@/lib/data";
import { OG_CARD_HEIGHT, OG_CARD_WIDTH, plainText } from "@/lib/seo";
import { renderOgCard } from "@/lib/og/card";
import { rgbChannelsToHex } from "@/lib/theme";

/** Kartu sosial profil anggota; dipakai otomatis untuk anggota tanpa foto. */
export const revalidate = 3600;

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  const [settings, member] = await Promise.all([
    getSettings(),
    getMemberByProfileKey(slug),
  ]);
  const primaryHex = settings.theme?.primary
    ? rgbChannelsToHex(settings.theme.primary)
    : "#e60023";
  return new ImageResponse(
    renderOgCard({
      siteName: settings.site_name,
      title: member
        ? `${member.name}${member.position ? ` — ${member.position}` : ""}`
        : settings.site_name,
      description:
        (member && plainText(member.bio, 180)) ||
        (member
          ? `Profil dan riwayat karya ${member.name} di ${settings.site_name}.`
          : settings.tagline),
      primaryHex,
    }),
    { width: OG_CARD_WIDTH, height: OG_CARD_HEIGHT },
  );
}
