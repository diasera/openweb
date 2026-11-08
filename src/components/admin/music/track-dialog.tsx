"use client";

import { updateMusicTrack } from "@/app/profil/(admin)/music/actions";
import type { MusicTrackRow } from "@/lib/types/database";
import { AdminFormDialog } from "../admin-form-dialog";
import { TextField } from "../form-controls";

/** Edit judul/artis lagu di playlist; berkas audionya tidak diunggah ulang. */
export function TrackDialog({ track }: { track: Pick<MusicTrackRow, "id" | "title" | "artist"> }) {
  return (
    <AdminFormDialog
      mode="edit"
      title="Edit lagu"
      editLabel={`Edit lagu “${track.title}”`}
      action={updateMusicTrack}
      successMessage="Lagu diperbarui"
      requestErrorMessage="Koneksi terputus saat menyimpan lagu. Coba lagi."
      hidden={{ id: track.id }}
    >
      <TextField
        label="Judul lagu"
        id={`track-title-${track.id}`}
        name="title"
        maxLength={120}
        defaultValue={track.title}
        required
      />
      <TextField
        label="Artis / pencipta"
        id={`track-artist-${track.id}`}
        name="artist"
        maxLength={120}
        defaultValue={track.artist ?? ""}
      />
    </AdminFormDialog>
  );
}
