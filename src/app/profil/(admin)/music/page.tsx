import { requireFeature } from "@/lib/auth";
import { getAdminMusicTracks } from "@/lib/admin/music";
import { buildAdminPageMetadata } from "@/lib/seo";
import { AdminPage } from "@/components/admin/admin-page";
import { MusicManager } from "@/components/admin/music/music-manager";

export const metadata = buildAdminPageMetadata("Musik");

export default async function MusicPage() {
  await requireFeature("music");
  const tracks = await getAdminMusicTracks();

  return (
    <AdminPage
      feature="music"
      title="Musik"
      description="Unggah audio, susun urutan, dan pilih lagu yang tersedia sebagai musik latar pengunjung."
      width="narrow"
    >
      <MusicManager tracks={tracks} />
    </AdminPage>
  );
}
