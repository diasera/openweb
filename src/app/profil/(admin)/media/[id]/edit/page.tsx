import { notFound } from "next/navigation";
import { requireFeature } from "@/lib/auth";
import { getAdminEditableMedia } from "@/lib/admin/media";
import { buildAdminPageMetadata } from "@/lib/seo";
import { MediaEditPage } from "@/components/admin/media-edit-page";
import { PageHeader } from "@/components/admin/page-header";

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
    <div>
      <PageHeader
        title="Edit foto"
        description="Penyuntingan bersifat opsional dan tidak mengubah status moderasi media."
      />
      <MediaEditPage key={media.id} media={media} />
    </div>
  );
}
