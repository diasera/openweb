"use client";

import { Share, Bookmark } from "lucide-react";
import { IconButton } from "@/components/ui/icon-button";
import { cn } from "@/lib/utils/cn";
import { useToast } from "@/components/ui/toast";
import {
  saveItem,
  toggleSaved,
  useIsSaved,
  type SavedKind,
} from "@/lib/saved-items";

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

/** Satu pintu simpan/lepas + toast: tombol Simpan dan gestur ketuk dua kali. */
export function useSaveToggle(kind: SavedKind, itemId: string) {
  const saved = useIsSaved(kind, itemId);
  const { toast } = useToast();

  const notifySaved = () => toast.success("Disimpan ke Tersimpan");

  function toggle() {
    if (toggleSaved(kind, itemId)) notifySaved();
  }

  // Seperti "suka" Instagram: ketuk dua kali hanya menyimpan, tidak pernah
  // melepas; idempoten meski gestur terpicu beruntun sebelum render ulang.
  function save() {
    if (saveItem(kind, itemId)) notifySaved();
  }

  return { saved, toggle, save };
}

/** Tombol simpan ke koleksi Tersimpan (perangkat ini). `pill` untuk gaya Detail Pin. */
export function SaveButton({
  kind,
  itemId,
  pill,
}: {
  kind: SavedKind;
  itemId: string;
  pill?: boolean;
}) {
  const { saved, toggle } = useSaveToggle(kind, itemId);

  if (pill) {
    return (
      <button
        type="button"
        onClick={toggle}
        aria-pressed={saved}
        className="bg-primary text-primary-foreground inline-flex h-9 items-center gap-1.5 rounded-full px-3.5 text-sm font-semibold"
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
      aria-label={saved ? "Hapus dari Tersimpan" : "Simpan"}
      aria-pressed={saved}
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
