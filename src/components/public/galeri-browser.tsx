"use client";

import { useMemo, useState, useTransition, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { ImageIcon } from "lucide-react";
import { SearchInput } from "@/components/ui/search-input";
import { Segmented } from "@/components/ui/segmented";
import { Masonry } from "@/components/ui/masonry";
import { EmptyState } from "@/components/ui/empty-state";
import { MediaCard } from "@/components/public/media-card";
import { listReveal } from "@/components/motion";
import type { MediaWithSlideCount } from "@/lib/media/slides";
import { buildQueryHref } from "@/lib/utils/url";

type Filter = "all" | "photo" | "video";

/** Galeri dengan pencarian + filter Semua/Foto/Video + kategori lintas halaman. */
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
  const [optimisticType, setOptimisticType] = useState<Filter | null>(null);
  const filter = optimisticType ?? activeType;

  function handleTypeChange(next: Filter) {
    setOptimisticType(next);
    startTransition(() => {
      router.push(
        buildQueryHref("/galeri", {
          type: next === "all" ? undefined : next,
          category: activeCategory,
        }),
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
      if (
        query &&
        !`${m.title ?? ""} ${m.caption ?? ""} ${m.category ?? ""} ${m.uploader_name ?? ""}`
          .toLowerCase()
          .includes(query)
      )
        return false;
      return true;
    });
  }, [media, q, filter]);

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
      <p className="text-muted text-xs">
        {totalCount ?? media.length} pin
        {activeCategory ? ` · kategori ${activeCategory}` : ` · ${photos} foto · ${videos} video`}
      </p>

      {filtered.length === 0 ? (
        <EmptyState
          icon={<ImageIcon className="h-8 w-8" />}
          title="Tidak ada media"
          description="Coba ubah pencarian atau filter."
        />
      ) : (
        <Masonry>
          {filtered.map((m, index) => (
            <div key={m.id} {...listReveal(index)}>
              <MediaCard media={m} showMeta />
            </div>
          ))}
        </Masonry>
      )}
    </div>
  );
}
