"use client";

import { useMemo, useState } from "react";
import { FolderOpen } from "lucide-react";
import { AlbumCard } from "@/components/public/album-card";
import { listReveal } from "@/components/motion";
import { EmptyState } from "@/components/ui/empty-state";
import { SearchInput } from "@/components/ui/search-input";
import { Segmented } from "@/components/ui/segmented";
import type { AlbumSummaryRow } from "@/lib/types/database";

type AlbumSort = "latest" | "count" | "event";

/**
 * Penjelajah daftar Album dengan pencarian real-time dan sortir/filter cepat
 * (Terbaru, Terbanyak, Terhubung Acara).
 */
export function AlbumBrowser({ albums }: { albums: AlbumSummaryRow[] }) {
  const [query, setQuery] = useState("");
  const [mode, setMode] = useState<AlbumSort>("latest");

  const filtered = useMemo(() => {
    const q = query.trim().toLocaleLowerCase();
    const list = albums.filter((album) => {
      if (mode === "event" && !album.event_id) return false;
      if (!q) return true;
      return `${album.title} ${album.description ?? ""}`
        .toLocaleLowerCase()
        .includes(q);
    });

    if (mode === "count") {
      return [...list].sort(
        (a, b) =>
          b.media_count - a.media_count ||
          Date.parse(b.latest_media_at ?? b.created_at) -
            Date.parse(a.latest_media_at ?? a.created_at),
      );
    }
    return list;
  }, [albums, mode, query]);

  if (albums.length === 0) {
    return (
      <EmptyState
        icon={<FolderOpen className="h-8 w-8" />}
        title="Belum ada album"
        description="Album acara akan tampil di sini."
      />
    );
  }

  return (
    <div className="space-y-4">
      {albums.length > 2 && (
        <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center">
          <div className="min-w-0 flex-1">
            <SearchInput
              value={query}
              onChange={setQuery}
              placeholder="Cari judul atau deskripsi album…"
            />
          </div>
          <div className="sm:w-72 sm:shrink-0">
            <Segmented
              value={mode}
              onChange={setMode}
              options={[
                { label: "Terbaru", value: "latest" },
                { label: "Terbanyak", value: "count" },
                { label: "Acara", value: "event" },
              ]}
            />
          </div>
        </div>
      )}

      {filtered.length === 0 ? (
        <p className="text-muted py-10 text-center text-sm">
          Tidak ada album yang cocok dengan filter ini.
        </p>
      ) : (
        <div className="grid grid-cols-2 gap-x-3 gap-y-5 md:grid-cols-3 lg:grid-cols-4">
          {filtered.map((album, index) => (
            <div key={album.id} {...listReveal(index)}>
              <AlbumCard album={album} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
