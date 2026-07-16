import { NextResponse } from "next/server";
import { z } from "zod";
import { createAdminSupabase } from "@/lib/supabase/admin";
import { getUserAgent, parseDevice } from "@/lib/utils/request";
import { validationErrorMessage } from "@/lib/action-result";
import { invalidJsonResponse } from "@/lib/api/responses";
import { readJsonBody } from "@/lib/api/request";
import { guardPublicMutation } from "@/lib/api/public-mutation";
import { RATE_LIMITS } from "@/lib/security/rate-limit";

/** POST /api/comments — komentar pada pin/media (publik, IP+device dicatat). */
const schema = z.object({
  media_id: z.string().uuid("Media tidak valid"),
  content: z.string().trim().min(1, "Komentar kosong").max(500, "Maksimal 500 karakter"),
  author_name: z.string().trim().max(60).optional(),
});

export async function POST(req: Request) {
  const guarded = await guardPublicMutation(
    req,
    RATE_LIMITS.comment,
    "Kamu tidak dapat berkomentar.",
  );
  if (!guarded.ok) return guarded.response;
  const { access } = guarded;

  const body = await readJsonBody(req, 4 * 1024);
  if (!body.ok) return invalidJsonResponse(body);
  const parsed = schema.safeParse(body.data);
  if (!parsed.success) {
    return NextResponse.json(
      { error: validationErrorMessage(parsed) },
      { status: 400 },
    );
  }

  const sb = createAdminSupabase();
  const { data: media } = await sb
    .from("media")
    .select("id, status, allow_comments")
    .eq("id", parsed.data.media_id)
    .maybeSingle();
  if (!media || media.status !== "approved") {
    return NextResponse.json({ error: "Media tidak ditemukan" }, { status: 404 });
  }
  if (!media.allow_comments) {
    return NextResponse.json(
      { error: "Komentar dinonaktifkan untuk media ini" },
      { status: 403 },
    );
  }

  const userAgent = getUserAgent(req.headers);
  const { error } = await sb.from("comments").insert({
    media_id: parsed.data.media_id,
    content: parsed.data.content,
    author_name: parsed.data.author_name?.trim() || null,
    ip_address: access.ip,
    user_agent: userAgent,
    device: parseDevice(userAgent),
  });
  if (error) {
    return NextResponse.json({ error: "Gagal menyimpan komentar" }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
