"use client";

import { useMemo, useState } from "react";
import { ImageIcon } from "lucide-react";
import { SearchInput } from "@/components/ui/search-input";
import { Segmented } from "@/components/ui/segmented";
import { Masonry } from "@/components/ui/masonry";
import { EmptyState } from "@/components/ui/empty-state";
import { MediaCard } from "@/components/public/media-card";
import { staggerDelay } from "@/components/motion";
import type { MediaRow } from "@/lib/types/database";

type Filter = "all" | "photo" | "video";

/** Galeri dengan pencarian + filter Semua/Foto/Video (client-side) + hitungan. */
export function GaleriBrowser({ media }: { media: MediaRow[] }) {
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<Filter>("all");

  const photos = media.filter((m) => m.type === "photo").length;
  const videos = media.filter((m) => m.type === "video").length;

  const filtered = useMemo(() => {
    const query = q.trim().toLowerCase();
    return media.filter((m) => {
      if (filter !== "all" && m.type !== filter) return false;
      if (
        query &&
        !`${m.title ?? ""} ${m.caption ?? ""} ${m.uploader_name ?? ""}`
          .toLowerCase()
          .includes(query)
      )
        return false;
      return true;
    });
  }, [media, q, filter]);

  return (
    <div className="space-y-4">
      <SearchInput value={q} onChange={setQ} placeholder="Cari di galeri…" />
      <Segmented
        value={filter}
        onChange={setFilter}
        options={[
          { label: "Semua", value: "all" },
          { label: "Foto", value: "photo" },
          { label: "Video", value: "video" },
        ]}
      />
      <p className="text-muted text-xs">
        {media.length} pin · {photos} foto · {videos} video
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
            <div
              key={m.id}
              className="animate-rise"
              style={{ animationDelay: staggerDelay(index) }}
            >
              <MediaCard media={m} showMeta />
            </div>
          ))}
        </Masonry>
      )}
    </div>
  );
}
