import { NextResponse } from "next/server";
import { searchSiteContent } from "@/lib/data";
import {
  consumeRateLimit,
  RATE_LIMITS,
  requestRateLimitIdentity,
} from "@/lib/security/rate-limit";
import { rateLimitResponse } from "@/lib/api/responses";
import { isSupabaseConfigured } from "@/lib/supabase/public";

const MAX_QUERY = 80;

/** GET /api/search?q= — pencarian satu kotak untuk Spotlight island. */
export async function GET(req: Request) {
  // Mode demo mencari data statis di memori; kuota butuh tabel rate_limits.
  if (isSupabaseConfigured()) {
    const limited = await consumeRateLimit(
      RATE_LIMITS.search,
      requestRateLimitIdentity(req.headers),
    );
    if (!limited.ok || !limited.allowed) return rateLimitResponse(limited);
  }

  const query = new URL(req.url).searchParams.get("q") ?? "";
  if (query.trim().length > MAX_QUERY) {
    return NextResponse.json(
      { error: "Kata kunci terlalu panjang." },
      { status: 400 },
    );
  }

  try {
    return NextResponse.json({ results: await searchSiteContent(query) });
  } catch (error) {
    console.error("[search] pencarian gagal", {
      message: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json(
      { error: "Pencarian sedang bermasalah. Coba lagi sebentar." },
      { status: 503 },
    );
  }
}
