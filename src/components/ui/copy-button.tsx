"use client";

import { useEffect, useRef, useState } from "react";
import { Check, Copy } from "lucide-react";
import { useToast } from "@/components/ui/toast";
import { cn } from "@/lib/utils/cn";

/**
 * Tombol salin satu ketuk terpusat dengan umpan balik ikon Check + toast.
 * Dipakai ulang oleh halaman Tentang, Profil Anggota, Kartu ID, dan Pengaturan.
 */
export function CopyButton({
  value,
  label = "Salin",
  successMessage = "Berhasil disalin",
  size = "sm",
  showLabel = false,
  className,
}: {
  value: string;
  label?: string;
  successMessage?: string;
  size?: "xs" | "sm";
  showLabel?: boolean;
  className?: string;
}) {
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    },
    [],
  );

  async function handleCopy() {
    try {
      if (!navigator.clipboard?.writeText) {
        throw new Error("Clipboard tidak tersedia");
      }
      await navigator.clipboard.writeText(value);
      setCopied(true);
      toast.success(successMessage);
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => setCopied(false), 1800);
    } catch {
      toast.error("Tidak dapat menyalin ke papan klip.");
    }
  }

  return (
    <button
      type="button"
      onClick={handleCopy}
      aria-label={label}
      title={label}
      className={cn(
        "motion-pressable inline-flex shrink-0 items-center justify-center gap-1 rounded-full transition-colors",
        size === "xs"
          ? showLabel
            ? "bg-surface-2 text-muted hover:text-foreground px-2.5 py-1 text-caption2 font-semibold"
            : "bg-surface-2 text-muted hover:text-foreground size-7"
          : showLabel
            ? "bg-surface-2 text-foreground hover:bg-border px-3 py-1.5 text-xs font-semibold"
            : "bg-surface-2 text-muted hover:text-foreground size-8",
        copied && "bg-tone-green/15 text-tone-green-text",
        className,
      )}
    >
      {copied ? (
        <Check className={size === "xs" ? "size-3.5" : "size-4"} aria-hidden="true" />
      ) : (
        <Copy className={size === "xs" ? "size-3.5" : "size-4"} aria-hidden="true" />
      )}
      {showLabel && <span>{copied ? "Disalin" : label}</span>}
    </button>
  );
}
