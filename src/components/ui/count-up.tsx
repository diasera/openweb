import type { CSSProperties } from "react";

/**
 * Angka yang menghitung naik saat tampil, tanpa JavaScript: nilai asli selalu
 * ada di HTML (pembaca layar, crawler, tampilan sebelum hidrasi) dan animasinya
 * lapisan CSS yang otomatis mati untuk prefers-reduced-motion.
 */
export function CountUp({ value }: { value: number }) {
  const count = Number.isFinite(value) ? Math.trunc(value) : 0;
  return (
    <span className="tabular-nums">
      <span className="sr-only">{count}</span>
      <span
        aria-hidden="true"
        className="motion-count"
        style={{ "--count-to": count } as CSSProperties}
      />
    </span>
  );
}
