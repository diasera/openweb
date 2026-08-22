/* Service Worker — Web Push + fallback offline.
 * Sengaja vanilla (tanpa framework cache): Next mengelola cache asetnya
 * sendiri; SW ini hanya mengurus notifikasi dan halaman /offline.
 */
const CACHE = "konoha-shell-v1";
const OFFLINE_URL = "/offline";

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
        Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key))),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("message", (event) => {
  if (event.data === "SKIP_WAITING") self.skipWaiting();
});

/* Notifikasi masuk: payload { title, body, url } dari dispatchPushNotification. */
self.addEventListener("push", (event) => {
  let data = { title: "Notifikasi baru", body: "", url: "/" };
  try {
    if (event.data) data = { ...data, ...event.data.json() };
  } catch {
    /* payload bukan JSON — pakai default. */
  }
  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body || undefined,
      icon: "/icon.svg",
      badge: "/icon.svg",
      tag: "konoha-notification",
      data: { url: data.url || "/" },
    }),
  );
});

/* Klik notifikasi: fokus tab yang terbuka, atau buka URL notifikasi. */
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = (event.notification.data && event.notification.data.url) || "/";
  event.waitUntil(
    self.clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((clients) => {
        for (const client of clients) {
          if ("focus" in client) return client.focus();
        }
        return self.clients.openWindow(url);
      }),
  );
});

/* Browser memutar kunci langganan — daftarkan ulang dan laporkan ke server. */
self.addEventListener("pushsubscriptionchange", (event) => {
  event.waitUntil(
    self.registration.pushManager
      .getSubscription()
      .then((subscription) =>
        subscription
          ? subscription
          : self.registration.pushManager.subscribe(
              event.oldSubscription
                ? event.oldSubscription.options
                : { userVisibleOnly: true },
            ),
      )
      .then((subscription) => {
        const payload = subscription.toJSON();
        return fetch("/api/push/subscribe", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            endpoint: payload.endpoint,
            keys: payload.keys,
          }),
        });
      })
      .catch(() => {
        /* best-effort: halaman akan mendaftar ulang saat lonceng dinyalakan. */
      }),
  );
});

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
