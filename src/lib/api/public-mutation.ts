import "server-only";

import { NextResponse } from "next/server";
import { getPublicInteractionAccess } from "@/lib/moderation";
import type { RateLimitPolicy } from "@/lib/security/rate-limit";
import { isSupabaseConfigured } from "@/lib/supabase/public";
import { validateMutationOrigin } from "./request";
import {
  databaseUnavailableResponse,
  invalidMutationResponse,
  rateLimitResponse,
} from "./responses";

/** Pemeriksaan awal bersama untuk seluruh endpoint mutasi berbasis database. */
export function mutationPrerequisiteResponse(request: Request) {
  if (!isSupabaseConfigured()) return databaseUnavailableResponse();

  const originError = validateMutationOrigin(request);
  return originError ? invalidMutationResponse(originError) : null;
}

/**
 * Gerbang interaksi publik setelah pemeriksaan request awal dilakukan. Dipisah
 * agar endpoint campuran admin/publik tidak memberi rate limit publik ke admin.
 */
export async function guardPublicInteraction(
  request: Request,
  policy: RateLimitPolicy,
  blockedMessage: string,
) {
  const access = await getPublicInteractionAccess(request.headers, policy);
  if (access.rateLimit && (!access.rateLimit.ok || !access.rateLimit.allowed)) {
    return { ok: false as const, response: rateLimitResponse(access.rateLimit) };
  }
  if (access.error) {
    return {
      ok: false as const,
      response: NextResponse.json({ error: access.error }, { status: 503 }),
    };
  }
  if (access.blocked) {
    return {
      ok: false as const,
      response: NextResponse.json({ error: blockedMessage }, { status: 403 }),
    };
  }
  return { ok: true as const, access };
}

/** Satu pintu untuk endpoint yang seluruh mutasinya merupakan aksi publik. */
export async function guardPublicMutation(
  request: Request,
  policy: RateLimitPolicy,
  blockedMessage: string,
) {
  const prerequisite = mutationPrerequisiteResponse(request);
  if (prerequisite) return { ok: false as const, response: prerequisite };
  return guardPublicInteraction(request, policy, blockedMessage);
}
