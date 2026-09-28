"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { usePathname } from "next/navigation";
import {
  setMediaSessionAction,
  setMediaSessionMetadata,
  setMediaSessionPlaybackState,
  setMediaSessionPosition,
} from "@/lib/music/media-session";
import {
  persistMusicEnabled,
  persistMusicTime,
  persistMusicTrackId,
  readMusicState,
  readMusicTime,
  readMusicTrackId,
} from "@/lib/music/persistence";
import type { PublicMusicTrack } from "@/lib/music/types";

type LibraryStatus = "idle" | "loading" | "ready" | "empty" | "error";

interface MusicContextValue {
  tracks: PublicMusicTrack[];
  currentTrack: PublicMusicTrack | null;
  currentIndex: number;
  currentTime: number;
  duration: number;
  enabled: boolean;
  expanded: boolean;
  isPlaying: boolean;
  status: LibraryStatus;
  error: string | null;
  setEnabled: (value: boolean) => Promise<void>;
  openPlayer: () => Promise<void>;
  closePlayer: () => void;
  togglePlayback: () => Promise<void>;
  next: () => Promise<void>;
  previous: () => Promise<void>;
  seek: (seconds: number) => void;
}

const MusicContext = createContext<MusicContextValue | null>(null);

function clampIndex(index: number, length: number) {
  if (length === 0) return 0;
  return ((index % length) + length) % length;
}

function compatibleAudioTracks(tracks: PublicMusicTrack[]): PublicMusicTrack[] {
  if (typeof document === "undefined") return tracks;
  const audio = document.createElement("audio");
  return tracks.filter(
    (track) =>
      !track.mime_type || audio.canPlayType(track.mime_type) !== "",
  );
}

function playbackError(error: unknown) {
  if (error instanceof DOMException && error.name === "NotAllowedError") {
    return "Browser menunggu sentuhanmu. Tekan tombol putar sekali lagi.";
  }
  return "Audio tidak dapat diputar. Coba lagu berikutnya.";
}

export function MusicProvider({
  siteName,
  initialTracks,
  children,
}: {
  siteName: string;
  initialTracks: PublicMusicTrack[];
  children: ReactNode;
}) {
  const pathname = usePathname();
  const audioRef = useRef<HTMLAudioElement>(null);
  const loadPromise = useRef<Promise<PublicMusicTrack[]> | null>(
    initialTracks.length > 0 ? Promise.resolve(initialTracks) : null,
  );
  const resumeTime = useRef(0);
  const persistedSecond = useRef(-1);
  const failedTrackIds = useRef(new Set<string>());
  const [tracks, setTracks] = useState<PublicMusicTrack[]>(initialTracks);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [enabled, setEnabledState] = useState(false);
  const [expandedPath, setExpandedPath] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [status, setStatus] = useState<LibraryStatus>(
    initialTracks.length > 0 ? "ready" : "idle",
  );
  const [error, setError] = useState<string | null>(null);

  const currentTrack = tracks[currentIndex] ?? null;
  const expanded = expandedPath === pathname;

  useEffect(() => {
    // Presentasi expanded bersifat transient dan tidak boleh hidup kembali
    // ketika pengguna kembali ke pathname lama.
    const frame = window.requestAnimationFrame(() => setExpandedPath(null));
    return () => window.cancelAnimationFrame(frame);
  }, [pathname]);

  const loadTracks = useCallback(async (force = false) => {
    if (!force && loadPromise.current) return loadPromise.current;
    setStatus("loading");
    setError(null);
    const promise = (async () => {
      const { fetchPublicMusicTracks } = await import(
        "@/lib/music/browser-library"
      );
      const nextTracks = compatibleAudioTracks(
        await fetchPublicMusicTracks(),
      );
      setTracks(nextTracks);
      setStatus(nextTracks.length > 0 ? "ready" : "empty");
      if (nextTracks.length > 0) {
        const savedId = readMusicTrackId();
        const savedIndex = nextTracks.findIndex((track) => track.id === savedId);
        setCurrentIndex(savedIndex >= 0 ? savedIndex : 0);
      } else {
        setCurrentIndex(0);
      }
      return nextTracks;
    })().catch((reason: unknown) => {
      const message = reason instanceof Error ? reason.message : "Gagal membaca playlist.";
      setStatus("error");
      setError(message);
      loadPromise.current = null;
      throw new Error(message);
    });
    loadPromise.current = promise;
    try {
      return await promise;
    } finally {
      if (force) loadPromise.current = null;
    }
  }, []);

  const playAudio = useCallback(async (audio: HTMLAudioElement) => {
    try {
      await audio.play();
      setError(null);
    } catch (reason) {
      const message = playbackError(reason);
      setError(message);
      throw new Error(message);
    }
  }, []);

  const selectTrack = useCallback(
    async (index: number, playAfter: boolean, sourceTracks?: PublicMusicTrack[]) => {
      const available = sourceTracks ?? tracks;
      if (available.length === 0) throw new Error("Playlist masih kosong.");
      const nextIndex = clampIndex(index, available.length);
      const track = available[nextIndex];
      const audio = audioRef.current;
      if (!track || !audio) return;
      const firstSource = !audio.getAttribute("src");
      if (firstSource) {
        resumeTime.current = readMusicTime();
      } else {
        resumeTime.current = 0;
      }
      setCurrentIndex(nextIndex);
      setCurrentTime(0);
      setDuration(track.duration_seconds ?? 0);
      persistMusicTrackId(track.id);
      persistMusicTime(0);
      if (audio.src !== track.audio_url) {
        audio.src = track.audio_url;
        audio.load();
      }
      if (playAfter) await playAudio(audio);
    },
    [playAudio, tracks],
  );

  const recoverFromPlaybackError = useCallback(() => {
    if (currentTrack) failedTrackIds.current.add(currentTrack.id);
    setIsPlaying(false);

    for (let offset = 1; offset <= tracks.length; offset += 1) {
      const nextIndex = clampIndex(currentIndex + offset, tracks.length);
      const candidate = tracks[nextIndex];
      if (!candidate || failedTrackIds.current.has(candidate.id)) continue;
      setError("Lagu ini tidak kompatibel. Mencoba lagu berikutnya…");
      void selectTrack(nextIndex, true).catch((reason: unknown) => {
        setError(
          reason instanceof Error
            ? reason.message
            : "Lagu berikutnya tidak dapat diputar.",
        );
      });
      return;
    }

    setEnabledState(false);
    persistMusicEnabled(false);
    setError("Tidak ada lagu yang dapat diputar oleh browser ini.");
  }, [currentIndex, currentTrack, selectTrack, tracks]);

  const enable = useCallback(async () => {
    failedTrackIds.current.clear();
    setEnabledState(true);
    persistMusicEnabled(true);
    let available: PublicMusicTrack[];
    try {
      available = await loadTracks(tracks.length === 0);
    } catch (reason) {
      setEnabledState(false);
      persistMusicEnabled(false);
      throw reason;
    }
    available = compatibleAudioTracks(available);
    if (available.length !== tracks.length) setTracks(available);
    if (available.length === 0) {
      setEnabledState(false);
      persistMusicEnabled(false);
      setExpandedPath(pathname);
      throw new Error(
        "Playlist belum berisi lagu yang kompatibel dengan browser ini.",
      );
    }
    const savedId = readMusicTrackId();
    const savedIndex = available.findIndex((track) => track.id === savedId);
    await selectTrack(savedIndex >= 0 ? savedIndex : 0, true, available);
  }, [loadTracks, pathname, selectTrack, tracks.length]);

  const setEnabled = useCallback(
    async (value: boolean) => {
      if (value) {
        await enable();
        return;
      }
      audioRef.current?.pause();
      setEnabledState(false);
      setExpandedPath(null);
      persistMusicEnabled(false);
    },
    [enable],
  );

  const openPlayer = useCallback(async () => {
    setExpandedPath(pathname);
    if (!enabled) {
      await enable();
      return;
    }
    const previousId = currentTrack?.id;
    const available = await loadTracks(true).catch(() => []);
    if (
      available.length > 0 &&
      previousId &&
      !available.some((track) => track.id === previousId)
    ) {
      await selectTrack(0, isPlaying, available);
    }
  }, [currentTrack?.id, enable, enabled, isPlaying, loadTracks, pathname, selectTrack]);

  const closePlayer = useCallback(() => setExpandedPath(null), []);

  useEffect(() => {
    if (!expanded) return;

    function collapseFromOutside(event: PointerEvent) {
      const target = event.target;
      if (
        target instanceof Element &&
        target.closest("[data-dynamic-island]")
      ) {
        return;
      }
      setExpandedPath(null);
    }

    function collapseFromKeyboard(event: KeyboardEvent) {
      if (event.key === "Escape") setExpandedPath(null);
    }

    document.addEventListener("pointerdown", collapseFromOutside, true);
    document.addEventListener("keydown", collapseFromKeyboard);
    return () => {
      document.removeEventListener("pointerdown", collapseFromOutside, true);
      document.removeEventListener("keydown", collapseFromKeyboard);
    };
  }, [expanded]);

  const togglePlayback = useCallback(async () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (!enabled) {
      await enable();
      return;
    }
    if (audio.paused) {
      if (!audio.src && currentTrack) audio.src = currentTrack.audio_url;
      await playAudio(audio);
    } else {
      audio.pause();
    }
  }, [currentTrack, enable, enabled, playAudio]);

  const next = useCallback(async () => {
    await selectTrack(currentIndex + 1, isPlaying);
  }, [currentIndex, isPlaying, selectTrack]);

  const previous = useCallback(async () => {
    const audio = audioRef.current;
    if (audio && audio.currentTime > 4) {
      audio.currentTime = 0;
      return;
    }
    await selectTrack(currentIndex - 1, isPlaying);
  }, [currentIndex, isPlaying, selectTrack]);

  const seek = useCallback((seconds: number) => {
    const audio = audioRef.current;
    if (!audio || !Number.isFinite(seconds)) return;
    audio.currentTime = Math.max(0, Math.min(seconds, audio.duration || seconds));
    setCurrentTime(audio.currentTime);
  }, []);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      const persisted = readMusicState();
      const savedEnabled = persisted.enabled;
      const savedId = persisted.trackId;
      const savedTime = persisted.time;
      const available = compatibleAudioTracks(tracks);
      const removedIncompatible = available.length !== tracks.length;
      if (removedIncompatible) {
        setTracks(available);
        loadPromise.current = null;
      }
      resumeTime.current = savedTime;
      const savedIndex = available.findIndex((track) => track.id === savedId);
      if (savedIndex >= 0) setCurrentIndex(savedIndex);
      const onlyIncompatible = tracks.length > 0 && available.length === 0;
      setEnabledState(savedEnabled && !onlyIncompatible);
      if (onlyIncompatible) {
        setStatus("empty");
        setError("Playlist belum berisi lagu yang kompatibel dengan browser ini.");
        persistMusicEnabled(false);
      } else if (available.length > 0) {
        setStatus("ready");
      }
      if (savedEnabled && tracks.length === 0) {
        void loadTracks().catch(() => {
          setEnabledState(false);
          persistMusicEnabled(false);
        });
      }
    });
    return () => window.cancelAnimationFrame(frame);
  }, [loadTracks, tracks]);

  useEffect(() => {
    if (!currentTrack) return;
    setMediaSessionMetadata({
      title: currentTrack.title,
      artist: currentTrack.artist || siteName,
      album: siteName,
    });
    setMediaSessionAction("play", () => {
      void togglePlayback();
    });
    setMediaSessionAction("pause", () => {
      audioRef.current?.pause();
    });
    setMediaSessionAction("previoustrack", () => {
      void previous().catch(() => undefined);
    });
    setMediaSessionAction("nexttrack", () => {
      void next().catch(() => undefined);
    });
    setMediaSessionAction("seekto", (details) => {
      if (typeof details.seekTime === "number") seek(details.seekTime);
    });
    setMediaSessionAction("seekbackward", (details) => {
      seek((audioRef.current?.currentTime ?? 0) - (details.seekOffset ?? 10));
    });
    setMediaSessionAction("seekforward", (details) => {
      seek((audioRef.current?.currentTime ?? 0) + (details.seekOffset ?? 10));
    });
    return () => {
      for (const action of [
        "play",
        "pause",
        "previoustrack",
        "nexttrack",
        "seekto",
        "seekbackward",
        "seekforward",
      ] as MediaSessionAction[]) {
        setMediaSessionAction(action, null);
      }
    };
  }, [currentTrack, next, previous, seek, siteName, togglePlayback]);

  useEffect(() => {
    setMediaSessionPlaybackState(isPlaying ? "playing" : "paused");
  }, [isPlaying]);

  const context = useMemo<MusicContextValue>(
    () => ({
      tracks,
      currentTrack,
      currentIndex,
      currentTime,
      duration,
      enabled,
      expanded,
      isPlaying,
      status,
      error,
      setEnabled,
      openPlayer,
      closePlayer,
      togglePlayback,
      next,
      previous,
      seek,
    }),
    [
      tracks,
      currentTrack,
      currentIndex,
      currentTime,
      duration,
      enabled,
      expanded,
      isPlaying,
      status,
      error,
      setEnabled,
      openPlayer,
      closePlayer,
      togglePlayback,
      next,
      previous,
      seek,
    ],
  );

  return (
    <MusicContext.Provider value={context}>
      {children}
      <audio
        ref={audioRef}
        preload="metadata"
        onLoadedMetadata={(event) => {
          const audio = event.currentTarget;
          setDuration(Number.isFinite(audio.duration) ? audio.duration : 0);
          if (resumeTime.current > 0 && resumeTime.current < audio.duration) {
            audio.currentTime = resumeTime.current;
            resumeTime.current = 0;
          }
        }}
        onDurationChange={(event) => {
          const value = event.currentTarget.duration;
          if (Number.isFinite(value)) setDuration(value);
        }}
        onTimeUpdate={(event) => {
          const value = event.currentTarget.currentTime;
          setCurrentTime(value);
          const second = Math.floor(value);
          if (second !== persistedSecond.current && second % 5 === 0) {
            persistedSecond.current = second;
            persistMusicTime(value);
          }
          if (
            Number.isFinite(event.currentTarget.duration) &&
            event.currentTarget.duration > 0
          ) {
            setMediaSessionPosition({
              duration: event.currentTarget.duration,
              playbackRate: event.currentTarget.playbackRate,
              position: Math.min(value, event.currentTarget.duration),
            });
          }
        }}
        onPlay={() => {
          // Seperti presentation transient iOS: baru mengembang setelah audio
          // benar-benar berhasil diputar, bukan saat play masih diminta.
          setIsPlaying(true);
          if (currentTrack) failedTrackIds.current.delete(currentTrack.id);
          setExpandedPath(pathname);
        }}
        onPause={(event) => {
          setIsPlaying(false);
          persistMusicTime(event.currentTarget.currentTime);
        }}
        onEnded={() => {
          void selectTrack(currentIndex + 1, true).catch((reason: unknown) => {
            setError(reason instanceof Error ? reason.message : "Lagu berikutnya gagal diputar.");
          });
        }}
        onError={recoverFromPlaybackError}
      />
    </MusicContext.Provider>
  );
}

export function useMusic() {
  const context = useContext(MusicContext);
  if (!context) throw new Error("useMusic harus dipakai di dalam MusicProvider.");
  return context;
}
