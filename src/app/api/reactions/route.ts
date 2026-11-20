import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { createAdminSupabase } from "@/lib/supabase/admin";
import { guardPublicMutation } from "@/lib/api/public-mutation";
import { readJsonBody } from "@/lib/api/request";
import { invalidJsonResponse } from "@/lib/api/responses";
import {
  isSchemaOutdatedError,
  SCHEMA_OUTDATED_MESSAGE,
} from "@/lib/database/errors";
import { reactionToggleSchema } from "@/lib/reactions";
import { RATE_LIMITS } from "@/lib/security/rate-limit";
import { getVisitorId } from "@/lib/visitors";

/**
 * POST /api/reactions — toggle 1 reaksi emoji cepat pada pin galeri atau artikel
 * blog (maks 1 per pengunjung per emoji per konten). Dedup atomik di RPC
 * `toggle_content_reaction` tanpa mengekspos `visitor_id` ke publik.
 */
export async function POST(req: Request) {
  const guarded = await guardPublicMutation(
    req,
    RATE_LIMITS.reaction,
    "Kamu diblokir dari memberikan reaksi.",
  );
  if (!guarded.ok) return guarded.response;

  const body = await readJsonBody<unknown>(req, 1024);
  if (!body.ok) return invalidJsonResponse(body);
  const parsed = reactionToggleSchema.safeParse(body.data);
  if (!parsed.success) {
    return NextResponse.json({ error: "Input reaksi tidak valid" }, { status: 400 });
  }

  const vid = await getVisitorId(true, req.headers);
  if (!vid) {
    return NextResponse.json(
      { error: "Terlalu banyak permintaan. Coba lagi sebentar." },
      { status: 429 },
    );
  }

  const { kind, id, emoji } = parsed.data;
  const { data, error } = await createAdminSupabase().rpc(
    "toggle_content_reaction",
    {
      p_target_kind: kind,
      p_target_id: id,
      p_visitor_id: vid,
      p_emoji: emoji,
    },
  );
  if (error) {
    const outdated = isSchemaOutdatedError(error);
    console.error("[reactions] gagal menyimpan reaksi", {
      code: error.code,
      message: error.message,
    });
    return NextResponse.json(
      { error: outdated ? SCHEMA_OUTDATED_MESSAGE : "Gagal menyimpan reaksi" },
      { status: outdated ? 503 : 500 },
    );
  }

  const result = data?.[0];
  if (!result) {
    return NextResponse.json(
      { error: "Konten tidak ditemukan" },
      { status: 404 },
    );
  }

  if (kind === "media") revalidatePath(`/pin/${id}`);
  else revalidatePath("/blog", "layout");

  return NextResponse.json({
    emoji,
    active: Boolean(result.active),
    total: Number(result.total) || 0,
  });
}
