import "server-only";
import { createAdminSupabase } from "@/lib/supabase/admin";
import type { MusicTrackRow } from "@/lib/types/database";
import { isMissingRelationError } from "@/lib/database/errors";
import { STORAGE_BUCKETS } from "@/lib/constants";
import { removeStorageObject } from "@/lib/storage";

export async function getAdminMusicTracks(): Promise<MusicTrackRow[]> {
  const { data, error } = await createAdminSupabase()
    .from("music_tracks")
    .select("*")
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });
  if (error) {
    if (!isMissingRelationError(error)) {
      console.error("[music:list] gagal membaca playlist", {
        code: error.code,
        message: error.message,
      });
    }
    return [];
  }
  return data ?? [];
}

/** Replay finalize tidak boleh menghapus objek yang sudah dipakai track aktif. */
export async function removeMusicObjectIfUnused(path: string): Promise<void> {
  const { data, error } = await createAdminSupabase()
    .from("music_tracks")
    .select("id")
    .eq("storage_path", path)
    .limit(1);
  if (error) {
    console.warn("[music:cleanup] status referensi objek tidak diketahui", {
      code: error.code,
      message: error.message,
    });
    return;
  }
  if ((data ?? []).length > 0) return;
  await removeStorageObject(STORAGE_BUCKETS.music, path);
}
