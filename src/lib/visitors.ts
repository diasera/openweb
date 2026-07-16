import "server-only";
import { cookies } from "next/headers";
import { VISITOR_COOKIE } from "@/lib/constants";
import { createAdminSupabase } from "@/lib/supabase/admin";
import { getClientIp, getUserAgent, parseDevice } from "@/lib/utils/request";
import { isUuid } from "@/lib/utils/id";
import {
  checkedDatabaseCall,
  checkedMutation,
} from "@/lib/database/mutation";
import type { DeviceInfo } from "@/lib/types/database";
import type { ActionResult } from "@/lib/action-result";
import { RATE_LIMITS, rateLimitKeyHash } from "@/lib/security/rate-limit";

const ONE_YEAR = 60 * 60 * 24 * 365;

/** Ambil id pengunjung dari cookie; buat + set bila belum ada (opsional). */
export async function getVisitorId(create = false): Promise<string | null> {
  const store = await cookies();
  let vid = store.get(VISITOR_COOKIE)?.value ?? null;
  if (vid && !isUuid(vid)) vid = null;
  if (!vid && create) {
    vid = crypto.randomUUID();
    store.set(VISITOR_COOKIE, vid, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: ONE_YEAR,
    });
  }
  return vid;
}

/** Catat / perbarui kunjungan (dipakai /api/track). */
export async function recordVisit(
  vid: string,
  ip: string | null,
  userAgent: string | null,
  device: DeviceInfo | null,
): Promise<ActionResult> {
  try {
    const visitorPolicy = RATE_LIMITS.trackVisitor;
    const ipPolicy = RATE_LIMITS.trackIp;
    const saved = await checkedDatabaseCall(
      "visitors.track",
      "Gagal mencatat kunjungan. Jalankan migrasi security hardening.",
      createAdminSupabase().rpc("record_visitor_visit", {
        p_visitor_id: vid,
        p_ip_address: ip,
        p_user_agent: userAgent,
        p_device: device,
        p_visitor_rate_key_hash: rateLimitKeyHash(visitorPolicy, [vid]),
        p_visitor_limit: visitorPolicy.limit,
        p_visitor_window_seconds: visitorPolicy.windowSeconds,
        p_ip_rate_key_hash: rateLimitKeyHash(ipPolicy, [ip ?? "unknown"]),
        p_ip_limit: ipPolicy.limit,
        p_ip_window_seconds: ipPolicy.windowSeconds,
      }),
    );
    return saved.ok ? {} : { error: saved.error };
  } catch (error) {
    console.error("[visitors:track] konfigurasi keamanan tidak valid", {
      message: error instanceof Error ? error.message : String(error),
    });
    return { error: "Konfigurasi keamanan server tidak valid." };
  }
}

/** Set status lonceng (notifikasi) untuk pengunjung; buat baris bila perlu. */
export async function setBell(
  vid: string,
  enabled: boolean,
  headers: Headers,
): Promise<ActionResult> {
  const userAgent = getUserAgent(headers);
  const sb = createAdminSupabase();
  const saved = await checkedMutation(
    "visitors.bell-upsert",
    "Gagal mengubah status notifikasi.",
    sb
      .from("visitors")
      .upsert(
        {
          visitor_id: vid,
          ip_address: getClientIp(headers),
          user_agent: userAgent,
          device: parseDevice(userAgent),
          notifications_enabled: enabled,
        },
        { onConflict: "visitor_id" },
      )
      .select("id")
      .maybeSingle(),
  );
  if (!saved.ok) return { error: saved.error };
  return {};
}

/** Status lonceng pengunjung saat ini (untuk render awal tombol). */
export async function getBellState(): Promise<boolean> {
  const vid = await getVisitorId(false);
  if (!vid) return false;
  const sb = createAdminSupabase();
  const { data } = await sb
    .from("visitors")
    .select("notifications_enabled")
    .eq("visitor_id", vid)
    .maybeSingle();
  return data?.notifications_enabled ?? false;
}
