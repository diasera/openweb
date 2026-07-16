import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { isSupabaseConfigured } from "@/lib/supabase/public";
import { getClientIp, getUserAgent, parseDevice } from "@/lib/utils/request";
import { getVisitorId, recordVisit } from "@/lib/visitors";
import { invalidMutationResponse } from "@/lib/api/responses";
import { validateMutationOrigin } from "@/lib/api/request";

/** POST /api/track — catat kunjungan tanpa memengaruhi akses baca publik. */
export async function POST(request: Request) {
  if (!isSupabaseConfigured()) return new NextResponse(null, { status: 204 });
  const originError = validateMutationOrigin(request);
  if (originError) return invalidMutationResponse(originError);

  const hdrs = await headers();
  const ip = getClientIp(hdrs);
  const userAgent = getUserAgent(hdrs);

  const vid = await getVisitorId(true);
  if (!vid) return new NextResponse(null, { status: 204 });
  await recordVisit(vid, ip, userAgent, parseDevice(userAgent));
  return new NextResponse(null, { status: 204 });
}
