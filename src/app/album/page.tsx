import type { Metadata } from "next";
import { FolderOpen } from "lucide-react";
import { getAlbumSummaries, getSettings } from "@/lib/data";
import { buildPageMetadata, PUBLIC_PAGE_SEO } from "@/lib/seo";
import { breadcrumbStructuredData } from "@/lib/seo/structured-data";
import { PageShell } from "@/components/public/page-shell";
import { AlbumCard } from "@/components/public/album-card";
import { listReveal } from "@/components/motion";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { JsonLd } from "@/components/seo/json-ld";

export const revalidate = 60;

export async function generateMetadata(): Promise<Metadata> {
  return buildPageMetadata(await getSettings(), PUBLIC_PAGE_SEO.album);
}

export default async function AlbumsPage() {
  const [settings, albums] = await Promise.all([getSettings(), getAlbumSummaries()]);

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
      {albums.length === 0 ? (
        <EmptyState
          icon={<FolderOpen className="h-8 w-8" />}
          title="Belum ada album"
          description="Album acara akan tampil di sini."
        />
      ) : (
        <div className="grid grid-cols-2 gap-x-3 gap-y-5 md:grid-cols-3 lg:grid-cols-4">
          {albums.map((album, index) => (
            <div key={album.id} {...listReveal(index)}>
              <AlbumCard album={album} />
            </div>
          ))}
        </div>
      )}
    </PageShell>
  );
}
