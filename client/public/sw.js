const CACHE = "arqueofrotas-shell-v1";
self.addEventListener("install", event => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then(cache =>
        cache.addAll([
          "/",
          "/driver",
          "/logo.svg",
          "/manifest.webmanifest",
          "/icon-192.png",
          "/icon-512.png",
        ])
      )
  );
});
self.addEventListener("activate", event => {
  event.waitUntil(
    caches
      .keys()
      .then(keys =>
        Promise.all(
          keys
            .filter(k => k.startsWith("arqueofrotas-shell-") && k !== CACHE)
            .map(k => caches.delete(k))
        )
      )
  );
});
self.addEventListener("fetch", event => {
  const url = new URL(event.request.url);
  if (
    event.request.method !== "GET" ||
    url.origin !== self.location.origin ||
    url.pathname.startsWith("/api/")
  )
    return;
  if (event.request.mode === "navigate") {
    event.respondWith(
      fetch(event.request)
        .then(async response => {
          if (response.ok) {
            const cache = await caches.open(CACHE);
            await cache.put("/driver", response.clone());
          }
          return response;
        })
        .catch(() => caches.match("/driver"))
    );
    return;
  }
  if (
    url.pathname.startsWith("/assets/") ||
    [
      "/logo.svg",
      "/manifest.webmanifest",
      "/icon-192.png",
      "/icon-512.png",
    ].includes(url.pathname)
  )
    event.respondWith(
      caches.open(CACHE).then(async cache => {
        const cached = await cache.match(event.request);
        if (cached) return cached;
        const response = await fetch(event.request);
        if (response.ok) await cache.put(event.request, response.clone());
        return response;
      })
    );
});
