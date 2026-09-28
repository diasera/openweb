import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/types/database";
import { PUBLIC_MUSIC_TRACK_LIMIT } from "./types";

const PUBLIC_MUSIC_TRACK_COLUMNS =
  "id, title, artist, audio_url, mime_type, duration_seconds, sort_order" as const;

/** Kontrak query playlist yang sama untuk preload server dan refresh browser. */
export function publicMusicTracksQuery(client: SupabaseClient<Database>) {
  return client
    .from("music_tracks")
    .select(PUBLIC_MUSIC_TRACK_COLUMNS)
    .eq("is_active", true)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true })
    .limit(PUBLIC_MUSIC_TRACK_LIMIT);
}
