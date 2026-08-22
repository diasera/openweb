import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createAdminSupabase } from "@/lib/supabase/admin";
import { invalidJsonResponse } from "@/lib/api/responses";
import { readJsonBody } from "@/lib/api/request";
import { guardPublicMutation } from "@/lib/api/public-mutation";
import { getVisitorId } from "@/lib/visitors";
import { RATE_LIMITS } from "@/lib/security/rate-limit";

/** POST /api/pesan/like — tambah 1 like ke sebuah pesan anonim, maksimal
 *  sekali per pengunjung per pesan (tabel message_likes). Balikkan total baru. */
const schema = z.object({ id: z.string().uuid() });

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

  const sb = createAdminSupabase();

  // Dedup server: baris (pesan, pengunjung) unik — konflik berarti sudah like.
  const { error: insertError } = await sb
    .from("message_likes")
    .insert({ message_id: parsed.data.id, visitor_id: vid });

  if (insertError) {
    // Konflik kunci: pengunjung ini sudah pernah like — idempoten, tidak error.
    if (insertError.code === "23505") {
      const { data: liked } = await sb
        .from("messages")
        .select("likes")
        .eq("id", parsed.data.id)
        .maybeSingle();
      return NextResponse.json({ likes: liked?.likes ?? 0 });
    }
    // Tabel belum dibuat (deploy lama belum menjalankan schema.sql).
    if (insertError.code === "PGRST205" || insertError.code === "42P01") {
      return NextResponse.json(
        { error: "Jalankan schema.sql terbaru untuk mengaktifkan like." },
        { status: 503 },
      );
    }
    return NextResponse.json({ error: "Gagal menyukai" }, { status: 500 });
  }

  // Compare-and-swap mencegah dua like bersamaan saling menimpa tanpa perlu
  // menambah RPC khusus ke database. Konflik singkat dicoba ulang terbatas.
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const { data: row, error: readError } = await sb
      .from("messages")
      .select("likes")
      .eq("id", parsed.data.id)
      .maybeSingle();
    if (readError) {
      return NextResponse.json({ error: "Gagal membaca pesan" }, { status: 500 });
    }
    if (!row) {
      return NextResponse.json(
        { error: "Pesan tidak ditemukan" },
        { status: 404 },
      );
    }

    const previousLikes = row.likes ?? 0;
    const likes = previousLikes + 1;
    const { data: updated, error: updateError } = await sb
      .from("messages")
      .update({ likes })
      .eq("id", parsed.data.id)
      .eq("likes", previousLikes)
      .select("likes")
      .maybeSingle();
    if (updateError) {
      return NextResponse.json({ error: "Gagal menyukai" }, { status: 500 });
    }
    if (updated) {
      revalidatePath("/pesan");
      revalidatePath("/");
      return NextResponse.json({ likes: updated.likes });
    }
  }

  return NextResponse.json(
    { error: "Like sedang ramai. Coba sekali lagi." },
    { status: 409 },
  );
}
