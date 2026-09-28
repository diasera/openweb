import "server-only";
import { createClient } from "@supabase/supabase-js";
import { requiredEnv } from "@/lib/env";
import type { Database } from "@/lib/types/database";
import { getSupabaseUrl } from "./env";

/**
 * Supabase client dengan SERVICE ROLE KEY. MELEWATI RLS — akses penuh.
 * WAJIB hanya dipakai di server (route handler / server action) SETELAH
 * sesi owner/admin diverifikasi, atau untuk aksi publik tervalidasi
 * (upload pending, kirim pesan, tracking pengunjung).
 *
 * "server-only" memastikan modul ini gagal build bila tak sengaja diimpor client.
 */
export function createAdminSupabase() {
  return createClient<Database>(
    getSupabaseUrl(),
    requiredEnv(
      "SUPABASE_SERVICE_ROLE_KEY",
      process.env.SUPABASE_SERVICE_ROLE_KEY,
    ),
    {
      auth: { persistSession: false, autoRefreshToken: false },
    },
  );
}
