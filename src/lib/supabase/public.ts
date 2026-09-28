import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/types/database";
import {
  getSupabaseAnonKey,
  getSupabaseUrl,
  hasPublicSupabaseEnv,
} from "./env";

/**
 * Client anon TANPA cookie untuk membaca data publik di server (cacheable).
 * RLS tetap berlaku (hanya data publik yang terbaca). Berbeda dari server.ts
 * (cookie-aware) yang disiapkan bila kelak memakai Supabase Auth.
 */
export function createPublicSupabase() {
  return createClient<Database>(
    getSupabaseUrl(),
    getSupabaseAnonKey(),
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
}

/** True bila env Supabase sudah diisi. Bila belum -> web pakai data demo. */
export function isSupabaseConfigured(): boolean {
  return hasPublicSupabaseEnv();
}
