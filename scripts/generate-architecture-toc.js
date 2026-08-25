#!/usr/bin/env node
/**
 * scripts/generate-architecture-toc.js — Protocol 52 (rules/docs-and-library.md).
 *
 * Generates ARCHITECTURE.md's own Table of Contents FROM the file's own `## ` headings and
 * their preceding `<a id="…">` anchors, in reading order — never hand-typed again. QUEUE.md
 * item U, candidate #1 (GENERATE_VS_MAINTAIN_AUDIT.md): the hand-typed TOC had already drifted
 * for real once (19 entries / 20 headings out of date before the R10 Step 3 manual fix).
 *
 * Extraction: every line starting with exactly `## ` (not `### `) is a TOC-eligible heading,
 * except the "Table of Contents" heading itself (the section this list lives in). Its anchor
 * is the nearest `<a id="…"></a>` line found by scanning upward, skipping only blank lines —
 * the layout convention every section in this file already follows. The generated link text is
 * the heading's FULL text verbatim, including any parenthetical code/attribution suffix — the
 * only zero-false-positive source; no shortening or editorializing, the same "never hand-typed,
 * full fidelity" stance Protocol 47 already takes for library/TEST_CATALOG.md. This does mean
 * some entries now read longer than the previous hand-shortened titles — an accepted trade for
 * a TOC that can never again silently drift from the real heading set.
 *
 * Usage:
 *   node scripts/generate-architecture-toc.js         — rewrite the TOC block in place
 *   node scripts/generate-architecture-toc.js --check — verify it's current; exit 1 if stale.
 *
 * Unlike Protocol 47's library/TEST_CATALOG.md (gitignored, local-only), ARCHITECTURE.md is a
 * committed, always-present file — there is no "absent → pass" fail-safe tension here; --check
 * simply fails on any drift, the same shape as the LOAD-ORDER-GUARD block Suite 220.3/220.4
 * already checks two sections later in this same file.
 */
'use strict';

const fs = require('fs');
const path = require('path');
const { writeFileAtomic } = require('./atomic-write.js');

const ROOT = path.join(__dirname, '..');
// Overridable so the regression suite can exercise the real CLI against a throwaway copy
// instead of mutating the developer's own ARCHITECTURE.md (same technique as Protocol 47's
// ROBCO_TEST_CATALOG_OUTPUT).
const DOC_PATH = process.env.ROBCO_ARCHITECTURE_MD_PATH || path.join(ROOT, 'ARCHITECTURE.md');

const BEGIN_MARKER = '<!-- TOC:BEGIN';
const END_MARKER = '<!-- TOC:END -->';

// Below this, the parser is almost certainly broken (a heading/anchor convention changed
// elsewhere in the file) — refuse to write/compare a suspiciously-truncated TOC rather than
// silently shipping a half-empty one (anti-vacuous, same spirit as Protocol 47's
// MIN_EXPECTED_SUITES and the A3 cloud-serialization guard's "fail loudly on extraction failure").
const MIN_EXPECTED_ENTRIES = 20;

/**
 * Parses `src` (ARCHITECTURE.md's full text) and returns an ordered array of
 * { anchor: string|null, title: string } — one per level-2 (`## `) heading in reading order,
 * excluding the "Table of Contents" heading itself.
 */
function extractTocEntries(src) {
  const lines = src.split(/\r?\n/);
  const anchorRe = /^<a id="([^"]+)"><\/a>$/;
  const entries = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (!line.startsWith('## ')) continue;
    const title = line.slice(3).trim();
    if (title === 'Table of Contents') continue;

    let j = i - 1;
    while (j >= 0 && lines[j].trim() === '') j--;
    const am = j >= 0 ? anchorRe.exec(lines[j].trim()) : null;
    entries.push({ anchor: am ? am[1] : null, title });
  }

  return entries;
}

/** Renders the numbered markdown list lines for `entries`. */
function buildTocLines(entries) {
  return entries.map((e, i) => `${i + 1}. [${e.title}](${e.anchor ? '#' + e.anchor : ''})`);
}

/**
 * Replaces the content between the TOC markers in `src` with the list derived from `entries`.
 * Returns null if the markers can't be found (a real structural error, never silently ignored).
 */
function applyToc(src, entries) {
  const beginIdx = src.indexOf(BEGIN_MARKER);
  const endIdx = src.indexOf(END_MARKER);
  if (beginIdx === -1 || endIdx === -1 || endIdx < beginIdx) return null;
  const beginLineEnd = src.indexOf('\n', beginIdx);
  if (beginLineEnd === -1) return null;
  const before = src.slice(0, beginLineEnd + 1);
  const after = src.slice(endIdx);
  const body = '\n' + buildTocLines(entries).join('\n') + '\n\n';
  return before + body + after;
}

function main() {
  const src = fs.readFileSync(DOC_PATH, 'utf8');
  const entries = extractTocEntries(src);

  if (entries.length < MIN_EXPECTED_ENTRIES) {
    console.error(
      `[architecture-toc] Parser self-check failed: found only ${entries.length} headings ` +
        `(expected >= ${MIN_EXPECTED_ENTRIES}). Refusing to write/compare a suspiciously-truncated ` +
        `TOC — the heading/anchor extraction likely needs updating for a new doc shape.`
    );
    process.exit(1);
  }

  const missingAnchor = entries.find(e => !e.anchor);
  if (missingAnchor) {
    console.error(
      `[architecture-toc] Heading "${missingAnchor.title}" has no preceding <a id="…"> anchor ` +
        `immediately above it — every ## section must be anchored. Fix the doc, then re-run.`
    );
    process.exit(1);
  }

  const updated = applyToc(src, entries);
  if (updated === null) {
    console.error(
      '[architecture-toc] Could not find the <!-- TOC:BEGIN --> / <!-- TOC:END --> markers in ' +
        DOC_PATH +
        ' — has the file structure changed?'
    );
    process.exit(1);
  }

  const checkMode = process.argv.includes('--check');
  if (checkMode) {
    if (updated === src) {
      console.log(`[architecture-toc:check] TOC is current (${entries.length} entries).`);
      process.exit(0);
    }
    console.error("[architecture-toc:check] ARCHITECTURE.md's Table of Contents is STALE.");
    console.error('  Regenerate with: npm run architecture-toc');
    process.exit(1);
  }

  // WF12 — atomic, never truncating. This is a READ-MODIFY-WRITE of ARCHITECTURE.md:
  // the file is its own input, so a truncating write that died mid-way would destroy
  // the only copy on disk. `updated` is fully formed above, before anything is opened.
  writeFileAtomic(DOC_PATH, updated, { encoding: 'utf8' });
  console.log(
    `[architecture-toc] Wrote ARCHITECTURE.md's Table of Contents (${entries.length} entries).`
  );
}

if (require.main === module) main();

module.exports = { extractTocEntries, buildTocLines, applyToc };
