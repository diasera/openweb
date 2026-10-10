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

/**
 * Angka dua digit yang berganti per digit: hanya digit yang berubah dipasang
 * ulang (key = posisi + nilai) sehingga ia "jatuh" masuk (.motion-digit),
 * sementara digit lain diam — efek flip-clock tanpa library.
 */
function RollingNumber({ value }: { value: number }) {
  const digits = String(value).padStart(2, "0").split("");
  return (
    <span className="inline-flex overflow-hidden" aria-hidden="true">
      {digits.map((digit, position) => (
        <span key={`${digits.length - position}-${digit}`} className="motion-digit">
          {digit}
        </span>
      ))}
    </span>
  );
}

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
      <p
        className={cn(
          "text-primary-readable inline-flex items-center gap-2 text-sm font-semibold",
          className,
        )}
        role="status"
      >
        {phase === "ongoing" && <span className="motion-live-dot size-2" aria-hidden="true" />}
        {phase === "ongoing" ? "Sedang berlangsung" : "Acara selesai"}
      </p>
    );
  }

  const parts = countdownParts(Date.parse(event.starts_at) - current);
  const spoken = `${parts.days} hari ${parts.hours} jam ${parts.minutes} menit lagi`;
  return (
    <div
      className={cn("grid grid-cols-4 gap-2 sm:flex", className)}
      role="timer"
      aria-label={`Hitung mundur acara: ${spoken}`}
    >
      {UNITS.map(([key, label]) => (
        <div
          key={key}
          className="bg-surface-2 border-border/60 min-w-[3.5rem] rounded-2xl border px-2 py-1.5 text-center sm:min-w-[4.25rem]"
        >
          <span className="block font-display text-2xl font-bold tabular-nums leading-tight sm:text-title1">
            <RollingNumber value={parts[key]} />
          </span>
          <span className="text-muted block text-caption2 font-semibold uppercase tracking-wide">
            {label}
          </span>
        </div>
      ))}
    </div>
  );
}
