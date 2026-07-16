"use client";

import type { CSSProperties } from "react";
import { cn } from "@/lib/utils/cn";

/** Segmented control iOS (pil). Dipakai filter Semua/Pengurus/Anggota, Semua/Foto/Video. */
export function Segmented<T extends string>({
  options,
  value,
  onChange,
  className,
}: {
  options: { label: string; value: T }[];
  value: T;
  onChange: (v: T) => void;
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
      className={cn("segmented-control bg-surface-2 rounded-full p-1", className)}
      style={style}
      role="group"
      aria-label="Filter"
    >
      <span aria-hidden="true" className="segmented-pill" />
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          onClick={() => onChange(o.value)}
          aria-pressed={value === o.value}
          className={cn(
            "motion-pressable relative z-10 rounded-full py-1.5 text-sm font-medium transition-colors",
            value === o.value
              ? "text-foreground"
              : "text-muted hover:text-foreground",
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
