import { forwardRef, type HTMLAttributes } from "react";
import { cn } from "@/lib/utils/cn";

/**
 * Kartu permukaan solid (bukan kaca) — dipakai SEMUA kartu konten: anggota,
 * pesan, artikel, media admin, statistik, empty state, dsb. Satu sumber
 * radius+border+shadow supaya tak ada lagi "border-border bg-surface rounded-2xl
 * border" ditulis ulang di tiap file (pola sarang laba-laba).
 *
 * - flat: tanpa shadow (dipakai di dalam permukaan lain, mis. baris dalam grup).
 * - elevated (default): shadow lembut, diam di tempat.
 * - interactive: elevated + naik tipis & shadow menguat saat hover/tap (link/tombol).
 */
type Variant = "flat" | "elevated" | "interactive";

const VARIANTS: Record<Variant, string> = {
  flat: "border border-border bg-surface",
  elevated: "border border-border bg-surface shadow-soft",
  interactive:
    "motion-card border border-border bg-surface shadow-soft active:shadow-soft",
};

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  variant?: Variant;
}

/** Kelas Card sebagai string — dipakai elemen yang harus jadi <Link>/<button>, bukan <div>. */
export function cardClass(variant: Variant = "elevated", className?: string) {
  return cn("rounded-card", VARIANTS[variant], className);
}

export const Card = forwardRef<HTMLDivElement, CardProps>(
  ({ className, variant = "elevated", ...props }, ref) => (
    <div ref={ref} className={cardClass(variant, className)} {...props} />
  ),
);
Card.displayName = "Card";
