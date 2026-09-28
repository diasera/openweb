import type { HTMLAttributes } from "react";
import { cn } from "@/lib/utils/cn";

/**
 * Grid masonry ala Pinterest tanpa library (utility `masonry` di globals.css:
 * grid-lanes bila didukung, CSS columns sebagai fallback). 2 kolom di ponsel,
 * 3 di tablet, 4 di desktop. Dipakai ulang di Sorotan, Galeri, Album,
 * Tersimpan, dan Pesan Anonim.
 */
export function Masonry({
  className,
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("masonry", className)} {...props} />;
}
