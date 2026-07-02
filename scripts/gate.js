#!/usr/bin/env node
/**
 * scripts/gate.js — Full pre-commit / CI gate (Protocol 36)
 *
 * Runs exactly what CI runs, in order. Exit code non-zero if ANY step fails.
 * Called via:
 *   npm run gate       — full gate (lint + format + tests + browser checks)
 *   npm run gate:fast  — fast gate (lint + format + tests; browser checks skipped)
 *   npm run gate:iter  — OPT-IN iteration pre-check ONLY (lint changed files +
 *                        format + Node runner). Skips the PowerShell mirror,
 *                        parity, and every browser check for fast inner-loop
 *                        feedback. NOT a substitute for the commit gate
 *                        (gate:fast) or the push gate (gate): it is never run by
 *                        a git hook or CI, so it cannot satisfy either boundary.
 *
 * Steps (full; --fast skips steps 5-9; --iter takes the separate fast path):
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
  const result = spawnSync(cmd, { cwd: ROOT, stdio: 'inherit', shell: true });
  if (result.status !== 0) {
    console.error(`\n[GATE FAIL] ${label} — exit ${result.status}`);
    process.exit(result.status || 1);
  }
}

// Per-suite parity (U3/S2-F5, Step 2 Phase 0 Unit 4). The total-only check
// below this can't catch drift WITHIN a suite (e.g. one runner gains a test
// and another loses one elsewhere, totals still match by coincidence — the
// 173-vs-209 gap Protocol 15 exists to prevent). Walks each runner's own
// captured output (generic header prefix: Node "── Title ─"; PowerShell
// "-- Title --") into an ordered list of { title, count } sections, where
// count is the number of PASS/FAIL result lines before the next header.
//
// Every suite header in the PowerShell runner is written "Suite N -- Title"
// (Sep() always numbers). The Node runner only started literally embedding
// "Suite N" in its header() text from Suite 49 onward — pre-existing suites
// 1-48 use bare descriptive titles by long-standing historical convention
// (predates this check; rewriting ~48 legacy header strings across both
// 14k-line runners is out of scope here and not what drifted). So parity is
// enforced at TWO tiers:
//   1. STRICT, per-suite: every suite where Node's header explicitly states
//      "Suite N" (currently 49+, which covers all Step 2 / Phase 0 work and
//      everything added from here forward) must have an identical title
//      (dash/arrow-style normalized — Node uses "—"/"→"/"±", PowerShell
//      substitutes "--"/"->"/"+-" for the same glyphs by established
//      convention) and an identical test count in both runners.
//   2. AGGREGATE, for the legacy zone: suites 1-48 (unnumbered in Node) are
//      summed on each side and compared as one total — coarser, but still
//      catches gross drift in the legacy zone without demanding a historical
//      rewrite unrelated to the current task.
const ANSI_ESCAPE_RE = new RegExp(String.fromCharCode(27) + '\\[[0-9;]*m', 'g');
const HEADER_RE = /^(?:──|--)\s+(.*)$/;
const NUMBERED_RE = /^Suite\s+(\d+)\s*(?:—|--)\s*(.*)$/;

function normalizeSuiteTitle(title) {
  return title
    .replace(/[─-]+\s*$/, '') // trailing decorative dash run
    .replace(/→/g, '->')
    .replace(/±/g, '+-')
    .replace(/—/g, '--')
    .trim();
}

// Returns { numbered: Map<num, {title, count}>, legacyTotal: number }
function parseSections(output, resultLineRe) {
  const clean = output.replace(ANSI_ESCAPE_RE, '');
  const numbered = new Map();
  let legacyTotal = 0;
  let current = null; // { num: string|null, count: number }
  const flush = () => {
    if (!current) return;
    if (current.num !== null) {
      if (!numbered.has(current.num)) numbered.set(current.num, { title: current.title, count: 0 });
      numbered.get(current.num).count += current.count;
    } else {
      legacyTotal += current.count;
    }
  };
  for (const raw of clean.split(/\r?\n/)) {
    const line = raw.trimEnd();
    const hm = line.match(HEADER_RE);
    if (hm) {
      flush();
      const rawTitle = hm[1].replace(/[─-]+\s*$/, '').trim();
      const nm = rawTitle.match(NUMBERED_RE);
      current = nm
        ? { num: nm[1], title: normalizeSuiteTitle(nm[2]), count: 0 }
        : { num: null, title: rawTitle, count: 0 };
      continue;
    }
    if (current && resultLineRe.test(line)) current.count++;
  }
  flush();
  return { numbered, legacyTotal };
}

function checkSuiteParity(nodeOut, psOut) {
  const node = parseSections(nodeOut, /^\s*[✓✗]/);
  const ps = parseSections(psOut, /^\s*\[(PASS|FAIL)\]/);
  const problems = [];

  // Tier 1 — strict, per-suite (every suite Node explicitly numbers).
  const allNums = new Set([...node.numbered.keys(), ...ps.numbered.keys()]);
  for (const num of [...allNums].sort((a, b) => Number(a) - Number(b))) {
    const n = node.numbered.get(num);
    const p = ps.numbered.get(num);
    if (!n && p) continue; // PS numbers sections Node doesn't (legacy zone) — folded into aggregate below
    if (n && !p) {
      problems.push(
        `Suite ${num}: present in Node runner ("${n.title}") but missing from PowerShell runner`
      );
    } else if (n && p && n.title !== p.title) {
      problems.push(`Suite ${num}: title mismatch — Node "${n.title}" vs PowerShell "${p.title}"`);
    } else if (n && p && n.count !== p.count) {
      problems.push(
        `Suite ${num} "${n.title}": count mismatch — Node ${n.count} vs PowerShell ${p.count}`
      );
    }
  }

  // Tier 2 — aggregate for the legacy (pre-49) unnumbered-in-Node zone. PS
  // numbers everything, so its "legacy" total is every numbered suite Node
  // has no entry for, plus its own unnumbered bucket (should be empty).
  const psLegacyTotal =
    ps.legacyTotal +
    [...ps.numbered.entries()]
      .filter(([num]) => !node.numbered.has(num))
      .reduce((sum, [, v]) => sum + v.count, 0);
  if (node.legacyTotal !== psLegacyTotal) {
    problems.push(
      `Legacy (pre-Suite-49, unnumbered-in-Node) zone aggregate mismatch: Node ${node.legacyTotal} vs PowerShell ${psLegacyTotal}`
    );
  }

  return {
    ok: problems.length === 0,
    problems,
    suiteCount: allNums.size,
  };
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

  // Per-suite parity (U4/S2-F5) — the total above can hide drift within a
  // suite (a test lost here, a test gained there, coincidentally matching
  // totals). Compares suite-by-suite composition, not just the grand total.
  const suiteParity = checkSuiteParity(nodeAuditOut, psAuditOut);
  if (!suiteParity.ok) {
    console.error(`\n[GATE FAIL] Per-suite runner parity broken (Protocol 15 / U4):`);
    for (const p of suiteParity.problems) console.error(`  - ${p}`);
    process.exit(1);
  }
  console.log(`  Per-suite parity holds: ${suiteParity.suiteCount} suites, identical composition`);
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
