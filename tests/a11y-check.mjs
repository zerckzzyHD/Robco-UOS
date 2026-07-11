/**
 * tests/a11y-check.mjs — Axe accessibility baseline-diff gate
 *
 * Loads the app over HTTP (not file://), runs axe-core for serious/critical
 * violations, then diffs against tests/a11y-baseline.json.
 *
 * PASS conditions:
 *   - No new ruleId appears that is not in the baseline.
 *   - No existing rule's node count increases vs baseline.
 *   (Moderate/minor violations are intentionally ignored for now.)
 *
 * First run (no baseline file): writes tests/a11y-baseline.json and exits 0.
 * To re-baseline intentionally: delete tests/a11y-baseline.json and re-run.
 *
 * Run:  node tests/a11y-check.mjs
 * CI:   called by npm run gate (non-fast block, after render-check)
 */

import { acquireBrowser } from './browser-shared.mjs';
import { AxeBuilder } from '@axe-core/playwright';
import { fileURLToPath } from 'url';
import path from 'path';
import fs from 'fs';
import http from 'http';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const BASELINE_PATH = path.join(ROOT, 'tests', 'a11y-baseline.json');
const INDEX = path.join(ROOT, 'index.html');

if (!fs.existsSync(INDEX)) {
  console.error('[a11y] index.html not found at', INDEX);
  process.exit(1);
}

// ── Minimal static file server (matches boot-smoke.mjs) ──────────────────────
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

// ── Playwright + axe ─────────────────────────────────────────────────────────
const browser = await acquireBrowser();
const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
const page = await ctx.newPage();

await page.goto(BASE_URL);

// Wait for boot to complete (matches boot-smoke.mjs)
try {
  await page.waitForFunction(
    () => {
      const bs = document.getElementById('bootScreen');
      return !bs || bs.style.display === 'none' || getComputedStyle(bs).display === 'none';
    },
    { timeout: 8000 }
  );
} catch {
  console.error('[a11y] Boot did not complete within 8 s — aborting');
  await ctx.close();
  await browser.close();
  server.close();
  process.exit(1);
}

// Small buffer for post-boot renders
await page.waitForTimeout(500);

// ── Run axe, filter to serious + critical only ────────────────────────────────
const results = await new AxeBuilder({ page }).analyze();
const blocking = results.violations.filter(v => v.impact === 'serious' || v.impact === 'critical');

await ctx.close();
await browser.close();
server.close();

// Build current count map: { ruleId: nodeCount }
const current = {};
for (const v of blocking) {
  current[v.id] = (current[v.id] || 0) + v.nodes.length;
}

// ── Baseline-diff ─────────────────────────────────────────────────────────────
if (!fs.existsSync(BASELINE_PATH)) {
  fs.writeFileSync(BASELINE_PATH, JSON.stringify(current, null, 2) + '\n');
  console.log('[a11y] No baseline found — wrote tests/a11y-baseline.json');
  const ruleCount = Object.keys(current).length;
  console.log(
    `[a11y] Captured ${blocking.length} serious/critical violation(s) across ${ruleCount} rule(s):`
  );
  if (ruleCount === 0) {
    console.log('  (none — clean baseline!)');
  } else {
    for (const [id, count] of Object.entries(current)) {
      console.log(`  ${id}: ${count} node(s)`);
    }
  }
  console.log('[a11y] PASS (baseline written)\n');
  process.exit(0);
}

const baseline = JSON.parse(fs.readFileSync(BASELINE_PATH, 'utf8'));

let failed = 0;
const regressions = [];

for (const id of Object.keys(current)) {
  if (!(id in baseline)) {
    regressions.push(`NEW rule: ${id} (${current[id]} node(s)) — not in baseline`);
    failed++;
  } else if (current[id] > baseline[id]) {
    regressions.push(`INCREASED: ${id} — baseline ${baseline[id]}, current ${current[id]}`);
    failed++;
  }
}

if (failed > 0) {
  console.error('[a11y] FAIL — accessibility regression detected:');
  for (const r of regressions) console.error('  ' + r);
  console.error('\nFix the regression or re-baseline by deleting tests/a11y-baseline.json.\n');
  process.exit(1);
}

const improved = Object.keys(baseline).filter(id => !(id in current) || current[id] < baseline[id]);
console.log('[a11y] PASS — no new serious/critical violations vs baseline');
if (improved.length > 0) {
  console.log('  Improved rule(s): ' + improved.join(', ') + ' — consider updating baseline');
}
console.log('');
process.exit(0);
