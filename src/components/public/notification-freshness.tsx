"use client";

import { useEffect, useState } from "react";
import { useHydrated } from "@/lib/hooks/use-now";
import { readStorage, STORAGE_KEYS, writeStorage } from "@/lib/utils/storage";

function readLastSeen(): number {
  const parsed = Number.parseFloat(
    readStorage(STORAGE_KEYS.notificationLastSeen) ?? "",
  );
  return Number.isFinite(parsed) ? parsed : 0;
}

/** Chip "Baru" untuk notifikasi yang lebih segar dari kunjungan sebelumnya. */
export function FreshBadge({ createdAt }: { createdAt: string }) {
  const hydrated = useHydrated();
  // Titik kunjungan SEBELUMNYA dibekukan saat badge dipasang — sebelum effect
  // FreshnessSync menulis kunjungan ini — sehingga render ulang pasca-hidrasi
  // tidak membaca nilai yang baru ditulis dan badge tidak pernah hilang
  // sendiri. Server tidak membaca storage dan tidak merender badge apa pun.
  const [lastSeen] = useState(readLastSeen);

  if (!hydrated || Date.parse(createdAt) <= lastSeen) return null;
  return (
    <span className="bg-primary/10 text-primary-readable rounded-full px-2 py-0.5 text-caption2 font-semibold">
      Baru
    </span>
  );
}

/**
 * Catat kunjungan ini sebagai created_at termutakhir agar kunjungan
 * berikutnya hanya menandai notifikasi yang benar-benar baru.
 */
export function FreshnessSync({ latestAt }: { latestAt: string | null }) {
  useEffect(() => {
    if (!latestAt) return;
    const next = Math.max(readLastSeen(), Date.parse(latestAt));
    writeStorage(STORAGE_KEYS.notificationLastSeen, String(next));
  }, [latestAt]);
  return null;
}
