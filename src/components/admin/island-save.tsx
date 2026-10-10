"use client";

import type { ComponentProps } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils/cn";

/**
 * Tombol utama di Dynamic Island (Simpan/Terbitkan/Perbarui) untuk editor
 * admin. Dipasang lewat useIslandActions hanya selama ada perubahan, jadi
 * kehadirannya sendiri berarti "belum disimpan". Tombol berada di luar
 * <form>: submit memakai atribut `form` atau onClick. Spinner pending
 * datang dari Button.
 */
export function IslandSaveButton({
  className,
  ...props
}: Omit<ComponentProps<typeof Button>, "size"> & { pending: boolean }) {
  const primary = !props.variant || props.variant === "primary";
  return (
    <Button
      {...props}
      size="sm"
      className={cn("relative shrink-0 overflow-hidden", primary && "motion-sheen", className)}
    />
  );
}
