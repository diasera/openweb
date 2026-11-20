"use client";

import { Grid2x2, Grid3x3 } from "lucide-react";
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
  className,
}: {
  aspect?: MediaAspectFilter;
  onAspectChange?: (next: MediaAspectFilter) => void;
  density: MediaGridDensity;
  onDensityChange: (next: MediaGridDensity) => void;
  showAspectFilter?: boolean;
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
                  "motion-pressable shrink-0 rounded-full px-3 py-1 text-caption1 font-semibold transition-colors",
                  selected
                    ? "bg-foreground text-bg"
                    : "bg-surface-2 text-muted hover:text-foreground",
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

      <div
        role="group"
        aria-label="Kepadatan tampilan grid"
        className="bg-surface-2 inline-flex shrink-0 items-center rounded-full p-0.5"
      >
        <button
          type="button"
          aria-label="Tampilan nyaman"
          aria-pressed={density === "comfortable"}
          onClick={() => onDensityChange("comfortable")}
          className={cn(
            "grid size-7 place-items-center rounded-full transition-colors",
            density === "comfortable"
              ? "bg-surface text-foreground shadow-2xs"
              : "text-muted hover:text-foreground",
          )}
        >
          <Grid2x2 className="size-3.75" aria-hidden="true" />
        </button>
        <button
          type="button"
          aria-label="Tampilan padat"
          aria-pressed={density === "compact"}
          onClick={() => onDensityChange("compact")}
          className={cn(
            "grid size-7 place-items-center rounded-full transition-colors",
            density === "compact"
              ? "bg-surface text-foreground shadow-2xs"
              : "text-muted hover:text-foreground",
          )}
        >
          <Grid3x3 className="size-3.75" aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}
