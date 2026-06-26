/**
 * tests/boot-smoke.mjs — CI boot smoke test (Phase 1c)
 *
 * Loads index.html at a default viewport via file://, waits for the
 * boot sequence to complete, and asserts:
 *   1. Boot screen is hidden (app reached booted state within 5 s)
 *   2. Zero console errors during boot (catches black-screen / missing-script regressions)
 *   3. Page body has rendered content (not blank)
 *
 * Run:  node tests/boot-smoke.mjs
 * CI:   called by the boot-and-render job in .github/workflows/ci.yml
 *
 * Requires: npx playwright install chromium
 */

import { chromium } from 'playwright';
import { fileURLToPath } from 'url';
import path from 'path';
import fs from 'fs';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const INDEX = path.join(ROOT, 'index.html');

if (!fs.existsSync(INDEX)) {
  console.error('boot-smoke: index.html not found at', INDEX);
  process.exit(1);
}

let failed = 0;
function pass(msg) {
  console.log('  [PASS]', msg);
}
function fail(msg) {
  console.error('  [FAIL]', msg);
  failed++;
}

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
const page = await ctx.newPage();

const consoleErrors = [];
page.on('console', msg => {
  if (msg.type() === 'error') {
    const text = msg.text();
    // Service Worker is unavailable on file:// — expected in CI, not a bug
    if (!text.includes('ServiceWorker') && !text.includes('service-worker')) {
      consoleErrors.push(text);
    }
  }
});
page.on('pageerror', err => {
  consoleErrors.push(`pageerror: ${err.message}`);
});

await page.goto(`file://${INDEX.replace(/\\/g, '/')}`);

// Wait for boot screen to disappear (up to 5 seconds)
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

// Assert no console errors
if (consoleErrors.length === 0) {
  pass('Zero console errors during boot');
} else {
  for (const e of consoleErrors) {
    fail(`Console error: ${e}`);
  }
}

// Assert page has rendered content
const hasContent = await page.evaluate(() => document.body && document.body.children.length > 0);
if (hasContent) {
  pass('Page has rendered content (not a blank screen)');
} else {
  fail('Page is blank — document.body has no children');
}

await ctx.close();
await browser.close();

console.log('');
if (failed === 0) {
  console.log('  All boot smoke checks passed.\n');
  process.exit(0);
} else {
  console.error(`  ${failed} boot smoke check(s) FAILED.\n`);
  process.exit(1);
}
