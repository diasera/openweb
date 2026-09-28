"use client";

import Image from "next/image";
import { Bookmark, ChevronLeft, ChevronRight } from "lucide-react";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent,
  type PointerEvent,
} from "react";
import type { MediaSlide } from "@/lib/media/slides";
import { gradientCss } from "@/lib/utils/color";
import { cn } from "@/lib/utils/cn";
import styles from "./media-carousel.module.css";

const DOUBLE_TAP_MS = 300;
const TAP_SLOP_PX = 10;
/** Sentuh bisa memicu deteksi manual DAN `dblclick`; satu gestur = satu aksi. */
const DOUBLE_TAP_COOLDOWN_MS = 450;

export interface MediaCarouselProps {
  slides: readonly MediaSlide[];
  /** Nama aksesibel carousel, mis. judul pin. */
  label: string;
  aspectRatio: number;
  sizes: string;
  fit?: "contain" | "cover";
  preloadFirst?: boolean;
  /** Signed URL/blob tidak boleh disimpan cache optimizer Next. */
  unoptimized?: boolean;
  videoMuted?: boolean;
  /** Mode terkontrol (composer): induk memilih slide aktif. */
  index?: number;
  onIndexChange?: (index: number) => void;
  /** Gestur ketuk dua kali (Simpan ala Instagram) beserta animasi burst. */
  onDoubleTap?: () => void;
  className?: string;
  style?: CSSProperties;
}

/**
 * Satu carousel media untuk detail pin, moderasi admin, dan pratinjau Buat
 * Pin. Swipe memakai scroll-snap native sehingga momentum dan rubber-band
 * mengikuti OS (cepat, tanpa library); JS hanya melacak slide aktif.
 */
export function MediaCarousel({
  slides,
  label,
  aspectRatio,
  sizes,
  fit = "contain",
  preloadFirst = false,
  unoptimized = false,
  videoMuted = false,
  index,
  onIndexChange,
  onDoubleTap,
  className,
  style,
}: MediaCarouselProps) {
  const trackRef = useRef<HTMLDivElement>(null);
  const frameRef = useRef(0);
  const activeRef = useRef(0);
  // Target scroll terprogram: posisi antara tidak dilaporkan ke induk.
  const pendingRef = useRef<number | null>(null);
  const downRef = useRef<{ x: number; y: number } | null>(null);
  const lastTapRef = useRef({ time: 0, x: 0, y: 0 });
  const lastTriggerRef = useRef(0);
  const [active, setActive] = useState(0);
  const [burst, setBurst] = useState(0);
  const total = slides.length;
  const multiple = total > 1;

  const goTo = useCallback(
    (target: number, smooth = true) => {
      const track = trackRef.current;
      if (!track || total === 0) return;
      const next = Math.min(total - 1, Math.max(0, target));
      pendingRef.current = next;
      const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      track.scrollTo({
        left: next * track.clientWidth,
        behavior: smooth && !reduced ? "smooth" : "auto",
      });
    },
    [total],
  );

  const syncActive = useCallback(() => {
    frameRef.current = 0;
    const track = trackRef.current;
    if (!track || track.clientWidth === 0) return;
    const next = Math.min(
      total - 1,
      Math.max(0, Math.round(track.scrollLeft / track.clientWidth)),
    );
    const pending = pendingRef.current;
    if (pending !== null && next === pending) pendingRef.current = null;
    if (next === activeRef.current) return;
    activeRef.current = next;
    setActive(next);
    if (pending === null || next === pending) onIndexChange?.(next);
  }, [onIndexChange, total]);

  useEffect(() => () => cancelAnimationFrame(frameRef.current), []);

  // Induk mengganti slide aktif (thumbnail composer) atau slide berkurang.
  useEffect(() => {
    if (index !== undefined && index !== activeRef.current) goTo(index);
  }, [goTo, index]);
  useEffect(() => {
    if (total > 0 && activeRef.current > total - 1) goTo(total - 1, false);
  }, [goTo, total]);

  // Video di luar layar dijeda agar suara tidak tumpang tindih.
  useEffect(() => {
    trackRef.current
      ?.querySelectorAll<HTMLVideoElement>("[data-slide-index] video")
      .forEach((video) => {
        const owner = video.closest<HTMLElement>("[data-slide-index]");
        if (Number(owner?.dataset.slideIndex) !== active && !video.paused) {
          video.pause();
        }
      });
  }, [active]);

  function onKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    const keys: Record<string, number> = {
      ArrowRight: active + 1,
      ArrowLeft: active - 1,
      Home: 0,
      End: total - 1,
    };
    if (!(event.key in keys) || (event.target as HTMLElement).closest("video")) return;
    event.preventDefault();
    goTo(keys[event.key]);
  }

  function onPointerDown(event: PointerEvent<HTMLDivElement>) {
    pendingRef.current = null;
    downRef.current = { x: event.clientX, y: event.clientY };
  }

  function triggerDoubleTap() {
    const now = performance.now();
    if (!onDoubleTap || now - lastTriggerRef.current < DOUBLE_TAP_COOLDOWN_MS) return;
    lastTriggerRef.current = now;
    setBurst((value) => value + 1);
    onDoubleTap();
  }

  // Sentuh dideteksi manual karena iOS Safari tidak andal mengirim dblclick;
  // mouse memakai `dblclick` bawaan (onDoubleClick).
  function onPointerUp(event: PointerEvent<HTMLDivElement>) {
    const down = downRef.current;
    downRef.current = null;
    if (
      !onDoubleTap ||
      event.pointerType === "mouse" ||
      !down ||
      Math.hypot(event.clientX - down.x, event.clientY - down.y) > TAP_SLOP_PX ||
      (event.target as HTMLElement).closest("video, button, a")
    ) {
      return;
    }
    const now = performance.now();
    const last = lastTapRef.current;
    if (
      now - last.time < DOUBLE_TAP_MS &&
      Math.hypot(event.clientX - last.x, event.clientY - last.y) < 40
    ) {
      lastTapRef.current = { time: 0, x: 0, y: 0 };
      triggerDoubleTap();
      return;
    }
    lastTapRef.current = { time: now, x: event.clientX, y: event.clientY };
  }

  return (
    <div
      className={cn(
        styles.root,
        "bg-surface-2 relative isolate w-full overflow-hidden",
        className,
      )}
      style={{ aspectRatio, ...style }}
    >
      <div
        ref={trackRef}
        role="region"
        aria-roledescription={multiple ? "carousel" : undefined}
        aria-label={label}
        tabIndex={multiple ? 0 : undefined}
        onScroll={() => {
          if (!frameRef.current) frameRef.current = requestAnimationFrame(syncActive);
        }}
        onKeyDown={multiple ? onKeyDown : undefined}
        onPointerDown={onPointerDown}
        onPointerUp={onPointerUp}
        onPointerCancel={() => {
          downRef.current = null;
        }}
        onDoubleClick={(event) => {
          if (!(event.target as HTMLElement).closest("video, button, a")) triggerDoubleTap();
        }}
        className={cn(styles.track, "absolute inset-0 flex overflow-x-auto")}
      >
        {slides.map((slide, slideIndex) => (
          <div
            key={slide.id}
            data-slide-index={slideIndex}
            role={multiple ? "group" : undefined}
            aria-roledescription={multiple ? "slide" : undefined}
            aria-label={multiple ? `${slideIndex + 1} dari ${total}` : undefined}
            className={cn(styles.slide, "relative h-full w-full shrink-0")}
          >
            <SlideMedia
              slide={slide}
              alt={multiple ? `${label} — ${slideIndex + 1} dari ${total}` : label}
              sizes={sizes}
              fit={fit}
              preload={preloadFirst && slideIndex === 0}
              near={Math.abs(slideIndex - active) <= 1}
              unoptimized={unoptimized}
              videoMuted={videoMuted}
            />
          </div>
        ))}
      </div>

      {burst > 0 && (
        <span
          key={burst}
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 z-10 grid place-items-center"
        >
          <Bookmark className={cn(styles.burst, "size-20 fill-white text-white")} />
        </span>
      )}

      {multiple && (
        <>
          <span
            key={active}
            aria-hidden="true"
            className={cn(
              styles.counter,
              styles.pager,
              "pointer-events-none absolute right-2.5 top-2.5 z-10 rounded-full px-2.5 py-1 text-caption1 font-semibold tabular-nums",
            )}
          >
            {active + 1}/{total}
          </span>
          <span className="sr-only" aria-live="polite">
            Slide {active + 1} dari {total}
          </span>

          <CarouselArrow
            direction="previous"
            hidden={active === 0}
            onClick={() => goTo(active - 1)}
          />
          <CarouselArrow
            direction="next"
            hidden={active === total - 1}
            onClick={() => goTo(active + 1)}
          />

          <div
            className={cn(
              styles.pager,
              "absolute bottom-2.5 left-1/2 z-10 flex -translate-x-1/2 items-center gap-1.5 rounded-full px-2 py-1.5",
            )}
          >
            {slides.map((slide, slideIndex) => (
              <button
                key={slide.id}
                type="button"
                tabIndex={-1}
                aria-label={`Ke slide ${slideIndex + 1}`}
                aria-current={slideIndex === active}
                onClick={() => goTo(slideIndex)}
                className={styles.dot}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function CarouselArrow({
  direction,
  hidden,
  onClick,
}: {
  direction: "previous" | "next";
  hidden: boolean;
  onClick: () => void;
}) {
  const Icon = direction === "previous" ? ChevronLeft : ChevronRight;
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={direction === "previous" ? "Slide sebelumnya" : "Slide berikutnya"}
      className={cn(
        styles.arrow,
        "glass-button absolute top-1/2 z-10 -mt-4.5 hidden size-9 place-items-center rounded-full pointer-fine:grid",
        direction === "previous" ? "left-2.5" : "right-2.5",
        hidden && "pointer-fine:hidden",
      )}
    >
      <Icon className="relative size-5" aria-hidden="true" />
    </button>
  );
}

function SlideMedia({
  slide,
  alt,
  sizes,
  fit,
  preload,
  near,
  unoptimized,
  videoMuted,
}: {
  slide: MediaSlide;
  alt: string;
  sizes: string;
  fit: "contain" | "cover";
  preload: boolean;
  near: boolean;
  unoptimized: boolean;
  videoMuted: boolean;
}) {
  if (!slide.url) {
    return (
      <div className="absolute inset-0" style={{ background: gradientCss(slide.id) }} />
    );
  }
  if (slide.type === "video") {
    return (
      <video
        poster={slide.thumbnail_url ?? undefined}
        controls
        playsInline
        muted={videoMuted}
        preload={near ? "metadata" : "none"}
        aria-label={alt}
        className="absolute inset-0 h-full w-full bg-black object-contain"
      >
        <source src={slide.url} type={slide.mime_type ?? undefined} />
        Browser ini belum dapat memutar codec video tersebut.
      </video>
    );
  }
  return (
    <Image
      src={slide.url}
      alt={alt}
      fill
      sizes={sizes}
      preload={preload}
      loading={preload ? undefined : near ? "eager" : "lazy"}
      unoptimized={unoptimized}
      draggable={false}
      className={cn("select-none", fit === "cover" ? "object-cover" : "object-contain")}
    />
  );
}
