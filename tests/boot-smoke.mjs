/**
 * tests/boot-smoke.mjs — boot smoke test (two modes)
 *
 * Serves index.html over HTTP (not file://) so ES modules, fetch, and service
 * worker all work correctly — eliminating false-positive console errors from
 * file:// origin restrictions. The static server lives in ./static-server.mjs
 * (shared, Protocol 22).
 *
 * FULL mode (default — PUSH gate, `npm run gate` step 6):
 *   1. Boot screen is hidden (app reached READY within 5 s)
 *   2. Zero unexpected console errors during boot
 *   3. Page body has rendered content (not blank)
 *
 * FAST mode (`--fast` — COMMIT gate, inside `npm run gate:fast`):
 *   A deliberately-tiny "the shell boots and paints without throwing" check
 *   cheap enough to run on every commit. One load; asserts the bezel nav is
 *   present, a core board actually rendered + is visible (the functional
 *   readiness signal — reached ~1.3 s, before the cosmetic boot-screen
 *   animation finishes at ~3.5 s), and NO uncaught pageerror occurred during
 *   boot. It deliberately skips the full boot-screen-animation wait, the
 *   300 ms deferred-error buffer, and the full console-error scan — those stay
 *   in FULL mode at the push gate. Keeps the commit gate to a small bounded
 *   add (~3–4 s) so it never gets disabled.
 *
 * Run:  node tests/boot-smoke.mjs          (full)
 *       node tests/boot-smoke.mjs --fast   (fast commit smoke)
 * Requires: npx playwright install chromium
 */

import { acquireBrowser } from './browser-shared.mjs';
import { startStaticServer } from './static-server.mjs';
import { fileURLToPath } from 'url';
import path from 'path';
import fs from 'fs';

const FAST = process.argv.includes('--fast');
const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const INDEX = path.join(ROOT, 'index.html');

if (!fs.existsSync(INDEX)) {
  console.error('boot-smoke: index.html not found at', INDEX);
  process.exit(1);
}

// ── Test harness ─────────────────────────────────────────────────────────────
let failed = 0;
function pass(msg) {
  console.log('  [PASS]', msg);
}
function fail(msg) {
  console.error('  [FAIL]', msg);
  failed++;
}

// Allowlist: known noise that is NOT a bug (FULL-mode console scan only).
function isExpectedNoise(text) {
  // Report-only CSP messages are advisory — the browser logs but never blocks.
  if (/content.security.policy/i.test(text) && /report.only/i.test(text)) return true;
  // frame-ancestors is spec-invalid in a <meta> CSP; only third-party SDK iframe noise now.
  if (/frame-ancestors/i.test(text) && /ignored/i.test(text)) return true;
  // Service worker noise (edge-case environments)
  if (text.includes('ServiceWorker') || text.includes('service-worker')) return true;
  // Firebase Auth / Firestore / remote-config network errors in the test env
  // (no credentials, no network) — the app fail-opens (Protocol 32/33).
  if (text.includes('Failed to load resource')) return true;
  return false;
}

const srv = await startStaticServer(ROOT);
const browser = await acquireBrowser();
const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
const page = await ctx.newPage();

// Uncaught page exceptions are a boot failure in BOTH modes.
const pageErrors = [];
page.on('pageerror', err => {
  if (!isExpectedNoise(err.message)) pageErrors.push(`pageerror: ${err.message}`);
});

// FULL mode also collects console errors.
const consoleErrors = [];
if (!FAST) {
  page.on('console', msg => {
    if (msg.type() === 'error') {
      const text = msg.text();
      if (!isExpectedNoise(text)) consoleErrors.push(text);
    }
  });
}

await page.goto(srv.baseUrl);

if (FAST) {
  // ── FAST commit smoke: the shell boots and paints without throwing ──────────
  try {
    // Bezel subsystem nav is up (chrome painted) AND a core board actually
    // rendered and is visible — the functional "it booted and paints" signal.
    await page.waitForSelector('.bezel', { state: 'attached', timeout: 10000 });
    await page.waitForFunction(
      () => {
        const board = document.querySelector('.panel[data-tab]');
        return !!board && board.offsetParent !== null;
      },
      { timeout: 10000 }
    );
    pass('Shell booted and painted — bezel nav present + a core board rendered and visible');
  } catch {
    fail('Shell did not paint a core board within 10 s (possible boot throw / black screen)');
  }
  if (pageErrors.length === 0) {
    pass('No uncaught pageerror during boot');
  } else {
    for (const e of pageErrors) fail(e);
  }
} else {
  // ── FULL push smoke: READY + clean console + rendered content ────────────────
  try {
    await page.waitForFunction(
      () => {
        const bs = document.getElementById('bootScreen');
        return !bs || bs.style.display === 'none' || getComputedStyle(bs).display === 'none';
      },
      { timeout: 5000 }
    );
    pass('Boot sequence completed — bootScreen hidden within 5 s');
  } catch {
    fail(
      'Boot sequence did not complete within 5 s (bootScreen still visible — possible black screen)'
    );
  }

  // Small buffer for any deferred post-boot errors
  await page.waitForTimeout(300);

  const allErrors = [...consoleErrors, ...pageErrors];
  if (allErrors.length === 0) {
    pass('Zero console errors during boot');
  } else {
    for (const e of allErrors) fail(`Console error: ${e}`);
  }

  const hasContent = await page.evaluate(() => document.body && document.body.children.length > 0);
  if (hasContent) {
    pass('Page has rendered content (not a blank screen)');
  } else {
    fail('Page is blank — document.body has no children');
  }
}

await ctx.close();
await browser.close();
srv.close();

console.log('');
const label = FAST ? 'boot smoke (fast)' : 'boot smoke';
if (failed === 0) {
  console.log(`  All ${label} checks passed.\n`);
  process.exit(0);
} else {
  console.error(`  ${failed} ${label} check(s) FAILED.\n`);
  process.exit(1);
}
