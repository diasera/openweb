"use client";

import { useState } from "react";
import { AdminDialogTrigger } from "@/components/admin/admin-dialog-trigger";
import { useAdminFormAction } from "@/components/admin/use-admin-form-action";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field } from "@/components/ui/field";
import { ADMIN_FEATURE_META, ASSIGNABLE_FEATURES } from "@/lib/constants";
import { createAdmin, updateAdmin } from "@/app/profil/(admin)/admin/actions";
import type { AdminRow } from "@/lib/types/database";

/** Dialog tambah/edit admin dari area Profil + centang izin fitur. */
export function AdminDialog({ admin }: { admin?: AdminRow }) {
  const [open, setOpen] = useState(false);
  const [note, setNote] = useState("");
  const editing = Boolean(admin);
  const { onSubmit, pending } = useAdminFormAction({
    action: editing ? updateAdmin : createAdmin,
    successMessage: editing ? "Admin diperbarui" : "Admin ditambahkan",
    requestErrorMessage: "Koneksi terputus saat menyimpan admin. Coba lagi.",
    onStart: () => setNote(""),
    onError: setNote,
    onSuccess: () => setOpen(false),
  });

  return (
    <>
      <AdminDialogTrigger
        editing={editing}
        createLabel="Tambah admin"
        onClick={() => setOpen(true)}
      />

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={editing ? "Edit Admin" : "Tambah Admin"}
      >
        <form onSubmit={onSubmit} className="space-y-4">
          {admin && <input type="hidden" name="id" value={admin.id} />}

          <Field label="Nama" htmlFor="a-name">
            <Input id="a-name" name="name" defaultValue={admin?.name} required />
          </Field>

          {!editing && (
            <Field label="Username" htmlFor="a-user">
              <Input id="a-user" name="username" required placeholder="username" />
            </Field>
          )}

          <Field
            label={editing ? "Password baru (opsional)" : "Password"}
            htmlFor="a-pass"
          >
            <Input
              id="a-pass"
              name="password"
              type="password"
              minLength={8}
              required={!editing}
              placeholder={editing ? "Kosongkan jika tidak diubah" : "Min. 8 karakter"}
            />
          </Field>

          <div>
            <p className="mb-2 text-sm font-medium">Izin fitur</p>
            <div className="grid grid-cols-2 gap-2">
              {ASSIGNABLE_FEATURES.map((f) => (
                <label
                  key={f}
                  className="border-border flex items-center gap-2 rounded-xl border px-3 py-2 text-sm"
                >
                  <input
                    type="checkbox"
                    name={`perm_${f}`}
                    defaultChecked={admin?.permissions?.[f] ?? false}
                    className="accent-primary h-4 w-4"
                  />
                  {ADMIN_FEATURE_META[f].label}
                </label>
              ))}
            </div>
          </div>

          {editing && (
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                name="is_active"
                defaultChecked={admin?.is_active ?? true}
                className="accent-primary h-4 w-4"
              />
              Akun aktif
            </label>
          )}

          {note && <p className="text-danger text-sm">{note}</p>}
          <Button type="submit" disabled={pending} className="w-full">
            {pending ? "Menyimpan…" : "Simpan"}
          </Button>
        </form>
      </Modal>
    </>
  );
}
