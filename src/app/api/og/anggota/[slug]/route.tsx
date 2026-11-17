import { ImageResponse } from "next/og";
import { getMemberByProfileKey, getSettings } from "@/lib/data";
import { OG_CARD_HEIGHT, OG_CARD_WIDTH, plainText } from "@/lib/seo";
import { renderOgCard } from "@/lib/og/card";
import { themePrimaryHex } from "@/lib/theme";

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
  if (!member) return new Response("Anggota tidak ditemukan.", { status: 404 });
  const primaryHex = themePrimaryHex(settings.theme);
  return new ImageResponse(
    renderOgCard({
      siteName: settings.site_name,
      title: `${member.name}${member.position ? ` — ${member.position}` : ""}`,
      description:
        plainText(member.bio, 180) ||
        `Profil dan riwayat karya ${member.name} di ${settings.site_name}.`,
      primaryHex,
    }),
    { width: OG_CARD_WIDTH, height: OG_CARD_HEIGHT },
  );
}
