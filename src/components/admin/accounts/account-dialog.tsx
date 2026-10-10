"use client";

import { ChevronRight, UserRoundCog } from "lucide-react";
import { updateOwnAccountAction } from "@/lib/auth/actions";
import { cardClass } from "@/components/ui/card";
import { AdminFormDialog } from "../admin-form-dialog";
import { PasswordField, TextField } from "../form-controls";

/**
 * Pengaturan akun sendiri (termasuk owner): nama dan password. Password baru
 * mencabut sesi di perangkat lain (trigger versi sesi di database). Pemicunya
 * berupa ubin dasbor; didefinisikan di sini karena fungsi render tidak bisa
 * dikirim dari Server Component.
 */
export function AccountDialog({ name }: { name: string }) {
  return (
    <AdminFormDialog
      mode="edit"
      title="Akun saya"
      description="Ubah nama tampilan atau password. Password saat ini selalu diperlukan."
      trigger={(open) => (
        <button
          type="button"
          onClick={open}
          data-spotlight
          className={cardClass(
            "interactive",
            "group flex w-full items-center gap-3 p-4 text-left",
          )}
        >
          <span className="bg-surface-2 text-foreground grid size-10 place-items-center rounded-xl">
            <UserRoundCog className="size-5" aria-hidden="true" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-sm font-semibold">Akun saya</span>
            <span className="text-muted block truncate text-caption1">Nama &amp; password</span>
          </span>
          <ChevronRight className="text-muted size-4 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
        </button>
      )}
      action={updateOwnAccountAction}
      successMessage="Akun diperbarui"
      successDescription="Password baru mengeluarkan sesi di perangkat lain."
      requestErrorMessage="Koneksi terputus saat menyimpan akun. Coba lagi."
      validate={(formData) =>
        formData.get("newPassword") !== formData.get("confirm")
          ? "Konfirmasi password baru tidak cocok."
          : null
      }
    >
      <TextField
        label="Nama"
        id="acc-name"
        name="name"
        defaultValue={name}
        autoComplete="name"
        required
        maxLength={60}
      />
      <PasswordField
        label="Password saat ini"
        id="acc-current"
        name="currentPassword"
        autoComplete="current-password"
        required
        maxLength={200}
      />
      <div className="grid gap-4 sm:grid-cols-2">
        <PasswordField
          label="Password baru (opsional)"
          id="acc-new"
          name="newPassword"
          autoComplete="new-password"
          minLength={8}
          maxLength={200}
          placeholder="Kosongkan bila tetap"
        />
        <PasswordField
          label="Ulangi password baru"
          id="acc-confirm"
          name="confirm"
          autoComplete="new-password"
          maxLength={200}
        />
      </div>
    </AdminFormDialog>
  );
}
