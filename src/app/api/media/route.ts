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
import {
  revalidateMediaAdminPages,
  revalidateMediaPages,
} from "@/lib/media/revalidate";
import { saveMediaRecord } from "@/lib/media/upload";

const dimension = z.number().int().positive().max(UPLOAD_LIMITS.mediaMaxDimension);

const schema = z.object({
  /** Item carousel berurutan; item pertama menjadi sampul pin. */
  items: z
    .array(z.object({ ticket: z.string().min(1).max(4096), width: dimension, height: dimension }))
    .min(1)
    .max(UPLOAD_LIMITS.mediaPerPost),
  title: z.string().trim().max(120).nullable().optional(),
  category: z.string().trim().max(40).nullable().optional(),
  caption: z.string().trim().max(300).nullable().optional(),
  uploader_name: z.string().trim().max(60).nullable().optional(),
  allow_comments: z.boolean(),
});

/** Metadata kecil + satu tiket (≤4 KB) per item carousel. */
const MAX_BODY_BYTES = 4 * 1024 + UPLOAD_LIMITS.mediaPerPost * 4608;

/** Tab lama yang belum dimuat ulang masih mengirim bentuk satu tiket. */
function withLegacySingleItem(input: unknown): unknown {
  if (!input || typeof input !== "object" || Array.isArray(input) || "items" in input) {
    return input;
  }
  const { ticket, width, height, ...rest } = input as Record<string, unknown>;
  return { ...rest, items: [{ ticket, width, height }] };
}

/** Finalisasi metadata kecil setelah browser selesai mengirim file ke Storage. */
export async function POST(request: Request) {
  const prerequisite = mutationPrerequisiteResponse(request);
  if (prerequisite) return prerequisite;

  const body = await readJsonBody(request, MAX_BODY_BYTES);
  if (!body.ok) return invalidJsonResponse(body);
  const parsed = schema.safeParse(withLegacySingleItem(body.data));
  if (!parsed.success) {
    await cleanupRejectedMediaFinalization(body.data, { mode: "create" });
    return NextResponse.json({ error: "Data media tidak valid." }, { status: 400 });
  }
  const finalized = await finalizeMediaUpload({
    mode: "create",
    request,
    tokens: parsed.data.items.map((item) => item.ticket),
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

  const approved = finalized.source === "admin";
  const { error } = await saveMediaRecord({
    items: finalized.items.map((item, index) => ({
      path: item.ticket.path,
      mediaType: item.mediaType,
      mimeType: item.mimeType,
      width: parsed.data.items[index].width,
      height: parsed.data.items[index].height,
    })),
    title: parsed.data.title || null,
    category: parsed.data.category || null,
    caption: parsed.data.caption || null,
    uploaderName: approved
      ? finalized.admin?.name ?? null
      : parsed.data.uploader_name || null,
    allowComments: parsed.data.allow_comments,
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

  // Kiriman publik masih pending: belum ada halaman publik yang berubah, jadi
  // pengunjung anonim tidak bisa memicu invalidasi cache seluruh situs.
  if (approved) revalidateMediaPages();
  else revalidateMediaAdminPages();
  return NextResponse.json({ ok: true, approved });
}
