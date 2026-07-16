import "server-only";
import { unstable_cache } from "next/cache";
import { createPublicSupabase, isSupabaseConfigured } from "@/lib/supabase/public";
import { publicMusicTracksQuery } from "@/lib/music/query";
import type { PublicMusicTrack } from "@/lib/music/types";

/** Playlist kecil dipraisi di root agar tap pertama tetap punya user activation iOS. */
export const getPublicMusicTracks = unstable_cache(
  async (): Promise<PublicMusicTrack[]> => {
    if (!isSupabaseConfigured()) return [];
    const { data, error } = await publicMusicTracksQuery(
      createPublicSupabase(),
    );
    return error ? [] : data ?? [];
  },
  ["public-music-tracks"],
  { revalidate: 30, tags: ["music"] },
);
