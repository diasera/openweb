/**
 * Satu pintu pendaftaran `public/sw.js`. Registrar global (Share Target +
 * fallback /offline) dan alur lonceng (Web Push) memakai helper yang sama,
 * sehingga service worker tidak lagi bergantung pada pengunjung menyalakan push.
 */
const SERVICE_WORKER_URL = "/sw.js";

export function supportsServiceWorker(): boolean {
  return typeof window !== "undefined" && "serviceWorker" in navigator;
}

/** Idempoten: browser mengembalikan registrasi yang sama bila sudah terpasang. */
export async function ensureServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (!supportsServiceWorker()) return null;
  const registration = await navigator.serviceWorker.register(SERVICE_WORKER_URL);
  await navigator.serviceWorker.ready;
  return registration;
}
