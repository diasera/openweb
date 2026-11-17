"use client";

import { useState } from "react";
import { LoaderCircle, Sparkles } from "lucide-react";
import { buttonClass } from "@/components/ui/button";
import { IconButton } from "@/components/ui/icon-button";
import { useToast } from "@/components/ui/toast";
import {
  shareOrDownloadStoryCard,
  type StoryCardSpec,
} from "@/lib/story-card";
import { cn } from "@/lib/utils/cn";

/**
 * Satu tombol pembagi Kartu Story 9:16 (1080×1920) reusable untuk Pesan Anonim,
 * Kartu Buku Angkatan, dan Profil Anggota.
 */
export function StoryShareButton({
  spec,
  variant = "subtle",
  label = "Kartu Story",
  className,
}: {
  spec: StoryCardSpec;
  variant?: "subtle" | "icon" | "outlineSm";
  label?: string;
  className?: string;
}) {
  const { toast } = useToast();
  const [busy, setBusy] = useState(false);

  async function handleShare() {
    if (busy) return;
    setBusy(true);
    try {
      const outcome = await shareOrDownloadStoryCard(spec);
      if (outcome === "downloaded") {
        toast.success("Kartu Story 9:16 diunduh", {
          description: "Siap dipasang ke Instagram Story atau WhatsApp Status.",
        });
      }
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Gagal menyiapkan kartu Story.",
      );
    } finally {
      setBusy(false);
    }
  }

  if (variant === "icon") {
    return (
      <IconButton
        onClick={handleShare}
        disabled={busy}
        aria-label="Buat Kartu Story 9:16"
        title="Kartu Story 9:16"
        className={className}
      >
        {busy ? (
          <LoaderCircle className="size-4.5 animate-spin" aria-hidden="true" />
        ) : (
          <Sparkles className="size-4.5" aria-hidden="true" />
        )}
      </IconButton>
    );
  }

  if (variant === "outlineSm") {
    return (
      <button
        type="button"
        onClick={handleShare}
        disabled={busy}
        className={buttonClass({
          variant: "outline",
          size: "sm",
          className,
        })}
      >
        {busy ? (
          <LoaderCircle className="size-3.5 animate-spin" aria-hidden="true" />
        ) : (
          <Sparkles className="size-3.5" aria-hidden="true" />
        )}
        {label}
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={handleShare}
      disabled={busy}
      aria-label="Bagikan sebagai Kartu Story 9:16"
      title="Kartu Story 9:16"
      className={cn(
        "motion-pressable text-muted hover:text-foreground inline-flex items-center gap-1 rounded-full px-2 py-1 text-caption2 font-semibold transition-colors disabled:opacity-45",
        className,
      )}
    >
      {busy ? (
        <LoaderCircle className="size-3.25 animate-spin" aria-hidden="true" />
      ) : (
        <Sparkles className="size-3.25" aria-hidden="true" />
      )}
      <span>Story</span>
    </button>
  );
}
