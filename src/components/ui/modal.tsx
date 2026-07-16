"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { X } from "lucide-react";
import { useMotionPresence } from "@/components/motion";

const FOCUSABLE_SELECTOR = [
  "a[href]",
  "button:not([disabled])",
  "input:not([disabled]):not([type='hidden'])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  "[tabindex]:not([tabindex='-1'])",
].join(",");

function focusableElements(root: HTMLElement) {
  return Array.from(root.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)).filter(
    (element) =>
      element.getAttribute("aria-hidden") !== "true" &&
      !element.hasAttribute("hidden") &&
      element.getClientRects().length > 0,
  );
}

/**
 * Dialog iOS: bottom sheet di mobile, modal terpusat di desktop. Memakai material
 * .sheet-panel (adaptif light/dark) + animasi masuk halus + tombol tutup glass.
 * Esc menutup, scroll body dikunci saat terbuka, dan diberi peran dialog (a11y).
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
  const { active, finishExit, present } = useMotionPresence(open);

  useEffect(() => {
    if (!present) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && open) onClose();
      if (e.key !== "Tab" || !open || !dialogRef.current) return;

      const dialog = dialogRef.current;
      const elements = focusableElements(dialog);
      if (elements.length === 0) {
        e.preventDefault();
        dialog.focus();
        return;
      }

      const first = elements[0]!;
      const last = elements[elements.length - 1]!;
      const focused = document.activeElement;
      if (e.shiftKey && (focused === first || !dialog.contains(focused))) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && focused === last) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [onClose, open, present]);

  useEffect(() => {
    if (!active) return;
    const previous = document.activeElement as HTMLElement | null;
    dialogRef.current?.focus();
    return () => previous?.focus();
  }, [active]);

  if (!present) return null;

  return (
    <div
      className="motion-modal-root fixed inset-0 z-50 flex items-end justify-center sm:items-center"
      data-open={active}
    >
      <div
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
        className="sheet-panel motion-sheet rounded-t-glass sm:rounded-glass relative z-10 flex max-h-[92vh] w-full max-w-lg flex-col overflow-hidden [max-height:92dvh]"
      >
        <header className="border-border flex items-center justify-between border-b px-5 py-3.5">
          <h2 className="font-display text-lg font-bold">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup"
            className="glass-button grid h-8 w-8 place-items-center rounded-full"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </header>
        <div className="motion-scroll-region overflow-y-auto p-5 pb-[calc(1.25rem+var(--safe-bottom))] sm:pb-5">
          {children}
        </div>
      </div>
    </div>
  );
}
