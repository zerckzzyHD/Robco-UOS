const CACHE_NAME = 'robco-terminal-v1.6.5';
const ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './css/terminal.css',
  './js/api.js',
  './js/cloud.js',
  './js/database.js',
  './js/state.js',
  './js/ui.js',
  './js/registry.js',
  './changelog.txt',
];

self.addEventListener('install', event => {
  // skipWaiting forces this SW to activate immediately instead of waiting
  // for all tabs running the old SW to close — fixes the "clear cache" requirement.
  self.skipWaiting();
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
