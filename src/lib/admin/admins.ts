import "server-only";
import { ADMIN_ACCOUNT_COLUMNS } from "@/lib/auth";
import { createAdminSupabase } from "@/lib/supabase/admin";
import type { AdminAccount } from "@/lib/types/database";

/** Daftar akun pengelola untuk area profil admin (tanpa hash password). */
export async function getAdmins(): Promise<AdminAccount[]> {
  const sb = createAdminSupabase();
  const { data } = await sb
    .from("admins")
    .select(ADMIN_ACCOUNT_COLUMNS)
    .order("role", { ascending: true })
    .order("created_at", { ascending: true });
  return data ?? [];
}
