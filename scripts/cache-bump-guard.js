#!/usr/bin/env node
'use strict';
/**
 * scripts/cache-bump-guard.js — Protocol 1 cache-bump guard (branch-agnostic).
 *
 * Invoked by the pre-commit hook. FAILS (exit 1) when a served/precached file is
 * staged AND the staged sw.js CACHE_NAME is UNCHANGED from THIS branch's own HEAD
 * value.
 *
 * WHY THIS SHAPE (the r-review fix): the old guard compared the staged CACHE_NAME
 * against origin/main's value and asserted the local rev number was strictly
 * greater. Under Protocol 43 every commit lands on `dev`, which is always many revs
 * ahead of the release-only `main` — so "local N > origin/main N" was true
 * unconditionally (e.g. 47 > 3) and the guard passed no matter what was staged. It
 * was inert on the only branch real work happens on; only manual discipline kept
 * the rev moving.
 *
 * The real invariant is simply "the staged CACHE_NAME must DIFFER from HEAD's."
 * That is branch-agnostic: it holds identically on dev, main, and any future
 * branch, because it never looks at another branch. So the monotonic-arithmetic
 * comparison is dropped entirely in favour of a plain "must differ from HEAD."
 *
 * Fail-safe (preserved from the old guard): if HEAD:sw.js is unreachable — a fresh
 * repo, or sw.js not yet committed on this branch — there is no baseline to compare
 * against, so we WARN and PASS (validate format only). A missing baseline must
 * never block a commit. Non-served commits skip the check entirely.
 *
 * Implemented in Node (not inline shell) so it can be exercised behaviourally in a
 * throwaway git repo by the gate (Suite 30, tests 30.3a–30.3d) — red-then-green,
 * proven by actually running this file, not by grepping its source.
 */

const { execSync } = require('child_process');
const fs = require('fs');

// Served/precached set. This MUST cover every path sw.js precaches — the install-time
// ASSETS array (index.html, manifest.json, assets/* icons, css/*, js/*) AND the
// best-effort runtime precaches (CHANGELOG.md, assets/ocr/*). The old classifier only
// matched a ROOT-anchored `icon[^/]*\.png`, so it silently missed every real icon
// (`assets/icon.png` …), `assets/ocr/eng.traineddata.gz`, and `CHANGELOG.md` — changing
// any of those needed no cache bump and cached users kept the stale copy under a green
// gate (the exact class of failure Protocol 1 exists to prevent). Suite 30.3f now
// asserts this regex classifies EVERY real sw.js precache entry as served, so it can
// never again drift out of agreement with the actual precache list.
const SERVED_RE = /^(index\.html|sw\.js|manifest\.json|CHANGELOG\.md|assets\/|css\/|js\/)/;
const VALID_FMT = /^robco-terminal-v[0-9]\S*-r[0-9]+$/;

function git(cmd) {
  // stdio pipe so a git error (e.g. path not in HEAD) throws instead of printing.
  return execSync('git ' + cmd, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] });
}

function cacheNameFrom(src) {
  const m = /^const CACHE_NAME\s*=\s*'([^']*)'/m.exec(src || '');
  return m ? m[1] : '';
}

// ── Is any served/precached file staged? ─────────────────────────────────────
let stagedNames = '';
try {
  stagedNames = git('diff --cached --name-only');
} catch {
  // No index / not a git repo — nothing to guard.
  process.exit(0);
}
const servedStaged = stagedNames.split(/\r?\n/).some(f => SERVED_RE.test(f.trim()));
if (!servedStaged) {
  console.log('  [SKIP]  No served/precached file staged — cache bump not required.');
  process.exit(0);
}

// ── The staged CACHE_NAME (index copy; fall back to the working tree). ────────
let stagedCache = '';
try {
  stagedCache = cacheNameFrom(git('show :sw.js'));
} catch {
  /* sw.js not staged — try the working tree below */
}
if (!stagedCache) {
  try {
    stagedCache = cacheNameFrom(fs.readFileSync('sw.js', 'utf8'));
  } catch {
    /* no working-tree sw.js either */
  }
}

// ── The baseline = THIS branch's own HEAD (branch-agnostic). ──────────────────
let headCache = '';
let baselineReachable = true;
try {
  headCache = cacheNameFrom(git('show HEAD:sw.js'));
  if (!headCache) baselineReachable = false;
} catch {
  baselineReachable = false;
}

if (!baselineReachable) {
  // Fail-safe: no baseline to compare against — never block, validate format only.
  if (VALID_FMT.test(stagedCache)) {
    console.log('  [WARN]  HEAD:sw.js baseline unreachable — CACHE_NAME format OK: ' + stagedCache);
    process.exit(0);
  }
  console.error('');
  console.error("  [FAIL]  CACHE_NAME missing or invalid: '" + stagedCache + "'");
  console.error('  Expected format: robco-terminal-v{APP_VERSION}-r{N}');
  console.error('  Bump CACHE_NAME in sw.js (Protocol 1), then stage and commit again.');
  console.error('');
  process.exit(1);
}

// ── The actual invariant: staged CACHE_NAME must DIFFER from HEAD's. ──────────
if (stagedCache === headCache) {
  console.error('');
  console.error('  [FAIL]  CACHE_NAME unchanged from HEAD (Protocol 1)!');
  console.error('  A served/precached file is staged but CACHE_NAME still reads:');
  console.error('    ' + (headCache || '(missing)'));
  console.error('');
  console.error('  Bump the -rN suffix in sw.js, run: git add sw.js, then commit again.');
  console.error('  (Cache-first SW: without a new CACHE_NAME, cached users never see the update.)');
  console.error('');
  process.exit(1);
}

if (!VALID_FMT.test(stagedCache)) {
  console.error('');
  console.error("  [FAIL]  CACHE_NAME invalid: '" + stagedCache + "'");
  console.error('  Expected format: robco-terminal-v{APP_VERSION}-r{N}');
  console.error('');
  process.exit(1);
}

console.log('  [PASS]  CACHE_NAME bumped: ' + headCache + ' -> ' + stagedCache);
process.exit(0);
