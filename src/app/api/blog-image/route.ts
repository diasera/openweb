import { NextResponse } from "next/server";
import { getCurrentAdmin, canAccess } from "@/lib/auth";
import { uploadManagedImage } from "@/lib/assets/managed-images";
import { UPLOAD_LIMITS } from "@/lib/constants";
import {
  invalidMutationResponse,
  rateLimitResponse,
} from "@/lib/api/responses";
import { validateMutationOrigin } from "@/lib/api/request";
import {
  consumeRateLimit,
  RATE_LIMITS,
  requestRateLimitIdentity,
} from "@/lib/security/rate-limit";

/** POST /api/blog-image — upload gambar di dalam editor artikel (khusus admin blog). */
export async function POST(req: Request) {
  const originError = validateMutationOrigin(req);
  if (originError) return invalidMutationResponse(originError);

  const admin = await getCurrentAdmin();
  if (!admin || !canAccess(admin, "blog")) {
    return NextResponse.json({ error: "Tidak diizinkan" }, { status: 403 });
  }

  const limited = await consumeRateLimit(
    RATE_LIMITS.adminUpload,
    requestRateLimitIdentity(req.headers, admin.id),
  );
  if (!limited.ok || !limited.allowed) return rateLimitResponse(limited);

  const contentLength = Number(req.headers.get("content-length"));
  if (
    Number.isFinite(contentLength) &&
    contentLength > UPLOAD_LIMITS.imageMaxBytes + 1024 * 1024
  ) {
    return NextResponse.json(
      { error: "Body unggahan terlalu besar." },
      { status: 413 },
    );
  }

  const form = await req.formData().catch(() => null);
  const file = form?.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return NextResponse.json({ error: "Tidak ada file" }, { status: 400 });
  }

  // Objek inline ikut siklus hidup artikel: dibersihkan saat tak lagi dirujuk.
  const uploaded = await uploadManagedImage("blog-inline", file);
  if (!uploaded.ok) return NextResponse.json({ error: uploaded.error }, { status: 400 });
  return NextResponse.json({ url: uploaded.asset.url });
}
