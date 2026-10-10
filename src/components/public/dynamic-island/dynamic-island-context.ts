"use client";

import { createContext, useContext } from "react";
import type {
  IslandNoticeInput,
  IslandNoticePatch,
  IslandPageActions,
  PageChromeRegistration,
} from "./dynamic-island.types";

export interface DynamicIslandContextValue {
  registerPage: (
    pathname: string,
    config: PageChromeRegistration,
  ) => () => void;
  /** Lapisan terpisah dari registerPage: komponen dalam halaman (editor) menambah aksi tanpa menimpa judul route. */
  registerActions: (
    pathname: string,
    actions: IslandPageActions,
  ) => () => void;
  showNotice: (notice: IslandNoticeInput) => string;
  updateNotice: (id: string, patch: IslandNoticePatch) => void;
  dismissNotice: (id?: string) => void;
}

export const DynamicIslandContext =
  createContext<DynamicIslandContextValue | null>(null);

export function useDynamicIsland() {
  const value = useContext(DynamicIslandContext);
  if (!value) {
    throw new Error("useDynamicIsland harus dipakai di dalam AppChromeProvider");
  }
  return value;
}
