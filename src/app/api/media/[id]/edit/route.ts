import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { z } from "zod";
import { mutationPrerequisiteResponse } from "@/lib/api/public-mutation";
import { invalidJsonResponse } from "@/lib/api/responses";
import { readJsonBody } from "@/lib/api/request";
import { UPLOAD_LIMITS } from "@/lib/constants";
import {
  cleanupRejectedMediaFinalization,
  finalizeMediaUpload,
  getMediaUploadAdmin,
} from "@/lib/media/finalize";
import { replaceMediaPhoto } from "@/lib/media/upload";

const schema = z.object({
  ticket: z.string().min(1).max(4096),
  width: z.number().int().positive().max(UPLOAD_LIMITS.mediaMaxDimension),
  height: z.number().int().positive().max(UPLOAD_LIMITS.mediaMaxDimension),
});

/** Finalisasi penggantian foto; byte tetap dikirim langsung ke Supabase. */
export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const prerequisite = mutationPrerequisiteResponse(request);
  if (prerequisite) return prerequisite;

  const admin = await getMediaUploadAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Tidak diizinkan." }, { status: 403 });
  }

  const body = await readJsonBody(request, 8 * 1024);
  if (!body.ok) return invalidJsonResponse(body);
  const parsed = schema.safeParse(body.data);
  if (!parsed.success) {
    await cleanupRejectedMediaFinalization(body.data, {
      mode: "edit",
      adminId: admin.id,
    });
    return NextResponse.json(
      { error: "Data hasil edit tidak valid." },
      { status: 400 },
    );
  }

  const finalized = await finalizeMediaUpload({
    mode: "edit",
    request,
    token: parsed.data.ticket,
    admin,
  });
  if (!finalized.ok) {
    if (finalized.reason === "guard") return finalized.response;
    if (finalized.reason === "invalid-ticket") {
      return NextResponse.json(
        { error: "Tiket edit media tidak valid." },
        { status: 401 },
      );
    }
    if (finalized.reason === "invalid-descriptor") {
      return NextResponse.json(
        { error: "Hasil edit harus berupa foto yang didukung." },
        { status: 400 },
      );
    }
    return NextResponse.json(
      {
        error:
          finalized.reason === "stored-invalid"
            ? "Unggahan hasil edit belum lengkap. Silakan coba lagi."
            : "Penyimpanan belum dapat memverifikasi hasil edit. Coba finalisasi lagi.",
      },
      { status: finalized.reason === "stored-invalid" ? 409 : 503 },
    );
  }

  const { id } = await context.params;
  const saved = await replaceMediaPhoto({
    id,
    path: finalized.ticket.path,
    mimeType: finalized.mimeType,
    width: parsed.data.width,
    height: parsed.data.height,
  });
  if (saved.error) {
    return NextResponse.json({ error: saved.error }, { status: 409 });
  }

  revalidatePath(`/profil/media/${id}/edit`);
  revalidatePath("/profil/media");
  revalidatePath("/profil");
  revalidatePath("/");
  revalidatePath("/galeri");
  revalidatePath(`/pin/${id}`);
  return NextResponse.json({ ok: true });
}
