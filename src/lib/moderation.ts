import "server-only";
import { createAdminSupabase } from "@/lib/supabase/admin";
import { getClientIp } from "@/lib/utils/request";
import {
  consumeRateLimit,
  requestRateLimitIdentity,
  type RateLimitPolicy,
} from "@/lib/security/rate-limit";

async function getIpBanState(
  ip: string | null,
): Promise<{ blocked: boolean; error?: string }> {
  if (!ip) return { blocked: false };
  const sb = createAdminSupabase();
  const { data, error } = await sb
    .from("banned_ips")
    .select("id")
    .eq("ip_address", ip)
    .maybeSingle();
  if (error) {
    console.error("[moderation:ip-ban] gagal memeriksa blokir", {
      code: error.code,
      message: error.message,
    });
    // Mutasi publik harus fail-closed saat status blokir tidak dapat dipastikan.
    return {
      blocked: true,
      error: "Layanan moderasi sedang bermasalah. Coba lagi sebentar.",
    };
  }
  return { blocked: Boolean(data) };
}

/**
 * Satu gerbang untuk seluruh aksi tulis publik. Status blokir tidak pernah
 * dipakai saat membaca halaman atau mencatat kunjungan.
 */
export async function getPublicInteractionAccess(
  headers: Headers,
  ratePolicy?: RateLimitPolicy,
) {
  const ip = getClientIp(headers);
  const [banState, rateLimit] = await Promise.all([
    getIpBanState(ip),
    ratePolicy
      ? consumeRateLimit(ratePolicy, requestRateLimitIdentity(headers))
      : Promise.resolve(null),
  ]);
  return { ip, ...banState, rateLimit };
}
