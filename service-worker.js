const CACHE = "offline-v1";

const OFFLINE_ASSETS = [
  "/",
  "/index.html",
  "/idt.html",
  "/cde.html",
  "/manifest.json",
  "/styles.css",
  "/icon-192.png",
  "/icon-256.png",
  "/icon-512.png",
  "/favicon.ico",
  "ibsods/index.html",
  "ibsods/idt.html",
  "ibsods/cde.html",
  "ibsods/manifest.json",
  "ibsods/styles.css",
  "ibsods/icon-192.png",
  "ibsods/icon-256.png",
  "ibsods/icon-512.png",
  "ibsods/favicon.ico"
];

self.addEventListener("install", e => {
  e.waitUntil(
    caches.open(CACHE).then(cache => cache.addAll(OFFLINE_ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener("activate", e => {
  e.waitUntil(self.clients.claim());
});

self.addEventListener("fetch", e => {
  e.respondWith(
    caches.match(e.request).then(res => res || fetch(e.request))
  );
});
