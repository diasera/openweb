"use client";

import { Button, type ButtonProps } from "@/components/ui/button";
import { useAdminAction } from "@/components/admin/use-admin-action";

type AdminActionButtonProps = Omit<ButtonProps, "onClick" | "type"> & {
  action: () => Promise<unknown>;
  confirmMessage?: string;
  errorMessage?: string;
  successMessage: string;
};

/** Satu tombol pusat untuk pending, konfirmasi opsional, hasil aksi, dan toast. */
export function AdminActionButton({
  action,
  children,
  confirmMessage,
  errorMessage = "Aksi gagal. Coba lagi.",
  successMessage,
  disabled,
  ...buttonProps
}: AdminActionButtonProps) {
  const { pending, run } = useAdminAction();

  return (
    <Button
      {...buttonProps}
      type="button"
      disabled={disabled || pending}
      onClick={() => {
        if (confirmMessage && !window.confirm(confirmMessage)) return;
        run(action, { successMessage, errorMessage });
      }}
    >
      {children}
    </Button>
  );
}
