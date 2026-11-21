"use client";

import type { CSSProperties, ReactNode } from "react";
import { cn } from "@/lib/utils/cn";

export interface SegmentedOption<T extends string> {
  label: string;
  value: T;
  /** Ikon opsional di depan label (atau satu-satunya isi bila `iconOnly`). */
  icon?: ReactNode;
  /** Label aksesibel/tooltip opsional saat mode ikon saja. */
  ariaLabel?: string;
}

/**
 * Segmented control iOS (pil) dengan indikator geser pegas `.segmented-pill`.
 * Pusat tunggal untuk seluruh sakelar mode/filter (`md` lebar penuh maupun
 * `sm` kompak berikon) — Pola Sarang Laba-Laba.
 */
export function Segmented<T extends string>({
  options,
  value,
  onChange,
  size = "md",
  iconOnly = false,
  ariaLabel = "Filter",
  className,
}: {
  options: SegmentedOption<T>[];
  value: T;
  onChange: (v: T) => void;
  size?: "sm" | "md";
  iconOnly?: boolean;
  ariaLabel?: string;
  className?: string;
}) {
  const activeIndex = Math.max(
    0,
    options.findIndex((option) => option.value === value),
  );
  const style = {
    "--segment-count": options.length,
    "--segment-width": `${100 / options.length}%`,
    "--segment-adjust": `${8 / options.length}px`,
    "--segment-offset": `${activeIndex * 100}%`,
  } as CSSProperties;

  return (
    <div
      className={cn(
        "segmented-control border-border/75 bg-surface-2/90 rounded-full border p-1",
        size === "sm" && "inline-grid",
        className,
      )}
      style={style}
      role="group"
      aria-label={ariaLabel}
    >
      <span aria-hidden="true" className="segmented-pill" />
      {options.map((o) => {
        const active = value === o.value;
        const accessibleLabel = o.ariaLabel ?? o.label;
        return (
          <button
            key={o.value}
            type="button"
            onClick={() => onChange(o.value)}
            aria-pressed={active}
            aria-label={iconOnly ? accessibleLabel : o.ariaLabel}
            title={iconOnly ? accessibleLabel : undefined}
            className={cn(
              "motion-pressable relative z-10 inline-flex items-center justify-center gap-1.5 rounded-full font-medium transition-colors",
              size === "sm"
                ? iconOnly
                  ? "size-8"
                  : "px-3 py-1 text-caption1 font-semibold whitespace-nowrap"
                : "py-1.5 text-sm",
              active ? "text-foreground" : "text-muted hover:text-foreground",
            )}
          >
            {o.icon}
            {!iconOnly && <span>{o.label}</span>}
          </button>
        );
      })}
    </div>
  );
}
