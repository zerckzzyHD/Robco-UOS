#!/usr/bin/env node
/**
 * scripts/gate.js — Full pre-commit / CI gate (Protocol 36)
 *
 * Runs exactly what CI runs, in order. Exit code non-zero if ANY step fails.
 * Called via:  npm run gate
 *
 * Steps:
 *   1. ESLint (--max-warnings 0)
 *   2. Prettier format check
 *   3. Persistence audit — Node runner
 *   4. Persistence audit — PowerShell runner (+ parity check)
 *   5. Playwright Chromium availability check
 *   6. Boot smoke test (HTTP)
 *   7. Render check (360px & 412px)
 */
'use strict';

const { spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const isCI = !!process.env.CI;

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
run('Persistence audit (Node)', 'node tests/check-persistence.js');

// ── 4. PowerShell persistence audit + parity ─────────────────────────────────
const pwshCheck = spawnSync('pwsh --version', { shell: true, stdio: 'pipe' });
if (pwshCheck.status === 0) {
  run('Persistence audit (PowerShell)', 'pwsh -File tests/check-persistence.ps1');

  console.log('\n[gate] Runner parity check');
  const nodeOut = capture('node tests/check-persistence.js');
  const psOut = capture('pwsh -File tests/check-persistence.ps1');
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
  console.warn('\n[GATE WARN] pwsh not available locally — PowerShell & parity checks skipped.');
  console.warn('  Install PowerShell Core: https://aka.ms/pscore6');
  console.warn('  CI will enforce parity; this step is required for a passing push.\n');
}

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

console.log('\n[GATE] All checks passed!\n');
