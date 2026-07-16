"use client";

import { useTransition } from "react";
import { Button, type ButtonProps } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { getActionError } from "@/lib/action-result";

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
  const { toast } = useToast();
  const [pending, start] = useTransition();

  return (
    <Button
      {...buttonProps}
      type="button"
      disabled={disabled || pending}
      onClick={() => {
        if (confirmMessage && !window.confirm(confirmMessage)) return;
        start(async () => {
          try {
            const result = await action();
            const actionError = getActionError(result);
            if (actionError) {
              toast.error(actionError);
              return;
            }
            toast.success(successMessage);
          } catch {
            toast.error(errorMessage);
          }
        });
      }}
    >
      {children}
    </Button>
  );
}
