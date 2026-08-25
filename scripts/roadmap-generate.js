#!/usr/bin/env node
/**
 * scripts/roadmap-generate.js — the GENERATED roadmap board (QR1 Phase 0).
 *
 * Reads the private QUEUE.md, bands its items by status, and writes ROADMAP.md
 * back into the private planning tree. QUEUE.md stays the one source of truth;
 * this only RENDERS a view of it, exactly like scripts/queue-view.js renders the
 * phone page (Protocol 22 — it reuses that parser rather than growing a second).
 *
 * ── ⭐ FAIL-CLOSED GOVERNS THE *OUTPUT*, NOT THE EXIT CODE ───────────────────
 * These are two different promises and conflating them is how reporters become
 * blockers:
 *
 *   1. THE OUTPUT fails closed. If anything structural is wrong with the parse,
 *      the whole document renders BLIND — an enumerated reason plus a plain
 *      statement of what the reader no longer knows. NEVER a partial list, and
 *      NEVER the last good answer. A board showing 190 of 205 items looks
 *      completely healthy; there is no visual difference between "these are the
 *      items" and "these are the items I managed to parse". That is the exact
 *      failure this whole phase exists to end (the sub-lettered-ID defect, where
 *      two items vanished with no warning), so a degraded board is not offered
 *      as a consolation prize — it is refused.
 *
 *   2. THE PROCESS always exits 0. It is a reporter, like the museum generator:
 *      it can never fail a sync, a commit, or a push. A roadmap that cannot be
 *      built is a thing to LOOK at, not a thing to be BLOCKED by. (The one
 *      deliberate exception is `--check`, below, which is an assertion, not the
 *      generator.)
 *
 *   3. NO PLANNING TREE IS NOT BLINDNESS. A public clone has no archive by
 *      design (F04). That case prints planningPaths.describe(), writes nothing at
 *      all, and exits 0 — it is not a blind board, because there was never a
 *      board to go blind. Blind means "I had a source and could not trust it".
 *
 * ── Deterministic. Same QUEUE.md → byte-identical ROADMAP.md. No timestamps.
 *    The source is fingerprinted (SHA-256) for provenance, and the app repo's
 *    git HEAD is stamped when it can be read — an unreadable HEAD is recorded as
 *    `unknown`, which is NOT a blind condition (provenance is nice to have;
 *    the board's correctness does not depend on it).
 *
 * Usage:  npm run roadmap        →  <planning tree>/ROADMAP.md
 *         npm run roadmap:check  →  exit 1 if the on-disk ROADMAP.md is BLIND,
 *                                   STALE, MISSING, or unverifiable (see below)
 */
'use strict';

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { execFileSync } = require('child_process');
const { writeFileAtomic } = require('./atomic-write.js');

const ROOT = path.join(__dirname, '..');
const OUTPUT_NAME = 'ROADMAP.md';

/** Machine-readable state marker — `--check` parses THIS, never the prose. */
const STATE_MARKER = 'ROADMAP-STATE';

/**
 * ⭐ THE SINGLE ENUMERATION OF WAYS THIS BOARD CAN GO BLIND.
 *
 * One closed list, so "why is it blind?" always has an answer drawn from a set a
 * reader can see in full — rather than a free-text message invented at the throw
 * site, which is how a reason nobody enumerated becomes a reason nobody can act
 * on. Suite 248.6 asserts these keys and the reasons table in the output agree.
 */
const BLIND_REASONS = {
  'source-unreadable': 'QUEUE.md could not be read from the planning tree.',
  'parser-unreachable':
    'scripts/queue-view.js could not be loaded, or is missing an export this generator requires. ' +
    '⛔ There is deliberately NO fallback parser: a second, lesser parser would quietly produce a ' +
    'DIFFERENT board from the real one, which is worse than no board at all.',
  'no-title':
    'QUEUE.md yielded no document title — the parse did not find the structure it expects.',
  'extraction-regression':
    'The parser and a raw scan of the source disagree about how many ID-bearing items exist. ' +
    'One of them is dropping items (this is the 2026-08-13 sub-lettered-ID defect class).',
  'too-few-items':
    'Fewer than 10 ID-bearing items were extracted — the parse is not plausibly complete.',
  'duplicate-ids': "Two items share an ID. QUEUE.md's own rule is never renumber, never reuse.",
  'unclassifiable-board':
    'More than 10% of ID-bearing items carry no recognised leading status glyph, so the banding ' +
    'is not describing the board.',
  'internal-error': 'The generator threw. The board is not published on a guess.',
};

const TOO_FEW_ITEMS = 10;
const UNCLASSIFIABLE_LIMIT = 0.1; // >10% of ID-bearing items

/**
 * ⭐ THE BACKLOG BAND IS A COUNT, NOT A LIST (QR3, 2026-08-13).
 *
 * The restructure plan said so from the start — *"BACKLOG is a count, not a list,
 * and that is the whole design"* — and the first generator shipped it as a full
 * list anyway, all 148 of them, which is ~60% of the document. ⛔ That is not a
 * cosmetic preference: it is the generated board reproducing the exact
 * unreadability its own parent item was filed to end. The queue got lean; the VIEW
 * of it did not. A 245-line "roadmap" that is mostly a backlog dump is the
 * monolith wearing a different hat.
 *
 * This board projects the ORDER of the work, not the whole of it. The bands that
 * describe what is in motion — ready, active, attention, deferred, parked — stay
 * full lists, because their whole value is naming the items. Backlog's value is
 * its SIZE.
 *
 * ⚠ HIDING ITEMS BEHIND A NUMBER DOES NOT WEAKEN THE DROP DETECTION, and that is
 * worth stating because it looks like it should. Nothing here decides what EXISTS
 * — `extraction-regression` still compares the parser against a raw scan of the
 * source, the header still prints the ID-bearing total, and the band counts still
 * have to add up to it. A silently dropped backlog item blinds the whole board
 * exactly as before; it just no longer costs 148 lines to say so.
 *
 * ⛔ THE UNCLASSIFIED BAND IS EXPLICITLY NOT COVERED BY THIS. It stays listed in
 * full, never truncated, never guessed at — an item nobody can classify is the one
 * most worth seeing, and this rule must never be read as licence to shorten it.
 *
 * ⚠ THE LABEL IS DELIBERATELY BOARD-LOCAL, NOT A RENAME OF THE SHARED VOCABULARY.
 * `STATUSES` (scripts/queue-view.js) calls this band `To-do`, and the plan calls it
 * `BACKLOG`; QR3 required the board to match the plan. Overriding it HERE changes
 * the one surface the plan governs, and leaves the phone queue-view's filter chip
 * — a different surface, on a different page, with the owner's muscle memory
 * attached — alone. The GLYPH is still derived from `STATUSES`, never retyped; only
 * the display word is local, and `BACKLOG_KEY` is matched against the vocabulary's
 * own key so this cannot silently stop matching if the glyph ever changes.
 */
const BACKLOG_KEY = 'todo';
const BACKLOG_LABEL = 'Backlog';

/**
 * The emoji variation selector (U+FE0F). Written as an ESCAPE, never as the
 * literal character: the literal is invisible in an editor, a diff cannot show
 * it, and a well-meant trailing-whitespace cleanup deletes it without trace.
 * The live QUEUE.md writes ⏭️ and ⏸️ with it in 100% of headings (measured
 * 2026-08-13: 21/21 and 14/14), which is why the vocabulary spells them that way.
 */
const VS16 = '\uFE0F';

// ── helpers ──────────────────────────────────────────────────────────────────

function sha256(s) {
  return crypto.createHash('sha256').update(s).digest('hex');
}

/**
 * The app repo's short HEAD, or 'unknown'. Never throws, never blinds the board —
 * provenance is a courtesy, not a correctness input.
 */
function gitHead() {
  try {
    return (
      execFileSync('git', ['rev-parse', '--short', 'HEAD'], {
        cwd: ROOT,
        encoding: 'utf8',
        stdio: ['ignore', 'pipe', 'ignore'],
      }).trim() || 'unknown'
    );
  } catch {
    return 'unknown';
  }
}

function escapeCell(s) {
  return String(s).replace(/\|/g, '\\|').replace(/\r?\n/g, ' ').trim();
}

/**
 * The provenance block, emitted by BOTH document shapes and parsed back by
 * `--check`. ONE emitter over one shape, deliberately: `--check` reads the source
 * fingerprint out of the artifact it is judging, so an emitter and a parser that
 * are free to drift apart would silently degrade the freshness check into a
 * permanent pass (extractSourceHash returning null forever). Same reasoning as
 * ITEM_ID_RE's single exported copy — a retyped literal is how the raw scan and
 * the parser diverged in the first place.
 *
 * ⚠ THE TWO LINES ARE NOT THE SAME KIND OF FACT, and `--check` treats them
 * differently on purpose. The sha256 IS the freshness evidence. The app-repo HEAD
 * is provenance ONLY — it changes on every unrelated commit to this repo, so a
 * check that compared it would red the very next push after any commit at all.
 * That is not hypothetical: it is exactly what 247.10 records happening to the
 * test-catalog generator, caught live mid-push. Suite 248.7h locks it here.
 */
function provenanceLines(provenance) {
  return [
    `**Source:** \`QUEUE.md\` · sha256 \`${provenance.hash}\``,
    `**App repo HEAD:** \`${provenance.head}\``,
  ];
}

/** The `--check` side of provenanceLines(). Anchored to a full 64-hex digest. */
const SOURCE_HASH_RE = /^\*\*Source:\*\* `QUEUE\.md` · sha256 `([0-9a-f]{64})`$/m;

/**
 * The source fingerprint an on-disk board records, or null when it carries none
 * that can be read. Null is NOT "probably fine" — see the `--check` CLI, which
 * treats an unverifiable board as a failure rather than a pass.
 */
function extractSourceHash(text) {
  const m = SOURCE_HASH_RE.exec(String(text).replace(/\r\n/g, '\n'));
  return m ? m[1] : null;
}

/**
 * The band for one raw `###` heading, from a RAW SCAN of the source line.
 *
 * ⚠ WHY RAW, AND NOT `parseHeading().title`: parseHeading STRIPS the leading
 * glyph from `title` to make it read cleanly. Deriving a status from that string
 * would be reading the evidence after it has been erased — it would find only a
 * SECOND glyph, or nothing. The status must come from the untouched heading.
 *
 * The vocabulary is CLOSED and imported (STATUSES / EMPHASIS_GLYPHS / ITEM_ID_RE);
 * nothing here retypes a glyph or a pattern. Only the LEADING glyph run is
 * consulted — the run of glyphs and spaces before the title's first real word —
 * so a ✅ appearing later in prose can never flip an open item to done. Emphasis
 * markers (⭐) are stepped over because the vocabulary already declares them not
 * to be statuses. An unknown glyph does not get guessed at: it is reported, with
 * the glyph named, under UNCLASSIFIED.
 */
function bandOfHeading(content, QV) {
  const idM = content.match(QV.ITEM_ID_RE);
  if (!idM) return { id: null, band: null, glyph: null };
  const id = idM[1];
  const cp = [...content.slice(idM[0].length)];
  let i = 0;
  while (i < cp.length) {
    const c = cp[i];
    if (/\s/.test(c)) {
      i++;
      continue;
    }
    // A variation selector belongs to the glyph before it (see VS16 above).
    const glyph = cp[i + 1] === VS16 ? c + VS16 : c;
    const hit = QV.STATUSES.find(s => s.glyph === glyph);
    if (hit) return { id, band: hit.key, glyph };
    if (QV.EMPHASIS_GLYPHS.includes(c)) {
      i += glyph === c ? 1 : 2;
      continue;
    }
    // The leading glyph run is over. Either the title starts here (no status
    // glyph at all) or this is a glyph the vocabulary does not know.
    if (/[\p{L}\p{N}]/u.test(c)) return { id, band: null, glyph: null };
    return { id, band: null, glyph };
  }
  return { id, band: null, glyph: null };
}

/**
 * Closed-item discipline over ID-bearing item blocks: a closed item should
 * survive in QUEUE.md as a ONE-LINE pointer, with its full account living in
 * QUEUE_LOG.md.
 *
 * ⭐ EXPORTED so Suite 248.3's shadow ratchet measures with the SAME rule the
 * board reports. A retyped copy is exactly how two counts of the same thing start
 * disagreeing — the drift class this whole phase exists to close.
 *
 * ⚠ `proved` and `violations` are SEPARATE lists and are never summed into one
 * headline number. The proof-of-concept reported the closed-item COUNT as though
 * it were the count proved compliant, which read as "8 closed items, all tidy"
 * when the truth was "8 closed, none tidy". A number that flatters the thing it
 * measures is worse than no number.
 */
function closedDiscipline(idItems) {
  const closedItems = idItems.filter(b => b.status === 'done');
  const out = { total: closedItems.length, proved: [], violations: [] };
  for (const b of closedItems) {
    const bodyLines = b.body.filter(l => l.trim()).length;
    (bodyLines <= 1 ? out.proved : out.violations).push({ id: b.id, bodyLines });
  }
  return out;
}

// ── the two document shapes ──────────────────────────────────────────────────

function renderBlind(reasons, provenance) {
  const lines = [];
  lines.push(`# Roadmap — ⛔ BLIND`);
  lines.push('');
  lines.push(`<!-- ${STATE_MARKER}: BLIND -->`);
  lines.push(
    '<!-- GENERATED by scripts/roadmap-generate.js — DO NOT EDIT BY HAND. Regenerate: npm run roadmap -->'
  );
  lines.push('');
  lines.push(
    '**This board is BLIND. It is deliberately showing you nothing rather than something.**'
  );
  lines.push('');
  lines.push(
    'A partial board is not a smaller version of a correct board — it is an incorrect board that ' +
      'looks correct. There is no visual difference between "these are the items" and "these are ' +
      'the items I could parse", so a degraded board is refused rather than offered. The previous ' +
      'good answer is not shown either: a stale board that reads as current is the same failure ' +
      'wearing a better disguise.'
  );
  lines.push('');
  lines.push('## Why');
  lines.push('');
  lines.push('| Reason | What it means |');
  lines.push('| ------ | ------------- |');
  for (const r of reasons) {
    lines.push(`| \`${escapeCell(r.key)}\` | ${escapeCell(r.detail || BLIND_REASONS[r.key])} |`);
  }
  lines.push('');
  lines.push('## What you no longer know');
  lines.push('');
  lines.push(
    'While this board is blind you cannot read anything from it: not which work is ready to start, ' +
      'not what is active, blocked, deferred or parked, not how much is outstanding, and not ' +
      'whether any particular item still exists. Nothing here is a smaller truth — it is an absence ' +
      'of one. Treat `QUEUE.md` itself as the only source until the reason above is fixed and this ' +
      'board regenerates clean.'
  );
  lines.push('');
  lines.push('---');
  lines.push('');
  lines.push(...provenanceLines(provenance));
  lines.push('');
  return lines.join('\n');
}

function renderBoard(data, provenance) {
  const { title, banded, unclassified, idLess, closed } = data;
  const total = data.idBearing;
  const lines = [];

  lines.push(`# ${title} — roadmap board`);
  lines.push('');
  lines.push(`<!-- ${STATE_MARKER}: OK -->`);
  lines.push(
    '<!-- GENERATED by scripts/roadmap-generate.js — DO NOT EDIT BY HAND. Regenerate: npm run roadmap -->'
  );
  lines.push('');
  lines.push(...provenanceLines(provenance));
  lines.push('');
  lines.push(
    `**${total}** ID-bearing items · **${unclassified.length}** unclassified ` +
      `(${((unclassified.length / total) * 100).toFixed(1)}%) · ` +
      `**${idLess}** ID-less \`###\` sub-headings (prose, not board items — counted here so they ` +
      `are accounted for rather than silently absent)`
  );
  lines.push('');

  // Bands in vocabulary order; items in DOCUMENT order within each band — never
  // re-sorted. The queue's own order is authored information (it is the order the
  // owner reasons about the work in), and a generator that re-sorts it is
  // inventing a priority the source never stated.
  for (const s of data.statuses) {
    const rows = banded.get(s.key) || [];
    if (s.key === BACKLOG_KEY) {
      lines.push(`## ${s.glyph} ${BACKLOG_LABEL} — ${rows.length} items`);
      lines.push('');
      lines.push(
        `> **A COUNT, deliberately not a list.** This board is a projection of the ORDER of the ` +
          `work, not a dump of it. Read \`QUEUE.md\` for the ${rows.length} items themselves.`
      );
      lines.push('');
      continue;
    }
    lines.push(`## ${s.glyph} ${s.label} (${rows.length})`);
    lines.push('');
    if (!rows.length) {
      lines.push('_None._');
      lines.push('');
      continue;
    }
    for (const r of rows) lines.push(`- **${escapeCell(r.id)}** — ${escapeCell(r.title)}`);
    lines.push('');
  }

  // UNCLASSIFIED is a first-class band, listed IN FULL — never truncated, never
  // guessed at. An item nobody can classify is exactly the item most worth seeing.
  lines.push(`## ❔ UNCLASSIFIED (${unclassified.length})`);
  lines.push('');
  lines.push(
    '> These carry no recognised leading status glyph. Listed in full — never truncated, never ' +
      'guessed. An unknown glyph is named as found rather than mapped to the nearest status.'
  );
  lines.push('');
  if (!unclassified.length) {
    lines.push('_None._');
  } else {
    for (const r of unclassified) {
      const why = r.glyph ? `unknown glyph \`${escapeCell(r.glyph)}\`` : 'no leading glyph';
      lines.push(`- **${escapeCell(r.id)}** — _(${why})_ — ${escapeCell(r.title)}`);
    }
  }
  lines.push('');

  // ── Closed-item discipline ────────────────────────────────────────────────
  // ⚠ PROVED and VIOLATIONS are reported SEPARATELY and never added together.
  // The proof-of-concept reported the closed-item COUNT as though it were the
  // count PROVED compliant — which read as "8 closed items, all tidy" when the
  // true reading is "8 closed items, none of them tidy". A number that flatters
  // the thing it measures is worse than no number.
  lines.push('## Closed-item discipline');
  lines.push('');
  lines.push(
    'A closed item should survive here as a one-line pointer, with its full account living in ' +
      '`QUEUE_LOG.md`. Three separate numbers, never summed:'
  );
  lines.push('');
  lines.push(`- **Closed items:** ${closed.total}`);
  lines.push(`- **PROVED reduced to a one-liner:** ${closed.proved.length}`);
  lines.push(`- **VIOLATIONS still carrying a full account here:** ${closed.violations.length}`);
  lines.push('');
  if (closed.violations.length) {
    lines.push('Violations, in document order:');
    lines.push('');
    lines.push('| Item | Body lines |');
    lines.push('| ---- | ---------- |');
    for (const v of closed.violations) {
      lines.push(`| \`${escapeCell(v.id)}\` | ${v.bodyLines} |`);
    }
    lines.push('');
  }
  return lines.join('\n');
}

// ── the build ────────────────────────────────────────────────────────────────

/**
 * Build the roadmap document from a planning tree. Returns
 * `{ blind: boolean, text: string, reasons: [] }`. Pure apart from reading
 * QUEUE.md and git HEAD; the caller owns the write.
 */
function build(planning) {
  const provenance = { hash: 'unknown', head: gitHead() };
  const blind = (key, detail) => ({
    blind: true,
    reasons: [{ key, detail }],
    text: renderBlind([{ key, detail }], provenance),
  });

  const src = planning.readPlanningFile('QUEUE.md');
  if (src === null) return blind('source-unreadable');
  provenance.hash = sha256(src);

  let QV;
  try {
    QV = require(path.join(ROOT, 'scripts', 'queue-view.js'));
  } catch (e) {
    return blind('parser-unreachable', `${BLIND_REASONS['parser-unreachable']} (${e.message})`);
  }
  // ⛔ No fallback parser, ever — an absent export blinds the board rather than
  // silently downgrading to a lesser reading of the same document.
  const required = ['parseQueue', 'parseHeading', 'STATUSES', 'EMPHASIS_GLYPHS', 'ITEM_ID_RE'];
  const missing = required.filter(k => QV[k] === undefined);
  if (missing.length) {
    return blind(
      'parser-unreachable',
      `${BLIND_REASONS['parser-unreachable']} Missing export(s): ${missing.join(', ')}.`
    );
  }

  const model = QV.parseQueue(src);
  // ⚠ `model.title` is NOT a usable signal on its own. parseQueue DEFAULTS the
  // title to 'Build Queue' when the document has no H1, so it is never falsy and
  // a check written against it can never fire. Found by the blind drills
  // (Protocol 42): `no-title` was an enumerated reason NOBODY COULD TRIGGER —
  // dead enumeration, and precisely the dishonesty a closed reason list exists to
  // prevent. A reason that cannot fire is worse than an absent one, because the
  // list reads as complete. The honest structural test is whether the SOURCE
  // actually carries an H1. (`^#\s` cannot match `###` — the space is required
  // immediately after the first hash.)
  const hasH1 = /^#\s+\S/m.test(String(src).replace(/\r\n/g, '\n'));
  if (!hasH1 || !model || !String(model.title || '').trim()) return blind('no-title');

  const items = model.blocks.filter(b => b.type === 'item');
  const idItems = items.filter(b => b.id);

  // The 248.4 invariant, re-checked at generate time: the parser's ID-bearing
  // count must equal a raw scan of the source over the SAME exported pattern.
  const rawHeadings = [];
  for (const line of String(src).replace(/\r\n/g, '\n').split('\n')) {
    const h = /^#{3}\s+(.*)$/.exec(line);
    if (h) rawHeadings.push(h[1].trim());
  }
  const rawIdCount = rawHeadings.filter(h => QV.ITEM_ID_RE.test(h)).length;
  if (rawIdCount !== idItems.length) {
    return blind(
      'extraction-regression',
      `${BLIND_REASONS['extraction-regression']} Parser saw ${idItems.length}, raw scan saw ${rawIdCount}.`
    );
  }
  if (idItems.length < TOO_FEW_ITEMS) {
    return blind('too-few-items', `${BLIND_REASONS['too-few-items']} Found ${idItems.length}.`);
  }

  const seen = new Set();
  const dupes = [];
  for (const b of idItems) {
    if (seen.has(b.id)) dupes.push(b.id);
    seen.add(b.id);
  }
  if (dupes.length) {
    return blind(
      'duplicate-ids',
      `${BLIND_REASONS['duplicate-ids']} Duplicated: ${[...new Set(dupes)].join(', ')}.`
    );
  }

  // Band from the RAW headings (never from the glyph-stripped title), matched
  // back to the parsed items by document order.
  const banded = new Map(QV.STATUSES.map(s => [s.key, []]));
  const unclassified = [];
  const byId = new Map(idItems.map(b => [b.id, b]));
  for (const content of rawHeadings) {
    const r = bandOfHeading(content, QV);
    if (!r.id) continue;
    const item = byId.get(r.id);
    const title = item ? item.title : content;
    if (r.band && banded.has(r.band)) banded.get(r.band).push({ id: r.id, title });
    else unclassified.push({ id: r.id, title, glyph: r.glyph });
  }

  if (unclassified.length / idItems.length > UNCLASSIFIABLE_LIMIT) {
    return blind(
      'unclassifiable-board',
      `${BLIND_REASONS['unclassifiable-board']} ${unclassified.length} of ${idItems.length} ` +
        `(${((unclassified.length / idItems.length) * 100).toFixed(1)}%) are unclassified.`
    );
  }

  // Closed-item discipline — counted, not conflated (see renderBoard).
  const closed = closedDiscipline(idItems);

  return {
    blind: false,
    reasons: [],
    text: renderBoard(
      {
        title: String(model.title).trim(),
        statuses: QV.STATUSES,
        banded,
        unclassified,
        idLess: rawHeadings.length - idItems.length,
        idBearing: idItems.length,
        closed,
      },
      provenance
    ),
  };
}

/** Normalize to LF. `.gitattributes` pins eol=lf while the machine runs autocrlf=true. */
function toLf(text) {
  return String(text).replace(/\r\n/g, '\n');
}

module.exports = {
  build,
  bandOfHeading,
  closedDiscipline,
  extractSourceHash,
  sourceHash: sha256,
  BACKLOG_KEY,
  BACKLOG_LABEL,
  BLIND_REASONS,
  SOURCE_HASH_RE,
  STATE_MARKER,
  OUTPUT_NAME,
  toLf,
};

// ── CLI ──────────────────────────────────────────────────────────────────────
if (require.main === module) {
  const planning = require('./planning-paths.js');
  const isCheck = process.argv.includes('--check');
  const outPath = planning.planningWritePath(OUTPUT_NAME);

  // Case 3: no planning tree. Not blindness — there was never a board.
  if (!outPath) {
    console.log(`[roadmap] SKIPPED — ${planning.describe()}.`);
    console.log('[roadmap] A public clone has no archive by design; nothing was written.');
    process.exit(0);
  }

  if (isCheck) {
    // ── ⭐ THE ONE ASSERTION IN THIS FILE, and the only place it exits non-zero.
    //
    // The generator always exits 0 BY DESIGN, so this step is the sole moment its
    // refusal to publish a guess ever becomes visible to anyone. That makes a
    // false GREEN here uniquely expensive: it does not merely miss one problem,
    // it silences the whole fail-closed design. Four failures, ordered
    // strongest-signal-first:
    //
    //   1. MISSING   — the tree is here and the board is not. ⛔ This used to
    //      print "nothing to verify" and exit 0, i.e. a GREEN-THAT-SKIPPED living
    //      inside the guard whose entire job is to catch greens that skipped.
    //      Deleting the artifact was a way to make its own check pass. Note this
    //      is unreachable without a planning tree: the `!outPath` skip above has
    //      already returned for that case, which is why fixing this does not
    //      touch the F04 public-clone path (Suite 248.7e locks that separately).
    //   2. BLIND     — checked BEFORE freshness on purpose. A blind board built
    //      from the CURRENT queue has a perfectly matching fingerprint, so the
    //      other order would report it as healthy and fresh.
    //   3. UNVERIFIABLE — no readable source fingerprint (hand-edited, or written
    //      by an older generator). Unverifiable is not a pass; treating a missing
    //      fingerprint as "probably fine" would quietly convert this whole check
    //      into a permanent green the moment the provenance shape ever changed.
    //   4. STALE     — the board's recorded source sha256 no longer matches the
    //      live QUEUE.md. Nothing compared these before, so a board generated
    //      from a queue weeks out of date read exactly like a fresh one — the
    //      "stale that reads as current" failure the BLIND renderer already
    //      refuses to commit inside the document, arriving by the back door.
    //
    // ⚠ WHAT THIS STILL DOES NOT CATCH, stated rather than implied: it proves the
    // board matches the SOURCE, not that it matches the GENERATOR. A board built
    // by an older version of this script from an unchanged QUEUE.md passes. The
    // full regenerate-and-byte-compare that Protocols 47/52/53 use is not
    // available here, because this artifact stamps the app repo's git HEAD and
    // that changes on every unrelated commit (the 247.10 trap). Regenerating in
    // the same commit as any rendering change is the discipline that covers it.
    if (!fs.existsSync(outPath)) {
      console.error(`[roadmap:check] FAIL — no ${OUTPUT_NAME} on disk at ${outPath}.`);
      console.error(`[roadmap:check]   ${planning.describe()}`);
      console.error(
        '[roadmap:check] The planning tree IS present, so the board is not absent by design — it'
      );
      console.error('[roadmap:check] was never generated, or was deleted. Run `npm run roadmap`.');
      process.exit(1);
    }
    const onDisk = fs.readFileSync(outPath, 'utf8');
    if (new RegExp(`${STATE_MARKER}:\\s*BLIND`).test(onDisk)) {
      console.error(`[roadmap:check] FAIL — the ${OUTPUT_NAME} on disk is BLIND.`);
      const why = onDisk.match(/^\| `([a-z-]+)` \|/gm);
      if (why) console.error(`[roadmap:check]   reason(s): ${why.join(' ')}`);
      console.error('[roadmap:check] Fix the cause in QUEUE.md (or the parser), then regenerate.');
      process.exit(1);
    }
    const src = planning.readPlanningFile('QUEUE.md');
    if (src === null) {
      console.error(
        `[roadmap:check] FAIL — ${OUTPUT_NAME} is on disk but QUEUE.md could not be read.`
      );
      console.error(`[roadmap:check]   ${planning.describe()}`);
      console.error('[roadmap:check] A board whose source is unreadable cannot be proved fresh.');
      process.exit(1);
    }
    const recorded = extractSourceHash(onDisk);
    if (!recorded) {
      console.error(
        `[roadmap:check] FAIL — the ${OUTPUT_NAME} on disk carries no readable source fingerprint.`
      );
      console.error('[roadmap:check] Expected a line of the form:');
      console.error('[roadmap:check]   **Source:** `QUEUE.md` · sha256 `<64 hex>`');
      console.error(
        '[roadmap:check] It was hand-edited, or written by an older generator. Regenerate it.'
      );
      process.exit(1);
    }
    const current = sha256(src);
    if (recorded !== current) {
      console.error(`[roadmap:check] FAIL — the ${OUTPUT_NAME} on disk is STALE.`);
      console.error(`[roadmap:check]   board was generated from sha256 ${recorded}`);
      console.error(`[roadmap:check]   QUEUE.md now reads               sha256 ${current}`);
      console.error('[roadmap:check] QUEUE.md has moved on since the board was built. A stale');
      console.error('[roadmap:check] board is not a smaller truth than a current one — it reads');
      console.error('[roadmap:check] exactly like one. Run `npm run roadmap`.');
      process.exit(1);
    }
    console.log(
      `[roadmap:check] OK — ${OUTPUT_NAME} is a real board, not a blind one, and its source`
    );
    console.log(`[roadmap:check]      fingerprint matches the live QUEUE.md (sha256 ${current}).`);
    process.exit(0);
  }

  let result;
  try {
    result = build(planning);
  } catch (e) {
    // Even an unexpected throw publishes a BLIND board rather than nothing and
    // rather than a guess — and still exits 0.
    result = {
      blind: true,
      text: renderBlind(
        [{ key: 'internal-error', detail: `${BLIND_REASONS['internal-error']} ${e.message}` }],
        {
          hash: 'unknown',
          head: gitHead(),
        }
      ),
    };
  }

  const text = toLf(result.text.endsWith('\n') ? result.text : result.text + '\n');
  // WF12 — atomic, never truncating. A crash between truncate and completion would
  // otherwise leave a zero-byte or half-written board, and a half-written board reads
  // exactly like a real one, which is the failure this whole generator exists to end.
  writeFileAtomic(outPath, text, { encoding: 'utf8' });
  console.log(
    `[roadmap] Wrote ${outPath} — ${result.blind ? '⛔ BLIND' : 'board OK'} (${text.length} bytes, LF).`
  );
  // Always 0. This is a reporter; it can never fail a sync, a commit or a push.
  process.exit(0);
}
