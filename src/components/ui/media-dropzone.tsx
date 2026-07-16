"use client";

import { ImagePlus, LoaderCircle, X } from "lucide-react";
import type { useMediaPicker } from "@/lib/hooks/use-media-picker";
import { MEDIA_UPLOAD_ACCEPT } from "@/lib/constants";

/** Area pilih + pratinjau media (foto/video). Dipakai form upload publik & admin. */
export function MediaDropzone({
  picker,
  disabled = false,
}: {
  picker: ReturnType<typeof useMediaPicker>;
  disabled?: boolean;
}) {
  return (
    <>
      <input
        ref={picker.inputRef}
        type="file"
        accept={MEDIA_UPLOAD_ACCEPT}
        disabled={disabled}
        className="hidden"
        onChange={(event) => {
          const input = event.currentTarget;
          void picker.pick(input.files?.[0] ?? null).then((accepted) => {
            if (!accepted) input.value = "";
          });
        }}
      />

      {picker.error && (
        <p className="text-danger mb-2 text-sm" role="alert">
          {picker.error}
        </p>
      )}

      {picker.notice && !picker.error && (
        <p className="text-muted mb-2 text-xs leading-relaxed" role="status">
          {picker.notice}
        </p>
      )}

      {picker.preview ? (
        <div className="rounded-ios bg-surface-2 relative overflow-hidden">
          {picker.isVideo ? (
            <video src={picker.preview} controls className="max-h-80 w-full object-contain" />
          ) : (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={picker.preview} alt="Pratinjau" className="max-h-80 w-full object-contain" />
          )}
          <button
            type="button"
            onClick={() => picker.reset()}
            disabled={disabled}
            aria-label="Hapus"
            className="glass absolute right-2 top-2 grid h-10 w-10 place-items-center rounded-full disabled:opacity-40"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      ) : picker.preparing ? (
        <div
          className="border-border text-muted rounded-ios flex min-h-48 flex-col items-center justify-center gap-3 border border-dashed px-4 text-center"
          role="status"
        >
          <LoaderCircle className="h-6 w-6 animate-spin" />
          <span className="text-sm font-medium">Menyiapkan media…</span>
          <span className="text-xs">Pratinjau dioptimalkan agar tetap ringan.</span>
        </div>
      ) : (
        <button
          type="button"
          disabled={disabled}
          onClick={() => picker.inputRef.current?.click()}
          className="border-border text-muted hover:border-primary hover:text-primary-readable rounded-ios flex w-full flex-col items-center gap-2 border border-dashed py-12 transition disabled:opacity-50"
        >
          <span className="bg-surface mb-1 grid h-14 w-14 place-items-center rounded-full shadow-ios-sm">
            <ImagePlus className="h-6 w-6" />
          </span>
          <span className="text-foreground text-sm font-semibold">
            Tambah foto atau video
          </span>
          <span className="text-xs">Ketuk untuk pilih dari galeri</span>
        </button>
      )}
    </>
  );
}
