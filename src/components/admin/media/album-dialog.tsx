"use client";

import { saveAlbum } from "@/app/profil/(admin)/media/album/actions";
import type { AlbumRow } from "@/lib/types/database";
import { AdminFormDialog } from "../admin-form-dialog";
import { SelectField, TextAreaField, TextField } from "../form-controls";

/** Dialog tambah/edit album; acara terkait opsional (album per acara). */
export function AlbumDialog({
  album,
  events,
}: {
  album?: Pick<AlbumRow, "id" | "title" | "description" | "event_id">;
  events: ReadonlyArray<{ id: string; label: string }>;
}) {
  return (
    <AdminFormDialog
      mode={album ? "edit" : "create"}
      title={album ? "Edit album" : "Album baru"}
      createLabel="Album baru"
      action={saveAlbum}
      successMessage={album ? "Album diperbarui" : "Album dibuat"}
      requestErrorMessage="Koneksi terputus saat menyimpan album. Coba lagi."
      hidden={{ id: album?.id ?? "" }}
    >
      <TextField
        label="Judul"
        id="album-title"
        name="title"
        maxLength={120}
        defaultValue={album?.title}
        placeholder="mis. Study Tour 2026"
        required
      />
      <TextAreaField
        label="Deskripsi (opsional)"
        id="album-description"
        name="description"
        rows={2}
        maxLength={300}
        defaultValue={album?.description ?? ""}
      />
      <SelectField
        label="Acara terkait (opsional)"
        id="album-event"
        name="event_id"
        defaultValue={album?.event_id ?? ""}
        options={[{ value: "", label: "Tanpa acara" }, ...events.map((event) => ({ value: event.id, label: event.label }))]}
        hint="Album yang terhubung tampil di kartu acara pada halaman Agenda."
      />
    </AdminFormDialog>
  );
}
