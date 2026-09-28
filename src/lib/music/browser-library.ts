import { createBrowserSupabase } from "@/lib/supabase/client";
import { publicMusicTracksQuery } from "./query";
import type { PublicMusicTrack } from "./types";

/**
 * Loader browser dipisahkan dari provider agar Supabase SDK hanya diunduh
 * ketika playlist perlu dimuat ulang, bukan pada initial bundle publik.
 */
export async function fetchPublicMusicTracks(): Promise<PublicMusicTrack[]> {
  const { data, error } = await publicMusicTracksQuery(
    createBrowserSupabase(),
  );

  if (error) {
    throw new Error(
      "Playlist belum tersedia. Admin perlu menjalankan migrasi musik.",
    );
  }

  return data ?? [];
}
