import { forwardRef, type HTMLAttributes } from "react";
import { cn } from "@/lib/utils/cn";

/**
 * Chip / pill — dipakai untuk filter, tag jabatan, status ("Pinned"), dsb.
 * Varian sesuai Style Guide Figma (Aktif/Filter/Ketua/Pinned/Kaca).
 */
type ChipVariant =
  | "solid"
  | "soft"
  | "primary"
  | "softPrimary"
  | "role"
  | "glass"
  | "outline";

const CHIP: Record<ChipVariant, string> = {
  solid: "bg-foreground text-bg",
  soft: "bg-surface-2 text-muted",
  primary: "bg-primary text-primary-foreground",
  softPrimary: "bg-primary/10 text-primary-readable",
  role: "bg-role/15 text-role border border-role/25",
  // Border kaca adaptif tema disediakan oleh .glass (jangan hardcode putih).
  glass: "glass text-foreground",
  outline: "bg-transparent text-foreground border border-border",
};

export interface ChipProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: ChipVariant;
}

export const Chip = forwardRef<HTMLSpanElement, ChipProps>(
  ({ className, variant = "soft", ...props }, ref) => (
    <span
      ref={ref}
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-medium",
        CHIP[variant],
        className,
      )}
      {...props}
    />
  ),
);
Chip.displayName = "Chip";
