"use client";

import { Music2 } from "lucide-react";
import { IconButton } from "@/components/ui/icon-button";
import { useToast } from "@/components/ui/toast";
import { MusicBars } from "./music-bars";
import { useMusic } from "./music-provider";

export function MusicQuickButton() {
  const music = useMusic();
  const { toast } = useToast();

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
        <Music2 className="h-[18px] w-[18px]" />
      )}
    </IconButton>
  );
}
