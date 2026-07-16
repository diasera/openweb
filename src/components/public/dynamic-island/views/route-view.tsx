"use client";

import Image from "next/image";
import { Bell, ChevronLeft, Search, X } from "lucide-react";
import { ThemeToggle } from "@/components/public/theme-toggle";
import { MusicQuickButton } from "@/components/public/music";
import { MotionLink, useAppMotion } from "@/components/motion";
import {
  IconButton,
  iconButtonClass,
} from "@/components/ui/icon-button";
import type { IslandRouteConfig } from "../dynamic-island.types";

export function RouteView({ config }: { config: IslandRouteConfig }) {
  const { goBack } = useAppMotion();

  if (config.variant === "main") {
    return (
      <div className="flex h-full items-center justify-between pl-2.5 pr-2">
        <MotionLink
          href="/"
          prefetch={false}
          className="motion-pressable flex min-w-0 items-center gap-2.5"
        >
          {config.logoUrl ? (
            <Image
              src={config.logoUrl}
              alt={config.siteName}
              width={36}
              height={36}
              className="h-9 w-9 shrink-0 rounded-full object-cover"
            />
          ) : (
            <span className="bg-primary grid h-9 w-9 shrink-0 place-items-center rounded-full text-base font-bold text-white">
              {config.siteName.charAt(0).toUpperCase()}
            </span>
          )}
          <span className="font-display truncate text-lg font-bold">
            {config.siteName}
          </span>
        </MotionLink>

        <nav className="flex shrink-0 items-center gap-1">
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
      <div className="flex h-full items-center gap-2 pl-2 pr-2.5 lg:px-3">
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
        <h1 className="font-display flex-1 truncate text-center text-base font-bold">
          {config.title}
        </h1>
        <div className="flex min-w-9 shrink-0 items-center justify-end gap-1">
          {config.right}
          <MusicQuickButton />
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full items-center justify-between px-4 lg:px-6">
      <h1 className="font-display truncate text-lg font-bold">{config.title}</h1>
      <div className="flex shrink-0 items-center gap-1">
        {config.right}
        <MusicQuickButton />
        <ThemeToggle />
      </div>
    </div>
  );
}
