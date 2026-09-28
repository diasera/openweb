import "server-only";
import { createHmac } from "node:crypto";
import { getAuthSecretKey } from "@/lib/auth/session";
import { createAdminSupabase } from "@/lib/supabase/admin";
import { getClientIp } from "@/lib/utils/request";
import { UPLOAD_LIMITS } from "@/lib/constants";
import {
  isSchemaOutdatedError,
  SCHEMA_OUTDATED_MESSAGE,
} from "@/lib/database/errors";

export interface RateLimitPolicy {
  scope: string;
  limit: number;
  windowSeconds: number;
}

export const RATE_LIMITS = {
  loginPair: { scope: "auth:login-pair", limit: 8, windowSeconds: 15 * 60 },
  // Hanya berlaku untuk perangkat yang belum pernah login sukses sebagai akun ini.
  loginAccount: { scope: "auth:login-account", limit: 50, windowSeconds: 15 * 60 },
  loginIp: { scope: "auth:login-ip", limit: 40, windowSeconds: 15 * 60 },
  accountUpdate: {
    scope: "auth:account-update",
    limit: 10,
    windowSeconds: 15 * 60,
  },
  ownerSetup: { scope: "auth:owner-setup", limit: 5, windowSeconds: 60 * 60 },
  comment: { scope: "public:comment", limit: 10, windowSeconds: 5 * 60 },
  message: { scope: "public:message", limit: 5, windowSeconds: 10 * 60 },
  messageLike: { scope: "public:message-like", limit: 60, windowSeconds: 5 * 60 },
  // Ditandatangani per file: cukup untuk tiga pin carousel penuh per jam.
  uploadSign: {
    scope: "public:upload-sign",
    limit: UPLOAD_LIMITS.mediaPerPost * 3,
    windowSeconds: 60 * 60,
  },
  uploadFinalize: {
    scope: "public:upload-finalize",
    limit: 20,
    windowSeconds: 60 * 60,
  },
  bell: { scope: "public:bell", limit: 30, windowSeconds: 60 * 60 },
  pushSubscribe: {
    scope: "public:push-subscribe",
    limit: 20,
    windowSeconds: 60 * 60,
  },
  search: { scope: "public:search", limit: 90, windowSeconds: 5 * 60 },
  trackVisitor: {
    scope: "public:track-visitor",
    limit: 60,
    windowSeconds: 60 * 60,
  },
  trackIp: { scope: "public:track-ip", limit: 1000, windowSeconds: 60 * 60 },
  adminUpload: { scope: "admin:upload", limit: 120, windowSeconds: 60 * 60 },
  // Dipakai sebagai kunci global: sapuan objek yatim paling sering sekali per 15 menit.
  uploadSweep: {
    scope: "maintenance:upload-sweep",
    limit: 1,
    windowSeconds: 15 * 60,
  },
  dataRetention: {
    scope: "maintenance:data-retention",
    limit: 1,
    windowSeconds: 24 * 60 * 60,
  },
} as const satisfies Record<string, RateLimitPolicy>;

export type RateLimitResult =
  | { ok: true; allowed: boolean; retryAfterSeconds: number }
  | { ok: false; error: string; migrationRequired: boolean };

function hashRateLimitKey(scope: string, parts: readonly string[]): string {
  return createHmac("sha256", getAuthSecretKey())
    .update(JSON.stringify([scope, ...parts]))
    .digest("hex");
}

/** Hash dapat diteruskan ke RPC gabungan tanpa menyimpan IP mentah. */
export function rateLimitKeyHash(
  policy: RateLimitPolicy,
  identityParts: readonly string[],
): string {
  return hashRateLimitKey(policy.scope, identityParts);
}

/** Identitas IP tervalidasi; nilai unknown sengaja berbagi satu kuota aman. */
export function requestRateLimitIdentity(
  headers: Headers,
  ...discriminators: string[]
): string[] {
  return [getClientIp(headers) ?? "unknown", ...discriminators];
}

/**
 * Pembatas laju atomik di Postgres. Tidak memakai Map proses karena instance
 * serverless dapat berganti dan berjalan paralel.
 */
export async function consumeRateLimit(
  policy: RateLimitPolicy,
  identityParts: readonly string[],
): Promise<RateLimitResult> {
  if (
    !/^[a-z0-9:_-]{1,64}$/.test(policy.scope) ||
    !Number.isInteger(policy.limit) ||
    policy.limit < 1 ||
    !Number.isInteger(policy.windowSeconds) ||
    policy.windowSeconds < 1
  ) {
    throw new Error("Kebijakan rate limit internal tidak valid.");
  }

  try {
    const keyHash = rateLimitKeyHash(policy, identityParts);
    const { data, error } = await createAdminSupabase().rpc(
      "consume_rate_limit",
      {
        p_scope: policy.scope,
        p_key_hash: keyHash,
        p_limit: policy.limit,
        p_window_seconds: policy.windowSeconds,
      },
    );
    if (error) {
      const migrationRequired =
        isSchemaOutdatedError(error) ||
        /consume_rate_limit|function/i.test(error.message);
      console.error("[security:rate-limit] pemeriksaan gagal", {
        scope: policy.scope,
        code: error.code,
        message: error.message,
        migrationRequired,
      });
      return {
        ok: false,
        migrationRequired,
        error: migrationRequired
          ? SCHEMA_OUTDATED_MESSAGE
          : "Layanan perlindungan permintaan sedang tidak tersedia.",
      };
    }

    const decision = data?.[0];
    if (!decision || typeof decision.allowed !== "boolean") {
      console.error("[security:rate-limit] respons RPC tidak valid", {
        scope: policy.scope,
      });
      return {
        ok: false,
        migrationRequired: false,
        error: "Layanan perlindungan permintaan sedang tidak tersedia.",
      };
    }
    return {
      ok: true,
      allowed: decision.allowed,
      retryAfterSeconds: Math.max(1, decision.retry_after_seconds || 1),
    };
  } catch (error) {
    console.error("[security:rate-limit] pemeriksaan melempar error", {
      scope: policy.scope,
      message: error instanceof Error ? error.message : String(error),
    });
    return {
      ok: false,
      migrationRequired: false,
      error: "Konfigurasi keamanan server tidak valid.",
    };
  }
}
