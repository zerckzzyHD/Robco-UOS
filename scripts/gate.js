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

const { spawnSync } = require('child_process');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const isCI = !!process.env.CI;
const fast = process.argv.includes('--fast');

function run(label, cmd) {
  console.log(`\n[gate] ${label}`);
  const result = spawnSync(cmd, { cwd: ROOT, stdio: 'inherit', shell: true });
  if (result.status !== 0) {
    console.error(`\n[GATE FAIL] ${label} — exit ${result.status}`);
    process.exit(result.status || 1);
  }
}

function capture(cmd) {
  return spawnSync(cmd, {
    cwd: ROOT,
    stdio: ['inherit', 'pipe', 'pipe'],
    shell: true,
    encoding: 'utf8',
  });
}

// ── 1. ESLint ─────────────────────────────────────────────────────────────────
run('ESLint (--max-warnings 0)', 'npx eslint . --max-warnings 0');

// ── 2. Prettier ───────────────────────────────────────────────────────────────
run('Prettier (format check)', 'npx prettier --check .');

// ── 3. Node persistence audit ─────────────────────────────────────────────────
run('Persistence audit (Node)', 'node tests/robco-diagnostics.js');

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

  run('Persistence audit (PowerShell)', psFileCmd);

  console.log('\n[gate] Runner parity check');
  const nodeOut = capture('node tests/robco-diagnostics.js');
  const psOut = capture(psFileCmd);
  // ANSI codes wrap lines, not words — /ALL N TESTS/ matches even in colored output
  const nodeTotal = (nodeOut.stdout + nodeOut.stderr).match(/ALL (\d+) TESTS/)?.[1];
  const psTotal = (psOut.stdout + psOut.stderr).match(/ALL (\d+) TESTS/)?.[1];
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
}

console.log(
  fast
    ? '\n[GATE] Fast gate passed (browser checks skipped — run npm run gate before pushing).\n'
    : '\n[GATE] All checks passed!\n'
);
