import "server-only";
import { createAdminSupabase } from "@/lib/supabase/admin";
import { readableMediaUrls } from "@/lib/media/upload";
import type { AdminFeature } from "@/lib/constants";
import type { MediaRow, MessageRow } from "@/lib/types/database";
import { getAdminStats, type AdminStats } from "./stats";

const QUEUE_PREVIEW_LIMIT = 6;
const MESSAGE_PREVIEW_LIMIT = 4;

export type DashboardQueueItem = Pick<
  MediaRow,
  "id" | "type" | "url" | "thumbnail_url" | "title" | "caption" | "created_at"
>;

export type DashboardMessage = Pick<MessageRow, "id" | "content" | "created_at" | "is_read">;

export interface AdminDashboardData {
  stats: AdminStats;
  /** Kiriman menunggu moderasi; URL sudah bisa dibuka (signed bila di inbox). */
  queue: DashboardQueueItem[];
  messages: DashboardMessage[];
}

/** Antrean moderasi terbaru untuk pratinjau dasbor. Gagal baca = kosong. */
async function getModerationQueue(): Promise<DashboardQueueItem[]> {
  const { data, error } = await createAdminSupabase()
    .from("media")
    .select("id, type, url, thumbnail_url, title, caption, created_at, status")
    .eq("status", "pending")
    .order("created_at", { ascending: false })
    .limit(QUEUE_PREVIEW_LIMIT);
  if (error || !data) return [];
  // Poster video kiriman pending bisa ikut berada di inbox privat.
  const readable = await readableMediaUrls([
    ...data,
    ...data.flatMap((item) =>
      item.thumbnail_url ? [{ url: item.thumbnail_url, status: item.status }] : [],
    ),
  ]);
  return data.map((item) => ({
    id: item.id,
    type: item.type,
    title: item.title,
    caption: item.caption,
    created_at: item.created_at,
    url: readable.get(item.url) ?? item.url,
    thumbnail_url: item.thumbnail_url
      ? (readable.get(item.thumbnail_url) ?? item.thumbnail_url)
      : null,
  }));
}

/** Pesan terbaru, yang belum dibaca lebih dulu. IP/perangkat tidak ikut. */
async function getRecentMessages(): Promise<DashboardMessage[]> {
  const { data, error } = await createAdminSupabase()
    .from("messages")
    .select("id, content, created_at, is_read")
    .order("is_read", { ascending: true })
    .order("created_at", { ascending: false })
    .limit(MESSAGE_PREVIEW_LIMIT);
  return error || !data ? [] : data;
}

/**
 * Data dasbor admin dalam satu panggilan paralel. Pratinjau antrean dan pesan
 * hanya dibaca bila akun berizin atas fiturnya, jadi admin tanpa izin media
 * tidak pernah menerima URL kiriman yang belum dimoderasi.
 */
export async function getAdminDashboard(
  features: readonly AdminFeature[],
): Promise<AdminDashboardData> {
  const [stats, queue, messages] = await Promise.all([
    getAdminStats(),
    features.includes("media") ? getModerationQueue() : Promise.resolve([]),
    features.includes("pesan") ? getRecentMessages() : Promise.resolve([]),
  ]);
  return { stats, queue, messages };
}
