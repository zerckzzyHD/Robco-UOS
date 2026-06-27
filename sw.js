// ⚠ PROTOCOL: Bump CACHE_NAME on commits that touch a served/precached file:
// index.html, sw.js, manifest.json, icon*.png, css/, or js/.
// Format: 'robco-terminal-v{APP_VERSION}-r{N}'  (N starts at 1, increments each served-file change)
// Changing this string is the ONLY thing that triggers the "REBOOT TERMINAL" update
// prompt for users who already have the site cached. Forgetting to bump means cached
// users silently run the old UI until they manually clear their browser cache.
const CACHE_NAME = 'robco-terminal-v2.0.1-r66';
const ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './css/terminal.css',
  './js/api.js',
  './js/cloud.js',
  './js/db_nv.js',
  './js/db_fo3.js',
  './js/state.js',
  './js/ui.js',
  './js/reg_nv.js',
  './js/reg_fo3.js',
];

self.addEventListener('install', event => {
  // Do NOT call self.skipWaiting() here. Activating immediately means the SW
  // never enters the "waiting" state, so reg.waiting is always null when the
  // update prompt fires and the postMessage(SKIP_WAITING) is silently dropped.
  // The SW must wait here; skipWaiting() is triggered explicitly by the main
  // thread via the 'message' listener below once the user accepts the prompt.
  event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS)));
});

self.addEventListener('activate', event => {
  // Clean up old caches. Note: clients.claim() is intentionally omitted.
  // skipWaiting() in install already activates the new SW immediately.
  // clients.claim() would force mid-load pages to switch SW, causing
  // interrupted fetches, black screens, and controllerchange reload loops.
  // The new SW will naturally control the next page load.
  event.waitUntil(
    caches.keys().then(keys => {
      return Promise.all(
        keys.map(key => {
          if (key !== CACHE_NAME) return caches.delete(key);
        })
      );
    })
  );
});

self.addEventListener('fetch', event => {
  // Only handle same-origin requests.
  // Cross-origin requests (Firebase imports from gstatic.com, Google AI API, etc.)
  // must go directly to the network — intercepting them breaks ES module imports
  // and CORS-dependent API calls.
  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return;

  event.respondWith(
    caches.match(event.request).then(response => {
      // Serve from cache if available, otherwise fetch from network
      return response || fetch(event.request);
    })
  );
});

// Listen for the 'skipWaiting' message from the main thread (belt-and-suspenders fallback)
self.addEventListener('message', event => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
