"use client";

import { useState } from "react";
import { FolderOpen } from "lucide-react";
import { fieldClass } from "@/components/ui/input";
import { useAdminAction } from "@/components/admin/use-admin-action";
import { setMediaAlbum } from "@/app/profil/(admin)/media/album/actions";
import type { AlbumOption } from "@/lib/admin/albums";

/**
 * Pilih album untuk satu media langsung dari kartu moderasi. Nilai optimistis
 * dikembalikan bila aksi gagal, dan mengikuti album tersimpan setiap data
 * server berubah (revalidasi sesudah simpan, perubahan admin lain).
 */
export function MediaAlbumSelect({
  mediaId,
  albumId,
  albums,
}: {
  mediaId: string;
  albumId: string | null;
  albums: AlbumOption[];
}) {
  const [value, setValue] = useState(albumId ?? "");
  const [syncedAlbumId, setSyncedAlbumId] = useState(albumId);
  // Sesuaikan state saat prop berubah (pola resmi React) alih-alih remount
  // lewat `key`, yang membuang fokus keyboard sesudah setiap simpan.
  if (albumId !== syncedAlbumId) {
    setSyncedAlbumId(albumId);
    setValue(albumId ?? "");
  }
  const { pending, run } = useAdminAction();

  if (albums.length === 0) return null;

  return (
    <label className={fieldClass("within", "text-muted mt-2 flex items-center gap-1.5 rounded-xl bg-transparent px-2")}>
      <FolderOpen className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
      <span className="sr-only">Album</span>
      <select
        value={value}
        disabled={pending}
        onChange={(event) => {
          const previous = value;
          const next = event.target.value;
          setValue(next);
          run(() => setMediaAlbum(mediaId, next || null), {
            successMessage: next ? "Dimasukkan ke album" : "Dikeluarkan dari album",
            errorMessage: "Album media gagal diubah. Coba lagi.",
            onError: () => setValue(previous),
          });
        }}
        className="text-foreground h-9 min-w-0 flex-1 bg-transparent text-base outline-hidden sm:text-xs disabled:opacity-50"
      >
        <option value="">Tanpa album</option>
        {albums.map((album) => (
          <option key={album.id} value={album.id}>
            {album.title}
          </option>
        ))}
      </select>
    </label>
  );
}
