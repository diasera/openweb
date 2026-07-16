import "server-only";
import { createAdminSupabase } from "@/lib/supabase/admin";
import type { AdminRow } from "@/lib/types/database";

/** Daftar akun pengelola untuk area profil admin. */
export async function getAdmins(): Promise<AdminRow[]> {
  const sb = createAdminSupabase();
  const { data } = await sb
    .from("admins")
    .select("*")
    .order("role", { ascending: true })
    .order("created_at", { ascending: true });
  return data ?? [];
}
