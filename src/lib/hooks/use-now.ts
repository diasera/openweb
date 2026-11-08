"use client";

import { useSyncExternalStore } from "react";

const noopSubscribe = () => () => {};

/**
 * `false` saat render server dan pass hidrasi pertama, `true` sesudahnya.
 * Pusat pola "nilai khusus browser" agar markup server tetap deterministik.
 */
export function useHydrated(): boolean {
  return useSyncExternalStore(noopSubscribe, () => true, () => false);
}

interface SharedClock {
  subscribe: (listener: () => void) => () => void;
  getSnapshot: () => number;
}

/** Satu interval per resolusi untuk seluruh halaman, bukan satu per komponen. */
const clocks = new Map<number, SharedClock>();

function sharedClock(intervalMs: number): SharedClock {
  const existing = clocks.get(intervalMs);
  if (existing) return existing;

  let now = 0;
  let timer: ReturnType<typeof setInterval> | null = null;
  const listeners = new Set<() => void>();
  const clock: SharedClock = {
    subscribe(listener) {
      listeners.add(listener);
      if (!timer) {
        now = Date.now();
        timer = setInterval(() => {
          now = Date.now();
          for (const notify of listeners) notify();
        }, intervalMs);
      }
      return () => {
        listeners.delete(listener);
        if (listeners.size === 0 && timer) {
          clearInterval(timer);
          timer = null;
          // Tanpa ini mount berikutnya sempat merender dengan jam basi
          // (label/hitung mundur meloncat sesudah paint pertama).
          now = 0;
        }
      };
    },
    // Snapshot di-cache: React mewajibkan nilai stabil di antara dua panggilan.
    getSnapshot: () => (now ||= Date.now()),
  };
  clocks.set(intervalMs, clock);
  return clock;
}

/**
 * Waktu sekarang di klien yang berdetak tiap `intervalMs` (bawaan per detik
 * untuk hitung mundur; per menit cukup untuk label "2 jam lalu"). `null` saat
 * render server/hidrasi sehingga teks berbasis jam tidak pernah mismatch.
 */
export function useNow(intervalMs = 1000): number | null {
  const hydrated = useHydrated();
  const clock = sharedClock(intervalMs);
  const tick = useSyncExternalStore(clock.subscribe, clock.getSnapshot, () => 0);
  return hydrated ? tick : null;
}
