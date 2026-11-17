import "server-only";
import { isIP } from "node:net";
import { createAdminSupabase } from "@/lib/supabase/admin";
import {
  checkedDatabaseCall,
  checkedMutation,
} from "@/lib/database/mutation";
import type { ActionResult } from "@/lib/action-result";
import type { PushSubscriptionRow } from "@/lib/types/database";

const MAX_ENDPOINT_LENGTH = 500;
const MAX_KEY_LENGTH = 200;
const P256DH_BYTE_LENGTH = 65;
const AUTH_SECRET_BYTE_LENGTH = 16;
const MAX_DEVICES_PER_VISITOR = 5;

const ALLOWED_PUSH_EXACT_HOSTS: ReadonlySet<string> = new Set([
  "fcm.googleapis.com",
  "updates.push.services.mozilla.com",
]);

const ALLOWED_PUSH_HOST_SUFFIXES = [
  ".push.googleapis.com",
  ".push.services.mozilla.com",
  ".push.apple.com",
  ".notify.windows.com",
] as const;

function isAllowedPushHost(hostname: string): boolean {
  const host = hostname.toLowerCase().replace(/^\[|\]$/g, "");
  if (!host || isIP(host) !== 0) return false;
  if (ALLOWED_PUSH_EXACT_HOSTS.has(host)) return true;
  return ALLOWED_PUSH_HOST_SUFFIXES.some(
    (suffix) => host.endsWith(suffix) && host.length > suffix.length,
  );
}

/**
 * Validasi ketat URL endpoint Web Push (anti-SSRF). Hanya menerima HTTPS port
 * standar (443) tanpa kredensial URL pada domain layanan push resmi browser.
 */
export function normalizePushEndpoint(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const trimmed = raw.trim();
  if (
    !trimmed ||
    trimmed.length > MAX_ENDPOINT_LENGTH ||
    /[\u0000-\u001f\u007f]/.test(trimmed)
  ) {
    return null;
  }
  try {
    const url = new URL(trimmed);
    if (
      url.protocol !== "https:" ||
      url.username ||
      url.password ||
      url.port !== "" ||
      url.hash ||
      url.pathname === "/" ||
      !isAllowedPushHost(url.hostname)
    ) {
      return null;
    }
    return url.toString();
  } catch {
    return null;
  }
}

function decodeBase64UrlBytes(raw: unknown): Buffer | null {
  if (typeof raw !== "string") return null;
  const trimmed = raw.trim();
  if (
    !trimmed ||
    trimmed.length > MAX_KEY_LENGTH ||
    !/^[A-Za-z0-9+/_-]+={0,2}$/.test(trimmed)
  ) {
    return null;
  }
  try {
    const normalized = trimmed.replace(/-/g, "+").replace(/_/g, "/");
    return Buffer.from(normalized, "base64");
  } catch {
    return null;
  }
}

/** Validasi satu pintu payload langganan Web Push dari browser/service worker. */
export function validatePushSubscriptionPayload(body: unknown): {
  endpoint: string;
  p256dh: string;
  auth: string;
} | null {
  if (!body || typeof body !== "object") return null;
  const candidate = body as {
    endpoint?: unknown;
    keys?: { p256dh?: unknown; auth?: unknown } | null;
  };
  const endpoint = normalizePushEndpoint(candidate.endpoint);
  const p256dhBytes = decodeBase64UrlBytes(candidate.keys?.p256dh);
  const authBytes = decodeBase64UrlBytes(candidate.keys?.auth);
  if (
    !endpoint ||
    !p256dhBytes ||
    p256dhBytes.byteLength !== P256DH_BYTE_LENGTH ||
    p256dhBytes[0] !== 0x04 ||
    !authBytes ||
    authBytes.byteLength !== AUTH_SECRET_BYTE_LENGTH
  ) {
    return null;
  }
  return {
    endpoint,
    p256dh: p256dhBytes.toString("base64url"),
    auth: authBytes.toString("base64url"),
  };
}

export interface PushSubscriptionInput {
  visitorId: string;
  endpoint: string;
  p256dh: string;
  auth: string;
  userAgent: string | null;
}

/** Simpan/perbarui langganan per perangkat. Konflik endpoint berarti
 *  browser yang sama kembali — ikat ulang ke visitor terbaru. */
export async function savePushSubscription(
  input: PushSubscriptionInput,
): Promise<ActionResult> {
  const endpoint = normalizePushEndpoint(input.endpoint);
  if (!endpoint) return { error: "Langganan push tidak valid." };

  const sb = createAdminSupabase();
  const saved = await checkedMutation(
    "push-subscriptions.upsert",
    "Gagal menyimpan langganan push.",
    sb
      .from("push_subscriptions")
      .upsert(
        {
          visitor_id: input.visitorId,
          endpoint,
          p256dh: input.p256dh,
          auth: input.auth,
          user_agent: input.userAgent,
        },
        { onConflict: "endpoint" },
      )
      .select("id")
      .maybeSingle(),
  );
  if (!saved.ok) return { error: saved.error };

  // Batasi jumlah perangkat aktif per pengunjung agar tabel tidak dibanjiri.
  const { data: owned } = await sb
    .from("push_subscriptions")
    .select("id")
    .eq("visitor_id", input.visitorId)
    .order("created_at", { ascending: false })
    .range(MAX_DEVICES_PER_VISITOR, MAX_DEVICES_PER_VISITOR + 20);
  if (owned && owned.length > 0) {
    await sb
      .from("push_subscriptions")
      .delete()
      .in(
        "id",
        owned.map((row) => row.id),
      );
  }
  return {};
}

/** Hapus semua langganan milik satu pengunjung (lonceng dimatikan). */
export async function removePushSubscriptionsByVisitor(
  visitorId: string,
): Promise<void> {
  const sb = createAdminSupabase();
  await checkedDatabaseCall(
    "push-subscriptions.clear-visitor",
    "Gagal membersihkan langganan push.",
    sb.from("push_subscriptions").delete().eq("visitor_id", visitorId),
  );
}

/** Hapus langganan yang sudah mati (endpoint 404/410 saat kirim) dalam satu query. */
export async function removePushSubscriptionsByEndpoints(
  endpoints: readonly string[],
): Promise<void> {
  if (endpoints.length === 0) return;
  const sb = createAdminSupabase();
  await checkedDatabaseCall(
    "push-subscriptions.prune",
    "Gagal menghapus langganan push mati.",
    sb.from("push_subscriptions").delete().in("endpoint", [...endpoints]),
  );
}

// PostgREST Supabase membatasi 1000 baris per respons; keyset menjamin semua terbaca.
const SUBSCRIPTION_PAGE = 1000;

/** Seluruh langganan aktif untuk pengiriman massal notifikasi admin. */
export async function getPushSubscriptions(): Promise<PushSubscriptionRow[]> {
  const sb = createAdminSupabase();
  const rows: PushSubscriptionRow[] = [];
  let lastId: string | null = null;
  for (;;) {
    let query = sb
      .from("push_subscriptions")
      .select("id, visitor_id, endpoint, p256dh, auth, user_agent, created_at")
      .order("id", { ascending: true })
      .limit(SUBSCRIPTION_PAGE);
    if (lastId) query = query.gt("id", lastId);
    const { data, error } = await query;
    if (error) {
      console.error("[push:subscriptions] gagal membaca langganan", {
        code: error.code,
        message: error.message,
      });
      break;
    }
    rows.push(...data);
    if (data.length < SUBSCRIPTION_PAGE) break;
    lastId = data[data.length - 1]!.id;
  }
  return rows;
}

/** Jumlah perangkat terhubung — untuk statistik halaman Pengunjung. */
export async function countPushSubscriptions(): Promise<number> {
  const sb = createAdminSupabase();
  const { count } = await sb
    .from("push_subscriptions")
    .select("id", { count: "exact", head: true });
  return count ?? 0;
}
