import "server-only";
import { createAdminSupabase } from "@/lib/supabase/admin";
import type { EventRow } from "@/lib/types/database";
import { pageBounds, toPaged, type Paged } from "./paging";

export const ADMIN_EVENTS_PAGE_SIZE = 30;

export type EventOption = Pick<EventRow, "id" | "title" | "starts_at">;

/** Semua agenda (termasuk draf), terbaru dulu. */
export async function getAdminEvents(page = 1): Promise<{
  result: Paged<EventRow>;
  error: { code?: string; message: string } | null;
  /** Waktu acuan status (mendatang/berlangsung/selesai) saat data dibaca. */
  fetchedAt: number;
}> {
  const { from, to } = pageBounds(page, ADMIN_EVENTS_PAGE_SIZE);
  const { data, count, error } = await createAdminSupabase()
    .from("events")
    .select("*", { count: "exact" })
    .order("starts_at", { ascending: false })
    .range(from, to);
  return {
    result: toPaged(data ?? [], count, page, ADMIN_EVENTS_PAGE_SIZE),
    error,
    fetchedAt: Date.now(),
  };
}

/** Pilihan acara untuk dialog album. */
export async function getAdminEventOptions(): Promise<EventOption[]> {
  const { data } = await createAdminSupabase()
    .from("events")
    .select("id, title, starts_at")
    .order("starts_at", { ascending: false })
    .limit(100);
  return data ?? [];
}
