import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "@/lib/types/database";
import { getSupabaseAnonKey, getSupabaseUrl } from "./env";

/**
 * Supabase client untuk komponen browser ("use client").
 * Memakai anon key -> hanya bisa membaca data publik sesuai RLS
 * (media approved, anggota, blog published, notifikasi, site_settings).
 */
export function createBrowserSupabase() {
  return createBrowserClient<Database>(
    getSupabaseUrl(),
    getSupabaseAnonKey(),
  );
}
