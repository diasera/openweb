"use client";

import type { ReactNode } from "react";
import { CalendarDays } from "lucide-react";
import { MotionLink } from "@/components/motion";
import { useNow } from "@/lib/hooks/use-now";
import { compactCountdown, eventPhase, isIslandWorthy } from "@/lib/agenda/status";
import { eventPagePath } from "@/lib/agenda/calendar";
import { eventDateTile, formatEventSchedule } from "@/lib/utils/time";
import type { IslandEvent } from "../dynamic-island.types";
import styles from "../dynamic-island.module.css";

/**
 * Live Activity ringkas: hitung mundur acara (H-3, Besok, 02:15:09) menggantikan
 * titik lensa island saat acara tinggal ≤ 7 hari atau sedang berlangsung.
 */
export function IslandEventChip({
  event,
  onExpand,
  fallback = null,
}: {
  event: IslandEvent | null;
  onExpand: () => void;
  fallback?: ReactNode;
}) {
  const now = useNow();
  if (!event || now === null || !isIslandWorthy(event, now)) return fallback;
  const label = compactCountdown(event, now);
  if (!label) return fallback;
  const ongoing = label === "Berlangsung";

  return (
    <button
      type="button"
      onClick={onExpand}
      aria-haspopup="dialog"
      aria-label={`${event.title}, ${ongoing ? "sedang berlangsung" : label}. Buka panel cepat`}
      title={event.title}
      className={styles.eventChip}
      data-ongoing={ongoing || undefined}
    >
      {ongoing ? (
        <span className={styles.eventChipDot} aria-hidden="true" />
      ) : (
        <CalendarDays className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
      )}
      <span className="tabular-nums">{label}</span>
    </button>
  );
}

/** Kartu acara di quick panel: tanggal, judul, jadwal, dan status hitung mundur. */
export function IslandEventCard({
  event,
  onNavigate,
}: {
  event: IslandEvent;
  onNavigate: () => void;
}) {
  const now = useNow();
  const tile = eventDateTile(event.starts_at);
  const phase = now === null ? "upcoming" : eventPhase(event, now);
  const status =
    now === null
      ? null
      : phase === "past"
        ? "Selesai"
        : compactCountdown(event, now);

  return (
    <MotionLink
      href={eventPagePath(event.id)}
      prefetch={false}
      onClick={onNavigate}
      className={styles.panelEvent}
    >
      <span className={styles.panelEventDate} aria-hidden="true">
        <span className="block text-base font-bold leading-none">{tile.day}</span>
        <span className="block text-caption2 font-semibold uppercase">{tile.month}</span>
      </span>
      <span className="min-w-0 flex-1">
        <span className="text-muted block truncate text-caption2 font-semibold uppercase tracking-wide">
          Acara berikutnya
        </span>
        <span className="block truncate text-sm font-semibold">{event.title}</span>
        <span className="text-muted block truncate text-xs">
          {formatEventSchedule(event.starts_at, event.ends_at)}
        </span>
      </span>
      {status && <span className={styles.panelEventStatus}>{status}</span>}
    </MotionLink>
  );
}
