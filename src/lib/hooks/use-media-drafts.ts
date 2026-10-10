import { useCallback, useEffect, useRef, useState } from "react";
import {
  canEditPhoto,
  canEditPhotoMime,
  createBoundedImagePreview,
  EDITOR_PREVIEW_MAX_DIMENSION,
  readPhotoDimensions,
  type ExportedPhoto,
  type MediaEditorDimensions,
  type PhotoAspectId,
  type PhotoEditRecipe,
} from "@/lib/media-editor";
import {
  preparePublicMediaFile,
  prepareRemoteImage,
  probePlayableMedia,
} from "@/lib/media-formats";
import { loadImageElement } from "@/lib/media/image-element";
import type { StoredMediaSource } from "@/lib/media/slides";
import { descriptorFromFile, validateUploadDescriptor } from "@/lib/uploads/policy";
import { mapWithConcurrency } from "@/lib/utils/concurrency";

export type MediaDims = MediaEditorDimensions;

/** Persiapan HEIC/preview berat di ponsel; dua sekaligus tetap responsif. */
const PREPARE_CONCURRENCY = 2;

export interface MediaDraft {
  id: string;
  status: "preparing" | "ready" | "error";
  /** Item lama pin (Edit postingan); `null` untuk file yang baru dipilih. Berkasnya baru diunduh saat diedit. */
  stored: StoredMediaSource | null;
  /** File hasil normalisasi sebelum diedit; sumber editor dan "Pulihkan". */
  originalFile: File | null;
  originalDims: MediaDims | null;
  /** File aktif yang akan diunggah (bisa hasil editor). */
  file: File | null;
  dims: MediaDims | null;
  preview: string;
  isVideo: boolean;
  canEdit: boolean;
  isEdited: boolean;
  editRecipe: PhotoEditRecipe | null;
  editAspect: PhotoAspectId | null;
  notice: string | null;
  error: string | null;
}

interface PreparedFile {
  file: File;
  dims: MediaDims;
  preview: string;
  notice: string | null;
  animated: boolean;
}

async function elementMetadata(
  file: File,
  url: string,
  signal: AbortSignal,
): Promise<MediaDims> {
  if (file.type.startsWith("video/")) {
    const metadata = await probePlayableMedia(file, "video", signal);
    if (!metadata.width || !metadata.height) {
      throw new Error("Metadata video tidak dapat dibaca.");
    }
    return { width: metadata.width, height: metadata.height };
  }

  const image = await loadImageElement(url, {
    signal,
    errorMessage: "Foto tidak dapat dibaca oleh browser ini.",
  });
  const dimensions = {
    width: image.naturalWidth,
    height: image.naturalHeight,
  };
  image.src = "";
  return dimensions;
}

/**
 * Normalisasi satu file (HEIC → JPEG, cek animasi), baca dimensi, buat
 * preview ringan, lalu validasi kebijakan upload yang sama dengan server.
 */
async function prepareFile(
  source: File,
  signal: AbortSignal,
  knownDims?: MediaDims | null,
): Promise<PreparedFile> {
  const prepared = await preparePublicMediaFile(source, signal);
  const file = prepared.file;
  let preview = "";
  try {
    let dims: MediaDims;
    if (canEditPhoto(file) && !prepared.animated) {
      dims = knownDims ?? (await readPhotoDimensions(file, signal));
      const bounded = await createBoundedImagePreview(file, {
        maxDimension: EDITOR_PREVIEW_MAX_DIMENSION,
        sourceDimensions: dims,
        signal,
      });
      preview = URL.createObjectURL(bounded.blob);
    } else {
      preview = URL.createObjectURL(file);
      dims = knownDims ?? (await elementMetadata(file, preview, signal));
    }
    const policy = validateUploadDescriptor(descriptorFromFile("media", file));
    if (!policy.ok) throw new Error(policy.error);
    return { file, dims, preview, notice: prepared.notice, animated: prepared.animated };
  } catch (error) {
    if (preview) URL.revokeObjectURL(preview);
    throw error;
  }
}

function emptyDraft(id: string): MediaDraft {
  return {
    id,
    status: "preparing",
    stored: null,
    originalFile: null,
    originalDims: null,
    file: null,
    dims: null,
    preview: "",
    isVideo: false,
    canEdit: false,
    isEdited: false,
    editRecipe: null,
    editAspect: null,
    notice: null,
    error: null,
  };
}

/** Draft siap pakai dari item tersimpan; preview langsung memakai URL-nya. */
function storedDraft(stored: StoredMediaSource): MediaDraft {
  const dims =
    stored.width && stored.height ? { width: stored.width, height: stored.height } : null;
  return {
    ...emptyDraft(crypto.randomUUID()),
    status: "ready",
    stored,
    originalDims: dims,
    dims,
    preview: stored.readUrl,
    isVideo: stored.type === "video",
    canEdit: stored.type === "photo" && canEditPhotoMime(stored.mimeType),
  };
}

/** Preview milik draft yang dibuat lewat createObjectURL (bukan URL storage). */
function revokePreview(url: string) {
  if (url.startsWith("blob:")) URL.revokeObjectURL(url);
}

/**
 * State machine banyak media untuk Buat Pin dan Edit postingan (carousel): tiap
 * draft punya file asli immutable, file aktif yang bisa diganti hasil editor,
 * preview Object URL yang selalu dibersihkan, serta urutan yang bisa diatur
 * ulang. `initial` mengisi item lama sebuah pin; berkasnya diunduh saat diedit.
 */
export function useMediaDrafts(max: number, initial: readonly StoredMediaSource[] = []) {
  const [items, setItems] = useState<MediaDraft[]>(() => initial.map(storedDraft));
  const itemsRef = useRef<MediaDraft[]>(items);
  const controllersRef = useRef(new Map<string, AbortController>());

  const commit = useCallback((next: (current: MediaDraft[]) => MediaDraft[]) => {
    itemsRef.current = next(itemsRef.current);
    setItems(itemsRef.current);
  }, []);

  const patch = useCallback(
    (id: string, update: Partial<MediaDraft>) => {
      commit((current) =>
        current.map((draft) => {
          if (draft.id !== id) return draft;
          if (update.preview !== undefined && draft.preview && draft.preview !== update.preview) {
            revokePreview(draft.preview);
          }
          return { ...draft, ...update };
        }),
      );
    },
    [commit],
  );

  const release = useCallback((draft: MediaDraft) => {
    controllersRef.current.get(draft.id)?.abort();
    controllersRef.current.delete(draft.id);
    if (draft.preview) revokePreview(draft.preview);
  }, []);

  useEffect(
    () => () => {
      itemsRef.current.forEach(release);
    },
    [release],
  );

  /** Siapkan ulang file aktif; hasil lama dibuang bila draft sudah berubah. */
  const prepareDraft = useCallback(
    async (id: string, source: File, knownDims?: MediaDims | null) => {
      controllersRef.current.get(id)?.abort();
      const controller = new AbortController();
      controllersRef.current.set(id, controller);
      patch(id, { status: "preparing", error: null });
      try {
        const prepared = await prepareFile(source, controller.signal, knownDims);
        if (controller.signal.aborted || !itemsRef.current.some((d) => d.id === id)) {
          URL.revokeObjectURL(prepared.preview);
          return null;
        }
        patch(id, {
          status: "ready",
          file: prepared.file,
          dims: prepared.dims,
          preview: prepared.preview,
          isVideo: prepared.file.type.startsWith("video/"),
          canEdit: canEditPhoto(prepared.file) && !prepared.animated,
          notice: prepared.notice,
        });
        return prepared;
      } catch (cause) {
        if (controller.signal.aborted) return null;
        patch(id, {
          status: "error",
          error: cause instanceof Error ? cause.message : "Media tidak dapat dipersiapkan.",
        });
        return null;
      } finally {
        if (controllersRef.current.get(id) === controller) {
          controllersRef.current.delete(id);
        }
      }
    },
    [patch],
  );

  /**
   * Tambah file sampai batas carousel; sisanya dilaporkan agar UI memberi
   * tahu. Draft langsung tampil, persiapan berjalan di `prepared`.
   */
  const add = useCallback(
    (files: readonly File[]) => {
      const room = Math.max(0, max - itemsRef.current.length);
      const accepted = files.slice(0, room);
      const drafts = accepted.map(() => emptyDraft(crypto.randomUUID()));
      commit((current) => [...current, ...drafts]);
      const prepared = mapWithConcurrency(drafts, PREPARE_CONCURRENCY, async (draft, index) => {
        const result = await prepareDraft(draft.id, accepted[index]);
        if (result) {
          patch(draft.id, { originalFile: result.file, originalDims: result.dims });
        }
      }).then(() => undefined);
      return {
        added: drafts.length,
        skipped: files.length - accepted.length,
        prepared,
      };
    },
    [commit, max, patch, prepareDraft],
  );

  const remove = useCallback(
    (id: string) => {
      const draft = itemsRef.current.find((item) => item.id === id);
      if (draft) release(draft);
      commit((current) => current.filter((item) => item.id !== id));
    },
    [commit, release],
  );

  const move = useCallback(
    (id: string, toIndex: number) => {
      commit((current) => {
        const from = current.findIndex((item) => item.id === id);
        const to = Math.min(current.length - 1, Math.max(0, toIndex));
        if (from === -1 || from === to) return current;
        const next = [...current];
        const [draft] = next.splice(from, 1);
        next.splice(to, 0, draft);
        return next;
      });
    },
    [commit],
  );

  const applyEdited = useCallback(
    (id: string, result: ExportedPhoto) => {
      const draft = itemsRef.current.find((item) => item.id === id);
      if (!draft) return false;
      const policy = validateUploadDescriptor(descriptorFromFile("media", result.file));
      if (!policy.ok) {
        patch(id, { error: policy.error });
        return false;
      }
      const changed = result.file !== draft.originalFile;
      patch(id, {
        file: result.file,
        isEdited: changed,
        editRecipe: changed ? (result.recipe ?? null) : null,
        editAspect: changed ? (result.aspect ?? null) : null,
        notice: null,
      });
      void prepareDraft(id, result.file, { width: result.width, height: result.height });
      return true;
    },
    [patch, prepareDraft],
  );

  const restoreOriginal = useCallback(
    (id: string) => {
      const draft = itemsRef.current.find((item) => item.id === id);
      if (!draft) return;
      if (draft.stored) {
        // Item lama kembali menunjuk berkas tersimpan: tidak ada yang diunggah.
        controllersRef.current.get(id)?.abort();
        const stored = storedDraft(draft.stored);
        patch(id, {
          status: "ready",
          file: null,
          dims: stored.dims,
          preview: stored.preview,
          isEdited: false,
          editRecipe: null,
          editAspect: null,
          notice: null,
          error: null,
        });
        return;
      }
      if (!draft.originalFile) return;
      patch(id, { isEdited: false, editRecipe: null, editAspect: null });
      void prepareDraft(id, draft.originalFile, draft.originalDims);
    },
    [patch, prepareDraft],
  );

  /**
   * Pastikan draft punya berkas asli untuk PhotoEditor. Item tersimpan
   * diunduh sekali (signed URL bila pin belum terbit). Mengembalikan pesan
   * galat, atau `null` bila editor siap dibuka.
   */
  const prepareEdit = useCallback(
    async (id: string): Promise<string | null> => {
      const draft = itemsRef.current.find((item) => item.id === id);
      if (!draft) return "Item tidak ditemukan.";
      if (draft.originalFile || !draft.stored) {
        return draft.originalFile ?? draft.file ? null : "Media belum siap diedit.";
      }
      controllersRef.current.get(id)?.abort();
      const controller = new AbortController();
      controllersRef.current.set(id, controller);
      patch(id, { status: "preparing", error: null });
      try {
        const prepared = await prepareRemoteImage(draft.stored.readUrl, {
          signal: controller.signal,
          fallbackName: `foto-${id}`,
          errorMessage: "Foto asli tidak dapat dimuat.",
        });
        if (!canEditPhoto(prepared.file) || prepared.animated) {
          patch(id, { status: "ready", canEdit: false });
          return "Media animasi dipertahankan seperti aslinya dan tidak dapat diedit.";
        }
        const dims = await readPhotoDimensions(prepared.file, controller.signal);
        patch(id, { status: "ready", originalFile: prepared.file, originalDims: dims });
        return null;
      } catch (cause) {
        // Gagal unduh tidak merusak item: berkas tersimpan tetap dipakai.
        if (itemsRef.current.some((item) => item.id === id)) patch(id, { status: "ready" });
        if (controller.signal.aborted) return "Persiapan editor dibatalkan.";
        return cause instanceof Error ? cause.message : "Foto asli tidak dapat dimuat.";
      } finally {
        if (controllersRef.current.get(id) === controller) {
          controllersRef.current.delete(id);
        }
      }
    },
    [patch],
  );

  const reset = useCallback(() => {
    itemsRef.current.forEach(release);
    commit(() => []);
  }, [commit, release]);

  return {
    items,
    max,
    full: items.length >= max,
    preparing: items.some((draft) => draft.status === "preparing"),
    ready: items.length > 0 && items.every((draft) => draft.status === "ready"),
    add,
    remove,
    move,
    applyEdited,
    restoreOriginal,
    prepareEdit,
    reset,
  };
}

export type MediaDrafts = ReturnType<typeof useMediaDrafts>;
