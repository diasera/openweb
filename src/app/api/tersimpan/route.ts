import { NextResponse } from "next/server";
import {
  getMediaByIds,
  getPublishedPostsByIds,
  MAX_SAVED_PER_REQUEST,
} from "@/lib/data";

const ID_PATTERN = /^[A-Za-z0-9-]{1,64}$/;

function parseIds(value: string | null): string[] {
  return (value ?? "")
    .split(",")
    .map((id) => id.trim())
    .filter((id) => ID_PATTERN.test(id))
    .slice(0, MAX_SAVED_PER_REQUEST);
}

/** GET /api/tersimpan?pins=a,b&posts=c — data publik koleksi Tersimpan. */
export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const pinIds = parseIds(params.get("pins"));
  const postIds = parseIds(params.get("posts"));

  try {
    const [pins, posts] = await Promise.all([
      getMediaByIds(pinIds),
      getPublishedPostsByIds(postIds),
    ]);
    return NextResponse.json(
      { pins, posts },
      { headers: { "Cache-Control": "private, max-age=60" } },
    );
  } catch (error) {
    console.error("[tersimpan] gagal membaca koleksi", {
      message: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json(
      { error: "Koleksi tersimpan belum bisa dimuat. Coba lagi sebentar." },
      { status: 503 },
    );
  }
}
