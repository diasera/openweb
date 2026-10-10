"use client";

import { useRef, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowDown,
  ArrowUp,
  AudioLines,
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
import { Button } from "@/components/ui/button";
import { cardClass } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { fieldClass } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";
import { getActionError } from "@/lib/action-result";
import { AUDIO_UPLOAD_ACCEPT, AUDIO_UPLOAD_HELP } from "@/lib/constants";
import { prepareAudioFile, probePlayableMedia } from "@/lib/media-formats";
import { requestSignedUpload, uploadFileDirectly } from "@/lib/uploads/client";
import type { MusicTrackRow } from "@/lib/types/database";
import { formatClock } from "@/lib/utils/time";
import { cn } from "@/lib/utils/cn";
import { AdminList, AdminRow, StatusBadge } from "../admin-list";
import { DeleteAction, IconAction } from "../admin-actions";
import { TextField } from "../form-controls";
import { TrackDialog } from "./track-dialog";

/** Judul awal dari nama berkas: "01 - lagu_kita.mp3" -> "01 - lagu kita". */
function titleFromFile(file: File) {
  return file.name.replace(/\.[^.]+$/, "").replace(/[_]+/g, " ").trim().slice(0, 120);
}

/**
 * Playlist website: unggah audio langsung ke Storage (signed URL/TUS, tidak
 * lewat server aplikasi) dengan progres, lalu kelola judul/artis, urutan,
 * dan visibilitas.
 */
export function MusicManager({ tracks }: { tracks: MusicTrackRow[] }) {
  const router = useRouter();
  const { toast } = useToast();
  const formRef = useRef<HTMLFormElement>(null);
  const titleRef = useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
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
      await uploadFileDirectly(prepared.file, signed, ({ percentage }) => setProgress(percentage));
      const error = getActionError(
        await finalizeMusicUpload({
          ticket: signed.ticket,
          title,
          artist: form.get("artist")?.toString().trim() ?? "",
          durationSeconds: metadata.duration === null ? null : Math.round(metadata.duration),
          sortOrder: tracks.length,
        }),
      );
      if (error) throw new Error(error);
      toast.success("Lagu ditambahkan ke playlist.");
      formRef.current?.reset();
      setFileName(null);
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Gagal mengunggah lagu.");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="space-y-8">
      <section aria-labelledby="music-upload" className={cardClass("elevated", "aurora relative overflow-hidden p-5")}>
        <h2 id="music-upload" className="font-display text-lg font-bold">
          Tambah lagu
        </h2>
        <p className="text-muted mt-0.5 text-sm">{AUDIO_UPLOAD_HELP}</p>
        <form ref={formRef} onSubmit={onSubmit} className="mt-4 space-y-4">
          <label
            className={fieldClass(
              "within",
              cn(
                "flex cursor-pointer items-center gap-3 rounded-2xl border-dashed p-3",
                uploading && "pointer-events-none opacity-60",
              ),
            )}
          >
            <span className="bg-tone-red/12 text-tone-red-text grid size-11 shrink-0 place-items-center rounded-xl">
              <AudioLines className="size-5" aria-hidden="true" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-semibold">
                {fileName ?? "Pilih file audio"}
              </span>
              <span className="text-muted block text-caption1">
                Diunggah langsung ke penyimpanan, tanpa melewati server.
              </span>
            </span>
            <input
              name="audio"
              type="file"
              accept={AUDIO_UPLOAD_ACCEPT}
              disabled={uploading}
              className="sr-only"
              onChange={(event) => {
                const file = event.currentTarget.files?.[0];
                setFileName(file?.name ?? null);
                if (file && titleRef.current && !titleRef.current.value.trim()) {
                  titleRef.current.value = titleFromFile(file);
                }
              }}
            />
          </label>
          <div className="grid gap-4 sm:grid-cols-2">
            <TextField ref={titleRef} label="Judul lagu" id="music-title" name="title" maxLength={120} required />
            <TextField label="Artis / pencipta" id="music-artist" name="artist" maxLength={120} />
          </div>
          {uploading && (
            <div
              className="bg-surface-2 h-1.5 overflow-hidden rounded-full"
              role="progressbar"
              aria-label="Progres unggah audio"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={progress}
            >
              <div className="bg-primary h-full rounded-full transition-[width] duration-300" style={{ width: `${progress}%` }} />
            </div>
          )}
          <Button
            type="submit"
            className="w-full sm:w-auto"
            pending={uploading}
            icon={<Upload className="size-4" aria-hidden="true" />}
          >
            {uploading ? `Mengunggah ${progress}%` : "Tambah ke playlist"}
          </Button>
        </form>
      </section>

      <section aria-labelledby="music-playlist">
        <h2 id="music-playlist" className="font-display mb-3 text-lg font-bold">
          Playlist · {tracks.length} lagu
        </h2>
        {tracks.length === 0 ? (
          <EmptyState
            icon={<Music2 className="size-8" />}
            title="Belum ada lagu"
            description="Unggah lagu pertama; pengunjung bisa memutarnya dari Dynamic Island."
          />
        ) : (
          <AdminList label="Playlist">
            {tracks.map((track, index) => (
              <AdminRow
                key={track.id}
                index={index}
                leading={
                  <span className="bg-tone-red/12 text-tone-red-text grid size-11 place-items-center rounded-xl font-display text-sm font-bold tabular-nums">
                    {index + 1}
                  </span>
                }
                title={track.title}
                badges={!track.is_active ? <StatusBadge tone="outline">Disembunyikan</StatusBadge> : undefined}
                meta={`${track.artist || "Tanpa nama artis"} · ${
                  track.duration_seconds === null ? "Durasi otomatis" : formatClock(track.duration_seconds)
                }`}
                actions={
                  <>
                    <IconAction
                      label="Geser ke atas"
                      icon={<ArrowUp />}
                      disabled={index === 0}
                      action={() => moveMusicTrack(track.id, -1)}
                    />
                    <IconAction
                      label="Geser ke bawah"
                      icon={<ArrowDown />}
                      disabled={index === tracks.length - 1}
                      action={() => moveMusicTrack(track.id, 1)}
                    />
                    <TrackDialog track={track} />
                    <IconAction
                      label={track.is_active ? "Sembunyikan dari pengunjung" : "Tampilkan ke pengunjung"}
                      icon={track.is_active ? <Eye /> : <EyeOff />}
                      tone={track.is_active ? "neutral" : "primary"}
                      action={() => toggleMusicTrack(track.id)}
                      successMessage={track.is_active ? "Lagu disembunyikan" : "Lagu ditampilkan"}
                    />
                    <DeleteAction
                      action={deleteMusicTrack}
                      id={track.id}
                      title={`Hapus “${track.title}”?`}
                      message="Berkas audio ikut dihapus dari penyimpanan."
                      successMessage="Lagu dihapus"
                    />
                  </>
                }
              />
            ))}
          </AdminList>
        )}
      </section>
    </div>
  );
}
