import { forwardRef, type ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/utils/cn";

export type IconButtonProps = ButtonHTMLAttributes<HTMLButtonElement>;

/**
 * Kontrol ikon kaca untuk button maupun Link pada chrome aplikasi. Visual
 * 36px, area sentuh 44px (hit region minimum HIG) lewat pseudo-elemen tak
 * terlihat. Helper class mencegah Link membungkus button interaktif.
 */
export function iconButtonClass(className?: string) {
  return cn(
    "glass-button relative grid size-9 place-items-center rounded-full",
    "before:absolute before:-inset-1 before:rounded-full before:content-['']",
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
