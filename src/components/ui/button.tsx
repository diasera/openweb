import type { ComponentPropsWithRef, ReactNode } from "react";
import { LoaderCircle } from "lucide-react";
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
  primary:
    "motion-sheen relative overflow-hidden bg-linear-to-b from-primary to-primary-strong text-primary-foreground shadow-[inset_0_1px_0_rgb(255_255_255/0.28),var(--shadow-primary-glow)] hover:brightness-105",
  // Tombol abu ala iOS (gray bordered): aksi/tautan sekunder berbentuk pil.
  secondary: "border border-border/75 bg-surface-2 text-foreground hover:bg-border",
  dark: "bg-foreground text-bg hover:opacity-90",
  outline: "bg-surface text-foreground border border-border hover:bg-surface-2",
  ghost: "text-foreground hover:bg-surface-2",
  // Kaca adaptif tema (bukan putih hardcoded) supaya bagus di light & dark.
  glass: "glass-button text-foreground",
  // Aksi destruktif ala iOS: teks merah di atas tint, terbaca di light & dark.
  danger: "border border-danger/20 bg-danger/12 text-danger hover:bg-danger/18",
};

const SIZES: Record<Size, string> = {
  sm: "h-9 px-3.5 text-sm",
  md: "h-11 px-5 text-subhead",
  lg: "h-12 px-6 text-base",
};

export interface ButtonProps extends ComponentPropsWithRef<"button"> {
  variant?: Variant;
  size?: Size;
  /** Ikon di depan label; diganti spinner selama `pending`. */
  icon?: ReactNode;
  /**
   * Aksi sedang berjalan (simpan, kirim, masuk): tombol terkunci, spinner
   * tampil di slot ikon, dan aria-busy terpasang — satu sumber untuk semua
   * tombol, tidak ditulis ulang per form.
   */
  pending?: boolean;
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
  icon,
  pending = false,
  disabled,
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      type="button"
      className={buttonClass({ className, variant, size })}
      disabled={disabled || pending}
      aria-busy={pending || undefined}
      {...props}
    >
      {pending ? <LoaderCircle className="size-4 animate-spin" aria-hidden="true" /> : icon}
      {children}
    </button>
  );
}
