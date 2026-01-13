self.addEventListener("install", (e) => {
  e.waitUntil(
    caches
      .open("projekt-rpg")
      .then((cache) =>
        cache.addAll([
          "./",
          "./index.html",
          "./style.css",
          "./app.js",
          "./data.js",
        ])
      )
  );
});

self.addEventListener("fetch", (e) => {
  e.respondWith(caches.match(e.request).then((res) => res || fetch(e.request)));
});
