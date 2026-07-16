"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ImageIcon, LoaderCircle, RotateCcw } from "lucide-react";
import {
  PhotoEditor,
  type PhotoEditorResult,
} from "@/components/media-editor";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useToast } from "@/components/ui/toast";
import { postJson } from "@/lib/api/client";
import { canEditPhoto, readPhotoDimensions } from "@/lib/media-editor";
import { prepareImageFile } from "@/lib/media-formats";
import type { MediaRow } from "@/lib/types/database";
import {
  requestSignedUpload,
  uploadFileDirectly,
} from "@/lib/uploads/client";

type EditableMedia = Pick<
  MediaRow,
  "id" | "url" | "title" | "status" | "width" | "height"
>;

interface WorkingPhoto {
  file: File;
  sourceDimensions: { width: number; height: number } | null;
}

async function downloadMediaFile(media: EditableMedia, signal: AbortSignal) {
  const response = await fetch(media.url, {
    cache: "no-store",
    credentials: "omit",
    signal,
  });
  if (!response.ok) throw new Error("Foto asli tidak dapat dimuat.");

  const blob = await response.blob();
  if (blob.type && !blob.type.startsWith("image/")) {
    throw new Error("File media bukan foto yang dapat diedit.");
  }
  const sourceName =
    new URL(media.url, window.location.href).pathname.split("/").pop() ??
    `edit-${media.id}`;
  const sourceFile = new File(
    [blob],
    sourceName,
    { type: blob.type, lastModified: Date.now() },
  );
  const prepared = await prepareImageFile(sourceFile, signal);
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

/** Orkestrator tipis: editor visual tetap dimiliki PhotoEditor bersama. */
export function MediaEditPage({ media }: { media: EditableMedia }) {
  const router = useRouter();
  const { toast } = useToast();
  const [workingPhoto, setWorkingPhoto] = useState<WorkingPhoto | null>(null);
  const [loadAttempt, setLoadAttempt] = useState(0);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [editorOpen, setEditorOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [progress, setProgress] = useState(0);
  const savingRef = useRef(false);

  useEffect(() => {
    const controller = new AbortController();

    downloadMediaFile(media, controller.signal)
      .then((nextPhoto) => {
        if (controller.signal.aborted) return;
        setLoadError(null);
        setWorkingPhoto(nextPhoto);
        setEditorOpen(true);
      })
      .catch((error) => {
        if (controller.signal.aborted) return;
        setLoadError(
          error instanceof Error ? error.message : "Foto asli gagal dimuat.",
        );
      });

    return () => controller.abort();
  }, [loadAttempt, media]);

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
          {
            ticket: signed.ticket,
            width: result.width,
            height: result.height,
          },
          "Hasil edit gagal disimpan.",
        );

        toast.dismiss(noticeId);
        toast.success("Foto berhasil diperbarui.");
        router.push("/profil/media");
        router.refresh();
      } catch (error) {
        toast.dismiss(noticeId);
        toast.error(
          error instanceof Error ? error.message : "Hasil edit gagal disimpan.",
        );
        setEditorOpen(true);
      } finally {
        savingRef.current = false;
        setSaving(false);
      }
    },
    [media.id, router, toast],
  );

  return (
    <>
      <Card className="p-5">
        <div className="flex items-start gap-3">
          <span className="bg-primary/10 text-primary-readable grid h-11 w-11 shrink-0 place-items-center rounded-xl">
            {saving || (!workingPhoto && !loadError) ? (
              <LoaderCircle className="h-5 w-5 animate-spin" />
            ) : (
              <ImageIcon className="h-5 w-5" />
            )}
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate font-semibold">
              {media.title || "Foto tanpa judul"}
            </p>
            <p className="text-muted mt-0.5 text-sm">
              {saving
                ? `Mengunggah hasil edit ${progress}%`
                : loadError
                  ? loadError
                  : workingPhoto
                    ? "Editor foto siap digunakan."
                    : "Menyiapkan foto asli…"}
            </p>
            <p className="text-muted mt-1 text-xs">
              Status tetap {media.status}; edit tidak menyetujui atau menolak media.
            </p>
          </div>
        </div>

        {saving && (
          <div
            className="bg-surface-2 mt-4 h-1.5 overflow-hidden rounded-full"
            role="progressbar"
            aria-label="Progres unggah hasil edit"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={progress}
          >
            <div
              className="bg-primary h-full rounded-full transition-[width]"
              style={{ width: `${progress}%` }}
            />
          </div>
        )}

        {loadError && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="mt-4"
            onClick={() => {
              setWorkingPhoto(null);
              setLoadError(null);
              setEditorOpen(false);
              setLoadAttempt((attempt) => attempt + 1);
            }}
          >
            <RotateCcw className="h-4 w-4" />
            Coba lagi
          </Button>
        )}
      </Card>

      <PhotoEditor
        open={editorOpen}
        file={workingPhoto?.file ?? null}
        sourceDimensions={workingPhoto?.sourceDimensions ?? null}
        onCancel={() => router.push("/profil/media")}
        onSave={save}
      />
    </>
  );
}
