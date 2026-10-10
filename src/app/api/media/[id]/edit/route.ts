import { NextResponse } from "next/server";
import { z } from "zod";
import { mutationPrerequisiteResponse } from "@/lib/api/public-mutation";
import { invalidJsonResponse } from "@/lib/api/responses";
import { readJsonBody } from "@/lib/api/request";
import { validationErrorMessage } from "@/lib/action-result";
import { isValidId } from "@/lib/admin/guard";
import { UPLOAD_LIMITS } from "@/lib/constants";
import {
  cleanupRejectedMediaFinalization,
  finalizeMediaUpload,
  getMediaUploadAdmin,
} from "@/lib/media/finalize";
import { mediaDetailsSchema } from "@/lib/media/metadata-schema";
import { revalidateMediaPages } from "@/lib/media/revalidate";
import { updateMediaPost, type MediaItemPlan } from "@/lib/media/upload";

const dimension = z.number().int().positive().max(UPLOAD_LIMITS.mediaMaxDimension);
const storedUrl = z.url().max(2048);

const schema = z.object({
  /** URL sampul + slide yang dilihat editor saat dibuka (optimistic lock). */
  expected: z.array(storedUrl).min(1).max(UPLOAD_LIMITS.mediaPerPost),
  /** Susunan baru berurutan (item pertama = sampul); null = media tidak diubah. */
  items: z
    .array(
      z.union([
        z.object({ keep: storedUrl }),
        z.object({ ticket: z.string().min(1).max(4096), width: dimension, height: dimension }),
      ]),
    )
    .min(1)
    .max(UPLOAD_LIMITS.mediaPerPost)
    .nullable(),
  details: mediaDetailsSchema,
});

/** Dua daftar URL + satu tiket (≤4 KB) per item baru + detail teks. */
const MAX_BODY_BYTES = 12 * 1024 + UPLOAD_LIMITS.mediaPerPost * (4608 + 2 * 2048);

/**
 * Simpan "Edit postingan" sebuah pin: susunan media (urutan, sampul, item
 * tambahan/dihapus, foto hasil editor) dan detailnya sekaligus. Byte item
 * baru sudah dikirim langsung ke Storage; route ini memverifikasi tiketnya
 * lalu menulis semuanya dalam satu transaksi.
 */
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

  const { id } = await context.params;
  const body = await readJsonBody(request, MAX_BODY_BYTES);
  if (!body.ok) return invalidJsonResponse(body);
  const parsed = schema.safeParse(body.data);
  if (!parsed.success || !isValidId(id)) {
    await cleanupRejectedMediaFinalization(body.data, {
      mode: "edit",
      adminId: admin.id,
    });
    return NextResponse.json(
      {
        error: parsed.success
          ? "Postingan tidak valid."
          : validationErrorMessage(parsed, "Data postingan tidak valid."),
      },
      { status: 400 },
    );
  }

  const uploads = (parsed.data.items ?? []).flatMap((item) => ("ticket" in item ? [item] : []));
  const finalized = await finalizeMediaUpload({
    mode: "edit",
    request,
    tokens: uploads.map((item) => item.ticket),
    admin,
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
    return NextResponse.json(
      {
        error:
          finalized.reason === "stored-invalid"
            ? "Unggahan belum lengkap. Silakan coba lagi."
            : "Penyimpanan belum dapat memverifikasi file. Coba simpan lagi.",
      },
      { status: finalized.reason === "stored-invalid" ? 409 : 503 },
    );
  }

  let uploadIndex = 0;
  const items: MediaItemPlan[] | null =
    parsed.data.items?.map((item) => {
      if ("keep" in item) return { keep: item.keep };
      const upload = finalized.items[uploadIndex++];
      return {
        upload: {
          path: upload.ticket.path,
          mediaType: upload.mediaType,
          mimeType: upload.mimeType,
          width: item.width,
          height: item.height,
        },
      };
    }) ?? null;

  const saved = await updateMediaPost({
    id,
    expected: parsed.data.expected,
    items,
    details: parsed.data.details,
  });
  if (saved.error) {
    return NextResponse.json({ error: saved.error }, { status: 409 });
  }

  revalidateMediaPages(id);
  return NextResponse.json({ ok: true });
}
