import type { Metadata } from "next";
import { getApprovedMedia, getSettings } from "@/lib/data";
import { PageShell } from "@/components/public/page-shell";
import { GaleriBrowser } from "@/components/public/galeri-browser";
import { JsonLd } from "@/components/seo/json-ld";
import { buildPageMetadata, PUBLIC_PAGE_SEO } from "@/lib/seo";
import { breadcrumbStructuredData } from "@/lib/seo/structured-data";

export const revalidate = 30;
export async function generateMetadata(): Promise<Metadata> {
  return buildPageMetadata(await getSettings(), PUBLIC_PAGE_SEO.galeri);
}

export default async function GaleriPage() {
  const [settings, media] = await Promise.all([
    getSettings(),
    getApprovedMedia({ limit: 60 }),
  ]);

  return (
    <PageShell>
      <JsonLd
        data={breadcrumbStructuredData(settings, [
          { name: "Beranda", path: "/" },
          { name: "Galeri", path: "/galeri" },
        ])}
      />
      <GaleriBrowser media={media} />
    </PageShell>
  );
}
