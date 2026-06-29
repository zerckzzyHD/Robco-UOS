/**
 * tests/test-html-check.mjs — headless execution of the browser-side audit
 *
 * Loads tests/test.html over HTTP in Chromium and asserts:
 *   1. The audit ran and every suite passed (data-failed === 0, data-passed > 0).
 *   2. The number of suites actually executed matches the "Suites: N" marker in
 *      the test.html header comment (Protocol 40 — the declared count cannot drift
 *      from reality without failing the gate).
 *   3. No uncaught page errors during the run.
 *
 * This is what keeps test.html from silently rotting: if the live import
 * contract changes and test.html is not updated, a suite fails here and the
 * gate goes red (self-improving — Protocol 36b).
 *
 * Run:  node tests/test-html-check.mjs
 * CI:   called by npm run gate (full gate only).
 *
 * Requires: npx playwright install chromium
 */

import { chromium } from 'playwright';
import { fileURLToPath } from 'url';
import path from 'path';
import fs from 'fs';
import http from 'http';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const TEST_HTML = path.join(ROOT, 'tests', 'test.html');

if (!fs.existsSync(TEST_HTML)) {
  console.error('test-html-check: tests/test.html not found at', TEST_HTML);
  process.exit(1);
}

// Declared suite count from the header comment marker ("Suites: N").
const declaredMatch = fs.readFileSync(TEST_HTML, 'utf8').match(/Suites:\s*(\d+)/);
const declaredSuites = declaredMatch ? parseInt(declaredMatch[1], 10) : null;

// ── Minimal static file server (same approach as boot-smoke.mjs) ─────────────
const MIME = {
  '.html': 'text/html',
  '.js': 'application/javascript',
  '.mjs': 'application/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.png': 'image/png',
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
  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404);
      res.end();
      return;
    }
    res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream' });
    res.end(data);
  });
});

const PORT = await new Promise((resolve, reject) => {
  server.on('error', reject);
  server.listen(0, '127.0.0.1', () => resolve(server.address().port));
});

let failed = 0;
const pass = m => console.log('  [PASS]', m);
const fail = m => {
  console.error('  [FAIL]', m);
  failed++;
};

const browser = await chromium.launch();
const ctx = await browser.newContext();
const page = await ctx.newPage();

const pageErrors = [];
page.on('pageerror', err => pageErrors.push(err.message));

await page.goto(`http://127.0.0.1:${PORT}/tests/test.html`);

// Wait for the summary element to be populated by the audit script.
let result = null;
try {
  await page.waitForFunction(
    () => {
      const s = document.getElementById('summary');
      return s && s.getAttribute('data-failed') !== null;
    },
    { timeout: 10000 }
  );
  result = await page.evaluate(() => {
    const s = document.getElementById('summary');
    return {
      passed: parseInt(s.getAttribute('data-passed'), 10),
      failed: parseInt(s.getAttribute('data-failed'), 10),
      suites: parseInt(s.getAttribute('data-suites'), 10),
      text: s.textContent,
    };
  });
} catch {
  fail('test.html audit did not complete within 10 s (summary never populated)');
}

if (result) {
  if (result.passed > 0 && result.failed === 0) {
    pass(`test.html audit passed: ${result.passed} assertions across ${result.suites} suites`);
  } else {
    fail(`test.html reported failures: ${result.text}`);
  }

  if (declaredSuites === null) {
    fail('test.html header is missing the "Suites: N" count marker (Protocol 40)');
  } else if (declaredSuites !== result.suites) {
    fail(
      `test.html suite-count drift: header declares ${declaredSuites}, audit ran ${result.suites} (Protocol 40)`
    );
  } else {
    pass(`declared suite count (${declaredSuites}) matches suites executed (${result.suites})`);
  }
}

if (pageErrors.length === 0) {
  pass('No uncaught page errors during the audit');
} else {
  for (const e of pageErrors) fail(`page error: ${e}`);
}

await ctx.close();
await browser.close();
server.close();

console.log('');
if (failed === 0) {
  console.log('  test.html runtime audit OK.\n');
  process.exit(0);
} else {
  console.error(`  ${failed} test.html check(s) FAILED.\n`);
  process.exit(1);
}
