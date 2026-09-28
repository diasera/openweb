import Link from "next/link";
import { ExternalLink, FolderOpen } from "lucide-react";
import { requireFeature } from "@/lib/auth";
import { getAdminAlbums } from "@/lib/admin/albums";
import { getAdminEventOptions } from "@/lib/admin/events";
import { isSchemaOutdatedError, SCHEMA_OUTDATED_MESSAGE } from "@/lib/database/errors";
import { buildAdminPageMetadata } from "@/lib/seo";
import { formatEventSchedule } from "@/lib/utils/time";
import { PageHeader } from "@/components/ui/page-header";
import { AlbumDialog } from "@/components/admin/album-dialog";
import { DeleteButton } from "@/components/admin/confirmed-action-button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
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
    <div>
      <PageHeader
        title="Album"
        description="Kelompokkan foto & video per acara. Pilih album langsung dari kartu media."
        action={<AlbumDialog events={eventOptions} />}
      />

      {error ? (
        <EmptyState
          icon={<FolderOpen className="h-8 w-8" />}
          title="Album belum aktif"
          description={
            isSchemaOutdatedError(error)
              ? SCHEMA_OUTDATED_MESSAGE
              : "Daftar album gagal dimuat. Coba muat ulang."
          }
        />
      ) : albums.length === 0 ? (
        <EmptyState
          icon={<FolderOpen className="h-8 w-8" />}
          title="Belum ada album"
          description="Buat album seperti “Study Tour 2026”, lalu masukkan media dari halaman Media."
        />
      ) : (
        <div className="space-y-2">
          {albums.map((album) => (
            <Card key={album.id} className="flex items-center gap-3 p-3">
              <span className="bg-surface-2 text-muted grid h-11 w-11 shrink-0 place-items-center rounded-xl">
                <FolderOpen className="h-5 w-5" aria-hidden="true" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate font-semibold">{album.title}</p>
                <p className="text-muted truncate text-xs">
                  {album.media_count} media tampil
                  {album.event_title ? ` · ${album.event_title}` : ""}
                </p>
              </div>
              <Link
                href={`/album/${album.slug}`}
                target="_blank"
                aria-label="Buka album publik"
                title="Buka album publik"
                className="text-muted hover:bg-surface-2 grid h-9 w-9 shrink-0 place-items-center rounded-lg"
              >
                <ExternalLink className="size-4.5" />
              </Link>
              <AlbumDialog album={album} events={eventOptions} />
              <DeleteButton
                action={deleteAlbum}
                id={album.id}
                message={`Hapus album "${album.title}"? Media di dalamnya tetap ada.`}
              />
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
