import type { ReactNode } from "react";
import { cn } from "@/lib/utils/cn";

/**
 * Bilah kontrol katalog terpusat untuk Galeri, Album, dan Anggota (Pola Sarang
 * Laba-Laba): merangkum kolom pencarian, filter segmen, serta kontrol lanjutan
 * ke dalam 1–2 baris kompak dengan sorotan fokus murni CSS (`:has()`).
 */
export function BrowserToolbar({
  search,
  primaryControl,
  secondary,
  className,
}: {
  search: ReactNode;
  primaryControl?: ReactNode;
  secondary?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "border-border/75 bg-surface/75 space-y-2.5 rounded-[1.5rem] border p-2.5 shadow-2xs transition-[border-color,box-shadow] has-[:focus-visible]:border-primary/35 has-[:focus-visible]:shadow-soft sm:p-3",
        className,
      )}
    >
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <div className="min-w-0 flex-1">{search}</div>
        {primaryControl && <div className="sm:shrink-0">{primaryControl}</div>}
      </div>
      {secondary && (
        <div className="border-border/55 space-y-2 border-t pt-2.5">
          {secondary}
        </div>
      )}
    </div>
  );
}
