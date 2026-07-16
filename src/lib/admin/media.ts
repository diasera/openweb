import "server-only";
import { createAdminSupabase } from "@/lib/supabase/admin";
import type { MediaRow } from "@/lib/types/database";

export type MediaFilter = "pending" | "approved" | "rejected" | "all";

/** Data minimum yang diperlukan halaman edit foto admin. */
export type AdminEditableMedia = Pick<
  MediaRow,
  "id" | "type" | "url" | "title" | "status" | "width" | "height"
>;

/** Ambil media untuk moderasi profil admin (semua kolom, service role). */
export async function getAdminMedia(
  filter: MediaFilter = "pending",
): Promise<MediaRow[]> {
  const sb = createAdminSupabase();
  let q = sb
    .from("media")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(120);
  if (filter !== "all") q = q.eq("status", filter);
  const { data } = await q;
  return data ?? [];
}

/** Ambil satu media tanpa memuat metadata moderasi yang tidak dipakai editor. */
export async function getAdminEditableMedia(
  id: string,
): Promise<AdminEditableMedia | null> {
  const { data, error } = await createAdminSupabase()
    .from("media")
    .select("id, type, url, title, status, width, height")
    .eq("id", id)
    .maybeSingle();

  if (error) {
    console.error("[admin:media-edit] gagal membaca media", {
      code: error.code,
      message: error.message,
    });
    return null;
  }
  return data;
}
