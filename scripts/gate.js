#!/usr/bin/env node
/**
 * scripts/gate.js — Full pre-commit / CI gate (Protocol 36)
 *
 * Runs exactly what CI runs, in order. Exit code non-zero if ANY step fails.
 * Called via:
 *   npm run gate       — full gate (lint + format + tests + browser checks)
 *   npm run gate:fast  — fast gate (lint + format + tests; browser checks skipped)
 *   npm run gate:iter  — OPT-IN iteration pre-check ONLY (lint changed files +
 *                        format + Node runner). Skips every browser check for
 *                        fast inner-loop feedback. NOT a substitute for the
 *                        commit gate (gate:fast) or the push gate (gate): it is
 *                        never run by a git hook or CI, so it cannot satisfy
 *                        either boundary.
 *
 * 2.8.5 U-B3: the second (mirror) test runner and its per-suite parity check
 * were REMOVED — the mirror caught nothing the Node runner cannot, at ~13× the
 * cost. Protocol 15 (runner parity) is retired. The gate now runs the single
 * canonical Node runner. (This file intentionally carries no reference to the
 * deleted mirror — Suite 50.6 / 128.5 guard that it stays single-runner.)
 *
 * Steps (full; --fast runs 1-4 + the fast boot smoke; --iter takes its own path):
 *   1. ESLint (--max-warnings 0)
 *   2. Prettier format check
 *   3. Boot-chain preflight (index.html/sw.js/disk/docs/test.html consistency)
 *   4. Persistence audit — Node runner
 *   ── fast commit gate ALSO runs (U1): a tiny headless boot smoke so
 *      commit-green means "the shell boots and paints," not just "greps clean."
 *   5. Playwright Chromium availability check     ← skipped by --fast
 *   6. Boot smoke test (HTTP, full)               ← skipped by --fast
 *   7. Render check (360px & 412px)               ← skipped by --fast
 *   8. A11y check (axe serious/critical baseline) ← skipped by --fast
 *   9. Runtime audit — test.html headless         ← skipped by --fast
 *  10. Save-survival (SAVE_INTEGRITY_PASS)         ← skipped by --fast
 *  11. Offline-first behavioral test (network cut)← skipped by --fast (U1)
 */
'use strict';

const { spawnSync, spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const os = require('os');

const ROOT = path.join(__dirname, '..');
const fast = process.argv.includes('--fast');

// ── Per-step wall-time profiling (Health-batch U5) ───────────────────────────
// Measurement only — this records how long each gate step takes and prints a
// breakdown table at the end. It changes NOTHING about what any step asserts.
// A step's duration is captured around its child-process spawn (run()) or around
// the browser launch/warmup helpers, so the table shows exactly where the gate's
// wall-time actually goes. Always on (cheap), so every gate run leaves a real
// breakdown behind instead of a guessed one.
const _timings = [];
function printTimingTable() {
  if (!_timings.length) return;
  const total = _timings.reduce((a, t) => a + t.ms, 0);
  const w = Math.max(..._timings.map(t => t.label.length), 5);
  console.log('\n[gate] ── per-step wall-time (U5 profiling) ' + '─'.repeat(Math.max(0, 30)));
  for (const t of _timings) {
    const secs = (t.ms / 1000).toFixed(2).padStart(7);
    const pct = ((t.ms / total) * 100).toFixed(1).padStart(5);
    console.log(`[gate]   ${t.label.padEnd(w)}  ${secs}s  ${pct}%`);
  }
  console.log(`[gate]   ${'TOTAL'.padEnd(w)}  ${(total / 1000).toFixed(2).padStart(7)}s  100.0%`);
  console.log('[gate] ' + '─'.repeat(72));
}
process.on('exit', printTimingTable);

// ── CI failure-evidence packaging (Health-batch U4) ──────────────────────────
// When CI goes red, the failure should be diagnosable from the run itself — no
// local re-run. Two pieces:
//   1. Every gate step's full stdout+stderr is teed to a per-step log file under
//      test-artifacts/gate-logs/ (so the failing test names + output survive as
//      an uploadable artifact instead of scrolling past in the Actions console).
//   2. ROBCO_ARTIFACTS_DIR is propagated to the child browser harnesses so their
//      screenshots + console dumps land in the SAME directory the workflow
//      uploads (tests/artifacts.mjs).
// Capture is on in CI (GitHub Actions sets CI=true) or with --capture. Locally
// without it, steps keep streaming live to the console exactly as before.
const CAPTURE = !!process.env.CI || process.argv.includes('--capture');
const ARTIFACTS_DIR = process.env.ROBCO_ARTIFACTS_DIR
  ? path.resolve(process.env.ROBCO_ARTIFACTS_DIR)
  : path.join(ROOT, 'test-artifacts');
process.env.ROBCO_ARTIFACTS_DIR = ARTIFACTS_DIR; // child harnesses inherit this
const GATE_LOG_DIR = path.join(ARTIFACTS_DIR, 'gate-logs');
let _stepSeq = 0;
// Opt-in iteration pre-check (audit #3). NOT a commit/push gate — see the --iter
// block below. Never wired into a git hook or CI; it cannot satisfy either gate.
const iter = process.argv.includes('--iter');

// Synchronous sleep (no dependency, no extra process) — used only to poll for
// the shared browser server's endpoint file while gate.js stays synchronous.
function sleepSync(ms) {
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
}

// ── Shared Chromium (audit #8) ────────────────────────────────────────────────
// Launch ONE Chromium (tests/browser-server.mjs) that the four browser checks
// connect to via PW_WS_ENDPOINT, instead of each cold-launching its own.
let _sharedBrowserChild = null;
let _endpointFile = null;

function startSharedBrowser() {
  _endpointFile = path.join(os.tmpdir(), `robco-pw-endpoint-${process.pid}.txt`);
  try {
    fs.rmSync(_endpointFile, { force: true });
  } catch {
    /* nothing to remove */
  }
  const child = spawn('node', ['tests/browser-server.mjs', _endpointFile], {
    cwd: ROOT,
    stdio: ['pipe', 'inherit', 'inherit'], // hold the child's stdin so it exits with us
  });
  child.on('error', () => {});
  // Poll for the endpoint file (browser ready). Up to ~30s.
  let endpoint = null;
  for (let i = 0; i < 300; i++) {
    if (child.exitCode !== null) break; // server died before publishing
    try {
      const txt = fs.readFileSync(_endpointFile, 'utf8').trim();
      if (txt.startsWith('ws://') || txt.startsWith('wss://')) {
        endpoint = txt;
        break;
      }
    } catch {
      /* not written yet */
    }
    sleepSync(100);
  }
  if (!endpoint) {
    try {
      child.kill();
    } catch {
      /* already gone */
    }
    return false;
  }
  _sharedBrowserChild = child;
  process.env.PW_WS_ENDPOINT = endpoint;
  process.on('exit', stopSharedBrowser); // guarantee teardown on any exit path
  return true;
}

function stopSharedBrowser() {
  if (_sharedBrowserChild) {
    try {
      _sharedBrowserChild.kill();
    } catch {
      /* already gone */
    }
    _sharedBrowserChild = null;
  }
  delete process.env.PW_WS_ENDPOINT;
  if (_endpointFile) {
    try {
      fs.rmSync(_endpointFile, { force: true });
    } catch {
      /* already gone */
    }
    _endpointFile = null;
  }
}

function run(label, cmd) {
  console.log(`\n[gate] ${label}`);
  const _t0 = process.hrtime.bigint();
  const _rec = () => _timings.push({ label, ms: Number(process.hrtime.bigint() - _t0) / 1e6 });
  if (!CAPTURE) {
    // Local default: stream live to the console, exactly as before.
    const result = spawnSync(cmd, { cwd: ROOT, stdio: 'inherit', shell: true });
    _rec();
    if (result.status !== 0) {
      console.error(`\n[GATE FAIL] ${label} — exit ${result.status}`);
      process.exit(result.status || 1);
    }
    return;
  }
  // Capture mode (CI / --capture): pipe the step's output, print it, AND tee it
  // to a per-step log so a red run leaves the failing test names + output behind
  // as an uploadable artifact. maxBuffer is raised well above the Node runner's
  // full multi-thousand-test output so nothing is truncated.
  const result = spawnSync(cmd, {
    cwd: ROOT,
    shell: true,
    encoding: 'utf8',
    maxBuffer: 128 * 1024 * 1024,
  });
  _rec();
  const out = (result.stdout || '') + (result.stderr || '');
  process.stdout.write(out);
  _stepSeq += 1;
  const slug =
    String(_stepSeq).padStart(2, '0') +
    '-' +
    label
      .replace(/[^a-z0-9]+/gi, '-')
      .toLowerCase()
      .slice(0, 50);
  try {
    fs.mkdirSync(GATE_LOG_DIR, { recursive: true });
    fs.writeFileSync(
      path.join(GATE_LOG_DIR, slug + '.log'),
      `$ ${cmd}\n[exit ${result.status}]\n\n${out}`,
      'utf8'
    );
  } catch {
    /* logging must never break the gate */
  }
  if (result.status !== 0) {
    console.error(`\n[GATE FAIL] ${label} — exit ${result.status} (log: gate-logs/${slug}.log)`);
    process.exit(result.status || 1);
  }
}

// Verify the Playwright Chromium binary is present before any browser check.
// Used by BOTH the fast commit gate (the boot smoke, U1) and the full push
// gate (all browser checks) — a browser check with no browser must fail with a
// clear, actionable message, never a cryptic crash.
function ensureChromium(context) {
  const _t0 = process.hrtime.bigint();
  console.log(`\n[gate] Playwright Chromium availability${context ? ' (' + context + ')' : ''}`);
  const chromiumScript =
    "try{const{chromium}=require('playwright');const p=chromium.executablePath();" +
    "require('fs').accessSync(p);}catch(e){process.stderr.write(String(e.message||e));process.exit(1);}";
  const pwResult = spawnSync(`node -e "${chromiumScript}"`, {
    cwd: ROOT,
    shell: true,
    stdio: 'pipe',
    timeout: 10000,
  });
  if (pwResult.status !== 0) {
    const msg = (pwResult.stderr || '').toString().trim();
    console.error('\n[GATE FAIL] Playwright Chromium binary not found' + (msg ? ': ' + msg : '.'));
    console.error('  Run: npx playwright install chromium');
    process.exit(1);
  }
  console.log('  Chromium found.');
  _timings.push({
    label: 'Chromium availability' + (context ? ' (' + context + ')' : ''),
    ms: Number(process.hrtime.bigint() - _t0) / 1e6,
  });
}

// Changed .js/.mjs files vs HEAD (staged, unstaged, and untracked) — used only
// by the --iter pre-check to lint what changed. Returns [] on any failure, which
// makes the caller fall back to a full lint.
function changedLintFiles() {
  try {
    const tracked = spawnSync('git diff --name-only --diff-filter=ACMR HEAD', {
      cwd: ROOT,
      shell: true,
      encoding: 'utf8',
    });
    const untracked = spawnSync('git ls-files --others --exclude-standard', {
      cwd: ROOT,
      shell: true,
      encoding: 'utf8',
    });
    const lines = ((tracked.stdout || '') + '\n' + (untracked.stdout || ''))
      .split(/\r?\n/)
      .map(s => s.trim())
      .filter(Boolean);
    return [...new Set(lines)].filter(f => /\.(js|mjs)$/.test(f) && !f.includes('node_modules/'));
  } catch {
    return [];
  }
}

// ── Iteration pre-check (--iter, audit #3) ────────────────────────────────────
// A deliberately-thin, fast inner-loop check. It is OPT-IN and is never invoked
// by a git hook or CI, so it can never stand in for the commit gate (gate:fast)
// or the push gate (gate) — both of those run the full runner set unchanged.
if (iter) {
  console.log('\n[gate] ITERATION PRE-CHECK (--iter) — fast inner-loop feedback ONLY.');
  console.log('[gate] Does NOT replace the commit gate (npm run gate:fast) or the');
  console.log('[gate] push gate (npm run gate). Commit still runs both test runners;');
  console.log('[gate] push still runs both runners + every browser check.\n');

  const changed = changedLintFiles();
  if (changed.length) {
    const fileArgs = changed.map(f => `"${f}"`).join(' ');
    run(
      `ESLint (${changed.length} changed file(s), --max-warnings 0)`,
      `npx eslint ${fileArgs} --max-warnings 0 --no-warn-ignored`
    );
  } else {
    run('ESLint (--max-warnings 0)', 'npx eslint . --max-warnings 0');
  }

  run('Prettier (format check)', 'npx prettier --check .');
  run('Boot-chain preflight', 'node scripts/check-boot-chain.js');
  run('Persistence audit (Node)', 'node tests/robco-diagnostics.js');

  console.log(
    '\n[GATE] Iteration pre-check passed — NOT a commit/push gate. Run `npm run gate` before pushing.\n'
  );
  process.exit(0);
}

// ── 1. ESLint ─────────────────────────────────────────────────────────────────
run('ESLint (--max-warnings 0)', 'npx eslint . --max-warnings 0');

// ── 2. Prettier ───────────────────────────────────────────────────────────────
run('Prettier (format check)', 'npx prettier --check .');

// ── 3. Boot-chain preflight ──────────────────────────────────────────────────
// (U-A0, CODE_HEALTH_PLAN.md §3/§5) index.html/sw.js/disk/docs/test.html
// consistency — cheap, static, no browser needed, so it runs on both
// gate:fast (commit) and gate (push), same as lint/prettier.
run('Boot-chain preflight', 'node scripts/check-boot-chain.js');

// ── 4. Node persistence audit ─────────────────────────────────────────────────
// The single canonical runner. (2.8.5 U-B3: the second mirror runner + parity
// check were removed — Protocol 15 retired. See the header comment for why.)
run('Persistence audit (Node)', 'node tests/robco-diagnostics.js');

// ── Fast commit gate: a tiny browser boot smoke (U1, HEALTH_BATCH_PLAN.md §4) ──
// The whole point of U1: before this, gate:fast opened zero browsers, so
// commit-green meant only "the source greps clean." This adds a minimal,
// bounded (~2s) headless check so commit-green means "the shell boots and
// paints without throwing." It cold-launches its own Chromium (no shared server
// for a single check) and runs boot-smoke.mjs in --fast mode.
if (fast) {
  ensureChromium('commit boot smoke');
  run('Boot smoke (fast, commit gate)', 'node tests/boot-smoke.mjs --fast');
}

if (!fast) {
  // ── 5. Playwright Chromium check ──────────────────────────────────────────────
  ensureChromium();

  // Launch ONE shared Chromium for all the browser checks below (audit #8).
  // Each check connects to it via PW_WS_ENDPOINT; if the shared launch fails for
  // any reason, they fall back to launching their own — identical assertions.
  const _tShared = process.hrtime.bigint();
  const sharedOk = startSharedBrowser();
  _timings.push({
    label: 'Shared Chromium launch/warmup',
    ms: Number(process.hrtime.bigint() - _tShared) / 1e6,
  });
  console.log(
    sharedOk
      ? '\n[gate] Shared Chromium launched — the four browser checks reuse one browser.'
      : '\n[gate] Shared Chromium unavailable — each browser check launches its own (fallback).'
  );

  // ── 6. Boot smoke ─────────────────────────────────────────────────────────────
  run('Boot smoke (HTTP)', 'node tests/boot-smoke.mjs');

  // ── 7. Render check ───────────────────────────────────────────────────────────
  run('Render check (360px & 412px)', 'node tests/render-check.mjs');

  // ── 8. A11y check ─────────────────────────────────────────────────────────────
  run('A11y (axe serious/critical)', 'node tests/a11y-check.mjs');

  // ── 9. Browser-side persistence audit (test.html) ─────────────────────────────
  // Executes tests/test.html headless and asserts every suite passes + the
  // declared suite count matches reality (Protocol 40 — keeps test.html in sync).
  run('Runtime audit (test.html)', 'node tests/test-html-check.mjs');

  // ── 10. Save-survival (SAVE_INTEGRITY_PASS) ───────────────────────────────────
  // Boots real fixtures (current/mature/legacy-v7/malformed) through the REAL
  // boot + import paths and compares the full durable-field inventory — the
  // sacred-data guard. Too slow for gate:fast; runs on the push gate + CI.
  run('Save-survival', 'node tests/save-survival.mjs');

  // ── 11. Offline-first behavioral test (U1, HEALTH_BATCH_PLAN.md §4) ────────────
  // Loads the app, CUTS the network for real (context.setOffline), reloads, and
  // asserts the app boots to READY and a native tool (CONSULT) works with zero
  // network — the offline-first promise proven behaviorally, not by grepping
  // that the source "looks offline-safe." Push gate only (it registers a real
  // service worker + reloads — heavier than a commit-boundary smoke).
  run('Offline-first (network cut)', 'node tests/offline-first.mjs');

  stopSharedBrowser();
}

console.log(
  fast
    ? '\n[GATE] Fast gate passed (browser checks skipped — run npm run gate before pushing).\n'
    : '\n[GATE] All checks passed!\n'
);
