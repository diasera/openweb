"use client";

import { useCallback, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Camera, ImagePlus, RotateCcw, WandSparkles } from "lucide-react";
import { PhotoEditor } from "@/components/media-editor";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { MediaDropzone } from "@/components/ui/media-dropzone";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/toast";
import { MEDIA_CATEGORIES } from "@/lib/categories";
import { postJson } from "@/lib/api/client";
import { MEDIA_UPLOAD_ACCEPT, PHOTO_EDITOR_HELP } from "@/lib/constants";
import { useMediaPicker } from "@/lib/hooks/use-media-picker";
import {
  requestSignedUpload,
  uploadFileDirectly,
} from "@/lib/uploads/client";
import { cn } from "@/lib/utils/cn";

/** Form Buat Pin: edit opsional lokal, lalu unggah hasil aktif sebagai pending. */
export function UploadForm() {
  const router = useRouter();
  const { toast } = useToast();
  const picker = useMediaPicker();
  const cameraRef = useRef<HTMLInputElement>(null);
  const editButtonRef = useRef<HTMLButtonElement>(null);
  const [category, setCategory] = useState<string>(MEDIA_CATEGORIES[0]);
  const [allowComments, setAllowComments] = useState(true);
  const [state, setState] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [note, setNote] = useState("");
  const [progress, setProgress] = useState(0);
  const [editorOpen, setEditorOpen] = useState(false);
  const busy = state === "sending";
  const getEditButton = useCallback(() => editButtonRef.current, []);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!picker.ready || !picker.file || !picker.dims) {
      const message = picker.preparing
        ? "Tunggu sampai media selesai dipersiapkan."
        : "Pilih foto atau video yang valid dulu.";
      setState("error");
      setNote(message);
      toast.error(message);
      return;
    }

    setState("sending");
    setNote("");
    setProgress(0);
    const form = new FormData(event.currentTarget);
    // Snapshot tunggal mencegah file/dimensi berubah di tengah request.
    const uploadFile = picker.file;
    const uploadDims = picker.dims;
    try {
      const signed = await requestSignedUpload("media", uploadFile);
      await uploadFileDirectly(uploadFile, signed, ({ percentage }) => {
        setProgress(percentage);
      });
      const data = await postJson<{ approved?: boolean }>(
        "/api/media",
        {
          ticket: signed.ticket,
          title: form.get("title")?.toString().trim() || null,
          category,
          caption: form.get("caption")?.toString().trim() || null,
          uploader_name: form.get("uploader_name")?.toString().trim() || null,
          allow_comments: allowComments,
          width: uploadDims.width,
          height: uploadDims.height,
        },
        "Gagal mengunggah",
      );
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
      picker.reset();
      setProgress(100);
      window.setTimeout(() => router.push("/"), 1400);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Gagal mengunggah";
      setState("error");
      setNote(message);
      toast.error(message);
    }
  }

  return (
    <>
      <form onSubmit={onSubmit} className="space-y-4">
        <MediaDropzone picker={picker} disabled={busy} />
        <input
          ref={cameraRef}
          type="file"
          accept={MEDIA_UPLOAD_ACCEPT}
          capture="environment"
          className="hidden"
          onChange={(event) => {
            void picker.pick(event.currentTarget.files?.[0] ?? null);
            event.currentTarget.value = "";
          }}
        />
        <div className="grid grid-cols-2 gap-3">
          <Button
            type="button"
            variant="outline"
            disabled={busy}
            onClick={() => picker.inputRef.current?.click()}
          >
            <ImagePlus className="h-4 w-4" /> Galeri
          </Button>
          <Button
            type="button"
            variant="outline"
            disabled={busy}
            onClick={() => cameraRef.current?.click()}
          >
            <Camera className="h-4 w-4" /> Kamera
          </Button>
        </div>

        <div className="space-y-2">
          <Button
            ref={editButtonRef}
            type="button"
            variant="dark"
            className="w-full"
            disabled={!picker.canEdit || picker.preparing || busy}
            onClick={() => setEditorOpen(true)}
          >
            <WandSparkles className="h-4 w-4" />
            {picker.isEdited ? "Edit lagi" : "Edit foto (opsional)"}
          </Button>
          {picker.isEdited && (
            <Button
              type="button"
              variant="ghost"
              className="w-full"
              disabled={picker.preparing || busy}
              onClick={() => {
                picker.restoreOriginal();
                toast.info("Foto asli dipulihkan");
              }}
            >
              <RotateCcw className="h-4 w-4" /> Pulihkan foto asli
            </Button>
          )}
          {picker.file && !picker.canEdit && (
            <p className="text-muted px-2 text-center text-xs">{PHOTO_EDITOR_HELP}</p>
          )}
          {picker.isEdited && (
            <p className="text-success text-center text-xs font-medium">
              Hasil edit akan digunakan saat Pin dibagikan.
            </p>
          )}
        </div>

        <Field label="Judul" htmlFor="title">
          <Input id="title" name="title" maxLength={120} placeholder="Beri judul yang menarik…" />
        </Field>
        <Field label="Caption" htmlFor="caption">
          <Textarea
            id="caption"
            name="caption"
            rows={3}
            maxLength={300}
            placeholder="Ceritakan konteks media ini…"
          />
        </Field>

        <div>
          <p className="mb-2 text-sm font-medium">Kategori</p>
          <div className="flex flex-wrap gap-2">
            {MEDIA_CATEGORIES.map((item) => (
              <button
                key={item}
                type="button"
                disabled={busy}
                onClick={() => setCategory(item)}
                className={cn(
                  "rounded-full px-3.5 py-1.5 text-sm font-medium transition disabled:opacity-50",
                  category === item
                    ? "bg-primary text-white"
                    : "bg-surface-2 text-muted hover:text-foreground",
                )}
              >
                {item}
              </button>
            ))}
          </div>
        </div>

        <Field label="Unggah sebagai (opsional)" htmlFor="uploader_name">
          <Input
            id="uploader_name"
            name="uploader_name"
            maxLength={60}
            placeholder="Nama kamu / Anonim"
          />
        </Field>

        <div className="border-border bg-surface flex items-center gap-3 rounded-2xl border px-4 py-3">
          <span className="flex-1 font-medium">Izinkan komentar</span>
          <Switch
            checked={allowComments}
            onChange={setAllowComments}
            disabled={busy}
            label="Izinkan komentar"
          />
        </div>

        {note && (
          <p
            className={state === "error" ? "text-danger text-sm" : "text-success text-sm"}
            role={state === "error" ? "alert" : "status"}
          >
            {note}
          </p>
        )}

        <Button type="submit" disabled={busy || !picker.ready} className="w-full" size="lg">
          {busy ? `Mengunggah ${progress}%…` : "Bagikan Pin"}
        </Button>
      </form>

      <PhotoEditor
        open={editorOpen}
        file={picker.editorFile}
        sourceDimensions={picker.editorDimensions}
        initialRecipe={picker.editRecipe}
        initialAspect={picker.editAspect}
        returnFocus={getEditButton}
        onCancel={() => setEditorOpen(false)}
        onSave={(result) => {
          if (!picker.applyEdited(result)) {
            toast.error("Hasil edit tidak dapat digunakan.");
            return;
          }
          setEditorOpen(false);
          toast.success("Hasil edit diterapkan", {
            description: "Foto asli masih bisa dipulihkan sebelum Pin dibagikan.",
          });
        }}
      />
    </>
  );
}
