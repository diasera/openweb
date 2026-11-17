import { ImageResponse } from "next/og";
import { getPostBySlug, getSettings } from "@/lib/data";
import { OG_CARD_HEIGHT, OG_CARD_WIDTH, plainText } from "@/lib/seo";
import { renderOgCard } from "@/lib/og/card";
import { themePrimaryHex } from "@/lib/theme";

/** Kartu sosial artikel; dipakai otomatis untuk post tanpa cover image. */
export const revalidate = 3600;

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  const [settings, post] = await Promise.all([getSettings(), getPostBySlug(slug)]);
  if (!post) return new Response("Artikel tidak ditemukan.", { status: 404 });
  const primaryHex = themePrimaryHex(settings.theme);
  return new ImageResponse(
    renderOgCard({
      siteName: settings.site_name,
      title: post.title,
      description: post.excerpt ?? plainText(post.content_html, 180),
      primaryHex,
    }),
    { width: OG_CARD_WIDTH, height: OG_CARD_HEIGHT },
  );
}
