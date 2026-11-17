"use client";

import Image from "next/image";
import {
  ChevronLeft,
  ChevronRight,
  Minus,
  Plus,
  X,
} from "lucide-react";
import {
  useEffect,
  useEffectEvent,
  useRef,
  useState,
  useSyncExternalStore,
  type PointerEvent as ReactPointerEvent,
  type WheelEvent as ReactWheelEvent,
} from "react";
import { createPortal } from "react-dom";
import { useMotionPresence } from "@/components/motion";
import { useDialogFocusTrap } from "@/lib/hooks/use-dialog-focus-trap";
import type { MediaSlide } from "@/lib/media/slides";
import { gradientCss } from "@/lib/utils/color";
import { cn } from "@/lib/utils/cn";

const MIN_SCALE = 1;
const MAX_SCALE = 4;
const DOUBLE_TAP_SCALE = 2.4;
const DOUBLE_TAP_MS = 300;
const TAP_SLOP_PX = 10;
const DISMISS_DISTANCE_PX = 100;
const DISMISS_FLICK_PX = 36;
const DISMISS_VELOCITY = 0.55;
const SWIPE_SLIDE_PX = 52;

const subscribeToClient = () => () => {};

const SUPABASE_HOST = (() => {
  const raw = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() ?? "";
  if (!raw) return null;
  try {
    return new URL(raw).hostname;
  } catch {
    return null;
  }
})();

function shouldBypassNextImageOptimizer(url: string, forceUnoptimized: boolean): boolean {
  if (forceUnoptimized) return true;
  if (url.startsWith("/")) return false;
  if (url.startsWith("blob:") || url.startsWith("data:")) return true;
  try {
    const parsed = new URL(url);
    return !(
      SUPABASE_HOST &&
      parsed.hostname === SUPABASE_HOST &&
      parsed.pathname.startsWith("/storage/v1/object/public/") &&
      parsed.search === ""
    );
  } catch {
    return true;
  }
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

interface TransformState {
  slideId: string;
  scale: number;
  tx: number;
  ty: number;
}

interface Point {
  x: number;
  y: number;
}

interface SingleGesture {
  pointerId: number;
  startX: number;
  startY: number;
  lastY: number;
  lastTime: number;
  velocityY: number;
  baseTx: number;
  baseTy: number;
  mode: "undecided" | "pan" | "dismiss" | "swipe";
}

interface PinchGesture {
  startDist: number;
  startScale: number;
  startMidX: number;
  startMidY: number;
  baseTx: number;
  baseTy: number;
}

export interface MediaLightboxProps {
  open: boolean;
  onClose: () => void;
  slides: readonly MediaSlide[];
  label: string;
  initialIndex?: number;
  onIndexChange?: (index: number) => void;
  unoptimized?: boolean;
}

/**
 * Pusat Theater Lightbox layar penuh untuk foto pin galeri, carousel multi-slide,
 * sampul blog, dan gambar di dalam artikel. Mendukung pendaran warna ambient
 * dinamis, pinch-to-zoom, ketuk dua kali 2.4x, geser saat diperbesar, serta
 * usap ke bawah untuk menutup.
 */
export function MediaLightbox({
  open,
  onClose,
  slides,
  label,
  initialIndex = 0,
  onIndexChange,
  unoptimized = false,
}: MediaLightboxProps) {
  const isClient = useSyncExternalStore(
    subscribeToClient,
    () => true,
    () => false,
  );
  const { active, finishExit, present } = useMotionPresence(open, 280);

  if (!isClient || !present || slides.length === 0) return null;

  return createPortal(
    <LightboxViewport
      open={open}
      active={active}
      present={present}
      finishExit={finishExit}
      onClose={onClose}
      slides={slides}
      label={label}
      initialIndex={initialIndex}
      onIndexChange={onIndexChange}
      unoptimized={unoptimized}
    />,
    document.body,
  );
}

function LightboxViewport({
  open,
  active,
  present,
  finishExit,
  onClose,
  slides,
  label,
  initialIndex,
  onIndexChange,
  unoptimized,
}: Required<Pick<MediaLightboxProps, "open" | "onClose" | "slides" | "label" | "unoptimized">> & {
  active: boolean;
  present: boolean;
  finishExit: () => void;
  initialIndex: number;
  onIndexChange?: (index: number) => void;
}) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const backdropRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const mediaWrapRef = useRef<HTMLDivElement>(null);
  const pointersRef = useRef<Map<number, Point>>(new Map());
  const singleRef = useRef<SingleGesture | null>(null);
  const pinchRef = useRef<PinchGesture | null>(null);
  const lastTapRef = useRef<{ time: number; x: number; y: number }>({
    time: 0,
    x: 0,
    y: 0,
  });
  const lastDoubleTriggerRef = useRef(0);

  const total = slides.length;
  const multiple = total > 1;
  const [index, setIndex] = useState(() => clamp(initialIndex, 0, total - 1));
  const safeIndex = clamp(index, 0, total - 1);
  const currentSlide = slides[safeIndex]!;

  const [transform, setTransform] = useState<TransformState>({
    slideId: currentSlide.id,
    scale: 1,
    tx: 0,
    ty: 0,
  });
  const [interacting, setInteracting] = useState(false);

  const view: TransformState =
    transform.slideId === currentSlide.id
      ? transform
      : { slideId: currentSlide.id, scale: 1, tx: 0, ty: 0 };

  const isPhoto = currentSlide.type === "photo" && Boolean(currentSlide.url);

  useDialogFocusTrap({
    dialogRef,
    open,
    present,
    active,
    onClose,
  });

  function clampPan(tx: number, ty: number, scale: number) {
    if (scale <= 1.01) return { tx: 0, ty: 0 };
    const stage = stageRef.current;
    const maxX = ((stage?.clientWidth ?? window.innerWidth) * (scale - 1)) / 2;
    const maxY = ((stage?.clientHeight ?? window.innerHeight) * (scale - 1)) / 2;
    return {
      tx: clamp(tx, -maxX, maxX),
      ty: clamp(ty, -maxY, maxY),
    };
  }

  function applyScale(nextScale: number, anchorClientX?: number, anchorClientY?: number) {
    if (!isPhoto) return;
    const clampedScale = clamp(Math.round(nextScale * 100) / 100, MIN_SCALE, MAX_SCALE);
    if (clampedScale <= 1.01) {
      setTransform({ slideId: currentSlide.id, scale: 1, tx: 0, ty: 0 });
      return;
    }

    let nextTx = view.tx;
    let nextTy = view.ty;
    const stage = stageRef.current;
    if (stage && anchorClientX !== undefined && anchorClientY !== undefined) {
      const rect = stage.getBoundingClientRect();
      const offsetX = anchorClientX - (rect.left + rect.width / 2);
      const offsetY = anchorClientY - (rect.top + rect.height / 2);
      const ratio = clampedScale / view.scale;
      nextTx = offsetX - (offsetX - view.tx) * ratio;
      nextTy = offsetY - (offsetY - view.ty) * ratio;
    } else {
      const ratio = clampedScale / view.scale;
      nextTx = view.tx * ratio;
      nextTy = view.ty * ratio;
    }

    const panned = clampPan(nextTx, nextTy, clampedScale);
    setTransform({
      slideId: currentSlide.id,
      scale: clampedScale,
      tx: panned.tx,
      ty: panned.ty,
    });
  }

  function selectSlide(target: number) {
    const next = clamp(target, 0, total - 1);
    if (next === safeIndex) return;
    const nextSlide = slides[next]!;
    setIndex(next);
    setTransform({ slideId: nextSlide.id, scale: 1, tx: 0, ty: 0 });
    onIndexChange?.(next);
  }

  const onKeyShortcut = useEffectEvent((event: KeyboardEvent) => {
    if (!open || (event.target as HTMLElement | null)?.closest("video")) return;
    if (event.key === "ArrowRight" && multiple) {
      event.preventDefault();
      selectSlide(safeIndex + 1);
    } else if (event.key === "ArrowLeft" && multiple) {
      event.preventDefault();
      selectSlide(safeIndex - 1);
    } else if ((event.key === "+" || event.key === "=") && isPhoto) {
      event.preventDefault();
      applyScale(view.scale + 0.5);
    } else if (event.key === "-" && isPhoto) {
      event.preventDefault();
      applyScale(view.scale - 0.5);
    } else if (event.key === "0" && isPhoto) {
      event.preventDefault();
      applyScale(1);
    }
  });

  useEffect(() => {
    if (!open) return;
    window.addEventListener("keydown", onKeyShortcut);
    return () => window.removeEventListener("keydown", onKeyShortcut);
  }, [open]);

  function clearDismissDragStyles() {
    if (mediaWrapRef.current) {
      mediaWrapRef.current.style.transform = "";
      mediaWrapRef.current.style.transition = "";
    }
    if (backdropRef.current) {
      backdropRef.current.style.opacity = "";
      backdropRef.current.style.transition = "";
    }
  }

  function toggleDoubleZoom(clientX: number, clientY: number) {
    if (!isPhoto) return;
    const now = performance.now();
    if (now - lastDoubleTriggerRef.current < 380) return;
    lastDoubleTriggerRef.current = now;
    if (view.scale > 1.05) {
      applyScale(1);
    } else {
      applyScale(DOUBLE_TAP_SCALE, clientX, clientY);
    }
  }

  function startPinchFromPointers() {
    const pts = Array.from(pointersRef.current.values());
    if (pts.length < 2) return;
    const [a, b] = [pts[0]!, pts[1]!];
    const dist = Math.max(12, Math.hypot(b.x - a.x, b.y - a.y));
    pinchRef.current = {
      startDist: dist,
      startScale: view.scale,
      startMidX: (a.x + b.x) / 2,
      startMidY: (a.y + b.y) / 2,
      baseTx: view.tx,
      baseTy: view.ty,
    };
    singleRef.current = null;
    clearDismissDragStyles();
    setInteracting(true);
  }

  function onStagePointerDown(event: ReactPointerEvent<HTMLDivElement>) {
    if (
      !open ||
      (event.pointerType === "mouse" && event.button !== 0) ||
      (event.target as HTMLElement).closest("button, a, video")
    ) {
      return;
    }

    event.currentTarget.setPointerCapture(event.pointerId);
    pointersRef.current.set(event.pointerId, {
      x: event.clientX,
      y: event.clientY,
    });

    if (pointersRef.current.size === 2 && isPhoto) {
      startPinchFromPointers();
      return;
    }

    if (pointersRef.current.size === 1) {
      singleRef.current = {
        pointerId: event.pointerId,
        startX: event.clientX,
        startY: event.clientY,
        lastY: event.clientY,
        lastTime: performance.now(),
        velocityY: 0,
        baseTx: view.tx,
        baseTy: view.ty,
        mode: view.scale > 1.01 ? "pan" : "undecided",
      };
      if (view.scale > 1.01) setInteracting(true);
    }
  }

  function onStagePointerMove(event: ReactPointerEvent<HTMLDivElement>) {
    if (!pointersRef.current.has(event.pointerId)) return;
    pointersRef.current.set(event.pointerId, {
      x: event.clientX,
      y: event.clientY,
    });

    if (pointersRef.current.size >= 2 && pinchRef.current && isPhoto) {
      const pts = Array.from(pointersRef.current.values());
      const [a, b] = [pts[0]!, pts[1]!];
      const dist = Math.max(12, Math.hypot(b.x - a.x, b.y - a.y));
      const midX = (a.x + b.x) / 2;
      const midY = (a.y + b.y) / 2;
      const nextScale = clamp(
        pinchRef.current.startScale * (dist / pinchRef.current.startDist),
        MIN_SCALE,
        MAX_SCALE,
      );
      const panned = clampPan(
        pinchRef.current.baseTx + (midX - pinchRef.current.startMidX),
        pinchRef.current.baseTy + (midY - pinchRef.current.startMidY),
        nextScale,
      );
      setTransform({
        slideId: currentSlide.id,
        scale: nextScale,
        tx: panned.tx,
        ty: panned.ty,
      });
      return;
    }

    const session = singleRef.current;
    if (!session || session.pointerId !== event.pointerId) return;

    const dx = event.clientX - session.startX;
    const dy = event.clientY - session.startY;
    const now = performance.now();
    const dt = Math.max(1, now - session.lastTime);
    session.velocityY = (event.clientY - session.lastY) / dt;
    session.lastY = event.clientY;
    session.lastTime = now;

    if (session.mode === "pan") {
      const panned = clampPan(
        session.baseTx + dx,
        session.baseTy + dy,
        view.scale,
      );
      setTransform({
        slideId: currentSlide.id,
        scale: view.scale,
        tx: panned.tx,
        ty: panned.ty,
      });
      return;
    }

    if (session.mode === "undecided") {
      if (Math.hypot(dx, dy) < 8) return;
      if (multiple && Math.abs(dx) > Math.abs(dy) * 1.2) {
        session.mode = "swipe";
      } else if (dy > 0 && Math.abs(dy) >= Math.abs(dx)) {
        session.mode = "dismiss";
      } else {
        return;
      }
    }

    if (session.mode === "dismiss") {
      const clampedDy = Math.max(0, dy);
      const shrink = 1 - Math.min(0.14, clampedDy / 900);
      if (mediaWrapRef.current) {
        mediaWrapRef.current.style.transition = "none";
        mediaWrapRef.current.style.transform = `translate3d(${(dx * 0.25).toFixed(1)}px, ${clampedDy.toFixed(1)}px, 0) scale(${shrink.toFixed(3)})`;
      }
      if (backdropRef.current) {
        backdropRef.current.style.transition = "none";
        backdropRef.current.style.opacity = String(
          Math.max(0.2, 1 - Math.min(0.8, clampedDy / 340)),
        );
      }
    }
  }

  function onStagePointerEnd(event: ReactPointerEvent<HTMLDivElement>) {
    pointersRef.current.delete(event.pointerId);
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }

    if (pinchRef.current) {
      if (pointersRef.current.size < 2) {
        pinchRef.current = null;
        setInteracting(false);
        if (view.scale <= 1.03) {
          setTransform({ slideId: currentSlide.id, scale: 1, tx: 0, ty: 0 });
        }
      }
      return;
    }

    const session = singleRef.current;
    if (!session || session.pointerId !== event.pointerId) return;
    singleRef.current = null;
    setInteracting(false);

    const dx = event.clientX - session.startX;
    const dy = event.clientY - session.startY;

    if (session.mode === "dismiss") {
      clearDismissDragStyles();
      if (
        dy > DISMISS_DISTANCE_PX ||
        (dy > DISMISS_FLICK_PX && session.velocityY > DISMISS_VELOCITY)
      ) {
        onClose();
      }
      return;
    }

    if (session.mode === "swipe" && multiple) {
      if (dx < -SWIPE_SLIDE_PX && safeIndex < total - 1) {
        selectSlide(safeIndex + 1);
      } else if (dx > SWIPE_SLIDE_PX && safeIndex > 0) {
        selectSlide(safeIndex - 1);
      }
      return;
    }

    // Ketuk dua kali untuk perangkat sentuh (mouse ditangani onDoubleClick).
    if (
      event.pointerType !== "mouse" &&
      Math.hypot(dx, dy) <= TAP_SLOP_PX &&
      isPhoto
    ) {
      const now = performance.now();
      const last = lastTapRef.current;
      if (
        now - last.time < DOUBLE_TAP_MS &&
        Math.hypot(event.clientX - last.x, event.clientY - last.y) < 40
      ) {
        lastTapRef.current = { time: 0, x: 0, y: 0 };
        toggleDoubleZoom(event.clientX, event.clientY);
        return;
      }
      lastTapRef.current = { time: now, x: event.clientX, y: event.clientY };
    }
  }

  function onStageWheel(event: ReactWheelEvent<HTMLDivElement>) {
    if (!isPhoto) return;
    event.preventDefault();
    const step = event.ctrlKey || event.metaKey ? -event.deltaY * 0.012 : -event.deltaY * 0.003;
    if (Math.abs(step) < 0.01) return;
    applyScale(view.scale + step, event.clientX, event.clientY);
  }

  const bypassOptimizer = shouldBypassNextImageOptimizer(
    currentSlide.url,
    unoptimized,
  );
  const slideAlt = multiple
    ? `${label} — ${safeIndex + 1} dari ${total}`
    : label;

  return (
    <div
      ref={dialogRef}
      role="dialog"
      aria-modal="true"
      aria-label={`Tampilan penuh: ${label}`}
      tabIndex={-1}
      data-open={active}
      onTransitionEnd={(event) => {
        if (event.target === event.currentTarget) finishExit();
      }}
      className={cn(
        "fixed inset-0 z-100 flex h-dvh w-full flex-col overflow-hidden text-white transition-opacity duration-200 ease-out focus:outline-none",
        active ? "opacity-100" : "pointer-events-none opacity-0",
      )}
    >
      {/* Latar teater gelap + proyeksi cahaya warna ambient dari foto aktif */}
      <div
        ref={backdropRef}
        onClick={onClose}
        aria-hidden="true"
        className="absolute inset-0 bg-[#050507]/95 backdrop-blur-xl transition-opacity duration-200"
      >
        {isPhoto && (
          <Image
            key={currentSlide.id}
            src={currentSlide.url}
            alt=""
            fill
            sizes="120px"
            quality={30}
            unoptimized={bypassOptimizer}
            draggable={false}
            className="pointer-events-none scale-125 select-none object-cover opacity-35 blur-3xl saturate-175 transition-opacity duration-500 contrast-more:hidden"
          />
        )}
      </div>

      {/* Bar atas: penghitung/label + tombol tutup kaca */}
      <header
        className="pointer-events-none relative z-20 flex shrink-0 items-center justify-between gap-3 px-4 pb-2"
        style={{ paddingTop: "max(0.75rem, var(--safe-top))" }}
      >
        <div className="pointer-events-auto flex min-w-0 items-center gap-2">
          {multiple && (
            <span className="rounded-full border border-white/15 bg-black/45 px-3 py-1.5 text-caption1 font-semibold tabular-nums backdrop-blur-xl">
              {safeIndex + 1} / {total}
            </span>
          )}
          <p className="hidden truncate rounded-full border border-white/12 bg-black/35 px-3.5 py-1.5 text-xs font-medium text-white/90 backdrop-blur-xl sm:block sm:max-w-md">
            {label}
          </p>
        </div>

        <button
          type="button"
          onClick={onClose}
          aria-label="Tutup tampilan layar penuh"
          className="motion-pressable pointer-events-auto grid size-10 shrink-0 place-items-center rounded-full border border-white/18 bg-black/45 text-white backdrop-blur-xl hover:bg-white/15"
        >
          <X className="size-5" aria-hidden="true" />
        </button>
      </header>

      {/* Panggung utama: zoom, pan, dan usap */}
      <div
        ref={stageRef}
        onPointerDown={onStagePointerDown}
        onPointerMove={onStagePointerMove}
        onPointerUp={onStagePointerEnd}
        onPointerCancel={onStagePointerEnd}
        onWheel={onStageWheel}
        onDoubleClick={(event) => {
          if (!(event.target as HTMLElement).closest("button, a, video")) {
            toggleDoubleZoom(event.clientX, event.clientY);
          }
        }}
        onClick={(event) => {
          if (event.target === event.currentTarget && view.scale <= 1.01) {
            onClose();
          }
        }}
        className={cn(
          "relative z-10 flex min-h-0 flex-1 touch-none select-none items-center justify-center overflow-hidden px-2 sm:px-14",
          isPhoto && (view.scale > 1.01 ? "cursor-grab active:cursor-grabbing" : "cursor-zoom-in"),
        )}
      >
        <div
          ref={mediaWrapRef}
          className={cn(
            "relative flex h-full w-full max-w-6xl items-center justify-center",
            !interacting && "transition-transform duration-300 ease-(--motion-spring)",
          )}
        >
          <div
            style={{
              transform: `translate3d(${view.tx.toFixed(1)}px, ${view.ty.toFixed(1)}px, 0) scale(${view.scale.toFixed(3)})`,
              transition: interacting
                ? "none"
                : "transform 280ms var(--motion-spring)",
            }}
            className="relative h-full w-full"
          >
            {!currentSlide.url ? (
              <div
                className="h-full w-full rounded-2xl"
                style={{ background: gradientCss(currentSlide.id) }}
              />
            ) : currentSlide.type === "video" ? (
              <video
                key={currentSlide.id}
                controls
                autoPlay
                playsInline
                aria-label={slideAlt}
                className="h-full w-full object-contain"
              >
                <source
                  src={currentSlide.url}
                  type={currentSlide.mime_type ?? undefined}
                />
                Browser ini belum dapat memutar codec video tersebut.
              </video>
            ) : (
              <Image
                key={currentSlide.id}
                src={currentSlide.url}
                alt={slideAlt}
                fill
                sizes="100vw"
                quality={90}
                preload
                unoptimized={bypassOptimizer}
                draggable={false}
                className="pointer-events-none select-none object-contain"
              />
            )}
          </div>
        </div>

        {multiple && (
          <>
            <button
              type="button"
              disabled={safeIndex === 0}
              onClick={() => selectSlide(safeIndex - 1)}
              aria-label="Media sebelumnya"
              className="motion-pressable absolute left-3 top-1/2 z-20 hidden -translate-y-1/2 place-items-center rounded-full border border-white/18 bg-black/45 p-2.5 text-white backdrop-blur-xl hover:bg-white/15 disabled:pointer-events-none disabled:opacity-25 sm:grid"
            >
              <ChevronLeft className="size-5" aria-hidden="true" />
            </button>
            <button
              type="button"
              disabled={safeIndex === total - 1}
              onClick={() => selectSlide(safeIndex + 1)}
              aria-label="Media berikutnya"
              className="motion-pressable absolute right-3 top-1/2 z-20 hidden -translate-y-1/2 place-items-center rounded-full border border-white/18 bg-black/45 p-2.5 text-white backdrop-blur-xl hover:bg-white/15 disabled:pointer-events-none disabled:opacity-25 sm:grid"
            >
              <ChevronRight className="size-5" aria-hidden="true" />
            </button>
          </>
        )}
      </div>

      {/* Bar bawah: kontrol zoom kaca + navigasi slide di ponsel */}
      <footer
        className="pointer-events-none relative z-20 flex shrink-0 flex-wrap items-center justify-center gap-2.5 px-4 pt-2"
        style={{ paddingBottom: "max(0.85rem, var(--safe-bottom))" }}
      >
        {multiple && (
          <div className="pointer-events-auto flex items-center gap-1 rounded-full border border-white/15 bg-black/45 p-1 backdrop-blur-xl sm:hidden">
            <button
              type="button"
              disabled={safeIndex === 0}
              onClick={() => selectSlide(safeIndex - 1)}
              aria-label="Media sebelumnya"
              className="motion-pressable grid size-8 place-items-center rounded-full hover:bg-white/15 disabled:opacity-30"
            >
              <ChevronLeft className="size-4" aria-hidden="true" />
            </button>
            <span className="px-2 text-caption1 font-semibold tabular-nums">
              {safeIndex + 1}/{total}
            </span>
            <button
              type="button"
              disabled={safeIndex === total - 1}
              onClick={() => selectSlide(safeIndex + 1)}
              aria-label="Media berikutnya"
              className="motion-pressable grid size-8 place-items-center rounded-full hover:bg-white/15 disabled:opacity-30"
            >
              <ChevronRight className="size-4" aria-hidden="true" />
            </button>
          </div>
        )}

        {isPhoto && (
          <div className="pointer-events-auto flex items-center gap-1 rounded-full border border-white/15 bg-black/45 p-1 backdrop-blur-xl">
            <button
              type="button"
              disabled={view.scale <= MIN_SCALE + 0.01}
              onClick={() => applyScale(view.scale - 0.5)}
              aria-label="Perkecil tampilan"
              className="motion-pressable grid size-8 place-items-center rounded-full hover:bg-white/15 disabled:opacity-30"
            >
              <Minus className="size-4" aria-hidden="true" />
            </button>
            <button
              type="button"
              onClick={() => applyScale(1)}
              aria-label="Atur ulang perbesaran ke 100 persen"
              className="motion-pressable min-w-14 rounded-full px-2.5 py-1 text-center text-caption1 font-semibold tabular-nums hover:bg-white/15"
            >
              {Math.round(view.scale * 100)}%
            </button>
            <button
              type="button"
              disabled={view.scale >= MAX_SCALE - 0.01}
              onClick={() => applyScale(view.scale + 0.5)}
              aria-label="Perbesar tampilan"
              className="motion-pressable grid size-8 place-items-center rounded-full hover:bg-white/15 disabled:opacity-30"
            >
              <Plus className="size-4" aria-hidden="true" />
            </button>
          </div>
        )}

        <span className="sr-only" aria-live="polite">
          {multiple ? `Slide ${safeIndex + 1} dari ${total}, ` : ""}
          perbesaran {Math.round(view.scale * 100)} persen
        </span>
      </footer>
    </div>
  );
}
