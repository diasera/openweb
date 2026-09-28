"use client";

import { useState } from "react";
import { AdminDialogTrigger } from "@/components/admin/admin-dialog-trigger";
import { useAdminFormAction } from "@/components/admin/use-admin-form-action";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { fieldClass, Input } from "@/components/ui/input";
import { Field } from "@/components/ui/field";
import { saveAlbum } from "@/app/profil/(admin)/media/album/actions";
import type { AlbumRow } from "@/lib/types/database";

/** Dialog tambah/edit album; acara terkait opsional (album per acara). */
export function AlbumDialog({
  album,
  events,
}: {
  album?: Pick<AlbumRow, "id" | "title" | "description" | "event_id">;
  events: Array<{ id: string; label: string }>;
}) {
  const [open, setOpen] = useState(false);
  const { onSubmit, pending } = useAdminFormAction({
    action: saveAlbum,
    successMessage: album ? "Album diperbarui" : "Album dibuat",
    requestErrorMessage: "Koneksi terputus saat menyimpan album. Coba lagi.",
    onSuccess: () => setOpen(false),
  });

  return (
    <>
      <AdminDialogTrigger
        editing={Boolean(album)}
        createLabel="Album baru"
        onClick={() => setOpen(true)}
      />
      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={album ? "Edit Album" : "Album Baru"}
      >
        <form onSubmit={onSubmit} className="space-y-4">
          <input type="hidden" name="id" value={album?.id ?? ""} />
          <Field label="Judul" htmlFor="album-title">
            <Input
              id="album-title"
              name="title"
              maxLength={120}
              defaultValue={album?.title}
              placeholder="mis. Study Tour 2026"
              required
            />
          </Field>
          <Field label="Deskripsi (opsional)" htmlFor="album-description">
            <Input
              id="album-description"
              name="description"
              maxLength={300}
              defaultValue={album?.description ?? ""}
            />
          </Field>
          <Field label="Acara terkait (opsional)" htmlFor="album-event">
            <select
              id="album-event"
              name="event_id"
              defaultValue={album?.event_id ?? ""}
              className={fieldClass("self", "h-11 w-full rounded-2xl px-3 text-base outline-hidden sm:text-subhead")}
            >
              <option value="">Tanpa acara</option>
              {events.map((event) => (
                <option key={event.id} value={event.id}>
                  {event.label}
                </option>
              ))}
            </select>
          </Field>
          <Button type="submit" disabled={pending} className="w-full">
            {pending ? "Menyimpan…" : "Simpan"}
          </Button>
        </form>
      </Modal>
    </>
  );
}
