import { notFound } from "next/navigation";
import { requireFeature } from "@/lib/auth";
import { getAdminEditableMedia } from "@/lib/admin/media";
import { buildAdminPageMetadata } from "@/lib/seo";
import { AdminPage } from "@/components/admin/admin-page";
import { MediaEditPanel } from "@/components/admin/media/media-edit-panel";

export const metadata = buildAdminPageMetadata("Edit Foto");

export default async function EditMediaPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireFeature("media");
  const { id } = await params;
  const media = await getAdminEditableMedia(id);
  if (!media || media.type !== "photo") notFound();

  return (
    <AdminPage
      feature="media"
      title="Edit foto"
      description="Potong, luruskan, atau beri filter. Penyuntingan tidak menyetujui atau menolak media."
      width="narrow"
    >
      <MediaEditPanel key={media.id} media={media} />
    </AdminPage>
  );
}
