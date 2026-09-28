"use client";

import { useSyncExternalStore } from "react";
import { countdownParts } from "@/lib/utils/time";
import { eventPhase, type EventTiming } from "@/lib/agenda/status";
import { cn } from "@/lib/utils/cn";

const noopSubscribe = () => () => {};

/** Jam bersama sekali per detik untuk seluruh hitung mundur di halaman. */
let now = 0;
let timer: ReturnType<typeof setInterval> | null = null;
const clockListeners = new Set<() => void>();

function subscribeClock(listener: () => void) {
  clockListeners.add(listener);
  if (!timer) {
    now = Date.now();
    timer = setInterval(() => {
      now = Date.now();
      for (const notify of clockListeners) notify();
    }, 1000);
  }
  return () => {
    clockListeners.delete(listener);
    if (clockListeners.size === 0 && timer) {
      clearInterval(timer);
      timer = null;
    }
  };
}

/** Waktu sekarang (per detik) di klien; null saat render server/hidrasi. */
export function useNow(): number | null {
  const hydrated = useSyncExternalStore(noopSubscribe, () => true, () => false);
  const tick = useSyncExternalStore(
    subscribeClock,
    () => now || Date.now(),
    () => 0,
  );
  return hydrated ? tick : null;
}

const UNITS = [
  ["days", "hari"],
  ["hours", "jam"],
  ["minutes", "menit"],
  ["seconds", "detik"],
] as const;

/** Hitung mundur besar untuk kartu agenda: hari · jam · menit · detik. */
export function EventCountdown({
  event,
  className,
}: {
  event: EventTiming;
  className?: string;
}) {
  const current = useNow();
  const phase = current === null ? null : eventPhase(event, current);

  if (current === null || phase === null) {
    return <div className={cn("h-[3.75rem]", className)} aria-hidden="true" />;
  }
  if (phase !== "upcoming") {
    return (
      <p className={cn("text-primary-readable text-sm font-semibold", className)} role="status">
        {phase === "ongoing" ? "Sedang berlangsung" : "Acara selesai"}
      </p>
    );
  }

  const parts = countdownParts(Date.parse(event.starts_at) - current);
  return (
    <div className={cn("flex gap-2", className)} role="timer" aria-label="Hitung mundur acara">
      {UNITS.map(([key, label]) => (
        <div
          key={key}
          className="bg-surface-2 min-w-[3.5rem] rounded-2xl px-2 py-1.5 text-center"
        >
          <span className="block font-display text-2xl font-bold tabular-nums leading-tight">
            {String(parts[key]).padStart(2, "0")}
          </span>
          <span className="text-muted block text-caption2 font-semibold uppercase tracking-wide">
            {label}
          </span>
        </div>
      ))}
    </div>
  );
}
