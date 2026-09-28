import { NextResponse } from "next/server";
import { SHARE_TARGET } from "@/lib/share-target";

/**
 * Cadangan bila service worker belum aktif saat berbagi dari galeri HP:
 * file tidak bisa dititipkan, jadi arahkan ke Buat Pin dengan pesan jelas.
 */
export function POST(request: Request) {
  const url = new URL(`/buat?${SHARE_TARGET.resultParam}=gagal`, request.url);
  return NextResponse.redirect(url, 303);
}
