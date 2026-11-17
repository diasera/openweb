"use client";

import { useMemo, useState, useTransition, type ReactNode } from "react";
import type { Route } from "next";
import { useRouter } from "next/navigation";
import { Grid2x2, Grid3x3, ImageIcon } from "lucide-react";
import { SearchInput } from "@/components/ui/search-input";
import { Segmented } from "@/components/ui/segmented";
import { Masonry } from "@/components/ui/masonry";
import { EmptyState } from "@/components/ui/empty-state";
import { MediaCard } from "@/components/public/media-card";
import { listReveal } from "@/components/motion";
import type { MediaWithSlideCount } from "@/lib/media/slides";
import { buildQueryHref } from "@/lib/utils/url";
import { cn } from "@/lib/utils/cn";

type Filter = "all" | "photo" | "video";
type AspectFilter = "all" | "portrait" | "landscape" | "carousel";

function matchesAspectFilter(item: MediaWithSlideCount, aspect: AspectFilter): boolean {
  if (aspect === "all") return true;
  if (aspect === "carousel") return (item.slide_count ?? 1) > 1;
  if (!item.width || !item.height) return false;
  if (aspect === "portrait") return item.height > item.width * 1.06;
  return item.width > item.height * 1.06;
}

const ASPECT_OPTIONS: ReadonlyArray<{ value: AspectFilter; label: string }> = [
  { value: "all", label: "Semua Bentuk" },
  { value: "portrait", label: "Potret" },
  { value: "landscape", label: "Lanskap" },
  { value: "carousel", label: "Multi-Slide" },
];

/** Galeri dengan pencarian, filter jenis/kategori, filter bentuk visual, dan kepadatan grid. */
export function GaleriBrowser({
  media,
  totalCount,
  activeType = "all",
  activeCategory,
  categoryBar,
}: {
  media: MediaWithSlideCount[];
  totalCount?: number;
  activeType?: Filter;
  activeCategory?: string;
  categoryBar?: ReactNode;
}) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [q, setQ] = useState("");
  const [aspectFilter, setAspectFilter] = useState<AspectFilter>("all");
  const [density, setDensity] = useState<"comfortable" | "compact">("comfortable");
  const [optimisticType, setOptimisticType] = useState<Filter | null>(null);
  const filter = optimisticType ?? activeType;

  function handleTypeChange(next: Filter) {
    setOptimisticType(next);
    startTransition(() => {
      router.push(
        buildQueryHref("/galeri", {
          type: next === "all" ? undefined : next,
          category: activeCategory,
        }) as Route,
      );
      setOptimisticType(null);
    });
  }

  const photos = media.filter((m) => m.type === "photo").length;
  const videos = media.filter((m) => m.type === "video").length;

  const filtered = useMemo(() => {
    const query = q.trim().toLowerCase();
    return media.filter((m) => {
      if (filter !== "all" && m.type !== filter) return false;
      if (!matchesAspectFilter(m, aspectFilter)) return false;
      if (
        query &&
        !`${m.title ?? ""} ${m.caption ?? ""} ${m.category ?? ""} ${m.uploader_name ?? ""}`
          .toLowerCase()
          .includes(query)
      ) {
        return false;
      }
      return true;
    });
  }, [aspectFilter, filter, media, q]);

  const isClientFiltered = Boolean(q.trim() || aspectFilter !== "all");

  return (
    <div className="space-y-4">
      <SearchInput
        value={q}
        onChange={setQ}
        placeholder="Cari judul, keterangan, kategori, atau pengunggah…"
      />
      <Segmented
        value={filter}
        onChange={handleTypeChange}
        options={[
          { label: "Semua", value: "all" },
          { label: "Foto", value: "photo" },
          { label: "Video", value: "video" },
        ]}
      />
      {categoryBar}

      <div className="flex flex-wrap items-center justify-between gap-2">
        <div
          role="group"
          aria-label="Filter bentuk media"
          className="no-scrollbar flex max-w-full items-center gap-1.5 overflow-x-auto"
        >
          {ASPECT_OPTIONS.map((opt) => {
            const selected = aspectFilter === opt.value;
            return (
              <button
                key={opt.value}
                type="button"
                aria-pressed={selected}
                onClick={() => setAspectFilter(opt.value)}
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

        <div
          role="group"
          aria-label="Kepadatan tampilan galeri"
          className="bg-surface-2 inline-flex shrink-0 items-center rounded-full p-0.5"
        >
          <button
            type="button"
            aria-label="Tampilan nyaman"
            aria-pressed={density === "comfortable"}
            onClick={() => setDensity("comfortable")}
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
            onClick={() => setDensity("compact")}
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

      <p className="text-muted text-xs">
        {isClientFiltered
          ? `Menampilkan ${filtered.length} dari ${media.length} pin di halaman ini`
          : `${totalCount ?? media.length} pin`}
        {activeCategory
          ? ` · kategori ${activeCategory}`
          : !isClientFiltered
            ? ` · ${photos} foto · ${videos} video`
            : ""}
      </p>

      {filtered.length === 0 ? (
        <EmptyState
          icon={<ImageIcon className="h-8 w-8" />}
          title="Tidak ada media yang cocok"
          description="Coba ubah kata kunci pencarian atau setel ulang filter bentuk."
        />
      ) : (
        <Masonry density={density}>
          {filtered.map((m, index) => (
            <div key={m.id} {...listReveal(index)}>
              <MediaCard media={m} showMeta={density === "comfortable"} />
            </div>
          ))}
        </Masonry>
      )}
    </div>
  );
}
