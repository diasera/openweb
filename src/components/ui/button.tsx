import { forwardRef, type ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/utils/cn";

/**
 * Tombol iOS (pill). Varian & ukuran didefinisikan sekali di sini lalu dipakai
 * ulang seluruh aplikasi (pola sarang laba-laba).
 */
type Variant = "primary" | "dark" | "outline" | "ghost" | "glass" | "danger";
type Size = "sm" | "md" | "lg";

const VARIANTS: Record<Variant, string> = {
  primary: "bg-primary text-primary-foreground hover:opacity-90",
  dark: "bg-foreground text-bg hover:opacity-90",
  outline: "bg-surface text-foreground border border-border hover:bg-surface-2",
  ghost: "text-foreground hover:bg-surface-2",
  // Kaca adaptif tema (bukan putih hardcoded) supaya bagus di light & dark.
  glass: "glass-button text-foreground",
  danger: "bg-danger text-white hover:opacity-90",
};

const SIZES: Record<Size, string> = {
  sm: "h-9 px-3.5 text-sm",
  md: "h-11 px-5 text-[15px]",
  lg: "h-12 px-6 text-base",
};

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
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

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "primary", size = "md", ...props }, ref) => (
    <button
      ref={ref}
      type="button"
      className={buttonClass({ className, variant, size })}
      {...props}
    />
  ),
);
Button.displayName = "Button";
