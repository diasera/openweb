"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { CircleCheck, MessageCircle } from "lucide-react";
import { PhotoEditor } from "@/components/media-editor";
import { Button } from "@/components/ui/button";
import {
  GroupedField,
  GroupLabel,
  groupedInputClass,
} from "@/components/ui/grouped-field";
import { MenuGroup } from "@/components/ui/menu-row";
import { ToggleRow } from "@/components/ui/toggle-row";
import { useToast } from "@/components/ui/toast";
import { MEDIA_CATEGORIES } from "@/lib/categories";
import { isRetryableApiError, postJson } from "@/lib/api/client";
import { MEDIA_UPLOAD_ACCEPT, UPLOAD_LIMITS } from "@/lib/constants";
import { useMediaDrafts } from "@/lib/hooks/use-media-drafts";
import { SHARE_TARGET, takeSharedFiles } from "@/lib/share-target";
import { requestSignedUpload, uploadFileDirectly } from "@/lib/uploads/client";
import type { SignedUpload } from "@/lib/uploads/types";
import { mapWithConcurrency } from "@/lib/utils/concurrency";
import { cn } from "@/lib/utils/cn";
import { MediaComposer } from "./media-composer";
import styles from "./media-composer.module.css";

/** Unggahan paralel per pin: cepat tanpa membuat koneksi seluler tersendat. */
const UPLOAD_CONCURRENCY = 3;
const CAPTION_MAX = 300;

type SubmitState = "idle" | "uploading" | "saving" | "sent" | "error";

/**
 * Buat Pin: pilih hingga 10 foto/video (carousel), edit per item secara
 * lokal, lalu unggah langsung ke Storage sebagai satu pin (pending untuk
 * publik, langsung tampil untuk admin).
 */
export function UploadForm() {
  const router = useRouter();
  const { toast } = useToast();
  const drafts = useMediaDrafts(UPLOAD_LIMITS.mediaPerPost);
  const galleryRef = useRef<HTMLInputElement>(null);
  const cameraRef = useRef<HTMLInputElement>(null);
  const editButtonRef = useRef<HTMLButtonElement>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [category, setCategory] = useState<string>(MEDIA_CATEGORIES[0]);
  const [allowComments, setAllowComments] = useState(true);
  const [captionLength, setCaptionLength] = useState(0);
  const [state, setState] = useState<SubmitState>("idle");
  const [note, setNote] = useState("");
  const [itemProgress, setItemProgress] = useState<Record<string, number>>({});
  const [overallProgress, setOverallProgress] = useState(0);
  // Byte yang sudah terkirim tetap berlaku (tiket 2 jam): kirim ulang hanya
  // mengunggah file yang belum selesai, lalu mengulang finalisasi.
  const uploadedRef = useRef(new Map<File, SignedUpload>());
  const busy = state === "uploading" || state === "saving";
  const editing = drafts.items.find((draft) => draft.id === editingId) ?? null;
  const getEditButton = useCallback(() => editButtonRef.current, []);
  const { add } = drafts;

  const addFiles = useCallback(
    (files: File[]) => {
      if (files.length === 0) return;
      const firstNewIndex = drafts.items.length;
      const { added, skipped } = add(files);
      if (added > 0) setActiveIndex(firstNewIndex);
      if (skipped > 0) {
        toast.info(`Maksimal ${UPLOAD_LIMITS.mediaPerPost} item per pin`, {
          description: `${skipped} file tidak ditambahkan.`,
        });
      }
    },
    [add, drafts.items.length, toast],
  );

  // Dibuka dari menu "Bagikan" galeri HP (Web Share Target): pakai file titipan SW.
  useEffect(() => {
    const url = new URL(window.location.href);
    const shared = url.searchParams.get(SHARE_TARGET.resultParam);
    if (!shared) return;
    url.searchParams.delete(SHARE_TARGET.resultParam);
    window.history.replaceState(window.history.state, "", url.pathname + url.search);
    if (shared !== "1") {
      toast.error("File dari galeri belum bisa diterima. Pilih manual lewat tombol Galeri.");
      return;
    }
    void takeSharedFiles()
      .then((files) => {
        if (files.length > 0) return addFiles(files);
        toast.error("File dari galeri tidak ditemukan. Coba bagikan ulang.");
      })
      .catch(() => toast.error("File dari galeri gagal dibaca."));
    // Hanya sekali saat halaman dibuka dari share target.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function fail(message: string) {
    setState("error");
    setNote(message);
    toast.error(message);
  }

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!drafts.ready) {
      fail(
        drafts.preparing
          ? "Tunggu sampai semua media selesai dipersiapkan."
          : drafts.items.length > 0
            ? "Hapus item yang gagal dipersiapkan dulu."
            : "Pilih minimal satu foto atau video.",
      );
      return;
    }

    const form = new FormData(event.currentTarget);
    // Snapshot tunggal mencegah file/dimensi/urutan berubah di tengah request.
    const items = drafts.items.flatMap((draft) =>
      draft.file && draft.dims ? [{ id: draft.id, file: draft.file, dims: draft.dims }] : [],
    );
    const totalBytes = items.reduce((sum, item) => sum + item.file.size, 0) || 1;
    const sent = new Map(items.map((item) => [item.id, 0]));
    const report = (id: string, bytes: number, percentage: number) => {
      sent.set(id, bytes);
      setItemProgress((current) => ({ ...current, [id]: percentage }));
      const total = [...sent.values()].reduce((sum, value) => sum + value, 0);
      setOverallProgress(Math.min(100, Math.round((total / totalBytes) * 100)));
    };

    setState("uploading");
    setNote("");
    setOverallProgress(0);
    setItemProgress({});
    let finalizing = false;
    try {
      const signed = await mapWithConcurrency(items, UPLOAD_CONCURRENCY, async (item) => {
        const cached = uploadedRef.current.get(item.file);
        if (cached) {
          report(item.id, item.file.size, 100);
          return cached;
        }
        const upload = await requestSignedUpload("media", item.file);
        await uploadFileDirectly(item.file, upload, ({ sent: bytes, percentage }) => {
          report(item.id, bytes, percentage);
        });
        uploadedRef.current.set(item.file, upload);
        return upload;
      });

      setState("saving");
      finalizing = true;
      const data = await postJson<{ approved?: boolean }>(
        "/api/media",
        {
          items: signed.map((upload, index) => ({
            ticket: upload.ticket,
            width: items[index].dims.width,
            height: items[index].dims.height,
          })),
          title: form.get("title")?.toString().trim() || null,
          category,
          caption: form.get("caption")?.toString().trim() || null,
          uploader_name: form.get("uploader_name")?.toString().trim() || null,
          allow_comments: allowComments,
        },
        "Gagal mengunggah",
      );
      uploadedRef.current.clear();
      setState("sent");
      if (data.approved) {
        setNote("Berhasil diunggah dan langsung tampil.");
        toast.success("Pin langsung tampil");
      } else {
        setNote("Berhasil dikirim! Menunggu persetujuan admin sebelum tampil.");
        toast.success("Pin terkirim", {
          description: "Menunggu persetujuan admin sebelum tampil.",
        });
      }
      window.setTimeout(() => {
        drafts.reset();
        router.push("/");
      }, 1400);
    } catch (error) {
      // Server membersihkan seluruh tiket saat finalisasi ditolak permanen;
      // gangguan unggah/kuota tetap menyimpan file yang sudah terkirim.
      if (finalizing && !isRetryableApiError(error)) uploadedRef.current.clear();
      setItemProgress({});
      fail(error instanceof Error ? error.message : "Gagal mengunggah");
    }
  }

  const submitLabel =
    state === "uploading"
      ? `Mengunggah ${overallProgress}%…`
      : state === "saving"
        ? "Menyimpan pin…"
        : state === "sent"
          ? "Terkirim"
          : drafts.items.length > 1
            ? `Bagikan ${drafts.items.length} item`
            : "Bagikan Pin";

  return (
    <>
      <form onSubmit={onSubmit} className="space-y-6 pb-4">
        <input
          ref={galleryRef}
          type="file"
          multiple
          accept={MEDIA_UPLOAD_ACCEPT}
          className="hidden"
          onChange={(event) => {
            addFiles([...(event.currentTarget.files ?? [])]);
            event.currentTarget.value = "";
          }}
        />
        <input
          ref={cameraRef}
          type="file"
          accept={MEDIA_UPLOAD_ACCEPT}
          capture="environment"
          className="hidden"
          onChange={(event) => {
            addFiles([...(event.currentTarget.files ?? [])]);
            event.currentTarget.value = "";
          }}
        />

        <MediaComposer
          drafts={drafts}
          activeIndex={activeIndex}
          onActiveIndexChange={setActiveIndex}
          onPickGallery={() => galleryRef.current?.click()}
          onPickCamera={() => cameraRef.current?.click()}
          onFiles={addFiles}
          onEdit={setEditingId}
          editButtonRef={editButtonRef}
          uploadProgress={itemProgress}
          disabled={busy || state === "sent"}
        />

        <section aria-label="Detail pin" className="space-y-2">
          <GroupLabel>Detail</GroupLabel>
          <MenuGroup>
            <GroupedField label="Judul" htmlFor="title">
              <input
                id="title"
                name="title"
                maxLength={120}
                disabled={busy}
                placeholder="Beri judul yang menarik…"
                className={groupedInputClass}
              />
            </GroupedField>
            <GroupedField
              label="Caption"
              htmlFor="caption"
              trailing={
                <span
                  className={cn(
                    "text-caption2 tabular-nums",
                    captionLength > CAPTION_MAX - 30 ? "text-warning" : "text-muted",
                  )}
                >
                  {captionLength}/{CAPTION_MAX}
                </span>
              }
            >
              <textarea
                id="caption"
                name="caption"
                rows={3}
                maxLength={CAPTION_MAX}
                disabled={busy}
                onChange={(event) => setCaptionLength(event.currentTarget.value.length)}
                placeholder="Ceritakan konteks media ini…"
                className={cn(groupedInputClass, "resize-none leading-relaxed")}
              />
            </GroupedField>
            <GroupedField label="Unggah sebagai (opsional)" htmlFor="uploader_name">
              <input
                id="uploader_name"
                name="uploader_name"
                maxLength={60}
                disabled={busy}
                placeholder="Nama kamu / Anonim"
                className={groupedInputClass}
              />
            </GroupedField>
          </MenuGroup>
        </section>

        <section aria-labelledby="category-label" className="space-y-2">
          <GroupLabel id="category-label">Kategori</GroupLabel>
          <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4" role="radiogroup" aria-labelledby="category-label">
            {MEDIA_CATEGORIES.map((item) => (
              <button
                key={item}
                type="button"
                role="radio"
                aria-checked={category === item}
                disabled={busy}
                onClick={() => setCategory(item)}
                className={cn(
                  "motion-pressable shrink-0 rounded-full px-4 py-2 text-subhead font-medium transition-colors disabled:opacity-50",
                  category === item
                    ? "bg-foreground text-bg"
                    : "bg-surface border-border text-muted hover:text-foreground border",
                )}
              >
                {item}
              </button>
            ))}
          </div>
        </section>

        <MenuGroup>
          <ToggleRow
            icon={<MessageCircle className="size-5" aria-hidden="true" />}
            label="Izinkan komentar"
            description="Pengunjung dapat berkomentar setelah pin tampil."
            checked={allowComments}
            onChange={setAllowComments}
            disabled={busy}
          />
        </MenuGroup>

        {note && (
          <p
            className={cn("px-1 text-footnote", state === "error" ? "text-danger" : "text-success")}
            role={state === "error" ? "alert" : "status"}
          >
            {note}
          </p>
        )}

        <div className="safe-bottom sticky bottom-0 z-20 -mx-4 bg-linear-to-t from-bg via-bg/95 to-transparent px-4 pt-6">
          <Button
            type="submit"
            size="lg"
            disabled={busy || state === "sent" || !drafts.ready}
            className={cn(
              "relative w-full overflow-hidden",
              // Progres dan status terkirim tetap pekat meski tombol terkunci.
              (busy || state === "sent") && "disabled:opacity-100",
              state === "sent" && "bg-success",
            )}
          >
            {busy && (
              <span
                aria-hidden="true"
                className={cn(styles.submitFill, "absolute inset-0 bg-white/20")}
                style={{ transform: `scaleX(${state === "saving" ? 1 : overallProgress / 100})` }}
              />
            )}
            <span className="relative flex items-center gap-2" aria-live="polite">
              {state === "sent" && (
                <CircleCheck className="animate-control-pop size-5" aria-hidden="true" />
              )}
              {submitLabel}
            </span>
          </Button>
        </div>
      </form>

      <PhotoEditor
        open={Boolean(editing)}
        file={editing ? (editing.originalFile ?? editing.file) : null}
        sourceDimensions={editing ? (editing.originalDims ?? editing.dims) : null}
        initialRecipe={editing?.editRecipe}
        initialAspect={editing?.editAspect}
        returnFocus={getEditButton}
        onCancel={() => setEditingId(null)}
        onSave={(result) => {
          if (!editing || !drafts.applyEdited(editing.id, result)) {
            toast.error("Hasil edit tidak dapat digunakan.");
            return;
          }
          setEditingId(null);
          toast.success("Hasil edit diterapkan", {
            description: "Foto asli masih bisa dipulihkan sebelum pin dibagikan.",
          });
        }}
      />
    </>
  );
}
