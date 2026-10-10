"use client";

import { Check, Pencil, Star, StarOff, X } from "lucide-react";
import { MediaCarousel } from "@/components/ui/media-carousel";
import { RelativeTime } from "@/components/ui/relative-time";
import { cardClass } from "@/components/ui/card";
import type { AdminMediaItem } from "@/lib/admin/media";
import type { AlbumOption } from "@/lib/admin/albums";
import { adminMediaEditHref } from "@/lib/constants";
import { cn } from "@/lib/utils/cn";
import {
  approveMedia,
  banMediaIp,
  deleteMedia,
  rejectMedia,
  togglePinMedia,
} from "@/app/profil/(admin)/media/actions";
import {
  AdminActionButton,
  BanIpAction,
  DeleteAction,
  IconAction,
  IconLink,
} from "../admin-actions";
import { MediaAlbumSelect } from "./media-album-select";
import { MEDIA_STATUS } from "./media-status";

/**
 * Kartu moderasi satu pin: carousel penuh (moderator wajib bisa melihat
 * SETIAP slide, termasuk video, sebelum menyetujui), status di atas media,
 * keterangan, album, lalu aksi. Kiriman yang menunggu mendapat tombol
 * Setujui/Tolak besar; aksi lain berupa ikon dengan label aksesibel.
 * Satu pensil "Edit postingan" membuka semuanya sekaligus: media (edit foto
 * item ke-n, tambah, urutkan, sampul) beserta teks, album, dan sorotan.
 */
export function MediaModerationCard({
  media,
  albums,
}: {
  media: AdminMediaItem;
  albums: AlbumOption[];
}) {
  // Signed URL inbox berumur pendek: jangan disimpan cache optimizer Next.
  const signedPreview = media.status !== "approved";
  const status = MEDIA_STATUS[media.status];
  const label = media.title || media.caption || "Pratinjau media";

  return (
    <article
      className={cardClass(
        "elevated",
        cn("flex h-full flex-col overflow-hidden p-0", media.status === "pending" && "border-tone-orange/40"),
      )}
    >
      <div className="relative">
        <MediaCarousel
          slides={media.slides}
          label={label}
          aspectRatio={1}
          sizes="(max-width: 639px) 50vw, (max-width: 1023px) 33vw, 240px"
          fit="cover"
          unoptimized={signedPreview}
          videoMuted
        />
        <span className="pointer-events-none absolute left-2 top-2 z-10 flex flex-col items-start gap-1">
          <span
            className={cn(
              "flex items-center gap-1.5 rounded-full px-2 py-0.5 text-caption2 font-bold shadow-sm",
              status.className,
            )}
          >
            {media.status === "pending" && <span className="motion-live-dot size-1.5" aria-hidden="true" />}
            {status.label}
          </span>
          {media.is_pinned && (
            <span className="bg-primary text-primary-foreground flex items-center gap-1 rounded-full px-2 py-0.5 text-caption2 font-bold shadow-sm">
              <Star className="size-3 fill-current" aria-hidden="true" />
              Sorotan
            </span>
          )}
        </span>
      </div>

      <div className="flex flex-1 flex-col gap-2 p-3">
        <div className="min-w-0">
          <p className="line-clamp-2 min-h-8 text-xs leading-relaxed">
            {media.title && <span className="font-semibold">{media.title} · </span>}
            {media.caption || (!media.title && <span className="text-muted">Tanpa keterangan</span>)}
          </p>
          <p className="text-muted mt-1 truncate text-caption2">
            {media.source === "public" ? media.uploader_name || "Pengunjung" : "Admin"} ·{" "}
            <RelativeTime iso={media.created_at} />
            {media.slides.length > 1 && ` · ${media.slides.length} item`}
          </p>
        </div>

        <MediaAlbumSelect mediaId={media.id} albumId={media.album_id} albums={albums} />

        {media.status === "pending" && (
          <div className="grid grid-cols-2 gap-1.5">
            <AdminActionButton
              size="sm"
              action={() => approveMedia(media.id)}
              successMessage="Media disetujui"
              className="bg-tone-green text-white"
            >
              <Check className="size-4" aria-hidden="true" />
              Setujui
            </AdminActionButton>
            <AdminActionButton
              size="sm"
              variant="secondary"
              action={() => rejectMedia(media.id)}
              successMessage="Media ditolak"
            >
              <X className="size-4" aria-hidden="true" />
              Tolak
            </AdminActionButton>
          </div>
        )}

        <div className="border-border/70 -mx-1 mt-auto flex flex-wrap items-center gap-0.5 border-t pt-1.5">
          {media.status === "rejected" && (
            <IconAction
              label="Setujui"
              icon={<Check />}
              tone="success"
              action={() => approveMedia(media.id)}
              successMessage="Media disetujui"
            />
          )}
          {media.status === "approved" && (
            <>
              <IconAction
                label={media.is_pinned ? "Lepas dari sorotan" : "Jadikan sorotan beranda"}
                icon={media.is_pinned ? <StarOff /> : <Star />}
                tone={media.is_pinned ? "primary" : "neutral"}
                pressed={media.is_pinned}
                action={() => togglePinMedia(media.id, !media.is_pinned)}
                successMessage={media.is_pinned ? "Dilepas dari sorotan" : "Tampil di sorotan beranda"}
              />
              <IconAction
                label="Tolak"
                icon={<X />}
                action={() => rejectMedia(media.id)}
                successMessage="Media ditolak"
                confirm={{
                  title: "Tarik media dari publik?",
                  message: "Media disembunyikan dari galeri dan berkasnya kembali privat.",
                  confirmLabel: "Tolak",
                }}
              />
            </>
          )}
          <IconLink
            href={adminMediaEditHref(media.id)}
            label="Edit postingan (media, teks, album)"
            icon={<Pencil />}
          />
          <span className="flex-1" />
          {media.has_ip && (
            <BanIpAction
              action={banMediaIp}
              id={media.id}
              message="IP ini diblokir dan media ini ditolak."
            />
          )}
          <DeleteAction
            action={deleteMedia}
            id={media.id}
            title="Hapus media permanen?"
            message="Berkas sampul dan seluruh slide ikut dihapus dari penyimpanan."
            successMessage="Media dihapus"
          />
        </div>
      </div>
    </article>
  );
}
