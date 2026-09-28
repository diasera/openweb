import "server-only";
import { createAdminSupabase } from "@/lib/supabase/admin";
import type { AlbumRow } from "@/lib/types/database";

export type AdminAlbum = AlbumRow & {
  media_count: number;
  event_title: string | null;
};

export type AlbumOption = Pick<AlbumRow, "id" | "title">;

/** Daftar album admin + jumlah media tampil + judul acara terkait. */
export async function getAdminAlbums(): Promise<{
  albums: AdminAlbum[];
  error: { code?: string; message: string } | null;
}> {
  const sb = createAdminSupabase();
  const [albums, summaries, events] = await Promise.all([
    sb.from("albums").select("*").order("created_at", { ascending: false }),
    sb.rpc("album_summaries"),
    sb.from("events").select("id, title"),
  ]);
  if (albums.error) return { albums: [], error: albums.error };
  const counts = new Map(
    (summaries.data ?? []).map((row) => [row.id, Number(row.media_count)]),
  );
  const eventTitles = new Map((events.data ?? []).map((event) => [event.id, event.title]));
  return {
    albums: (albums.data ?? []).map((album) => ({
      ...album,
      media_count: counts.get(album.id) ?? 0,
      event_title: album.event_id ? (eventTitles.get(album.event_id) ?? null) : null,
    })),
    error: null,
  };
}

/** Pilihan album untuk kartu moderasi media; kosong bila tabel belum ada. */
export async function getAdminAlbumOptions(): Promise<AlbumOption[]> {
  const { data } = await createAdminSupabase()
    .from("albums")
    .select("id, title")
    .order("created_at", { ascending: false })
    .limit(100);
  return data ?? [];
}
