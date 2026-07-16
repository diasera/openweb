import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentAdmin, canAccess } from "@/lib/auth";
import { invalidJsonResponse, rateLimitResponse } from "@/lib/api/responses";
import {
  guardPublicInteraction,
  mutationPrerequisiteResponse,
} from "@/lib/api/public-mutation";
import { createAdminSupabase } from "@/lib/supabase/admin";
import { signUploadTicket } from "@/lib/uploads/ticket";
import { validateUploadDescriptor } from "@/lib/uploads/policy";
import { readJsonBody } from "@/lib/api/request";
import {
  consumeRateLimit,
  RATE_LIMITS,
  requestRateLimitIdentity,
} from "@/lib/security/rate-limit";

const schema = z.object({
  kind: z.enum(["media", "music"]),
  name: z.string().trim().min(1).max(255),
  type: z.string().trim().min(1).max(100),
  size: z.number().int().positive(),
});

/** Memberi izin upload untuk satu path acak; byte file tidak pernah masuk Vercel. */
export async function POST(request: Request) {
  const prerequisite = mutationPrerequisiteResponse(request);
  if (prerequisite) return prerequisite;

  const body = await readJsonBody(request, 2 * 1024);
  if (!body.ok) return invalidJsonResponse(body);
  const parsed = schema.safeParse(body.data);
  if (!parsed.success) {
    return NextResponse.json({ error: "Data file tidak valid." }, { status: 400 });
  }
  const policy = validateUploadDescriptor(parsed.data);
  if (!policy.ok) {
    return NextResponse.json({ error: policy.error }, { status: 400 });
  }

  const admin = await getCurrentAdmin();
  let source: "public" | "admin" = "public";
  if (parsed.data.kind === "music") {
    if (!admin || !canAccess(admin, "music")) {
      return NextResponse.json({ error: "Tidak diizinkan." }, { status: 403 });
    }
    source = "admin";
  } else if (admin && canAccess(admin, "media")) {
    source = "admin";
  } else {
    const guarded = await guardPublicInteraction(
      request,
      RATE_LIMITS.uploadSign,
      "Kamu tidak dapat mengunggah.",
    );
    if (!guarded.ok) return guarded.response;
  }

  if (source === "admin" && admin) {
    const limited = await consumeRateLimit(
      RATE_LIMITS.adminUpload,
      requestRateLimitIdentity(request.headers, admin.id),
    );
    if (!limited.ok || !limited.allowed) return rateLimitResponse(limited);
  }

  const folder =
    parsed.data.kind === "music" ? "tracks" : source === "admin" ? "admin" : "public";
  const path = `${folder}/${crypto.randomUUID()}.${policy.extension}`;
  const sb = createAdminSupabase();
  const { data, error } = await sb.storage
    .from(policy.bucket)
    .createSignedUploadUrl(path, { upsert: false });
  if (error || !data) {
    console.error("[upload:sign] gagal membuat signed URL", {
      bucket: policy.bucket,
      code: error?.name,
      message: error?.message,
    });
    return NextResponse.json(
      { error: "Penyimpanan belum siap. Periksa bucket Supabase." },
      { status: 503 },
    );
  }

  const ticket = await signUploadTicket({
    kind: parsed.data.kind,
    bucket: policy.bucket,
    path,
    mime: parsed.data.type,
    size: parsed.data.size,
    source,
    ...(source === "admin" && admin ? { adminId: admin.id } : {}),
  });

  return NextResponse.json({
    bucket: policy.bucket,
    path,
    signedUrl: data.signedUrl,
    uploadToken: data.token,
    ticket,
  });
}
