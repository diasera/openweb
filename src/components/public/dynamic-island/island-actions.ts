"use client";

import { useLayoutEffect } from "react";
import { usePathname } from "next/navigation";
import { useDynamicIsland } from "./dynamic-island-context";
import type { IslandPageActions } from "./dynamic-island.types";

/**
 * Pasang aksi halaman (status + tombol Simpan/Terbitkan) di Dynamic Island
 * selama komponen ini terpasang. Dipanggil ulang tiap render agar status
 * (pending, belum disimpan, progres) selalu segar; dilepas saat unmount.
 * Tombol yang dirender di island berada di luar <form>: pakai atribut
 * `form="id"` atau onClick, bukan submit implisit.
 */
export function useIslandActions(actions: IslandPageActions | null) {
  const pathname = usePathname();
  const { registerActions } = useDynamicIsland();

  useLayoutEffect(() => {
    if (!actions) return;
    return registerActions(pathname, actions);
  }, [actions, pathname, registerActions]);
}
