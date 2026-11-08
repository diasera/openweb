"use client";

import { useCallback, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ExternalLink, Images, Info, Save } from "lucide-react";
import { useAppMotion } from "@/components/motion";
import { useIslandActions } from "@/components/public/dynamic-island";
import {
  DraftPhotoEditor,
  MediaComposer,
  useAddMediaFiles,
} from "@/components/public/media-composer";
import { buttonClass } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { isRetryableApiError, postJson } from "@/lib/api/client";
import type { AdminEditableMedia } from "@/lib/admin/media";
import type { AlbumOption } from "@/lib/admin/albums";
import { categoryOptions, MEDIA_CATEGORIES } from "@/lib/categories";
import { adminFeatureHref, UPLOAD_LIMITS } from "@/lib/constants";
import { useDraftUploads } from "@/lib/hooks/use-draft-uploads";
import { useFormDirty, useUnsavedChangesGuard } from "@/lib/hooks/use-form-dirty";
import { useMediaDrafts } from "@/lib/hooks/use-media-drafts";
import { useSaveShortcut } from "@/lib/hooks/use-save-shortcut";
import { MEDIA_METADATA_LIMITS } from "@/lib/media/metadata";
import type { MediaDetailsInput } from "@/lib/media/metadata-schema";
import { cn } from "@/lib/utils/cn";
import { timeZoneLabel, toZonedInputValue } from "@/lib/utils/time";
import { FormSection, SelectField, SwitchField, TextAreaField, TextField } from "../form-controls";
import { IslandSaveButton } from "../island-save";
import { MEDIA_STATUS } from "./media-status";

type SaveState = "idle" | "uploading" | "saving";

/** Detail form → bentuk JSON yang divalidasi mediaDetailsSchema di server. */
function detailsFromForm(form: HTMLFormElement, occurredInitial: string): MediaDetailsInput {
  const data = new FormData(form);
  const text = (name: string) => data.get(name)?.toString() ?? "";
  return {
    title: text("title"),
    category: text("category"),
    caption: text("caption"),
    uploader_name: text("uploader_name"),
    allow_comments: data.get("allow_comments") === "on",
    album_id: text("album_id"),
    is_pinned: data.get("is_pinned") === "on",
    occurred_local: text("occurred_local"),
    occurred_initial: occurredInitial,
  };
}

/**
 * "Edit postingan": SATU tempat untuk seluruh isi pin. Kiri: komposer carousel
 * yang sama dengan Buat Pin (pilih item ke-n untuk edit foto, tambah, hapus,
 * urutkan, jadikan sampul). Kanan: teks, kategori, pengunggah, tanggal momen,
 * komentar, album, dan sorotan. Tombol Simpan muncul di Dynamic Island hanya
 * selama ada perubahan; satu simpan menulis semuanya dalam satu transaksi,
 * lalu kembali ke daftar Media.
 */
export function MediaPostEditor({
  media,
  albums,
}: {
  media: AdminEditableMedia;
  albums: AlbumOption[];
}) {
  const router = useRouter();
  const { goBack } = useAppMotion();
  const { toast } = useToast();
  const formRef = useRef<HTMLFormElement>(null);
  const { dirty: detailsDirty, setDirty } = useFormDirty(formRef);
  const drafts = useMediaDrafts(UPLOAD_LIMITS.mediaPerPost, media.items);
  const uploads = useDraftUploads();
  const editButtonRef = useRef<HTMLButtonElement>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [state, setState] = useState<SaveState>("idle");
  const busy = state !== "idle";
  const addFiles = useAddMediaFiles(drafts, setActiveIndex);
  const getEditButton = useCallback(() => editButtonRef.current, []);

  const expected = media.items.map((item) => item.url);
  const occurredInitial = toZonedInputValue(media.created_at);
  const mediaChanged =
    drafts.items.length !== expected.length ||
    drafts.items.some(
      (draft, index) => !draft.stored || draft.isEdited || draft.stored.url !== expected[index],
    );
  const dirty = mediaChanged || detailsDirty;
  // Perubahan teks dijaga useFormDirty; perubahan media dijaga di sini.
  useUnsavedChangesGuard(mediaChanged);

  async function openEditor(id: string) {
    const problem = await drafts.prepareEdit(id);
    if (problem) toast.error(problem);
    else setEditingId(id);
  }

  async function save() {
    const form = formRef.current;
    if (busy || !dirty || !form) return;
    if (mediaChanged && !drafts.ready) {
      toast.error(
        drafts.items.length === 0
          ? "Postingan minimal berisi satu foto atau video."
          : drafts.preparing
            ? "Tunggu sampai semua media selesai dipersiapkan."
            : "Hapus item yang gagal dipersiapkan dulu.",
      );
      return;
    }
    // Snapshot tunggal: urutan, file, dan teks tidak berubah di tengah request.
    const details = detailsFromForm(form, occurredInitial);
    const plan = mediaChanged
      ? drafts.items.map((draft) =>
          draft.stored && !draft.isEdited
            ? { keep: draft.stored.url }
            : { id: draft.id, file: draft.file, dims: draft.dims },
        )
      : [];
    const pending = plan.flatMap((item) =>
      "keep" in item || !item.file || !item.dims ? [] : [{ id: item.id, file: item.file, dims: item.dims }],
    );
    if (pending.length !== plan.filter((item) => !("keep" in item)).length) {
      toast.error("Ada media yang belum siap diunggah.");
      return;
    }

    const notice = toast.loading(pending.length > 0 ? "Mengunggah media…" : "Menyimpan postingan…");
    setState(pending.length > 0 ? "uploading" : "saving");
    let finalizing = false;
    try {
      const signed = await uploads.uploadAll(pending);
      const tickets = new Map(pending.map((item, index) => [item.id, { signed: signed[index], dims: item.dims }]));
      setState("saving");
      finalizing = true;
      await postJson(
        `/api/media/${encodeURIComponent(media.id)}/edit`,
        {
          expected,
          items: mediaChanged
            ? plan.map((item) => {
                if ("keep" in item) return item;
                const upload = tickets.get(item.id)!;
                return {
                  ticket: upload.signed.ticket,
                  width: upload.dims.width,
                  height: upload.dims.height,
                };
              })
            : null,
          details,
        },
        "Postingan gagal disimpan.",
      );
      uploads.forget();
      setDirty(false);
      toast.dismiss(notice);
      toast.success("Postingan diperbarui");
      // Router cache dikosongkan agar daftar Media memuat susunan terbaru.
      router.refresh();
      goBack(adminFeatureHref("media"));
    } catch (error) {
      // Tiket ditolak permanen sudah dibersihkan server; gangguan sementara
      // tetap menyimpan file yang terkirim untuk dicoba lagi.
      if (finalizing && !isRetryableApiError(error)) uploads.forget();
      uploads.clearProgress();
      toast.dismiss(notice);
      toast.error(error instanceof Error ? error.message : "Postingan gagal disimpan.");
    } finally {
      setState("idle");
    }
  }

  useSaveShortcut(() => void save());
  useIslandActions(
    dirty || busy
      ? {
          actions: (
            <IslandSaveButton
              pending={busy}
              onClick={() => void save()}
              icon={<Save className="size-4" aria-hidden="true" />}
            >
              {state === "uploading"
                ? `${uploads.overallProgress}%`
                : state === "saving"
                  ? "Menyimpan…"
                  : "Simpan"}
            </IslandSaveButton>
          ),
        }
      : null,
  );

  const status = MEDIA_STATUS[media.status];
  const albumOptions = [
    { value: "", label: "— Tanpa album —" },
    ...albums.map((album) => ({ value: album.id, label: album.title })),
  ];

  return (
    // grid-cols-1 = minmax(0,1fr): kolom tidak melebar mengikuti konten di ponsel.
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_22rem] lg:items-start">
      <section aria-labelledby="post-media-title" className="min-w-0 space-y-3">
        <div className="flex items-center gap-2">
          <Images className="text-muted size-4" aria-hidden="true" />
          <h2 id="post-media-title" className="font-display text-subhead font-bold">
            Media
          </h2>
          <span className="text-muted text-caption1">
            · pilih item untuk edit foto, tahan &amp; geser untuk mengurutkan
          </span>
        </div>
        <MediaComposer
          drafts={drafts}
          activeIndex={activeIndex}
          onActiveIndexChange={setActiveIndex}
          onFiles={addFiles}
          onEdit={(id) => void openEditor(id)}
          editButtonRef={editButtonRef}
          uploadProgress={uploads.itemProgress}
          disabled={busy}
          editedNote="Hasil edit dipakai setelah postingan disimpan."
        />
      </section>

      <form
        ref={formRef}
        onSubmit={(event) => {
          event.preventDefault();
          void save();
        }}
        className="space-y-4 lg:sticky-below-island"
      >
        <FormSection title="Detail postingan" icon={<Info className="size-5" />}>
          <div className="flex flex-wrap items-center gap-2 text-caption1">
            <span className={cn("rounded-full px-2 py-0.5 font-bold", status.className)}>
              {status.label}
            </span>
            <span className="text-muted">
              {media.source === "admin" ? "Unggahan admin" : "Kiriman pengunjung"}
            </span>
            {media.status === "approved" && (
              <Link
                href={`/pin/${media.id}`}
                target="_blank"
                className={buttonClass({ variant: "ghost", size: "sm", className: "ml-auto -my-1 h-8" })}
              >
                <ExternalLink className="size-3.5" aria-hidden="true" /> Lihat pin
              </Link>
            )}
          </div>
          <TextField
            label="Judul"
            id="post-title"
            name="title"
            defaultValue={media.title ?? ""}
            maxLength={MEDIA_METADATA_LIMITS.title}
            placeholder="Beri judul yang menarik…"
            hint="Tampil di kartu, halaman pin, dan hasil pencarian Google."
          />
          <TextAreaField
            label="Caption / deskripsi"
            id="post-caption"
            name="caption"
            rows={4}
            defaultValue={media.caption ?? ""}
            maxLength={MEDIA_METADATA_LIMITS.caption}
            placeholder="Ceritakan konteks momen ini…"
            hint={
              media.source === "admin"
                ? `Maksimal ${MEDIA_METADATA_LIMITS.caption} karakter. Nama anggota yang disebut otomatis masuk riwayat profilnya.`
                : `Maksimal ${MEDIA_METADATA_LIMITS.caption} karakter.`
            }
          />
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1">
            <SelectField
              label="Kategori"
              id="post-category"
              name="category"
              defaultValue={media.category ?? ""}
              options={categoryOptions(MEDIA_CATEGORIES, media.category)}
            />
            <TextField
              label="Nama pengunggah"
              id="post-uploader"
              name="uploader_name"
              defaultValue={media.uploader_name ?? ""}
              maxLength={MEDIA_METADATA_LIMITS.uploaderName}
              placeholder="Anonim"
            />
          </div>
          <TextField
            label={`Tanggal momen (${timeZoneLabel()})`}
            id="post-occurred"
            name="occurred_local"
            type="datetime-local"
            defaultValue={occurredInitial}
            hint="Menentukan urutan galeri, “Kenangan hari ini”, dan grafik aktivitas anggota."
          />
          {albums.length > 0 && (
            <SelectField
              label="Album"
              id="post-album"
              name="album_id"
              defaultValue={media.album_id ?? ""}
              options={albumOptions}
            />
          )}
          <SwitchField
            name="allow_comments"
            title="Izinkan komentar"
            description="Pengunjung dapat berkomentar di halaman pin."
            defaultChecked={media.allow_comments}
          />
          {media.status === "approved" && (
            <SwitchField
              name="is_pinned"
              title="Sorotan beranda"
              description="Tampil di bagian sorotan halaman depan."
              defaultChecked={media.is_pinned}
            />
          )}
        </FormSection>
      </form>

      <DraftPhotoEditor
        drafts={drafts}
        editingId={editingId}
        onClose={() => setEditingId(null)}
        returnFocus={getEditButton}
        appliedDescription="Belum tersimpan: tekan Simpan di atas untuk memakainya."
      />
    </div>
  );
}
