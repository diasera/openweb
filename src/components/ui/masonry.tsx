import type { ReactNode } from "react";
import { cn } from "@/lib/utils/cn";

/**
 * Grid masonry ala Pinterest via CSS columns (tanpa library). Responsif:
 * 2 kolom di mobile, naik di layar lebar. Dipakai ulang di Sorotan, Galeri,
 * dan Pesan Anonim. Item cukup dibungkus elemen apa pun sebagai children.
 */
export function Masonry({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("masonry columns-2 gap-3 md:columns-3 lg:columns-4", className)}>
      {children}
    </div>
  );
}
