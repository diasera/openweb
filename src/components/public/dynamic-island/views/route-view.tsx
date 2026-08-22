"use client";

import Image from "next/image";
import { cn } from "@/lib/utils/cn";
import { Bell, ChevronLeft, Search, X } from "lucide-react";
import { ThemeToggle } from "@/components/public/theme-toggle";
import { MusicQuickButton } from "@/components/public/music";
import { MotionLink, useAppMotion } from "@/components/motion";
import {
  IconButton,
  iconButtonClass,
} from "@/components/ui/icon-button";
import type { IslandRouteConfig } from "../dynamic-island.types";
import styles from "../dynamic-island.module.css";

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
  onExpand,
}: {
  config: IslandRouteConfig;
  onExpand: () => void;
}) {
  const { goBack } = useAppMotion();

  if (config.variant === "main") {
    return (
      <div className="flex h-full items-center justify-between pl-1.5 pr-1.5">
        <ExpandTrigger
          onExpand={onExpand}
          label="Buka panel cepat"
          className="motion-pressable flex min-w-0 items-center gap-2"
        >
          {config.logoUrl ? (
            <Image
              src={config.logoUrl}
              alt={config.siteName}
              width={32}
              height={32}
              className="h-8 w-8 shrink-0 rounded-full object-cover"
            />
          ) : (
            <span className="bg-foreground/10 grid h-8 w-8 shrink-0 place-items-center rounded-full text-sm font-bold">
              {config.siteName.charAt(0).toUpperCase()}
            </span>
          )}
          <span className="font-display truncate text-[15px] font-bold tracking-tight">
            {config.siteName}
          </span>
        </ExpandTrigger>

        <span className={styles.lens} aria-hidden="true" />

        <nav className="flex shrink-0 items-center gap-0.5">
          <MusicQuickButton />
          <MotionLink
            href="/galeri"
            prefetch={false}
            aria-label="Cari"
            className={iconButtonClass()}
          >
            <Search className="h-[18px] w-[18px]" />
          </MotionLink>
          <MotionLink
            href="/notifikasi"
            aria-label="Notifikasi"
            className={iconButtonClass()}
          >
            <Bell className="h-[18px] w-[18px]" />
          </MotionLink>
          <ThemeToggle />
        </nav>
      </div>
    );
  }

  if (config.variant === "sub") {
    return (
      <div className="flex h-full items-center gap-2 pl-1.5 pr-2">
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
          label="Buka panel cepat"
          className="font-display block min-w-0 flex-1 truncate text-center text-[15px] font-bold tracking-tight"
        >
          {config.title}
        </ExpandTrigger>
        <div className="flex min-w-9 shrink-0 items-center justify-end gap-1">
          {config.right}
          <MusicQuickButton />
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full items-center justify-between pl-3 pr-1.5">
      <ExpandTrigger
        onExpand={onExpand}
        label="Buka panel cepat"
        className="font-display truncate text-[15px] font-bold tracking-tight"
      >
        {config.title}
      </ExpandTrigger>
      <div className="flex shrink-0 items-center gap-0.5">
        {config.right}
        <MusicQuickButton />
        <ThemeToggle />
      </div>
    </div>
  );
}
