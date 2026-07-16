import type { MusicTrackRow } from "@/lib/types/database";

/** Menahan payload root layout tetap kecil walau playlist admin terus tumbuh. */
export const PUBLIC_MUSIC_TRACK_LIMIT = 200;

/** Kolom playlist yang aman dikirim ke browser dan Media Session. */
export type PublicMusicTrack = Pick<
  MusicTrackRow,
  | "id"
  | "title"
  | "artist"
  | "audio_url"
  | "mime_type"
  | "duration_seconds"
  | "sort_order"
>;
