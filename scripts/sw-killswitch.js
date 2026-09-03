#!/usr/bin/env node
/**
 * scripts/sw-killswitch.js — the service-worker KILL SWITCH the dev server serves
 * at the tailnet origin's ROOT `/sw.js`. Dev only; nothing here ships.
 *
 * ── ⛔⛔ THE PROBLEM THIS SOLVES IS PERMANENT UNTIL IT IS SOLVED ──────────────
 * Until 2026-09-03 the terminal app was served at the ROOT of the tailnet dev
 * origin, so every phone that ever opened it registered the app's own service
 * worker at scope `/`, with `./` among its precached assets. That worker answers
 * every same-origin request from its cache first. Once the app moved to
 * `/terminal/` and the root became the landing page, a browser holding that
 * registration kept rendering the CACHED app shell at `/` — whose relative
 * stylesheet and script paths now resolve to nothing — and would keep doing so
 * on every visit, forever. Measured on 2026-09-01, when the root briefly changed
 * hands: the owner saw unstyled raw markup and had to clear site data by hand.
 *
 * ⚠ A 404 at `/sw.js` does NOT reliably clear that registration: with an active
 * worker already installed, a failed update check leaves it in place. Measured
 * the same day — the root answered 404 for `/sw.js` and the stale shell stayed.
 *
 * ⭐ THE FIX IS TO SERVE DIFFERENT BYTES AT THAT EXACT URL. A browser with a
 * worker registered at `/sw.js` re-fetches it on navigation. It sees new bytes,
 * installs this, and this deletes every cache on the origin, unregisters itself,
 * and reloads any open tab. The next visit is served by the network. Self-healing,
 * per device, with no human step — and a browser that never held the old
 * registration never asks for this file at all.
 *
 * ⛔ IT HAS NO `fetch` HANDLER, DELIBERATELY. A kill switch that intercepted
 * requests would be the thing it is removing. The app's REAL worker now lives at
 * `/terminal/sw.js` with scope `/terminal/`, served by Vite from `sw.js` like any
 * other file — this module never touches it.
 *
 * ⛔ THIS FILE IS NOT `sw.js` AND MUST NOT BE PRECACHED, BUMPED, OR SHIPPED. It is
 * a string a dev-only route returns. Protocol 1 (the CACHE_NAME bump) is about the
 * app's worker and does not apply here.
 */
'use strict';

const SW_KILLSWITCH = `// Tailnet dev origin — service worker KILL SWITCH (dev server, root scope).
// This worker exists only to remove itself and everything a previous worker
// cached on this origin. It intercepts nothing.
//
// Why: the app used to live at the root of this origin and registered a
// cache-first worker at scope "/". The app now lives under /terminal/ with its
// own worker there. A browser still holding the old registration would keep
// serving the stale root shell forever; this clears it once and stands down.

self.addEventListener('install', () => {
  // Do not wait for existing tabs to close -- take over and stand down in the
  // same visit.
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    // 1. Drop every cache on this origin, not just the one we know the name of.
    try {
      const keys = await caches.keys();
      await Promise.all(keys.map((k) => caches.delete(k)));
    } catch (e) { /* a cache we cannot delete must not block the unregister */ }

    // 2. Remove this registration. After this there is no worker at scope "/".
    try { await self.registration.unregister(); } catch (e) { /* nothing to do */ }

    // 3. Reload any open tab so the real page appears without a manual step.
    try {
      const clients = await self.clients.matchAll({ type: 'window' });
      for (const client of clients) {
        try { await client.navigate(client.url); } catch (e) { /* per-tab, non-fatal */ }
      }
    } catch (e) { /* nothing to do */ }
  })());
});

// NO fetch handler. Nothing on this origin is served from a cache by this worker.
`;

/**
 * ⭐ The headers matter as much as the body.
 *  · a service worker script MUST be served as JavaScript or the browser refuses
 *    to install it;
 *  · `no-store`, so the update check can never be answered by a cached copy of
 *    the OLD worker — a kill switch behind a stale HTTP cache does not run.
 */
const SW_HEADERS = Object.freeze({
  'Content-Type': 'text/javascript; charset=utf-8',
  'Cache-Control': 'no-store, max-age=0',
  'Service-Worker-Allowed': '/',
  'X-Content-Type-Options': 'nosniff',
});

module.exports = { SW_KILLSWITCH, SW_HEADERS };
