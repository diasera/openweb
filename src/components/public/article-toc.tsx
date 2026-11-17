"use client";

import { useEffect, useState } from "react";
import { ChevronDown, ListTree } from "lucide-react";
import type { ArticleHeading } from "@/lib/blog/toc";
import { cn } from "@/lib/utils/cn";

/**
 * Bilah progres baca tipis (2.5px) di tepi atas layar. Digerakkan murni oleh
 * CSS Scroll-Driven Animation (`animation-timeline: scroll(root)`) di GPU
 * compositor tanpa listener JavaScript.
 */
export function ReadingProgressBar() {
  return (
    <div
      aria-hidden="true"
      className="motion-reading-progress pointer-events-none fixed inset-x-0 top-0 z-50 h-[2.5px] bg-primary"
    />
  );
}

/**
 * Daftar Isi (Table of Contents) editorial untuk artikel yang memiliki minimal
 * 2 subjudul. Melacak bagian yang sedang dibaca dengan IntersectionObserver.
 */
export function ArticleToc({ headings }: { headings: readonly ArticleHeading[] }) {
  const [open, setOpen] = useState(false);
  const [activeId, setActiveId] = useState<string>(() => headings[0]?.id ?? "");

  useEffect(() => {
    if (headings.length < 2) return;
    const elements = headings
      .map((item) => document.getElementById(item.id))
      .filter((el): el is HTMLElement => Boolean(el));
    if (elements.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible[0]?.target.id) {
          setActiveId(visible[0].target.id);
        }
      },
      { rootMargin: "-14% 0px -72% 0px", threshold: [0, 1] },
    );

    elements.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [headings]);

  if (headings.length < 2) return null;

  const activeHeading =
    headings.find((item) => item.id === activeId) ?? headings[0]!;

  return (
    <nav
      aria-label="Daftar isi artikel"
      className="border-border bg-surface shadow-soft mt-5 overflow-hidden rounded-2xl border"
    >
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
        className="hover:bg-surface-2/60 flex w-full items-center justify-between gap-3 px-4 py-3 text-left transition-colors"
      >
        <span className="flex min-w-0 items-center gap-2.5">
          <span className="bg-primary/12 text-primary-readable grid size-7 shrink-0 place-items-center rounded-xl">
            <ListTree className="size-4" aria-hidden="true" />
          </span>
          <span className="min-w-0">
            <span className="block text-xs font-bold uppercase tracking-wider">
              Daftar Isi · {headings.length} bagian
            </span>
            {!open && (
              <span className="text-muted block truncate text-xs">
                {activeHeading.text}
              </span>
            )}
          </span>
        </span>
        <ChevronDown
          aria-hidden="true"
          className={cn(
            "text-muted size-4 shrink-0 transition-transform duration-200",
            open && "rotate-180",
          )}
        />
      </button>

      {open && (
        <ol className="border-border/70 animate-fade-in space-y-0.5 border-t px-3 py-2.5">
          {headings.map((item, idx) => {
            const isCurrent = item.id === activeId;
            return (
              <li key={item.id}>
                <a
                  href={`#${item.id}`}
                  onClick={() => {
                    setActiveId(item.id);
                  }}
                  className={cn(
                    "flex items-baseline gap-2 rounded-xl px-2.5 py-1.5 text-sm transition-colors",
                    item.depth === 1 && "pl-6 text-xs",
                    isCurrent
                      ? "bg-primary/10 text-primary-readable font-semibold"
                      : "text-muted hover:bg-surface-2 hover:text-foreground",
                  )}
                >
                  <span className="text-caption2 font-mono opacity-65 tabular-nums">
                    {String(idx + 1).padStart(2, "0")}
                  </span>
                  <span className="min-w-0 flex-1">{item.text}</span>
                </a>
              </li>
            );
          })}
        </ol>
      )}
    </nav>
  );
}
