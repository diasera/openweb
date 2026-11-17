import { NextResponse } from "next/server";
import { guardPublicMutation } from "@/lib/api/public-mutation";
import { invalidJsonResponse } from "@/lib/api/responses";
import { getVisitorId } from "@/lib/visitors";
import { getUserAgent } from "@/lib/utils/request";
import { readJsonBody } from "@/lib/api/request";
import { RATE_LIMITS } from "@/lib/security/rate-limit";
import {
  savePushSubscription,
  validatePushSubscriptionPayload,
} from "@/lib/push/subscriptions";

/** POST /api/push/subscribe — tautkan langganan push per perangkat ke
 *  pengunjung (dipanggil hook lonceng & service worker saat resubscribe). */
export async function POST(req: Request) {
  const guarded = await guardPublicMutation(
    req,
    RATE_LIMITS.pushSubscribe,
    "Kamu tidak dapat mengaktifkan notifikasi.",
  );
  if (!guarded.ok) return guarded.response;

  const body = await readJsonBody(req, 2048);
  if (!body.ok) return invalidJsonResponse(body);

  const subscription = validatePushSubscriptionPayload(body.data);
  if (!subscription) {
    return NextResponse.json(
      { error: "Langganan push tidak valid." },
      { status: 400 },
    );
  }

  const vid = await getVisitorId(true, req.headers);
  if (!vid) {
    return NextResponse.json(
      { error: "Terlalu banyak permintaan. Coba lagi sebentar." },
      { status: 429 },
    );
  }

  const saved = await savePushSubscription({
    visitorId: vid,
    ...subscription,
    userAgent: getUserAgent(req.headers),
  });
  if (saved.error) {
    return NextResponse.json(
      { error: "Gagal menyimpan langganan push." },
      { status: 500 },
    );
  }
  return NextResponse.json({ ok: true });
}
