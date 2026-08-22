"use client";

import { useEffect, useSyncExternalStore } from "react";

const LAST_SEEN_KEY = "notifLastSeen";

function readLastSeen(): number {
  try {
    const raw = localStorage.getItem(LAST_SEEN_KEY);
    const parsed = raw ? Number.parseFloat(raw) : NaN;
    return Number.isFinite(parsed) ? parsed : 0;
  } catch {
    return 0;
  }
}

const subscribeNoop = () => () => {};

/** Chip "Baru" untuk notifikasi yang lebih segar dari kunjungan terakhir. */
export function FreshBadge({ createdAt }: { createdAt: string }) {
  // Nilai client-only: localStorage dibaca pasca-hidrasi (server: false).
  const fresh = useSyncExternalStore(
    subscribeNoop,
    () => Date.parse(createdAt) > readLastSeen(),
    () => false,
  );

  if (!fresh) return null;
  return (
    <span className="bg-primary/10 text-primary-readable rounded-full px-2 py-0.5 text-[10px] font-semibold">
      Baru
    </span>
  );
}

/**
 * Catat titik waktu kunjungan ini SETELAH semua badge terhitung (komponen
 * ini dirender paling akhir di daftar). Disimpan sebagai created_at termutakhir
 * sehingga penanda "Baru" akurat lintas perangkat kunjungan yang sama.
 */
export function FreshnessSync({ latestAt }: { latestAt: string | null }) {
  useEffect(() => {
    if (!latestAt) return;
    try {
      const next = Math.max(readLastSeen(), Date.parse(latestAt));
      localStorage.setItem(LAST_SEEN_KEY, String(next));
    } catch {
      /* ignore */
    }
  }, [latestAt]);
  return null;
}
