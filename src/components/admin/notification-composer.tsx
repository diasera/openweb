"use client";

import { useState } from "react";
import { Send } from "lucide-react";
import { useAdminFormAction } from "@/components/admin/use-admin-form-action";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Field } from "@/components/ui/field";
import { sendNotification } from "@/app/profil/(admin)/pengunjung/actions";

/** Form admin untuk mengirim notifikasi kepada pelanggan lonceng. */
export function NotificationComposer() {
  const [note, setNote] = useState<{ ok: boolean; text: string } | null>(null);
  const { onSubmit, pending } = useAdminFormAction({
    action: sendNotification,
    successMessage: "Notifikasi terkirim",
    requestErrorMessage: "Koneksi terputus saat mengirim notifikasi. Coba lagi.",
    onStart: () => setNote(null),
    onError: (message) => setNote({ ok: false, text: message }),
    onSuccess: (form) => {
      form.reset();
      setNote({ ok: true, text: "Notifikasi terkirim." });
    },
  });

  return (
    <form onSubmit={onSubmit} className="space-y-3">
      <Field label="Judul" htmlFor="n-title">
        <Input id="n-title" name="title" required placeholder="Ada kabar baru!" />
      </Field>
      <Field label="Isi (opsional)" htmlFor="n-body">
        <Textarea id="n-body" name="body" rows={2} placeholder="Detail singkat…" />
      </Field>
      <Field label="Tautan (opsional)" htmlFor="n-url">
        <Input id="n-url" name="url" placeholder="/blog/..." />
      </Field>
      {note && (
        <p className={note.ok ? "text-success text-sm" : "text-danger text-sm"}>
          {note.text}
        </p>
      )}
      <Button type="submit" disabled={pending}>
        <Send className="h-4 w-4" /> {pending ? "Mengirim…" : "Kirim notifikasi"}
      </Button>
    </form>
  );
}
