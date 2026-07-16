"use client";

import { createContext, useContext } from "react";
import type {
  IslandNoticeInput,
  IslandNoticePatch,
  PageChromeRegistration,
} from "./dynamic-island.types";

export interface DynamicIslandContextValue {
  registerPage: (
    pathname: string,
    config: PageChromeRegistration,
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
