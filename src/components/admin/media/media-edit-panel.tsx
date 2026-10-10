"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ImageIcon, LoaderCircle, Pencil, RotateCcw } from "lucide-react";
import {
  PhotoEditor,
  type PhotoEditorResult,
} from "@/components/media-editor";
import { Button } from "@/components/ui/button";
import { cardClass } from "@/components/ui/card";
import { useToast } from "@/components/ui/toast";
import { postJson } from "@/lib/api/client";
import { adminFeatureHref } from "@/lib/constants";
import { canEditPhoto, readPhotoDimensions } from "@/lib/media-editor";
import { prepareRemoteImage } from "@/lib/media-formats";
import type { AdminEditableMedia } from "@/lib/admin/media";
import {
  requestSignedUpload,
  uploadFileDirectly,
} from "@/lib/uploads/client";
import { StatusBadge } from "../admin-list";

interface WorkingPhoto {
  file: File;
  sourceDimensions: { width: number; height: number } | null;
}

const MEDIA_LIST_HREF = adminFeatureHref("media");
const STATUS_LABEL = { pending: "Menunggu", approved: "Terbit", rejected: "Ditolak" } as const;

async function downloadMediaFile(
  media: Pick<AdminEditableMedia, "id" | "url">,
  signal: AbortSignal,
): Promise<WorkingPhoto> {
  const prepared = await prepareRemoteImage(media.url, {
    signal,
    fallbackName: `edit-${media.id}`,
    errorMessage: "Foto asli tidak dapat dimuat.",
  });
  if (!canEditPhoto(prepared.file) || prepared.animated) {
    throw new Error(
      "Media animasi dipertahankan seperti aslinya dan tidak dapat diedit sebagai foto statis.",
    );
  }
  return {
    file: prepared.file,
    sourceDimensions: await readPhotoDimensions(prepared.file, signal),
  };
}

/**
 * Orkestrator edit foto pin yang sudah ada: unduh asli, buka PhotoEditor
 * bersama, unggah hasil lewat signed URL, lalu finalisasi di
 * /api/media/[id]/edit. Status moderasi tidak berubah.
 */
export function MediaEditPanel({ media }: { media: AdminEditableMedia }) {
  const router = useRouter();
  const { toast } = useToast();
  const [workingPhoto, setWorkingPhoto] = useState<WorkingPhoto | null>(null);
  const [loadAttempt, setLoadAttempt] = useState(0);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [editorOpen, setEditorOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [progress, setProgress] = useState(0);
  const savingRef = useRef(false);

  // Bergantung pada id/url, bukan identitas objek `media`: prop baru dari
  // server (mis. router.refresh) tidak boleh mengunduh ulang dan mereset
  // sesi editor yang sedang berjalan.
  useEffect(() => {
    const controller = new AbortController();
    downloadMediaFile({ id: media.id, url: media.url }, controller.signal)
      .then((nextPhoto) => {
        if (controller.signal.aborted) return;
        setLoadError(null);
        setWorkingPhoto(nextPhoto);
        setEditorOpen(true);
      })
      .catch((error) => {
        if (controller.signal.aborted) return;
        setLoadError(error instanceof Error ? error.message : "Foto asli gagal dimuat.");
      });
    return () => controller.abort();
  }, [loadAttempt, media.id, media.url]);

  const save = useCallback(
    async (result: PhotoEditorResult) => {
      if (savingRef.current) return;
      savingRef.current = true;
      setEditorOpen(false);
      setWorkingPhoto({
        file: result.file,
        sourceDimensions: { width: result.width, height: result.height },
      });
      setSaving(true);
      setProgress(0);
      const noticeId = toast.loading("Mengunggah hasil edit…");

      try {
        const signed = await requestSignedUpload("media", result.file);
        await uploadFileDirectly(result.file, signed, ({ percentage }) => {
          setProgress(percentage);
        });
        await postJson(
          `/api/media/${encodeURIComponent(media.id)}/edit`,
          { ticket: signed.ticket, width: result.width, height: result.height },
          "Hasil edit gagal disimpan.",
        );
        toast.dismiss(noticeId);
        toast.success("Foto berhasil diperbarui.");
        router.push(MEDIA_LIST_HREF);
        router.refresh();
      } catch (error) {
        toast.dismiss(noticeId);
        toast.error(error instanceof Error ? error.message : "Hasil edit gagal disimpan.");
        setEditorOpen(true);
      } finally {
        savingRef.current = false;
        setSaving(false);
      }
    },
    [media.id, router, toast],
  );

  const busy = saving || (!workingPhoto && !loadError);

  return (
    <>
      <section className={cardClass("elevated", "aurora relative overflow-hidden p-5 sm:p-6")}>
        <div className="flex items-start gap-4">
          <span className="bg-primary/10 text-primary-readable grid size-12 shrink-0 place-items-center rounded-2xl">
            {busy ? (
              <LoaderCircle className="size-6 animate-spin" aria-hidden="true" />
            ) : (
              <ImageIcon className="size-6" aria-hidden="true" />
            )}
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <p className="truncate font-semibold">{media.title || "Foto tanpa judul"}</p>
              <StatusBadge>{STATUS_LABEL[media.status]}</StatusBadge>
            </div>
            <p className="text-muted mt-1 text-sm" role="status">
              {saving
                ? `Mengunggah hasil edit ${progress}%`
                : loadError
                  ? loadError
                  : workingPhoto
                    ? "Editor foto siap. Status moderasi tidak berubah."
                    : "Menyiapkan foto asli…"}
            </p>
          </div>
        </div>

        {saving && (
          <div
            className="bg-surface-2 mt-5 h-1.5 overflow-hidden rounded-full"
            role="progressbar"
            aria-label="Progres unggah hasil edit"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={progress}
          >
            <div
              className="bg-primary h-full rounded-full transition-[width] duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        )}

        <div className="mt-5 flex flex-wrap gap-2">
          {loadError ? (
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setWorkingPhoto(null);
                setLoadError(null);
                setEditorOpen(false);
                setLoadAttempt((attempt) => attempt + 1);
              }}
            >
              <RotateCcw className="size-4" aria-hidden="true" />
              Coba lagi
            </Button>
          ) : (
            workingPhoto &&
            !saving &&
            !editorOpen && (
              <Button size="sm" onClick={() => setEditorOpen(true)}>
                <Pencil className="size-4" aria-hidden="true" />
                Buka editor
              </Button>
            )
          )}
          <Button
            variant="ghost"
            size="sm"
            disabled={saving}
            onClick={() => router.push(MEDIA_LIST_HREF)}
          >
            Kembali ke Media
          </Button>
        </div>
      </section>

      <PhotoEditor
        open={editorOpen}
        file={workingPhoto?.file ?? null}
        sourceDimensions={workingPhoto?.sourceDimensions ?? null}
        onCancel={() => setEditorOpen(false)}
        onSave={save}
      />
    </>
  );
}
