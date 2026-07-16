import type { Metadata } from "next";
import { getApprovedMedia, getSettings } from "@/lib/data";
import { PageShell } from "@/components/public/page-shell";
import { GaleriBrowser } from "@/components/public/galeri-browser";
import { buildPageMetadata, PUBLIC_PAGE_SEO } from "@/lib/seo";

export const revalidate = 30;
export async function generateMetadata(): Promise<Metadata> {
  return buildPageMetadata(await getSettings(), PUBLIC_PAGE_SEO.galeri);
}

export default async function GaleriPage() {
  const media = await getApprovedMedia({ limit: 60 });

  return (
    <PageShell>
      <GaleriBrowser media={media} />
    </PageShell>
  );
}
