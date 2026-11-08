import { SignJWT, jwtVerify } from "jose";
import { requiredSecret } from "@/lib/env";
import type { AdminRole } from "@/lib/types/database";

/**
 * Tanda tangan & verifikasi token sesi (JWT HS256 via jose).
 * Pure — TIDAK memakai next/headers, jadi bisa dipakai di Edge middleware
 * maupun Node server action. Rahasia dari AUTH_SECRET.
 */
export interface SessionPayload {
  sub: string; // id admin
  role: AdminRole;
  name: string;
  username: string;
  /** Harus sama dengan admins.session_version agar sesi diterima. */
  ver: number;
}

const MAX_AGE_SECONDS = 60 * 60 * 24 * 7; // 7 hari
export const SESSION_MAX_AGE = MAX_AGE_SECONDS;
const SESSION_ISSUER = "community-template";
const SESSION_AUDIENCE = "admin-session";
const DEVICE_AUDIENCE = "admin-device";
export const DEVICE_MAX_AGE = 60 * 60 * 24 * 180; // 180 hari

/** Kunci pusat untuk JWT sesi dan tiket internal dengan audience terpisah. */
export function getAuthSecretKey(): Uint8Array {
  return new TextEncoder().encode(
    requiredSecret("AUTH_SECRET", process.env.AUTH_SECRET),
  );
}

export async function signSession(payload: SessionPayload): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuer(SESSION_ISSUER)
    .setAudience(SESSION_AUDIENCE)
    .setIssuedAt()
    .setExpirationTime(`${MAX_AGE_SECONDS}s`)
    .sign(getAuthSecretKey());
}

export async function verifySession(
  token: string,
): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getAuthSecretKey(), {
      algorithms: ["HS256"],
      issuer: SESSION_ISSUER,
      audience: SESSION_AUDIENCE,
    });
    if (
      typeof payload.sub === "string" &&
      (payload.role === "owner" || payload.role === "admin") &&
      typeof payload.name === "string" &&
      typeof payload.username === "string"
    ) {
      return {
        sub: payload.sub,
        role: payload.role as AdminRole,
        name: payload.name,
        username: payload.username,
        // Token sebelum versi sesi diperkenalkan setara dengan versi awal 1.
        ver: Number.isInteger(payload.ver) ? (payload.ver as number) : 1,
      };
    }
    return null;
  } catch {
    return null; // token invalid / kadaluarsa / tanda tangan salah
  }
}

/**
 * Penanda perangkat yang pernah login sukses (pola "device cookie" OWASP).
 * Hanya dipakai untuk melewati kuota login per-akun, sehingga penyerang tidak
 * bisa mengunci owner dari perangkatnya sendiri. Bukan bukti autentikasi.
 */
export async function signDeviceToken(username: string): Promise<string> {
  return new SignJWT({ username: username.toLowerCase() })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuer(SESSION_ISSUER)
    .setAudience(DEVICE_AUDIENCE)
    .setIssuedAt()
    .setExpirationTime(`${DEVICE_MAX_AGE}s`)
    .sign(getAuthSecretKey());
}

export async function deviceTrustsUsername(
  token: string | undefined,
  username: string,
): Promise<boolean> {
  if (!token) return false;
  try {
    const { payload } = await jwtVerify(token, getAuthSecretKey(), {
      algorithms: ["HS256"],
      issuer: SESSION_ISSUER,
      audience: DEVICE_AUDIENCE,
    });
    return payload.username === username.toLowerCase();
  } catch {
    return false;
  }
}
