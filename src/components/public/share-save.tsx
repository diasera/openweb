"use client";

import { useEffect, useState } from "react";
import { Share, Bookmark } from "lucide-react";
import { IconButton } from "@/components/ui/icon-button";
import { cn } from "@/lib/utils/cn";
import { useToast } from "@/components/ui/toast";

/** Tombol bagikan (Web Share API / salin tautan). Dipakai Detail Pin & Artikel. */
export function ShareButton({ title }: { title?: string }) {
  const { toast } = useToast();

  async function share() {
    const url = window.location.href;
    if (navigator.share) {
      try {
        await navigator.share({ title, url });
        return;
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") return;
        // Implementasi Web Share parsial tetap mendapat fallback clipboard.
      }
    }
    try {
      if (!navigator.clipboard?.writeText) {
        throw new Error("Clipboard tidak tersedia");
      }
      await navigator.clipboard.writeText(url);
      toast.success("Tautan disalin");
    } catch {
      toast.error("Tautan tidak dapat disalin");
    }
  }
  return (
    <IconButton
      onClick={share}
      aria-label="Bagikan"
    >
      <Share className="h-5 w-5" aria-hidden="true" />
    </IconButton>
  );
}

/** Tombol simpan (bookmark) tersimpan di localStorage. `pill` untuk gaya Detail Pin. */
export function SaveButton({ id, pill }: { id: string; pill?: boolean }) {
  const [saved, setSaved] = useState(false);
  const key = `saved:${id}`;

  useEffect(() => {
    try {
      setSaved(localStorage.getItem(key) === "1");
    } catch {
      /* ignore */
    }
  }, [key]);

  function toggle() {
    const next = !saved;
    setSaved(next);
    try {
      if (next) localStorage.setItem(key, "1");
      else localStorage.removeItem(key);
    } catch {
      /* ignore */
    }
  }

  if (pill) {
    return (
      <button
        type="button"
        onClick={toggle}
        className="bg-primary inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-sm font-semibold text-white"
      >
        <Bookmark
          className={cn(
            "h-4 w-4",
            saved && "animate-symbol-bounce fill-current",
          )}
          aria-hidden="true"
        />
        {saved ? "Tersimpan" : "Simpan"}
      </button>
    );
  }

  return (
    <IconButton
      onClick={toggle}
      aria-label="Simpan"
    >
      <Bookmark
        className={cn(
          "h-5 w-5",
          saved && "animate-symbol-bounce text-primary-readable fill-current",
        )}
        aria-hidden="true"
      />
    </IconButton>
  );
}
