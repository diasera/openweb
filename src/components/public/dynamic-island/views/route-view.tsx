"use client";

import { cn } from "@/lib/utils/cn";
import { Bell, ChevronLeft, Search, X } from "lucide-react";
import { ThemeToggle } from "@/components/public/theme-toggle";
import { MusicQuickButton } from "@/components/public/music";
import { SiteLogo } from "@/components/public/site-logo";
import { MotionLink, useAppMotion } from "@/components/motion";
import {
  IconButton,
  iconButtonClass,
} from "@/components/ui/icon-button";
import type {
  IslandEvent,
  IslandExpandOptions,
  IslandRouteConfig,
} from "../dynamic-island.types";
import { IslandEventChip } from "./event-activity";
import styles from "../dynamic-island.module.css";

/** Nama aksesibel memuat teks yang terlihat (WCAG 2.5.3 Label in Name). */
function expandLabel(visibleText: string) {
  return visibleText ? `${visibleText}, buka panel cepat` : "Buka panel cepat";
}

function ExpandTrigger({
  onExpand,
  children,
  className,
  label,
}: {
  onExpand: () => void;
  children: React.ReactNode;
  className?: string;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onExpand}
      aria-haspopup="dialog"
      aria-label={label}
      title={label}
      className={cn(styles.expandTrigger, className)}
    >
      {children}
    </button>
  );
}

export function RouteView({
  config,
  event,
  onExpand,
}: {
  config: IslandRouteConfig;
  event: IslandEvent | null;
  onExpand: (options?: IslandExpandOptions) => void;
}) {
  const { goBack } = useAppMotion();

  if (config.variant === "main") {
    return (
      <div className="flex h-full items-center justify-between pl-1.5 pr-1.5">
        <ExpandTrigger
          onExpand={onExpand}
          label={expandLabel(config.siteName)}
          className="motion-pressable flex min-w-0 items-center gap-2"
        >
          <SiteLogo name={config.siteName} url={config.logoUrl} size={32} />
          <span className="font-display truncate text-subhead font-bold">
            {config.siteName}
          </span>
        </ExpandTrigger>

        <IslandEventChip
          event={event}
          onExpand={() => onExpand()}
          fallback={<span className={styles.lens} aria-hidden="true" />}
        />

        <nav className="flex shrink-0 items-center gap-0.5">
          <MusicQuickButton />
          {/* Cari = Spotlight seluruh situs (media, artikel, anggota), bukan galeri saja. */}
          <IconButton
            onClick={() => onExpand({ focusSearch: true })}
            aria-label="Cari di situs"
            aria-haspopup="dialog"
            aria-keyshortcuts="Control+K Meta+K /"
            title="Cari (Ctrl/⌘ K)"
          >
            <Search className="size-4.5" />
          </IconButton>
          <MotionLink
            href="/notifikasi"
            aria-label="Notifikasi"
            className={iconButtonClass()}
          >
            <Bell className="size-4.5" />
          </MotionLink>
          <ThemeToggle />
        </nav>
      </div>
    );
  }

  if (config.variant === "sub") {
    // Prioritas edit: Kembali · judul · aksi halaman (· musik bila diputar).
    // Judul rata kiri agar tombol tidak berebut tempat di tengah island.
    const hasActions = Boolean(config.actions);
    return (
      <div className="flex h-full items-center gap-2 pl-1.5 pr-1.5">
        <IconButton
          onClick={() => goBack(config.backHref ?? "/")}
          aria-label={config.close ? "Tutup" : "Kembali"}
          className="shrink-0"
        >
          {config.close ? (
            <X className="h-5 w-5" />
          ) : (
            <ChevronLeft className="h-5 w-5" />
          )}
        </IconButton>
        <ExpandTrigger
          onExpand={onExpand}
          label={expandLabel(config.title)}
          className={cn(
            "font-display block min-w-0 flex-1 truncate text-subhead font-bold",
            hasActions ? "text-left" : "text-center",
          )}
        >
          {config.title}
        </ExpandTrigger>
        <div className="flex min-w-9 shrink-0 items-center justify-end gap-1">
          {hasActions ? (
            <span className="animate-control-pop flex items-center gap-1">{config.actions}</span>
          ) : (
            config.right
          )}
          <MusicQuickButton onlyWhilePlaying={hasActions} />
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full items-center justify-between pl-3 pr-1.5">
      <ExpandTrigger
        onExpand={onExpand}
        label={expandLabel(config.title)}
        className="font-display truncate text-subhead font-bold"
      >
        {config.title}
      </ExpandTrigger>
      <div className="flex shrink-0 items-center gap-0.5">
        <IslandEventChip event={event} onExpand={() => onExpand()} />
        {config.right}
        <MusicQuickButton />
        <ThemeToggle />
      </div>
    </div>
  );
}
