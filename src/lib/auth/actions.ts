"use server";

import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { z } from "zod";
import { createAdminSupabase } from "@/lib/supabase/admin";
import { isSupabaseConfigured } from "@/lib/supabase/public";
import {
  DUMMY_PASSWORD_HASH,
  hashPassword,
  verifyPassword,
} from "@/lib/auth/password";
import {
  adminNameSchema,
  adminPasswordSchema,
  adminUsernameSchema,
} from "@/lib/auth/credentials";
import { setSessionCookie, clearSessionCookie, ownerExists } from "@/lib/auth";
import { validationErrorMessage } from "@/lib/action-result";
import {
  ADMIN_FEATURES,
  isAdminProfileRoute,
} from "@/lib/constants";
import {
  consumeRateLimit,
  RATE_LIMITS,
  requestRateLimitIdentity,
} from "@/lib/security/rate-limit";

/** Bentuk state form auth (dipakai useActionState di form login/setup). */
export interface AuthState {
  error?: string;
}

const NO_DB: AuthState = {
  error: "Database Supabase belum terhubung. Isi .env.local lalu jalankan schema.sql.",
};

const setupSchema = z
  .object({
    name: adminNameSchema,
    username: adminUsernameSchema,
    password: adminPasswordSchema,
    confirm: z.string(),
  })
  .refine((d) => d.password === d.confirm, {
    message: "Konfirmasi password tidak cocok",
    path: ["confirm"],
  });

/** Setup owner pertama kali. Setelah sukses, menu admin muncul di profil. */
export async function setupOwnerAction(
  _prev: AuthState,
  formData: FormData,
): Promise<AuthState> {
  if (!isSupabaseConfigured()) return NO_DB;
  const parsed = setupSchema.safeParse({
    name: formData.get("name"),
    username: formData.get("username"),
    password: formData.get("password"),
    confirm: formData.get("confirm"),
  });
  if (!parsed.success) {
    return { error: validationErrorMessage(parsed) };
  }

  const requestHeaders = await headers();
  const limited = await consumeRateLimit(
    RATE_LIMITS.ownerSetup,
    requestRateLimitIdentity(requestHeaders),
  );
  if (!limited.ok) return { error: limited.error };
  if (!limited.allowed) {
    return {
      error: `Terlalu banyak percobaan setup. Coba lagi dalam ${limited.retryAfterSeconds} detik.`,
    };
  }

  // Cegah pembuatan owner kedua (idempoten & aman).
  if (await ownerExists()) {
    return { error: "Owner sudah ada. Silakan login." };
  }

  const supabase = createAdminSupabase();
  const password_hash = await hashPassword(parsed.data.password);
  const permissions = Object.fromEntries(
    ADMIN_FEATURES.map((feature) => [feature, true]),
  );

  const { data, error } = await supabase
    .from("admins")
    .insert({
      name: parsed.data.name,
      username: parsed.data.username.toLowerCase(),
      password_hash,
      role: "owner",
      permissions,
    })
    .select("id, name, username, role")
    .single();

  if (error || !data) {
    if (error?.code === "23505") {
      return { error: "Owner sudah dibuat oleh permintaan lain. Silakan login." };
    }
    const message = error?.message ?? "respons kosong";
    console.error("[auth:setup-owner] pembuatan owner gagal", {
      code: error?.code,
      message,
    });
    const networkFailure =
      /fetch failed|network|ENOTFOUND|ECONNREFUSED|ETIMEDOUT/i.test(message);
    return {
      error: networkFailure
        ? "Database belum dapat dihubungi. Periksa konfigurasi server."
        : "Gagal membuat owner. Periksa log server dan konfigurasi database.",
    };
  }

  await setSessionCookie({
    sub: data.id,
    role: "owner",
    name: data.name,
    username: data.username,
  });
  redirect("/profil");
}

const loginSchema = z.object({
  username: z
    .string()
    .trim()
    .min(1, "Username wajib diisi")
    .max(30, "Username tidak valid"),
  password: z
    .string()
    .min(1, "Password wajib diisi")
    .max(200, "Password tidak valid"),
});

/** Login owner/admin. Pesan error disamakan untuk cegah user enumeration. */
export async function loginAction(
  _prev: AuthState,
  formData: FormData,
): Promise<AuthState> {
  if (!isSupabaseConfigured()) return NO_DB;
  const parsed = loginSchema.safeParse({
    username: formData.get("username"),
    password: formData.get("password"),
  });
  if (!parsed.success) {
    return { error: validationErrorMessage(parsed) };
  }

  const normalizedUsername = parsed.data.username.toLowerCase();
  const requestHeaders = await headers();
  const identity = requestRateLimitIdentity(requestHeaders);
  const [pairLimit, accountLimit, ipLimit] = await Promise.all([
    consumeRateLimit(RATE_LIMITS.loginPair, [
      ...identity,
      normalizedUsername,
    ]),
    consumeRateLimit(RATE_LIMITS.loginAccount, [normalizedUsername]),
    consumeRateLimit(RATE_LIMITS.loginIp, identity),
  ]);
  if (!pairLimit.ok) return { error: pairLimit.error };
  if (!accountLimit.ok) return { error: accountLimit.error };
  if (!ipLimit.ok) return { error: ipLimit.error };
  if (!pairLimit.allowed || !accountLimit.allowed || !ipLimit.allowed) {
    const retryAfter = Math.max(
      pairLimit.retryAfterSeconds,
      accountLimit.retryAfterSeconds,
      ipLimit.retryAfterSeconds,
    );
    return {
      error: `Terlalu banyak percobaan login. Coba lagi dalam ${retryAfter} detik.`,
    };
  }

  const supabase = createAdminSupabase();
  const { data: admin } = await supabase
    .from("admins")
    .select("*")
    .eq("username", normalizedUsername)
    .maybeSingle();

  const invalid: AuthState = { error: "Username atau password salah" };
  const ok = await verifyPassword(
    parsed.data.password,
    admin?.password_hash ?? DUMMY_PASSWORD_HASH,
  );
  if (!admin || !admin.is_active || !ok) return invalid;

  await supabase
    .from("admins")
    .update({ last_login_at: new Date().toISOString() })
    .eq("id", admin.id);

  await setSessionCookie({
    sub: admin.id,
    role: admin.role,
    name: admin.name,
    username: admin.username,
  });

  // Cegah open redirect: hanya izinkan route pengelolaan di bawah profil.
  const next = String(formData.get("next") ?? "");
  redirect(isAdminProfileRoute(next) ? next : "/profil");
}

export async function logoutAction(): Promise<void> {
  await clearSessionCookie();
  redirect("/profil");
}
