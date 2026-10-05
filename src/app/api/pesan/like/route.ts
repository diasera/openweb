import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createAdminSupabase } from "@/lib/supabase/admin";
import { invalidJsonResponse } from "@/lib/api/responses";
import { readJsonBody } from "@/lib/api/request";
import { guardPublicMutation } from "@/lib/api/public-mutation";
import { getVisitorId } from "@/lib/visitors";
import { RATE_LIMITS } from "@/lib/security/rate-limit";
import {
  isSchemaOutdatedError,
  SCHEMA_OUTDATED_MESSAGE,
} from "@/lib/database/errors";

/** POST /api/pesan/like — tambah 1 like ke sebuah pesan anonim, maksimal
 *  sekali per pengunjung per pesan. Dedup + penghitung atomik di RPC like_message. */
const schema = z.object({ id: z.uuid() });

export async function POST(req: Request) {
  const guarded = await guardPublicMutation(
    req,
    RATE_LIMITS.messageLike,
    "Kamu diblokir.",
  );
  if (!guarded.ok) return guarded.response;

  const body = await readJsonBody<unknown>(req, 1024);
  if (!body.ok) return invalidJsonResponse(body);
  const parsed = schema.safeParse(body.data);
  if (!parsed.success) {
    return NextResponse.json({ error: "ID tidak valid" }, { status: 400 });
  }

  const vid = await getVisitorId(true);
  if (!vid) return NextResponse.json({ error: "Gagal" }, { status: 400 });

  const { data, error } = await createAdminSupabase().rpc("like_message", {
    p_message_id: parsed.data.id,
    p_visitor_id: vid,
  });
  if (error) {
    const outdated = isSchemaOutdatedError(error);
    console.error("[pesan:like] gagal menyimpan like", {
      code: error.code,
      message: error.message,
    });
    return NextResponse.json(
      { error: outdated ? SCHEMA_OUTDATED_MESSAGE : "Gagal menyukai" },
      { status: outdated ? 503 : 500 },
    );
  }

  const result = data?.[0];
  if (!result) {
    return NextResponse.json({ error: "Pesan tidak ditemukan" }, { status: 404 });
  }
  if (result.newly_liked) {
    revalidatePath("/pesan");
    revalidatePath("/");
  }
  return NextResponse.json({ likes: result.total_likes });
}
