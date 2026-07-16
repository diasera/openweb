"use client";

import { useEffect, useLayoutEffect } from "react";
import { usePathname } from "next/navigation";
import { useDynamicIsland } from "./dynamic-island-context";
import type { PageChromeRegistration } from "./dynamic-island.types";

const useIsoLayoutEffect =
  typeof window !== "undefined" ? useLayoutEffect : useEffect;

/** Halaman hanya mendaftarkan konfigurasi; tidak merender bar fisik. */
export function IslandRegistrar({ config }: { config: PageChromeRegistration }) {
  const pathname = usePathname();
  const { registerPage } = useDynamicIsland();

  useIsoLayoutEffect(
    () => registerPage(pathname, config),
    [config, pathname, registerPage],
  );

  return null;
}
