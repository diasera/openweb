"use client";

import { useEffect } from "react";
import { ensureServiceWorker } from "@/lib/pwa/service-worker";

/**
 * Pasang service worker sekali setelah halaman selesai dimuat agar Share
 * Target (Buat Pin dari menu Bagikan) dan halaman /offline bekerja untuk semua
 * pengunjung. Hanya production: di dev, SW tidak boleh mengganggu HMR.
 */
export function ServiceWorkerRegistrar() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production") return;
    const register = () => {
      // Best-effort: kegagalan SW tidak boleh memengaruhi halaman.
      void ensureServiceWorker().catch(() => undefined);
    };
    if (document.readyState === "complete") register();
    else window.addEventListener("load", register, { once: true });
    return () => window.removeEventListener("load", register);
  }, []);
  return null;
}
