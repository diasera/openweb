import { ImageResponse } from "next/og";
import { getPostBySlug, getSettings } from "@/lib/data";
import { OG_CARD_HEIGHT, OG_CARD_WIDTH, plainText } from "@/lib/seo";
import { renderOgCard } from "@/lib/og/card";
import { rgbChannelsToHex } from "@/lib/theme";

/** Kartu sosial artikel; dipakai otomatis untuk post tanpa cover image. */
export const revalidate = 3600;

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  const [settings, post] = await Promise.all([getSettings(), getPostBySlug(slug)]);
  const primaryHex = settings.theme?.primary
    ? rgbChannelsToHex(settings.theme.primary)
    : "#e60023";
  return new ImageResponse(
    renderOgCard({
      siteName: settings.site_name,
      title: post?.title ?? settings.site_name,
      description:
        post?.excerpt ?? (post ? plainText(post.content_html, 180) : settings.tagline),
      primaryHex,
    }),
    { width: OG_CARD_WIDTH, height: OG_CARD_HEIGHT },
  );
}
