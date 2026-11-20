import "server-only";
import { createAdminSupabase } from "@/lib/supabase/admin";
import type { VisitorRow, NotificationRow } from "@/lib/types/database";
import { getBlockedIpSet } from "@/lib/admin/ip-bans";
import { eventPagePath } from "@/lib/agenda/calendar";
import { countPushSubscriptions } from "@/lib/push/subscriptions";
import { pageBounds, toPaged, type Paged } from "./paging";

export type VisitorFilter = "all" | "bell" | "banned";

export type AdminVisitorRow = Omit<VisitorRow, "visitor_id" | "user_agent"> & {
  is_banned: boolean;
};

export interface QuickNotificationTarget {
  kind: "blog" | "event" | "album";
  title: string;
  body: string;
  url: string;
}

const ADMIN_VISITORS_PAGE_SIZE = 50;
const ADMIN_VISITOR_COLUMNS =
  "id, ip_address, device, notifications_enabled, visit_count, first_seen_at, last_seen_at" as const;

export function parseVisitorFilter(raw?: string): VisitorFilter {
  if (raw === "bell" || raw === "banned") return raw;
  return "all";
}

/** Data pengunjung untuk halaman pengelolaan admin (tanpa kunci internal `visitor_id`). */
export async function getVisitors(
  page = 1,
  filter: VisitorFilter = "all",
): Promise<Paged<AdminVisitorRow>> {
  const sb = createAdminSupabase();
  const { from, to } = pageBounds(page, ADMIN_VISITORS_PAGE_SIZE);

  if (filter === "banned") {
    const { data: banRows } = await sb
      .from("banned_ips")
      .select("ip_address")
      .limit(500);
    const bannedList = (banRows ?? []).map((row) => row.ip_address);
    if (bannedList.length === 0) {
      return toPaged([], 0, page, ADMIN_VISITORS_PAGE_SIZE);
    }
    const { data, count } = await sb
      .from("visitors")
      .select(ADMIN_VISITOR_COLUMNS, { count: "exact" })
      .in("ip_address", bannedList)
      .order("last_seen_at", { ascending: false })
      .range(from, to);
    return toPaged(
      (data ?? []).map((visitor) => ({ ...visitor, is_banned: true })),
      count,
      page,
      ADMIN_VISITORS_PAGE_SIZE,
    );
  }

  let query = sb
    .from("visitors")
    .select(ADMIN_VISITOR_COLUMNS, { count: "exact" });
  if (filter === "bell") query = query.eq("notifications_enabled", true);

  const { data, count } = await query
    .order("last_seen_at", { ascending: false })
    .range(from, to);
  const visitors = data ?? [];
  const blockedIps = await getBlockedIpSet(
    sb,
    visitors.map((visitor) => visitor.ip_address),
  );
  return toPaged(
    visitors.map((visitor) => ({
      ...visitor,
      is_banned: Boolean(
        visitor.ip_address && blockedIps.has(visitor.ip_address),
      ),
    })),
    count,
    page,
    ADMIN_VISITORS_PAGE_SIZE,
  );
}

export async function getTotalVisitorCount(): Promise<number> {
  const { count } = await createAdminSupabase()
    .from("visitors")
    .select("id", { count: "exact", head: true });
  return count ?? 0;
}

export async function getBannedIpCount(): Promise<number> {
  const { count } = await createAdminSupabase()
    .from("banned_ips")
    .select("id", { count: "exact", head: true });
  return count ?? 0;
}

export async function getSentNotifications(limit = 30): Promise<NotificationRow[]> {
  const sb = createAdminSupabase();
  const { data } = await sb
    .from("notifications")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);
  return data ?? [];
}

export async function getBellCount(): Promise<number> {
  const sb = createAdminSupabase();
  const { count } = await sb
    .from("visitors")
    .select("id", { count: "exact", head: true })
    .eq("notifications_enabled", true);
  return count ?? 0;
}

/** Jumlah perangkat yang terhubung ke kanal Web Push. */
export async function getPushDeviceCount(): Promise<number> {
  return countPushSubscriptions();
}

/** Daftar konten terbaru untuk Quick Link Picker di komposer notifikasi. */
export async function getQuickNotificationTargets(): Promise<
  QuickNotificationTarget[]
> {
  const sb = createAdminSupabase();
  const [posts, events, albums] = await Promise.all([
    sb
      .from("blog_posts")
      .select("title, slug, excerpt")
      .eq("status", "published")
      .order("published_at", { ascending: false })
      .limit(2),
    sb
      .from("events")
      .select("id, title, location")
      .eq("is_published", true)
      .gte("starts_at", new Date().toISOString())
      .order("starts_at", { ascending: true })
      .limit(2),
    sb
      .from("albums")
      .select("title, slug, description")
      .order("created_at", { ascending: false })
      .limit(2),
  ]);

  const targets: QuickNotificationTarget[] = [];
  for (const post of posts.data ?? []) {
    targets.push({
      kind: "blog",
      title: `Artikel baru: ${post.title}`.slice(0, 120),
      body: (post.excerpt?.trim() || "Baca selengkapnya di halaman Blog.").slice(
        0,
        400,
      ),
      url: `/blog/${post.slug}`,
    });
  }
  for (const ev of events.data ?? []) {
    targets.push({
      kind: "event",
      title: `Agenda: ${ev.title}`.slice(0, 120),
      body: (
        ev.location
          ? `Jangan lewatkan kegiatan di ${ev.location}. Simpan jadwalnya ke kalender.`
          : "Simpan jadwal kegiatan ini ke kalendermu agar tidak terlewat."
      ).slice(0, 400),
      url: eventPagePath(ev.id),
    });
  }
  for (const album of albums.data ?? []) {
    targets.push({
      kind: "album",
      title: `Album baru: ${album.title}`.slice(0, 120),
      body: (
        album.description?.trim() || "Lihat dokumentasi foto dan video terbaru."
      ).slice(0, 400),
      url: `/album/${album.slug}`,
    });
  }
  return targets;
}
