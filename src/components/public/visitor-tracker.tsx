"use client";

import { useEffect } from "react";
import {
  hasStorage,
  readStorage,
  STORAGE_KEYS,
  writeStorage,
} from "@/lib/utils/storage";

/** Tracking ringan: satu ping per tab, dijalankan setelah load + saat browser idle. */
export function VisitorTracker() {
  useEffect(() => {
    // Tanpa sessionStorage tiap navigasi akan mengirim ping: lewati saja.
    if (
      !hasStorage("session") ||
      readStorage(STORAGE_KEYS.visitTracked, "session")
    ) {
      return;
    }

    let delayId: number | undefined;
    let idleId: number | undefined;

    const track = () => {
      writeStorage(STORAGE_KEYS.visitTracked, "1", "session");
      void fetch("/api/track", { method: "POST", keepalive: true }).catch(
        () => {},
      );
    };

    const schedule = () => {
      delayId = window.setTimeout(() => {
        if (typeof window.requestIdleCallback === "function") {
          idleId = window.requestIdleCallback(track, { timeout: 2_000 });
        } else {
          track();
        }
      }, 3_000);
    };

    if (document.readyState === "complete") schedule();
    else window.addEventListener("load", schedule, { once: true });

    return () => {
      window.removeEventListener("load", schedule);
      if (delayId !== undefined) window.clearTimeout(delayId);
      if (
        idleId !== undefined &&
        typeof window.cancelIdleCallback === "function"
      ) {
        window.cancelIdleCallback(idleId);
      }
    };
  }, []);
  return null;
}
