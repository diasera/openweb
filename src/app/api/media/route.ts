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
} from "@/lib/media/finalize";
import { saveMediaRecord } from "@/lib/media/upload";

const schema = z.object({
  ticket: z.string().min(1).max(4096),
  title: z.string().trim().max(120).nullable().optional(),
  category: z.string().trim().max(40).nullable().optional(),
  caption: z.string().trim().max(300).nullable().optional(),
  uploader_name: z.string().trim().max(60).nullable().optional(),
  allow_comments: z.boolean(),
  width: z.number().int().positive().max(UPLOAD_LIMITS.mediaMaxDimension),
  height: z.number().int().positive().max(UPLOAD_LIMITS.mediaMaxDimension),
});

/** Finalisasi metadata kecil setelah browser selesai mengirim file ke Storage. */
export async function POST(request: Request) {
  const prerequisite = mutationPrerequisiteResponse(request);
  if (prerequisite) return prerequisite;

  const body = await readJsonBody(request, 8 * 1024);
  if (!body.ok) return invalidJsonResponse(body);
  const parsed = schema.safeParse(body.data);
  if (!parsed.success) {
    await cleanupRejectedMediaFinalization(body.data, { mode: "create" });
    return NextResponse.json({ error: "Data media tidak valid." }, { status: 400 });
  }
  const finalized = await finalizeMediaUpload({
    mode: "create",
    request,
    token: parsed.data.ticket,
  });
  if (!finalized.ok) {
    if (finalized.reason === "guard") return finalized.response;
    if (finalized.reason === "invalid-ticket") {
      return NextResponse.json(
        { error: "Tiket unggahan tidak valid." },
        { status: 401 },
      );
    }
    if (finalized.reason === "invalid-descriptor") {
      return NextResponse.json(
        { error: "File media tidak valid." },
        { status: 400 },
      );
    }
    if (finalized.reason === "invalid-admin-session") {
      return NextResponse.json(
        { error: "Sesi admin tidak valid." },
        { status: 403 },
      );
    }
    return NextResponse.json(
      {
        error:
          finalized.reason === "stored-invalid"
            ? "Unggahan belum lengkap atau tipe file berubah. Silakan coba lagi."
            : "Penyimpanan belum dapat memverifikasi file. Coba finalisasi lagi.",
      },
      { status: finalized.reason === "stored-invalid" ? 409 : 503 },
    );
  }

  const approved = finalized.ticket.source === "admin";
  const { error } = await saveMediaRecord({
    path: finalized.ticket.path,
    mediaType: finalized.mediaType,
    mimeType: finalized.mimeType,
    title: parsed.data.title || null,
    category: parsed.data.category || null,
    caption: parsed.data.caption || null,
    uploaderName: approved
      ? finalized.admin?.name ?? null
      : parsed.data.uploader_name || null,
    allowComments: parsed.data.allow_comments,
    width: parsed.data.width,
    height: parsed.data.height,
    status: approved ? "approved" : "pending",
    source: approved ? "admin" : "public",
    ip: finalized.publicIp,
    reviewedBy: approved ? finalized.admin?.id ?? null : null,
  });
  if (error) {
    return NextResponse.json(
      { error },
      { status: error.includes("sudah digunakan") ? 409 : 500 },
    );
  }

  revalidatePath("/");
  revalidatePath("/galeri");
  revalidatePath("/profil");
  return NextResponse.json({ ok: true, approved });
}
