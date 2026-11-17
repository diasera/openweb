"use client";

import { useEffect, useEffectEvent, type RefObject } from "react";

const FOCUSABLE_SELECTOR = [
  "a[href]",
  "button:not([disabled])",
  "input:not([disabled]):not([type='hidden'])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  "[tabindex]:not([tabindex='-1'])",
].join(",");

function getFocusableElements(root: HTMLElement): HTMLElement[] {
  return Array.from(root.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)).filter(
    (element) =>
      element.getAttribute("aria-hidden") !== "true" &&
      !element.hasAttribute("hidden") &&
      element.getClientRects().length > 0,
  );
}

function isTopmostModalDialog(dialog: HTMLElement): boolean {
  const modals = document.querySelectorAll<HTMLElement>(
    '[role="dialog"][aria-modal="true"]',
  );
  return modals.length === 0 || modals[modals.length - 1] === dialog;
}

/**
 * Pusat aksesibilitas dialog modal (Modal, MediaLightbox, CommandPalette):
 * mengunci scroll body selama tampil, menjebak fokus Tab/Shift+Tab di dalam
 * dialog teratas, menangani tombol Escape, dan memulihkan fokus ke pemicu awal.
 */
export function useDialogFocusTrap({
  dialogRef,
  open,
  present,
  active,
  onClose,
}: {
  dialogRef: RefObject<HTMLElement | null>;
  open: boolean;
  present: boolean;
  active: boolean;
  onClose: () => void;
}) {
  const handleClose = useEffectEvent(onClose);

  useEffect(() => {
    if (!present) return;

    const onKeyDown = (event: KeyboardEvent) => {
      const dialog = dialogRef.current;
      if (!open || !dialog || !isTopmostModalDialog(dialog)) return;

      if (event.key === "Escape") {
        event.preventDefault();
        event.stopPropagation();
        handleClose();
        return;
      }

      if (event.key !== "Tab") return;

      const elements = getFocusableElements(dialog);
      if (elements.length === 0) {
        event.preventDefault();
        dialog.focus();
        return;
      }

      const first = elements[0]!;
      const last = elements[elements.length - 1]!;
      const focused = document.activeElement;
      if (event.shiftKey && (focused === first || !dialog.contains(focused))) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && (focused === last || !dialog.contains(focused))) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", onKeyDown);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = prevOverflow;
    };
  }, [dialogRef, open, present]);

  useEffect(() => {
    if (!active) return;
    const previous = document.activeElement as HTMLElement | null;
    dialogRef.current?.focus({ preventScroll: true });
    return () => {
      if (previous && document.contains(previous)) {
        previous.focus({ preventScroll: true });
      }
    };
  }, [active, dialogRef]);
}
