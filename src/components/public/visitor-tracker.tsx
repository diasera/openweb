"use client";

import { useEffect } from "react";

/** Tracking ringan: satu ping per tab, dijalankan setelah load + saat browser idle. */
export function VisitorTracker() {
  useEffect(() => {
    try {
      if (sessionStorage.getItem("kelas_tracked")) return;
    } catch {
      return;
    }

    let delayId: number | undefined;
    let idleId: number | undefined;

    const track = () => {
      sessionStorage.setItem("kelas_tracked", "1");
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
