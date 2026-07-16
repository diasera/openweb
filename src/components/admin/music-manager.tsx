"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowDown,
  ArrowUp,
  Eye,
  EyeOff,
  Music2,
  Upload,
} from "lucide-react";
import {
  deleteMusicTrack,
  finalizeMusicUpload,
  moveMusicTrack,
  toggleMusicTrack,
} from "@/app/profil/(admin)/music/actions";
import { AdminActionButton } from "@/components/admin/admin-action-button";
import { DeleteButton } from "@/components/admin/confirmed-action-button";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";
import { getActionError } from "@/lib/action-result";
import { AUDIO_UPLOAD_ACCEPT, AUDIO_UPLOAD_HELP } from "@/lib/constants";
import { prepareAudioFile, probePlayableMedia } from "@/lib/media-formats";
import {
  requestSignedUpload,
  uploadFileDirectly,
} from "@/lib/uploads/client";
import type { MusicTrackRow } from "@/lib/types/database";

function formatDuration(seconds: number | null) {
  if (seconds === null) return "Durasi otomatis";
  const minutes = Math.floor(seconds / 60);
  return `${minutes}:${String(seconds % 60).padStart(2, "0")}`;
}

export function MusicManager({ tracks }: { tracks: MusicTrackRow[] }) {
  const router = useRouter();
  const { toast } = useToast();
  const formRef = useRef<HTMLFormElement>(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const file = form.get("audio");
    const title = form.get("title")?.toString().trim() ?? "";
    if (!(file instanceof File) || file.size === 0) {
      toast.error("Pilih file audio terlebih dahulu.");
      return;
    }
    if (!title) {
      toast.error("Judul lagu wajib diisi.");
      return;
    }

    setUploading(true);
    setProgress(0);
    try {
      const prepared = await prepareAudioFile(file);
      const [signed, metadata] = await Promise.all([
        requestSignedUpload("music", prepared.file),
        probePlayableMedia(prepared.file, "audio"),
      ]);
      await uploadFileDirectly(prepared.file, signed, ({ percentage }) => {
        setProgress(percentage);
      });
      const result = await finalizeMusicUpload({
        ticket: signed.ticket,
        title,
        artist: form.get("artist")?.toString().trim() ?? "",
        durationSeconds:
          metadata.duration === null ? null : Math.round(metadata.duration),
        sortOrder: Number(form.get("sort_order")) || 0,
      });
      const error = getActionError(result);
      if (error) throw new Error(error);
      toast.success("Lagu ditambahkan ke playlist.");
      formRef.current?.reset();
      setProgress(100);
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Gagal mengunggah lagu.");
    } finally {
      setUploading(false);
    }
  }

  return (
    <section className="mt-6 space-y-4" aria-labelledby="playlist-heading">
      <div>
        <h2 id="playlist-heading" className="font-display text-xl font-bold">
          Playlist Dynamic Island
        </h2>
        <p className="text-muted mt-1 text-sm">
          Audio aktif tersedia sebagai playlist opsional untuk pengunjung.
        </p>
      </div>

      <Card className="p-4">
        <form ref={formRef} onSubmit={onSubmit} className="space-y-4">
          <Field
            label="File audio"
            htmlFor="music-audio"
            hint={AUDIO_UPLOAD_HELP}
          >
            <Input
              id="music-audio"
              name="audio"
              type="file"
              accept={AUDIO_UPLOAD_ACCEPT}
              disabled={uploading}
            />
          </Field>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Judul lagu" htmlFor="music-title">
              <Input id="music-title" name="title" maxLength={120} required />
            </Field>
            <Field label="Artis / pencipta" htmlFor="music-artist">
              <Input id="music-artist" name="artist" maxLength={120} />
            </Field>
          </div>
          <Field label="Urutan" htmlFor="music-order">
            <Input
              id="music-order"
              name="sort_order"
              type="number"
              defaultValue={tracks.length}
            />
          </Field>
          <Button type="submit" className="w-full" disabled={uploading}>
            {uploading ? (
              <>
                <Upload className="h-4 w-4" /> Mengunggah {progress}%
              </>
            ) : (
              <>
                <Music2 className="h-4 w-4" /> Tambah ke playlist
              </>
            )}
          </Button>
        </form>
      </Card>

      <div className="space-y-2">
        {tracks.length === 0 ? (
          <Card className="text-muted p-5 text-center text-sm">
            Belum ada lagu. Jalankan migrasi Supabase lalu unggah lagu pertama.
          </Card>
        ) : (
          tracks.map((track, index) => (
            <Card key={track.id} className="flex items-center gap-3 p-3">
              <span className="bg-primary/10 text-primary-readable grid h-11 w-11 shrink-0 place-items-center rounded-xl">
                <Music2 className="h-5 w-5" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate font-semibold">{track.title}</p>
                <p className="text-muted truncate text-xs">
                  {track.artist || "Tanpa nama artis"} · {formatDuration(track.duration_seconds)}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-1">
                <AdminActionButton
                  action={() => moveMusicTrack(track.id, -1)}
                  successMessage="Lagu digeser ke atas"
                  disabled={index === 0}
                  variant="ghost"
                  size="sm"
                  className="h-9 w-9 p-0"
                  aria-label="Geser ke atas"
                  title="Geser ke atas"
                >
                  <ArrowUp className="h-4 w-4" />
                </AdminActionButton>
                <AdminActionButton
                  action={() => moveMusicTrack(track.id, 1)}
                  successMessage="Lagu digeser ke bawah"
                  disabled={index === tracks.length - 1}
                  variant="ghost"
                  size="sm"
                  className="h-9 w-9 p-0"
                  aria-label="Geser ke bawah"
                  title="Geser ke bawah"
                >
                  <ArrowDown className="h-4 w-4" />
                </AdminActionButton>
                <AdminActionButton
                  action={() => toggleMusicTrack(track.id)}
                  successMessage={track.is_active ? "Lagu dinonaktifkan" : "Lagu diaktifkan"}
                  variant="ghost"
                  size="sm"
                  className="h-9 w-9 p-0"
                  aria-label={track.is_active ? "Nonaktifkan lagu" : "Aktifkan lagu"}
                  title={track.is_active ? "Nonaktifkan lagu" : "Aktifkan lagu"}
                >
                  {track.is_active ? (
                    <Eye className="h-4 w-4" />
                  ) : (
                    <EyeOff className="h-4 w-4" />
                  )}
                </AdminActionButton>
                <DeleteButton
                  action={deleteMusicTrack}
                  id={track.id}
                  message={`Hapus “${track.title}” dari playlist?`}
                  successMessage="Lagu dihapus"
                />
              </div>
            </Card>
          ))
        )}
      </div>
    </section>
  );
}
