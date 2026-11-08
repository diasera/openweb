import type { EventRow } from "@/lib/types/database";
import { calendarDaysBetween, countdownParts } from "@/lib/utils/time";

export type EventTiming = Pick<EventRow, "starts_at" | "ends_at">;
export type EventPhase = "upcoming" | "ongoing" | "past";

/** Tanpa jam selesai, acara dianggap berlangsung 3 jam. */
export const EVENT_DEFAULT_DURATION_MS = 3 * 60 * 60 * 1000;

/** Island hanya menampilkan acara yang berlangsung atau paling lambat H-7. */
export const ISLAND_EVENT_WINDOW_DAYS = 7;

export function eventEndMs(event: EventTiming): number {
  return event.ends_at
    ? Date.parse(event.ends_at)
    : Date.parse(event.starts_at) + EVENT_DEFAULT_DURATION_MS;
}

export function eventPhase(event: EventTiming, now: number): EventPhase {
  if (now < Date.parse(event.starts_at)) return "upcoming";
  return now < eventEndMs(event) ? "ongoing" : "past";
}

/** Label ringkas khas Indonesia: "H-3", "Besok", "3j 12m", "12:05", "Berlangsung". */
export function compactCountdown(event: EventTiming, now: number): string | null {
  const phase = eventPhase(event, now);
  if (phase === "past") return null;
  if (phase === "ongoing") return "Berlangsung";
  const start = Date.parse(event.starts_at);
  const days = calendarDaysBetween(new Date(now), new Date(start));
  if (days >= 2) return `H-${days}`;
  if (days === 1) return "Besok";
  const { hours, minutes, seconds } = countdownParts(start - now);
  if (hours >= 1) return `${hours}j ${minutes}m`;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

export function isIslandWorthy(event: EventTiming, now: number): boolean {
  const phase = eventPhase(event, now);
  if (phase === "past") return false;
  if (phase === "ongoing") return true;
  return (
    calendarDaysBetween(new Date(now), new Date(Date.parse(event.starts_at))) <=
    ISLAND_EVENT_WINDOW_DAYS
  );
}
