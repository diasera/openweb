import { UPLOAD_LIMITS } from "@/lib/constants";

/**
 * Web Share Target: foto/video dari menu "Bagikan" galeri HP (PWA terpasang,
 * Android/Chromium) diterima service worker lalu diteruskan ke Buat Pin.
 * Beberapa file sekaligus langsung menjadi carousel.
 * public/sw.js tidak bisa mengimpor modul ini; nilainya dijaga sama oleh
 * `npm run check:share-target`.
 */
export const SHARE_TARGET = {
  action: "/buat/terima",
  fileField: "media",
  cacheName: "shared-media-v1",
  cacheEntry: "/buat/berbagi",
  resultParam: "berbagi",
  maxFiles: UPLOAD_LIMITS.mediaPerPost,
  maxFileBytes: UPLOAD_LIMITS.videoMaxBytes,
  ttlMs: 15 * 60 * 1000,
} as const;

function decodeSafeFileName(raw: string | null): string {
  if (!raw) return "berbagi";
  try {
    return decodeURIComponent(raw).slice(0, 200) || "berbagi";
  } catch {
    return "berbagi";
  }
}

/** Urutan entri: `/buat/berbagi/<n>`; entri tunggal versi lama tetap dibaca. */
function sharedEntryOrder(url: string): number | null {
  const { pathname } = new URL(url, "http://local");
  if (pathname === SHARE_TARGET.cacheEntry) return 0;
  const match = pathname.match(/\/(\d+)$/);
  return pathname.startsWith(`${SHARE_TARGET.cacheEntry}/`) && match
    ? Number(match[1])
    : null;
}

/** Ambil (sekali pakai) seluruh file yang dititipkan service worker, berurutan. */
export async function takeSharedFiles(): Promise<File[]> {
  if (typeof caches === "undefined") return [];
  const cache = await caches.open(SHARE_TARGET.cacheName);
  const allKeys = await cache.keys();
  const entries = allKeys
    .flatMap((request) => {
      const order = sharedEntryOrder(request.url);
      return order === null ? [] : [{ request, order }];
    })
    .sort((a, b) => a.order - b.order);

  const now = Date.now();
  const bounded = entries.slice(0, SHARE_TARGET.maxFiles);
  try {
    const files = await Promise.all(
      bounded.map(async ({ request }) => {
        const response = await cache.match(request);
        if (!response) return null;
        const sharedAt = Number(response.headers.get("X-Shared-At") ?? "0");
        if (sharedAt > 0 && now - sharedAt > SHARE_TARGET.ttlMs) return null;
        const blob = await response.blob();
        if (blob.size <= 0 || blob.size > SHARE_TARGET.maxFileBytes) return null;
        const name = decodeSafeFileName(response.headers.get("X-File-Name"));
        return new File([blob], name, {
          type: blob.type || response.headers.get("Content-Type") || "",
        });
      }),
    );
    return files.filter((file): file is File => file !== null);
  } finally {
    // Seluruh entri titipan (termasuk sisa/kedaluwarsa) selalu dibersihkan.
    await Promise.all(entries.map(({ request }) => cache.delete(request)));
  }
}
