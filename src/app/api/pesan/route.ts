import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createAdminSupabase } from "@/lib/supabase/admin";
import { getUserAgent, parseDevice } from "@/lib/utils/request";
import { validationErrorMessage } from "@/lib/action-result";
import { invalidJsonResponse } from "@/lib/api/responses";
import { readJsonBody } from "@/lib/api/request";
import { guardPublicMutation } from "@/lib/api/public-mutation";
import { RATE_LIMITS } from "@/lib/security/rate-limit";

/** POST /api/pesan — kirim pesan anonim. IP + device ditangkap di server. */
const schema = z.object({
  content: z
    .string()
    .trim()
    .min(1, "Pesan tidak boleh kosong")
    .max(500, "Maksimal 500 karakter"),
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

  const sb = createAdminSupabase();
  const userAgent = getUserAgent(req.headers);
  const { error } = await sb.from("messages").insert({
    content: parsed.data.content,
    ip_address: access.ip,
    user_agent: userAgent,
    device: parseDevice(userAgent),
  });

  if (error) {
    return NextResponse.json({ error: "Gagal menyimpan pesan" }, { status: 500 });
  }
  revalidatePath("/pesan");
  return NextResponse.json({ ok: true });
}
