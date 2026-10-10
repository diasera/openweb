import { ExternalLink, FolderOpen } from "lucide-react";
import { requireFeature } from "@/lib/auth";
import { getAdminAlbums } from "@/lib/admin/albums";
import { getAdminEventOptions } from "@/lib/admin/events";
import { isSchemaOutdatedError, SCHEMA_OUTDATED_MESSAGE } from "@/lib/database/errors";
import { buildAdminPageMetadata } from "@/lib/seo";
import { formatEventSchedule } from "@/lib/utils/time";
import { EmptyState } from "@/components/ui/empty-state";
import { AdminPage } from "@/components/admin/admin-page";
import { AdminList, AdminRow, LeadingIcon, StatusBadge } from "@/components/admin/admin-list";
import { DeleteAction, IconLink } from "@/components/admin/admin-actions";
import { AlbumDialog } from "@/components/admin/media/album-dialog";
import { deleteAlbum } from "./actions";

export const metadata = buildAdminPageMetadata("Album");

export default async function AlbumAdminPage() {
  await requireFeature("media");
  const [{ albums, error }, events] = await Promise.all([
    getAdminAlbums(),
    getAdminEventOptions(),
  ]);
  const eventOptions = events.map((event) => ({
    id: event.id,
    label: `${event.title} · ${formatEventSchedule(event.starts_at)}`,
  }));

  return (
    <AdminPage
      feature="media"
      title="Album"
      description="Kelompokkan foto & video per acara. Masukkan media ke album langsung dari kartu moderasi."
      actions={<AlbumDialog events={eventOptions} />}
      width="wide"
    >
      {error ? (
        <EmptyState
          icon={<FolderOpen className="size-8" />}
          title="Album belum aktif"
          description={
            isSchemaOutdatedError(error)
              ? SCHEMA_OUTDATED_MESSAGE
              : "Daftar album gagal dimuat. Coba muat ulang."
          }
        />
      ) : albums.length === 0 ? (
        <EmptyState
          icon={<FolderOpen className="size-8" />}
          title="Belum ada album"
          description="Buat album seperti “Study Tour 2026”, lalu masukkan media dari halaman Media."
        />
      ) : (
        <AdminList label="Album">
          {albums.map((album, index) => (
            <AdminRow
              key={album.id}
              index={index}
              leading={<LeadingIcon icon={FolderOpen} className="bg-tone-indigo/12 text-tone-indigo-text" />}
              title={album.title}
              badges={
                album.media_count === 0 ? (
                  <StatusBadge tone="outline">Kosong · tidak tampil</StatusBadge>
                ) : undefined
              }
              meta={`${album.media_count} media tampil${album.event_title ? ` · ${album.event_title}` : ""}`}
              actions={
                <>
                  <IconLink
                    href={`/album/${album.slug}`}
                    target="_blank"
                    label="Buka album publik"
                    icon={<ExternalLink />}
                  />
                  <AlbumDialog album={album} events={eventOptions} />
                  <DeleteAction
                    action={deleteAlbum}
                    id={album.id}
                    title={`Hapus album "${album.title}"?`}
                    message="Media di dalamnya tetap ada, hanya dilepas dari album."
                    successMessage="Album dihapus"
                  />
                </>
              }
            />
          ))}
        </AdminList>
      )}
    </AdminPage>
  );
}
