/**
 * tests/boot-smoke.mjs — CI boot smoke test
 *
 * Serves index.html over HTTP (not file://) so ES modules, fetch, and service
 * worker all work correctly — eliminating false-positive console errors from
 * file:// origin restrictions.
 *
 * Asserts:
 *   1. Boot screen is hidden (app reached booted state within 5 s)
 *   2. Zero unexpected console errors during boot
 *   3. Page body has rendered content (not blank)
 *
 * Run:  node tests/boot-smoke.mjs
 * CI:   called by npm run gate in .github/workflows/ci.yml
 *
 * Requires: npx playwright install chromium
 */

import { acquireBrowser } from './browser-shared.mjs';
import { fileURLToPath } from 'url';
import path from 'path';
import fs from 'fs';
import http from 'http';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const INDEX = path.join(ROOT, 'index.html');

if (!fs.existsSync(INDEX)) {
  console.error('boot-smoke: index.html not found at', INDEX);
  process.exit(1);
}

// ── Minimal static file server ──────────────────────────────────────────────
const MIME = {
  '.html': 'text/html',
  '.js': 'application/javascript',
  '.mjs': 'application/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
  '.webmanifest': 'application/manifest+json',
  '.md': 'text/markdown',
  '.txt': 'text/plain',
};

const server = http.createServer((req, res) => {
  const urlPath = req.url.split('?')[0].split('#')[0];
  const filePath = path.normalize(path.join(ROOT, urlPath === '/' ? 'index.html' : urlPath));
  if (!filePath.startsWith(ROOT)) {
    res.writeHead(403);
    res.end();
    return;
  }
  const ext = path.extname(filePath).toLowerCase();
  const mime = MIME[ext] || 'application/octet-stream';
  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404);
      res.end();
      return;
    }
    res.writeHead(200, { 'Content-Type': mime });
    res.end(data);
  });
});

const PORT = await new Promise((resolve, reject) => {
  server.on('error', reject);
  server.listen(0, '127.0.0.1', () => resolve(server.address().port));
});
const BASE_URL = `http://127.0.0.1:${PORT}`;

// ── Test setup ───────────────────────────────────────────────────────────────
let failed = 0;
function pass(msg) {
  console.log('  [PASS]', msg);
}
function fail(msg) {
  console.error('  [FAIL]', msg);
  failed++;
}

// Allowlist: known noise that is NOT a bug
function isExpectedNoise(text) {
  // Report-only CSP messages are advisory — the browser logs but never blocks.
  // Covers: (a) report-only CSP via <meta>, (b) frame-ancestors violations from
  // Firebase/Google Auth SDK iframes. All are expected in the test environment.
  if (/content.security.policy/i.test(text) && /report.only/i.test(text)) return true;
  // frame-ancestors is spec-invalid in a <meta> CSP (CSP spec §5.1 — the browser MUST
  // ignore it when delivered via meta; it can only be enforced via HTTP response headers).
  // The directive is retained in the meta for documentation intent and is guarded by
  // test 55.9. GitHub Pages does not allow custom HTTP headers, so this is the best
  // available expression of intent. Not an app bug — expected in enforcing mode.
  if (/frame-ancestors/i.test(text) && /ignored/i.test(text)) return true;
  // Service worker noise (edge-case environments)
  if (text.includes('ServiceWorker') || text.includes('service-worker')) return true;
  // Firebase Auth / Firestore / remote-config calls return network errors in the test
  // environment (no credentials, no network to real Firebase). The app handles all of
  // these gracefully (fail-open per Protocol 32/33) — not a genuine app bug.
  if (text.includes('Failed to load resource')) return true;
  return false;
}

const browser = await acquireBrowser();
const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
const page = await ctx.newPage();

const consoleErrors = [];
page.on('console', msg => {
  if (msg.type() === 'error') {
    const text = msg.text();
    if (!isExpectedNoise(text)) consoleErrors.push(text);
  }
});
page.on('pageerror', err => {
  const text = err.message;
  if (!isExpectedNoise(text)) consoleErrors.push(`pageerror: ${text}`);
});

await page.goto(BASE_URL);

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
server.close();

console.log('');
if (failed === 0) {
  console.log('  All boot smoke checks passed.\n');
  process.exit(0);
} else {
  console.error(`  ${failed} boot smoke check(s) FAILED.\n`);
  process.exit(1);
}
