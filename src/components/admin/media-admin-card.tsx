"use client";

import Image from "next/image";
import Link from "next/link";
import { Check, X, Pin, PinOff, Trash2, Pencil, Play } from "lucide-react";
import { gradientCss } from "@/lib/utils/color";
import { Chip } from "@/components/ui/chip";
import { Card } from "@/components/ui/card";
import { AdminActionButton } from "@/components/admin/admin-action-button";
import { BanIpButton } from "@/components/admin/confirmed-action-button";
import type { MediaRow } from "@/lib/types/database";
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
export function MediaAdminCard({ media }: { media: MediaRow }) {
  const previewUrl = media.type === "video" ? media.thumbnail_url : media.url;

  return (
    <Card variant="elevated" className="overflow-hidden p-0">
      <div className="bg-surface-2 relative aspect-square">
        {previewUrl ? (
          <Image
            src={previewUrl}
            alt={media.title || "Pratinjau media"}
            fill
            sizes="220px"
            className="object-cover"
          />
        ) : (
          <div className="absolute inset-0" style={{ background: gradientCss(media.id) }} />
        )}
        {media.type === "video" && (
          <>
            <span className="glass absolute left-2 top-2 rounded-full px-2 py-0.5 text-[11px] font-medium">
              Video
            </span>
            <span className="glass absolute left-1/2 top-1/2 grid h-10 w-10 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full">
              <Play className="h-4 w-4 fill-current" aria-hidden="true" />
            </span>
          </>
        )}
        {media.is_pinned && (
          <span className="absolute right-2 top-2">
            <Chip variant="primary">Pinned</Chip>
          </span>
        )}
      </div>

      <div className="p-2.5">
        <p className="line-clamp-2 min-h-[2rem] text-xs">
          {media.caption || <span className="text-muted">Tanpa keterangan</span>}
        </p>
        <p className="text-muted mt-1 text-[11px]">
          {media.source === "public" ? "Publik" : "Admin"} · {media.status}
        </p>

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
          {media.ip_address && (
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
