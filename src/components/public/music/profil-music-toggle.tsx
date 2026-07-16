"use client";

import { Music2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { ToggleRow } from "@/components/ui/toggle-row";
import { useToast } from "@/components/ui/toast";
import { useMusic } from "./music-provider";

export function ProfilMusicToggle() {
  const music = useMusic();
  const { toast } = useToast();

  return (
    <Card className="overflow-hidden">
      <ToggleRow
        icon={<Music2 className="h-[18px] w-[18px]" />}
        label="Musik latar"
        description={
          music.currentTrack
            ? `${music.currentTrack.title} · ${music.currentTrack.artist || "Playlist website"}`
            : "Playlist opsional, tetap berjalan saat berpindah halaman"
        }
        checked={music.enabled}
        onChange={(value) => {
          void music.setEnabled(value).catch((error: unknown) => {
            toast.error(error instanceof Error ? error.message : "Musik tidak dapat diaktifkan.");
          });
        }}
        disabled={music.status === "loading"}
      />
    </Card>
  );
}
