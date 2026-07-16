import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import {
  ADMIN_AUTH_PATHS,
  SESSION_COOKIE,
  type AdminFeature,
} from "@/lib/constants";
import { createAdminSupabase } from "@/lib/supabase/admin";
import { isSupabaseConfigured } from "@/lib/supabase/public";
import type { AdminRow } from "@/lib/types/database";
import { canAccess } from "./permissions";
import {
  signSession,
  verifySession,
  SESSION_MAX_AGE,
  type SessionPayload,
} from "./session";

export * from "./permissions";

/** Simpan sesi ke cookie HttpOnly + Secure + SameSite=Lax (aman dari XSS/CSRF dasar). */
export async function setSessionCookie(payload: SessionPayload): Promise<void> {
  const token = await signSession(payload);
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_MAX_AGE,
  });
}

export async function clearSessionCookie(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE);
}

async function getSession(): Promise<SessionPayload | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  return verifySession(token);
}

/** Ambil data admin lengkap dari DB sesuai sesi. null bila belum login / nonaktif. */
export async function getCurrentAdmin(): Promise<AdminRow | null> {
  if (!isSupabaseConfigured()) return null;
  const session = await getSession();
  if (!session) return null;
  const supabase = createAdminSupabase();
  const { data } = await supabase
    .from("admins")
    .select("*")
    .eq("id", session.sub)
    .maybeSingle();
  if (!data || !data.is_active) return null;
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
export async function requireAdmin(): Promise<AdminRow> {
  const admin = await getCurrentAdmin();
  if (!admin) redirect(ADMIN_AUTH_PATHS.login);
  return admin;
}

/** Wajib login + punya izin fitur tertentu. Kalau tidak, balik ke profil. */
export async function requireFeature(
  feature: AdminFeature,
): Promise<AdminRow> {
  const admin = await requireAdmin();
  if (!canAccess(admin, feature)) redirect("/profil");
  return admin;
}
