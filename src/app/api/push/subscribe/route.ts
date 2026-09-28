import { NextResponse } from "next/server";
import { mutationPrerequisiteResponse } from "@/lib/api/public-mutation";
import {
  invalidJsonResponse,
  rateLimitResponse,
} from "@/lib/api/responses";
import { getVisitorId } from "@/lib/visitors";
import { getUserAgent } from "@/lib/utils/request";
import { readJsonBody } from "@/lib/api/request";
import {
  consumeRateLimit,
  RATE_LIMITS,
  requestRateLimitIdentity,
} from "@/lib/security/rate-limit";
import { savePushSubscription } from "@/lib/push/subscriptions";

interface SubscribeBody {
  endpoint?: unknown;
  keys?: { p256dh?: unknown; auth?: unknown } | null;
}

const MAX_ENDPOINT = 500;
const MAX_KEY = 200;

/** POST /api/push/subscribe — tautkan langganan push per perangkat ke
 *  pengunjung (dipanggil hook lonceng & service worker saat resubscribe). */
export async function POST(req: Request) {
  const prerequisite = mutationPrerequisiteResponse(req);
  if (prerequisite) return prerequisite;

  const limited = await consumeRateLimit(
    RATE_LIMITS.pushSubscribe,
    requestRateLimitIdentity(req.headers),
  );
  if (!limited.ok || !limited.allowed) return rateLimitResponse(limited);

  const vid = await getVisitorId(true);
  if (!vid) return NextResponse.json({ error: "Gagal" }, { status: 400 });

  const body = await readJsonBody<SubscribeBody>(req, 2048);
  if (!body.ok) return invalidJsonResponse(body);

  const { endpoint, keys } = body.data ?? {};
  const p256dh = keys?.p256dh;
  const auth = keys?.auth;
  if (
    typeof endpoint !== "string" ||
    !endpoint.startsWith("https://") ||
    endpoint.length > MAX_ENDPOINT ||
    typeof p256dh !== "string" ||
    !p256dh ||
    p256dh.length > MAX_KEY ||
    typeof auth !== "string" ||
    !auth ||
    auth.length > MAX_KEY
  ) {
    return NextResponse.json(
      { error: "Langganan push tidak valid." },
      { status: 400 },
    );
  }

  const saved = await savePushSubscription({
    visitorId: vid,
    endpoint,
    p256dh,
    auth,
    userAgent: getUserAgent(req.headers),
  });
  if (saved.error) {
    return NextResponse.json({ error: saved.error }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
