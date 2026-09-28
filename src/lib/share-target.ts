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
} as const;

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
  const entries = (await cache.keys())
    .flatMap((request) => {
      const order = sharedEntryOrder(request.url);
      return order === null ? [] : [{ request, order }];
    })
    .sort((a, b) => a.order - b.order);
  const files = await Promise.all(
    entries.map(async ({ request }) => {
      const response = await cache.match(request);
      if (!response) return null;
      const blob = await response.blob();
      const name = decodeURIComponent(response.headers.get("X-File-Name") ?? "berbagi");
      return new File([blob], name, {
        type: blob.type || response.headers.get("Content-Type") || "",
      });
    }),
  );
  await Promise.all(entries.map(({ request }) => cache.delete(request)));
  return files.filter((file): file is File => file !== null);
}
