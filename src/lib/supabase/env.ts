import { isEnvConfigured, requiredEnv } from "@/lib/env";

export function getSupabaseUrl(): string {
  return requiredEnv(
    "NEXT_PUBLIC_SUPABASE_URL",
    process.env.NEXT_PUBLIC_SUPABASE_URL,
  );
}

export function getSupabaseAnonKey(): string {
  return requiredEnv(
    "NEXT_PUBLIC_SUPABASE_ANON_KEY",
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  );
}

export function hasPublicSupabaseEnv(): boolean {
  return (
    isEnvConfigured(process.env.NEXT_PUBLIC_SUPABASE_URL) &&
    isEnvConfigured(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)
  );
}
