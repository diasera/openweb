import { forwardRef, type ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/utils/cn";

export type IconButtonProps = ButtonHTMLAttributes<HTMLButtonElement>;

/**
 * Gaya kontrol ikon kaca 36px untuk button maupun Link pada chrome aplikasi.
 * Helper class mencegah Link membungkus button interaktif.
 */
export function iconButtonClass(className?: string) {
  return cn(
    "glass-button grid h-9 w-9 place-items-center rounded-full",
    className,
  );
}

export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(
  ({ className, ...props }, ref) => (
    <button
      ref={ref}
      type="button"
      className={iconButtonClass(className)}
      {...props}
    />
  ),
);
IconButton.displayName = "IconButton";
