"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { IMAGE_UPLOAD_ACCEPT, UPLOAD_LIMITS } from "@/lib/constants";
import {
  canEditPhoto,
  createDefaultPhotoEdit,
  dimensionsMatchDestinationFrame,
  exportPhotoForProfile,
  getPhotoEditorProfile,
  readPhotoDimensions,
  type ExportedPhoto,
  type MediaEditorDimensions,
  type PhotoAspectId,
  type PhotoEditRecipe,
  type PhotoEditorProfileId,
} from "@/lib/media-editor";
import { prepareImageFile } from "@/lib/media-formats";
import { normalizeMediaDimensions } from "@/lib/media/display";
import { validateImageFile } from "@/lib/uploads/policy";

const PREPARING_IMAGE_DRAFT_SELECTOR =
  'input[type="file"][data-image-draft-preparing="true"]';

/** Satu pemeriksaan untuk form submit biasa maupun tombol simpan kustom. */
export function hasPreparingImageDraft(
  form: HTMLFormElement | null,
): boolean {
  return Boolean(form?.querySelector(PREPARING_IMAGE_DRAFT_SELECTOR));
}

function fileNameFromUrl(url: string) {
  try {
    const segment = new URL(url, window.location.href).pathname.split("/").pop();
    return segment ? decodeURIComponent(segment) : "gambar";
  } catch {
    return "gambar";
  }
}

export interface UseImageDraftOptions {
  name: string;
  initialUrl?: string | null;
  initialDimensions?: MediaEditorDimensions | null;
  profile?: PhotoEditorProfileId;
}

/**
 * State machine tunggal untuk field gambar berbasis FormData. Ia hanya mengelola
 * draft lokal; upload dan penyimpanan tetap menjadi tanggung jawab parent form.
 */
export function useImageDraft({
  name,
  initialUrl,
  initialDimensions,
  profile,
}: UseImageDraftOptions) {
  const normalizedInitialUrl = initialUrl || null;
  const normalizedInitialDimensions = useMemo(
    () =>
      normalizeMediaDimensions(
        initialDimensions?.width,
        initialDimensions?.height,
        UPLOAD_LIMITS.mediaMaxDimension,
      ),
    [initialDimensions?.height, initialDimensions?.width],
  );
  const editorProfile = getPhotoEditorProfile(profile);
  const inputRef = useRef<HTMLInputElement>(null);
  const editButtonRef = useRef<HTMLButtonElement>(null);
  const previewObjectUrlRef = useRef<string | null>(null);
  const controllerRef = useRef<AbortController | null>(null);
  const initialUrlRef = useRef<string | null>(normalizedInitialUrl);
  const initialDimensionsRef = useRef<MediaEditorDimensions | null>(
    normalizedInitialDimensions,
  );
  const originalFileRef = useRef<File | null>(null);
  const originalDimensionsRef = useRef<MediaEditorDimensions | null>(null);
  const originalFromInputRef = useRef(false);
  const baselineFileRef = useRef<File | null>(null);
  const baselineDimensionsRef = useRef<MediaEditorDimensions | null>(null);
  const baselineAnimatedRef = useRef(false);
  const activeFileRef = useRef<File | null>(null);
  const removedRef = useRef(false);
  const preparingRef = useRef(false);

  const [originalFile, setOriginalFile] = useState<File | null>(null);
  const [activeFile, setActiveFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(
    normalizedInitialUrl,
  );
  const [dimensions, setDimensions] = useState<MediaEditorDimensions | null>(
    normalizedInitialDimensions,
  );
  const [edited, setEdited] = useState(false);
  const [removed, setRemoved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [originalAnimated, setOriginalAnimated] = useState(false);
  const [activeAnimated, setActiveAnimated] = useState(false);
  const [preparing, setPreparing] = useState(false);
  const [editorOpen, setEditorOpen] = useState(false);
  const [editorFile, setEditorFile] = useState<File | null>(null);
  const [editorDimensions, setEditorDimensions] =
    useState<MediaEditorDimensions | null>(null);
  const [editorRecipe, setEditorRecipe] =
    useState<PhotoEditRecipe | null>(null);
  const [editorAspect, setEditorAspect] = useState<PhotoAspectId | null>(null);

  const revokePreview = useCallback(() => {
    if (!previewObjectUrlRef.current) return;
    URL.revokeObjectURL(previewObjectUrlRef.current);
    previewObjectUrlRef.current = null;
  }, []);

  const showFilePreview = useCallback(
    (file: File) => {
      revokePreview();
      const url = URL.createObjectURL(file);
      previewObjectUrlRef.current = url;
      setPreviewUrl(url);
    },
    [revokePreview],
  );

  const commitActiveFile = useCallback((file: File | null) => {
    activeFileRef.current = file;
    setActiveFile(file);
  }, []);

  const commitOriginal = useCallback(
    (
      file: File | null,
      nextDimensions: MediaEditorDimensions | null,
      fromInput: boolean,
      animated = false,
    ) => {
      originalFileRef.current = file;
      originalDimensionsRef.current = nextDimensions;
      originalFromInputRef.current = Boolean(file && fromInput);
      setOriginalFile(file);
      setOriginalAnimated(Boolean(file && animated));
    },
    [],
  );

  const commitBaseline = useCallback(
    (
      file: File | null,
      nextDimensions: MediaEditorDimensions | null,
      animated = false,
    ) => {
      baselineFileRef.current = file;
      baselineDimensionsRef.current = nextDimensions;
      baselineAnimatedRef.current = Boolean(file && animated);
    },
    [],
  );

  const commitRemoved = useCallback((value: boolean) => {
    removedRef.current = value;
    setRemoved(value);
  }, []);

  const commitPreparing = useCallback((value: boolean) => {
    preparingRef.current = value;
    const input = inputRef.current;
    if (input) {
      if (value) input.dataset.imageDraftPreparing = "true";
      else delete input.dataset.imageDraftPreparing;
    }
    setPreparing(value);
  }, []);

  /** Sinkronisasi FileList adalah jalur utama; event formdata menjadi fallback. */
  const syncNativeInput = useCallback((file: File | null) => {
    const input = inputRef.current;
    if (!input) return false;
    if (!file) {
      input.value = "";
      return true;
    }
    try {
      if (typeof DataTransfer === "undefined") return false;
      const transfer = new DataTransfer();
      transfer.items.add(file);
      input.files = transfer.files;
      return input.files?.length === 1;
    } catch {
      return false;
    }
  }, []);

  const resetToUrl = useCallback(
    (
      url: string | null,
      nextDimensions: MediaEditorDimensions | null,
    ) => {
      controllerRef.current?.abort();
      controllerRef.current = null;
      revokePreview();
      commitActiveFile(null);
      commitRemoved(false);
      commitOriginal(null, null, false);
      commitBaseline(null, null);
      setPreviewUrl(url);
      setDimensions(nextDimensions);
      setEdited(false);
      setError(null);
      setNotice(null);
      setActiveAnimated(false);
      commitPreparing(false);
      setEditorOpen(false);
      setEditorFile(null);
      setEditorDimensions(null);
      setEditorRecipe(null);
      setEditorAspect(null);
      syncNativeInput(null);
    },
    [
      commitActiveFile,
      commitBaseline,
      commitOriginal,
      commitPreparing,
      commitRemoved,
      revokePreview,
      syncNativeInput,
    ],
  );

  useEffect(() => {
    const currentDimensions = initialDimensionsRef.current;
    const dimensionsChanged =
      currentDimensions?.width !== normalizedInitialDimensions?.width ||
      currentDimensions?.height !== normalizedInitialDimensions?.height;
    if (
      initialUrlRef.current === normalizedInitialUrl &&
      !dimensionsChanged
    ) {
      return;
    }
    initialUrlRef.current = normalizedInitialUrl;
    initialDimensionsRef.current = normalizedInitialDimensions;
    resetToUrl(normalizedInitialUrl, normalizedInitialDimensions);
  }, [
    normalizedInitialDimensions,
    normalizedInitialUrl,
    resetToUrl,
  ]);

  /**
   * Aset lama hanya memiliki URL. Natural size dari pratinjau menjadi metadata
   * backfill saat form disimpan, tanpa mengubah byte atau membuat crop baru.
   */
  const capturePreviewDimensions = useCallback(
    (width: number, height: number) => {
      const measured = normalizeMediaDimensions(
        width,
        height,
        UPLOAD_LIMITS.mediaMaxDimension,
      );
      if (!measured) return false;
      setDimensions((current) =>
        current?.width === measured.width && current.height === measured.height
          ? current
          : measured,
      );
      return true;
    },
    [],
  );

  useEffect(() => {
    const input = inputRef.current;
    const form = input?.form;
    if (!form) return;

    const appendActiveFile = (event: Event) => {
      const formData = (event as FormDataEvent).formData;
      const file = activeFileRef.current;
      if (removedRef.current || !file) {
        formData.delete(name);
        return;
      }
      formData.set(name, file);
    };

    const blockSubmitWhilePreparing = (event: Event) => {
      if (!preparingRef.current) return;
      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();
      setError("Tunggu sampai gambar selesai disiapkan sebelum menyimpan.");
    };

    form.addEventListener("formdata", appendActiveFile);
    form.addEventListener("submit", blockSubmitWhilePreparing, true);
    return () => {
      form.removeEventListener("formdata", appendActiveFile);
      form.removeEventListener("submit", blockSubmitWhilePreparing, true);
    };
  }, [name]);

  useEffect(
    () => () => {
      const controller = controllerRef.current;
      controllerRef.current = null;
      controller?.abort();
      revokePreview();
    },
    [revokePreview],
  );

  const selectFile = useCallback(
    async (file: File | null) => {
      if (!file) return false;

      controllerRef.current?.abort();
      const controller = new AbortController();
      controllerRef.current = controller;
      // Browser lebih dulu menaruh sumber mentah ke input. Kembalikan FileList
      // ke draft aktif sampai normalisasi selesai agar form tak pernah sempat
      // mengirim file yang belum lolos pipeline bersama.
      syncNativeInput(activeFileRef.current);
      setError(null);
      commitPreparing(true);
      setEditorOpen(false);
      setEditorFile(null);
      setEditorDimensions(null);

      try {
        const prepared = await prepareImageFile(file, controller.signal);
        const validation = validateImageFile(prepared.file);
        if (!validation.ok) throw new Error(validation.error);
        const measured = await readPhotoDimensions(
          prepared.file,
          controller.signal,
        );
        let nextFile = prepared.file;
        let nextDimensions = measured;
        let nextAnimated = prepared.animated;
        let outputAdjusted = false;
        if (canEditPhoto(prepared.file) && !prepared.animated) {
          const defaultEdit = createDefaultPhotoEdit(editorProfile, measured);
          const rendered = await exportPhotoForProfile(
            prepared.file,
            defaultEdit.recipe,
            measured,
            editorProfile,
            controller.signal,
          );
          const renderedValidation = validateImageFile(rendered.file);
          if (!renderedValidation.ok) {
            throw new Error(renderedValidation.error);
          }
          if (
            editorProfile.frame &&
            !dimensionsMatchDestinationFrame(rendered, editorProfile.frame)
          ) {
            throw new Error(
              "Gambar tidak dapat disesuaikan dengan rasio aset tujuan.",
            );
          }
          nextFile = rendered.file;
          nextDimensions = {
            width: rendered.width,
            height: rendered.height,
          };
          nextAnimated = false;
          outputAdjusted = rendered.file !== prepared.file;
        }
        if (controller.signal.aborted) return false;
        commitOriginal(prepared.file, measured, true, prepared.animated);
        commitBaseline(nextFile, nextDimensions, nextAnimated);
        commitActiveFile(nextFile);
        commitRemoved(false);
        setActiveAnimated(nextAnimated);
        setEdited(false);
        setEditorRecipe(null);
        setEditorAspect(null);
        setNotice(
          prepared.notice ??
            (outputAdjusted
              ? editorProfile.frame
                ? "Gambar disesuaikan otomatis dengan rasio tujuan."
                : "Gambar dioptimalkan tanpa mengubah rasionya."
              : null),
        );
        showFilePreview(nextFile);
        syncNativeInput(nextFile);
        setDimensions(nextDimensions);
        return true;
      } catch (cause) {
        if (controller.signal.aborted) return false;
        const message =
          cause instanceof Error
            ? cause.message
            : "Gambar tidak dapat dibaca oleh browser ini.";
        setError(message);
        // Draft valid sebelumnya tetap menjadi sumber kebenaran jika pilihan
        // baru gagal dikonversi atau dibaca.
        syncNativeInput(activeFileRef.current);
        return false;
      } finally {
        if (controllerRef.current === controller) {
          commitPreparing(false);
          controllerRef.current = null;
        }
      }
    },
    [
      commitActiveFile,
      commitBaseline,
      commitOriginal,
      commitPreparing,
      commitRemoved,
      editorProfile,
      showFilePreview,
      syncNativeInput,
    ],
  );

  const openEditor = useCallback(async () => {
    setError(null);
    const original = originalFileRef.current;
    if (original) {
      if (!canEditPhoto(original) || originalAnimated) {
        setError("Media animasi disimpan seperti aslinya dan tidak diratakan menjadi satu frame.");
        return;
      }
      setEditorFile(original);
      setEditorDimensions(originalDimensionsRef.current);
      setEditorOpen(true);
      return;
    }

    const active = activeFileRef.current;
    if (active) {
      if (!canEditPhoto(active) || activeAnimated) {
        setError("Media animasi disimpan seperti aslinya dan tidak diratakan menjadi satu frame.");
        return;
      }
      commitOriginal(active, dimensions, true, activeAnimated);
      commitBaseline(active, dimensions, activeAnimated);
      setEditorFile(active);
      setEditorDimensions(dimensions);
      setEditorOpen(true);
      return;
    }

    const url = initialUrlRef.current;
    if (!url || removedRef.current) return;
    controllerRef.current?.abort();
    const controller = new AbortController();
    controllerRef.current = controller;
    commitPreparing(true);
    try {
      const response = await fetch(url, {
        cache: "no-store",
        credentials: "omit",
        signal: controller.signal,
      });
      if (!response.ok) throw new Error("Gambar lama tidak dapat dimuat.");
      const blob = await response.blob();
      const fetchedFile = new File([blob], fileNameFromUrl(url), {
        type: blob.type,
        lastModified: Date.now(),
      });
      const prepared = await prepareImageFile(fetchedFile, controller.signal);
      const file = prepared.file;
      const validation = validateImageFile(file);
      if (!validation.ok) throw new Error(validation.error);
      if (!canEditPhoto(file) || prepared.animated) {
        throw new Error(
          "Media animasi disimpan seperti aslinya dan tidak dapat diedit.",
        );
      }
      const measured = await readPhotoDimensions(file, controller.signal);
      if (controller.signal.aborted) return;
      commitOriginal(file, measured, false, prepared.animated);
      commitBaseline(null, null);
      setActiveAnimated(prepared.animated);
      setNotice(prepared.notice);
      setEditorFile(file);
      setEditorDimensions(measured);
      setEditorOpen(true);
    } catch (cause) {
      if (controller.signal.aborted) return;
      setError(
        cause instanceof Error
          ? cause.message
          : "Gambar lama tidak dapat disiapkan untuk editor.",
      );
    } finally {
      if (controllerRef.current === controller) {
        commitPreparing(false);
        controllerRef.current = null;
      }
    }
  }, [
    activeAnimated,
    commitBaseline,
    commitOriginal,
    commitPreparing,
    dimensions,
    originalAnimated,
  ]);

  const closeEditor = useCallback(() => {
    setEditorOpen(false);
    setEditorFile(null);
    setEditorDimensions(null);
  }, []);

  const applyEdited = useCallback(
    (result: ExportedPhoto) => {
      const validation = validateImageFile(result.file);
      if (!validation.ok) {
        setError(validation.error);
        return false;
      }
      const resultDimensions = {
        width: result.width,
        height: result.height,
      };
      if (
        editorProfile.frame &&
        !dimensionsMatchDestinationFrame(
          resultDimensions,
          editorProfile.frame,
        )
      ) {
        setError("Hasil edit tidak mengikuti rasio aset tujuan.");
        return false;
      }

      setEditorRecipe(result.recipe ?? null);
      setEditorAspect(result.aspect ?? null);
      const original = originalFileRef.current;

      if (original && result.file === original) {
        setEdited(false);
        setError(null);
        setNotice(null);
        commitRemoved(false);
        if (originalFromInputRef.current) {
          const baselineFile = baselineFileRef.current ?? original;
          const baselineDimensions =
            baselineDimensionsRef.current ??
            originalDimensionsRef.current ??
            resultDimensions;
          commitActiveFile(baselineFile);
          setActiveAnimated(
            baselineFileRef.current
              ? baselineAnimatedRef.current
              : originalAnimated,
          );
          setDimensions(baselineDimensions);
          showFilePreview(baselineFile);
          syncNativeInput(baselineFile);
        } else {
          revokePreview();
          commitActiveFile(null);
          setActiveAnimated(originalAnimated);
          setDimensions(
            originalDimensionsRef.current ??
              initialDimensionsRef.current ?? {
                width: result.width,
                height: result.height,
              },
          );
          setPreviewUrl(initialUrlRef.current);
          syncNativeInput(null);
        }
        closeEditor();
        return true;
      }

      commitActiveFile(result.file);
      commitRemoved(false);
      setDimensions(resultDimensions);
      setEdited(true);
      setError(null);
      setNotice(null);
      setActiveAnimated(false);
      showFilePreview(result.file);
      syncNativeInput(result.file);
      closeEditor();
      return true;
    },
    [
      closeEditor,
      commitActiveFile,
      commitRemoved,
      editorProfile,
      revokePreview,
      showFilePreview,
      syncNativeInput,
      originalAnimated,
    ],
  );

  const restoreOriginal = useCallback(() => {
    controllerRef.current?.abort();
    controllerRef.current = null;
    setError(null);
    setNotice(null);
    commitPreparing(false);
    setEdited(false);
    setEditorRecipe(null);
    setEditorAspect(null);
    commitRemoved(false);
    closeEditor();
    const original = originalFileRef.current;
    if (original && originalFromInputRef.current) {
      const baselineFile = baselineFileRef.current ?? original;
      commitActiveFile(baselineFile);
      setActiveAnimated(
        baselineFileRef.current
          ? baselineAnimatedRef.current
          : originalAnimated,
      );
      setDimensions(
        baselineDimensionsRef.current ?? originalDimensionsRef.current,
      );
      showFilePreview(baselineFile);
      syncNativeInput(baselineFile);
      return;
    }
    revokePreview();
    commitActiveFile(null);
    setActiveAnimated(originalAnimated);
    setDimensions(
      originalDimensionsRef.current ?? initialDimensionsRef.current,
    );
    setPreviewUrl(initialUrlRef.current);
    syncNativeInput(null);
  }, [
    closeEditor,
    commitActiveFile,
    commitPreparing,
    commitRemoved,
    revokePreview,
    showFilePreview,
    syncNativeInput,
    originalAnimated,
  ]);

  const remove = useCallback(() => {
    controllerRef.current?.abort();
    controllerRef.current = null;
    revokePreview();
    commitActiveFile(null);
    commitRemoved(Boolean(initialUrlRef.current));
    commitOriginal(null, null, false);
    commitBaseline(null, null);
    setPreviewUrl(null);
    setDimensions(null);
    setEdited(false);
    setEditorRecipe(null);
    setEditorAspect(null);
    setError(null);
    setNotice(null);
    setActiveAnimated(false);
    commitPreparing(false);
    closeEditor();
    syncNativeInput(null);
  }, [
    closeEditor,
    commitActiveFile,
    commitBaseline,
    commitOriginal,
    commitPreparing,
    commitRemoved,
    revokePreview,
    syncNativeInput,
  ]);

  const editable = canEditPhoto(activeFile) && !activeAnimated;
  const canOpenEditor =
    !removed &&
    (originalFile
      ? canEditPhoto(originalFile) && !originalAnimated
      : activeFile
        ? canEditPhoto(activeFile) && !activeAnimated
        : Boolean(normalizedInitialUrl));

  return {
    inputRef,
    editButtonRef,
    accept: IMAGE_UPLOAD_ACCEPT,
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
  };
}
