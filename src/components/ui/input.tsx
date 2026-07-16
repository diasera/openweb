import { forwardRef, type InputHTMLAttributes } from "react";
import { cn } from "@/lib/utils/cn";

/** Input teks bergaya iOS (rounded, ring fokus). Dipakai ulang semua form. */
export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => (
    <input
      ref={ref}
      className={cn(
        "h-11 w-full rounded-2xl border border-border bg-surface px-4 text-base outline-none sm:text-[15px]",
        "placeholder:text-muted focus:border-primary focus:ring-2 focus:ring-primary/30",
        "transition",
        className,
      )}
      {...props}
    />
  ),
);
Input.displayName = "Input";
