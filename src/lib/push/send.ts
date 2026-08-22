import "server-only";
import webpush from "web-push";
import { getVapidConfig } from "./vapid";
import {
  getPushSubscriptions,
  removePushSubscriptionByEndpoint,
} from "./subscriptions";

/** Ukuran paralel per gagang pengiriman — cukup kecil agar tidak membanjiri
 *  event loop, cukup besar untuk ratusan perangkat. */
const SEND_CHUNK = 25;

export interface PushDispatchResult {
  skipped: boolean;
  sent: number;
  failed: number;
  pruned: number;
}

export interface PushPayload {
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
    title: payload.title,
    body: payload.body ?? "",
    url: payload.url ?? "/",
  });

  let sent = 0;
  let failed = 0;
  let pruned = 0;

  for (let offset = 0; offset < subscriptions.length; offset += SEND_CHUNK) {
    const chunk = subscriptions.slice(offset, offset + SEND_CHUNK);
    const results = await Promise.allSettled(
      chunk.map((row) =>
        webpush.sendNotification(
          { endpoint: row.endpoint, keys: { p256dh: row.p256dh, auth: row.auth } },
          body,
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
      if (status === 404 || status === 410) {
        pruned += 1;
        void removePushSubscriptionByEndpoint(chunk[index].endpoint);
      }
    });
  }

  return { skipped: false, sent, failed, pruned };
}
