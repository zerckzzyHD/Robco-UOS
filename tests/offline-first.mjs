/**
 * tests/offline-first.mjs — the real OFFLINE-FIRST behavioral test (PUSH gate)
 *
 * The app is offline-first and PWA-installable, but nothing ever PROVED that
 * behaviorally — the gate only checked that the source *looks* offline-safe.
 * This is the first test that actually cuts the network and watches the app.
 *
 * What it does (the true PWA offline path, not a mocked flag):
 *   1. Loads the app over real HTTP with a campaign in localStorage.
 *   2. Waits for READY, then waits for the service worker to install and
 *      precache the app shell (index.html + core JS) into Cache Storage.
 *   3. Cuts the network for real — context.setOffline(true).
 *   4. Reloads. With the network down, the ONLY way the app can come back is
 *      the service worker serving the shell from cache.
 *   5. Asserts the app BOOTS TO READY offline, a core board renders, and a
 *      NATIVE offline tool (the CONSULT databank lookup — reads local registry
 *      data, never the network/AI) works end-to-end.
 *
 * If the app silently needed the network to boot or run a native tool, step 4/5
 * fails loudly. Protocol 42: any real offline defect this surfaces is fixed +
 * guarded in the same commit.
 *
 * Run:  node tests/offline-first.mjs
 * Requires: npx playwright install chromium
 */

import { acquireBrowser } from './browser-shared.mjs';
import { startStaticServer } from './static-server.mjs';
import { fileURLToPath } from 'url';
import path from 'path';
import fs from 'fs';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const INDEX = path.join(ROOT, 'index.html');
if (!fs.existsSync(INDEX)) {
  console.error('offline-first: index.html not found at', INDEX);
  process.exit(1);
}

// A populated New Vegas campaign so panels render and a native tool has data.
const NV_SAVE = {
  activeContext: 'FNV',
  campaigns: {
    FNV: {
      lvl: 14,
      hpCur: 120,
      hpMax: 200,
      rads: 60,
      caps: 900,
      la: 'OK',
      ra: 'OK',
      ll: 'OK',
      rl: 'OK',
      hd: 'OK',
      s_s: 6,
      s_p: 5,
      s_e: 7,
      s_c: 4,
      s_i: 8,
      s_a: 6,
      s_l: 5,
      inventory: Array.from({ length: 12 }, (_, i) => ({
        name: 'Item ' + i,
        qty: 2,
        wgt: 1,
        val: 5,
        type: i % 2 ? 'weapon' : 'aid',
      })),
      collectibles: [],
      perks: [],
      status: [],
    },
  },
};

let failed = 0;
function pass(msg) {
  console.log('  [PASS]', msg);
}
function fail(msg) {
  console.error('  [FAIL]', msg);
  failed++;
}

const srv = await startStaticServer(ROOT);
const browser = await acquireBrowser();
const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
await ctx.addInitScript(save => {
  localStorage.setItem('robco_v8', JSON.stringify(save));
}, NV_SAVE);
const page = await ctx.newPage();

// ── 1. Online load → READY ────────────────────────────────────────────────────
await page.goto(srv.baseUrl, { waitUntil: 'domcontentloaded' });
try {
  await page.waitForFunction(
    () => {
      const bs = document.getElementById('bootScreen');
      return !bs || getComputedStyle(bs).display === 'none';
    },
    { timeout: 15000 }
  );
  pass('Online: app booted to READY (bootScreen hidden)');
} catch {
  fail(
    'Online: app did not reach READY within 15 s — cannot test offline from a broken online boot'
  );
}

// ── 2. Wait for the service worker to install + precache the shell ─────────────
const swState = await page.evaluate(async () => {
  if (!('serviceWorker' in navigator)) return { sw: false, cached: false };
  // ready resolves once the registration has an ACTIVE worker; because the SW's
  // install handler waits on cache.addAll(), an active worker implies the
  // all-or-nothing precache completed. Poll the cache to confirm regardless.
  await navigator.serviceWorker.ready;
  for (let i = 0; i < 80; i++) {
    const keys = await caches.keys();
    for (const k of keys) {
      const c = await caches.open(k);
      const idx =
        (await c.match('./index.html')) || (await c.match('index.html')) || (await c.match('/'));
      const js = await c.match('./js/core/state.js');
      if (idx && js) return { sw: true, cached: true, cacheName: k };
    }
    await new Promise(r => setTimeout(r, 100));
  }
  return { sw: true, cached: false };
});
if (swState.sw && swState.cached) {
  pass(
    'Service worker registered and precached the app shell (index.html + core JS in Cache Storage)'
  );
} else {
  fail(
    'Service worker did not precache the app shell within 8 s (sw=' +
      swState.sw +
      ', cached=' +
      swState.cached +
      ') — offline reload cannot be served from cache'
  );
}

// ── 3. Cut the network for real ───────────────────────────────────────────────
await ctx.setOffline(true);
const offlineConfirmed = await page.evaluate(() => navigator.onLine === false);
if (offlineConfirmed) {
  pass('Network cut — navigator.onLine is false (a true offline cut, not a mocked flag)');
} else {
  fail('Network cut did not register as offline (navigator.onLine still true)');
}

// ── 4. Reload with zero network — the SW must serve the shell from cache ───────
let offlineReloadOk = false;
try {
  await page.reload({ waitUntil: 'domcontentloaded', timeout: 30000 });
  offlineReloadOk = true;
} catch (e) {
  fail('Offline reload navigation failed outright: ' + (e.message || e));
}

if (offlineReloadOk) {
  try {
    await page.waitForFunction(
      () => {
        const bs = document.getElementById('bootScreen');
        return !bs || getComputedStyle(bs).display === 'none';
      },
      { timeout: 15000 }
    );
    pass('OFFLINE: app booted to READY with the network cut (service worker served the shell)');
  } catch {
    fail(
      'OFFLINE: app did NOT reach READY with the network cut — the offline-first promise is broken'
    );
  }

  // A core board actually rendered offline.
  const boardVisible = await page.evaluate(() => {
    const b = document.querySelector('.panel[data-tab]');
    return !!b && b.offsetParent !== null;
  });
  if (boardVisible) {
    pass('OFFLINE: a core board rendered and is visible');
  } else {
    fail('OFFLINE: no core board rendered — the shell came back blank offline');
  }

  // ── 5. A native offline tool works end-to-end (CONSULT databank lookup) ───────
  // Drives the real oninput → renderDatabankPanel() → _consultSearch() path,
  // which reads only local FALLOUT_REGISTRY / CSV data — no AI, no network.
  const consult = await page.evaluate(() => {
    try {
      if (typeof switchTab === 'function') switchTab('data');
      const input = document.getElementById('databankSearch');
      const results = document.getElementById('databankResults');
      if (!input || !results) return { ok: false, reason: 'databank DOM missing' };
      input.value = 'Stimpak';
      input.dispatchEvent(new Event('input', { bubbles: true }));
      const text = (results.textContent || '').trim();
      return { ok: /stimpak/i.test(text), len: text.length };
    } catch (e) {
      return { ok: false, reason: String(e && e.message) };
    }
  });
  if (consult.ok) {
    pass(
      'OFFLINE: native CONSULT databank lookup works end-to-end (local "Stimpak" results rendered)'
    );
  } else {
    fail(
      'OFFLINE: native CONSULT databank lookup produced no local results (' +
        (consult.reason || 'len=' + consult.len) +
        ') — a native tool silently needs the network'
    );
  }

  // Confirm we were genuinely offline the whole time.
  const stillOffline = await page.evaluate(() => navigator.onLine === false);
  if (stillOffline) {
    pass('OFFLINE: navigator.onLine stayed false through the entire offline session');
  } else {
    fail('OFFLINE: navigator.onLine flipped back to true mid-test (network was not actually cut)');
  }
}

await ctx.setOffline(false);
await ctx.close();
await browser.close();
srv.close();

console.log('');
if (failed === 0) {
  console.log(
    '  All offline-first checks passed — the app boots and a native tool works with zero network.\n'
  );
  process.exit(0);
} else {
  console.error(`  ${failed} offline-first check(s) FAILED.\n`);
  process.exit(1);
}
