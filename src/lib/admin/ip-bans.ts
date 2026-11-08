import "server-only";
import { createAdminSupabase } from "@/lib/supabase/admin";
import { checkedDatabaseCall } from "@/lib/database/mutation";
import type { ActionResult } from "@/lib/action-result";

type AdminSupabase = ReturnType<typeof createAdminSupabase>;

/** Ambil status blokir beberapa IP dalam satu query untuk daftar admin. */
export async function getBlockedIpSet(
  sb: AdminSupabase,
  ips: Array<string | null>,
): Promise<Set<string>> {
  const uniqueIps = [...new Set(ips.filter((ip): ip is string => Boolean(ip)))];
  if (uniqueIps.length === 0) return new Set();

  const { data, error } = await sb
    .from("banned_ips")
    .select("ip_address")
    .in("ip_address", uniqueIps);
  if (error) throw new Error("Gagal membaca status blokir IP");
  return new Set((data ?? []).map((row) => row.ip_address));
}

/** Satu mutasi pusat untuk blokir maupun membuka blokir interaksi publik. */
export async function setIpBlocked(
  sb: AdminSupabase,
  input: {
    ip: string;
    blocked: boolean;
    reason: string;
    createdBy: string;
  },
): Promise<ActionResult> {
  const operation = input.blocked
    ? sb.from("banned_ips").upsert(
        {
          ip_address: input.ip,
          reason: input.reason,
          created_by: input.createdBy,
        },
        { onConflict: "ip_address" },
      )
    : sb.from("banned_ips").delete().eq("ip_address", input.ip);

  const checked = await checkedDatabaseCall(
    input.blocked ? "ip.block" : "ip.unblock",
    input.blocked ? "Gagal memblokir IP." : "Gagal membuka blokir IP.",
    operation,
  );
  return checked.ok ? {} : { error: checked.error };
}
