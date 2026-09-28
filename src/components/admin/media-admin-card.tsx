"use client";

import Link from "next/link";
import { Check, X, Pin, PinOff, Trash2, Pencil } from "lucide-react";
import { Chip } from "@/components/ui/chip";
import { Card } from "@/components/ui/card";
import { AdminActionButton } from "@/components/admin/admin-action-button";
import { BanIpButton } from "@/components/admin/confirmed-action-button";
import { MediaAlbumSelect } from "@/components/admin/media-album-select";
import { MediaCarousel } from "@/components/ui/media-carousel";
import type { AdminMediaItem } from "@/lib/admin/media";
import type { AlbumOption } from "@/lib/admin/albums";
import {
  approveMedia,
  rejectMedia,
  togglePinMedia,
  deleteMedia,
  banMediaIp,
} from "@/app/profil/(admin)/media/actions";

const ICON_ACTION_CLASS =
  "border-border hover:bg-surface-2 grid h-11 w-11 place-items-center rounded-xl border transition disabled:opacity-40";

/** Kartu media admin dengan aksi moderasi (ACC/tolak/pin/ban/hapus). */
export function MediaAdminCard({
  media,
  albums,
}: {
  media: AdminMediaItem;
  albums: AlbumOption[];
}) {
  // Signed URL inbox berumur pendek: jangan disimpan cache optimizer Next.
  const signedPreview = media.status !== "approved";

  return (
    <Card variant="elevated" className="overflow-hidden p-0">
      <div className="relative">
        {/* Moderator wajib bisa menggeser dan melihat SETIAP item carousel
            (termasuk isi video) sebelum menyetujui pin. */}
        <MediaCarousel
          slides={media.slides}
          label={media.title || "Pratinjau media"}
          aspectRatio={1}
          sizes="220px"
          fit="cover"
          unoptimized={signedPreview}
          videoMuted
        />
        {media.is_pinned && (
          <span className="pointer-events-none absolute left-2 top-2 z-10">
            <Chip variant="primary">Pinned</Chip>
          </span>
        )}
      </div>

      <div className="p-2.5">
        <p className="line-clamp-2 min-h-8 text-xs">
          {media.caption || <span className="text-muted">Tanpa keterangan</span>}
        </p>
        <p className="text-muted mt-1 text-caption2">
          {media.source === "public" ? "Publik" : "Admin"} · {media.status}
          {media.slides.length > 1 && ` · ${media.slides.length} item`}
        </p>

        <MediaAlbumSelect mediaId={media.id} albumId={media.album_id} albums={albums} />

        <div className="mt-2 flex flex-wrap gap-1">
          {media.type === "photo" && (
            <Link
              href={`/profil/media/${media.id}/edit`}
              title="Edit foto"
              aria-label="Edit foto"
              className={ICON_ACTION_CLASS}
            >
              <Pencil className="h-4 w-4" />
            </Link>
          )}
          {media.status !== "approved" && (
            <AdminActionButton
              action={() => approveMedia(media.id)}
              successMessage="Media disetujui"
              variant="ghost"
              className={`${ICON_ACTION_CLASS} text-success p-0`}
              aria-label="Setujui"
              title="Setujui"
            >
              <Check className="h-4 w-4" />
            </AdminActionButton>
          )}
          {media.status !== "rejected" && (
            <AdminActionButton
              action={() => rejectMedia(media.id)}
              successMessage="Media ditolak"
              variant="ghost"
              className={`${ICON_ACTION_CLASS} p-0`}
              aria-label="Tolak"
              title="Tolak"
            >
              <X className="h-4 w-4" />
            </AdminActionButton>
          )}
          {media.status === "approved" && (
            <AdminActionButton
              action={() => togglePinMedia(media.id, !media.is_pinned)}
              successMessage={
                media.is_pinned ? "Dilepas dari depan" : "Disematkan ke depan"
              }
              variant="ghost"
              className={`${ICON_ACTION_CLASS} p-0 ${
                media.is_pinned ? "text-primary-readable" : ""
              }`}
              aria-label={media.is_pinned ? "Lepas dari depan" : "Pin ke depan"}
              aria-pressed={media.is_pinned}
              title={media.is_pinned ? "Lepas dari depan" : "Pin ke depan"}
            >
              {media.is_pinned ? (
                <PinOff className="h-4 w-4" />
              ) : (
                <Pin className="h-4 w-4" />
              )}
            </AdminActionButton>
          )}
          {media.has_ip && (
            <BanIpButton
              action={banMediaIp}
              id={media.id}
              message="Blokir IP ini? Media terkait akan ditolak."
              className="border-border h-11 w-11 rounded-xl border"
            />
          )}
          <AdminActionButton
            action={() => deleteMedia(media.id)}
            confirmMessage="Hapus media ini permanen?"
            successMessage="Media dihapus"
            errorMessage="Gagal. Coba lagi."
            variant="ghost"
            className={`${ICON_ACTION_CLASS} text-danger p-0`}
            aria-label="Hapus"
            title="Hapus"
          >
            <Trash2 className="h-4 w-4" />
          </AdminActionButton>
        </div>
      </div>
    </Card>
  );
}
