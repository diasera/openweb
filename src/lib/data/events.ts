import { cache } from "react";
import { createPublicSupabase, isSupabaseConfigured } from "@/lib/supabase/public";
import { EVENT_DEFAULT_DURATION_MS } from "@/lib/agenda/status";
import type { EventRow } from "@/lib/types/database";
import { isUuid } from "@/lib/utils/id";
import { DEMO_EVENTS } from "./demo";
import { optionalRead, unwrapFeature } from "./read";

/** Agenda versi publik (tanpa id pembuat). */
export type PublicEvent = Omit<EventRow, "created_by">;

const PUBLIC_EVENT_COLUMNS =
  "id, title, description, location, url, starts_at, ends_at, is_published, created_at, updated_at" as const;

/** Batas "sudah lewat": ends_at, atau mulai + durasi default bila tanpa jam selesai. */
function timingFilters(now: number) {
  const nowIso = new Date(now).toISOString();
  const openEndedIso = new Date(now - EVENT_DEFAULT_DURATION_MS).toISOString();
  return {
    notOver: `ends_at.gte.${nowIso},and(ends_at.is.null,starts_at.gte.${openEndedIso})`,
    over: `ends_at.lt.${nowIso},and(ends_at.is.null,starts_at.lt.${openEndedIso})`,
  };
}

function demoEnd(event: PublicEvent): number {
  return event.ends_at
    ? Date.parse(event.ends_at)
    : Date.parse(event.starts_at) + EVENT_DEFAULT_DURATION_MS;
}

/** Acara yang belum selesai (termasuk yang sedang berlangsung), terdekat dulu. */
export async function getUpcomingEvents(limit = 20): Promise<PublicEvent[]> {
  const now = Date.now();
  if (!isSupabaseConfigured()) {
    return DEMO_EVENTS.filter((event) => demoEnd(event) >= now)
      .sort((a, b) => Date.parse(a.starts_at) - Date.parse(b.starts_at))
      .slice(0, limit);
  }
  return unwrapFeature(
    "events-upcoming",
    await createPublicSupabase()
      .from("events")
      .select(PUBLIC_EVENT_COLUMNS)
      .eq("is_published", true)
      .or(timingFilters(now).notOver)
      .order("starts_at", { ascending: true })
      .limit(limit),
    [],
  );
}

/** Acara yang sudah lewat, terbaru dulu. */
export async function getPastEvents(limit = 20): Promise<PublicEvent[]> {
  const now = Date.now();
  if (!isSupabaseConfigured()) {
    return DEMO_EVENTS.filter((event) => demoEnd(event) < now)
      .sort((a, b) => Date.parse(b.starts_at) - Date.parse(a.starts_at))
      .slice(0, limit);
  }
  return unwrapFeature(
    "events-past",
    await createPublicSupabase()
      .from("events")
      .select(PUBLIC_EVENT_COLUMNS)
      .eq("is_published", true)
      .or(timingFilters(now).over)
      .order("starts_at", { ascending: false })
      .limit(limit),
    [],
  );
}

/** Acara terdekat untuk Island & beranda; tidak pernah menjatuhkan layout. */
export const getNextEvent = cache(
  async (): Promise<PublicEvent | null> =>
    optionalRead(
      "event-next",
      async () => (await getUpcomingEvents(1))[0] ?? null,
      null,
    ),
);

export const getEventById = cache(async (id: string): Promise<PublicEvent | null> => {
  if (!isSupabaseConfigured()) {
    return DEMO_EVENTS.find((event) => event.id === id) ?? null;
  }
  if (!isUuid(id)) return null;
  return unwrapFeature(
    "event-by-id",
    await createPublicSupabase()
      .from("events")
      .select(PUBLIC_EVENT_COLUMNS)
      .eq("id", id)
      .eq("is_published", true)
      .maybeSingle(),
    null,
  );
});
