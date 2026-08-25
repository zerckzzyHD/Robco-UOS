#!/usr/bin/env node
/**
 * scripts/generate-test-catalog.js — Protocol 47 (rules/docs-and-library.md).
 *
 * Generates `library/TEST_CATALOG.md` FROM `tests/robco-diagnostics.js` — the per-suite
 * CONTENT (title + the runner's own header-comment narration, if any), never hand-typed.
 * This is QUEUE.md item D: the "generate what a script can compute" plumbing the Atlas
 * (item I) reuses. No test COUNT is generated or tracked anywhere (Protocol 2a, retired) —
 * only qualitative per-suite narration.
 *
 * Extraction: every `header('…')` call in the runner is a suite boundary. Suite numbers
 * repeat when a suite re-announces itself before a later async assertion (see 76/137/196/
 * 207/220/228/etc.) — only the FIRST occurrence of each numbered suite (or, for the
 * unnumbered suites that predate the "Suite N —" convention, each distinct title) is kept.
 * For that first occurrence, the nearest contiguous run of `//`-comment lines immediately
 * above it (skipping only a structural blank line or a lone `{`) is captured verbatim as
 * the suite's narration; a suite with no such comment gets an honest "no narration" note
 * instead of a fabricated one.
 *
 * Usage:
 *   node scripts/generate-test-catalog.js            — regenerate library/TEST_CATALOG.md
 *   node scripts/generate-test-catalog.js --check     — verify it's current; exit 1 if stale.
 *     Fail-safe on the gitignored-library/ tension (Protocol 47): if library/TEST_CATALOG.md
 *     is absent (a clean CI checkout, or any machine without the local-only library/ tree),
 *     --check exits 0 — there is nothing to diff against, and a guard that fails on absence
 *     would fail every CI run forever. Currency is enforced only where the file actually
 *     exists to drift, exactly the fix Protocol 46 already established for library/MANIFEST.txt.
 *
 *     --check compares SUITE CONTENT against the on-disk file's OWN commit/branch/date stamp
 *     (extractMeta()), not a freshly re-derived one. The stamp legitimately changes on every
 *     commit, including ones that never touch the runner — comparing against a fresh stamp
 *     would fail the very next push after ANY commit, for a HEAD that moved and nothing else
 *     (caught live, Protocol 42, when this feature's own landing commit made its own catalog
 *     look stale). Only an actual difference in suite title/description is ever reported.
 */
'use strict';

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');
const { writeFileAtomic } = require('./atomic-write.js');

const ROOT = path.join(__dirname, '..');
const RUNNER_PATH = path.join(ROOT, 'tests', 'robco-diagnostics.js');
// Overridable so Suite 247 can exercise the REAL CLI (absent/stale/current) against a
// throwaway path instead of mutating the developer's own local library/ file.
const OUTPUT_PATH =
  process.env.ROBCO_TEST_CATALOG_OUTPUT || path.join(ROOT, 'library', 'TEST_CATALOG.md');

// Below this, the parser is almost certainly broken (a regex stopped matching after an
// unrelated edit to the runner) — refuse to write/compare a suspiciously-truncated catalog
// rather than silently shipping a half-empty one (anti-vacuous, same spirit as the A3
// cloud-serialization guard's "fails loudly on extraction failure").
const MIN_EXPECTED_SUITES = 100;

function git(args) {
  const r = spawnSync('git', args, { cwd: ROOT, encoding: 'utf8' });
  return r.status === 0 ? r.stdout.trim() : null;
}

/**
 * Parses `runnerSrc` and returns an ordered array of
 * { number: number|null, title: string, description: string } — one per FIRST-seen suite.
 */
function extractSuites(runnerSrc) {
  const lines = runnerSrc.split(/\r?\n/);

  // Map an absolute string offset to a 0-based line index (cumulative line-start offsets).
  const lineStarts = [0];
  for (const line of lines) lineStarts.push(lineStarts[lineStarts.length - 1] + line.length + 1);
  function lineIndexAt(offset) {
    let lo = 0,
      hi = lineStarts.length - 1;
    while (lo < hi) {
      const mid = (lo + hi + 1) >> 1;
      if (lineStarts[mid] <= offset) lo = mid;
      else hi = mid - 1;
    }
    return lo;
  }

  const commentRe = /^\s*\/\//;
  const fenceRe = /^\s*\/\/\s*═+\s*$/;
  const suiteNumRe = /^Suite\s+(\d+)\s*[—-]\s*(.*)$/s;
  const headerCallRe = /header\(\s*(['"])([\s\S]*?)\1\s*\)/g;

  const seen = new Set();
  const suites = [];
  let m;
  while ((m = headerCallRe.exec(runnerSrc))) {
    const rawTitle = m[2].replace(/\s+/g, ' ').trim();
    if (!rawTitle) continue; // header(title) — the function DEFINITION's parameter, not a call
    const sm = suiteNumRe.exec(rawTitle);
    const key = sm ? 'S' + sm[1] : rawTitle;
    if (seen.has(key)) continue;
    seen.add(key);

    const callLineIdx = lineIndexAt(m.index);

    // Walk upward past a purely structural blank line or lone '{' (the suite's opening
    // brace commonly sits between its comment block and the header() call itself).
    let j = callLineIdx - 1;
    let skipped = 0;
    while (j >= 0 && skipped < 5 && (lines[j].trim() === '' || lines[j].trim() === '{')) {
      j--;
      skipped++;
    }

    let description = '';
    if (j >= 0 && commentRe.test(lines[j])) {
      const collected = [];
      let k = j;
      let guard = 0;
      while (k >= 0 && commentRe.test(lines[k]) && guard < 200) {
        collected.unshift(lines[k]);
        k--;
        guard++;
      }
      description = collected
        .filter(l => !fenceRe.test(l))
        .map(l => l.replace(/^\s*\/\/\s?/, '').replace(/\s+$/, ''))
        .join(' ')
        .replace(/\s{2,}/g, ' ')
        .trim();
    }

    suites.push({
      number: sm ? Number(sm[1]) : null,
      title: rawTitle,
      description,
    });
  }

  return suites;
}

function buildMarkdown(suites, meta) {
  const lines = [];
  lines.push('# RobCo U.O.S. — Test Catalog');
  lines.push('');
  lines.push('> ## GENERATED — do not hand-edit (Protocol 47)');
  lines.push('>');
  lines.push(
    '> Produced by `scripts/generate-test-catalog.js` (`npm run test-catalog`) directly from the'
  );
  lines.push(
    '> suite headers in `tests/robco-diagnostics.js` — this file is never hand-maintained. The gate'
  );
  lines.push(
    '> runs `npm run test-catalog:check` and fails if this copy has drifted from what the runner'
  );
  lines.push(
    '> would currently produce. That check is a no-op wherever this file is absent (a clean CI'
  );
  lines.push(
    '> checkout, or any machine without the gitignored local-only `library/` tree) — see Protocol 47'
  );
  lines.push('> in `rules/docs-and-library.md` for the gitignored-library reasoning.');
  lines.push('>');
  lines.push('> | | |');
  lines.push('> | --- | --- |');
  lines.push(`> | **Commit** | \`${meta.shortHash}\` (\`${meta.hash}\`) |`);
  lines.push(`> | **Branch** | \`${meta.branch}\` |`);
  lines.push(`> | **Generated** | ${meta.date} |`);
  lines.push('>');
  lines.push(
    '> Re-run the generator whenever `tests/robco-diagnostics.js` changes; never hand-patch the'
  );
  lines.push(
    '> section below — it will just be overwritten. No test COUNT is tracked anywhere (Protocol 2a,'
  );
  lines.push(
    "> retired) — the runner's exit status is the only signal. Coverage is per-SUITE (this file's own"
  );
  lines.push(
    '> header comment, verbatim, where one exists) — `tests/robco-diagnostics.js` remains the only'
  );
  lines.push('> complete, current list of what actually runs.');
  lines.push('');
  lines.push('---');
  lines.push('');

  for (const s of suites) {
    lines.push(`## ${s.title}`);
    lines.push('');
    lines.push(s.description || '_(no header comment on file for this suite in the runner.)_');
    lines.push('');
  }

  return (
    lines
      .join('\n')
      .replace(/\n{3,}/g, '\n\n')
      .trimEnd() + '\n'
  );
}

/**
 * Pulls {shortHash, hash, branch, date} back out of a previously-generated file's own
 * stamp table, or null if it doesn't look like one of ours. Used so `--check` can compare
 * SUITE CONTENT against the on-disk copy without the stamp itself (which legitimately
 * changes on every commit, including ones that never touch the runner) counting as drift —
 * otherwise every commit that isn't itself a catalog regenerate would spuriously fail the
 * very next push, for a HEAD that moved and nothing else.
 */
function extractMeta(markdown) {
  const commit = /\*\*Commit\*\* \| `([0-9a-f]+)` \(`([0-9a-f]+)`\) \|/.exec(markdown);
  const branch = /\*\*Branch\*\* \| `([^`]*)` \|/.exec(markdown);
  const date = /\*\*Generated\*\* \| (.+?) \|/.exec(markdown);
  if (!commit || !branch || !date) return null;
  return { shortHash: commit[1], hash: commit[2], branch: branch[1], date: date[1] };
}

function main() {
  const runnerSrc = fs.readFileSync(RUNNER_PATH, 'utf8');
  const suites = extractSuites(runnerSrc);

  if (suites.length < MIN_EXPECTED_SUITES) {
    console.error(
      `[test-catalog] Parser self-check failed: found only ${suites.length} suites ` +
        `(expected >= ${MIN_EXPECTED_SUITES}). Refusing to write/compare a suspiciously-truncated ` +
        `catalog — the extraction regex likely needs updating for a new header() shape.`
    );
    process.exit(1);
  }

  const realMeta = {
    hash: git(['rev-parse', 'HEAD']) || '(uncommitted)',
    shortHash: git(['rev-parse', '--short', 'HEAD']) || '(uncommitted)',
    branch: git(['branch', '--show-current']) || '(unknown)',
    date: git(['log', '-1', '--format=%ad', '--date=short']) || '(unknown)',
  };

  const checkMode = process.argv.includes('--check');
  if (checkMode) {
    if (!fs.existsSync(OUTPUT_PATH)) {
      console.log(
        '[test-catalog:check] library/TEST_CATALOG.md is absent (gitignored, local-only) — skipping.'
      );
      process.exit(0);
    }
    const onDisk = fs.readFileSync(OUTPUT_PATH, 'utf8');
    // Compare against the on-disk file's OWN stamp (falling back to the real one only if
    // it can't be parsed at all) — content drift is what --check exists to catch; the
    // commit/date stamp moving on its own, with no suite content change, is not drift.
    const compareMeta = extractMeta(onDisk) || realMeta;
    const expected = buildMarkdown(suites, compareMeta);
    if (onDisk === expected) {
      console.log(
        `[test-catalog:check] library/TEST_CATALOG.md is current (${suites.length} suites).`
      );
      process.exit(0);
    }
    console.error(
      '[test-catalog:check] library/TEST_CATALOG.md is STALE relative to tests/robco-diagnostics.js.'
    );
    console.error('  Regenerate with: npm run test-catalog');
    console.error(
      '  (library/ is gitignored — nothing to commit, just keep the local file current.)'
    );
    process.exit(1);
  }

  // WF12 — atomic, never truncating. library/ is gitignored, so a truncation here is
  // recoverable only from the private archive's last sync (Protocol 48).
  writeFileAtomic(OUTPUT_PATH, buildMarkdown(suites, realMeta), { encoding: 'utf8' });
  console.log(`[test-catalog] Wrote library/TEST_CATALOG.md (${suites.length} suites).`);
}

if (require.main === module) main();

module.exports = { extractSuites, buildMarkdown, extractMeta };
