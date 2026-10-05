/**
 * Akses Web Storage yang aman: mode privat, kuota penuh, atau storage yang
 * diblokir tidak boleh menjatuhkan fitur. Satu pintu untuk preferensi tema,
 * musik, notifikasi, like pesan, koleksi Tersimpan, dan pelacak kunjungan.
 */

/** Kunci storage milik aplikasi — satu daftar agar ejaan tidak pernah ganda. */
export const STORAGE_KEYS = {
  /** Juga dibaca skrip anti-FOUC (ThemeScript) sebelum React berjalan. */
  theme: "theme",
  notificationPrompt: "notifPrompt",
  notificationLastSeen: "notifLastSeen",
  likedMessages: "liked_messages",
  savedItems: "saved_items",
  musicEnabled: "webkelas.music.enabled",
  musicTrack: "webkelas.music.track",
  musicTime: "webkelas.music.time",
  /** sessionStorage: satu ping kunjungan per tab. */
  visitTracked: "kelas_tracked",
} as const;

type StorageArea = "local" | "session";

function browserStorage(area: StorageArea): Storage | null {
  if (typeof window === "undefined") return null;
  try {
    return area === "session" ? window.sessionStorage : window.localStorage;
  } catch {
    return null;
  }
}

/** Storage dapat diakses (tidak diblokir kebijakan cookie/mode privat). */
export function hasStorage(area: StorageArea = "local"): boolean {
  return browserStorage(area) !== null;
}

export function readStorage(
  key: string,
  area: StorageArea = "local",
): string | null {
  try {
    return browserStorage(area)?.getItem(key) ?? null;
  } catch {
    return null;
  }
}

/** `false` bila storage tidak tersedia/penuh; pemanggil tetap berjalan di memori. */
export function writeStorage(
  key: string,
  value: string,
  area: StorageArea = "local",
): boolean {
  try {
    const storage = browserStorage(area);
    if (!storage) return false;
    storage.setItem(key, value);
    return true;
  } catch {
    return false;
  }
}

/** Baca JSON tanpa melempar; nilai rusak dianggap kosong. */
export function readStorageJson(
  key: string,
  area: StorageArea = "local",
): unknown {
  const raw = readStorage(key, area);
  if (raw === null) return null;
  try {
    return JSON.parse(raw) as unknown;
  } catch {
    return null;
  }
}
