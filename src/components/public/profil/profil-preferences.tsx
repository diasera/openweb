"use client";

import { Bell, Music2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { IconPlate } from "@/components/ui/icon-plate";
import { ToggleRow } from "@/components/ui/toggle-row";
import { useToast } from "@/components/ui/toast";
import { useMusic } from "@/components/public/music";
import { useBellSubscription } from "@/components/public/use-bell-subscription";

/**
 * Preferensi pengunjung di hub Profil: lonceng notifikasi (in-app + push bila
 * tersedia) dan musik latar yang tetap berjalan antarhalaman. Keduanya hanya
 * tersimpan di perangkat ini; tidak ada akun pengunjung.
 */
export function ProfilPreferences({ initialBell }: { initialBell: boolean }) {
  const bell = useBellSubscription(initialBell);
  const music = useMusic();
  const { toast } = useToast();

  return (
    <Card className="divide-border/70 divide-y overflow-hidden">
      <ToggleRow
        icon={<IconPlate icon={Bell} size="sm" className="bg-tone-red text-white" />}
        label="Notifikasi"
        description="Kabar artikel, agenda, dan pengumuman terbaru."
        checked={bell.enabled}
        onChange={bell.setEnabled}
        disabled={bell.pending}
      />
      <ToggleRow
        icon={<IconPlate icon={Music2} size="sm" className="bg-tone-pink text-white" />}
        label="Musik latar"
        description={
          music.currentTrack
            ? `${music.currentTrack.title} · ${music.currentTrack.artist || "Playlist website"}`
            : "Playlist opsional, tetap berjalan saat berpindah halaman."
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
