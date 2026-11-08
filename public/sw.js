/* Service Worker — Web Push + fallback offline.
 * Sengaja vanilla (tanpa framework cache): Next mengelola cache asetnya
 * sendiri; SW ini hanya mengurus notifikasi dan halaman /offline.
 */
const CACHE = "app-shell-v2";
const OFFLINE_URL = "/offline";
// Sinkron dengan src/lib/share-target.ts (dicek `npm run check:share-target`).
const SHARE_ACTION = "/buat/terima";
const SHARE_FIELD = "media";
const SHARE_CACHE = "shared-media-v1";
const SHARE_ENTRY = "/buat/berbagi";
const SHARE_PARAM = "berbagi";

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) => cache.add(OFFLINE_URL))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key !== CACHE && key !== SHARE_CACHE)
            .map((key) => caches.delete(key)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("message", (event) => {
  if (event.data === "SKIP_WAITING") self.skipWaiting();
});

/* Web Share Target: titipkan file kiriman galeri HP (boleh banyak → carousel)
 * lalu buka Buat Pin. Tiap file disimpan di SHARE_ENTRY/<urutan>. */
async function receiveShare(request) {
  const done = (status) =>
    Response.redirect(new URL(`/buat?${SHARE_PARAM}=${status}`, self.location.origin).href, 303);
  try {
    const form = await request.formData();
    const files = form
      .getAll(SHARE_FIELD)
      .filter((file) => file instanceof File && file.size > 0);
    if (files.length === 0) return done("kosong");
    const cache = await caches.open(SHARE_CACHE);
    const stale = await cache.keys();
    await Promise.all(stale.map((entry) => cache.delete(entry)));
    await Promise.all(
      files.map((file, index) =>
        cache.put(
          `${SHARE_ENTRY}/${index}`,
          new Response(file, {
            headers: {
              "Content-Type": file.type || "application/octet-stream",
              "X-File-Name": encodeURIComponent(file.name || "berbagi"),
            },
          }),
        ),
      ),
    );
    return done("1");
  } catch {
    return done("gagal");
  }
}

self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);
  if (
    event.request.method === "POST" &&
    url.origin === self.location.origin &&
    url.pathname === SHARE_ACTION
  ) {
    event.respondWith(receiveShare(event.request));
  }
});

/* Notifikasi masuk: payload { tag, title, body, url } dari dispatchPushNotification. */
self.addEventListener("push", (event) => {
  let data = { tag: "", title: "Notifikasi baru", body: "", url: "/" };
  try {
    if (event.data) data = { ...data, ...event.data.json() };
  } catch {
    /* payload bukan JSON — pakai default. */
  }
  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body || undefined,
      // Android tidak merender SVG untuk ikon/badge notifikasi.
      icon: "/api/pwa/192",
      badge: "/api/pwa/badge",
      // Tag unik per notifikasi: kiriman berbeda tidak saling menimpa diam-diam.
      tag: data.tag || undefined,
      data: { url: data.url || "/" },
    }),
  );
});

/* Klik notifikasi: buka tujuan notifikasi di tab yang ada, atau tab baru. */
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = (event.notification.data && event.notification.data.url) || "/";
  event.waitUntil(openNotificationTarget(url));
});

async function openNotificationTarget(url) {
  const target = new URL(url, self.location.origin);
  if (target.origin === self.location.origin) {
    const windows = await self.clients.matchAll({
      type: "window",
      includeUncontrolled: true,
    });
    const exact = windows.find((client) => client.url === target.href);
    if (exact) return exact.focus();
    for (const client of windows) {
      try {
        // navigate() hanya berhasil untuk tab yang dikendalikan SW ini.
        const navigated = await client.navigate(target.href);
        if (navigated) return navigated.focus();
      } catch {
        /* tab tidak dikendalikan — coba tab berikutnya. */
      }
    }
  }
  return self.clients.openWindow(target.href);
}

/* Browser memutar kunci langganan — daftarkan ulang dan laporkan ke server. */
self.addEventListener("pushsubscriptionchange", (event) => {
  event.waitUntil(resubscribePush(event));
});

async function resubscribePush(event) {
  try {
    const manager = self.registration.pushManager;
    const options = event.oldSubscription ? event.oldSubscription.options : null;
    // Urutan: langganan baru dari event → yang sudah dibuat browser → buat ulang
    // dengan opsi lama. Server memakai VAPID, jadi subscribe tanpa
    // applicationServerKey pasti ditolak (Chrome/Edge); lewati saja dan biarkan
    // pengguna menautkan ulang lewat lonceng.
    const subscription =
      event.newSubscription ||
      (await manager.getSubscription()) ||
      (options && options.applicationServerKey
        ? await manager.subscribe(options)
        : null);
    if (!subscription) return;
    const payload = subscription.toJSON();
    await fetch("/api/push/subscribe", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ endpoint: payload.endpoint, keys: payload.keys }),
    });
  } catch {
    /* best-effort: halaman akan mendaftar ulang saat lonceng dinyalakan. */
  }
}

/* Navigasi saat offline → layani /offline yang di-precache; selebihnya
 * dibiarkan ke jaringan/browser agar cache Next tidak diganggu. */
self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET" || event.request.mode !== "navigate") return;
  event.respondWith(
    fetch(event.request).catch(() =>
      caches
        .match(OFFLINE_URL, { ignoreSearch: true })
        .then(
          (cached) =>
            cached ??
            new Response("Offline", {
              status: 503,
              headers: { "Content-Type": "text/plain; charset=utf-8" },
            }),
        ),
    ),
  );
});
