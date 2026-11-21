"use client";

import type { ReactNode } from "react";
import { Grid2x2, Grid3x3 } from "lucide-react";
import { Segmented } from "@/components/ui/segmented";
import type { MediaWithSlideCount } from "@/lib/media/slides";
import { cn } from "@/lib/utils/cn";

export type MediaAspectFilter = "all" | "portrait" | "landscape" | "carousel";
export type MediaGridDensity = "comfortable" | "compact";

export const MEDIA_ASPECT_OPTIONS: ReadonlyArray<{
  value: MediaAspectFilter;
  label: string;
}> = [
  { value: "all", label: "Semua Bentuk" },
  { value: "portrait", label: "Potret" },
  { value: "landscape", label: "Lanskap" },
  { value: "carousel", label: "Multi-Slide" },
];

export function matchesMediaAspectFilter(
  item: Pick<MediaWithSlideCount, "width" | "height" | "slide_count">,
  aspect: MediaAspectFilter,
): boolean {
  if (aspect === "all") return true;
  if (aspect === "carousel") return (item.slide_count ?? 1) > 1;
  if (!item.width || !item.height) return false;
  if (aspect === "portrait") return item.height > item.width * 1.06;
  return item.width > item.height * 1.06;
}

/**
 * Toolbar filter bentuk visual + sakelar kepadatan Masonry bersama untuk
 * halaman Galeri, detail Album, dan Koleksi Tersimpan (Pola Sarang Laba-Laba).
 */
export function MediaGridControls({
  aspect,
  onAspectChange,
  density,
  onDensityChange,
  showAspectFilter = true,
  meta,
  className,
}: {
  aspect?: MediaAspectFilter;
  onAspectChange?: (next: MediaAspectFilter) => void;
  density: MediaGridDensity;
  onDensityChange: (next: MediaGridDensity) => void;
  showAspectFilter?: boolean;
  /** Ringkasan jumlah item opsional sejajar kontrol kepadatan. */
  meta?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-wrap items-center justify-between gap-2", className)}>
      {showAspectFilter && aspect && onAspectChange ? (
        <div
          role="group"
          aria-label="Filter bentuk media"
          className="no-scrollbar flex max-w-full items-center gap-1.5 overflow-x-auto"
        >
          {MEDIA_ASPECT_OPTIONS.map((opt) => {
            const selected = aspect === opt.value;
            return (
              <button
                key={opt.value}
                type="button"
                aria-pressed={selected}
                onClick={() => onAspectChange(opt.value)}
                className={cn(
                  "motion-pressable shrink-0 rounded-full border px-3 py-1 text-caption1 font-semibold transition-colors",
                  selected
                    ? "border-foreground bg-foreground text-bg"
                    : "border-border/75 bg-surface-2/85 text-muted hover:text-foreground",
                )}
              >
                {opt.label}
              </button>
            );
          })}
        </div>
      ) : (
        <span />
      )}

      <div className="flex shrink-0 items-center gap-2.5">
        {meta && (
          <span className="text-muted text-caption1 font-medium tabular-nums">
            {meta}
          </span>
        )}
        <Segmented
          size="sm"
          iconOnly
          ariaLabel="Kepadatan tampilan grid"
          value={density}
          onChange={onDensityChange}
          options={[
            {
              value: "comfortable",
              label: "Nyaman",
              ariaLabel: "Tampilan nyaman",
              icon: <Grid2x2 className="size-3.75" aria-hidden="true" />,
            },
            {
              value: "compact",
              label: "Padat",
              ariaLabel: "Tampilan padat",
              icon: <Grid3x3 className="size-3.75" aria-hidden="true" />,
            },
          ]}
        />
      </div>
    </div>
  );
}
