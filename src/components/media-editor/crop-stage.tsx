"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
  type PointerEvent as ReactPointerEvent,
} from "react";
import {
  buildPhotoFilter,
  coverScaleForStraighten,
  moveCropRect,
  normalizedCropAspect,
  resizeCropRect,
  type CropHandle,
  type CropRect,
  type PhotoEditRecipe,
} from "@/lib/media-editor";

interface CropStageProps {
  previewUrl: string;
  dimensions: { width: number; height: number };
  recipe: PhotoEditRecipe;
  crop: CropRect;
  /** Rasio output pixel. Geometry mengubahnya ke rasio normalized image-box. */
  aspectRatio: number | null;
  comparing: boolean;
  disabled?: boolean;
  onGestureStart: () => void;
  onCropChange: (rect: CropRect) => void;
  onGestureEnd: () => void;
}

interface SurfaceSize {
  width: number;
  height: number;
}

interface DragSession {
  pointerId: number;
  handle: CropHandle;
  startClientX: number;
  startClientY: number;
  startCrop: CropRect;
  lastCrop: CropRect;
  boxWidth: number;
  boxHeight: number;
  normalizedAspect: number | null;
}

interface HandleDefinition {
  id: Exclude<CropHandle, "move">;
  label: string;
  cursor: string;
  visual: string;
  position: (crop: CropRect) => { left: string; top: string };
}

const STAGE_GUTTER = 24;
const KEYBOARD_STEP = 0.005;

const HANDLES: readonly HandleDefinition[] = [
  {
    id: "nw",
    label: "Ubah ukuran dari sudut kiri atas",
    cursor: "cursor-nwse-resize",
    visual: "h-5 w-5 border-l-2 border-t-2",
    position: (crop) => ({ left: `${crop.x * 100}%`, top: `${crop.y * 100}%` }),
  },
  {
    id: "n",
    label: "Ubah batas atas",
    cursor: "cursor-ns-resize",
    visual: "h-0.5 w-7 bg-white",
    position: (crop) => ({
      left: `${(crop.x + crop.width / 2) * 100}%`,
      top: `${crop.y * 100}%`,
    }),
  },
  {
    id: "ne",
    label: "Ubah ukuran dari sudut kanan atas",
    cursor: "cursor-nesw-resize",
    visual: "h-5 w-5 border-r-2 border-t-2",
    position: (crop) => ({
      left: `${(crop.x + crop.width) * 100}%`,
      top: `${crop.y * 100}%`,
    }),
  },
  {
    id: "e",
    label: "Ubah batas kanan",
    cursor: "cursor-ew-resize",
    visual: "h-7 w-0.5 bg-white",
    position: (crop) => ({
      left: `${(crop.x + crop.width) * 100}%`,
      top: `${(crop.y + crop.height / 2) * 100}%`,
    }),
  },
  {
    id: "se",
    label: "Ubah ukuran dari sudut kanan bawah",
    cursor: "cursor-nwse-resize",
    visual: "h-5 w-5 border-b-2 border-r-2",
    position: (crop) => ({
      left: `${(crop.x + crop.width) * 100}%`,
      top: `${(crop.y + crop.height) * 100}%`,
    }),
  },
  {
    id: "s",
    label: "Ubah batas bawah",
    cursor: "cursor-ns-resize",
    visual: "h-0.5 w-7 bg-white",
    position: (crop) => ({
      left: `${(crop.x + crop.width / 2) * 100}%`,
      top: `${(crop.y + crop.height) * 100}%`,
    }),
  },
  {
    id: "sw",
    label: "Ubah ukuran dari sudut kiri bawah",
    cursor: "cursor-nesw-resize",
    visual: "h-5 w-5 border-b-2 border-l-2",
    position: (crop) => ({
      left: `${crop.x * 100}%`,
      top: `${(crop.y + crop.height) * 100}%`,
    }),
  },
  {
    id: "w",
    label: "Ubah batas kiri",
    cursor: "cursor-ew-resize",
    visual: "h-7 w-0.5 bg-white",
    position: (crop) => ({
      left: `${crop.x * 100}%`,
      top: `${(crop.y + crop.height / 2) * 100}%`,
    }),
  },
];

function sameCrop(left: CropRect, right: CropRect): boolean {
  return (
    left.x === right.x &&
    left.y === right.y &&
    left.width === right.width &&
    left.height === right.height
  );
}

function arrowDelta(event: ReactKeyboardEvent<HTMLElement>) {
  const step = KEYBOARD_STEP * (event.shiftKey ? 5 : 1);
  if (event.key === "ArrowLeft") return { x: -step, y: 0 };
  if (event.key === "ArrowRight") return { x: step, y: 0 };
  if (event.key === "ArrowUp") return { x: 0, y: -step };
  if (event.key === "ArrowDown") return { x: 0, y: step };
  return null;
}

/**
 * Stage crop DOM-only. Image mengikuti pipeline exporter (orientasi utama,
 * straighten auto-cover, lalu flip), sementara pointer hanya mengubah rect
 * normalized sehingga tidak ada canvas/raster ulang saat gesture bergerak.
 */
export function CropStage({
  previewUrl,
  dimensions,
  recipe,
  crop,
  aspectRatio,
  comparing,
  disabled = false,
  onGestureStart,
  onCropChange,
  onGestureEnd,
}: CropStageProps) {
  const surfaceRef = useRef<HTMLDivElement>(null);
  const boxRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<DragSession | null>(null);
  const gestureEndRef = useRef(onGestureEnd);
  const [surfaceSize, setSurfaceSize] = useState<SurfaceSize>({
    width: 0,
    height: 0,
  });
  const [gesturing, setGesturing] = useState(false);

  useEffect(() => {
    gestureEndRef.current = onGestureEnd;
  }, [onGestureEnd]);

  useEffect(() => {
    const surface = surfaceRef.current;
    if (!surface) return;

    const updateSize = () => {
      const rect = surface.getBoundingClientRect();
      const next = {
        width: Math.max(0, rect.width),
        height: Math.max(0, rect.height),
      };
      setSurfaceSize((current) =>
        current.width === next.width && current.height === next.height
          ? current
          : next,
      );
    };

    updateSize();
    if (typeof ResizeObserver === "undefined") {
      window.addEventListener("resize", updateSize);
      return () => window.removeEventListener("resize", updateSize);
    }

    const observer = new ResizeObserver(updateSize);
    observer.observe(surface);
    return () => observer.disconnect();
  }, []);

  useEffect(
    () => () => {
      if (dragRef.current) gestureEndRef.current();
    },
    [],
  );

  useEffect(() => {
    if ((!disabled && !comparing) || !dragRef.current) return;
    dragRef.current = null;
    setGesturing(false);
    onGestureEnd();
  }, [comparing, disabled, onGestureEnd]);

  const geometry = useMemo(() => {
    const sourceWidth = Math.max(1, dimensions.width);
    const sourceHeight = Math.max(1, dimensions.height);
    const quarterTurn = Math.abs(Math.round(recipe.rotation / 90)) % 2 === 1;
    const orientedWidth = quarterTurn ? sourceHeight : sourceWidth;
    const orientedHeight = quarterTurn ? sourceWidth : sourceHeight;
    const availableWidth = Math.max(1, surfaceSize.width - STAGE_GUTTER * 2);
    const availableHeight = Math.max(1, surfaceSize.height - STAGE_GUTTER * 2);
    const scale = Math.min(
      availableWidth / orientedWidth,
      availableHeight / orientedHeight,
    );
    const boxWidth = Math.max(1, orientedWidth * scale);
    const boxHeight = Math.max(1, orientedHeight * scale);

    return {
      boxWidth,
      boxHeight,
      orientedWidth,
      orientedHeight,
      sourceRenderWidth: quarterTurn ? boxHeight : boxWidth,
      sourceRenderHeight: quarterTurn ? boxWidth : boxHeight,
      coverScale: coverScaleForStraighten(
        orientedWidth,
        orientedHeight,
        recipe.straighten,
      ),
      normalizedAspect:
        aspectRatio === null
          ? null
          : normalizedCropAspect(
              aspectRatio,
              orientedWidth / orientedHeight,
            ),
    };
  }, [aspectRatio, dimensions, recipe.rotation, recipe.straighten, surfaceSize]);

  function beginPointerGesture(
    event: ReactPointerEvent<HTMLElement>,
    handle: CropHandle,
  ) {
    if (
      disabled ||
      comparing ||
      dragRef.current ||
      (event.pointerType === "mouse" && event.button !== 0)
    ) {
      return;
    }
    const box = boxRef.current?.getBoundingClientRect();
    if (!box || box.width <= 0 || box.height <= 0) return;

    event.preventDefault();
    event.stopPropagation();
    event.currentTarget.setPointerCapture(event.pointerId);
    dragRef.current = {
      pointerId: event.pointerId,
      handle,
      startClientX: event.clientX,
      startClientY: event.clientY,
      startCrop: { ...crop },
      lastCrop: { ...crop },
      boxWidth: box.width,
      boxHeight: box.height,
      normalizedAspect: geometry.normalizedAspect,
    };
    setGesturing(true);
    onGestureStart();
  }

  function movePointerGesture(event: ReactPointerEvent<HTMLElement>) {
    const session = dragRef.current;
    if (!session || session.pointerId !== event.pointerId) return;
    event.preventDefault();
    const deltaX = (event.clientX - session.startClientX) / session.boxWidth;
    const deltaY = (event.clientY - session.startClientY) / session.boxHeight;
    const next =
      session.handle === "move"
        ? moveCropRect(session.startCrop, deltaX, deltaY)
        : resizeCropRect(
            session.startCrop,
            session.handle,
            deltaX,
            deltaY,
            session.normalizedAspect,
          );
    if (sameCrop(next, session.lastCrop)) return;
    session.lastCrop = next;
    onCropChange(next);
  }

  function endPointerGesture(event: ReactPointerEvent<HTMLElement>) {
    const session = dragRef.current;
    if (!session || session.pointerId !== event.pointerId) return;
    dragRef.current = null;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    setGesturing(false);
    onGestureEnd();
  }

  function changeWithKeyboard(
    event: ReactKeyboardEvent<HTMLElement>,
    handle: CropHandle,
  ) {
    if (disabled || comparing) return;
    const delta = arrowDelta(event);
    if (!delta) return;
    event.preventDefault();
    event.stopPropagation();
    const next =
      handle === "move"
        ? moveCropRect(crop, delta.x, delta.y)
        : resizeCropRect(
            crop,
            handle,
            delta.x,
            delta.y,
            geometry.normalizedAspect,
          );
    if (sameCrop(next, crop)) return;
    onGestureStart();
    onCropChange(next);
    onGestureEnd();
  }

  const cropStyle = {
    left: `${crop.x * 100}%`,
    top: `${crop.y * 100}%`,
    width: `${crop.width * 100}%`,
    height: `${crop.height * 100}%`,
  };
  const cropRight = crop.x + crop.width;
  const cropBottom = crop.y + crop.height;
  const chromeOpacity = comparing || disabled ? 0 : 1;

  return (
    <div
      ref={surfaceRef}
      className="relative h-full min-h-0 w-full overflow-hidden bg-[#050505] select-none"
      role="group"
      aria-label="Area pangkas foto"
    >
      {surfaceSize.width > 0 && surfaceSize.height > 0 && (
        <div
          ref={boxRef}
          className="absolute left-1/2 top-1/2 isolate"
          style={{
            width: geometry.boxWidth,
            height: geometry.boxHeight,
            transform: "translate(-50%, -50%)",
            touchAction: disabled ? "auto" : "none",
          }}
        >
          <div className="absolute inset-0 overflow-hidden bg-black">
            <div
              className="absolute inset-0 origin-center will-change-transform"
              style={{
                filter: comparing ? "none" : buildPhotoFilter(recipe),
                transform: `rotate(${recipe.straighten}deg) scale(${geometry.coverScale * (recipe.flipHorizontal ? -1 : 1)}, ${geometry.coverScale * (recipe.flipVertical ? -1 : 1)})`,
              }}
            >
              {/* Blob URL memerlukan img biasa; Next/Image tidak mengoptimalkannya. */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={previewUrl}
                alt=""
                draggable={false}
                className="pointer-events-none absolute left-1/2 top-1/2 max-w-none origin-center"
                style={{
                  width: geometry.sourceRenderWidth,
                  height: geometry.sourceRenderHeight,
                  transform: `translate(-50%, -50%) rotate(${recipe.rotation}deg)`,
                }}
              />
            </div>
          </div>

          <div
            className="pointer-events-none absolute inset-x-0 top-0 bg-black/55 transition-opacity duration-150"
            style={{ height: `${crop.y * 100}%`, opacity: chromeOpacity }}
            aria-hidden="true"
          />
          <div
            className="pointer-events-none absolute inset-x-0 bottom-0 bg-black/55 transition-opacity duration-150"
            style={{ height: `${(1 - cropBottom) * 100}%`, opacity: chromeOpacity }}
            aria-hidden="true"
          />
          <div
            className="pointer-events-none absolute left-0 bg-black/55 transition-opacity duration-150"
            style={{
              top: `${crop.y * 100}%`,
              width: `${crop.x * 100}%`,
              height: `${crop.height * 100}%`,
              opacity: chromeOpacity,
            }}
            aria-hidden="true"
          />
          <div
            className="pointer-events-none absolute right-0 bg-black/55 transition-opacity duration-150"
            style={{
              top: `${crop.y * 100}%`,
              width: `${(1 - cropRight) * 100}%`,
              height: `${crop.height * 100}%`,
              opacity: chromeOpacity,
            }}
            aria-hidden="true"
          />

          <div
            className="pointer-events-none absolute border border-white/80 transition-opacity duration-150"
            style={{ ...cropStyle, opacity: chromeOpacity }}
            aria-hidden="true"
          />
          <div
            className="pointer-events-none absolute transition-opacity duration-200"
            style={{ ...cropStyle, opacity: gesturing && !comparing ? 1 : 0 }}
            aria-hidden="true"
          >
            <span className="absolute inset-y-0 left-1/3 w-px bg-white/55" />
            <span className="absolute inset-y-0 left-2/3 w-px bg-white/55" />
            <span className="absolute inset-x-0 top-1/3 h-px bg-white/55" />
            <span className="absolute inset-x-0 top-2/3 h-px bg-white/55" />
          </div>

          <button
            type="button"
            disabled={disabled || comparing}
            aria-label="Geser area pangkas"
            aria-keyshortcuts="ArrowUp ArrowDown ArrowLeft ArrowRight"
            className="absolute cursor-move border-0 bg-transparent p-0 outline-offset-2 disabled:cursor-default"
            style={{ ...cropStyle, opacity: chromeOpacity }}
            onPointerDown={(event) => beginPointerGesture(event, "move")}
            onPointerMove={movePointerGesture}
            onPointerUp={endPointerGesture}
            onPointerCancel={endPointerGesture}
            onLostPointerCapture={endPointerGesture}
            onKeyDown={(event) => changeWithKeyboard(event, "move")}
          />

          {HANDLES.map((handle) => (
            <button
              key={handle.id}
              type="button"
              disabled={disabled || comparing}
              aria-label={handle.label}
              aria-keyshortcuts="ArrowUp ArrowDown ArrowLeft ArrowRight"
              className={`absolute z-10 grid h-11 w-11 -translate-x-1/2 -translate-y-1/2 place-items-center border-0 bg-transparent p-0 text-white outline-offset-2 disabled:cursor-default ${handle.cursor}`}
              style={{ ...handle.position(crop), opacity: chromeOpacity }}
              onPointerDown={(event) => beginPointerGesture(event, handle.id)}
              onPointerMove={movePointerGesture}
              onPointerUp={endPointerGesture}
              onPointerCancel={endPointerGesture}
              onLostPointerCapture={endPointerGesture}
              onKeyDown={(event) => changeWithKeyboard(event, handle.id)}
            >
              <span
                className={`pointer-events-none block border-white drop-shadow-[0_1px_1px_rgba(0,0,0,0.65)] ${handle.visual}`}
                aria-hidden="true"
              />
            </button>
          ))}
        </div>
      )}
      {comparing && (
        // Preview blob sudah mengikuti orientasi EXIF; overlay ini benar-benar
        // mengabaikan crop, flip, rotate, straighten, adjustment, dan filter.
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={previewUrl}
          alt="Foto asli"
          draggable={false}
          className="pointer-events-none absolute inset-0 z-20 h-full w-full object-contain p-6"
        />
      )}
    </div>
  );
}
