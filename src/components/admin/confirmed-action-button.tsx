"use client";

import type { ReactNode } from "react";
import { Ban, ShieldCheck, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { AdminActionButton } from "@/components/admin/admin-action-button";

/** Inti bersama untuk aksi berisiko: konfirmasi, pending, error, dan toast. */
function ConfirmedActionButton({
  action,
  label,
  message,
  successMessage,
  errorMessage = "Aksi gagal. Coba lagi.",
  pressed,
  className,
  children,
}: {
  action: () => Promise<unknown>;
  label: string;
  message: string;
  successMessage: string;
  errorMessage?: string;
  pressed?: boolean;
  className?: string;
  children: ReactNode;
}) {
  return (
    <AdminActionButton
      action={action}
      confirmMessage={message}
      successMessage={successMessage}
      errorMessage={errorMessage}
      variant="ghost"
      size="sm"
      className={cn(
        "text-muted hover:bg-danger/10 hover:text-danger h-9 w-9 rounded-lg p-0",
        className,
      )}
      aria-label={label}
      aria-pressed={pressed}
      title={label}
    >
      {children}
    </AdminActionButton>
  );
}

/** Tombol hapus dengan semantik yang konsisten di seluruh halaman admin. */
export function DeleteButton({
  action,
  id,
  message = "Hapus item ini?",
  successMessage = "Berhasil dihapus",
  className,
}: {
  action: (id: string) => Promise<unknown>;
  id: string;
  message?: string;
  successMessage?: string;
  className?: string;
}) {
  return (
    <ConfirmedActionButton
      action={() => action(id)}
      label="Hapus"
      message={message}
      successMessage={successMessage}
      errorMessage="Gagal menghapus. Coba lagi."
      className={className}
    >
      <Trash2 className="h-[18px] w-[18px]" />
    </ConfirmedActionButton>
  );
}

/** Aksi blokir/buka blokir IP; tidak pernah menyamar sebagai tombol hapus. */
export function BanIpButton({
  action,
  id,
  blocked = false,
  message,
  successMessage,
  className,
}: {
  action: (id: string) => Promise<unknown>;
  id: string;
  blocked?: boolean;
  message?: string;
  successMessage?: string;
  className?: string;
}) {
  const label = blocked ? "Buka blokir IP" : "Blokir IP";

  return (
    <ConfirmedActionButton
      action={() => action(id)}
      label={label}
      message={
        message ??
        (blocked
          ? "Buka blokir IP ini?"
          : "Blokir IP ini dari interaksi publik?")
      }
      successMessage={
        successMessage ?? (blocked ? "Blokir IP dibuka" : "IP diblokir")
      }
      pressed={blocked}
      className={cn(
        blocked
          ? "text-success hover:bg-success/10 hover:text-success"
          : "text-danger hover:bg-danger/10",
        className,
      )}
    >
      {blocked ? (
        <ShieldCheck className="h-[18px] w-[18px]" />
      ) : (
        <Ban className="h-[18px] w-[18px]" />
      )}
    </ConfirmedActionButton>
  );
}
