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

// ── Plain-English row summaries (DERIVED from the source, never authored here) ─
//
// A board that lists rows as an ID plus its own heading is unreadable to anyone
// who has not memorised the IDs — which, months later and at a glance, includes
// the person who owns the work. Headings here are written as emphasis-laden
// shorthand for a reader who already has the context. So every listed row now
// carries one extra line in ordinary prose: what the item is, and what finishing
// it actually looks like.
//
// ⛔ THERE IS NO LOOKUP TABLE HERE AND THERE MUST NEVER BE ONE. An id→description
// map maintained in this file would be a SECOND COPY of prose whose original
// lives in the source document, and a second copy drifts — this repo has shipped
// hand-copied constants that silently fell out of step with the thing they
// duplicated more than once, including one that stood wrong for eleven days. The
// summary is therefore EXTRACTED from the item body, or the row is MARKED as not
// describing itself.
//
// ⛔ THERE IS DELIBERATELY NO THIRD BRANCH. A generator that composes a
// plausible-sounding description for an item that does not contain one is
// fabricating, and a confident wrong summary is strictly worse than an honest
// gap: the gap is visible and becomes a worklist, while the fabrication is
// indistinguishable from a real one and gets believed.
//
// The three fields below are the shapes the source actually uses, in preference
// order — a completion condition, the answer-shaped field that decision items
// carry instead, and an explicit self-description where the author wrote one.
// First hit wins; a field that is present but yields nothing readable falls
// through to the next rather than emitting a stub.
//
// ⚠ THE LABEL MUST START ITS OWN LINE (after any leading quote/emphasis/glyph
// run). An unanchored search matches the same words used mid-sentence — measured
// on the live corpus, an ordinary prose aside that merely ENDED in one of these
// field names, with a choice list directly beneath it, was picked up as though it
// were the field, and the row then carried a summary the item never actually
// stated. That is the fabrication mode above, arrived at by accident, so the
// anchor is load-bearing rather than tidy.
const SUMMARY_FIELDS = [
  {
    key: 'done',
    label: 'Done when',
    re: /^[ \t>*_\p{Extended_Pictographic}️‍]*Done means\b[ \t]*(\([^)\n]*\))?[ \t]*[:.]?[ \t]*(?:\*\*)?/imu,
  },
  {
    key: 'recommendation',
    label: 'Recommended',
    re: /^[ \t>*_\p{Extended_Pictographic}️‍]*Recommendation\b[ \t]*(\([^)\n]*\))?[ \t]*[:.]?[ \t]*(?:\*\*)?/imu,
  },
  {
    key: 'whatis',
    label: 'What it is',
    re: /^[ \t>*_\p{Extended_Pictographic}️‍]*What it is\b[ \t]*(\([^)\n]*\))?[ \t]*[:.]?[ \t]*(?:\*\*)?/imu,
  },
];

// A derived summary must clear these to be printed at all. Both are deliberately
// crude floors against RESIDUE — a field that cleaned down to a bare cross-
// reference, a lone glyph run, or two words of connective tissue — not an attempt
// to judge whether prose reads well. Nothing mechanical can measure that, and
// pretending otherwise is how a check starts reporting a quality it never tested.
const SUMMARY_MIN_CHARS = 40;
const SUMMARY_MIN_LETTERS = 25;
// Long enough to carry a real clause, short enough to read without scrolling on a
// phone, which is the surface this board is read on.
const SUMMARY_MAX_CHARS = 180;

/** Printed in place of a summary when the item does not describe itself. */
const SUMMARY_MISSING =
  '⛔ _No plain-English summary in the source — this item does not describe itself yet._';

/**
 * Markdown/emphasis → flat prose.
 *
 * ⚠ Decorative glyphs are stripped by UNICODE PROPERTY, not by a listed set. The
 * parser's exported vocabularies cover status glyphs and one emphasis marker; the
 * source uses several more decoratively, and a hand-listed strip set here would
 * be exactly the drifting second copy this whole surface is written to avoid — a
 * newly-adopted glyph would start leaking into the board with nothing to notice.
 * A property test needs no maintenance when the source grows a new one.
 */
function toPlainProse(md) {
  const s = String(md)
    // ⛔ STRUCK-THROUGH TEXT IS REMOVED HERE, AS THE FLOOR OF THE DEFENCE. The
    // source strikes a clause when that clause has been DISCHARGED, so struck
    // words are the one kind of text that must never reach a summary: a row
    // rendering crossed-out prose where the remaining work belongs reads as
    // "nothing is left on this item", which is the opposite of true. Stripping it
    // in the shared cleaner means no future harvesting path can reintroduce the
    // leak by forgetting; the clause-level rule in deriveSummary is the sharper
    // instrument layered on top, not the only thing standing between the two.
    .replace(/~~[\s\S]*?~~/g, ' ') // struck spans → gone, not unwrapped
    .replace(/~~/g, '') // an unpaired marker never survives as punctuation
    .replace(/^[ \t]*>[ \t]?/gm, '') // blockquote markers
    .replace(/`+/g, '') // code spans → their content
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1') // links → their text
    .replace(/[*_]{1,3}/g, '') // bold/italic markers
    .replace(/[\p{Extended_Pictographic}️‍]/gu, ' ');
  return (
    s
      .replace(/\s+/g, ' ')
      // Glyph removal leaves gaps against brackets ("( rescued …"); close them up.
      .replace(/\(\s+/g, '(')
      .replace(/\s+\)/g, ')')
      .trim()
      .replace(/^[\s—·:;,.-]+/, '')
  );
}

/** Trim to one glance-sized clause, cutting at a clause boundary where there is one. */
function firstClause(s, max) {
  if (s.length <= max) return s;
  const cut = s.slice(0, max);
  const stop = Math.max(
    cut.lastIndexOf('; '),
    cut.lastIndexOf('. '),
    cut.lastIndexOf(' — '),
    cut.lastIndexOf(' · ')
  );
  return (stop > max * 0.5 ? cut.slice(0, stop) : cut.replace(/\s+\S*$/, '')) + '…';
}

/**
 * Derive one plain-English line from an item body, or null when the body carries
 * no field this can honestly read. `null` is a RESULT, not a failure — it is what
 * puts the row on the authoring worklist instead of inventing prose for it.
 */
/** Field label, carrying the source's own scope qualifier when it stated one. */
function label(field, pick) {
  return pick.scope ? `${field.label} ${pick.scope}` : field.label;
}

function deriveSummary(body) {
  const lines = Array.isArray(body) ? body : String(body || '').split('\n');
  /** Cleaned text, or null when it does not clear the residue floors. */
  const usable = raw => {
    const plain = toPlainProse(raw);
    const letters = (plain.match(/[a-z]/gi) || []).length;
    if (plain.length < SUMMARY_MIN_CHARS || letters < SUMMARY_MIN_LETTERS) return null;
    return plain;
  };
  for (const f of SUMMARY_FIELDS) {
    // Every line this label opens, with the indent that says whether it is the
    // ITEM's own field or one belonging to a nested sub-item beneath it.
    const hits = [];
    lines.forEach((line, i) => {
      const m = f.re.exec(line);
      if (m) {
        hits.push({
          i,
          indent: (line.match(/^[ \t]*/) || [''])[0].length,
          after: line.slice(m[0].length),
          // ⭐ The label's own parenthetical SCOPE, where it carries one. Surfaced
          // rather than swallowed: an item may state several completion conditions,
          // each scoped to a different part of itself, and a row showing one of them
          // unlabelled reads as though it were the whole item's condition. Printing
          // the author's own qualifier is the difference between a partial answer
          // and a wrong one — and it is the item's text, never the generator's.
          scope: m[1] ? toPlainProse(m[1]) : '',
        });
      }
    });
    if (!hits.length) continue;
    // ⭐ TOP-LEVEL WINS OVER DOCUMENT ORDER. A long item can carry a sub-item that
    // states its OWN completion condition, and first-match-wins then describes the
    // whole item by a nested detail — measured live, one item was summarised by a
    // sub-item's clause while its own sat further down the same body.
    //
    // ⚠ INDENTATION WAS VERIFIED AS THE DISCRIMINATOR BEFORE BEING TRUSTED, not
    // assumed: across the live corpus these labels land at column 0 in all but a
    // handful of cases, the distribution is bimodal rather than graded, and NO item
    // has only indented labels — so preferring column 0 can never strand an item
    // that would otherwise have had a summary. `|| hits[0]` keeps that promise
    // structural rather than statistical: if such an item ever appears, it falls
    // back to the nested clause instead of silently losing its row.
    //
    // ⚠ AMONG TOP-LEVEL CLAUSES, DOCUMENT ORDER WINS — EXCEPT WHERE THE AUTHOR
    // SAID OTHERWISE, and "otherwise" is read from their word, never inferred.
    // An item may carry a later clause that AMENDS an earlier one, and the two
    // relationships look identical structurally while meaning opposite things: a
    // clause marked as SUPERSEDING replaces the earlier text (showing the earlier
    // one then asserts an approach the item has retracted — the same harm as
    // printing struck-through work), while one marked as ADDED extends it and
    // reads as a non-sequitur if shown alone. Measured across the live corpus,
    // both shapes are in use, so "prefer the last" and "prefer the first" are each
    // wrong on real rows: last-wins repairs the superseded case and breaks the
    // additive ones. Only an explicit supersession marker is honoured, and only
    // from the author's own qualifier.
    const topLevel = hits.filter(h => h.indent === 0);
    const superseding = topLevel.filter(h => /supersed/i.test(h.scope));
    const pick = superseding.length ? superseding[superseding.length - 1] : topLevel[0] || hits[0];
    // The field runs to the end of its own paragraph.
    const para = [pick.after];
    for (let k = pick.i + 1; k < lines.length && lines[k].trim(); k++) para.push(lines[k]);
    const raw = para.join('\n');

    if (!raw.includes('~~')) {
      const plain = usable(raw);
      if (!plain) continue;
      return { key: f.key, label: label(f, pick), text: firstClause(plain, SUMMARY_MAX_CHARS) };
    }

    // ── Discharged work is removed at CLAUSE granularity ────────────────────
    // A strike marks a clause as discharged, and the annotation trailing it
    // ("— done at <ref>") belongs to that clause, so removing only the struck
    // SPAN leaves orphaned credit for finished work sitting where the remaining
    // work should be — still misleading, just no longer visibly crossed out.
    // Dropping the whole clause surfaces what is actually still owed.
    const kept = raw
      .split('·')
      .filter(seg => !seg.includes('~~'))
      .join(' · ');
    // ⚠ THE FALLBACK IS NOT COSMETIC. Some items strike each clause and then
    // summarise the state in prose INSIDE the last struck clause ("those three are
    // done; still owed are these"). Clause-dropping deletes that summary too, so
    // when nothing survives it, span-removal is tried before giving up — it keeps
    // the sentence that says work remains.
    const plain = usable(kept) || usable(raw);
    // ⛔ A DELIBERATE STOP, NOT A FALLTHROUGH. If the field is struck through with
    // nothing readable left, the row is MARKED and the remaining field kinds are
    // NOT tried. The item did state this field and it has been discharged; reaching
    // past it to a different field would describe the item by something it never
    // offered as its summary, which is the fabrication mode this whole surface is
    // built to refuse. An admitted gap is the honest output.
    if (!plain) return null;
    return { key: f.key, label: label(f, pick), text: firstClause(plain, SUMMARY_MAX_CHARS) };
  }
  return null;
}

/** The sub-line printed under a row — a real summary, or the honest gap marker. */
function summaryLine(summary) {
  if (!summary) return `  - ${SUMMARY_MISSING}`;
  return `  - _${summary.label}:_ ${escapeCell(summary.text)}`;
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
 * The OTHER provenance line, matched so it can be held out of a byte-compare.
 *
 * ⛔ It lives here, next to the emitter and next to its sibling, for the reason
 * given above: an emitter and a matcher free to drift apart degrade the check
 * that uses them into a permanent pass, silently.
 */
const HEAD_STAMP_RE = /^\*\*App repo HEAD:\*\* `[^`]*`$/m;

/**
 * ⭐⭐ THE BOARD, REDUCED TO THE PART A REGENERATE MUST REPRODUCE EXACTLY.
 *
 * ── ⛔⛔ WHY A BYTE-COMPARE IS AVAILABLE AFTER ALL ──────────────────────────
 * `--check` proved the board matched its SOURCE and stated, honestly, that it
 * could not prove the board matched the GENERATOR — because this artifact stamps
 * the app repo's git HEAD, and that changes on every unrelated commit, so a naive
 * regenerate-and-compare would red the very next push after any commit at all
 * (the 247.10 trap, locked by Suite 248.7h).
 *
 * ⭐ That reasoning is sound about the STAMP and does not generalise to the
 * DOCUMENT. The stamp is one line, matched by one anchored pattern already
 * written down beside its emitter — hold it out and everything remaining is
 * deterministic by this generator's own stated contract ("Same QUEUE.md →
 * byte-identical ROADMAP.md. No timestamps."). ⚠ So the false positive the
 * ceiling was protecting against is removed by construction rather than by
 * accepting the blind spot: 248.7h still passes, because a changed HEAD stamp is
 * now normalised away instead of merely being ignored by a weaker comparison.
 *
 * ── ⛔ THE GAP THIS CLOSES IS THE ONE THE FINGERPRINT CANNOT SEE ────────────
 * A fingerprint answers "was this built from the current QUEUE.md?". It cannot
 * answer "is this what the generator produces?" — so a board rendered by an older
 * version of this script, or one hand-edited anywhere below the provenance block,
 * passed. ⚠ Those are the two ways a board can be WRONG while its source has not
 * moved at all, and a stale-but-verified board reads exactly like a current one,
 * which is the failure this whole generator exists to end.
 *
 * ⛔ NORMALISES ONLY WHAT LEGITIMATELY VARIES. Line endings and the trailing
 * newline are write-shape, not content; the HEAD stamp is provenance. Nothing
 * else is touched, because every further exemption is a place a real difference
 * could hide.
 */
const HEAD_STAMP_HELD = '**App repo HEAD:** `<held out of comparison>`';
function normalizeForCompare(text) {
  return toLf(String(text)).replace(HEAD_STAMP_RE, HEAD_STAMP_HELD).replace(/\n+$/, '\n');
}

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
 * ⭐⭐ IS THIS BOARD CURRENT WITH THIS QUEUE? — the one question the surfaces
 * that DISPLAY the board never asked.
 *
 * ── ⛔⛔ THE DEFECT, MEASURED (2026-09-01) ─────────────────────────────────
 * The board went 59 items stale — 307 rendered against 366 live — and every page
 * that showed it went on showing it with no warning of any kind. The reports page
 * printed "Rebuilt <time> — read fresh from the file every time this page loads,
 * never cached", and the landing tile printed "Updated 44 minutes ago".
 *
 * ⚠ BOTH SENTENCES ARE TRUE AND NEITHER ANSWERS THE QUESTION. They report when
 * the FILE was written and how fresh the READ was; a reader hears "this is the
 * current picture". Those are different claims, and the gap between them is where
 * 59 missing items sat for days in front of somebody who was looking at the page.
 * It is the same disease as a snapshot age presented without a staleness tier —
 * the age of an artifact is not its currency.
 *
 * ⭐ ONE RULE, ONE HOME, and it is deliberately the WEAKER of the two available.
 * `--check` also proves the board is byte-for-byte what the generator produces;
 * that needs a full rebuild, which is ~100 ms and belongs in a gate, not on every
 * page load. So a viewer asks the fingerprint question only — and the page must
 * SAY that is the question it asked. ⛔ Claiming the stronger answer from the
 * cheaper measurement is exactly the substitution these pages exist to refuse.
 *
 * ⛔ `known: false` IS A REAL OUTCOME, NOT A FAILURE — an unreadable queue or a
 * board with no fingerprint. Callers must render it as "cannot tell", never as a
 * reassuring "current".
 *
 * @returns {{known:boolean, current:boolean, recorded:string|null, live:string|null}}
 */
function boardCurrency(boardText, queueText) {
  const recorded = typeof boardText === 'string' ? extractSourceHash(boardText) : null;
  const live = typeof queueText === 'string' && queueText ? sha256(queueText) : null;
  if (!recorded || !live) return { known: false, current: false, recorded, live };
  return { known: true, current: recorded === live, recorded, live };
}

/** The ID-bearing total a board states about itself, or null. */
const BOARD_TOTAL_RE = /^\*\*(\d+)\*\* ID-bearing items\b/m;
function boardItemTotal(text) {
  const m = BOARD_TOTAL_RE.exec(toLf(String(text || '')));
  return m ? Number(m[1]) : null;
}

/** The IDs a board actually LISTS. ⚠ Partial by design — see driftClosed(). */
function listedIds(text) {
  const out = new Set();
  for (const m of toLf(String(text || '')).matchAll(/^- \*\*([A-Za-z][A-Za-z0-9-]*)\*\* —/gm)) {
    out.add(m[1]);
  }
  return out;
}

/**
 * ⭐⭐⭐ WHAT A REGENERATE JUST ERASED — reported BY THE REGENERATE ITSELF.
 *
 * ── ⛔⛤ THE TAUTOLOGY, AND WHY NO CHECK CAN BREAK IT ────────────────────────
 * The ritual ran `npm run roadmap && npm run roadmap:check`: rewrite the subject,
 * then measure it. ⛔ That pair cannot fail on staleness BY CONSTRUCTION, and it
 * is worth being exact about why, because the obvious response is wrong.
 *
 * ⚠ IT IS NOT A WEAKNESS IN THE CHECK, AND STRENGTHENING THE CHECK CANNOT CURE
 * IT. After a successful regenerate the board genuinely IS current — every
 * honest predicate of the form "does this artifact agree with the current
 * source?" must answer YES, including the byte-compare `--check` gained. A
 * predicate that answered NO there would be a false positive, not a stricter
 * gate. The tautology is a property of the ORDERING, not of the assertion.
 *
 * ⭐ SO THE HARM IS ATTACKED INSTEAD OF THE SYMPTOM. The damage was never that a
 * check passed — it is that the drift was DESTROYED BEFORE ANYBODY MEASURED IT,
 * silently, leaving no trace that 59 items had been missing for days. If the
 * regenerate reports what it replaced, the measurement survives the bad ordering
 * — which makes the ordering stop being load-bearing. ⛔ Reordering the ritual
 * (done 2026-09-01) fixes the pair only until somebody tidies it back into one
 * line; this cannot be tidied away, because the drift is reported by the very
 * command that closes it.
 *
 * ⚠ THE NAMING IS PARTIAL AND SAYS SO. The backlog band is a COUNT rather than a
 * list, so an item that landed there moves the totals and cannot be named. The
 * totals are complete; the names are not, and conflating those would be this
 * generator claiming a completeness it does not have.
 *
 * @returns {{known:boolean, drifted:boolean, before:number|null, after:number|null,
 *            added:string[], removed:string[], namingPartial:boolean}}
 */
function driftClosed(previousText, nextText) {
  const before = boardItemTotal(previousText);
  const after = boardItemTotal(nextText);
  if (before === null || after === null) {
    // ⛔ Unknown, never "nothing drifted" — an unreadable predecessor and an
    // unchanged one are different facts, and only one of them is reassuring.
    return {
      known: false,
      drifted: false,
      before,
      after,
      added: [],
      removed: [],
      namingPartial: true,
    };
  }
  const prevIds = listedIds(previousText);
  const nextIds = listedIds(nextText);
  const added = [...nextIds].filter(id => !prevIds.has(id)).sort();
  const removed = [...prevIds].filter(id => !nextIds.has(id)).sort();
  return {
    known: true,
    // ⚠ A pure re-ordering with identical totals and identical listed IDs is not
    // drift worth announcing; anything else is.
    drifted: before !== after || added.length > 0 || removed.length > 0,
    before,
    after,
    added,
    removed,
    namingPartial: true,
  };
} /**
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
    for (const r of rows) {
      lines.push(`- **${escapeCell(r.id)}** — ${escapeCell(r.title)}`);
      lines.push(summaryLine(r.summary));
    }
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
      lines.push(summaryLine(r.summary));
    }
  }
  lines.push('');

  // ── Plain-English coverage ────────────────────────────────────────────────
  // ⚠ REPORTED, NOT JUST APPLIED. The count of rows that could NOT be summarised
  // is the useful half of this feature: it is the difference between "the board
  // is readable" and "the board is as readable as its source allows, and here is
  // exactly where the source runs out". Summarised and marked are kept as two
  // separate numbers and never summed into a coverage percentage that flatters
  // the surface it measures — the same rule the closed-item block below follows.
  lines.push('## Plain-English coverage');
  lines.push('');
  lines.push(
    'Each listed row carries a summary derived from the item itself, or an explicit marker saying ' +
      'the item does not yet describe itself. ⛔ Nothing here is written by the generator: a row ' +
      'either quotes its own source or admits it cannot. **The marked list is the authoring ' +
      'worklist.**'
  );
  lines.push('');
  lines.push('| Band | Rows | With a summary | Marked |');
  lines.push('| ---- | ---: | ---: | ---: |');
  const markedByBand = [];
  for (const s of data.statuses) {
    const rows = banded.get(s.key) || [];
    if (!rows.length) continue;
    const withSummary = rows.filter(r => r.summary).length;
    const marked = rows.filter(r => !r.summary);
    const label = s.key === BACKLOG_KEY ? `${BACKLOG_LABEL} _(counted, not listed)_` : s.label;
    lines.push(`| ${label} | ${rows.length} | ${withSummary} | ${marked.length} |`);
    if (marked.length && s.key !== BACKLOG_KEY) markedByBand.push({ label: s.label, marked });
  }
  if (unclassified.length) {
    const uMarked = unclassified.filter(r => !r.summary);
    lines.push(
      `| UNCLASSIFIED | ${unclassified.length} | ${unclassified.length - uMarked.length} | ${uMarked.length} |`
    );
    if (uMarked.length) markedByBand.push({ label: 'UNCLASSIFIED', marked: uMarked });
  }
  lines.push('');
  if (markedByBand.length) {
    lines.push('Items needing a written summary, by band:');
    lines.push('');
    for (const b of markedByBand) {
      lines.push(`- **${b.label}:** ${b.marked.map(r => `\`${escapeCell(r.id)}\``).join(', ')}`);
    }
    lines.push('');
  }

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
    // Derived from the item's own body; null when it does not describe itself.
    const summary = item ? deriveSummary(item.body) : null;
    if (r.band && banded.has(r.band)) banded.get(r.band).push({ id: r.id, title, summary });
    else unclassified.push({ id: r.id, title, glyph: r.glyph, summary });
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
  boardCurrency,
  boardItemTotal,
  listedIds,
  driftClosed,
  normalizeForCompare,
  sourceHash: sha256,
  HEAD_STAMP_RE,
  BACKLOG_KEY,
  BACKLOG_LABEL,
  BLIND_REASONS,
  SOURCE_HASH_RE,
  STATE_MARKER,
  OUTPUT_NAME,
  toLf,
  // ⭐ Exported so the suite drives the REAL derivation rather than a restatement
  // of it — a test that retypes the rule only ever proves the retyped copy.
  deriveSummary,
  toPlainProse,
  SUMMARY_MISSING,
  SUMMARY_MAX_CHARS,
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
    //   5. NOT WHAT THE GENERATOR PRODUCES — the board on disk differs from what
    //      this script builds from this QUEUE.md, once the HEAD stamp is held out.
    //      ⛔⛔ THIS IS THE GAP THE FINGERPRINT CANNOT SEE, and it was documented
    //      here as permanent rather than closed. A fingerprint answers "built from
    //      the current source?"; it cannot answer "is this what the generator
    //      produces?" — so a board rendered by an OLDER version of this script, or
    //      hand-edited anywhere below the provenance block, passed every check
    //      above while being wrong. ⚠ Those are the two ways a board can be stale
    //      with its source standing perfectly still, which is the harder direction
    //      to notice: nothing moved, so nothing prompts anybody to look.
    //
    // ⭐ THE OLD CEILING SAID A BYTE-COMPARE WAS UNAVAILABLE. It was right about
    // the STAMP and wrong to generalise from it to the DOCUMENT: the app-repo HEAD
    // changes on every unrelated commit, so comparing it would red the next push
    // after anything (the 247.10 trap) — but it is ONE line, matched by ONE
    // anchored pattern that lives beside its emitter, and holding it out leaves a
    // document this generator's own contract declares deterministic. ⚠ 248.7h is
    // unchanged and still passes: a changed stamp is now NORMALISED rather than
    // merely un-compared, so the false positive is removed by construction instead
    // of being paid for with a blind spot.
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

    // ── 5. …AND IT IS WHAT THIS GENERATOR ACTUALLY PRODUCES ──────────────────
    //
    // ⛔ EVERY CHECK ABOVE IS SATISFIED BY A BOARD THAT IS WRONG, provided its
    // source has not moved. This is the one that asks the question the ritual's
    // step is named for — "is the roadmap current?" — rather than the narrower one
    // a fingerprint can answer.
    //
    // ⚠ A REBUILD THAT THROWS IS A FAILURE, NOT A SKIP. If the generator cannot
    // build from this source, a regenerate would publish a BLIND board, so the
    // non-blind one sitting on disk is definitely not what it would produce. ⛔ The
    // reflex here is to catch and pass "so the check never breaks a commit over its
    // own bug" — which is precisely how a check becomes a permanent green.
    let rebuilt = null;
    let rebuildError = null;
    try {
      rebuilt = build(planning);
    } catch (e) {
      rebuildError = e;
    }
    if (rebuildError) {
      console.error(
        `[roadmap:check] FAIL — ${OUTPUT_NAME} could not be re-derived: the generator threw.`
      );
      console.error(`[roadmap:check]   ${rebuildError.message}`);
      console.error('[roadmap:check] The board on disk cannot be what this generator produces,');
      console.error('[roadmap:check] because right now it produces nothing. Fix the generator.');
      process.exit(1);
    }
    if (rebuilt.blind) {
      console.error(
        `[roadmap:check] FAIL — the board on disk is NOT blind, but regenerating it now would be.`
      );
      const why5 = (rebuilt.reasons || []).map(r => r.key).join(', ');
      if (why5) console.error(`[roadmap:check]   reason(s): ${why5}`);
      console.error('[roadmap:check] So what is on disk is a readable board describing a source');
      console.error('[roadmap:check] this generator can no longer trust. Fix the cause, then');
      console.error('[roadmap:check] regenerate — do not leave the readable one standing.');
      process.exit(1);
    }
    const expected5 = normalizeForCompare(rebuilt.text);
    const actual5 = normalizeForCompare(onDisk);
    if (expected5 !== actual5) {
      // The FIRST differing line, because "they differ" over a 69 KB document is
      // not something anybody can act on.
      const eL = expected5.split('\n');
      const aL = actual5.split('\n');
      let at = 0;
      while (at < eL.length && at < aL.length && eL[at] === aL[at]) at++;
      console.error(`[roadmap:check] FAIL — ${OUTPUT_NAME} is not what this generator produces.`);
      console.error('[roadmap:check]   Its source fingerprint MATCHES, so QUEUE.md has not moved.');
      console.error('[roadmap:check]   The board itself is out of date with the generator, or was');
      console.error('[roadmap:check]   edited by hand. Either way it is a board nothing produced.');
      console.error(`[roadmap:check]   first difference at line ${at + 1}:`);
      console.error(
        `[roadmap:check]     on disk:  ${JSON.stringify((aL[at] || '').slice(0, 120))}`
      );
      console.error(
        `[roadmap:check]     expected: ${JSON.stringify((eL[at] || '').slice(0, 120))}`
      );
      console.error(`[roadmap:check]   (${aL.length} lines on disk, ${eL.length} expected;`);
      console.error(
        '[roadmap:check]    the `App repo HEAD` stamp is held out of this comparison.)'
      );
      console.error('[roadmap:check] Run `npm run roadmap`.');
      process.exit(1);
    }

    console.log(`[roadmap:check] OK — ${OUTPUT_NAME} is a real board, not a blind one; its source`);
    console.log(`[roadmap:check]      fingerprint matches the live QUEUE.md (sha256 ${current}),`);
    console.log(
      '[roadmap:check]      and it is byte-for-byte what this generator produces from it'
    );
    console.log('[roadmap:check]      (the `App repo HEAD` stamp held out, since it moves on');
    console.log('[roadmap:check]      every unrelated commit and is provenance, not freshness).');
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
  // ⛔ READ THE PREDECESSOR BEFORE OVERWRITING IT. This is the only moment the
  // board that is about to be destroyed still exists, and it is the whole measurement.
  let previous = null;
  try {
    previous = fs.readFileSync(outPath, 'utf8');
  } catch {
    // No board yet — a first run, which is not drift.
  }

  writeFileAtomic(outPath, text, { encoding: 'utf8' });
  console.log(
    `[roadmap] Wrote ${outPath} — ${result.blind ? '⛔ BLIND' : 'board OK'} (${text.length} bytes, LF).`
  );

  // ── ⭐⭐ WHAT THIS REGENERATE JUST ERASED ────────────────────────────────
  // See driftClosed()'s header for why this exists rather than a stricter check.
  if (previous === null) {
    console.log(
      '[roadmap] No previous board on disk — nothing to compare, so no drift is claimed.'
    );
  } else {
    const d = driftClosed(previous, text);
    if (!d.known) {
      console.log(
        '[roadmap] ⚠ The board it replaced did not state its own item total, so how far ' +
          'behind it was cannot be established. That is UNKNOWN, not zero.'
      );
    } else if (!d.drifted) {
      console.log(
        `[roadmap] The board on disk was already current — nothing had drifted (${d.after} items).`
      );
    } else {
      console.log(
        `[roadmap] ⛔ DRIFT CLOSED — the board this replaced was ${Math.abs(d.after - d.before)} ` +
          `item(s) behind (${d.before} → ${d.after}).`
      );
      const name = (label, ids) => {
        if (!ids.length) return;
        const shown = ids.slice(0, 12);
        console.log(
          `[roadmap]    ${label}: ${shown.join(', ')}` +
            (ids.length > shown.length ? ` (+${ids.length - shown.length} more)` : '')
        );
      };
      name('Newly listed', d.added);
      name('No longer listed', d.removed);
      // ⚠ The ceiling travels with the names, never as a footnote elsewhere.
      console.log(
        '[roadmap]    ⚠ The totals above are complete; the names are NOT. The backlog band ' +
          'is a count rather than a list, so an item that landed there moved the totals and ' +
          'cannot be named here.'
      );
    }
  }
  // Always 0. This is a reporter; it can never fail a sync, a commit or a push.
  process.exit(0);
}
