"use server";

import { revalidatePath } from "next/cache";
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
  optionalAdminPasswordSchema,
} from "@/lib/auth/credentials";
import {
  ADMIN_ACCOUNT_COLUMNS,
  clearSessionCookie,
  isTrustedDeviceFor,
  ownerExists,
  requireAdmin,
  startAdminSession,
} from "@/lib/auth";
import {
  validationErrorMessage,
  type ActionResult,
} from "@/lib/action-result";
import { checkedMutation } from "@/lib/database/mutation";
import {
  isSchemaOutdatedError,
  SCHEMA_OUTDATED_MESSAGE,
} from "@/lib/database/errors";
import {
  ADMIN_FEATURES,
  isAdminProfileRoute,
} from "@/lib/constants";
import {
  consumeRateLimit,
  RATE_LIMITS,
  requestRateLimitIdentity,
  type RateLimitResult,
} from "@/lib/security/rate-limit";

type AuthEchoField = "name" | "username";

/** Bentuk state form auth (dipakai useActionState di form login/setup). */
export interface AuthState {
  error?: string;
  /**
   * Isian non-rahasia yang dikirim balik sebagai defaultValue: React 19
   * mengosongkan field tak terkendali setiap kali <form action> selesai,
   * termasuk saat login gagal. Password sengaja tidak pernah ikut.
   */
  values?: Partial<Record<AuthEchoField, string>>;
}

const NO_DB: AuthState = {
  error: "Database Supabase belum terhubung. Isi .env.local lalu jalankan schema.sql.",
};

const ECHO_MAX_LENGTH = 120;

function echoFields(
  formData: FormData,
  fields: readonly AuthEchoField[],
): AuthState["values"] {
  return Object.fromEntries(
    fields.map((field) => {
      const value = formData.get(field);
      return [
        field,
        typeof value === "string" ? value.slice(0, ECHO_MAX_LENGTH) : "",
      ];
    }),
  );
}

/** Error pertama dari sekumpulan kuota, atau detik tunggu terpanjang bila habis. */
function rateLimitFailure(
  results: ReadonlyArray<RateLimitResult | null>,
): { error: string } | { retryAfter: number } | null {
  let retryAfter = 0;
  for (const result of results) {
    if (!result) continue;
    if (!result.ok) return { error: result.error };
    if (!result.allowed) retryAfter = Math.max(retryAfter, result.retryAfterSeconds);
  }
  return retryAfter > 0 ? { retryAfter } : null;
}

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
  const state = await setupOwner(formData);
  return { ...state, values: echoFields(formData, ["name", "username"]) };
}

async function setupOwner(formData: FormData): Promise<AuthState> {
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
    .select("id, name, username, role, session_version")
    .single();

  if (error || !data) {
    if (error?.code === "23505") {
      return { error: "Owner sudah dibuat oleh permintaan lain. Silakan login." };
    }
    if (error && isSchemaOutdatedError(error)) {
      return { error: SCHEMA_OUTDATED_MESSAGE };
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

  await startAdminSession(data);
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
  const state = await login(formData);
  return { ...state, values: echoFields(formData, ["username"]) };
}

async function login(formData: FormData): Promise<AuthState> {
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
  // Perangkat yang pernah login sukses tidak ikut kuota per-akun, sehingga
  // serangan tebak password dari luar tidak bisa mengunci pemilik akun.
  const trustedDevice = await isTrustedDeviceFor(normalizedUsername);
  const limits = await Promise.all([
    consumeRateLimit(RATE_LIMITS.loginPair, [
      ...identity,
      normalizedUsername,
    ]),
    trustedDevice
      ? null
      : consumeRateLimit(RATE_LIMITS.loginAccount, [normalizedUsername]),
    consumeRateLimit(RATE_LIMITS.loginIp, identity),
  ]);
  const limited = rateLimitFailure(limits);
  if (limited && "error" in limited) return { error: limited.error };
  if (limited) {
    return {
      error: `Terlalu banyak percobaan login. Coba lagi dalam ${limited.retryAfter} detik.`,
    };
  }

  const supabase = createAdminSupabase();
  const { data: admin, error: lookupError } = await supabase
    .from("admins")
    .select(`${ADMIN_ACCOUNT_COLUMNS}, password_hash`)
    .eq("username", normalizedUsername)
    .maybeSingle();
  if (lookupError) {
    console.error("[auth:login] akun tidak dapat dibaca", {
      code: lookupError.code,
      message: lookupError.message,
    });
    return {
      error: isSchemaOutdatedError(lookupError)
        ? SCHEMA_OUTDATED_MESSAGE
        : "Layanan login sedang bermasalah. Coba lagi sebentar.",
    };
  }

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

  await startAdminSession(admin);

  // Cegah open redirect: hanya izinkan route pengelolaan di bawah profil.
  const next = String(formData.get("next") ?? "");
  redirect(isAdminProfileRoute(next) ? next : "/profil");
}

export async function logoutAction(): Promise<void> {
  await clearSessionCookie();
  redirect("/profil");
}

const accountSchema = z
  .object({
    name: adminNameSchema,
    currentPassword: z
      .string()
      .min(1, "Password saat ini wajib diisi")
      .max(200, "Password tidak valid"),
    newPassword: optionalAdminPasswordSchema,
    confirm: z.string(),
  })
  .refine((d) => d.newPassword === d.confirm, {
    message: "Konfirmasi password baru tidak cocok",
    path: ["confirm"],
  });

/**
 * Ubah nama/password akun sendiri (termasuk owner). Password baru mencabut
 * seluruh sesi lama lewat trigger versi sesi; sesi perangkat ini diterbitkan ulang.
 */
export async function updateOwnAccountAction(
  formData: FormData,
): Promise<ActionResult> {
  const admin = await requireAdmin();
  const parsed = accountSchema.safeParse({
    name: formData.get("name") ?? "",
    currentPassword: formData.get("currentPassword") ?? "",
    newPassword: formData.get("newPassword") ?? "",
    confirm: formData.get("confirm") ?? "",
  });
  if (!parsed.success) {
    return { error: validationErrorMessage(parsed) };
  }

  const limited = rateLimitFailure([
    await consumeRateLimit(RATE_LIMITS.accountUpdate, [admin.id]),
  ]);
  if (limited && "error" in limited) return { error: limited.error };
  if (limited) {
    return {
      error: `Terlalu banyak percobaan. Coba lagi dalam ${limited.retryAfter} detik.`,
    };
  }

  const supabase = createAdminSupabase();
  const credentials = await checkedMutation(
    "admins.load-own-credentials",
    "Gagal memverifikasi akun.",
    supabase
      .from("admins")
      .select("password_hash")
      .eq("id", admin.id)
      .maybeSingle(),
  );
  if (!credentials.ok) return { error: credentials.error };
  const passwordOk = await verifyPassword(
    parsed.data.currentPassword,
    credentials.data.password_hash,
  );
  if (!passwordOk) return { error: "Password saat ini salah." };

  const updated = await checkedMutation(
    "admins.update-own",
    "Gagal menyimpan akun.",
    supabase
      .from("admins")
      .update({
        name: parsed.data.name,
        ...(parsed.data.newPassword
          ? { password_hash: await hashPassword(parsed.data.newPassword) }
          : {}),
      })
      .eq("id", admin.id)
      .select(ADMIN_ACCOUNT_COLUMNS)
      .maybeSingle(),
  );
  if (!updated.ok) return { error: updated.error };

  await startAdminSession(updated.data);
  revalidatePath("/profil");
  revalidatePath("/profil/admin");
  return {};
}
