#!/usr/bin/env node
/**
 * scripts/gate.js — Full pre-commit / CI gate (Protocol 36)
 *
 * Runs exactly what CI runs, in order. Exit code non-zero if ANY step fails.
 * Called via:
 *   npm run gate       — full gate (lint + format + tests + browser checks)
 *   npm run gate:fast  — fast gate (lint + format + tests; browser checks skipped)
 *
 * Steps (full; --fast skips steps 5-9):
 *   1. ESLint (--max-warnings 0)
 *   2. Prettier format check
 *   3. Persistence audit — Node runner
 *   4. Persistence audit — PowerShell runner (+ parity check)
 *   5. Playwright Chromium availability check     ← skipped by --fast
 *   6. Boot smoke test (HTTP)                     ← skipped by --fast
 *   7. Render check (360px & 412px)               ← skipped by --fast
 *   8. A11y check (axe serious/critical baseline) ← skipped by --fast
 *   9. Runtime audit — test.html headless         ← skipped by --fast
 */
'use strict';

const { spawnSync, spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const os = require('os');

const ROOT = path.join(__dirname, '..');
const isCI = !!process.env.CI;
const fast = process.argv.includes('--fast');

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
  const result = spawnSync(cmd, { cwd: ROOT, stdio: 'inherit', shell: true });
  if (result.status !== 0) {
    console.error(`\n[GATE FAIL] ${label} — exit ${result.status}`);
    process.exit(result.status || 1);
  }
}

// Like run(), but captures stdout/stderr (while still echoing them) and returns
// the combined text. Used for the two persistence runners so the parity check
// can read their "ALL N TESTS" totals from THIS run's output instead of
// re-executing both runners a second time (audit #4 — kills the double-run).
function runCapture(label, cmd) {
  console.log(`\n[gate] ${label}`);
  const result = spawnSync(cmd, { cwd: ROOT, shell: true, encoding: 'utf8' });
  if (result.stdout) process.stdout.write(result.stdout);
  if (result.stderr) process.stderr.write(result.stderr);
  if (result.status !== 0) {
    console.error(`\n[GATE FAIL] ${label} — exit ${result.status}`);
    process.exit(result.status || 1);
  }
  return (result.stdout || '') + (result.stderr || '');
}

// ── 1. ESLint ─────────────────────────────────────────────────────────────────
run('ESLint (--max-warnings 0)', 'npx eslint . --max-warnings 0');

// ── 2. Prettier ───────────────────────────────────────────────────────────────
run('Prettier (format check)', 'npx prettier --check .');

// ── 3. Node persistence audit ─────────────────────────────────────────────────
const nodeAuditOut = runCapture('Persistence audit (Node)', 'node tests/robco-diagnostics.js');

// ── 4. PowerShell persistence audit + parity ─────────────────────────────────
// Probe for pwsh (PowerShell Core) first; fall back to powershell (Windows PS 5.1).
// Only warn-skip when neither is found (e.g. bare Linux dev box without pwsh installed).
const pwshProbe = spawnSync('pwsh --version', { shell: true, stdio: 'pipe' });
const psProbe =
  pwshProbe.status === 0
    ? null
    : spawnSync('powershell -Command "exit 0"', { shell: true, stdio: 'pipe' });
const psBin =
  pwshProbe.status === 0 ? 'pwsh' : psProbe && psProbe.status === 0 ? 'powershell' : null;

if (psBin) {
  const psFileCmd =
    psBin === 'pwsh'
      ? 'pwsh -File tests/robco-diagnostics.ps1'
      : 'powershell -ExecutionPolicy Bypass -File tests/robco-diagnostics.ps1';

  const psAuditOut = runCapture('Persistence audit (PowerShell)', psFileCmd);

  console.log('\n[gate] Runner parity check');
  // Read the totals from the runs we ALREADY did in steps 3 & 4 — no second
  // execution of either runner (audit #4). ANSI codes wrap lines, not words,
  // so /ALL N TESTS/ matches even in colored output.
  const nodeTotal = nodeAuditOut.match(/ALL (\d+) TESTS/)?.[1];
  const psTotal = psAuditOut.match(/ALL (\d+) TESTS/)?.[1];
  if (!nodeTotal || !psTotal || nodeTotal !== psTotal) {
    console.error(
      `[GATE FAIL] Runner parity broken: Node=${nodeTotal} PS=${psTotal} (Protocol 15)`
    );
    process.exit(1);
  }
  console.log(`  Both runners agree: ${nodeTotal} tests`);
} else if (isCI) {
  console.error('\n[GATE FAIL] pwsh not available in CI — required for parity check (Protocol 15)');
  process.exit(1);
} else {
  console.warn(
    '\n[GATE WARN] Neither pwsh nor powershell found — PowerShell & parity checks skipped.'
  );
  console.warn('  Install PowerShell Core: https://aka.ms/pscore6');
  console.warn('  CI will enforce parity; this step is required for a passing push.\n');
}

if (!fast) {
  // ── 5. Playwright Chromium check ──────────────────────────────────────────────
  console.log('\n[gate] Playwright Chromium availability');
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

  // Launch ONE shared Chromium for all four browser checks below (audit #8).
  // Each check connects to it via PW_WS_ENDPOINT; if the shared launch fails for
  // any reason, they fall back to launching their own — identical assertions.
  const sharedOk = startSharedBrowser();
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

  stopSharedBrowser();
}

console.log(
  fast
    ? '\n[GATE] Fast gate passed (browser checks skipped — run npm run gate before pushing).\n'
    : '\n[GATE] All checks passed!\n'
);
