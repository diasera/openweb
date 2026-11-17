import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createAdminSupabase } from "@/lib/supabase/admin";
import { getUserAgent, parseDevice } from "@/lib/utils/request";
import { validationErrorMessage } from "@/lib/action-result";
import { invalidJsonResponse } from "@/lib/api/responses";
import { readJsonBody } from "@/lib/api/request";
import { guardPublicMutation } from "@/lib/api/public-mutation";
import {
  encodeSongfessContent,
  MAX_SONGFESS_TEXT_LENGTH,
} from "@/lib/messages/songfess";
import { RATE_LIMITS } from "@/lib/security/rate-limit";

/** POST /api/pesan — kirim pesan anonim (opsional beserta lampiran lagu Songfess). */
const schema = z.object({
  content: z
    .string()
    .trim()
    .min(1, "Pesan tidak boleh kosong")
    .max(500, "Maksimal 500 karakter"),
  trackId: z.string().uuid("ID lagu tidak sah").optional().nullable(),
});

export async function POST(req: Request) {
  const guarded = await guardPublicMutation(
    req,
    RATE_LIMITS.message,
    "Kamu tidak dapat mengirim pesan.",
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

  if (parsed.data.trackId && parsed.data.content.length > MAX_SONGFESS_TEXT_LENGTH) {
    return NextResponse.json(
      {
        error: `Pesan dengan lampiran lagu maksimal ${MAX_SONGFESS_TEXT_LENGTH} karakter.`,
      },
      { status: 400 },
    );
  }

  const sb = createAdminSupabase();
  let verifiedTrackId: string | null = null;
  if (parsed.data.trackId) {
    const { data: track } = await sb
      .from("music_tracks")
      .select("id")
      .eq("id", parsed.data.trackId)
      .eq("is_active", true)
      .maybeSingle();
    if (!track) {
      return NextResponse.json(
        { error: "Lagu yang dipilih sudah tidak aktif." },
        { status: 400 },
      );
    }
    verifiedTrackId = track.id;
  }

  const userAgent = getUserAgent(req.headers);
  const finalContent = encodeSongfessContent(
    parsed.data.content,
    verifiedTrackId,
  );

  const { error } = await sb.from("messages").insert({
    content: finalContent,
    ip_address: access.ip,
    user_agent: userAgent,
    device: parseDevice(userAgent, req.headers),
  });

  if (error) {
    return NextResponse.json({ error: "Gagal menyimpan pesan" }, { status: 500 });
  }
  revalidatePath("/pesan");
  return NextResponse.json({ ok: true });
}
