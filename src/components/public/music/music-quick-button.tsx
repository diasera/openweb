"use client";

import { Music2 } from "lucide-react";
import { IconButton } from "@/components/ui/icon-button";
import { useToast } from "@/components/ui/toast";
import { MusicBars } from "./music-bars";
import { useMusic } from "./music-provider";

/**
 * Tombol musik island. `onlyWhilePlaying` dipakai saat island sedang memuat
 * aksi halaman (prioritas edit): tombol hanya muncul ketika lagu diputar.
 */
export function MusicQuickButton({ onlyWhilePlaying = false }: { onlyWhilePlaying?: boolean }) {
  const music = useMusic();
  const { toast } = useToast();

  if (onlyWhilePlaying && !music.isPlaying) return null;

  return (
    <IconButton
      aria-label={music.enabled ? "Buka pemutar musik" : "Aktifkan musik"}
      aria-expanded={music.expanded}
      onClick={() => {
        void music.openPlayer().catch((error: unknown) => {
          toast.error(error instanceof Error ? error.message : "Musik tidak dapat dibuka.");
        });
      }}
    >
      {music.enabled && music.currentTrack ? (
        <MusicBars playing={music.isPlaying} className="text-primary-readable" />
      ) : (
        <Music2 className="size-4.5" />
      )}
    </IconButton>
  );
}
