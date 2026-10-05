import type { ComponentPropsWithRef } from "react";
import { cn } from "@/lib/utils/cn";

/**
 * Kartu permukaan solid (bukan kaca) — dipakai SEMUA kartu konten: anggota,
 * pesan, artikel, media admin, statistik, empty state, dsb. Satu sumber
 * radius+border+shadow supaya tak ada lagi "border-border bg-surface rounded-2xl
 * border" ditulis ulang di tiap file (pola sarang laba-laba).
 *
 * - flat: tanpa shadow (dipakai di dalam permukaan lain, mis. baris dalam grup).
 * - elevated (default): shadow lembut, diam di tempat.
 * - interactive: elevated + tilt 3D mengikuti kursor, pantulan cahaya, dan
 *   tekan-dalam saat disentuh (link/tombol).
 */
type Variant = "flat" | "elevated" | "interactive";

const VARIANTS: Record<Variant, string> = {
  flat: "border border-border bg-surface",
  elevated: "border border-border bg-surface shadow-soft",
  // relative: wadah pantulan cahaya (::after) tilt 3D di motion.css.
  interactive:
    "motion-card relative border border-border bg-surface shadow-soft active:shadow-soft",
};

export interface CardProps extends ComponentPropsWithRef<"div"> {
  variant?: Variant;
}

/** Kelas Card sebagai string — dipakai elemen yang harus jadi <Link>/<button>, bukan <div>. */
export function cardClass(variant: Variant = "elevated", className?: string) {
  return cn("rounded-card", VARIANTS[variant], className);
}

export function Card({ className, variant = "elevated", ...props }: CardProps) {
  return <div className={cardClass(variant, className)} {...props} />;
}
