"use server";

import { revalidatePath, updateTag } from "next/cache";
import { z } from "zod";
import { requireFeature } from "@/lib/auth";
import { createAdminSupabase } from "@/lib/supabase/admin";
import { adminFeatureHref, STORAGE_BUCKETS } from "@/lib/constants";
import { checkedMutation } from "@/lib/database/mutation";
import { getStoragePublicUrl, removeStorageObject } from "@/lib/storage";
import { finalizeStoredUpload } from "@/lib/uploads/finalize";
import { verifyUploadTicket } from "@/lib/uploads/ticket";
import { INVALID_INPUT, isValidId } from "@/lib/admin/guard";
import {
  validationErrorMessage,
  type ActionResult,
} from "@/lib/action-result";
import { removeMusicObjectIfUnused } from "@/lib/admin/music";

const createSchema = z.object({
  ticket: z.string().min(1).max(4096),
  title: z.string().trim().min(1, "Judul lagu wajib diisi.").max(120),
  artist: z.string().trim().max(120),
  durationSeconds: z.number().int().min(0).max(86400).nullable(),
  sortOrder: z.number().int().min(-100000).max(100000),
});

const ticketOnlySchema = createSchema.pick({ ticket: true });

/** Objek audio dari tiket yang ditolak dihapus agar tidak menjadi yatim di bucket. */
async function cleanupRejectedMusicUpload(input: unknown, adminId: string) {
  const candidate = ticketOnlySchema.safeParse(input);
  if (!candidate.success) return;
  const ticket = await verifyUploadTicket(candidate.data.ticket);
  if (
    ticket?.kind === "music" &&
    ticket.bucket === STORAGE_BUCKETS.music &&
    ticket.source === "admin" &&
    ticket.adminId === adminId
  ) {
    await removeMusicObjectIfUnused(ticket.path);
  }
}

/** Playlist dibaca root layout (pemutar global) lewat tag cache "music". */
function refreshMusic() {
  updateTag("music");
  revalidatePath(adminFeatureHref("music"));
  revalidatePath("/", "layout");
}

export async function finalizeMusicUpload(
  input: z.input<typeof createSchema>,
): Promise<ActionResult> {
  const admin = await requireFeature("music");
  const parsed = createSchema.safeParse(input);
  if (!parsed.success) {
    await cleanupRejectedMusicUpload(input, admin.id);
    return { error: validationErrorMessage(parsed, "Data lagu tidak valid.") };
  }
  const finalized = await finalizeStoredUpload({
    token: parsed.data.ticket,
    kind: "music",
    bucket: STORAGE_BUCKETS.music,
    acceptTicket: (ticket) => ticket.source === "admin" && ticket.adminId === admin.id,
    cleanup: async (ticket) => removeMusicObjectIfUnused(ticket.path),
  });
  if (!finalized.ok) {
    if (finalized.reason === "invalid-ticket") {
      return { error: "Tiket unggahan audio tidak valid." };
    }
    if (finalized.reason === "invalid-descriptor") {
      return { error: finalized.policy.ok ? "File audio tidak valid." : finalized.policy.error };
    }
    return {
      error:
        finalized.reason === "stored-invalid"
          ? "Unggahan audio belum lengkap atau formatnya berubah. Silakan coba lagi."
          : "Penyimpanan belum dapat memverifikasi audio. Coba finalisasi lagi.",
    };
  }

  const saved = await checkedMutation(
    "music.create",
    "Gagal menyimpan lagu.",
    createAdminSupabase()
      .from("music_tracks")
      .insert({
        title: parsed.data.title,
        artist: parsed.data.artist || null,
        audio_url: getStoragePublicUrl(finalized.ticket.bucket, finalized.ticket.path),
        mime_type: finalized.mimeType,
        storage_path: finalized.ticket.path,
        duration_seconds: parsed.data.durationSeconds,
        sort_order: parsed.data.sortOrder,
        is_active: true,
        created_by: admin.id,
      })
      .select("id")
      .maybeSingle(),
    { duplicateMessage: "Tiket unggahan audio ini sudah digunakan." },
  );
  if (!saved.ok) {
    await removeMusicObjectIfUnused(finalized.ticket.path);
    return { error: saved.error };
  }
  refreshMusic();
  return {};
}

export async function toggleMusicTrack(id: string): Promise<ActionResult> {
  await requireFeature("music");
  if (!isValidId(id)) return INVALID_INPUT;
  const sb = createAdminSupabase();
  const current = await checkedMutation(
    "music.load-toggle",
    "Gagal membaca lagu.",
    sb.from("music_tracks").select("id, is_active").eq("id", id).maybeSingle(),
  );
  if (!current.ok) return { error: current.error };
  const saved = await checkedMutation(
    "music.toggle",
    "Gagal mengubah status lagu.",
    sb
      .from("music_tracks")
      .update({ is_active: !current.data.is_active })
      .eq("id", id)
      .select("id")
      .maybeSingle(),
  );
  if (!saved.ok) return { error: saved.error };
  refreshMusic();
  return {};
}

export async function moveMusicTrack(id: string, delta: -1 | 1): Promise<ActionResult> {
  await requireFeature("music");
  if (!isValidId(id) || (delta !== -1 && delta !== 1)) return INVALID_INPUT;
  const sb = createAdminSupabase();
  const { data: tracks, error } = await sb
    .from("music_tracks")
    .select("id, sort_order")
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });
  if (error) return { error: "Gagal membaca urutan lagu." };
  const ordered = [...(tracks ?? [])];
  const currentIndex = ordered.findIndex((track) => track.id === id);
  const targetIndex = currentIndex + delta;
  if (currentIndex < 0 || targetIndex < 0 || targetIndex >= ordered.length) return {};
  [ordered[currentIndex], ordered[targetIndex]] = [ordered[targetIndex]!, ordered[currentIndex]!];

  // Hanya baris yang posisinya berubah. Setelah urutan pernah dinormalisasi
  // ke 0..n-1, satu langkah geser cukup menulis dua baris, bukan seluruhnya.
  for (const [index, track] of ordered.entries()) {
    if (track.sort_order === index) continue;
    const saved = await checkedMutation(
      "music.order",
      "Gagal mengubah urutan lagu.",
      sb.from("music_tracks").update({ sort_order: index }).eq("id", track.id).select("id").maybeSingle(),
    );
    if (!saved.ok) return { error: saved.error };
  }
  refreshMusic();
  return {};
}

export async function deleteMusicTrack(id: string): Promise<ActionResult> {
  await requireFeature("music");
  if (!isValidId(id)) return INVALID_INPUT;
  const sb = createAdminSupabase();
  const current = await checkedMutation(
    "music.load-delete",
    "Gagal membaca lagu.",
    sb.from("music_tracks").select("id, storage_path").eq("id", id).maybeSingle(),
  );
  if (!current.ok) return { error: current.error };
  const deleted = await checkedMutation(
    "music.delete",
    "Gagal menghapus lagu.",
    sb.from("music_tracks").delete().eq("id", id).select("id").maybeSingle(),
  );
  if (!deleted.ok) return { error: deleted.error };
  await removeStorageObject(STORAGE_BUCKETS.music, current.data.storage_path);
  refreshMusic();
  return {};
}
