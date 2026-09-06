/**
 * tests/queue-filter-check.mjs — the `/queue` project filter, RUN rather than read.
 *
 * ── ⛔⛤ WHY THIS EXISTS ──────────────────────────────────────────────────────
 * The filter shipped with the band numbers ignoring it: the pill count was
 * filter-blind and only a small caption beneath it responded, so the largest, most
 * readable number on each row was the one that did not answer the question the
 * reader had just asked. The owner found it on his phone.
 *
 * ⚠ THE NODE SUITE COULD NOT HAVE CAUGHT IT, AND STILL CANNOT. Suite 270 asserts
 * the DATA the page hands the script — the server-computed (band × project) map —
 * which is necessary and is not the same thing as the script working. A check that
 * reads the input a program consumes is not a check that the program runs. The only
 * exercise of the click path was a browser session driven by hand, and a check that
 * lives in one session's hands is a check the next session does not have.
 *
 * ── WHAT IT DOES ────────────────────────────────────────────────────────────
 * Renders the real page in-process, opens it in Chromium, clicks project pills, and
 * asserts the numbers the reader actually sees:
 *
 *   1. every band's headline number equals the server's precomputed figure for that
 *      (band × project) — the defect itself;
 *   2. every pill equals the sum of the band numbers selecting it produces — the
 *      residual the first fix introduced an hour later;
 *   3. selecting "All" restores every unfiltered value exactly;
 *   4. no page errors, and the retired caption has not come back.
 *
 * ⭐ NO SERVER IS NEEDED. The page is one self-contained document — inline CSS,
 * inline script, no external requests — so it is written to a temp file and opened
 * over file://. That is the same document the dev server hands out, byte for byte,
 * because the route does nothing but call the renderer.
 *
 * ⚠ SKIPS, LOUDLY AND WITH ITS REASON, on a checkout without the private planning
 * tree — a public clone has no board to filter, and that is a normal state rather
 * than a failure (the planning-paths contract). ⛔ It must never skip SILENTLY:
 * "the tree is absent" and "the filter works" would otherwise print the same green.
 */

import fs from 'fs';
import os from 'os';
import path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';
import { createRequire } from 'module';
import { acquireBrowser } from './browser-shared.mjs';

const require = createRequire(import.meta.url);
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const paths = require(path.join(ROOT, 'scripts', 'planning-paths.js'));
const view = require(path.join(ROOT, 'scripts', 'report-view.js'));

const board = paths.readRoadmap();
const queueMd = paths.readPlanningFile('QUEUE.md');
if (!board || !queueMd) {
  console.log('\n  [SKIP] /queue filter check — ' + paths.describe());
  console.log('  A checkout without the private planning tree has no board to filter.\n');
  process.exit(0);
}

const html = view.renderQueue(board, queueMd, paths.readOwnerDecisionCensus(), {
  itemFormat: paths.loadItemFormat(),
  graph: paths.readBlockerGraph(),
  axisVocabulary: paths.loadAxisVocabulary(),
});

// ⛔ The expectations come from the page's OWN handed-over data, not from a second
// derivation written here. A check that recomputes the answer is a second opinion
// about the subject; this one asserts the page agrees with what it published.
const m = /<div class="bandcounts"[^>]*data-counts="([^"]*)"/.exec(html);
if (!m) {
  console.error('\n  [FAIL] the page carries no band-count data — the filter cannot be correct.\n');
  process.exit(1);
}
const expected = JSON.parse(m[1].replace(/&quot;/g, '"'));
const projects = [
  ...new Set(
    [...html.matchAll(/<button class="pchip" data-p="([^"]+)"/g)].map(x => x[1]).filter(Boolean)
  ),
];
if (projects.length < 2) {
  console.error(`\n  [FAIL] only ${projects.length} project pill(s) — nothing to exercise.\n`);
  process.exit(1);
}

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'robco-queue-filter-'));
const file = path.join(tmp, 'queue.html');
fs.writeFileSync(file, html, 'utf8');

let failed = 0;
const check = (ok, msg) => {
  console.log(`  ${ok ? '[OK]  ' : '[FAIL]'} ${msg}`);
  if (!ok) failed++;
};

const browser = await acquireBrowser();
const ctx = await browser.newContext({ viewport: { width: 375, height: 812 } });
const page = await ctx.newPage();
const pageErrors = [];
page.on('pageerror', e => pageErrors.push(String(e)));
page.on('console', e => {
  if (e.type() === 'error') pageErrors.push(e.text());
});
await page.goto(pathToFileURL(file).href, { waitUntil: 'load' });

const readBands = () =>
  page.evaluate(() =>
    Object.fromEntries(
      [...document.querySelectorAll('details.band')].map(d => [
        d.dataset.band,
        d.querySelector('summary > .c').textContent,
      ])
    )
  );

const unfiltered = await readBands();
check(
  Object.keys(unfiltered).length > 0,
  `the page renders ${Object.keys(unfiltered).length} bands`
);

for (const proj of projects) {
  await page.click(`.pchip[data-p="${proj}"]`);
  const got = await readBands();
  let mismatch = null;
  let sum = 0;
  for (const band of Object.keys(got)) {
    const want = expected[band] ? expected[band][proj] || 0 : null;
    sum += Number(got[band]) || 0;
    if (want === null) continue;
    if (String(want) !== got[band]) mismatch = `${band}: shows ${got[band]}, server says ${want}`;
  }
  check(
    !mismatch,
    `${proj}: every band shows the server's figure${mismatch ? ' — ' + mismatch : ''}`
  );
  const pill = Number(
    await page.$eval(`.pchip[data-p="${proj}"] .c`, e => e.textContent).catch(() => NaN)
  );
  check(
    pill === sum,
    `${proj}: the pill (${pill}) equals the sum of the bands it produces (${sum})`
  );
}

await page.click('.pchip[data-p=""]');
const restored = await readBands();
check(
  JSON.stringify(restored) === JSON.stringify(unfiltered),
  'selecting All restores every unfiltered band value exactly'
);
check(
  !(await page.evaluate(() => /showing \d+ of \d+ listed/.test(document.body.innerHTML))),
  'the retired "showing N of M listed" caption has not come back'
);
check(pageErrors.length === 0, `no page errors${pageErrors.length ? ' — ' + pageErrors[0] : ''}`);

await ctx.close();
await browser.close();
try {
  fs.rmSync(tmp, { recursive: true, force: true, maxRetries: 3, retryDelay: 100 });
} catch {
  /* harmless leftover */
}

console.log('');
if (failed === 0) {
  console.log(`  /queue filter OK — ${projects.length} projects driven in a real browser.\n`);
  process.exit(0);
} else {
  console.error(`  ${failed} /queue filter check(s) FAILED.\n`);
  process.exit(1);
}
