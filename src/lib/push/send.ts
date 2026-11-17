import "server-only";
import webpush from "web-push";
import { getVapidConfig } from "./vapid";
import {
  getPushSubscriptions,
  normalizePushEndpoint,
  removePushSubscriptionsByEndpoints,
} from "./subscriptions";

/** Ukuran paralel per gagang pengiriman — cukup kecil agar tidak membanjiri
 *  event loop, cukup besar untuk ratusan perangkat. */
const SEND_CHUNK = 25;
const PUSH_REQUEST_TIMEOUT_MS = 10_000;
const PRUNABLE_PUSH_STATUS_CODES: ReadonlySet<number> = new Set([
  400, 401, 403, 404, 410,
]);

export interface PushDispatchResult {
  skipped: boolean;
  sent: number;
  failed: number;
  pruned: number;
}

export interface PushPayload {
  /** Id notifikasi; menjadi tag agar notifikasi berbeda tidak saling menimpa. */
  id: string;
  title: string;
  body: string | null;
  url: string | null;
}

/**
 * Kirim satu notifikasi ke seluruh perangkat berlangganan. Endpoint yang
 * sudah mati (404/410) dipangkas otomatis. Fungsi ini TIDAK melempar error
 * — kegagalan push tidak boleh membatalkan mutasi admin yang sudah tersimpan.
 */
export async function dispatchPushNotification(
  payload: PushPayload,
): Promise<PushDispatchResult> {
  const vapid = getVapidConfig();
  if (!vapid) return { skipped: true, sent: 0, failed: 0, pruned: 0 };

  try {
    webpush.setVapidDetails(vapid.subject, vapid.publicKey, vapid.privateKey);
  } catch (error) {
    console.error("[push:dispatch] konfigurasi VAPID tidak valid", {
      message: error instanceof Error ? error.message : String(error),
    });
    return { skipped: true, sent: 0, failed: 0, pruned: 0 };
  }

  const subscriptions = await getPushSubscriptions();
  if (subscriptions.length === 0) {
    return { skipped: false, sent: 0, failed: 0, pruned: 0 };
  }

  const body = JSON.stringify({
    tag: payload.id,
    title: payload.title,
    body: payload.body ?? "",
    url: payload.url ?? "/",
  });

  let sent = 0;
  let failed = 0;
  const deadEndpoints: string[] = [];
  const validSubscriptions = subscriptions.filter((row) => {
    if (normalizePushEndpoint(row.endpoint)) return true;
    failed += 1;
    deadEndpoints.push(row.endpoint);
    return false;
  });

  for (let offset = 0; offset < validSubscriptions.length; offset += SEND_CHUNK) {
    const chunk = validSubscriptions.slice(offset, offset + SEND_CHUNK);
    const results = await Promise.allSettled(
      chunk.map((row) =>
        webpush.sendNotification(
          { endpoint: row.endpoint, keys: { p256dh: row.p256dh, auth: row.auth } },
          body,
          { timeout: PUSH_REQUEST_TIMEOUT_MS },
        ),
      ),
    );
    results.forEach((result, index) => {
      if (result.status === "fulfilled") {
        sent += 1;
        return;
      }
      failed += 1;
      const status = (result.reason as { statusCode?: number } | undefined)
        ?.statusCode;
      if (status !== undefined && PRUNABLE_PUSH_STATUS_CODES.has(status)) {
        deadEndpoints.push(chunk[index]!.endpoint);
      }
    });
  }

  await removePushSubscriptionsByEndpoints(deadEndpoints);
  return { skipped: false, sent, failed, pruned: deadEndpoints.length };
}
