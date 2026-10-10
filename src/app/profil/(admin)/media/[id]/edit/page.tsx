import { notFound } from "next/navigation";
import { requireFeature } from "@/lib/auth";
import { getAdminEditableMedia } from "@/lib/admin/media";
import { getAdminAlbumOptions } from "@/lib/admin/albums";
import { buildAdminPageMetadata } from "@/lib/seo";
import { AdminPage } from "@/components/admin/admin-page";
import { MediaPostEditor } from "@/components/admin/media/media-post-editor";

export const metadata = buildAdminPageMetadata("Edit Postingan");

export default async function EditMediaPostPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireFeature("media");
  const { id } = await params;
  const [media, albums] = await Promise.all([getAdminEditableMedia(id), getAdminAlbumOptions()]);
  if (!media) notFound();

  return (
    <AdminPage
      feature="media"
      title="Edit postingan"
      description="Media, teks, album, dan sorotan pin ini dalam satu tempat. Tombol Simpan muncul di atas begitu ada perubahan."
      width="wide"
    >
      {/* Susunan media baru setelah simpan = editor baru dengan data terbaru. */}
      <MediaPostEditor
        key={media.items.map((item) => item.url).join("|")}
        media={media}
        albums={albums}
      />
    </AdminPage>
  );
}
