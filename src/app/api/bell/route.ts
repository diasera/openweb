import { NextResponse } from "next/server";
import { mutationPrerequisiteResponse } from "@/lib/api/public-mutation";
import {
  invalidJsonResponse,
  rateLimitResponse,
} from "@/lib/api/responses";
import { getVisitorId, setBell } from "@/lib/visitors";
import { readJsonBody } from "@/lib/api/request";
import {
  consumeRateLimit,
  RATE_LIMITS,
  requestRateLimitIdentity,
} from "@/lib/security/rate-limit";
import { removePushSubscriptionsByVisitor } from "@/lib/push/subscriptions";

/** POST /api/bell — nyalakan/matikan langganan notifikasi (lonceng).
 *  Mematikan lonceng sekaligus melepas semua perangkat push pengunjung. */
export async function POST(req: Request) {
  const prerequisite = mutationPrerequisiteResponse(req);
  if (prerequisite) return prerequisite;

  const limited = await consumeRateLimit(
    RATE_LIMITS.bell,
    requestRateLimitIdentity(req.headers),
  );
  if (!limited.ok || !limited.allowed) return rateLimitResponse(limited);

  const vid = await getVisitorId(true);
  if (!vid) return NextResponse.json({ error: "Gagal" }, { status: 400 });

  const body = await readJsonBody<{ enabled?: unknown }>(req, 1024);
  if (!body.ok) return invalidJsonResponse(body);
  if (!body.data || typeof body.data.enabled !== "boolean") {
    return NextResponse.json({ error: "Status tidak valid" }, { status: 400 });
  }
  const enabled = body.data.enabled;
  const result = await setBell(vid, enabled, req.headers);
  if (result.error) {
    return NextResponse.json({ error: result.error }, { status: 500 });
  }
  if (!enabled) {
    await removePushSubscriptionsByVisitor(vid);
  }
  return NextResponse.json({ ok: true, enabled });
}
