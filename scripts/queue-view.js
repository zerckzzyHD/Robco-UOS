#!/usr/bin/env node
/**
 * scripts/queue-view.js — the PRIVATE phone-readable QUEUE view (queue item L).
 *
 * The workflow review flagged that a ~2,700-line QUEUE.md is not actually
 * "phone-readable" — L is the fix. This generator parses QUEUE.md and emits a
 * single self-contained, offline, phone-first HTML page the owner can steer from:
 * a sticky status filter, collapsible items (tap to expand full reasoning), a
 * section jump-nav, and a "what's next" band surfacing the active/ready work.
 *
 * ── ONE SOURCE (L's ruling). QUEUE.md stays the single source of truth; this
 *    only RENDERS it, UNFILTERED / in full — the PRIVATE owner view. The
 *    player-facing opt-in view is deliberately NOT built here: L defers it until
 *    after the museum publication work (P2), because it needs the same
 *    name-substitution + fail-closed guard machinery P2 builds (Protocol 22).
 *
 * ── Generation over maintenance (the library/ discipline). The GENERATOR is
 *    tracked; the generated HTML is gitignored and regenerated on demand. Output
 *    goes to queue-view/ (gitignored), which is NOT served/precached — no cache
 *    concern.
 *
 * ── Deterministic. Same QUEUE.md → byte-identical HTML (no timestamps, no
 *    randomness; the source is fingerprinted with a content hash for provenance).
 *    The pure parser (parseQueue) is unit-tested in Suite 246.
 *
 * Constraints honored: no build step, no framework, vanilla inline HTML/CSS/JS
 * (the same constraints binding the app itself).
 *
 * Usage:  npm run queue-view   →   queue-view/queue-view.html
 */
'use strict';

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { writeFileAtomic } = require('./atomic-write.js');

const ROOT = path.join(__dirname, '..');

// The real status glyphs (⭐/⛔/★ are emphasis, never statuses — see
// EMPHASIS_GLYPHS below). Order is the display order in the filter bar; `key`
// drives the CSS/JS filter classes.
//
// ⭐ THIS LIST IS THE SINGLE STATUS VOCABULARY FOR THE WHOLE PROJECT. Every
// consumer — the filter chips, DEFAULT_ON, the per-status CSS, the leading-glyph
// strip below, and the roadmap generator's banding (scripts/roadmap-generate.js)
// — DERIVES from it. Nothing retypes a glyph literal. A second hand-typed copy is
// exactly how the item-ID pattern drifted before (see ITEM_ID_RE), so when a new
// glyph enters the queue's vocabulary it is added HERE, once, and every consumer
// picks it up. Adding a key is purely additive: `detectStatus` takes the
// EARLIEST-positioned glyph, so a new entry can only rescue a heading that
// previously matched nothing ('none') — it can never re-classify one that
// already matched. Measured on the live QUEUE.md when ⏳/⏸️/❓ were folded in
// (2026-08-13): 21 headings moved none→{deferred,parked}, ZERO moved between
// existing statuses.
// `color` lives here too so the stylesheet can be GENERATED from this list
// rather than hand-listed per status (renderHtml). Hand-listing is what made the
// 5→8 fold a four-site edit in the first place.
const STATUSES = [
  { key: 'ready', glyph: '⏭️', label: 'Ready', color: '#7ad6ff' },
  { key: 'active', glyph: '🔄', label: 'Active', color: '#f5c451' },
  { key: 'blocked', glyph: '⚠️', label: 'Attention', color: '#ff8b6b' },
  { key: 'todo', glyph: '⬜', label: 'To-do', color: '#9aa7a0' },
  { key: 'deferred', glyph: '⏳', label: 'Deferred', color: '#a99bd6' },
  { key: 'parked', glyph: '⏸️', label: 'Parked', color: '#7f8c99' },
  { key: 'question', glyph: '❓', label: 'Question', color: '#d98cc4' },
  // ⚓ SETTLED — adopted by owner ruling, 2026-08-26. "Answered, no work will ever
  // follow, stays visible."
  //
  // ⛔ IT IS NOT 'done' AND MUST NEVER BE FOLDED INTO IT. A settled item shipped
  // nothing; its condition is already satisfied and is MEANT to stay satisfied.
  // The whole reason it is a state rather than a closure is VISIBILITY: a settled
  // item's job is to keep telling its dependents "I permanently constrain you",
  // which is exactly what 'done' would destroy — closed items stop being read as
  // live constraints. A settled entry can still be load-bearing on an OPEN one,
  // and that dependency is the entire argument for keeping it on the board.
  //
  // ⛔ AND IT IS NOT 'parked'. Parked means "not being worked on, will resume".
  // These will not resume; there is no work to resume. One entry sat mis-parked
  // for want of this key, and before that led with a record-only glyph and parsed
  // as status 'none' — invisible to every count, every band, and the generated
  // board. That bug is the argument for putting the state HERE, in the shared
  // vocabulary, rather than only in the queue's prose.
  //
  // ⛔ TWO GUARDS TRAVEL WITH IT (QUEUE.md's legend states both, and they are not
  // optional): (1) entry requires an EXPLICIT, DATED RULING from the project
  // owner — never a tool's inference and never a reviewer's judgement; (2) a
  // settled item STAYS COUNTED in any completion total it was already part of.
  // Without the second, the state quietly becomes a way to shrink a target by
  // RELABELLING rather than by finishing, which is worse than having no state at
  // all — it would make the board look closer to done while nothing moved.
  { key: 'settled', glyph: '⚓', label: 'Settled', color: '#b9926a' },
  { key: 'done', glyph: '✅', label: 'Done', color: '#4fb477' },
];
// Emphasis markers. NOT statuses and never filterable — they mark importance,
// not state. They are listed only so the title strip can drop a leading one
// (a heading like "BD2. ⭐⏭️ …" should read "…", not "⭐…").
const EMPHASIS_GLYPHS = ['⭐'];
// "What's next" surfaces the work actually in motion or ready to start.
// Deliberately excludes deferred/parked/question — those are explicitly NOT in
// motion, which is the whole point of having a glyph for them.
const NEXT_STATUSES = new Set(['active', 'ready']);
// Shown by default; 'done' is hidden by default (surface the live work first).
// The three soft states ARE shown — an item that is deferred, parked or carrying
// an open question is unfinished work the owner still needs to see.
//
// ⭐ 'settled' IS SHOWN BY DEFAULT, and that is the point of the state rather than
// an incidental choice. It is the one status here that describes finished
// business, so the instinct is to hide it beside 'done' — but a settled item is
// a LIVE CONSTRAINT on the items that depend on it, and a constraint nobody sees
// stops constraining. Default-hiding it would reproduce, one layer down, the very
// invisibility this status was added to fix.
const DEFAULT_ON = new Set([
  'ready',
  'active',
  'blocked',
  'todo',
  'deferred',
  'parked',
  'question',
  'settled',
]);

/**
 * The item-ID token at the head of a `###` heading: letters, optional digits,
 * then ONE optional sub-letter — "A3.", "R10.", "L.", "C1.", "OM2a.".
 *
 * ⭐ EXPORTED, AND THE ONLY COPY. The trailing `[a-z]?` is the 2026-08-13 fix:
 * the previous pattern (`/^([A-Za-z]+[0-9]*)\.\s+/`) could not express a
 * sub-lettered ID, so `OM2a.`/`OM2b.` parsed as `id: null` and were SILENTLY
 * DROPPED from the board — not even surfaced as unclassified. The live queue
 * held 205 ID-bearing items and the parser saw 203.
 *
 * ⛔ DO NOT RETYPE THIS PATTERN ANYWHERE. Consumers import the constant. The
 * generator's raw scan and this parser drifted apart precisely because the
 * literal was copied once before; the export exists so that cannot recur, and
 * Suite 248.4 asserts the two counts agree over this same shared constant.
 *
 * No `g` flag — the regex is shared across calls, and a sticky lastIndex would
 * make results depend on call order.
 */
const ITEM_ID_RE = /^([A-Za-z]+[0-9]*[a-z]?)\.\s+/;

/**
 * Strips ONE leading status-or-emphasis glyph from a heading remainder, so the
 * title reads cleanly. Derived from STATUSES so it can never fall behind the
 * vocabulary (it previously hardcoded its own six-glyph list, which is the drift
 * this file is being cured of). Single-strip, not repeated — "OM1. ✅✅ SHIPPED"
 * keeps its second ✅, exactly as before.
 */
const LEADING_GLYPH_RE = new RegExp(
  `^\\s*(?:${[...STATUSES.map(s => s.glyph), ...EMPHASIS_GLYPHS].join('|')})\\s*`
);

// The first status glyph to appear in a heading wins (it sits right after the
// item ID). Returns the status key, or 'none'.
function detectStatus(text) {
  let best = null;
  let bestIdx = Infinity;
  for (const s of STATUSES) {
    const i = text.indexOf(s.glyph);
    if (i >= 0 && i < bestIdx) {
      bestIdx = i;
      best = s.key;
    }
  }
  return best || 'none';
}

// Parse a heading's content into {id, status, title}. The ID is a leading token
// like "A3.", "R10.", "P1.", "L.", "C1.", "OM2a." (ITEM_ID_RE). Not every
// heading has one (e.g. "WASTELAND UPLINK") — id is then null.
//
// ⚠ NOTE FOR CONSUMERS: `title` has its leading glyph STRIPPED. Never re-derive
// a status from it — it is a display string. Use `status` (detected from the raw
// text, before stripping) or scan the raw heading yourself.
function parseHeading(text) {
  const idM = text.match(ITEM_ID_RE);
  let id = null;
  let rest = text;
  if (idM) {
    id = idM[1];
    rest = text.slice(idM[0].length);
  }
  const status = detectStatus(text);
  // Strip a leading status/emphasis glyph so the title reads cleanly.
  const title = rest.replace(LEADING_GLYPH_RE, '').trim() || rest.trim();
  return { id, status, title };
}

function slugify(s) {
  return String(s)
    .toLowerCase()
    .replace(/[`*_[\]()#]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);
}

// Strip inline markdown for a plain DISPLAY label (headings, nav options, item
// titles) so a heading that contains a link/code/bold doesn't show raw syntax.
function titleText(s) {
  return String(s)
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1') // [text](url) → text
    .replace(/`+/g, '') // code ticks
    .replace(/\*\*/g, '') // bold markers
    .replace(/(^|\s)_([^_]+)_(?=\s|$)/g, '$1$2'); // simple italic
}

/**
 * Parse QUEUE.md into a flat, ordered list of blocks:
 *   { type:'section', level:1|2, id, status, title, anchor, body:[lines] }
 *   { type:'item',    level:3,   id, status, title, anchor, body:[lines] }
 * plus the H1 document title. Body is the raw markdown lines until the next
 * heading (rendered lazily by renderHtml → mdToHtml).
 */
function parseQueue(md) {
  const lines = String(md).replace(/\r\n/g, '\n').split('\n');
  const blocks = [];
  let title = 'Build Queue';
  const usedAnchors = new Set();
  const anchorFor = base => {
    let a = base || 'x';
    let n = 2;
    while (usedAnchors.has(a)) a = `${base}-${n++}`;
    usedAnchors.add(a);
    return a;
  };

  let cur = null; // current block collecting body lines
  const flush = () => {
    if (cur) blocks.push(cur);
    cur = null;
  };

  for (const line of lines) {
    const h = /^(#{1,3})\s+(.*)$/.exec(line);
    if (h) {
      const level = h[1].length;
      const content = h[2].trim();
      if (level === 1 && title === 'Build Queue' && blocks.length === 0 && !cur) {
        // The very first H1 is the document title, not a section.
        title = content.replace(LEADING_GLYPH_RE, '').trim() || content;
        continue;
      }
      flush();
      const parsed = parseHeading(content);
      const type = level === 3 ? 'item' : 'section';
      const anchorBase = parsed.id
        ? 'id-' + slugify(parsed.id)
        : (type === 'item' ? 'item-' : 'sec-') + slugify(parsed.title);
      cur = {
        type,
        level,
        id: parsed.id,
        status: parsed.status,
        title: parsed.title,
        anchor: anchorFor(anchorBase),
        body: [],
      };
      continue;
    }
    if (cur) cur.body.push(line);
    // lines before any heading (there are none in practice) are dropped
  }
  flush();
  return { title, blocks };
}

// ── Minimal, safe markdown → HTML for QUEUE.md's actual constructs ────────────
// (bold, italic, inline code, links, bullet/numbered lists, blockquotes,
// sub-headings). No tables or HTML comments exist in the source. Everything is
// HTML-escaped first; code spans are extracted to placeholders so no inline rule
// touches their contents (and nothing user-authored can inject markup).
function escapeHtml(s) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
/**
 * BOLD — a delimiter scanner, not a single regex.
 *
 * The original rule was a single regex pairing two `**` markers around a
 * `[^*]+` body — a class that forbade ANY asterisk between the markers, and
 * that is the bug. QUEUE.md writes two things that class cannot
 * express, both routinely: a single-asterisk italic inside bold
 * (`**bold with *stress* inside**`), and bold nested inside bold
 * (`**OUTER — **INNER** — rest**`). Neither matched, so the markers leaked raw
 * AND — worse — the orphans then paired with the NEXT bold run in the same
 * block, inverting every <strong> after them. A lazy regex fixes the first case
 * only; nesting needs real pairing.
 *
 * So each `**` is classified by CommonMark's flanking rule and each closer is
 * paired with the NEAREST unmatched opener — which yields flat and nested bold
 * alike.
 *
 * ⚠ THE FLANKING RULE IS THE FULL ONE, PUNCTUATION CLAUSE INCLUDED — a shorter
 * "opener is followed by a non-space, closer is preceded by one" is WRONG, and
 * wrong in a way that leaks. It mis-reads INTRA-WORD emphasis opening after
 * punctuation: in a phrase of the shape `word-**bold**` the first marker is
 * preceded by `-` and followed by a letter, so the short rule calls it a
 * closer, and inside an
 * already-open bold run it closes THAT run instead of opening its own — the
 * pairing slips by one and the trailing marker leaks raw. CommonMark says such
 * a run can only OPEN: it is preceded by punctuation and NOT followed by
 * whitespace or punctuation, so it is not right-flanking. That is the whole
 * reason both clauses are spelled out below rather than approximated.
 * An opener the source never closed is closed at the end of its own block, and
 * a delimiter that pairs with NOTHING is DROPPED rather than printed. See the
 * note at the pairing loop's end for why both halves exist and what each costs.
 */
// CommonMark's flanking predicates need three character classes. The start and
// end of the string count as whitespace (so '' is whitespace, never punctuation),
// and "punctuation" is ASCII punctuation plus the Unicode punctuation/symbol
// categories — which is what makes the queue's ⛔/⭐/⚠ glyphs behave like the
// prose separators they actually are rather than like word characters.
const isWs = c => c === '' || /\s/.test(c);
const isPunct = c => c !== '' && /[\p{P}\p{S}]/u.test(c);

function strongify(s) {
  const toks = [];
  const re = /\*\*/g;
  let last = 0;
  let m;
  while ((m = re.exec(s)) !== null) {
    toks.push({ text: s.slice(last, m.index) });
    // CommonMark treats the start/end of the string as whitespace, so an absent
    // neighbour is '' and both predicates below read it as whitespace.
    const next = s.charAt(m.index + 2);
    const prev = m.index > 0 ? s.charAt(m.index - 1) : '';
    const nextWs = isWs(next);
    const prevWs = isWs(prev);
    const nextPunct = isPunct(next);
    const prevPunct = isPunct(prev);
    // left-flanking  = not followed by whitespace, AND (not followed by
    //                  punctuation OR preceded by whitespace/punctuation)
    // right-flanking = not preceded by whitespace, AND (not preceded by
    //                  punctuation OR followed by whitespace/punctuation)
    toks.push({
      delim: true,
      canOpen: !nextWs && (!nextPunct || prevWs || prevPunct),
      canClose: !prevWs && (!prevPunct || nextWs || nextPunct),
    });
    last = m.index + 2;
  }
  if (!toks.length) return s;
  toks.push({ text: s.slice(last) });

  const openers = [];
  for (let i = 0; i < toks.length; i++) {
    const t = toks[i];
    if (!t.delim) continue;
    if (t.canClose && openers.length) {
      toks[openers.pop()].open = true;
      t.close = true;
      continue;
    }
    if (t.canOpen) openers.push(i);
  }
  // An opener the author never closed (a real slip QUEUE.md has carried, and
  // will again — the four live ones were tidied at source on 2026-08-11) is
  // closed at the end of this inline run instead of being printed as a raw
  // `**`. The alternative — CommonMark's literal rendering — puts markup noise
  // on the phone-readable page and, worse, makes this repo's gate hostage to a
  // typo in a document that now lives in another repo entirely (F04). Bolding
  // to the end of the block is what the author evidently meant, and it never
  // bleeds past the block: inline() is called per paragraph / list item /
  // blockquote. Openers close in reverse so the nesting stays well-formed.
  const unclosed = openers.length;
  for (const i of openers) toks[i].open = true;
  // ⭐ THE ORPHAN HALF — the mirror of the repair above, and the half that was
  // missing. A delimiter can end up neither `open` nor `close` two ways, and
  // BOTH used to fall through to a literal `**` on the page:
  //   1. a CLOSER WITH NO OPENER — a trailing `**` at the very end of a block.
  //      It is right-flanking (preceded by punctuation) so it can only close,
  //      and there is nothing to close. Found live in the private queue, 2026-08-25.
  //   2. a marker that can NEITHER open nor close — `a ** b`, whitespace on both
  //      sides, which CommonMark says is not emphasis at all.
  // Dropping them is the SAME judgement the unclosed-opener repair above already
  // made, applied to the mirror case: a stray marker in a document that lives in
  // ANOTHER repo (F04) must not put markup noise on the phone-readable page, and
  // must not redden this repo's gate. ⚠ THE COST, STATED: a `**` the author
  // genuinely meant as literal text disappears instead of showing. That is
  // accepted because a bare literal `**` outside a code span is ALREADY a leak by
  // this project's own rule (Suite 246.7) — inside code it is stashed long before
  // strongify runs, which is why the `css/**` glob carve-out is untouched.
  // ⛔ Dropping is deliberately preferred over the other symmetric option —
  // bolding from the start of the block — because that INVENTS emphasis across
  // text the author never marked, a far larger and more visible fabrication than
  // removing two characters.
  return (
    toks.map(t => (!t.delim ? t.text : t.open ? '<strong>' : t.close ? '</strong>' : '')).join('') +
    '</strong>'.repeat(unclosed)
  );
}

/**
 * CODE SPANS — a backtick-RUN scanner, not two hardcoded regexes.
 *
 * The original pass matched double-backtick spans first and single ones second,
 * because QUEUE.md writes ``code with `backticks` inside`` and pairing singles
 * first would mis-pair and swallow everything after. That ordering fixed the
 * two-backtick case by naming it, which means every OTHER run length was still
 * mis-read — and a run of THREE is the one the corpus actually grew. The double
 * pass ate two of its backticks and left an orphaned third to pair with the next
 * single backtick in the block, cutting every following code span one marker out
 * of phase (see the fenced-block note below — that is how a raw `**` escaped).
 *
 * CommonMark's actual rule needs no special cases: a code span opens with a
 * backtick run of length N and closes at the next run of EXACTLY N. A run with
 * no equal-length partner is not a delimiter at all and stays literal. One
 * leading and one trailing space are stripped when both are present and the
 * content is not all spaces, which is what lets ``` `x` ``` render as `x`.
 */
function stashCodeSpans(raw, stash) {
  let out = '';
  let i = 0;
  while (i < raw.length) {
    if (raw[i] !== '`') {
      out += raw[i];
      i++;
      continue;
    }
    let openEnd = i;
    while (openEnd < raw.length && raw[openEnd] === '`') openEnd++;
    const run = openEnd - i;
    let k = openEnd;
    let close = -1;
    while (k < raw.length) {
      if (raw[k] !== '`') {
        k++;
        continue;
      }
      let e = k;
      while (e < raw.length && raw[e] === '`') e++;
      if (e - k === run) {
        close = k;
        break;
      }
      k = e;
    }
    if (close === -1) {
      // No equal-length partner: these backticks are literal text, not a span.
      out += raw.slice(i, openEnd);
      i = openEnd;
      continue;
    }
    let content = raw.slice(openEnd, close);
    // ⚠ PADDING IS STRIPPED ONLY FOR MULTI-BACKTICK RUNS, and that is deliberate
    // rather than sloppy CommonMark. The padding space exists to let a span hold
    // a leading/trailing backtick — ``` `x` ``` → `x` — which is a two-backtick
    // concern; a single-backtick span has nothing to escape. Applying it to
    // single spans as well was MEASURED against the live corpus and rewrote nine
    // blocks whose source carries an unbalanced backtick: already-broken output
    // becoming differently-broken output, for no readability gain. Restricting it
    // here keeps the run-length fix below to the two blocks it genuinely repairs.
    if (run >= 2 && /^[ \n]/.test(content) && /[ \n]$/.test(content) && /[^ \n]/.test(content)) {
      content = content.slice(1, -1);
    }
    out += stash(content);
    i = close + run;
  }
  return out;
}

function inline(raw) {
  const codes = [];
  const stash = c => {
    codes.push(escapeHtml(c));
    return `@@C${codes.length - 1}@@`;
  };
  let s = stashCodeSpans(raw, stash);
  s = escapeHtml(s);
  // links [text](url) — url is attribute-escaped; text keeps its (already escaped) content
  s = s.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_m, t, u) => {
    const href = u.replace(/"/g, '%22');
    return `<a href="${href}">${t}</a>`;
  });
  s = strongify(s);
  // italic: conservative boundaries so identifiers/paths with _ aren't mangled.
  // Both spellings — `_x_` and `*x*`; the `*` form is only reached once bold has
  // been consumed above, so a lone `*` here is genuinely an italic marker.
  s = s.replace(/(^|[\s(])_([^_\n]+?)_(?=[\s.,;:!?)]|$)/g, '$1<em>$2</em>');
  s = s.replace(/(^|[\s(])\*(?=\S)([^*\n]+?)(?<=\S)\*(?=[\s.,;:!?)]|$)/g, '$1<em>$2</em>');
  s = s.replace(/@@C(\d+)@@/g, (_m, i) => `<code>${codes[+i]}</code>`);
  return s;
}

/**
 * FENCED CODE BLOCKS — a BLOCK construct, so it must be consumed before any
 * inline rule ever sees it.
 *
 * ⚠ WITHOUT THIS, A ``` FENCE DOES NOT MERELY RENDER UGLY — IT CORRUPTS THE
 * PROSE AFTER IT. `inline()` stashes double-backtick spans before single ones,
 * and a three-backtick fence is not a code span at all: the double-backtick
 * pass matched two of the three, leaving a STRAY THIRD backtick behind. That
 * orphan then paired with the next single backtick in the same block, so every
 * following code span was cut one marker out of phase — swallowing whole runs
 * of prose (bold markers included) into bogus <code> spans until a `**` was
 * finally left outside one and leaked raw. Found 2026-08-24: the leak surfaced
 * in ONE block, but the mis-pairing was silently mangling every fence-bearing
 * block in the corpus, the same way the flanking bug was silently inverting a
 * second block before it.
 *
 * The rule below is deliberately narrow — an opening fence is 3+ BACKTICKS at
 * the start of a line with an optional info string and no further backticks;
 * a closing fence is 3+ backticks alone on a line, at least as long as the
 * opener. Tilde fences are not supported: they are absent from the corpus and,
 * carrying no backticks, they cannot produce the mis-pairing this exists to
 * stop. An unclosed fence runs to the end of its block, which is both what
 * CommonMark does and what an author who forgets a closer evidently meant.
 *
 * Fence content is escaped and emitted VERBATIM — never inlined — so nothing a
 * code block contains can reach the emphasis or code-span scanners at all.
 */
const FENCE_RE = /^\s*(`{3,})\s*([^`]*)$/;
const FENCE_CLOSE_RE = /^\s*(`{3,})\s*$/;

/**
 * Consume the fenced block that opens at `L[start]`. Returns the rendered HTML
 * and the index of the first line AFTER the block.
 */
function takeFence(L, start) {
  const marker = FENCE_RE.exec(L[start])[1];
  const lines = [];
  let i = start + 1;
  for (; i < L.length; i++) {
    const close = FENCE_CLOSE_RE.exec(L[i]);
    if (close && close[1].length >= marker.length) {
      i++;
      break;
    }
    lines.push(L[i]);
  }
  return { html: `<pre><code>${escapeHtml(lines.join('\n'))}</code></pre>`, next: i };
}

/**
 * Render the inside of a blockquote (its `>` markers already stripped).
 *
 * A quote's lines are inline()d as ONE run so a bold or code span that wraps
 * across `>` lines is never split. A fenced code block is the one thing that
 * cannot go through that run, so the buffer is cut into fence / prose segments
 * and only the prose segments are inlined.
 *
 * ⭐ A quote containing NO fence takes the original single-inline path
 * unchanged, byte for byte — which is what keeps this fix off every block that
 * has no code block in it.
 */
function quoteInner(buf) {
  const proseHtml = seg => inline(seg.join('\n')).replace(/\n/g, '<br>');
  if (!buf.some(l => FENCE_RE.test(l))) return proseHtml(buf);
  const parts = [];
  let seg = [];
  const flushSeg = () => {
    // Blank lines abutting a fence would otherwise emit a stray <br> against
    // the <pre>; blanks BETWEEN prose lines still become <br> as before.
    while (seg.length && /^\s*$/.test(seg[0])) seg.shift();
    while (seg.length && /^\s*$/.test(seg[seg.length - 1])) seg.pop();
    if (seg.length) parts.push(proseHtml(seg));
    seg = [];
  };
  let i = 0;
  while (i < buf.length) {
    if (FENCE_RE.test(buf[i])) {
      flushSeg();
      const f = takeFence(buf, i);
      parts.push(f.html);
      i = f.next;
      continue;
    }
    seg.push(buf[i]);
    i++;
  }
  flushSeg();
  return parts.join('');
}

function mdToHtml(bodyLines) {
  const out = [];
  let i = 0;
  const L = bodyLines;
  const isBlank = s => /^\s*$/.test(s);
  while (i < L.length) {
    const line = L[i];
    if (isBlank(line)) {
      i++;
      continue;
    }
    // fenced code block — consumed FIRST, before anything can inline it
    if (FENCE_RE.test(line)) {
      const f = takeFence(L, i);
      out.push(f.html);
      i = f.next;
      continue;
    }
    // ⛔ TOP-LEVEL HEADING (# .. ###) — THIS BRANCH IS A HANG FIX, NOT A FEATURE.
    // `isSpecial()` counts every `#`-led line as special, so the paragraph gather
    // below refuses to consume one; with no branch above it claiming `#`..`###`,
    // the loop pushed an empty <p> and never advanced `i` — an infinite loop that
    // pins a CPU. It was unreachable only because the queue view feeds this
    // function ITEM BODIES, and an item's own `###` heading is stripped by
    // parseQueue before it gets here. The moment any other document is rendered
    // through this renderer, the first `##` in it hangs the caller. Rendering the
    // heading is the fix; leaving the sub-heading rule below untouched keeps the
    // queue view's existing output byte-identical.
    const th = /^(#{1,3})\s+(.*)$/.exec(line);
    if (th) {
      const level = th[1].length + 1; // h2..h4 — the PAGE owns <h1>
      out.push(`<h${level}>${inline(th[2].trim())}</h${level}>`);
      i++;
      continue;
    }
    // sub-heading (#### and deeper) inside a body
    const sh = /^(#{4,6})\s+(.*)$/.exec(line);
    if (sh) {
      out.push(`<p class="subh">${inline(sh[2].trim())}</p>`);
      i++;
      continue;
    }
    // GFM table — a header row followed by a delimiter row. Both are required, so
    // a line that merely contains pipes stays a paragraph.
    if (isTableStart(L, i)) {
      const t = takeTable(L, i);
      out.push(t.html);
      i = t.next;
      continue;
    }
    // blockquote — accumulate ALL the quote lines and inline() ONCE (joined by
    // newlines), so a bold/code span that wraps across `>` lines is never split
    // (splitting it leaks a raw `**`); the newlines become <br> after inlining.
    if (/^\s*>/.test(line)) {
      const buf = [];
      while (i < L.length && /^\s*>/.test(L[i])) {
        buf.push(L[i].replace(/^\s*>\s?/, ''));
        i++;
      }
      out.push(`<blockquote>${quoteInner(buf)}</blockquote>`);
      continue;
    }
    // unordered list (with one level of nesting by indentation)
    if (/^\s*[-*]\s+/.test(line)) {
      out.push(renderList(L, i, 'ul'));
      i = renderList.lastIndex;
      continue;
    }
    // ordered list
    if (/^\s*\d+\.\s+/.test(line)) {
      out.push(renderList(L, i, 'ol'));
      i = renderList.lastIndex;
      continue;
    }
    // paragraph: gather consecutive plain lines
    const buf = [];
    while (i < L.length && !isBlank(L[i]) && !isSpecial(L[i])) {
      buf.push(L[i].trim());
      i++;
    }
    // ⛔ PROGRESS GUARANTEE — the renderer is TOTAL, by construction rather than by
    // the branch list happening to be complete. `isSpecial()` only claims that some
    // branch above SHOULD have consumed this line; when none actually did, the
    // gather above matches nothing, `i` never advances, and the loop spins forever
    // pushing empty paragraphs. That is not hypothetical: it was live for `#`..`###`
    // (unreachable only because item bodies never contain one) and was recreated
    // immediately by adding table rows to `isSpecial`. Falling back to "treat it as
    // ordinary text" makes an unclaimed line a cosmetic problem instead of a hang,
    // and means the next line added to `isSpecial` cannot resurrect this.
    if (!buf.length) {
      buf.push(L[i].trim());
      i++;
    }
    out.push(`<p>${inline(buf.join(' '))}</p>`);
  }
  return out.join('\n');
}
function isSpecial(s) {
  return (
    /^\s*[-*]\s+/.test(s) ||
    /^\s*\d+\.\s+/.test(s) ||
    /^\s*>/.test(s) ||
    /^#{1,6}\s+/.test(s) ||
    /^\s*\|/.test(s) ||
    FENCE_RE.test(s)
  );
}

/**
 * A GFM table needs BOTH a header row and the `| --- |` delimiter under it. Two
 * lines, not one: the source uses a leading `|` inside ordinary prose often
 * enough that treating any pipe-led line as a table would swallow paragraphs.
 */
const TABLE_DELIM_RE = /^\s*\|?[\s:-]*-[\s|:-]*\|?\s*$/;
function isTableStart(L, i) {
  return (
    /^\s*\|/.test(L[i] || '') &&
    /\|/.test(L[i + 1] || '') &&
    TABLE_DELIM_RE.test(L[i + 1] || '') &&
    (L[i + 1] || '').includes('-')
  );
}
/** Split one table row into cells, tolerating the optional leading/trailing pipe. */
function tableCells(line) {
  let s = String(line).trim();
  if (s.startsWith('|')) s = s.slice(1);
  if (s.endsWith('|')) s = s.slice(0, -1);
  // A pipe escaped as `\|` is DATA, not a cell boundary — the roadmap board emits
  // exactly that when an item's own title contains one.
  return s.split(/(?<!\\)\|/).map(c => inline(c.trim().replace(/\\\|/g, '|')));
}
function takeTable(L, start) {
  const head = tableCells(L[start]);
  let i = start + 2;
  const rows = [];
  while (i < L.length && /^\s*\|/.test(L[i])) {
    rows.push(tableCells(L[i]));
    i++;
  }
  const thead = `<thead><tr>${head.map(c => `<th>${c}</th>`).join('')}</tr></thead>`;
  const tbody = rows.length
    ? `<tbody>${rows.map(r => `<tr>${r.map(c => `<td>${c}</td>`).join('')}</tr>`).join('')}</tbody>`
    : '';
  // ⚠ The scroll wrapper is part of the OUTPUT, not the page's styling problem. A
  // wide table is the one block that cannot reflow on a phone, so it gets its own
  // horizontally-scrollable container rather than forcing the whole page sideways.
  return { html: `<div class="tablewrap"><table>${thead}${tbody}</table></div>`, next: i };
}
// Render a list starting at index `start`; sets renderList.lastIndex to the line
// after the list. Handles one nesting level via leading-space depth. Each list
// item's full text (including WRAPPED continuation lines) is accumulated BEFORE
// inline() runs, so a bold/code/link span that wraps across lines is never split
// (splitting it would leak a raw `**` — the exact bug this shape prevents).
function renderList(L, start, tag) {
  const itemRe = tag === 'ul' ? /^(\s*)[-*]\s+(.*)$/ : /^(\s*)\d+\.\s+(.*)$/;
  const anyItemRe = /^(\s*)(?:[-*]|\d+\.)\s+/;
  const baseIndent = (L[start].match(/^(\s*)/) || ['', ''])[1].length;
  let i = start;
  const lis = []; // { raw:string, nested:string }
  let cur = null;
  const flush = () => {
    if (cur) {
      lis.push(cur);
      cur = null;
    }
  };
  while (i < L.length) {
    const line = L[i];
    if (/^\s*$/.test(line)) break; // a blank line ends the list
    const m = itemRe.exec(line);
    const any = anyItemRe.exec(line);
    if (m && m[1].length === baseIndent) {
      flush();
      cur = { raw: m[2], nested: '' };
      i++;
      continue;
    }
    if (any && any[1].length > baseIndent) {
      // a nested list belonging to the current item
      if (!cur) cur = { raw: '', nested: '' };
      const subTag = /^\s*\d+\.\s+/.test(line) ? 'ol' : 'ul';
      cur.nested += renderList(L, i, subTag);
      i = renderList.lastIndex;
      continue;
    }
    if (/^\s+\S/.test(line) && cur) {
      // a wrapped continuation line of the current item
      cur.raw += ' ' + line.trim();
      i++;
      continue;
    }
    break; // dedent or non-list line ends the list
  }
  flush();
  renderList.lastIndex = i;
  return (
    `<${tag}>` + lis.map(li => `<li>${inline(li.raw)}${li.nested}</li>`).join('') + `</${tag}>`
  );
}
renderList.lastIndex = 0;

function statusMeta(key) {
  return STATUSES.find(s => s.key === key) || null;
}

function renderHtml(model, sourceHash) {
  const { title, blocks } = model;

  // "What's next" — active/ready items, in document order.
  const nextItems = blocks.filter(b => b.type === 'item' && NEXT_STATUSES.has(b.status));

  const filterChips = STATUSES.map(
    s =>
      `<button class="chip" data-status="${s.key}" aria-pressed="${DEFAULT_ON.has(s.key)}">` +
      `<span class="g">${s.glyph}</span>${s.label}</button>`
  ).join('');

  const navOptions = blocks
    .filter(b => b.type === 'section')
    .map(b => `<option value="${b.anchor}">${escapeHtml(titleText(b.title)).slice(0, 60)}</option>`)
    .join('');

  const nextHtml = nextItems.length
    ? `<section class="whatsnext"><h2>▸ What's next</h2><ul>${nextItems
        .map(b => {
          const m = statusMeta(b.status);
          return `<li><a href="#${b.anchor}" data-jump="${b.anchor}"><span class="g">${m ? m.glyph : ''}</span>${b.id ? `<span class="idb">${escapeHtml(b.id)}</span>` : ''} ${escapeHtml(titleText(b.title))}</a></li>`;
        })
        .join('')}</ul></section>`
    : '';

  // Body: sections wrap their following items so a section with no visible items
  // can be hidden by the filter. Pure-intro sections (no items) stay visible.
  const bodyParts = [];
  let openSection = false;
  const closeSection = () => {
    if (openSection) {
      bodyParts.push('</div></section>');
      openSection = false;
    }
  };
  for (const b of blocks) {
    if (b.type === 'section') {
      closeSection();
      const m = statusMeta(b.status);
      const raw = b.body.join('\n').trim();
      // Long section prose is collapsed behind a "context" toggle so the page
      // stays scannable (headings + item cards) on a phone; short intros (a
      // one-line bucket note) render inline.
      let introBlock = '';
      if (raw) {
        const html = mdToHtml(b.body);
        introBlock =
          raw.length > 300
            ? `<details class="ctx"><summary>▸ context</summary><div class="sec-intro">${html}</div></details>`
            : `<div class="sec-intro">${html}</div>`;
      }
      bodyParts.push(
        `<section class="sec sec-l${b.level}" id="${b.anchor}" data-section="1">` +
          `<h${b.level === 1 ? 2 : 3} class="sec-h">${m ? `<span class="g">${m.glyph}</span>` : ''}${escapeHtml(titleText(b.title))}</h${b.level === 1 ? 2 : 3}>` +
          introBlock +
          `<div class="sec-items">`
      );
      openSection = true;
    } else {
      const m = statusMeta(b.status);
      const summary =
        `<summary data-status="${b.status}">` +
        `${b.id ? `<span class="idb">${escapeHtml(b.id)}</span>` : ''}` +
        `<span class="g">${m ? m.glyph : ''}</span>` +
        `<span class="it-title">${escapeHtml(titleText(b.title))}</span></summary>`;
      const card =
        `<details class="item" data-status="${b.status}" id="${b.anchor}">` +
        summary +
        `<div class="it-body">${mdToHtml(b.body)}</div></details>`;
      if (!openSection) {
        // item with no preceding section — wrap defensively
        bodyParts.push('<section class="sec" data-section="1"><div class="sec-items">');
        openSection = true;
      }
      bodyParts.push(card);
    }
  }
  closeSection();

  const defaultBodyClass = [...DEFAULT_ON].map(k => 'show-' + k).join(' ');

  // ── Status CSS is GENERATED from STATUSES, never hand-listed ────────────────
  // Four rule families used to name every status by hand, so folding a new glyph
  // into the vocabulary meant remembering four separate edit sites — miss the
  // filter pair and the new status is chip-visible but permanently hidden (or
  // permanently shown), which is a silent wrong answer, not a visible break.
  // Generating them means adding a STATUSES entry is now genuinely one edit.
  const statusVars = STATUSES.map(s => `--${s.key}:${s.color};`).join(' ');
  const statusAccents = STATUSES.map(
    s => `[data-status="${s.key}"] .idb{border-color:var(--${s.key}); color:var(--${s.key})}`
  ).join('\n');
  const statusHideAll =
    STATUSES.map(s => `.item[data-status="${s.key}"]`).join(',') +
    ',.item[data-status="none"]{display:none}';
  const statusShow = STATUSES.map(
    s => `body.show-${s.key} .item[data-status="${s.key}"]{display:block}`
  ).join('\n');

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<meta name="color-scheme" content="dark light">
<title>${escapeHtml(title)} — private view</title>
<style>
:root{
  --bg:#0c0f0d; --bg2:#121613; --card:#151b17; --card2:#1a221c;
  --ink:#d7e2da; --dim:#8fa295; --line:#26302a; --acc:#43e08a; --acc2:#7ad6ff;
  ${statusVars}
}
*{box-sizing:border-box}
html,body{margin:0}
body{
  background:var(--bg); color:var(--ink);
  font:15px/1.5 -apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,system-ui,sans-serif;
  -webkit-text-size-adjust:100%; padding-bottom:40vh;
}
a{color:var(--acc2); text-decoration:none}
a:active{opacity:.6}
code{font-family:ui-monospace,"SF Mono",Menlo,Consolas,monospace; font-size:.88em;
  background:#0a0d0b; border:1px solid var(--line); border-radius:4px; padding:0 4px; color:#bfeecb; word-break:break-word}
.topbar{position:sticky; top:0; z-index:20; background:rgba(10,13,11,.94);
  backdrop-filter:blur(8px); border-bottom:1px solid var(--line); padding:8px 10px 6px}
.title{font-weight:700; font-size:15px; letter-spacing:.02em; display:flex; gap:8px; align-items:baseline; flex-wrap:wrap}
.title .hash{color:var(--dim); font-weight:400; font-size:11px; font-family:ui-monospace,monospace}
.filters{display:flex; gap:6px; overflow-x:auto; padding:8px 0 2px; -webkit-overflow-scrolling:touch}
.chip{flex:0 0 auto; min-height:34px; display:inline-flex; align-items:center; gap:5px;
  background:var(--card); color:var(--dim); border:1px solid var(--line); border-radius:999px;
  padding:4px 11px; font-size:12.5px; font-weight:600; cursor:pointer}
.chip .g{font-size:13px}
.chip[aria-pressed="true"]{color:var(--ink); border-color:var(--acc); background:#17241c}
.chip[aria-pressed="false"]{opacity:.5; text-decoration:line-through}
.jump{width:100%; margin-top:8px; min-height:38px; background:var(--card); color:var(--ink);
  border:1px solid var(--line); border-radius:8px; padding:8px 10px; font-size:13px}
main{padding:10px}
.whatsnext{background:linear-gradient(180deg,#13251b,#101613); border:1px solid #1f5138;
  border-radius:12px; padding:10px 12px; margin:4px 0 14px}
.whatsnext h2{margin:0 0 6px; font-size:13px; color:var(--acc); letter-spacing:.04em; text-transform:uppercase}
.whatsnext ul{margin:0; padding:0; list-style:none; display:flex; flex-direction:column; gap:4px}
.whatsnext a{display:flex; gap:7px; align-items:baseline; color:var(--ink); padding:5px 4px; border-radius:6px; font-size:14px}
.whatsnext a:active{background:#17241c}
.sec{margin:0 0 6px}
.sec-h{font-size:13px; letter-spacing:.04em; text-transform:uppercase; color:var(--dim);
  border-bottom:1px solid var(--line); padding:14px 0 5px; margin:6px 0 8px; display:flex; gap:7px; align-items:center}
.sec-l1>.sec-h{color:var(--acc); font-size:14px}
.sec-intro{color:var(--dim); font-size:13.5px; margin:0 0 10px}
.sec-intro p{margin:.4em 0}
.ctx{margin:0 0 10px}
.ctx>summary{list-style:none; cursor:pointer; color:var(--acc2); font-size:12px; font-weight:600;
  letter-spacing:.03em; padding:5px 0; min-height:30px; user-select:none}
.ctx>summary::-webkit-details-marker{display:none}
.ctx:not([open])>.sec-intro{display:none}
.ctx[open]>summary{color:var(--dim)}
.item{background:var(--card); border:1px solid var(--line); border-radius:11px; margin:0 0 8px; overflow:hidden}
.item[open]{border-color:#33443a; background:var(--card2)}
summary{list-style:none; cursor:pointer; display:flex; gap:8px; align-items:center;
  padding:11px 12px; min-height:46px; user-select:none}
summary::-webkit-details-marker{display:none}
summary:active{background:#17201a}
.idb{flex:0 0 auto; font-family:ui-monospace,monospace; font-weight:700; font-size:12px;
  background:#0a0d0b; border:1px solid var(--acc); color:var(--acc); border-radius:6px; padding:2px 7px; letter-spacing:.03em}
.g{flex:0 0 auto; font-size:15px; line-height:1}
.it-title{font-weight:600; font-size:14px; line-height:1.35}
.item[open] .it-title{color:#fff}
.it-body{padding:2px 13px 13px; font-size:13.5px; color:var(--ink); border-top:1px solid var(--line)}
/* Collapse the body explicitly when the item is closed — do not rely on UA
   details styling alone (some render paths keep ::details-content laid out).
   This is what makes "collapsed by default, tap to expand" actually hold. */
.item:not([open]) .it-body{display:none}
.it-body p{margin:.55em 0}
.it-body ul,.it-body ol{margin:.4em 0; padding-left:20px}
.it-body li{margin:.3em 0}
.it-body blockquote{margin:.5em 0; padding:.3em 0 .3em 11px; border-left:2px solid var(--line); color:var(--dim)}
.it-body pre{margin:.5em 0; padding:7px 9px; background:#0a0d0b; border:1px solid var(--line);
  border-radius:4px; overflow-x:auto; -webkit-overflow-scrolling:touch}
.it-body pre code{background:none; border:0; border-radius:0; padding:0; white-space:pre;
  word-break:normal; font-size:.84em; line-height:1.45}
.it-body .subh{font-weight:700; color:#cfe; margin:.7em 0 .2em}
.it-body strong{color:#fff}
/* status accents on the ID badge / glyph — generated from STATUSES */
${statusAccents}
[data-status="done"] .idb{opacity:.85}
/* filter: hide a status unless its body class is present — generated from STATUSES */
${statusHideAll}
${statusShow}
.item[data-status="none"]{display:block} /* un-tagged items always show */
.sec.is-empty{display:none}
@media (prefers-color-scheme:light){
  :root{--bg:#f4f1e8; --bg2:#fff; --card:#fffdf7; --card2:#fbf7ec; --ink:#22281f;
    --dim:#5d6b57; --line:#d9d2bf; --acc:#1f7a45; --acc2:#0b6a8f}
  code{background:#efeadd; color:#245}
  .it-body pre{background:#efeadd}
  .item[open]{background:#fffdf7}
}
</style>
</head>
<body class="${defaultBodyClass}">
<div class="topbar">
  <div class="title">${escapeHtml(title)} <span class="hash">src ${sourceHash}</span></div>
  <div class="filters" role="group" aria-label="Filter by status">${filterChips}</div>
  <select class="jump" aria-label="Jump to section"><option value="">Jump to section…</option>${navOptions}</select>
</div>
<main>
${nextHtml}
${bodyParts.join('\n')}
</main>
<script>
(function(){
  var body=document.body;
  function recomputeEmpty(){
    document.querySelectorAll('section.sec[data-section]').forEach(function(sec){
      var itemsBox=sec.querySelector('.sec-items');
      if(!itemsBox) return; // pure-intro section — never hidden
      var vis=Array.prototype.some.call(itemsBox.querySelectorAll('.item'),function(it){
        return it.offsetParent!==null;
      });
      var hasItems=itemsBox.querySelector('.item');
      sec.classList.toggle('is-empty', !!hasItems && !vis);
    });
  }
  document.querySelectorAll('.chip').forEach(function(chip){
    chip.addEventListener('click',function(){
      var on=chip.getAttribute('aria-pressed')==='true';
      chip.setAttribute('aria-pressed', on?'false':'true');
      body.classList.toggle('show-'+chip.dataset.status, !on);
      recomputeEmpty();
    });
  });
  var jump=document.querySelector('.jump');
  if(jump) jump.addEventListener('change',function(){
    var id=jump.value; if(!id) return;
    var el=document.getElementById(id);
    if(el) el.scrollIntoView({behavior:'smooth',block:'start'});
    jump.value='';
  });
  // "What's next" links open the target item and scroll to it.
  document.querySelectorAll('[data-jump]').forEach(function(a){
    a.addEventListener('click',function(e){
      var el=document.getElementById(a.dataset.jump);
      if(el){ e.preventDefault(); if(el.tagName==='DETAILS') el.open=true;
        el.scrollIntoView({behavior:'smooth',block:'start'}); }
    });
  });
  recomputeEmpty();
})();
</script>
</body>
</html>
`;
}

module.exports = {
  parseQueue,
  renderHtml,
  detectStatus,
  parseHeading,
  slugify,
  titleText,
  mdToHtml,
  STATUSES,
  EMPHASIS_GLYPHS,
  // ⭐ Exported so no consumer ever retypes the pattern — scripts/roadmap-generate.js
  // imports THIS constant for its raw scan, and Suite 248.4 asserts the parser's
  // item count and that raw scan's count agree over it.
  ITEM_ID_RE,
};

// ── CLI (only when run directly) ──────────────────────────────────────────────
if (require.main === module) {
  // F04 (2026-08-02): QUEUE.md is no longer in this repo — the canonical copy is
  // private, in _RobCo-Archive/!PLANNING/. Resolved through the one resolver
  // (scripts/planning-paths.js); absent is a clean no-op, not an error, because a
  // public clone has no archive by design.
  const planning = require('./planning-paths.js');
  const src = planning.readPlanningFile('QUEUE.md');
  if (src === null) {
    console.log(`[queue-view] SKIPPED — ${planning.describe()}.`);
    console.log(
      '[queue-view] The private queue view needs the archive checkout; nothing was written.'
    );
    process.exit(0);
  }
  const hash = crypto.createHash('sha1').update(src).digest('hex').slice(0, 8);
  const model = parseQueue(src);
  const html = renderHtml(model, hash);
  const outDir = path.join(ROOT, 'queue-view');
  fs.mkdirSync(outDir, { recursive: true });
  const outPath = path.join(outDir, 'queue-view.html');
  // WF12 — atomic, never truncating. Regenerable, but a half-written page is a page
  // the owner reads on a phone with no way to tell it is incomplete.
  writeFileAtomic(outPath, html, { encoding: 'utf8' });
  const items = model.blocks.filter(b => b.type === 'item').length;
  const sections = model.blocks.filter(b => b.type === 'section').length;
  console.log(
    `[queue-view] Wrote ${path.relative(ROOT, outPath)} — ${sections} sections, ${items} items (src ${hash}).`
  );
}
