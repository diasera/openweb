import { readStorage, STORAGE_KEYS, writeStorage } from "@/lib/utils/storage";

export interface PersistedMusicState {
  enabled: boolean;
  trackId: string | null;
  time: number;
}

// Storage privat/penuh tidak boleh menghentikan playback: helper bersama
// menelan error dan pemutar tetap berjalan dengan state di memori.

export function readMusicTrackId(): string | null {
  return readStorage(STORAGE_KEYS.musicTrack);
}

export function readMusicTime(): number {
  const value = Number(readStorage(STORAGE_KEYS.musicTime));
  return Number.isFinite(value) ? Math.max(0, value) : 0;
}

export function readMusicState(): PersistedMusicState {
  return {
    enabled: readStorage(STORAGE_KEYS.musicEnabled) === "true",
    trackId: readMusicTrackId(),
    time: readMusicTime(),
  };
}

export function persistMusicEnabled(enabled: boolean): void {
  writeStorage(STORAGE_KEYS.musicEnabled, String(enabled));
}

export function persistMusicTrackId(trackId: string): void {
  writeStorage(STORAGE_KEYS.musicTrack, trackId);
}

export function persistMusicTime(time: number): void {
  if (!Number.isFinite(time)) return;
  writeStorage(STORAGE_KEYS.musicTime, String(Math.max(0, time)));
}
