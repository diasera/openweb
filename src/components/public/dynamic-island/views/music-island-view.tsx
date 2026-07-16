"use client";

import type { CSSProperties } from "react";
import { LoaderCircle, Pause, Play, SkipBack, SkipForward } from "lucide-react";
import { useToast } from "@/components/ui/toast";
import { MusicBars } from "@/components/public/music/music-bars";
import { useMusic } from "@/components/public/music";
import styles from "../dynamic-island.module.css";

function timeLabel(value: number) {
  if (!Number.isFinite(value) || value < 0) return "0:00";
  const seconds = Math.floor(value);
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
}

export function MusicIslandView() {
  const music = useMusic();
  const { toast } = useToast();
  const progress =
    music.duration > 0
      ? Math.min(100, Math.max(0, (music.currentTime / music.duration) * 100))
      : 0;

  function run(action: () => Promise<void>) {
    void action().catch((error: unknown) => {
      toast.error(error instanceof Error ? error.message : "Kontrol musik gagal.");
    });
  }

  const title =
    music.currentTrack?.title ||
    (music.status === "loading" ? "Membuka playlist…" : "Playlist");
  const subtitle =
    music.currentTrack?.artist ||
    music.error ||
    (music.status === "empty" ? "Belum ada lagu aktif" : "Pemutar musik");

  return (
    <div className={styles.musicPlayer} data-playing={music.isPlaying}>
      <div className={styles.musicHeader}>
        <span className={styles.musicArtwork}>
          {music.status === "loading" ? (
            <LoaderCircle className={styles.musicLoader} />
          ) : (
            <MusicBars playing={music.isPlaying} />
          )}
        </span>

        <div
          key={music.currentTrack?.id ?? music.status}
          className={styles.musicMetadata}
        >
          <p className={styles.musicTitle}>{title}</p>
          <p className={styles.musicArtist}>{subtitle}</p>
        </div>

        <MusicBars
          playing={music.isPlaying}
          className={styles.musicSignal}
        />
      </div>

      <div className={styles.musicTimeline}>
        <span className={styles.musicTime}>{timeLabel(music.currentTime)}</span>
        <input
          type="range"
          min={0}
          max={Math.max(music.duration, 1)}
          step={0.1}
          value={Math.min(music.currentTime, Math.max(music.duration, 1))}
          onChange={(event) => music.seek(Number(event.currentTarget.value))}
          disabled={!music.currentTrack}
          aria-label="Posisi lagu"
          className={styles.musicProgress}
          style={{ "--music-progress": `${progress}%` } as CSSProperties}
        />
        <span className={styles.musicTime}>{timeLabel(music.duration)}</span>
      </div>

      <div className={styles.musicTransport}>
        <button
          type="button"
          aria-label="Lagu sebelumnya"
          onClick={() => run(music.previous)}
          disabled={music.tracks.length === 0}
          className={styles.musicControl}
        >
          <SkipBack className="h-[21px] w-[21px] fill-current" />
        </button>
        <button
          type="button"
          aria-label={music.isPlaying ? "Jeda" : "Putar"}
          onClick={() => run(music.togglePlayback)}
          disabled={music.tracks.length === 0}
          className={`${styles.musicControl} ${styles.musicPlayControl}`}
        >
          <span key={music.isPlaying ? "pause" : "play"} className={styles.musicControlIcon}>
            {music.isPlaying ? (
              <Pause className="h-[25px] w-[25px] fill-current" />
            ) : (
              <Play className="ml-0.5 h-[25px] w-[25px] fill-current" />
            )}
          </span>
        </button>
        <button
          type="button"
          aria-label="Lagu berikutnya"
          onClick={() => run(music.next)}
          disabled={music.tracks.length === 0}
          className={styles.musicControl}
        >
          <SkipForward className="h-[21px] w-[21px] fill-current" />
        </button>
      </div>
    </div>
  );
}
