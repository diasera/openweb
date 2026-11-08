"use client";

import { useLayoutEffect } from "react";
import { usePathname } from "next/navigation";
import { useDynamicIsland } from "./dynamic-island-context";
import type { PageChromeRegistration } from "./dynamic-island.types";

/**
 * Halaman hanya mendaftarkan konfigurasi; tidak merender bar fisik. Layout
 * effect agar chrome terpasang sebelum paint pertama. React 19 tidak lagi
 * memperingatkan useLayoutEffect saat SSR, jadi shim isomorfik tak diperlukan.
 */
export function IslandRegistrar({ config }: { config: PageChromeRegistration }) {
  const pathname = usePathname();
  const { registerPage } = useDynamicIsland();

  useLayoutEffect(
    () => registerPage(pathname, config),
    [config, pathname, registerPage],
  );

  return null;
}
