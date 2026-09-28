"use client";

import { useState } from "react";
import { UserCog } from "lucide-react";
import { useAdminFormAction } from "@/components/admin/use-admin-form-action";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field } from "@/components/ui/field";
import { cardClass } from "@/components/ui/card";
import { updateOwnAccountAction } from "@/lib/auth/actions";

/** Pengaturan akun sendiri (termasuk owner): nama dan password. */
export function AccountDialog({ name }: { name: string }) {
  const [open, setOpen] = useState(false);
  const [note, setNote] = useState("");
  const { onSubmit, pending } = useAdminFormAction({
    action: updateOwnAccountAction,
    successMessage: "Akun diperbarui",
    successDescription: "Password baru mengeluarkan sesi di perangkat lain.",
    requestErrorMessage: "Koneksi terputus saat menyimpan akun. Coba lagi.",
    onStart: () => setNote(""),
    onError: setNote,
    onSuccess: () => setOpen(false),
  });

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={cardClass(
          "interactive",
          "flex min-h-24 w-full flex-col items-start justify-between p-4 text-left",
        )}
      >
        <UserCog className="text-muted h-5 w-5" aria-hidden="true" />
        <span className="mt-4 text-sm font-semibold">Akun saya</span>
      </button>

      <Modal open={open} onClose={() => setOpen(false)} title="Akun saya">
        <form onSubmit={onSubmit} className="space-y-4">
          <Field label="Nama" htmlFor="acc-name">
            <Input
              id="acc-name"
              name="name"
              defaultValue={name}
              autoComplete="name"
              required
            />
          </Field>
          <Field label="Password saat ini" htmlFor="acc-current">
            <Input
              id="acc-current"
              name="currentPassword"
              type="password"
              autoComplete="current-password"
              required
            />
          </Field>
          <Field label="Password baru (opsional)" htmlFor="acc-new">
            <Input
              id="acc-new"
              name="newPassword"
              type="password"
              minLength={8}
              autoComplete="new-password"
              placeholder="Kosongkan jika tidak diubah"
            />
          </Field>
          <Field label="Ulangi password baru" htmlFor="acc-confirm">
            <Input
              id="acc-confirm"
              name="confirm"
              type="password"
              autoComplete="new-password"
            />
          </Field>

          {note && <p className="text-danger text-sm">{note}</p>}
          <Button type="submit" disabled={pending} className="w-full">
            {pending ? "Menyimpan…" : "Simpan"}
          </Button>
        </form>
      </Modal>
    </>
  );
}
