// ⚠ PROTOCOL: Bump CACHE_NAME on commits that touch a served/precached file:
// index.html, sw.js, manifest.json, assets/icon*.png, css/, or js/.
// Format: 'robco-terminal-v{APP_VERSION}-r{N}'  (N starts at 1, increments each served-file change)
// Changing this string is the ONLY thing that triggers the "REBOOT TERMINAL" update
// prompt for users who already have the site cached. Forgetting to bump means cached
// users silently run the old UI until they manually clear their browser cache.
const CACHE_NAME = 'robco-terminal-v2.8.0-r38';
const ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './assets/icon.png',
  './assets/comm-link-icon.png',
  './assets/inventory-icon.png',
  './assets/stats-icon.png',
  './assets/new-campaign-icon.png',
  './css/05-base.css',
  './css/10-chrome.css',
  './css/15-overseer.css',
  './css/20-diagnostic-shell.css',
  './css/25-toolbar.css',
  './css/30-modulebay.css',
  './css/35-operator-boards.css',
  './css/40-curio-operations.css',
  './css/45-databank.css',
  './css/50-chassis.css',
  './css/55-feedback-animations.css',
  './css/60-fo3-pipboy.css',
  './css/99-mobile.css',
  './js/services/api.js',
  './js/services/api-directive.js',
  './js/services/api-import.js',
  './js/services/api-router.js',
  './js/services/cloud.js',
  './js/data/db_nv.js',
  './js/data/db_fo3.js',
  './js/core/idb.js',
  './js/core/state.js',
  './js/ui/ui-audio.js',
  './js/ui/ui-render.js',
  './js/ui/ui-render-inventory.js',
  './js/ui/ui-render-character.js',
  './js/ui/ui-render-record.js',
  './js/ui/ui-render-ledger.js',
  './js/ui/ui-render-map.js',
  './js/ui/ui-render-factions.js',
  './js/ui/ui-render-economy.js',
  './js/ui/ui-render-loot.js',
  './js/ui/ui-render-databank.js',
  './js/ui/ui-saves.js',
  './js/ui/ui-account.js',
  './js/ui/ui-core.js',
  './js/ui/ui-core-nav.js',
  './js/ui/ui-core-overseer.js',
  './js/ui/ui-core-chassis.js',
  './js/ui/ui-core-modulebay.js',
  './js/ui/ui-core-cmd.js',
  './js/data/reg_nv.js',
  './js/data/reg_fo3.js',
  './js/data/registry-core.js',
  './js/core/runtime.js',
  './js/dev/test-console.js',
  // Visual Upload OCR Unit 1 (planning/VISUAL_UPLOAD_OCR_PLAN.md) — small, safe shims only.
  // The heavy Tesseract core+lang (~9.5MB: js/vendor/tesseract-core-lstm.wasm(.js) +
  // assets/ocr/eng.traineddata.gz) are DELIBERATELY excluded here: cache.addAll below is
  // all-or-nothing, so putting multi-MB files in the install-time precache would bloat
  // and risk install failure. They are cached at runtime, best-effort, on first OCR use
  // (js/services/ocr.js _cacheOcrAssetsBestEffort) instead — offline works only AFTER first use.
  './js/services/ocr.js',
  './js/vendor/tesseract.min.js',
  './js/vendor/worker.min.js',
];

self.addEventListener('install', event => {
  // Do NOT call self.skipWaiting() here. Activating immediately means the SW
  // never enters the "waiting" state, so reg.waiting is always null when the
  // update prompt fires and the postMessage(SKIP_WAITING) is silently dropped.
  // The SW must wait here; skipWaiting() is triggered explicitly by the main
  // thread via the 'message' listener below once the user accepts the prompt.
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache =>
      // Core assets are all-or-nothing — install fails if any are missing.
      cache.addAll(ASSETS).then(() =>
        // CHANGELOG.md is fetched at runtime by the in-app changelog viewer and is
        // the ONLY local asset the app fetches over the network. Precache it
        // best-effort so the viewer is served cache-first and never depends on a
        // live network fetch that can reject — the staging "CHANGELOG NOT FOUND"
        // failure mode. Non-fatal by design: a miss here leaves the SW installed
        // and the viewer falls back to its runtime fetch exactly as before, so
        // this can never make install worse than not precaching it at all.
        cache.add('./CHANGELOG.md').catch(() => {})
      )
    )
  );
});

self.addEventListener('activate', event => {
  // Clean up old caches. Note: clients.claim() is intentionally omitted.
  // The install handler intentionally does NOT call skipWaiting() (see above),
  // so this SW enters the "waiting" state and only takes over on the next load.
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
