const CACHE_NAME = "studyflow-v3";

const FILES_TO_CACHE = [
  "./",
  "./index.html",
  "./manifest.json",
  "./service-worker.js",
  "./style.css",
  "./assets/css/base.css",
  "./assets/css/layout.css",
  "./assets/css/components.css",
  "./assets/css/pages.css",
  "./assets/css/responsive.css",
  "./assets/js/core/storage.js",
  "./assets/js/core/utils.js",
  "./assets/js/core/shell.js",
  "./assets/js/core/ui.js",
  "./assets/js/pages/dashboard.js",
  "./assets/js/pages/classes.js",
  "./assets/js/pages/assignments.js",
  "./assets/js/pages/exams.js",
  "./assets/js/pages/timer.js",
  "./assets/js/pages/notes.js",
  "./assets/js/pages/stats.js",
  "./assets/js/pages/settings.js",
  "./pages/assignments.html",
  "./pages/classes.html",
  "./pages/exams.html",
  "./pages/timer.html",
  "./pages/notes.html",
  "./pages/stats.html",
  "./pages/settings.html"
];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(FILES_TO_CACHE)));
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.map((key) => (key === CACHE_NAME ? null : caches.delete(key)))))
  );
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;
  event.respondWith(caches.match(event.request).then((cached) => cached || fetch(event.request)));
});
