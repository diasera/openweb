"use client";

import type { CSSProperties } from "react";
import {
  ChevronDown,
  ListMusic,
  LoaderCircle,
  Pause,
  Play,
  SkipBack,
  SkipForward,
} from "lucide-react";
import { useToast } from "@/components/ui/toast";
import { MusicBars } from "@/components/public/music/music-bars";
import { useMusic } from "@/components/public/music";
import { formatClock } from "@/lib/utils/time";
import { cn } from "@/lib/utils/cn";
import styles from "../dynamic-island.module.css";

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
        {music.tracks.length > 1 && (
          <button
            type="button"
            aria-label={music.queueOpen ? "Sembunyikan daftar lagu" : "Tampilkan daftar lagu"}
            aria-expanded={music.queueOpen}
            onClick={music.toggleQueue}
            className={cn(
              styles.musicClose,
              music.queueOpen && "bg-primary/15 text-primary-readable",
            )}
          >
            <ListMusic className="h-4 w-4" />
          </button>
        )}
        <button
          type="button"
          aria-label="Tutup pemutar musik"
          onClick={music.closePlayer}
          className={styles.musicClose}
        >
          <ChevronDown className="h-4 w-4" />
        </button>
      </div>

      <div className={styles.musicTimeline}>
        <span className={styles.musicTime}>{formatClock(music.currentTime)}</span>
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
        <span className={styles.musicTime}>{formatClock(music.duration)}</span>
      </div>

      <div className={styles.musicTransport}>
        <button
          type="button"
          aria-label="Lagu sebelumnya"
          onClick={() => run(music.previous)}
          disabled={music.tracks.length === 0}
          className={styles.musicControl}
        >
          <SkipBack className="size-5.25 fill-current" />
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
              <Pause className="size-6.25 fill-current" />
            ) : (
              <Play className="ml-0.5 size-6.25 fill-current" />
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
          <SkipForward className="size-5.25 fill-current" />
        </button>
      </div>

      {music.queueOpen && music.tracks.length > 1 && (
        <div
          role="listbox"
          aria-label="Daftar lagu"
          className={styles.musicQueue}
        >
          {music.tracks.map((track, idx) => {
            const activeTrack = idx === music.currentIndex;
            return (
              <button
                key={track.id}
                type="button"
                role="option"
                aria-selected={activeTrack}
                onClick={() => run(() => music.playTrackAt(idx))}
                className={cn(
                  styles.musicQueueItem,
                  activeTrack && styles.musicQueueItemActive,
                )}
              >
                <span className="text-muted w-4 shrink-0 text-left text-caption2 tabular-nums">
                  {activeTrack ? (
                    <MusicBars playing={music.isPlaying} className="text-primary-readable scale-75" />
                  ) : (
                    idx + 1
                  )}
                </span>
                <span className="min-w-0 flex-1 truncate text-left">
                  <span className="block truncate text-xs font-semibold">
                    {track.title}
                  </span>
                  {track.artist && (
                    <span className="text-muted block truncate text-[11px]">
                      {track.artist}
                    </span>
                  )}
                </span>
                {track.duration_seconds ? (
                  <span className="text-muted shrink-0 text-caption2 tabular-nums">
                    {formatClock(track.duration_seconds)}
                  </span>
                ) : null}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
