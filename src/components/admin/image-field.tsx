"use client";

import { ImageIcon, Pencil, RotateCcw, Trash2, Upload } from "lucide-react";
import { PhotoEditor } from "@/components/media-editor";
import { Button } from "@/components/ui/button";
import { useImageDraft } from "@/lib/hooks/use-image-draft";
import {
  getPhotoEditorProfile,
  type MediaEditorDimensions,
  type PhotoEditorProfileId,
} from "@/lib/media-editor";
import { cn } from "@/lib/utils/cn";

export interface ImageFieldProps {
  name: string;
  label: string;
  initialUrl?: string | null;
  initialDimensions?: MediaEditorDimensions | null;
  wide?: boolean;
  hint?: string;
  removable?: boolean;
  /** Profil aset wajib agar kebijakan editor tidak tersebar sebagai angka lokal. */
  profile: PhotoEditorProfileId;
  disabled?: boolean;
}

/**
 * Field gambar reusable untuk seluruh form admin. Editing bersifat lokal;
 * parent tetap menerima File melalui FormData dan menjalankan upload seperti biasa.
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
}: ImageFieldProps) {
  const {
    inputRef,
    editButtonRef,
    accept,
    activeFile,
    previewUrl,
    dimensions,
    edited,
    removed,
    error,
    notice,
    preparing,
    editable,
    canOpenEditor,
    editorOpen,
    editorFile,
    editorDimensions,
    editorRecipe,
    editorAspect,
    selectFile,
    capturePreviewDimensions,
    openEditor,
    closeEditor,
    applyEdited,
    restoreOriginal,
    remove,
  } = useImageDraft({ name, initialUrl, initialDimensions, profile });
  const frame = getPhotoEditorProfile(profile).frame;
  const intrinsicPreview = !frame;
  const dimensionLabel = dimensions
    ? `${dimensions.width} × ${dimensions.height} px`
    : null;

  return (
    <div className="space-y-2.5">
      <label className="block text-sm font-medium" htmlFor={`${name}-file`}>
        {label}
      </label>

      <div
        className={cn(
          "grid min-w-0 gap-3",
          intrinsicPreview && wide
            ? "grid-cols-1"
            : wide
            ? "sm:grid-cols-[10rem_minmax(0,1fr)] sm:items-center"
            : "grid-cols-[6rem_minmax(0,1fr)] items-center",
        )}
      >
        <div
          className={cn(
            "bg-surface-2 border-border relative overflow-hidden rounded-2xl border",
            intrinsicPreview && wide
              ? "w-full max-w-xl"
              : wide
                ? "w-full sm:w-40"
                : "w-24",
            !previewUrl && intrinsicPreview && "min-h-24",
          )}
          style={
            frame
              ? { aspectRatio: frame.aspectRatio }
              : dimensions
                ? { aspectRatio: dimensions.width / dimensions.height }
                : undefined
          }
        >
          {previewUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={previewUrl}
              alt={`Pratinjau ${label.toLocaleLowerCase()}`}
              className={
                intrinsicPreview ? "block h-auto w-full" : "h-full w-full"
              }
              style={frame ? { objectFit: frame.objectFit } : undefined}
              onLoad={(event) => {
                capturePreviewDimensions(
                  event.currentTarget.naturalWidth,
                  event.currentTarget.naturalHeight,
                );
              }}
            />
          ) : (
            <div className="text-muted grid h-full w-full place-items-center">
              <ImageIcon className="h-6 w-6" aria-hidden="true" />
            </div>
          )}
          {edited && (
            <span className="bg-success absolute bottom-1.5 left-1.5 rounded-full px-2 py-0.5 text-[10px] font-semibold text-white">
              Diedit
            </span>
          )}
        </div>

        <div className="min-w-0 space-y-2">
          <input
            ref={inputRef}
            id={`${name}-file`}
            type="file"
            name={name}
            accept={accept}
            disabled={disabled}
            data-image-draft-preparing={preparing ? "true" : undefined}
            className="hidden"
            onChange={(event) => {
              const file = event.currentTarget.files?.[0] ?? null;
              void selectFile(file);
            }}
          />
          <input
            type="hidden"
            name={`${name}_remove`}
            value={removed ? "1" : "0"}
          />
          <input
            type="hidden"
            name={`${name}_width`}
            value={dimensions?.width ?? ""}
          />
          <input
            type="hidden"
            name={`${name}_height`}
            value={dimensions?.height ?? ""}
          />

          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={disabled || preparing}
              onClick={() => inputRef.current?.click()}
            >
              <Upload className="h-4 w-4" aria-hidden="true" />
              Pilih gambar
            </Button>

            {canOpenEditor && (
              <Button
                ref={editButtonRef}
                type="button"
                variant="dark"
                size="sm"
                disabled={disabled || preparing}
                onClick={() => void openEditor()}
              >
                <Pencil className="h-4 w-4" aria-hidden="true" />
                {edited ? "Edit lagi" : "Edit"}
              </Button>
            )}

            {edited && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                disabled={disabled || preparing}
                onClick={restoreOriginal}
              >
                <RotateCcw className="h-4 w-4" aria-hidden="true" />
                Pulihkan asli
              </Button>
            )}

            {removable && previewUrl && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                disabled={disabled || preparing}
                aria-label={`Hapus ${label.toLocaleLowerCase()}`}
                onClick={remove}
              >
                <Trash2 className="h-4 w-4" aria-hidden="true" />
                Hapus
              </Button>
            )}
          </div>

          <div className="min-h-4 text-xs">
            {preparing ? (
              <p className="text-muted" role="status">
                Menyiapkan gambar…
              </p>
            ) : error ? (
              <p className="text-danger leading-relaxed" role="alert">
                {error}
              </p>
            ) : notice ? (
              <p className="text-muted leading-relaxed" role="status">
                {notice}
              </p>
            ) : activeFile && !editable ? (
              <p className="text-muted leading-relaxed">
                Media animasi disimpan seperti aslinya; editor tidak tersedia.
              </p>
            ) : edited ? (
              <p className="text-success font-medium">
                Hasil edit akan digunakan saat form disimpan.
              </p>
            ) : dimensionLabel ? (
              <p className="text-muted">{dimensionLabel}</p>
            ) : null}
          </div>
        </div>
      </div>

      {hint && <p className="text-muted text-xs leading-relaxed">{hint}</p>}

      <PhotoEditor
        open={editorOpen}
        file={editorFile}
        sourceDimensions={editorDimensions}
        profile={profile}
        initialRecipe={editorRecipe}
        initialAspect={editorAspect}
        returnFocus={() => editButtonRef.current}
        onCancel={closeEditor}
        onSave={(result) => {
          if (!applyEdited(result)) {
            throw new Error("Hasil edit tidak dapat digunakan.");
          }
        }}
      />
    </div>
  );
}
