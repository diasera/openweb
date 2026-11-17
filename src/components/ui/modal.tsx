"use client";

import { useRef, type PointerEvent, type ReactNode } from "react";
import { X } from "lucide-react";
import { useMotionPresence } from "@/components/motion";
import { IconButton } from "@/components/ui/icon-button";
import { useDialogFocusTrap } from "@/lib/hooks/use-dialog-focus-trap";

const DISMISS_DISTANCE_PX = 110;
const DISMISS_FLICK_DISTANCE_PX = 36;
const DISMISS_VELOCITY_PX_PER_MS = 0.55;

interface SheetDragSession {
  pointerId: number;
  startY: number;
  lastY: number;
  lastTime: number;
  velocity: number;
  dragging: boolean;
}

function rubberBandOffset(dy: number): number {
  if (dy >= 0) return dy;
  return -Math.min(28, Math.sqrt(-dy) * 2.2);
}

/**
 * Dialog iOS: bottom sheet di mobile, modal terpusat di desktop. Memakai material
 * .sheet-panel (adaptif light/dark), grabber sentuh dengan fisika rubber-band
 * drag-to-dismiss, tombol tutup glass, serta kunci fokus & Escape terpusat.
 */
export function Modal({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
}) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const backdropRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<SheetDragSession | null>(null);
  const { active, finishExit, present } = useMotionPresence(open);

  useDialogFocusTrap({
    dialogRef,
    open,
    present,
    active,
    onClose,
  });

  function clearDragStyles() {
    const sheet = dialogRef.current;
    const backdrop = backdropRef.current;
    if (sheet) {
      sheet.style.transform = "";
      sheet.style.transition = "";
    }
    if (backdrop) {
      backdrop.style.opacity = "";
      backdrop.style.transition = "";
    }
  }

  function onHeaderPointerDown(event: PointerEvent<HTMLElement>) {
    if (
      !open ||
      (event.pointerType === "mouse" && event.button !== 0) ||
      (event.target as HTMLElement).closest("button, a, input, select, textarea")
    ) {
      return;
    }
    dragRef.current = {
      pointerId: event.pointerId,
      startY: event.clientY,
      lastY: event.clientY,
      lastTime: performance.now(),
      velocity: 0,
      dragging: false,
    };
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function onHeaderPointerMove(event: PointerEvent<HTMLElement>) {
    const session = dragRef.current;
    if (!session || session.pointerId !== event.pointerId) return;

    const dy = event.clientY - session.startY;
    if (!session.dragging && Math.abs(dy) < 6) return;
    session.dragging = true;

    const now = performance.now();
    const dt = Math.max(1, now - session.lastTime);
    session.velocity = (event.clientY - session.lastY) / dt;
    session.lastY = event.clientY;
    session.lastTime = now;

    const offset = rubberBandOffset(dy);
    const sheet = dialogRef.current;
    const backdrop = backdropRef.current;
    if (sheet) {
      sheet.style.transition = "none";
      sheet.style.transform = `translate3d(0, ${offset.toFixed(1)}px, 0)`;
    }
    if (backdrop && dy > 0) {
      backdrop.style.transition = "none";
      backdrop.style.opacity = String(Math.max(0.2, 1 - Math.min(0.8, dy / 340)));
    }
  }

  function onHeaderPointerEnd(event: PointerEvent<HTMLElement>) {
    const session = dragRef.current;
    if (!session || session.pointerId !== event.pointerId) return;
    dragRef.current = null;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    if (!session.dragging) return;

    const dy = event.clientY - session.startY;
    const shouldDismiss =
      dy > DISMISS_DISTANCE_PX ||
      (dy > DISMISS_FLICK_DISTANCE_PX && session.velocity > DISMISS_VELOCITY_PX_PER_MS);

    clearDragStyles();
    if (shouldDismiss) onClose();
  }

  if (!present) return null;

  return (
    <div
      className="motion-modal-root fixed inset-0 z-50 flex items-end justify-center sm:items-center"
      data-open={active}
    >
      <div
        ref={backdropRef}
        className="motion-modal-backdrop absolute inset-0 bg-black/50 backdrop-blur-[2px]"
        onClick={onClose}
        aria-hidden
      />
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        tabIndex={-1}
        onTransitionEnd={(event) => {
          if (event.target === event.currentTarget) finishExit();
        }}
        className="sheet-panel motion-sheet rounded-t-ios-lg sm:rounded-ios-lg relative z-10 flex max-h-[92dvh] w-full max-w-lg flex-col overflow-hidden"
      >
        <header
          onPointerDown={onHeaderPointerDown}
          onPointerMove={onHeaderPointerMove}
          onPointerUp={onHeaderPointerEnd}
          onPointerCancel={onHeaderPointerEnd}
          className="border-border shrink-0 touch-none select-none border-b px-5 pb-3.5 pt-2 sm:py-3.5"
        >
          <div
            aria-hidden="true"
            className="bg-foreground/18 mx-auto mb-2 h-1.25 w-9 rounded-full sm:hidden"
          />
          <div className="flex items-center justify-between gap-3">
            <h2 className="font-display text-lg font-bold">{title}</h2>
            <IconButton onClick={onClose} aria-label="Tutup">
              <X className="h-5 w-5" aria-hidden="true" />
            </IconButton>
          </div>
        </header>
        <div className="motion-scroll-region overflow-y-auto p-5 pb-[calc(1.25rem+var(--safe-bottom))] sm:pb-5">
          {children}
        </div>
      </div>
    </div>
  );
}
