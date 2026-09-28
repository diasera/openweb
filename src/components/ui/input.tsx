import { forwardRef, type InputHTMLAttributes } from "react";
import { cn } from "@/lib/utils/cn";

/**
 * Permukaan + indikator fokus field iOS, satu sumber untuk Input, Textarea,
 * Select, SearchInput, dan composer. `within` untuk pembungkus yang berisi
 * <input> tanpa outline sendiri, agar fokus keyboard tetap terlihat.
 */
export function fieldClass(
  focus: "self" | "within" = "self",
  className?: string,
) {
  return cn(
    "border border-border bg-surface transition",
    focus === "self"
      ? "focus:border-primary focus:ring-2 focus:ring-primary/30"
      : "focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/30",
    className,
  );
}

/** Input teks bergaya iOS. 16px di ponsel agar iOS Safari tidak auto-zoom. */
export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => (
    <input
      ref={ref}
      className={fieldClass(
        "self",
        cn(
          "h-11 w-full rounded-2xl px-4 text-base outline-hidden placeholder:text-muted sm:text-subhead",
          className,
        ),
      )}
      {...props}
    />
  ),
);
Input.displayName = "Input";
