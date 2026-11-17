import { NextResponse } from "next/server";
import { guardPublicMutation } from "@/lib/api/public-mutation";
import { invalidJsonResponse } from "@/lib/api/responses";
import { getVisitorId, setBell } from "@/lib/visitors";
import { readJsonBody } from "@/lib/api/request";
import { RATE_LIMITS } from "@/lib/security/rate-limit";
import { removePushSubscriptionsByVisitor } from "@/lib/push/subscriptions";

/** POST /api/bell — nyalakan/matikan langganan notifikasi (lonceng).
 *  Mematikan lonceng sekaligus melepas semua perangkat push pengunjung. */
export async function POST(req: Request) {
  const guarded = await guardPublicMutation(
    req,
    RATE_LIMITS.bell,
    "Kamu tidak dapat mengubah pengaturan notifikasi.",
  );
  if (!guarded.ok) return guarded.response;

  const body = await readJsonBody<{ enabled?: unknown }>(req, 1024);
  if (!body.ok) return invalidJsonResponse(body);
  if (!body.data || typeof body.data.enabled !== "boolean") {
    return NextResponse.json({ error: "Status tidak valid" }, { status: 400 });
  }
  const enabled = body.data.enabled;

  // Mematikan lonceng tidak perlu mengalokasikan identitas baru bila belum ada.
  const vid = await getVisitorId(enabled, req.headers);
  if (!vid) {
    return enabled
      ? NextResponse.json(
          { error: "Terlalu banyak permintaan. Coba lagi sebentar." },
          { status: 429 },
        )
      : NextResponse.json({ ok: true, enabled: false });
  }

  const result = await setBell(vid, enabled, req.headers);
  if (result.error) {
    return NextResponse.json(
      { error: "Gagal mengubah status notifikasi." },
      { status: 500 },
    );
  }
  if (!enabled) {
    await removePushSubscriptionsByVisitor(vid);
  }
  return NextResponse.json({ ok: true, enabled });
}
