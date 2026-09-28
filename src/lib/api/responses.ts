import "server-only";
import { NextResponse } from "next/server";
import type { RateLimitResult } from "@/lib/security/rate-limit";

/** Respons tunggal saat endpoint tulis dipanggil sebelum Supabase dikonfigurasi. */
export function databaseUnavailableResponse() {
  return NextResponse.json(
    { error: "Database belum terhubung (mode demo)." },
    { status: 503 },
  );
}

export function invalidMutationResponse(error: string) {
  return NextResponse.json({ error }, { status: 403 });
}

export function invalidJsonResponse(result: {
  status: 400 | 413 | 415;
  error: string;
}) {
  return NextResponse.json(
    { error: result.error },
    { status: result.status },
  );
}

export function rateLimitResponse(result: RateLimitResult) {
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 503 });
  }
  return NextResponse.json(
    { error: "Terlalu banyak permintaan. Coba lagi sebentar." },
    {
      status: 429,
      headers: { "Retry-After": String(result.retryAfterSeconds) },
    },
  );
}
