import { useCallback, useEffect, useRef, useState } from "react";
import {
  canEditPhoto,
  createBoundedImagePreview,
  EDITOR_PREVIEW_MAX_DIMENSION,
  readPhotoDimensions,
  type MediaEditorDimensions,
  type ExportedPhoto,
  type PhotoAspectId,
  type PhotoEditRecipe,
} from "@/lib/media-editor";
import {
  preparePublicMediaFile,
  probePlayableMedia,
} from "@/lib/media-formats";
import { loadImageElement } from "@/lib/media/image-element";
import { descriptorFromFile, validateUploadDescriptor } from "@/lib/uploads/policy";

export type MediaDims = MediaEditorDimensions;

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
 * Satu state machine picker untuk upload publik/admin: file asli immutable,
 * file aktif dapat diganti hasil editor, dan semua Object URL dibersihkan.
 */
export function useMediaPicker() {
  const inputRef = useRef<HTMLInputElement>(null);
  const previewUrlRef = useRef("");
  const controllerRef = useRef<AbortController | null>(null);
  const generationRef = useRef(0);
  const [originalFile, setOriginalFile] = useState<File | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState("");
  const [dims, setDims] = useState<MediaDims | null>(null);
  const [originalDims, setOriginalDims] = useState<MediaDims | null>(null);
  const [isEdited, setIsEdited] = useState(false);
  const [editRecipe, setEditRecipe] = useState<PhotoEditRecipe | null>(null);
  const [editAspect, setEditAspect] = useState<PhotoAspectId | null>(null);
  const [preparing, setPreparing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [photoAnimated, setPhotoAnimated] = useState(false);

  const releasePreview = useCallback(() => {
    controllerRef.current?.abort();
    controllerRef.current = null;
    generationRef.current += 1;
    if (previewUrlRef.current) {
      URL.revokeObjectURL(previewUrlRef.current);
      previewUrlRef.current = "";
    }
  }, []);

  useEffect(() => releasePreview, [releasePreview]);

  const prepare = useCallback(
    async (nextFile: File, knownDims?: MediaDims | null) => {
      releasePreview();
      const generation = generationRef.current;
      const controller = new AbortController();
      controllerRef.current = controller;
      setPreparing(true);
      setError(null);
      setNotice(null);
      setPhotoAnimated(false);
      setPreview("");
      setDims(null);
      let candidateUrl = "";
      try {
        const prepared = await preparePublicMediaFile(
          nextFile,
          controller.signal,
        );
        const activeFile = prepared.file;
        let dimensions: MediaDims;
        if (canEditPhoto(activeFile) && !prepared.animated) {
          dimensions =
            knownDims ??
            (await readPhotoDimensions(activeFile, controller.signal));
          const bounded = await createBoundedImagePreview(activeFile, {
            maxDimension: EDITOR_PREVIEW_MAX_DIMENSION,
            sourceDimensions: dimensions,
            signal: controller.signal,
          });
          candidateUrl = URL.createObjectURL(bounded.blob);
        } else {
          candidateUrl = URL.createObjectURL(activeFile);
          dimensions =
            knownDims ??
            (await elementMetadata(activeFile, candidateUrl, controller.signal));
        }
        if (controller.signal.aborted || generation !== generationRef.current) {
          URL.revokeObjectURL(candidateUrl);
          return null;
        }
        previewUrlRef.current = candidateUrl;
        setPreview(candidateUrl);
        setDims(dimensions);
        setNotice(prepared.notice);
        setPhotoAnimated(prepared.animated);
        return { dimensions, file: activeFile };
      } catch (cause) {
        if (candidateUrl) URL.revokeObjectURL(candidateUrl);
        if (
          controller.signal.aborted ||
          generation !== generationRef.current
        ) {
          return null;
        }
        setError(
          cause instanceof Error ? cause.message : "Media tidak dapat dipersiapkan.",
        );
        return null;
      } finally {
        if (!controller.signal.aborted && generation === generationRef.current) {
          setPreparing(false);
          controllerRef.current = null;
        }
      }
    },
    [releasePreview],
  );

  async function pick(nextFile: File | null): Promise<boolean> {
    releasePreview();
    setError(null);
    setPreview("");
    setDims(null);
    setOriginalDims(null);
    setIsEdited(false);
    setEditRecipe(null);
    setEditAspect(null);
    setNotice(null);
    setPhotoAnimated(false);
    if (!nextFile) {
      setOriginalFile(null);
      setFile(null);
      setPreparing(false);
      return true;
    }
    setOriginalFile(null);
    setFile(null);
    const prepared = await prepare(nextFile);
    if (!prepared) return false;
    const policy = validateUploadDescriptor(
      descriptorFromFile("media", prepared.file),
    );
    if (!policy.ok) {
      releasePreview();
      setPreview("");
      setDims(null);
      setNotice(null);
      setError(policy.error);
      return false;
    }
    setOriginalFile(prepared.file);
    setFile(prepared.file);
    setOriginalDims(prepared.dimensions);
    return true;
  }

  function applyEdited(result: ExportedPhoto) {
    const policy = validateUploadDescriptor(
      descriptorFromFile("media", result.file),
    );
    if (!policy.ok) {
      setError(policy.error);
      return false;
    }
    const changed = result.file !== originalFile;
    setFile(result.file);
    setIsEdited(changed);
    setEditRecipe(changed ? (result.recipe ?? null) : null);
    setEditAspect(changed ? (result.aspect ?? null) : null);
    setNotice(null);
    setPhotoAnimated(false);
    void prepare(result.file, { width: result.width, height: result.height }).then(
      (prepared) => {
        if (prepared) setFile(prepared.file);
      },
    );
    return true;
  }

  function restoreOriginal() {
    if (!originalFile) return;
    setFile(originalFile);
    setIsEdited(false);
    setEditRecipe(null);
    setEditAspect(null);
    void prepare(originalFile, originalDims).then((prepared) => {
      if (prepared) setFile(prepared.file);
    });
  }

  function reset() {
    releasePreview();
    setOriginalFile(null);
    setFile(null);
    setPreview("");
    setDims(null);
    setOriginalDims(null);
    setIsEdited(false);
    setEditRecipe(null);
    setEditAspect(null);
    setNotice(null);
    setPhotoAnimated(false);
    setPreparing(false);
    setError(null);
    if (inputRef.current) inputRef.current.value = "";
  }

  return {
    inputRef,
    originalFile,
    originalDims,
    file,
    preview,
    dims,
    isEdited,
    editorFile: originalFile ?? file,
    editorDimensions: originalDims ?? dims,
    editRecipe,
    editAspect,
    canEdit: canEditPhoto(file) && !photoAnimated,
    isVideo: file?.type.startsWith("video/") ?? false,
    notice,
    photoAnimated,
    preparing,
    ready: Boolean(file && dims && !preparing && !error),
    error,
    pick,
    applyEdited,
    restoreOriginal,
    reset,
  };
}
