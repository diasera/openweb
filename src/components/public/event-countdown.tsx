"use client";

import { useNow } from "@/lib/hooks/use-now";
import { countdownParts } from "@/lib/utils/time";
import { eventPhase, type EventTiming } from "@/lib/agenda/status";
import { cn } from "@/lib/utils/cn";

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
