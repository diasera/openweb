import type { ComponentPropsWithRef } from "react";
import { cn } from "@/lib/utils/cn";

/**
 * Tombol iOS (pill). Varian & ukuran didefinisikan sekali di sini lalu dipakai
 * ulang seluruh aplikasi (pola sarang laba-laba).
 */
type Variant =
  | "primary"
  | "secondary"
  | "dark"
  | "outline"
  | "ghost"
  | "glass"
  | "danger";
type Size = "sm" | "md" | "lg";

const VARIANTS: Record<Variant, string> = {
  primary: "gloss bg-primary text-primary-foreground hover:opacity-90",
  // Tombol abu ala iOS (gray bordered): aksi/tautan sekunder berbentuk pil.
  secondary: "bg-surface-2 text-foreground hover:bg-border",
  dark: "bg-foreground text-bg hover:opacity-90",
  outline: "bg-surface text-foreground border border-border hover:bg-surface-2",
  ghost: "text-foreground hover:bg-surface-2",
  // Kaca adaptif tema (bukan putih hardcoded) supaya bagus di light & dark.
  glass: "glass-button text-foreground",
  // Aksi destruktif ala iOS: teks merah di atas tint, terbaca di light & dark.
  danger: "bg-danger/12 text-danger hover:bg-danger/18",
};

const SIZES: Record<Size, string> = {
  sm: "h-9 px-3.5 text-sm",
  md: "h-11 px-5 text-subhead",
  lg: "h-12 px-6 text-base",
};

export interface ButtonProps extends ComponentPropsWithRef<"button"> {
  variant?: Variant;
  size?: Size;
}

/** Gaya tombol reusable untuk Link agar tidak membuat elemen interaktif bersarang. */
export function buttonClass({
  className,
  variant = "primary",
  size = "md",
}: Pick<ButtonProps, "className" | "variant" | "size"> = {}) {
  return cn(
    "inline-flex select-none items-center justify-center gap-2 rounded-full font-medium",
    "motion-pressable",
    "disabled:pointer-events-none disabled:opacity-50",
    VARIANTS[variant],
    SIZES[size],
    className,
  );
}

/** React 19: `ref` adalah prop biasa dan ikut diteruskan lewat spread. */
export function Button({
  className,
  variant = "primary",
  size = "md",
  ...props
}: ButtonProps) {
  return (
    <button
      type="button"
      className={buttonClass({ className, variant, size })}
      {...props}
    />
  );
}
