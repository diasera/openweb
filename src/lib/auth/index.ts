import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import {
  ADMIN_AUTH_PATHS,
  DEVICE_COOKIE,
  SESSION_COOKIE,
  type AdminFeature,
} from "@/lib/constants";
import { createAdminSupabase } from "@/lib/supabase/admin";
import { isSupabaseConfigured } from "@/lib/supabase/public";
import type { AdminAccount } from "@/lib/types/database";
import { canAccess } from "./permissions";
import {
  DEVICE_MAX_AGE,
  deviceTrustsUsername,
  signDeviceToken,
  signSession,
  verifySession,
  SESSION_MAX_AGE,
  type SessionPayload,
} from "./session";

export * from "./permissions";

/**
 * Kolom akun yang boleh dibaca di luar verifikasi password. `password_hash`
 * sengaja tidak ada agar tidak pernah ikut terserialisasi ke komponen klien.
 */
export const ADMIN_ACCOUNT_COLUMNS =
  "id, name, username, role, permissions, avatar_url, is_active, last_login_at, session_version, created_at" as const;

const AUTH_COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax",
  path: "/",
} as const;

/**
 * Mulai sesi admin: cookie sesi (HttpOnly + Secure + SameSite=Lax) dan penanda
 * perangkat tepercaya untuk kuota login per-akun.
 */
export async function startAdminSession(
  admin: Pick<AdminAccount, "id" | "role" | "name" | "username" | "session_version">,
): Promise<void> {
  const payload: SessionPayload = {
    sub: admin.id,
    role: admin.role,
    name: admin.name,
    username: admin.username,
    ver: admin.session_version,
  };
  const [token, deviceToken] = await Promise.all([
    signSession(payload),
    signDeviceToken(admin.username),
  ]);
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, token, {
    ...AUTH_COOKIE_OPTIONS,
    maxAge: SESSION_MAX_AGE,
  });
  cookieStore.set(DEVICE_COOKIE, deviceToken, {
    ...AUTH_COOKIE_OPTIONS,
    maxAge: DEVICE_MAX_AGE,
  });
}

export async function clearSessionCookie(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE);
}

/** Apakah perangkat ini pernah login sukses sebagai username tersebut? */
export async function isTrustedDeviceFor(username: string): Promise<boolean> {
  const cookieStore = await cookies();
  return deviceTrustsUsername(cookieStore.get(DEVICE_COOKIE)?.value, username);
}

async function getSession(): Promise<SessionPayload | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  return verifySession(token);
}

/**
 * Ambil akun admin dari DB sesuai sesi. null bila belum login, nonaktif, atau
 * sesinya sudah dicabut (versi sesi tertinggal setelah ganti password).
 */
export async function getCurrentAdmin(): Promise<AdminAccount | null> {
  if (!isSupabaseConfigured()) return null;
  const session = await getSession();
  if (!session) return null;
  const supabase = createAdminSupabase();
  const { data, error } = await supabase
    .from("admins")
    .select(ADMIN_ACCOUNT_COLUMNS)
    .eq("id", session.sub)
    .maybeSingle();
  if (error) {
    console.error("[auth:session] akun admin tidak dapat dibaca", {
      code: error.code,
      message: error.message,
    });
    return null;
  }
  if (!data || !data.is_active || data.session_version !== session.ver) {
    return null;
  }
  return data;
}

/** Apakah owner sudah pernah dibuat? Menentukan alur setup vs login. */
export async function ownerExists(): Promise<boolean> {
  if (!isSupabaseConfigured()) return false;
  const supabase = createAdminSupabase();
  const { count } = await supabase
    .from("admins")
    .select("id", { count: "exact", head: true })
    .eq("role", "owner");
  return (count ?? 0) > 0;
}

/** Wajib login. Dipakai semua halaman dan action profil admin (guard terpusat). */
export async function requireAdmin(): Promise<AdminAccount> {
  const admin = await getCurrentAdmin();
  if (!admin) redirect(ADMIN_AUTH_PATHS.login);
  return admin;
}

/** Wajib login + punya izin fitur tertentu. Kalau tidak, balik ke profil. */
export async function requireFeature(
  feature: AdminFeature,
): Promise<AdminAccount> {
  const admin = await requireAdmin();
  if (!canAccess(admin, feature)) redirect("/profil");
  return admin;
}
