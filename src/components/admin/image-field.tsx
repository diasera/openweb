"use client";

import { useEffect, useState, type DragEvent } from "react";
import {
  ImagePlus,
  LoaderCircle,
  Pencil,
  RefreshCw,
  RotateCcw,
  Trash2,
} from "lucide-react";
import { PhotoEditor } from "@/components/media-editor";
import { notifyFormChange } from "@/lib/hooks/use-form-dirty";
import { useImageDraft } from "@/lib/hooks/use-image-draft";
import {
  getPhotoEditorProfile,
  type MediaEditorDimensions,
  type PhotoEditorProfileId,
} from "@/lib/media-editor";
import { cn } from "@/lib/utils/cn";

export interface ImageFieldPreview {
  url: string | null;
  dimensions: MediaEditorDimensions | null;
}

export interface ImageFieldProps {
  name: string;
  label: string;
  initialUrl?: string | null;
  initialDimensions?: MediaEditorDimensions | null;
  /** Pratinjau melebar penuh (cover, gambar sosial, hero). */
  wide?: boolean;
  hint?: string;
  removable?: boolean;
  /** Profil aset wajib agar kebijakan editor tidak tersebar sebagai angka lokal. */
  profile: PhotoEditorProfileId;
  disabled?: boolean;
  /**
   * Render input tersembunyi {name}_width/{name}_height. Hanya untuk field yang
   * kolom dimensinya tersimpan di database (hero) agar form tidak mengirim
   * data yang dibuang server.
   */
  withDimensions?: boolean;
  /** Dipanggil setiap pratinjau berubah; harus ber-identitas stabil (useCallback). */
  onPreviewChange?: (preview: ImageFieldPreview) => void;
}

const TOOL_CLASS =
  "glass-button inline-flex h-8 items-center gap-1.5 rounded-full px-3 text-caption1 font-semibold disabled:opacity-50";

/**
 * Field gambar reusable untuk seluruh form admin: zona pilih/seret-lepas,
 * pratinjau sesuai rasio aset tujuan, toolbar kaca (Ganti, Edit, Pulihkan,
 * Hapus), dan status pipeline. Seluruh logika draft (normalisasi HEIC,
 * editor, FileList) milik useImageDraft; parent tetap menerima File lewat
 * FormData dan mengunggahnya seperti biasa.
 */
export function ImageField({
  name,
  label,
  initialUrl,
  initialDimensions,
  wide = false,
  hint,
  removable = false,
  profile,
  disabled = false,
  withDimensions = false,
  onPreviewChange,
}: ImageFieldProps) {
  const draft = useImageDraft({ name, initialUrl, initialDimensions, profile });
  const {
    inputRef,
    editButtonRef,
    previewUrl,
    dimensions,
    preparing,
  } = draft;
  const [dragging, setDragging] = useState(false);

  // previewUrl ditetapkan di banyak jalur async useImageDraft; satu effect di
  // sini lebih aman daripada menitipkan callback ke setiap jalur tersebut.
  useEffect(() => {
    onPreviewChange?.({ url: previewUrl, dimensions });
  }, [dimensions, onPreviewChange, previewUrl]);

  const frame = getPhotoEditorProfile(profile).frame;
  const intrinsic = !frame;
  const busy = disabled || preparing;
  const inputId = `${name}-file`;

  function onDrop(event: DragEvent<HTMLElement>) {
    event.preventDefault();
    setDragging(false);
    if (busy) return;
    const file = Array.from(event.dataTransfer.files).find((item) =>
      item.type.startsWith("image/") || /\.(heic|heif)$/i.test(item.name),
    );
    if (!file) return;
    // FileList disinkronkan useImageDraft; tanpa event native, umumkan manual.
    void draft.selectFile(file).then((ok) => {
      if (ok) notifyFormChange(inputRef.current);
    });
  }

  const dropHandlers = {
    onDragOver: (event: DragEvent<HTMLElement>) => {
      event.preventDefault();
      if (!busy) setDragging(true);
    },
    onDragLeave: () => setDragging(false),
    onDrop,
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <label className="block text-sm font-medium" htmlFor={inputId}>
          {label}
        </label>
        {dimensions && !preparing && (
          <span className="text-muted rounded-full bg-surface-2 px-2 py-0.5 font-mono text-caption2 tabular-nums">
            {dimensions.width} × {dimensions.height}
          </span>
        )}
      </div>

      <div
        {...dropHandlers}
        className={cn(
          "group/image relative overflow-hidden rounded-2xl border transition-[border-color,box-shadow]",
          previewUrl ? "border-border bg-surface-2" : "border-border border-dashed bg-surface-2/60",
          dragging && "border-primary ring-primary/25 ring-4",
          "has-[input[type=file]:focus-visible]:ring-primary-readable/60 has-[input[type=file]:focus-visible]:ring-2",
          wide ? "w-full" : "w-full max-w-56",
          intrinsic && wide && "max-w-2xl",
        )}
        style={
          frame
            ? { aspectRatio: frame.aspectRatio }
            : previewUrl && dimensions
              ? { aspectRatio: dimensions.width / dimensions.height }
              : { minHeight: "8rem" }
        }
      >
        {/* Fokus keyboard mendarat di input asli (Enter/Spasi membuka pemilih
            file); cincin fokus digambar pada zona di atasnya. */}
        <input
          ref={inputRef}
          id={inputId}
          type="file"
          name={name}
          accept={draft.accept}
          disabled={disabled}
          data-image-draft-preparing={preparing ? "true" : undefined}
          className="sr-only"
          onChange={(event) => {
            const file = event.currentTarget.files?.[0] ?? null;
            void draft.selectFile(file);
          }}
        />
        {previewUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            key={previewUrl}
            src={previewUrl}
            alt={`Pratinjau ${label.toLocaleLowerCase()}`}
            className={cn(
              "animate-fade-in",
              intrinsic ? "block h-auto w-full" : "absolute inset-0 h-full w-full",
            )}
            style={frame ? { objectFit: frame.objectFit } : undefined}
            onLoad={(event) => {
              draft.capturePreviewDimensions(
                event.currentTarget.naturalWidth,
                event.currentTarget.naturalHeight,
              );
            }}
          />
        ) : (
          <label
            htmlFor={inputId}
            className={cn(
              "text-muted absolute inset-0 flex cursor-pointer flex-col items-center justify-center gap-1.5 p-4 text-center transition-colors hover:text-foreground",
              busy && "pointer-events-none",
            )}
          >
            <span className="bg-surface shadow-soft grid size-10 place-items-center rounded-2xl">
              <ImagePlus className="size-5" aria-hidden="true" />
            </span>
            <span className="text-caption1 font-semibold">
              {dragging ? "Lepaskan untuk memakai" : "Pilih atau seret gambar"}
            </span>
          </label>
        )}

        {preparing && (
          <span
            className="bg-surface/70 absolute inset-0 grid place-items-center backdrop-blur-sm"
            role="status"
          >
            <span className="text-muted flex items-center gap-2 text-caption1 font-semibold">
              <LoaderCircle className="size-4 animate-spin" aria-hidden="true" />
              Menyiapkan gambar…
            </span>
          </span>
        )}

        {draft.edited && (
          <span className="bg-success absolute left-2 top-2 rounded-full px-2 py-0.5 text-caption2 font-semibold text-white">
            Diedit
          </span>
        )}

        {previewUrl && (
          <div className="absolute inset-x-2 bottom-2 flex flex-wrap justify-end gap-1.5">
            <label htmlFor={inputId} className={cn(TOOL_CLASS, "cursor-pointer", busy && "pointer-events-none opacity-50")}>
              <RefreshCw className="size-3.5" aria-hidden="true" />
              Ganti
            </label>
            {draft.canOpenEditor && (
              <button
                ref={editButtonRef}
                type="button"
                disabled={busy}
                onClick={() => void draft.openEditor()}
                className={TOOL_CLASS}
              >
                <Pencil className="size-3.5" aria-hidden="true" />
                {draft.edited ? "Edit lagi" : "Edit"}
              </button>
            )}
            {draft.edited && (
              <button
                type="button"
                disabled={busy}
                onClick={draft.restoreOriginal}
                className={TOOL_CLASS}
              >
                <RotateCcw className="size-3.5" aria-hidden="true" />
                Asli
              </button>
            )}
            {removable && (
              <button
                type="button"
                disabled={busy}
                aria-label={`Hapus ${label.toLocaleLowerCase()}`}
                onClick={draft.remove}
                className={cn(TOOL_CLASS, "text-danger")}
              >
                <Trash2 className="size-3.5" aria-hidden="true" />
              </button>
            )}
          </div>
        )}
      </div>

      <input type="hidden" name={`${name}_remove`} value={draft.removed ? "1" : "0"} />
      {withDimensions && (
        <>
          <input type="hidden" name={`${name}_width`} value={dimensions?.width ?? ""} />
          <input type="hidden" name={`${name}_height`} value={dimensions?.height ?? ""} />
        </>
      )}

      <div className="text-xs empty:hidden" aria-live="polite">
        {draft.error ? (
          <p className="text-danger leading-relaxed" role="alert">
            {draft.error}
          </p>
        ) : draft.notice ? (
          <p className="text-muted leading-relaxed">{draft.notice}</p>
        ) : draft.activeFile && !draft.editable ? (
          <p className="text-muted leading-relaxed">
            Media animasi disimpan seperti aslinya; editor tidak tersedia.
          </p>
        ) : draft.edited ? (
          <p className="text-success font-medium">Hasil edit dipakai saat form disimpan.</p>
        ) : null}
      </div>
      {hint && <p className="text-muted text-xs leading-relaxed">{hint}</p>}

      <PhotoEditor
        open={draft.editorOpen}
        file={draft.editorFile}
        sourceDimensions={draft.editorDimensions}
        profile={profile}
        initialRecipe={draft.editorRecipe}
        initialAspect={draft.editorAspect}
        returnFocus={() => editButtonRef.current}
        onCancel={draft.closeEditor}
        onSave={(result) => {
          if (!draft.applyEdited(result)) {
            throw new Error("Hasil edit tidak dapat digunakan.");
          }
        }}
      />
    </div>
  );
}
