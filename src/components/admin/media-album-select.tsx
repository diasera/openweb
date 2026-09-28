"use client";

import { useState, useTransition } from "react";
import { FolderOpen } from "lucide-react";
import { useToast } from "@/components/ui/toast";
import { fieldClass } from "@/components/ui/input";
import { getActionError } from "@/lib/action-result";
import { setMediaAlbum } from "@/app/profil/(admin)/media/album/actions";
import type { AlbumOption } from "@/lib/admin/albums";

/** Pilih album untuk satu media langsung dari kartu moderasi. */
export function MediaAlbumSelect({
  mediaId,
  albumId,
  albums,
}: {
  mediaId: string;
  albumId: string | null;
  albums: AlbumOption[];
}) {
  const { toast } = useToast();
  const [value, setValue] = useState(albumId ?? "");
  const [pending, start] = useTransition();

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
          start(async () => {
            const error = getActionError(await setMediaAlbum(mediaId, next || null));
            if (error) {
              setValue(previous);
              toast.error(error);
              return;
            }
            toast.success(next ? "Dimasukkan ke album" : "Dikeluarkan dari album");
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
