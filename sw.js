const CACHE = "nios-access-shell-v2.4";
const SHELL_FILES = [
  "./",
  "./index.html",
  "./manifest.json",
  "./icons/icon-192.png",
  "./icons/icon-512.png"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) =>
      // Cache each file independently: one missing/renamed file (case-sensitive
      // hosts, wrong path depth, etc.) must not fail the whole install — a failed
      // install means no active service worker, which means no install prompt at all.
      Promise.allSettled(
        SHELL_FILES.map((file) =>
          cache.add(file).catch((err) => {
            console.warn("[sw] could not pre-cache", file, err);
          })
        )
      )
    ).then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

// Only cache-serve the app shell itself. Every link out to nios.ac.in /
// sdmis.nios.ac.in always goes straight to the network (their real site),
// this app never intercepts or proxies those requests.
self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return;
  if (event.request.method !== "GET") return;

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        const copy = response.clone();
        caches.open(CACHE).then((cache) => cache.put(event.request, copy)).catch(() => {});
        return response;
      })
      .catch(() => caches.match(event.request))
  );
});
