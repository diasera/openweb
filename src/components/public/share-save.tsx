"use client";

import { Share, Bookmark } from "lucide-react";
import { buttonClass } from "@/components/ui/button";
import { IconButton } from "@/components/ui/icon-button";
import { cn } from "@/lib/utils/cn";
import { useToast } from "@/components/ui/toast";
import {
  saveItem,
  toggleSaved,
  useIsSaved,
  type SavedKind,
} from "@/lib/hooks/use-saved-items";

/**
 * Pusat tombol bagikan (Web Share API / salin tautan). Dipakai oleh Detail Pin,
 * Artikel Blog, Profil Anggota, dan Kartu Agenda.
 */
export function ShareButton({
  title,
  href,
  variant = "icon",
  label = "Bagikan",
}: {
  title?: string;
  href?: string;
  variant?: "icon" | "outlineSm";
  label?: string;
}) {
  const { toast } = useToast();

  async function share() {
    const url = href
      ? new URL(href, window.location.origin).toString()
      : window.location.href;
    if (navigator.share) {
      try {
        await navigator.share({ title, url });
        return;
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") return;
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

  if (variant === "outlineSm") {
    return (
      <button
        type="button"
        onClick={share}
        aria-label={title ? `${label}: ${title}` : label}
        className={buttonClass({ variant: "outline", size: "sm" })}
      >
        <Share className="h-3.5 w-3.5" aria-hidden="true" />
        {label}
      </button>
    );
  }

  return (
    <IconButton onClick={share} aria-label={label}>
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
