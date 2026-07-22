// scripts/prod-strip-devshell.mjs — Health-batch U7
//
// Strips the dev-only Diagnostic Shell (js/dev/test-console.js, ~204 KB) from a
// STAGED PRODUCTION artifact directory (the _site/ tree that deploy.yml publishes
// to GitHub Pages). Run at deploy time by .github/workflows/deploy.yml AFTER the
// served files are copied into _site/, and by the gate (Suite 149) against a
// throwaway staged copy.
//
// It operates on the TARGET DIR ONLY — never the repo source tree, and never the
// Cloudflare staging build (cf-staging-build.mjs copies the whole js/ dir and
// deliberately keeps the shell so the owner's staging tooling stays intact). The
// dev/prod asymmetry falls out of WHICH build runs this, not any runtime marker.
//
// Removes three references that describe the same served file and must always
// agree (break one and the all-or-nothing SW precache fails → prod install fails
// → black screen):
//   1. the file            js/dev/test-console.js   (+ the js/dev/ dir if now empty)
//   2. its <script> tag     <script src="js/dev/test-console.js"></script>  in index.html
//   3. its precache entry    './js/dev/test-console.js',                    in sw.js ASSETS
//
// It then runs a self-consistency assertion and EXITS NON-ZERO if anything is off,
// so a half-strip can never publish:
//   (a) the file is gone;
//   (b) no executable <script> tag in index.html still points at it (comments and
//       the inert <template id="testConsoleTemplate"> that merely MENTION the name
//       are left in place and are intentionally ignored — they are not references
//       the browser fetches);
//   (c) no precache literal in sw.js still points at it;
//   (d) every REMAINING sw.js precache entry resolves to a file that exists in the
//       target dir — the all-or-nothing landmine turned into a hard gate.
//
// Usage: node scripts/prod-strip-devshell.mjs <staged-dir>

import { existsSync, rmSync, readdirSync, readFileSync, writeFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

const SHELL_REL = 'js/dev/test-console.js';

const target = process.argv[2];
if (!target) {
  console.error('[prod-strip-devshell] ERROR: missing target dir argument.');
  console.error('  usage: node scripts/prod-strip-devshell.mjs <staged-dir>');
  process.exit(1);
}
if (!existsSync(target) || !statSync(target).isDirectory()) {
  console.error(`[prod-strip-devshell] ERROR: target dir not found or not a directory: ${target}`);
  process.exit(1);
}

const errors = [];
const fail = msg => errors.push(msg);

// ── 1. Remove the shell file (+ its now-empty js/dev/ dir) ─────────────────
const shellPath = join(target, SHELL_REL);
if (existsSync(shellPath)) {
  rmSync(shellPath);
}
const devDir = join(target, 'js', 'dev');
if (existsSync(devDir) && readdirSync(devDir).length === 0) {
  rmSync(devDir, { recursive: true, force: true });
}

// ── 2. Strip the <script> tag from index.html ─────────────────────────────
const indexPath = join(target, 'index.html');
if (!existsSync(indexPath)) {
  fail(`index.html not found in ${target}`);
} else {
  let html = readFileSync(indexPath, 'utf8');
  // Match the whole line carrying the executable tag, including its leading
  // indentation and trailing newline, so no blank line is left behind.
  const tagLine = /^[ \t]*<script src="js\/dev\/test-console\.js"><\/script>[ \t]*\r?\n/m;
  if (!tagLine.test(html)) {
    fail('the <script src="js/dev/test-console.js"></script> tag was not found in index.html');
  } else {
    html = html.replace(tagLine, '');
    writeFileSync(indexPath, html, 'utf8');
  }
}

// ── 3. Strip the precache entry from sw.js ─────────────────────────────────
const swPath = join(target, 'sw.js');
if (!existsSync(swPath)) {
  fail(`sw.js not found in ${target}`);
} else {
  let sw = readFileSync(swPath, 'utf8');
  const precacheLine = /^[ \t]*'\.\/js\/dev\/test-console\.js',[ \t]*\r?\n/m;
  if (!precacheLine.test(sw)) {
    fail("the './js/dev/test-console.js', precache entry was not found in sw.js ASSETS");
  } else {
    sw = sw.replace(precacheLine, '');
    writeFileSync(swPath, sw, 'utf8');
  }
}

// ── 4. Self-consistency assertions (fail the deploy on any surviving ref) ──
// (a) the file is gone
if (existsSync(join(target, SHELL_REL))) {
  fail(`${SHELL_REL} still present in the artifact after strip`);
}

if (existsSync(indexPath)) {
  const html = readFileSync(indexPath, 'utf8');
  // (b) no executable <script> tag still points at the shell. This is narrower
  //     than a blanket "test-console" grep ON PURPOSE: index.html legitimately
  //     keeps the inert <template id="testConsoleTemplate">, #testConsoleMount,
  //     and several explanatory comments that mention the filename — none of
  //     those cause a fetch, so none can black-screen prod.
  if (/<script[^>]*src=["']js\/dev\/test-console\.js["'][^>]*>/.test(html)) {
    fail('a <script> tag in index.html still references js/dev/test-console.js after strip');
  }
}

if (existsSync(swPath)) {
  const sw = readFileSync(swPath, 'utf8');
  // (c) no precache literal still points at the shell
  if (/['"]\.\/js\/dev\/test-console\.js['"]/.test(sw)) {
    fail('sw.js ASSETS still references ./js/dev/test-console.js after strip');
  }
  // (d) every remaining precache entry resolves to a real file in the artifact.
  //     Precache literals all start with './' — this reliably grabs the ASSETS
  //     entries while skipping the comment prose in the middle of the array.
  const entries = [...sw.matchAll(/'(\.\/[^']*)'/g)].map(m => m[1]);
  for (const entry of entries) {
    if (entry === './') continue; // the site root — always present
    const p = join(target, entry.slice(2));
    if (!existsSync(p)) {
      fail(
        `sw.js precaches ${entry} but no such file exists in the artifact (SW install would fail all-or-nothing)`
      );
    }
  }
}

// ── Report ────────────────────────────────────────────────────────────────
if (errors.length) {
  console.error('[prod-strip-devshell] FAILED — the production artifact is NOT self-consistent:');
  for (const e of errors) console.error(`  ✗ ${e}`);
  process.exit(1);
}

console.log(
  `[prod-strip-devshell] OK — removed ${SHELL_REL} + its <script> tag + its sw.js precache entry from ${target}; no surviving reference, every remaining precache entry resolves.`
);
