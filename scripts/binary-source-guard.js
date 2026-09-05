#!/usr/bin/env node
'use strict';
/**
 * scripts/binary-source-guard.js — refuse a staged file that git classifies as
 * BINARY unless its extension is on the allowlist or it was already binary.
 *
 * ── THE INCIDENT (2026-09-05, `_RobCo-Control`) ─────────────────────────────
 * A source file was written with literal NUL bytes in it. git classified it as
 * binary and staged it as `Bin 0 -> 11583 bytes`. ⛔ EVERY AUTOMATED CHECK
 * PASSED: `node --check` parsed it, every assertion passed, the module ran and
 * behaved correctly. Nothing was broken and nothing was wrong with the logic.
 *
 * What was lost was THE DIFF. This project's entire review model — Protocol 8's
 * audit stage, the "audit the DIFF, never the session's own summary" rule, every
 * code review anyone does here — reads diffs. 242 lines of logic would have
 * entered the repository UNREADABLE, with nothing anywhere saying so, and every
 * gate green. It was caught only because a session happened to read
 * `git diff --cached --stat` before committing and noticed the word `Bin`.
 *
 * ⭐ That is the failure class this guard closes: not "broken code got in" but
 * "UNREVIEWABLE code got in, invisibly, past checks that were all working."
 *
 * ── THE RULE ────────────────────────────────────────────────────────────────
 * A staged path FAILS when ALL THREE hold:
 *   1. git classifies the STAGED blob as binary, AND
 *   2. its extension is not on ALLOWED_BINARY_EXT, AND
 *   3. it is NEWLY binary — absent from HEAD, or present in HEAD as TEXT.
 *
 * Condition 3 is what makes this safe to land: an existing binary file the repo
 * already tracks can be modified freely and will never trip this. ⭐ The guard
 * catches the TRANSITION, never the inventory. A guard that goes red on files
 * that were already fine gets disabled inside a week, and then protects nothing.
 *
 * ── WHY GIT'S OWN CLASSIFIER, ON BOTH SIDES ─────────────────────────────────
 * "Is this binary" is answered by `git diff --numstat`, which prints `-` for the
 * added/deleted line counts exactly when git would render `Bin N -> M bytes`.
 * Both the staged side and the HEAD side are asked the same way (the HEAD side
 * by diffing the empty tree against HEAD). ⛔ We do NOT re-implement git's
 * NUL-byte heuristic: a guard whose definition of "binary" can drift from the
 * tool whose output it protects is a guard that disagrees with the thing it is
 * guarding. It also means `.gitattributes` declarations are honoured for free —
 * a path DECLARED binary is treated as binary here too, which is the correct
 * direction (declaring a `.js` binary trips the guard rather than evading it).
 *
 * ── NO BYPASS ENV, DELIBERATELY ─────────────────────────────────────────────
 * Other guards here carry a recorded escape hatch (ROBCO_PUSH_OVERRIDE). This
 * one does not, and the omission is the point: the sanctioned path for a genuine
 * new binary kind is to ADD ITS EXTENSION to the allowlist below, in the same
 * commit, where it is reviewed like any other change. An env var that waves
 * through unreviewable content would defeat the only thing this guard does.
 * ⚠ Honest ceiling, stated rather than implied: `git commit --no-verify` skips
 * every hook including this one. This is load-bearing against an ACCIDENT — the
 * incident above was an accident — not against a determined bypass.
 */

const { execSync, spawnSync } = require('child_process');
const path = require('path');

// The well-known empty tree object. Diffing it against HEAD asks git to classify
// every file in HEAD exactly as it classifies a staged addition.
const EMPTY_TREE = '4b825dc642cb6eb9a060e54bf8d69288fbee4904';

/**
 * Extensions whose binary content is legitimate and expected.
 *
 * Built from what this repository ACTUALLY tracks (measured 2026-09-05: 5 .png,
 * 1 .wasm, 1 .gz) plus the neighbouring kinds a PWA of this shape acquires —
 * images, fonts, archives, media, documents, compiled artefacts. Being generous
 * here is deliberate: a false positive on a legitimate asset is the failure mode
 * that gets a guard deleted, and the cost of a broad allowlist is only that a
 * hostile `.png` full of code stays reviewable-by-nobody — which it already was.
 */
const ALLOWED_BINARY_EXT = new Set([
  // images
  'png',
  'jpg',
  'jpeg',
  'gif',
  'webp',
  'avif',
  'bmp',
  'ico',
  'icns',
  'tif',
  'tiff',
  'psd',
  // fonts
  'woff',
  'woff2',
  'ttf',
  'otf',
  'eot',
  // archives / compressed payloads
  'zip',
  'gz',
  'tgz',
  'bz2',
  'xz',
  'zst',
  '7z',
  'rar',
  'tar',
  'traineddata',
  // audio / video
  'mp3',
  'wav',
  'ogg',
  'oga',
  'opus',
  'flac',
  'm4a',
  'aac',
  'mp4',
  'webm',
  'mov',
  'avi',
  'mkv',
  // documents
  'pdf',
  // compiled / packaged artefacts
  'wasm',
  'node',
  'exe',
  'dll',
  'so',
  'dylib',
  'class',
  'jar',
  'bin',
  'dat',
  'db',
  'sqlite',
  'sqlite3',
  'pyc',
  // signing / certificate material (binary DER forms)
  'der',
  'p12',
  'pfx',
  'crt',
  'cer',
  'keystore',
]);

function git(args, opts) {
  const r = spawnSync('git', ['--no-optional-locks', ...args], {
    encoding: 'utf8',
    windowsHide: true,
    maxBuffer: 64 * 1024 * 1024,
    ...(opts || {}),
  });
  if (r.error) return { ok: false, out: '', err: String(r.error.message || r.error) };
  return { ok: r.status === 0, out: r.stdout || '', err: (r.stderr || '').trim() };
}

function extOf(p) {
  const base = path.posix.basename(String(p).replace(/\\/g, '/'));
  const i = base.lastIndexOf('.');
  if (i <= 0) return ''; // no extension, or a dotfile like `.gitignore`
  return base.slice(i + 1).toLowerCase();
}

/** Paths git reports as binary in a given numstat invocation. `-`/`-` = binary. */
function binaryPathsFrom(args) {
  const r = git(args);
  if (!r.ok) return null; // caller decides what an unreadable side means
  const out = new Set();
  for (const line of r.out.split('\n')) {
    if (!line) continue;
    const f = line.split('\t');
    if (f.length >= 3 && f[0] === '-' && f[1] === '-') out.add(f.slice(2).join('\t'));
  }
  return out;
}

// ── Are we even in a repo with an index? ─────────────────────────────────────
try {
  execSync('git rev-parse --git-dir', { stdio: ['ignore', 'ignore', 'ignore'] });
} catch {
  process.exit(0); // not a git repo — nothing to guard
}

// ── 1. Which staged paths does git call binary? ──────────────────────────────
// --no-renames so a rename is a plain add+delete and the -z rename records
// cannot desynchronise the parse. --diff-filter=ACM so a DELETED binary never
// trips the guard: removing a file is not adding unreadable content.
const stagedBinary = binaryPathsFrom([
  'diff',
  '--cached',
  '--numstat',
  '--no-renames',
  '--diff-filter=ACM',
]);
if (stagedBinary === null) {
  console.log('  [WARN]  Binary-source guard: could not read the staged diff — skipping.');
  process.exit(0);
}
if (stagedBinary.size === 0) {
  console.log('  [PASS]  No staged file is classified binary by git.');
  process.exit(0);
}

// ── 2. Which of those were ALREADY binary at HEAD? (grandfathered) ───────────
// An unborn HEAD (initial commit) means nothing is grandfathered, which is the
// correct fail-closed reading: on a first commit every binary file is new.
let headBinary = new Set();
const hasHead = git(['rev-parse', '--verify', '--quiet', 'HEAD']).ok;
if (hasHead) {
  const hb = binaryPathsFrom(['diff', '--numstat', '--no-renames', EMPTY_TREE, 'HEAD']);
  if (hb === null) {
    // The baseline is unreadable. Say so and pass: a missing baseline must never
    // block a commit (the same fail-safe shape as the cache-bump guard).
    console.log(
      '  [WARN]  Binary-source guard: HEAD baseline unreadable — cannot tell new binaries from existing ones, skipping.'
    );
    process.exit(0);
  }
  headBinary = hb;
}

// ── 3. Judge ─────────────────────────────────────────────────────────────────
const offenders = [];
const allowedHits = [];
const grandfathered = [];
for (const p of stagedBinary) {
  const ext = extOf(p);
  if (ALLOWED_BINARY_EXT.has(ext)) {
    allowedHits.push(p);
    continue;
  }
  if (headBinary.has(p)) {
    grandfathered.push(p);
    continue;
  }
  offenders.push({ path: p, ext });
}

if (offenders.length === 0) {
  const notes = [];
  if (allowedHits.length) notes.push(allowedHits.length + ' allowed binary');
  if (grandfathered.length) notes.push(grandfathered.length + ' already-binary');
  console.log(
    '  [PASS]  No newly-binary source file staged' +
      (notes.length ? ' (' + notes.join(', ') + ').' : '.')
  );
  process.exit(0);
}

console.log('');
console.log('  [FAIL]  Staged file(s) git classifies as BINARY, with no allowlisted extension:');
for (const o of offenders) {
  console.log(
    '            ' + o.path + (o.ext ? '   (extension: .' + o.ext + ')' : '   (no extension)')
  );
}
console.log('');
console.log('  These would be committed as `Bin 0 -> N bytes` — the diff is UNREADABLE,');
console.log('  and every other check would still pass. Review here reads diffs, so this');
console.log('  is content entering the repository that nobody can review, silently.');
console.log('');
console.log('  Most likely cause: literal NUL bytes written into a text file. Check with');
console.log('    git diff --cached --stat            (look for "Bin")');
console.log('    node -e "const b=require(\'fs\').readFileSync(PATH);console.log(b.indexOf(0))"');
console.log('  A non-negative index is the first NUL byte. Rewrite the file as plain text.');
console.log('');
console.log('  If this file is GENUINELY a binary asset, add its extension to');
console.log('  ALLOWED_BINARY_EXT in scripts/binary-source-guard.js in this same commit,');
console.log('  so the decision is reviewed rather than bypassed.');
console.log('');
process.exit(1);
