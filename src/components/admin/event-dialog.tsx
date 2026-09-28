"use client";

import { useState } from "react";
import { AdminDialogTrigger } from "@/components/admin/admin-dialog-trigger";
import { useAdminFormAction } from "@/components/admin/use-admin-form-action";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Field } from "@/components/ui/field";
import { saveEvent } from "@/app/profil/(admin)/agenda/actions";
import type { EventRow } from "@/lib/types/database";

/** Nilai datetime-local sudah dikonversi server ke zona waktu situs. */
export interface EventDialogValue
  extends Pick<EventRow, "id" | "title" | "description" | "location" | "url" | "is_published"> {
  startsLocal: string;
  endsLocal: string;
}

export function EventDialog({
  event,
  zoneLabel,
}: {
  event?: EventDialogValue;
  zoneLabel: string;
}) {
  const [open, setOpen] = useState(false);
  const { onSubmit, pending } = useAdminFormAction({
    action: saveEvent,
    successMessage: event ? "Acara diperbarui" : "Acara ditambahkan",
    requestErrorMessage: "Koneksi terputus saat menyimpan acara. Coba lagi.",
    onSuccess: () => setOpen(false),
  });

  return (
    <>
      <AdminDialogTrigger
        editing={Boolean(event)}
        createLabel="Acara baru"
        onClick={() => setOpen(true)}
      />
      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={event ? "Edit Acara" : "Acara Baru"}
      >
        <form onSubmit={onSubmit} className="space-y-4">
          <input type="hidden" name="id" value={event?.id ?? ""} />
          <Field label="Judul" htmlFor="event-title">
            <Input
              id="event-title"
              name="title"
              maxLength={120}
              defaultValue={event?.title}
              placeholder="mis. Rapat anggota bulanan"
              required
            />
          </Field>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label={`Mulai (${zoneLabel})`} htmlFor="event-start">
              <Input
                id="event-start"
                name="starts_local"
                type="datetime-local"
                defaultValue={event?.startsLocal}
                required
              />
            </Field>
            <Field label={`Selesai (${zoneLabel}, opsional)`} htmlFor="event-end">
              <Input
                id="event-end"
                name="ends_local"
                type="datetime-local"
                defaultValue={event?.endsLocal}
              />
            </Field>
          </div>
          <Field label="Lokasi (opsional)" htmlFor="event-location">
            <Input
              id="event-location"
              name="location"
              maxLength={120}
              defaultValue={event?.location ?? ""}
            />
          </Field>
          <Field label="Deskripsi (opsional)" htmlFor="event-description">
            <Textarea
              id="event-description"
              name="description"
              rows={3}
              maxLength={1000}
              defaultValue={event?.description ?? ""}
            />
          </Field>
          <Field label="Tautan pendaftaran/info (opsional)" htmlFor="event-url">
            <Input
              id="event-url"
              name="url"
              maxLength={300}
              defaultValue={event?.url ?? ""}
              placeholder="https://… atau /blog/…"
            />
          </Field>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              name="is_published"
              defaultChecked={event?.is_published ?? true}
              className="accent-primary h-4 w-4"
            />
            Tampilkan ke publik
          </label>
          <Button type="submit" disabled={pending} className="w-full">
            {pending ? "Menyimpan…" : "Simpan"}
          </Button>
        </form>
      </Modal>
    </>
  );
}
