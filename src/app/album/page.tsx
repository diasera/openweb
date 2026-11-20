import type { Metadata } from "next";
import { getAlbumSummaries, getSettings } from "@/lib/data";
import { buildPageMetadata, PUBLIC_PAGE_SEO } from "@/lib/seo";
import { breadcrumbStructuredData } from "@/lib/seo/structured-data";
import { PageShell } from "@/components/public/page-shell";
import { AlbumBrowser } from "@/components/public/album-browser";
import { PageHeader } from "@/components/ui/page-header";
import { JsonLd } from "@/components/seo/json-ld";

export const revalidate = 60;

export async function generateMetadata(): Promise<Metadata> {
  return buildPageMetadata(await getSettings(), PUBLIC_PAGE_SEO.album);
}

export default async function AlbumsPage() {
  const [settings, albums] = await Promise.all([
    getSettings(),
    getAlbumSummaries(),
  ]);

  return (
    <PageShell>
      <JsonLd
        data={breadcrumbStructuredData(settings, [
          { name: "Beranda", path: "/" },
          { name: "Galeri", path: "/galeri" },
          { name: "Album", path: "/album" },
        ])}
      />
      <PageHeader
        size="large"
        title="Album"
        description="Foto dan video dikelompokkan per acara."
      />
      <AlbumBrowser albums={albums} />
    </PageShell>
  );
}
