"use client";

import { ASSIGNABLE_FEATURES } from "@/lib/constants";
import { createAdmin, updateAdmin } from "@/app/profil/(admin)/admin/actions";
import type { AdminAccount } from "@/lib/types/database";
import { AdminFormDialog } from "../admin-form-dialog";
import { ADMIN_FEATURE_PRESENTATION, adminFeatureLabel } from "../features";
import { ChoiceChip, PasswordField, SwitchField, TextField } from "../form-controls";

/** Dialog owner untuk menambah/mengubah akun admin beserta izin per fitur. */
export function AdminUserDialog({ admin }: { admin?: AdminAccount }) {
  const editing = Boolean(admin);

  return (
    <AdminFormDialog
      mode={editing ? "edit" : "create"}
      title={editing ? `Edit ${admin?.name}` : "Tambah admin"}
      description="Admin hanya melihat menu yang dicentang. Menu Admin dan Pengaturan khusus owner."
      createLabel="Tambah admin"
      action={editing ? updateAdmin : createAdmin}
      successMessage={editing ? "Admin diperbarui" : "Admin ditambahkan"}
      requestErrorMessage="Koneksi terputus saat menyimpan admin. Coba lagi."
      hidden={admin ? { id: admin.id } : undefined}
    >
      {/* autoComplete eksplisit: tanpa ini password manager menganggap form
          ini login dan bisa mengisi password owner ke "Password", sehingga
          menyimpan izin diam-diam mereset password admin lain. */}
      <div className="grid gap-4 sm:grid-cols-2">
        <TextField
          label="Nama"
          id="a-name"
          name="name"
          defaultValue={admin?.name}
          required
          maxLength={60}
          autoComplete="off"
        />
        {editing ? (
          <TextField
            label="Username"
            id="a-user"
            value={`@${admin?.username}`}
            readOnly
            disabled
            hint="Username tidak dapat diubah."
          />
        ) : (
          <TextField
            label="Username"
            id="a-user"
            name="username"
            required
            minLength={3}
            maxLength={30}
            placeholder="huruf, angka, . _ -"
            autoComplete="off"
            autoCapitalize="none"
            spellCheck={false}
          />
        )}
      </div>
      <PasswordField
        label={editing ? "Password baru (opsional)" : "Password"}
        id="a-pass"
        name="password"
        minLength={8}
        maxLength={200}
        required={!editing}
        autoComplete="new-password"
        placeholder={editing ? "Kosongkan bila tidak diubah" : "Minimal 8 karakter"}
      />

      <fieldset className="space-y-2">
        <legend className="mb-2 text-sm font-medium">Izin fitur</legend>
        <div className="grid gap-2 sm:grid-cols-2">
          {ASSIGNABLE_FEATURES.map((feature) => {
            const Icon = ADMIN_FEATURE_PRESENTATION[feature].icon;
            return (
              <ChoiceChip
                key={feature}
                name={`perm_${feature}`}
                label={adminFeatureLabel(feature)}
                defaultChecked={admin?.permissions?.[feature] ?? false}
                icon={<Icon className="size-4.5" aria-hidden="true" />}
              />
            );
          })}
        </div>
      </fieldset>

      {editing && (
        <SwitchField
          name="is_active"
          title="Akun aktif"
          description="Menonaktifkan akun langsung mengeluarkan sesinya di semua perangkat."
          defaultChecked={admin?.is_active ?? true}
        />
      )}
    </AdminFormDialog>
  );
}
