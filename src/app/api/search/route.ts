import { NextResponse } from "next/server";
import { searchSiteContent } from "@/lib/data";
import {
  consumeRateLimit,
  RATE_LIMITS,
  requestRateLimitIdentity,
} from "@/lib/security/rate-limit";
import { rateLimitResponse } from "@/lib/api/responses";

const MAX_QUERY = 80;

/** GET /api/search?q= — pencarian satu kotak untuk Spotlight island. */
export async function GET(req: Request) {
  const limited = await consumeRateLimit(
    RATE_LIMITS.search,
    requestRateLimitIdentity(req.headers),
  );
  if (!limited.ok || !limited.allowed) return rateLimitResponse(limited);

  const query = new URL(req.url).searchParams.get("q") ?? "";
  if (query.trim().length > MAX_QUERY) {
    return NextResponse.json(
      { error: "Kata kunci terlalu panjang." },
      { status: 400 },
    );
  }

  const results = await searchSiteContent(query);
  return NextResponse.json({ results });
}
