const MUSIC_STORAGE_KEYS = {
  enabled: "webkelas.music.enabled",
  track: "webkelas.music.track",
  time: "webkelas.music.time",
} as const;

export interface PersistedMusicState {
  enabled: boolean;
  trackId: string | null;
  time: number;
}

function browserStorage(): Storage | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

function read(key: string): string | null {
  try {
    return browserStorage()?.getItem(key) ?? null;
  } catch {
    return null;
  }
}

function write(key: string, value: string): void {
  try {
    browserStorage()?.setItem(key, value);
  } catch {
    // Storage privat/penuh tidak boleh menghentikan playback.
  }
}

export function readMusicTrackId(): string | null {
  return read(MUSIC_STORAGE_KEYS.track);
}

export function readMusicTime(): number {
  const value = Number(read(MUSIC_STORAGE_KEYS.time));
  return Number.isFinite(value) ? Math.max(0, value) : 0;
}

export function readMusicState(): PersistedMusicState {
  return {
    enabled: read(MUSIC_STORAGE_KEYS.enabled) === "true",
    trackId: readMusicTrackId(),
    time: readMusicTime(),
  };
}

export function persistMusicEnabled(enabled: boolean): void {
  write(MUSIC_STORAGE_KEYS.enabled, String(enabled));
}

export function persistMusicTrackId(trackId: string): void {
  write(MUSIC_STORAGE_KEYS.track, trackId);
}

export function persistMusicTime(time: number): void {
  if (!Number.isFinite(time)) return;
  write(MUSIC_STORAGE_KEYS.time, String(Math.max(0, time)));
}
