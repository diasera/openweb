"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import { createPortal } from "react-dom";
import {
  Eye,
  LoaderCircle,
  Redo2,
  RotateCcw,
  Undo2,
} from "lucide-react";
import {
  canEditPhoto,
  createBoundedImagePreview,
  createDefaultPhotoEdit,
  EDITOR_PREVIEW_MAX_DIMENSION,
  exportPhotoForProfile,
  findAspect,
  getPhotoEditorProfile,
  largestCenteredCrop,
  orientedDimensions,
  readPhotoDimensions,
  resolveAspectRatio,
  rotateCropClockwise,
  type ExportedPhoto,
  type MediaEditorDimensions,
  type PhotoAspectId,
  type PhotoEditRecipe,
  type PhotoEditorProfile,
  type PhotoEditorProfileId,
} from "@/lib/media-editor";
import { CropStage } from "./crop-stage";
import {
  PhotoEditorControls,
  type PhotoEditorTool,
} from "./photo-editor-controls";

export type PhotoEditorResult = ExportedPhoto;

export interface PhotoEditorProps {
  open: boolean;
  file: File | null;
  sourceDimensions?: MediaEditorDimensions | null;
  profile?: PhotoEditorProfile | PhotoEditorProfileId;
  initialRecipe?: PhotoEditRecipe | null;
  initialAspect?: PhotoAspectId | null;
  returnFocus?: () => HTMLElement | null;
  onCancel: () => void;
  onSave: (result: PhotoEditorResult) => void | Promise<void>;
}

interface EditorSnapshot {
  recipe: PhotoEditRecipe;
  aspect: PhotoAspectId;
}

const subscribeToClient = () => () => {};

function cloneRecipe(recipe: PhotoEditRecipe): PhotoEditRecipe {
  return {
    ...recipe,
    crop: { ...recipe.crop },
    adjustments: { ...recipe.adjustments },
  };
}

function cloneSnapshot(snapshot: EditorSnapshot): EditorSnapshot {
  return { aspect: snapshot.aspect, recipe: cloneRecipe(snapshot.recipe) };
}

function snapshotsEqual(left: EditorSnapshot, right: EditorSnapshot): boolean {
  return JSON.stringify(left) === JSON.stringify(right);
}

function initialSnapshot(
  profile: PhotoEditorProfile,
  dimensions: MediaEditorDimensions,
  recipe?: PhotoEditRecipe | null,
  selectedAspect?: PhotoAspectId | null,
): EditorSnapshot {
  if (recipe) {
    const aspect = findAspect(
      profile,
      selectedAspect ?? profile.initialAspect,
    );
    return { aspect: aspect.id, recipe: cloneRecipe(recipe) };
  }
  return createDefaultPhotoEdit(profile, dimensions);
}

/** Satu editor untuk seluruh cabang media; file sumber tidak pernah dimutasi. */
export function PhotoEditor(props: PhotoEditorProps) {
  const isClient = useSyncExternalStore(
    subscribeToClient,
    () => true,
    () => false,
  );
  if (!isClient || !props.open || !props.file) return null;
  const profile = getPhotoEditorProfile(props.profile);
  const sessionKey = [
    props.file.name,
    props.file.size,
    props.file.lastModified,
    profile.id,
  ].join(":");
  return (
    <PhotoEditorSession
      key={sessionKey}
      {...props}
      file={props.file}
      profile={profile}
    />
  );
}

function PhotoEditorSession({
  file,
  sourceDimensions,
  profile,
  initialRecipe,
  initialAspect,
  returnFocus,
  onCancel,
  onSave,
}: Omit<PhotoEditorProps, "open" | "file" | "profile"> & {
  file: File;
  profile: PhotoEditorProfile;
}) {
  const supported = canEditPhoto(file);
  const fallbackSnapshot = useMemo(
    () =>
      initialSnapshot(
        profile,
        sourceDimensions ?? { width: 1, height: 1 },
        initialRecipe,
        initialAspect,
      ),
    [initialAspect, initialRecipe, profile, sourceDimensions],
  );
  const [snapshot, setSnapshot] = useState<EditorSnapshot>(fallbackSnapshot);
  const [baseline, setBaseline] = useState<EditorSnapshot>(fallbackSnapshot);
  const snapshotRef = useRef(snapshot);
  const initialRef = useRef(cloneSnapshot(snapshot));
  const pastRef = useRef<EditorSnapshot[]>([]);
  const futureRef = useRef<EditorSnapshot[]>([]);
  const gestureStartRef = useRef<EditorSnapshot | null>(null);
  const [historyStatus, setHistoryStatus] = useState({ past: 0, future: 0 });
  const [activeTool, setActiveTool] = useState<PhotoEditorTool>("crop");
  const [previewUrl, setPreviewUrl] = useState("");
  const [previewSize, setPreviewSize] = useState<MediaEditorDimensions | null>(null);
  const [measuredSource, setMeasuredSource] =
    useState<MediaEditorDimensions | null>(null);
  const [preparing, setPreparing] = useState(supported);
  const [prepareError, setPrepareError] = useState<string | null>(
    supported
      ? null
      : "Editor hanya menerima foto statis yang sudah dinormalisasi.",
  );
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);
  const [comparing, setComparing] = useState(false);
  const cancelButtonRef = useRef<HTMLButtonElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);

  const replaceSnapshot = useCallback((next: EditorSnapshot) => {
    snapshotRef.current = next;
    setSnapshot(next);
  }, []);

  useEffect(() => {
    if (!supported) return;
    const controller = new AbortController();
    let objectUrl = "";
    void (async () => {
      try {
        const measured = await readPhotoDimensions(file, controller.signal).catch(
          () => sourceDimensions ?? null,
        );
        if (!measured) throw new Error("Dimensi foto tidak dapat dibaca.");
        const preview = await createBoundedImagePreview(file, {
          maxDimension: EDITOR_PREVIEW_MAX_DIMENSION,
          sourceDimensions: measured,
          signal: controller.signal,
        });
        if (controller.signal.aborted) return;
        objectUrl = URL.createObjectURL(preview.blob);
        const nextInitial = initialSnapshot(
          profile,
          { width: preview.width, height: preview.height },
          initialRecipe,
          initialAspect,
        );
        initialRef.current = cloneSnapshot(nextInitial);
        pastRef.current = [];
        futureRef.current = [];
        setBaseline(cloneSnapshot(nextInitial));
        setHistoryStatus({ past: 0, future: 0 });
        replaceSnapshot(nextInitial);
        setMeasuredSource(measured);
        setPreviewSize({ width: preview.width, height: preview.height });
        setPreviewUrl(objectUrl);
      } catch (error) {
        if (controller.signal.aborted) return;
        setPrepareError(
          error instanceof Error ? error.message : "Foto tidak dapat disiapkan.",
        );
      } finally {
        if (!controller.signal.aborted) setPreparing(false);
      }
    })();
    return () => {
      controller.abort();
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [
    file,
    initialAspect,
    initialRecipe,
    profile,
    replaceSnapshot,
    sourceDimensions,
    supported,
  ]);

  const dirty = !snapshotsEqual(snapshot, baseline);

  const undo = useCallback(() => {
    const previous = pastRef.current.at(-1);
    if (!previous) return;
    gestureStartRef.current = null;
    pastRef.current = pastRef.current.slice(0, -1);
    futureRef.current = [
      cloneSnapshot(snapshotRef.current),
      ...futureRef.current.slice(0, 39),
    ];
    replaceSnapshot(cloneSnapshot(previous));
    setHistoryStatus({
      past: pastRef.current.length,
      future: futureRef.current.length,
    });
  }, [replaceSnapshot]);

  const redo = useCallback(() => {
    const next = futureRef.current[0];
    if (!next) return;
    gestureStartRef.current = null;
    futureRef.current = futureRef.current.slice(1);
    pastRef.current = [
      ...pastRef.current.slice(-39),
      cloneSnapshot(snapshotRef.current),
    ];
    replaceSnapshot(cloneSnapshot(next));
    setHistoryStatus({
      past: pastRef.current.length,
      future: futureRef.current.length,
    });
  }, [replaceSnapshot]);

  const cancel = useCallback(() => {
    if (exporting) return;
    if (dirty && !window.confirm("Buang semua perubahan pada foto ini?")) return;
    onCancel();
  }, [dirty, exporting, onCancel]);

  useEffect(() => {
    const fallbackFocus =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;
    const previousOverflow = document.body.style.overflow;
    const dialog = dialogRef.current;
    const background = Array.from(document.body.children)
      .filter(
        (element): element is HTMLElement =>
          element instanceof HTMLElement &&
          element !== dialog &&
          !element.contains(dialog),
      )
      .map((element) => ({
        element,
        inert: element.hasAttribute("inert"),
        ariaHidden: element.getAttribute("aria-hidden"),
      }));

    document.body.style.overflow = "hidden";
    background.forEach(({ element }) => {
      element.setAttribute("inert", "");
      element.setAttribute("aria-hidden", "true");
    });
    cancelButtonRef.current?.focus();

    return () => {
      document.body.style.overflow = previousOverflow;
      background.forEach(({ element, inert, ariaHidden }) => {
        if (inert) element.setAttribute("inert", "");
        else element.removeAttribute("inert");
        if (ariaHidden === null) element.removeAttribute("aria-hidden");
        else element.setAttribute("aria-hidden", ariaHidden);
      });
      let frames = 60;
      const restore = () => {
        const target = returnFocus?.() ?? fallbackFocus;
        if (target?.isConnected && !target.matches(":disabled")) {
          target.focus({ preventScroll: true });
          return;
        }
        frames -= 1;
        if (frames > 0) window.requestAnimationFrame(restore);
      };
      window.requestAnimationFrame(restore);
    };
  }, [returnFocus]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        // Editor dapat hidup di atas Modal admin; hentikan Escape di lapisan
        // teratas agar dialog induk tidak ikut tertutup.
        event.preventDefault();
        event.stopPropagation();
        event.stopImmediatePropagation();
        cancel();
        return;
      }
      if (event.key === "Tab") {
        const focusable = dialogRef.current?.querySelectorAll<HTMLElement>(
          'button:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])',
        );
        if (focusable?.length) {
          const first = focusable[0];
          const last = focusable[focusable.length - 1];
          if (event.shiftKey && document.activeElement === first) {
            event.preventDefault();
            last.focus();
          } else if (!event.shiftKey && document.activeElement === last) {
            event.preventDefault();
            first.focus();
          }
        }
      }
      if (!(event.ctrlKey || event.metaKey) || event.key.toLowerCase() !== "z") {
        return;
      }
      event.preventDefault();
      if (event.shiftKey) redo();
      else undo();
    };
    window.addEventListener("keydown", onKeyDown, true);
    return () => window.removeEventListener("keydown", onKeyDown, true);
  }, [cancel, redo, undo]);

  function beginGesture() {
    if (!gestureStartRef.current) {
      gestureStartRef.current = cloneSnapshot(snapshotRef.current);
    }
  }

  function endGesture() {
    const before = gestureStartRef.current;
    gestureStartRef.current = null;
    if (!before || snapshotsEqual(before, snapshotRef.current)) return;
    pastRef.current = [...pastRef.current.slice(-39), before];
    futureRef.current = [];
    setHistoryStatus({
      past: pastRef.current.length,
      future: futureRef.current.length,
    });
  }

  function updateContinuous(
    update: (current: EditorSnapshot) => EditorSnapshot,
  ) {
    replaceSnapshot(update(snapshotRef.current));
  }

  function updateDiscrete(update: (current: EditorSnapshot) => EditorSnapshot) {
    endGesture();
    const before = cloneSnapshot(snapshotRef.current);
    const next = update(snapshotRef.current);
    if (snapshotsEqual(before, next)) return;
    pastRef.current = [...pastRef.current.slice(-39), before];
    futureRef.current = [];
    replaceSnapshot(next);
    setHistoryStatus({
      past: pastRef.current.length,
      future: futureRef.current.length,
    });
  }

  function resetEdits() {
    updateDiscrete(() => cloneSnapshot(initialRef.current));
  }

  function changeAspect(nextAspect: PhotoAspectId) {
    if (!previewSize) return;
    updateDiscrete((current) => {
      const option = findAspect(profile, nextAspect);
      const dimensions = orientedDimensions(previewSize, current.recipe.rotation);
      const ratio = resolveAspectRatio(
        option,
        previewSize,
        current.recipe.rotation,
      );
      return {
        ...current,
        aspect: option.id,
        recipe: {
          ...current.recipe,
          crop: largestCenteredCrop(
            ratio,
            dimensions.width / dimensions.height,
          ),
        },
      };
    });
  }

  function rotate() {
    if (!previewSize) return;
    updateDiscrete((current) => {
      const nextRotation = (current.recipe.rotation + 90) % 360;
      const option = findAspect(profile, current.aspect);
      const ratio = resolveAspectRatio(option, previewSize, nextRotation);
      const dimensions = orientedDimensions(previewSize, nextRotation);
      return {
        ...current,
        recipe: {
          ...current.recipe,
          rotation: nextRotation,
          crop:
            ratio === null
              ? rotateCropClockwise(current.recipe.crop)
              : largestCenteredCrop(
                  ratio,
                  dimensions.width / dimensions.height,
                ),
        },
      };
    });
  }

  async function save() {
    if (!measuredSource || exporting) return;
    endGesture();
    setExporting(true);
    setExportError(null);
    try {
      const recipe = snapshotRef.current.recipe;
      const rendered = await exportPhotoForProfile(
        file,
        recipe,
        measuredSource,
        profile,
      );
      await onSave({
        ...rendered,
        recipe: cloneRecipe(recipe),
        aspect: snapshotRef.current.aspect,
      });
    } catch (error) {
      setExportError(
        error instanceof Error ? error.message : "Hasil edit gagal disimpan.",
      );
    } finally {
      setExporting(false);
    }
  }

  const selectedAspect = findAspect(profile, snapshot.aspect);
  const aspectRatio = previewSize
    ? resolveAspectRatio(
        selectedAspect,
        previewSize,
        snapshot.recipe.rotation,
      )
    : null;
  const hasPast = historyStatus.past > 0;
  const hasFuture = historyStatus.future > 0;

  return createPortal(
    <div
      ref={dialogRef}
      className="fixed inset-0 z-[100] flex h-[100dvh] min-h-0 flex-col overflow-hidden bg-[#050505] text-white animate-fade-in"
      role="dialog"
      aria-modal="true"
      aria-label="Edit foto"
    >
      <header
        className="flex min-h-16 shrink-0 items-center gap-2 border-b border-white/10 px-4 pb-2"
        style={{ paddingTop: "max(0.5rem, var(--safe-top))" }}
      >
        <button
          ref={cancelButtonRef}
          type="button"
          onClick={cancel}
          disabled={exporting}
          className="min-h-11 min-w-[4.5rem] text-left text-[15px] font-medium text-white/80 transition active:opacity-60 disabled:opacity-40"
        >
          Batal
        </button>
        <div className="min-w-0 flex-1 text-center">
          <p className="truncate text-[15px] font-semibold">Edit Foto</p>
          <p className="text-[11px] text-white/40">
            {selectedAspect.label} · {Math.round(snapshot.recipe.straighten * 10) / 10}°
          </p>
        </div>
        <button
          type="button"
          onClick={() => void save()}
          disabled={!previewUrl || preparing || exporting}
          className="min-h-11 min-w-[4.5rem] text-right text-[15px] font-semibold text-[#59a7ff] transition active:opacity-60 disabled:opacity-40"
        >
          {exporting ? (
            <LoaderCircle className="ml-auto h-5 w-5 animate-spin" />
          ) : (
            "Selesai"
          )}
        </button>
      </header>

      <main className="relative min-h-0 flex-1 overflow-hidden">
        {preparing && (
          <div className="absolute inset-0 grid place-items-center" role="status">
            <span className="flex flex-col items-center gap-3 text-sm text-white/65">
              <LoaderCircle className="h-7 w-7 animate-spin" />
              Menyiapkan pratinjau ringan…
            </span>
          </div>
        )}
        {prepareError && (
          <div className="absolute inset-0 grid place-items-center px-8 text-center">
            <div>
              <p className="font-semibold">Foto tidak dapat diedit</p>
              <p className="mt-2 text-sm leading-relaxed text-white/60">
                {prepareError}
              </p>
            </div>
          </div>
        )}
        {previewUrl && previewSize && (
          <CropStage
            previewUrl={previewUrl}
            dimensions={previewSize}
            recipe={snapshot.recipe}
            crop={snapshot.recipe.crop}
            aspectRatio={aspectRatio}
            comparing={comparing}
            disabled={activeTool !== "crop" || exporting}
            onGestureStart={beginGesture}
            onCropChange={(crop) =>
              updateContinuous((current) => ({
                ...current,
                recipe: { ...current.recipe, crop },
              }))
            }
            onGestureEnd={endGesture}
          />
        )}

        {previewUrl && (
          <button
            type="button"
            onPointerDown={() => setComparing(true)}
            onPointerUp={() => setComparing(false)}
            onPointerCancel={() => setComparing(false)}
            onPointerLeave={() => setComparing(false)}
            onKeyDown={(event) => {
              if (event.key === " " || event.key === "Enter") setComparing(true);
            }}
            onKeyUp={() => setComparing(false)}
            className="absolute left-3 top-3 z-20 flex h-11 items-center gap-2 rounded-full bg-black/55 px-3 text-xs font-medium backdrop-blur-xl active:scale-95"
            aria-label="Tahan untuk melihat foto asli"
          >
            <Eye className="h-4 w-4" /> Asli
          </button>
        )}
      </main>

      <footer
        className="shrink-0 border-t border-white/10 bg-[#111]/95 backdrop-blur-xl"
        style={{ paddingBottom: "max(0.35rem, var(--safe-bottom))" }}
      >
        <div className="mx-auto flex max-w-2xl items-center justify-center gap-2 px-4 pt-2">
          <button
            type="button"
            onClick={undo}
            disabled={!hasPast || exporting}
            className="grid h-11 w-11 place-items-center rounded-full bg-white/10 active:scale-95 disabled:opacity-30"
            aria-label="Urungkan"
          >
            <Undo2 className="h-5 w-5" />
          </button>
          <button
            type="button"
            onClick={redo}
            disabled={!hasFuture || exporting}
            className="grid h-11 w-11 place-items-center rounded-full bg-white/10 active:scale-95 disabled:opacity-30"
            aria-label="Ulangi"
          >
            <Redo2 className="h-5 w-5" />
          </button>
          <button
            type="button"
            onClick={resetEdits}
            disabled={!dirty || exporting}
            className="flex h-11 items-center gap-2 rounded-full bg-white/10 px-4 text-xs font-medium active:scale-95 disabled:opacity-30"
          >
            <RotateCcw className="h-4 w-4" /> Atur ulang
          </button>
        </div>
        {exportError && (
          <p className="px-4 pt-2 text-center text-xs text-red-300" role="alert">
            {exportError}
          </p>
        )}
        {previewUrl && (
          <PhotoEditorControls
            activeTool={activeTool}
            profile={profile}
            aspect={snapshot.aspect}
            previewUrl={previewUrl}
            recipe={snapshot.recipe}
            onActiveToolChange={setActiveTool}
            onAspectChange={changeAspect}
            onRotate={rotate}
            onDiscreteRecipe={(update) =>
              updateDiscrete((current) => ({
                ...current,
                recipe: update(current.recipe),
              }))
            }
            onContinuousRecipe={(update) =>
              updateContinuous((current) => ({
                ...current,
                recipe: update(current.recipe),
              }))
            }
            onGestureStart={beginGesture}
            onGestureEnd={endGesture}
          />
        )}
      </footer>
    </div>,
    document.body,
  );
}
