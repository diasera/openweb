"use client";

import { useState } from "react";
import { Bell, LoaderCircle, Send } from "lucide-react";
import { sendNotification } from "@/app/profil/(admin)/pengunjung/actions";
import { Button } from "@/components/ui/button";
import { useAdminFormAction } from "../use-admin-form-action";
import { TextAreaField, TextField } from "../form-controls";

/**
 * Tulis notifikasi untuk pelanggan lonceng dengan pratinjau langsung bentuk
 * kartunya, sehingga admin melihat persis apa yang diterima pengunjung.
 */
export function NotificationComposer() {
  const [draft, setDraft] = useState({ title: "", body: "" });
  const { onSubmit, pending } = useAdminFormAction({
    action: sendNotification,
    successMessage: "Notifikasi terkirim",
    requestErrorMessage: "Koneksi terputus saat mengirim notifikasi. Coba lagi.",
    onSuccess: (form) => {
      form.reset();
      setDraft({ title: "", body: "" });
    },
  });

  return (
    <form onSubmit={onSubmit} className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_17rem]">
      <div className="space-y-4">
        <TextField
          label="Judul"
          id="n-title"
          name="title"
          required
          maxLength={120}
          placeholder="Ada kabar baru!"
          onChange={(event) => setDraft((value) => ({ ...value, title: event.target.value }))}
        />
        <TextAreaField
          label="Isi (opsional)"
          id="n-body"
          name="body"
          rows={2}
          maxLength={400}
          placeholder="Detail singkat…"
          onChange={(event) => setDraft((value) => ({ ...value, body: event.target.value }))}
        />
        <TextField
          label="Tautan (opsional)"
          id="n-url"
          name="url"
          maxLength={300}
          placeholder="/blog/… atau https://…"
          hint="Dibuka saat notifikasi diketuk."
        />
        <Button type="submit" disabled={pending} className="motion-sheen relative overflow-hidden">
          {pending ? (
            <LoaderCircle className="size-4 animate-spin" aria-hidden="true" />
          ) : (
            <Send className="size-4" aria-hidden="true" />
          )}
          {pending ? "Mengirim…" : "Kirim notifikasi"}
        </Button>
      </div>

      <figure aria-label="Pratinjau notifikasi" className="hidden lg:block">
        <figcaption className="text-muted mb-2 text-caption1 font-semibold uppercase tracking-wide">
          Pratinjau
        </figcaption>
        <div className="glass rounded-3xl p-3.5">
          <div className="flex items-start gap-3">
            <span className="gloss bg-primary text-primary-foreground grid size-9 shrink-0 place-items-center rounded-xl">
              <Bell className="size-4.5" aria-hidden="true" />
            </span>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold">{draft.title || "Judul notifikasi"}</p>
              <p className="text-muted line-clamp-3 text-caption1 leading-snug">
                {draft.body || "Isi singkat akan tampil di sini."}
              </p>
            </div>
          </div>
        </div>
      </figure>
    </form>
  );
}
