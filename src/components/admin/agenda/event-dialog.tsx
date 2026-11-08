"use client";

import { saveEvent } from "@/app/profil/(admin)/agenda/actions";
import type { EventRow } from "@/lib/types/database";
import { AdminFormDialog } from "../admin-form-dialog";
import { SwitchField, TextAreaField, TextField } from "../form-controls";

/** Nilai datetime-local sudah dikonversi server ke zona waktu situs. */
export interface EventDialogValue
  extends Pick<EventRow, "id" | "title" | "description" | "location" | "url" | "is_published"> {
  startsLocal: string;
  endsLocal: string;
}

/** Dialog tambah/edit acara dengan waktu di zona situs. */
export function EventDialog({
  event,
  zoneLabel,
}: {
  event?: EventDialogValue;
  zoneLabel: string;
}) {
  return (
    <AdminFormDialog
      mode={event ? "edit" : "create"}
      title={event ? "Edit acara" : "Acara baru"}
      createLabel="Acara baru"
      action={saveEvent}
      successMessage={event ? "Acara diperbarui" : "Acara ditambahkan"}
      requestErrorMessage="Koneksi terputus saat menyimpan acara. Coba lagi."
      hidden={{ id: event?.id ?? "" }}
      validate={(formData) => {
        const starts = String(formData.get("starts_local") ?? "");
        const ends = String(formData.get("ends_local") ?? "");
        return ends && starts && ends < starts
          ? "Waktu selesai harus setelah waktu mulai."
          : null;
      }}
    >
      <TextField
        label="Judul"
        id="event-title"
        name="title"
        maxLength={120}
        defaultValue={event?.title}
        placeholder="mis. Rapat anggota bulanan"
        required
      />
      <div className="grid gap-4 sm:grid-cols-2">
        <TextField
          label={`Mulai (${zoneLabel})`}
          id="event-start"
          name="starts_local"
          type="datetime-local"
          defaultValue={event?.startsLocal}
          required
        />
        <TextField
          label={`Selesai (${zoneLabel}, opsional)`}
          id="event-end"
          name="ends_local"
          type="datetime-local"
          defaultValue={event?.endsLocal}
        />
      </div>
      <TextField
        label="Lokasi (opsional)"
        id="event-location"
        name="location"
        maxLength={120}
        defaultValue={event?.location ?? ""}
      />
      <TextAreaField
        label="Deskripsi (opsional)"
        id="event-description"
        name="description"
        rows={3}
        maxLength={1000}
        defaultValue={event?.description ?? ""}
      />
      <TextField
        label="Tautan pendaftaran/info (opsional)"
        id="event-url"
        name="url"
        maxLength={300}
        defaultValue={event?.url ?? ""}
        placeholder="https://… atau /blog/…"
      />
      <SwitchField
        name="is_published"
        title="Tampilkan ke publik"
        description="Acara draf hanya terlihat di sini; acara publik terdekat muncul dengan hitung mundur di bilah atas."
        defaultChecked={event?.is_published ?? true}
      />
    </AdminFormDialog>
  );
}
