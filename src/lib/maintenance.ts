import "server-only";
import { DATA_RETENTION_DAYS } from "@/lib/constants";
import { consumeRateLimit, RATE_LIMITS } from "@/lib/security/rate-limit";
import { createAdminSupabase } from "@/lib/supabase/admin";
import { sweepAbandonedUploads } from "@/lib/uploads/sweep";

/** Anonimkan/hapus data teknis kedaluwarsa; paling sering sekali sehari. */
async function applyDataRetention(): Promise<void> {
  try {
    const slot = await consumeRateLimit(RATE_LIMITS.dataRetention, ["global"]);
    if (!slot.ok || !slot.allowed) return;
    const { error } = await createAdminSupabase().rpc("apply_data_retention", {
      p_days: DATA_RETENTION_DAYS,
    });
    if (error) {
      console.warn("[maintenance:retention] gagal", {
        code: error.code,
        message: error.message,
      });
    }
  } catch (error) {
    console.warn("[maintenance:retention] gagal", {
      message: error instanceof Error ? error.message : String(error),
    });
  }
}

/**
 * Satu pintu pemeliharaan terjadwal tanpa cron: dipicu di latar (`after()`)
 * oleh kunjungan dan unggahan, dengan kuota global agar tetap murah.
 */
export async function runScheduledMaintenance(): Promise<void> {
  await Promise.all([sweepAbandonedUploads(), applyDataRetention()]);
}
