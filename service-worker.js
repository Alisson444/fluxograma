// Taskly - Service Worker
const CACHE_NAME = "taskly-cache-v1";
const APP_ASSETS = [
  "./",
  "./index.html",
  "./style.css",
  "./script.js",
  "./manifest.json",
  "https://cdn-icons-png.flaticon.com/512/3135/3135789.png"
];

// Instalação (primeira vez)
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_ASSETS))
  );
  self.skipWaiting();
});

// Ativação (limpa caches antigos)
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Interceptar fetch (offline)
self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;
  event.respondWith(
    caches.match(event.request).then((res) => {
      return (
        res ||
        fetch(event.request).then((fetched) => {
          const clone = fetched.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
          return fetched;
        }).catch(() => caches.match("./index.html"))
      );
    })
  );
});

// Notificações locais simuladas
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  event.waitUntil(
    clients.matchAll({ type: "window" }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.includes("index.html") && "focus" in client) return client.focus();
      }
      if (clients.openWindow) return clients.openWindow("./index.html");
    })
  );
});
