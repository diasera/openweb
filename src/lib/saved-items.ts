import { useSyncExternalStore } from "react";

/**
 * Koleksi Tersimpan milik perangkat (localStorage), satu sumber untuk tombol
 * Simpan di pin & artikel serta halaman /tersimpan. Perubahan di tab lain
 * ikut tersinkron lewat event `storage`.
 */
export type SavedKind = "pin" | "post";

export interface SavedItem {
  kind: SavedKind;
  id: string;
  savedAt: number;
}

const STORAGE_KEY = "saved_items";
/** Format lama: satu kunci per item, `saved:pin-<id>` / `saved:post-<id>` = "1". */
const LEGACY_PATTERN = /^saved:(pin|post)-(.+)$/;
const MAX_SAVED = 300;
const EMPTY: SavedItem[] = [];

let cache: SavedItem[] | null = null;
const listeners = new Set<() => void>();

function isSavedItem(value: unknown): value is SavedItem {
  const item = value as SavedItem;
  return (
    typeof value === "object" &&
    value !== null &&
    (item.kind === "pin" || item.kind === "post") &&
    typeof item.id === "string" &&
    typeof item.savedAt === "number"
  );
}

function write(list: SavedItem[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
  } catch {
    /* penyimpanan penuh/diblokir: koleksi tetap berlaku di sesi ini */
  }
}

function migrateLegacy(list: SavedItem[]): SavedItem[] {
  const legacy: SavedItem[] = [];
  for (let index = localStorage.length - 1; index >= 0; index -= 1) {
    const key = localStorage.key(index);
    const match = key ? LEGACY_PATTERN.exec(key) : null;
    if (!key || !match) continue;
    if (localStorage.getItem(key) === "1") {
      legacy.push({ kind: match[1] as SavedKind, id: match[2]!, savedAt: 0 });
    }
    localStorage.removeItem(key);
  }
  if (legacy.length === 0) return list;
  const known = new Set(list.map((item) => `${item.kind}:${item.id}`));
  const merged = [
    ...list,
    ...legacy.filter((item) => !known.has(`${item.kind}:${item.id}`)),
  ];
  write(merged);
  return merged;
}

function read(): SavedItem[] {
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "[]");
    const list = Array.isArray(parsed) ? parsed.filter(isSavedItem) : [];
    return migrateLegacy(list);
  } catch {
    return EMPTY;
  }
}

function snapshot(): SavedItem[] {
  cache ??= read();
  return cache;
}

function emit() {
  cache = null;
  for (const listener of listeners) listener();
}

function onStorage(event: StorageEvent) {
  if (event.key === null || event.key === STORAGE_KEY) emit();
}

function subscribe(listener: () => void) {
  if (listeners.size === 0) window.addEventListener("storage", onStorage);
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
    if (listeners.size === 0) window.removeEventListener("storage", onStorage);
  };
}

const serverSnapshot = () => EMPTY;

/** Koleksi terbaru-dulu; kosong saat render server. */
export function useSavedItems(): SavedItem[] {
  return useSyncExternalStore(subscribe, snapshot, serverSnapshot);
}

export function useIsSaved(kind: SavedKind, id: string): boolean {
  return useSyncExternalStore(
    subscribe,
    () => snapshot().some((item) => item.kind === kind && item.id === id),
    () => false,
  );
}

/** Simpan/lepas item; mengembalikan status baru. */
export function toggleSaved(kind: SavedKind, id: string): boolean {
  const list = snapshot();
  const saved = list.some((item) => item.kind === kind && item.id === id);
  write(
    saved
      ? list.filter((item) => !(item.kind === kind && item.id === id))
      : [{ kind, id, savedAt: Date.now() }, ...list].slice(0, MAX_SAVED),
  );
  emit();
  return !saved;
}

/** Simpan tanpa melepas (ketuk dua kali); `true` hanya bila baru disimpan. */
export function saveItem(kind: SavedKind, id: string): boolean {
  if (snapshot().some((item) => item.kind === kind && item.id === id)) return false;
  return toggleSaved(kind, id);
}

/** Lepas item yang sudah tidak tersedia (dihapus/tidak lagi terbit). */
export function forgetSaved(kind: SavedKind, ids: Iterable<string>) {
  const gone = new Set(ids);
  if (gone.size === 0) return;
  write(snapshot().filter((item) => !(item.kind === kind && gone.has(item.id))));
  emit();
}
