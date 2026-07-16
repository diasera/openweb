import { requireFeature } from "@/lib/auth";
import { getAdminMusicTracks } from "@/lib/admin/music";
import { buildAdminPageMetadata } from "@/lib/seo";
import { PageHeader } from "@/components/admin/page-header";
import { MusicManager } from "@/components/admin/music-manager";

export const metadata = buildAdminPageMetadata("Musik");

export default async function MusicPage() {
  await requireFeature("music");
  const tracks = await getAdminMusicTracks();

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader
        title="Musik"
        description="Unggah audio, susun urutan, dan tentukan lagu yang tersedia untuk pengunjung."
      />
      <MusicManager tracks={tracks} />
    </div>
  );
}
