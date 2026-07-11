#!/usr/bin/env node
/**
 * scripts/check-boot-chain.js — the U-A0 boot-chain preflight
 * (planning/CODE_HEALTH_PLAN.md §3 / §5-U-A0).
 *
 * A file split/add/move/remove must keep FIVE things mutually consistent:
 *   1. index.html's static <script> tags + the GAME_FILES boot manifest
 *   2. sw.js's ASSETS precache list
 *   3. the physical js/*.js files on disk
 *   4. the CLAUDE.md / ARCHITECTURE.md LOAD-ORDER-GUARD doc blocks
 *   5. tests/test.html's boot chain
 * plus repomix.config.json's pack coverage (Protocol 37).
 *
 * Missing any one of these is either a black screen (a loaded file 404s, or a
 * file the app needs was never given a <script> tag) or a silently-missing
 * precache entry. This script derives the truth mechanically from index.html
 * and asserts every other source agrees — a mismatch is a GATE FAILURE, never
 * a production surprise.
 *
 * This duplicates part of what Suite 220 (both test runners) already checks
 * for the two markdown docs — that overlap is intentional: this script is a
 * fast, standalone preflight runnable on its own (`node scripts/check-boot-chain.js`)
 * without paying for either full runner, and it additionally covers sw.js
 * ASSETS, on-disk file coverage, and test.html, which Suite 220 does not.
 *
 * Run:  node scripts/check-boot-chain.js
 * Exit: 0 all consistent, 1 otherwise (prints every mismatch found).
 */
'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
let failCount = 0;

function ok(cond, label, detail) {
  if (cond) {
    console.log(`  [OK]   ${label}`);
  } else {
    console.error(`  [FAIL] ${label}` + (detail ? `\n         ${detail}` : ''));
    failCount++;
  }
}

function read(rel) {
  const abs = path.join(ROOT, rel);
  if (!fs.existsSync(abs)) {
    console.error(`  [FAIL] required file missing: ${rel}`);
    failCount++;
    return '';
  }
  return fs.readFileSync(abs, 'utf8');
}

// ── Derive the canonical boot order + file set from index.html ─────────────
// Mirrors Suite 220's canonicalOrder220 derivation (tests/robco-diagnostics.js)
// so both stay honest against the same source of truth.
const normStem = s => s.replace(/^db_(?:nv|fo3)$/, 'db').replace(/^reg_(?:nv|fo3)$/, 'reg');
const dedupeConsec = a => a.filter((x, i) => i === 0 || x !== a[i - 1]);

const html = read('index.html');

const staticStems = [];
{
  const sr = /<script[^>]*\ssrc=["']js\/([A-Za-z0-9_-]+)\.js["']/g;
  let m;
  while ((m = sr.exec(html))) staticStems.push(m[1]);
}

function gameFilesStemsFor(ctx) {
  const re = new RegExp(`${ctx}:\\s*\\[([^\\]]+)\\]`);
  const m = re.exec(html);
  return m ? [...m[1].matchAll(/js\/([A-Za-z0-9_-]+)\.js/g)].map(x => x[1]) : [];
}
const fnvGameFiles = gameFilesStemsFor('FNV');
const fo3GameFiles = gameFilesStemsFor('FO3');

// Normalized order (db_nv/db_fo3 -> "db", reg_nv/reg_fo3 -> "reg") — matches
// Suite 220's canonicalOrder220, used only for the doc LOAD-ORDER-GUARD compare.
const canonicalOrder = dedupeConsec(
  [staticStems[0], ...fnvGameFiles, ...staticStems.slice(1)].map(normStem)
);

// The real, ungrouped set of every physical js file the app can boot with
// (both game variants expanded) — used for existence/coverage checks.
const REAL_BOOT_STEMS = new Set([...staticStems, ...fnvGameFiles, ...fo3GameFiles]);

ok(
  canonicalOrder.length >= 10 && canonicalOrder[0] === 'idb' && canonicalOrder.at(-1) === 'cloud',
  'canonical boot order derived from index.html is non-trivial (starts idb, ends cloud)',
  `got: ${JSON.stringify(canonicalOrder)}`
);

// ── CHECK A: every physical js/*.js file on disk is part of the boot chain ──
// (js/vendor/* is lazy-loaded by ocr.js at runtime, never a <script> tag —
// sanctioned exclusion, same allowlist as CHECK D below.)
{
  const jsDir = path.join(ROOT, 'js');
  const onDisk = fs
    .readdirSync(jsDir, { withFileTypes: true })
    .filter(d => d.isFile() && d.name.endsWith('.js'))
    .map(d => d.name.replace(/\.js$/, ''));
  const orphans = onDisk.filter(stem => !REAL_BOOT_STEMS.has(stem));
  ok(
    orphans.length === 0,
    'every physical js/*.js file on disk has a <script> tag or GAME_FILES entry in index.html',
    orphans.length ? `orphaned on disk (never loaded): ${orphans.join(', ')}` : undefined
  );
}

// ── CHECK B: every file index.html references actually exists on disk ──────
{
  const missing = [...REAL_BOOT_STEMS].filter(
    stem => !fs.existsSync(path.join(ROOT, 'js', `${stem}.js`))
  );
  ok(
    missing.length === 0,
    'every js/*.js file referenced by index.html (<script> tags + GAME_FILES) exists on disk',
    missing.length
      ? `referenced but missing: ${missing.map(s => `js/${s}.js`).join(', ')}`
      : undefined
  );
}

// ── CHECK C / D: sw.js ASSETS precache list agrees with the boot chain ─────
// A small allowlist of js/ files that are intentionally NOT boot <script>
// tags: lazily runtime-cached by ocr.js on first OCR use (see sw.js's own
// comment on this exact exclusion).
const ASSETS_VENDOR_ALLOW = new Set(['js/vendor/tesseract.min.js', 'js/vendor/worker.min.js']);
{
  const sw = read('sw.js');
  const assetsBlock = /const ASSETS\s*=\s*\[([\s\S]*?)\];/.exec(sw);
  const assetJsPaths = assetsBlock
    ? [...assetsBlock[1].matchAll(/'\.\/(js\/[^']+)'/g)].map(m => m[1])
    : [];

  const missingFromAssets = [...REAL_BOOT_STEMS].filter(
    stem => !assetJsPaths.includes(`js/${stem}.js`)
  );
  ok(
    missingFromAssets.length === 0,
    'every boot-chain js/*.js file is precached in sw.js ASSETS (Protocol 1)',
    missingFromAssets.length
      ? `boot file missing from ASSETS: ${missingFromAssets.map(s => `js/${s}.js`).join(', ')}`
      : undefined
  );

  const orphanAssets = assetJsPaths.filter(p => {
    const stem = p.replace(/^js\//, '').replace(/\.js$/, '');
    return !REAL_BOOT_STEMS.has(stem) && !ASSETS_VENDOR_ALLOW.has(p);
  });
  ok(
    orphanAssets.length === 0,
    'every js/ entry in sw.js ASSETS is either a real boot file or the sanctioned OCR-vendor allowlist',
    orphanAssets.length ? `stale/orphaned ASSETS entry: ${orphanAssets.join(', ')}` : undefined
  );
}

// ── CHECK E: repomix.config.json still packs js/ (Protocol 37) ─────────────
{
  let cfg = null;
  try {
    cfg = JSON.parse(read('repomix.config.json'));
  } catch {
    /* read() already recorded the failure */
  }
  const included = !!cfg && Array.isArray(cfg.include) && cfg.include.includes('js/**');
  ok(included, 'repomix.config.json include[] still packs js/** (Protocol 37)');
}

// ── CHECK F/G: CLAUDE.md and ARCHITECTURE.md LOAD-ORDER-GUARD blocks ───────
// match the real canonical order (mirrors Suite 220.3/220.4).
function extractDocOrder(text) {
  const b = /LOAD-ORDER-GUARD:BEGIN([\s\S]*?)LOAD-ORDER-GUARD:END/.exec(text);
  if (!b) return null;
  const out = [];
  for (const line of b[1].split(/\r?\n/)) {
    if (!/^\s*\d+\./.test(line)) continue;
    const subj = line.split(/→|->/)[0];
    let mm;
    const fr = /js\/([A-Za-z0-9_-]+)\.js/g;
    while ((mm = fr.exec(subj))) out.push(normStem(mm[1]));
  }
  return dedupeConsec(out);
}
for (const doc of ['CLAUDE.md', 'ARCHITECTURE.md']) {
  const order = extractDocOrder(read(doc));
  ok(
    order !== null && JSON.stringify(order) === JSON.stringify(canonicalOrder),
    `${doc} LOAD-ORDER-GUARD block matches the real index.html boot order`,
    order === null
      ? 'no LOAD-ORDER-GUARD:BEGIN/END block found'
      : `doc order: ${JSON.stringify(order)}\n         real order: ${JSON.stringify(canonicalOrder)}`
  );
}

// ── CHECK H: tests/test.html's boot chain (Protocol 40) ────────────────────
// test.html deliberately loads only a SUBSET of the real boot chain (the
// runtime-import-contract surface: idb/db/state/reg/registry-core/api/
// runtime/test-console — never ui-*/ocr/cloud, which it doesn't exercise).
// So this checks the two things that are actually load-bearing for a subset:
//   (a) every file it references is real (exists + part of the boot chain —
//       catches a stale/retired reference or a typo'd filename)
//   (b) the GAME_FILES-prefix files it includes (idb/db_*/state/reg_*/
//       registry-core) keep index.html's relative order — the one place
//       order is genuinely enforced (script.async=false, db -> state -> reg).
// It does NOT require full inclusion or full-chain order match — Protocol 40
// only requires the tags it has to match index.html's order, not that every
// boot file appear.
{
  const testHtml = read('tests/test.html');
  const stems = [];
  const sr = /<script[^>]*\ssrc=["']\.\.\/js\/([A-Za-z0-9_-]+)\.js["']/g;
  let m;
  while ((m = sr.exec(testHtml))) stems.push(m[1]);

  const unknown = stems.filter(s => !REAL_BOOT_STEMS.has(s));
  ok(
    unknown.length === 0,
    'every js file tests/test.html loads is a real, current boot-chain file (no stale/retired reference)',
    unknown.length ? `unknown/retired: ${unknown.join(', ')}` : undefined
  );

  const GAME_PREFIX = ['idb', 'db_nv', 'db_fo3', 'state', 'reg_nv', 'reg_fo3', 'registry-core'];
  const testHtmlPrefixOrder = stems.filter(s => GAME_PREFIX.includes(s));
  const canonicalPrefixOrder = staticStems[0] === 'idb' ? ['idb', ...fnvGameFiles] : [];
  const expectedPrefixOrder = canonicalPrefixOrder.filter(s => testHtmlPrefixOrder.includes(s));
  ok(
    JSON.stringify(testHtmlPrefixOrder) === JSON.stringify(expectedPrefixOrder),
    "tests/test.html keeps idb -> db -> state -> reg -> registry-core in index.html's relative order",
    `test.html order: ${JSON.stringify(testHtmlPrefixOrder)}\n         expected: ${JSON.stringify(expectedPrefixOrder)}`
  );
}

// ── Summary ──────────────────────────────────────────────────────────────
console.log('');
if (failCount > 0) {
  console.error(`[boot-chain] ${failCount} inconsistency(ies) found. See [FAIL] lines above.`);
  process.exit(1);
} else {
  console.log('[boot-chain] All 5 sources consistent — index.html, sw.js, disk, docs, test.html.');
  process.exit(0);
}
