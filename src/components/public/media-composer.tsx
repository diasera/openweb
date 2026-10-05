"use client";

import {
  ChevronLeft,
  ChevronRight,
  CircleAlert,
  ImagePlus,
  Camera,
  LoaderCircle,
  Play,
  Plus,
  RotateCcw,
  Star,
  Trash2,
  WandSparkles,
} from "lucide-react";
import {
  useEffect,
  useRef,
  useState,
  type DragEvent,
  type KeyboardEvent,
  type PointerEvent,
  type Ref,
} from "react";
import { Button } from "@/components/ui/button";
import { IconButton } from "@/components/ui/icon-button";
import { MediaCarousel } from "@/components/ui/media-carousel";
import { PHOTO_EDITOR_HELP } from "@/lib/constants";
import type { MediaDraft, MediaDrafts } from "@/lib/hooks/use-media-drafts";
import { MEDIA_ASPECT_LIMITS, mediaDisplayAspectRatio } from "@/lib/media/display";
import type { MediaSlide } from "@/lib/media/slides";
import { gradientCss } from "@/lib/utils/color";
import { cn } from "@/lib/utils/cn";
import styles from "./media-composer.module.css";

/** Lebar thumbnail (64px) + gap (8px): satuan geser saat mengurutkan. */
const THUMB_SLOT_PX = 72;
const LONG_PRESS_MS = 260;

function draftSlide(draft: MediaDraft): MediaSlide {
  return {
    id: draft.id,
    type: draft.isVideo ? "video" : "photo",
    url: draft.preview,
    mime_type: null,
    thumbnail_url: null,
    width: draft.dims?.width ?? null,
    height: draft.dims?.height ?? null,
  };
}

function filesFromDrop(event: DragEvent) {
  return [...event.dataTransfer.files].filter(
    (file) => file.type.startsWith("image/") || file.type.startsWith("video/") || !file.type,
  );
}

/**
 * Bagian media Buat Pin ala Instagram: pilih banyak foto/video, pratinjau
 * carousel persis seperti yang akan tampil, lalu urutkan lewat filmstrip.
 */
export function MediaComposer({
  drafts,
  activeIndex,
  onActiveIndexChange,
  onPickGallery,
  onPickCamera,
  onFiles,
  onEdit,
  editButtonRef,
  uploadProgress,
  disabled,
}: {
  drafts: MediaDrafts;
  activeIndex: number;
  onActiveIndexChange: (index: number) => void;
  onPickGallery: () => void;
  onPickCamera: () => void;
  onFiles: (files: File[]) => void;
  onEdit: (id: string) => void;
  editButtonRef: Ref<HTMLButtonElement>;
  /** Persen unggah per draft saat pin sedang dikirim. */
  uploadProgress: Readonly<Record<string, number>>;
  disabled: boolean;
}) {
  const [dragOver, setDragOver] = useState(false);
  const dropHandlers = {
    onDragOver: (event: DragEvent) => {
      if (disabled || drafts.full || !event.dataTransfer.types.includes("Files")) return;
      event.preventDefault();
      setDragOver(true);
    },
    onDragLeave: () => setDragOver(false),
    onDrop: (event: DragEvent) => {
      setDragOver(false);
      if (disabled || drafts.full) return;
      event.preventDefault();
      onFiles(filesFromDrop(event));
    },
  };

  if (drafts.items.length === 0) {
    return (
      <div
        {...dropHandlers}
        data-dragging={dragOver}
        className={cn(
          styles.picker,
          "rounded-ios-lg border-border flex w-full flex-col items-center justify-center gap-5 border border-dashed px-6 py-10 text-center",
        )}
      >
        <div className={styles.stack} aria-hidden="true">
          <span className={styles.stackCard} />
          <span className={styles.stackCard} />
          <span className={styles.stackCard}>
            <ImagePlus className="size-7" />
          </span>
        </div>
        <div>
          <p className="text-title3 font-bold">Pilih foto &amp; video</p>
          <p className="text-muted mt-1 text-footnote text-balance">
            Hingga {drafts.max} item dalam satu pin. Pengunjung cukup menggeser
            untuk melihat semuanya.
          </p>
        </div>
        <div className="flex w-full max-w-xs gap-2">
          <Button className="flex-1" onClick={onPickGallery} disabled={disabled}>
            <ImagePlus className="size-4" aria-hidden="true" /> Galeri
          </Button>
          <Button variant="secondary" className="flex-1" onClick={onPickCamera} disabled={disabled}>
            <Camera className="size-4" aria-hidden="true" /> Kamera
          </Button>
        </div>
        <p className="text-muted hidden text-caption1 pointer-fine:block">
          atau seret file ke sini
        </p>
      </div>
    );
  }

  const slides = drafts.items.map(draftSlide);
  const cover = drafts.items[0];
  // Indeks induk bisa basi (mis. item terakhir dihapus). Satu indeks terjepit
  // dipakai semua turunan agar carousel, filmstrip, dan tombol geser sepakat.
  const currentIndex = Math.min(
    Math.max(0, activeIndex),
    drafts.items.length - 1,
  );
  const active = drafts.items[currentIndex];
  const ratio = mediaDisplayAspectRatio(
    cover.dims?.width ?? null,
    cover.dims?.height ?? null,
    4 / 5,
    MEDIA_ASPECT_LIMITS.detail,
  );

  return (
    <div {...dropHandlers} className="space-y-3">
      <div className="relative">
        <MediaCarousel
          slides={slides}
          label="Pratinjau pin"
          aspectRatio={ratio}
          sizes="(max-width: 512px) 100vw, 512px"
          unoptimized
          videoMuted
          index={currentIndex}
          onIndexChange={onActiveIndexChange}
          className={cn(
            "rounded-ios-lg max-h-[62dvh] transition-shadow",
            dragOver && "ring-primary ring-4",
          )}
        />
        {currentIndex === 0 && (
          <span className="glass pointer-events-none absolute left-2.5 top-2.5 z-10 flex items-center gap-1 rounded-full px-2.5 py-1 text-caption1 font-semibold">
            <Star className="size-3 fill-current" aria-hidden="true" /> Sampul
          </span>
        )}
        {active?.status === "preparing" && (
          <div
            role="status"
            className="bg-surface-2/70 pointer-events-none absolute inset-0 z-10 grid place-items-center rounded-ios-lg backdrop-blur-sm"
          >
            <span className="flex flex-col items-center gap-2 text-footnote font-medium">
              <LoaderCircle className="size-6 animate-spin" aria-hidden="true" />
              Menyiapkan media…
            </span>
          </div>
        )}
        {active?.status === "error" && (
          <div
            role="alert"
            className="bg-surface/85 absolute inset-0 z-10 grid place-items-center rounded-ios-lg p-6 text-center backdrop-blur-sm"
          >
            <span className="flex flex-col items-center gap-3">
              <CircleAlert className="text-danger size-7" aria-hidden="true" />
              <span className="text-subhead font-medium">{active.error}</span>
              <Button variant="danger" size="sm" onClick={() => drafts.remove(active.id)}>
                <Trash2 className="size-4" aria-hidden="true" /> Hapus item ini
              </Button>
            </span>
          </div>
        )}
      </div>

      <Filmstrip
        drafts={drafts}
        activeIndex={currentIndex}
        onActiveIndexChange={onActiveIndexChange}
        onAdd={onPickGallery}
        uploadProgress={uploadProgress}
        disabled={disabled}
      />

      {active && (
        <DraftActions
          draft={active}
          index={currentIndex}
          total={drafts.items.length}
          disabled={disabled}
          editButtonRef={editButtonRef}
          onEdit={() => onEdit(active.id)}
          onRestore={() => drafts.restoreOriginal(active.id)}
          onMove={(to) => {
            drafts.move(active.id, to);
            onActiveIndexChange(to);
          }}
          onRemove={() => drafts.remove(active.id)}
        />
      )}
    </div>
  );
}

/**
 * Urutan item: tekan-tahan (sentuh) atau seret (mouse) untuk memindah,
 * Alt+panah untuk keyboard. Item lain bergeser dengan spring seperti iOS.
 */
function Filmstrip({
  drafts,
  activeIndex,
  onActiveIndexChange,
  onAdd,
  uploadProgress,
  disabled,
}: {
  drafts: MediaDrafts;
  activeIndex: number;
  onActiveIndexChange: (index: number) => void;
  onAdd: () => void;
  uploadProgress: Readonly<Record<string, number>>;
  disabled: boolean;
}) {
  const stripRef = useRef<HTMLDivElement>(null);
  const gestureRef = useRef<{
    index: number;
    pointerId: number;
    startX: number;
    startY: number;
    active: boolean;
    timer: number;
    target: HTMLElement;
  } | null>(null);
  const suppressClickRef = useRef(false);
  const [drag, setDrag] = useState<{ index: number; dx: number } | null>(null);
  const total = drafts.items.length;

  // Setelah tekan-tahan aktif, gulir strip dihentikan agar jari memindah item.
  useEffect(() => {
    const strip = stripRef.current;
    if (!strip) return;
    const block = (event: TouchEvent) => {
      if (gestureRef.current?.active) event.preventDefault();
    };
    strip.addEventListener("touchmove", block, { passive: false });
    return () => strip.removeEventListener("touchmove", block);
  }, []);

  const targetIndex = (from: number, dx: number) =>
    Math.min(total - 1, Math.max(0, from + Math.round(dx / THUMB_SLOT_PX)));

  function lift() {
    const gesture = gestureRef.current;
    if (!gesture || gesture.active) return;
    gesture.active = true;
    gesture.target.setPointerCapture(gesture.pointerId);
    navigator.vibrate?.(8);
    setDrag({ index: gesture.index, dx: 0 });
  }

  function onPointerDown(index: number, event: PointerEvent<HTMLButtonElement>) {
    if (disabled || total < 2 || event.button !== 0) return;
    gestureRef.current = {
      index,
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      active: false,
      timer:
        event.pointerType === "mouse" ? 0 : window.setTimeout(lift, LONG_PRESS_MS),
      target: event.currentTarget,
    };
  }

  function onPointerMove(event: PointerEvent<HTMLButtonElement>) {
    const gesture = gestureRef.current;
    if (!gesture || gesture.pointerId !== event.pointerId) return;
    const dx = event.clientX - gesture.startX;
    if (!gesture.active) {
      const moved = Math.hypot(dx, event.clientY - gesture.startY);
      if (event.pointerType === "mouse" && Math.abs(dx) > 6) lift();
      else if (event.pointerType !== "mouse" && moved > 8) {
        // Jari bergerak sebelum tahan: itu gulir biasa, bukan mengurutkan.
        window.clearTimeout(gesture.timer);
        gestureRef.current = null;
      }
      if (!gestureRef.current?.active) return;
    }
    setDrag({ index: gesture.index, dx });
  }

  function endGesture(event: PointerEvent<HTMLButtonElement>, commit: boolean) {
    const gesture = gestureRef.current;
    if (!gesture || gesture.pointerId !== event.pointerId) return;
    window.clearTimeout(gesture.timer);
    gestureRef.current = null;
    if (!gesture.active) return;
    suppressClickRef.current = true;
    setDrag(null);
    const to = targetIndex(gesture.index, event.clientX - gesture.startX);
    if (commit && to !== gesture.index) {
      drafts.move(drafts.items[gesture.index].id, to);
      onActiveIndexChange(to);
    } else {
      onActiveIndexChange(gesture.index);
    }
  }

  function onKeyDown(index: number, event: KeyboardEvent<HTMLButtonElement>) {
    if (!event.altKey || (event.key !== "ArrowLeft" && event.key !== "ArrowRight")) return;
    event.preventDefault();
    const to = index + (event.key === "ArrowLeft" ? -1 : 1);
    if (to < 0 || to >= total) return;
    drafts.move(drafts.items[index].id, to);
    onActiveIndexChange(to);
  }

  function shift(index: number) {
    if (!drag) return 0;
    if (index === drag.index) return drag.dx;
    const to = targetIndex(drag.index, drag.dx);
    if (drag.index < to && index > drag.index && index <= to) return -THUMB_SLOT_PX;
    if (drag.index > to && index < drag.index && index >= to) return THUMB_SLOT_PX;
    return 0;
  }

  return (
    <div>
      <div
        ref={stripRef}
        role="listbox"
        aria-label="Urutan item pin"
        aria-orientation="horizontal"
        className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 py-2"
      >
        {drafts.items.map((draft, index) => {
          const lifted = drag?.index === index;
          const progress = uploadProgress[draft.id];
          return (
            <button
              key={draft.id}
              type="button"
              role="option"
              aria-selected={index === activeIndex}
              aria-label={`Item ${index + 1}${index === 0 ? " (sampul)" : ""}${
                draft.status === "error" ? ", gagal disiapkan" : ""
              }`}
              data-lifted={lifted}
              onClick={() => {
                if (suppressClickRef.current) {
                  suppressClickRef.current = false;
                  return;
                }
                onActiveIndexChange(index);
              }}
              onPointerDown={(event) => onPointerDown(index, event)}
              onPointerMove={onPointerMove}
              onPointerUp={(event) => endGesture(event, true)}
              onPointerCancel={(event) => endGesture(event, false)}
              onKeyDown={(event) => onKeyDown(index, event)}
              onContextMenu={(event) => event.preventDefault()}
              style={{
                transform: `translate3d(${shift(index)}px, 0, 0) scale(${lifted ? 1.08 : 1})`,
              }}
              className={cn(
                styles.thumb,
                "bg-surface-2 relative size-16 shrink-0 overflow-hidden rounded-xl",
                index === activeIndex
                  ? "ring-primary ring-offset-bg ring-2 ring-offset-2"
                  : "opacity-80",
              )}
            >
              <DraftThumb draft={draft} />
              <span className="absolute left-1 top-1 grid size-4.5 place-items-center rounded-full bg-black/55 text-caption2 font-bold text-white">
                {index + 1}
              </span>
              {draft.status === "preparing" && (
                <span className="absolute inset-0 grid place-items-center bg-black/30 text-white">
                  <LoaderCircle className="size-5 animate-spin" aria-hidden="true" />
                </span>
              )}
              {draft.status === "error" && (
                <span className="bg-danger/80 absolute inset-0 grid place-items-center text-white">
                  <CircleAlert className="size-5" aria-hidden="true" />
                </span>
              )}
              {progress !== undefined && <ProgressRing value={progress} />}
            </button>
          );
        })}
        {!drafts.full && (
          <button
            type="button"
            onClick={onAdd}
            disabled={disabled}
            aria-label="Tambah foto atau video"
            className={cn(
              styles.thumb,
              "border-border text-muted hover:text-primary-readable hover:border-primary grid size-16 shrink-0 place-items-center rounded-xl border border-dashed transition-colors disabled:opacity-50",
            )}
          >
            <Plus className="size-6" aria-hidden="true" />
          </button>
        )}
      </div>
      <p className="text-muted px-1 text-caption1">
        {total}/{drafts.max} item
        {total > 1 && " · tahan & geser thumbnail untuk mengurutkan"}
      </p>
    </div>
  );
}

function DraftThumb({ draft }: { draft: MediaDraft }) {
  if (!draft.preview) {
    return <span className="absolute inset-0" style={{ background: gradientCss(draft.id) }} />;
  }
  return (
    <>
      {draft.isVideo ? (
        <video
          src={draft.preview}
          muted
          playsInline
          preload="metadata"
          className="pointer-events-none absolute inset-0 h-full w-full object-cover"
        />
      ) : (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={draft.preview}
          alt=""
          draggable={false}
          className="pointer-events-none absolute inset-0 h-full w-full object-cover"
        />
      )}
      {draft.isVideo && (
        <span className="media-badge absolute bottom-1 right-1 grid size-4.5 place-items-center rounded-full">
          <Play className="size-2.5 fill-current" aria-hidden="true" />
        </span>
      )}
    </>
  );
}

function ProgressRing({ value }: { value: number }) {
  const radius = 14;
  const circumference = 2 * Math.PI * radius;
  const done = value >= 100;
  return (
    <span className="absolute inset-0 grid place-items-center bg-black/35" aria-hidden="true">
      <svg viewBox="0 0 36 36" className={cn(styles.ring, "size-9")}>
        <circle cx="18" cy="18" r={radius} fill="none" stroke="white" strokeOpacity={0.3} strokeWidth={3} />
        <circle
          cx="18"
          cy="18"
          r={radius}
          fill="none"
          stroke={done ? "rgb(var(--tone-green))" : "white"}
          strokeWidth={3}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={circumference * (1 - Math.min(100, value) / 100)}
        />
      </svg>
    </span>
  );
}

function DraftActions({
  draft,
  index,
  total,
  disabled,
  editButtonRef,
  onEdit,
  onRestore,
  onMove,
  onRemove,
}: {
  draft: MediaDraft;
  index: number;
  total: number;
  disabled: boolean;
  editButtonRef: Ref<HTMLButtonElement>;
  onEdit: () => void;
  onRestore: () => void;
  onMove: (to: number) => void;
  onRemove: () => void;
}) {
  const locked = disabled || draft.status === "preparing";
  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        {draft.canEdit && (
          <Button
            ref={editButtonRef}
            variant="secondary"
            size="sm"
            disabled={locked}
            onClick={onEdit}
          >
            <WandSparkles className="size-4" aria-hidden="true" />
            {draft.isEdited ? "Edit lagi" : "Edit foto"}
          </Button>
        )}
        {draft.isEdited && (
          <Button variant="ghost" size="sm" disabled={locked} onClick={onRestore}>
            <RotateCcw className="size-4" aria-hidden="true" /> Asli
          </Button>
        )}
        <div className="ml-auto flex items-center gap-1.5">
          <IconButton
            aria-label="Geser item ke kiri"
            disabled={disabled || index === 0}
            onClick={() => onMove(index - 1)}
            className="disabled:opacity-40"
          >
            <ChevronLeft className="relative size-4.5" aria-hidden="true" />
          </IconButton>
          <IconButton
            aria-label="Geser item ke kanan"
            disabled={disabled || index === total - 1}
            onClick={() => onMove(index + 1)}
            className="disabled:opacity-40"
          >
            <ChevronRight className="relative size-4.5" aria-hidden="true" />
          </IconButton>
          {index > 0 && (
            <IconButton
              aria-label="Jadikan sampul"
              title="Jadikan sampul"
              disabled={disabled}
              onClick={() => onMove(0)}
            >
              <Star className="relative size-4.5" aria-hidden="true" />
            </IconButton>
          )}
          <IconButton
            aria-label="Hapus item"
            title="Hapus item"
            disabled={disabled}
            onClick={onRemove}
            className="text-danger disabled:opacity-40"
          >
            <Trash2 className="relative size-4.5" aria-hidden="true" />
          </IconButton>
        </div>
      </div>
      {draft.notice && draft.status === "ready" && (
        <p className="text-muted px-1 text-caption1 leading-relaxed" role="status">
          {draft.notice}
        </p>
      )}
      {draft.status === "ready" && !draft.canEdit && !draft.isVideo && (
        <p className="text-muted px-1 text-caption1">{PHOTO_EDITOR_HELP}</p>
      )}
      {draft.isEdited && (
        <p className="text-success px-1 text-caption1 font-medium">
          Hasil edit dipakai saat pin dibagikan.
        </p>
      )}
    </div>
  );
}
