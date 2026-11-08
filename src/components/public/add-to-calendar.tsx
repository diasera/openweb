"use client";

import { useEffect, useRef, useState } from "react";
import { CalendarPlus, ChevronDown } from "lucide-react";
import { buttonClass } from "@/components/ui/button";
import { cn } from "@/lib/utils/cn";

/** Satu tombol "Tambah ke Kalender": file .ics (Apple/Outlook/Android) atau Google. */
export function AddToCalendar({
  icsHref,
  googleHref,
  className,
}: {
  icsHref: string;
  googleHref: string;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const close = (event: PointerEvent | KeyboardEvent) => {
      if (event instanceof KeyboardEvent ? event.key === "Escape" : !rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("pointerdown", close);
    document.addEventListener("keydown", close);
    return () => {
      document.removeEventListener("pointerdown", close);
      document.removeEventListener("keydown", close);
    };
  }, [open]);

  return (
    <div ref={rootRef} className={cn("relative inline-block", className)}>
      <button
        type="button"
        aria-expanded={open}
        aria-haspopup="menu"
        onClick={() => setOpen((value) => !value)}
        className={buttonClass({ variant: "outline", size: "sm" })}
      >
        <CalendarPlus className="h-4 w-4" aria-hidden="true" /> Tambah ke Kalender
        <ChevronDown className={cn("h-3.5 w-3.5 transition-transform", open && "rotate-180")} aria-hidden="true" />
      </button>
      {open && (
        <div
          role="menu"
          className="border-border bg-surface shadow-elevated absolute left-0 z-20 mt-2 w-56 overflow-hidden rounded-2xl border p-1"
        >
          <a
            role="menuitem"
            href={icsHref}
            onClick={() => setOpen(false)}
            className="hover:bg-surface-2 block rounded-xl px-3 py-2.5 text-sm font-medium"
          >
            Kalender Apple / Outlook (.ics)
          </a>
          <a
            role="menuitem"
            href={googleHref}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => setOpen(false)}
            className="hover:bg-surface-2 block rounded-xl px-3 py-2.5 text-sm font-medium"
          >
            Google Calendar
          </a>
        </div>
      )}
    </div>
  );
}
