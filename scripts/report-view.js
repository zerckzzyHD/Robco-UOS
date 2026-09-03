#!/usr/bin/env node
/**
 * scripts/report-view.js — renders a private markdown report into ONE
 * self-contained, phone-readable HTML page.
 *
 * ── ⛔ THIS FILE IS A RENDERER. IT CONTAINS NO REPORT CONTENT, AND MUST NOT ───
 * The reports themselves are private and live OUTSIDE this repo (resolved by
 * scripts/planning-paths.js). This module never writes anything: it takes
 * markdown in and returns an HTML string, which the dev-server middleware puts
 * straight into a response body. Nothing is generated into the checkout, so there
 * is nothing here for a commit — or a static file server — to pick up.
 *
 * ⚠ Do not add an "output to disk" mode. The moment a rendered report exists as a
 * file, the question changes from "can this leak?" (no — it is never on disk) to
 * "is the directory it lands in excluded from everything?", which is a promise a
 * single forgotten exclusion entry breaks. That failure has already happened once
 * on this project with a generator's exclusion list.
 *
 * ── Markdown is rendered by scripts/queue-view.js's mdToHtml (Protocol 22) ────
 * That is the project's one markdown renderer, already hardened for fenced code,
 * code-span pairing, emphasis flanking and strikethrough. Growing a second
 * renderer here would mean two different answers to "what does this markdown
 * mean", and the older surface would quietly keep the bugs the newer one fixed.
 */
'use strict';

const { mdToHtml } = require('./queue-view.js');

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/**
 * The page's stylesheet, inline.
 *
 * ⚠ EVERY RULE HERE IS AIMED AT A PHONE AT 7AM, not at looking like the app. The
 * reports are long-form prose read once, on a small screen, in one sitting:
 *
 *  · a MEASURE cap (~34em) so lines stay readable — the default full-bleed width
 *    on a wide phone in landscape is the single worst thing for long prose;
 *  · a system font stack, because a webfont is a network round-trip this page
 *    must not need (it is served off a laptop over a tailnet, sometimes slowly);
 *  · `word-break` on code, since these reports quote long paths and hashes that
 *    would otherwise push the whole page sideways;
 *  · tables in their own horizontal scroller (emitted by the renderer) — a wide
 *    table is the one block that genuinely cannot reflow;
 *  · generous tap targets on the contents links and headings, which are the only
 *    interactive elements on the page;
 *  · both colour schemes honoured, because the phone decides, not this file.
 *
 * ⭐ THE ⭐/⚠/⛔ MARKERS ARE LOAD-BEARING PUNCTUATION IN THESE DOCUMENTS and must
 * survive legibly. They are left in the text (never stripped, never replaced with
 * a class) and the body font-size is kept large enough that they read as
 * distinct glyphs rather than grey smudges at arm's length.
 */
const STYLE = `
:root { color-scheme: light dark; --bg:#0f1210; --fg:#d7e2d8; --dim:#8b9a8d;
        --acc:#6fdc8c; --line:#2a332c; --code:#141915; --hi:#f5c451; }
@media (prefers-color-scheme: light) {
  :root { --bg:#f7f9f7; --fg:#1b211c; --dim:#5b665d; --acc:#1f7a43;
          --line:#d8e0d9; --code:#eef2ee; --hi:#8a6d1f; }
}
* { box-sizing: border-box; }
html { -webkit-text-size-adjust: 100%; }
body { margin:0; background:var(--bg); color:var(--fg);
  font: 17px/1.65 -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto,
        "Helvetica Neue", Arial, "Apple Color Emoji", "Segoe UI Emoji", sans-serif; }
.wrap { max-width: 34em; margin: 0 auto; padding: 1rem 1.05rem 4rem; }
header.top { position: sticky; top:0; z-index:5; background:var(--bg);
  border-bottom:1px solid var(--line); padding:.6rem 1.05rem;
  display:flex; gap:.75rem; align-items:baseline; }
header.top a { color:var(--acc); text-decoration:none; font-weight:600;
  padding:.5rem 0; min-height:44px; display:inline-flex; align-items:center; }
header.top .name { color:var(--dim); font-size:.85rem; overflow:hidden;
  text-overflow:ellipsis; white-space:nowrap; }
h1 { font-size:1.5rem; line-height:1.25; margin:1.2rem 0 .6rem; }
h2 { font-size:1.25rem; line-height:1.3; margin:2rem 0 .5rem;
  padding-top:.4rem; border-top:1px solid var(--line); scroll-margin-top:4rem; }
h3 { font-size:1.08rem; margin:1.5rem 0 .4rem; scroll-margin-top:4rem; }
h4, p.subh { font-size:1rem; font-weight:700; margin:1.2rem 0 .3rem; color:var(--fg); }
p { margin:.7rem 0; overflow-wrap:break-word; }
ul, ol { margin:.6rem 0; padding-left:1.35rem; }
li { margin:.35rem 0; }
blockquote { margin:.8rem 0; padding:.5rem .85rem; border-left:3px solid var(--acc);
  background:var(--code); color:var(--fg); border-radius:0 6px 6px 0; }
code { background:var(--code); padding:.12em .35em; border-radius:4px;
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  font-size:.88em; overflow-wrap:anywhere; word-break:break-word; }
pre { background:var(--code); padding:.75rem .85rem; border-radius:8px;
  overflow-x:auto; -webkit-overflow-scrolling:touch; }
pre code { background:none; padding:0; white-space:pre; overflow-wrap:normal;
  word-break:normal; }
.tablewrap { overflow-x:auto; -webkit-overflow-scrolling:touch; margin:.9rem 0;
  border:1px solid var(--line); border-radius:8px; }
table { border-collapse:collapse; width:100%; font-size:.92rem; }
th, td { border-bottom:1px solid var(--line); padding:.5rem .6rem;
  text-align:left; vertical-align:top; }
th { background:var(--code); font-weight:700; white-space:nowrap; }
tr:last-child td { border-bottom:none; }
hr { border:none; border-top:1px solid var(--line); margin:2rem 0; }
a { color:var(--acc); overflow-wrap:anywhere; }
strong { color:var(--fg); }
nav.toc { background:var(--code); border:1px solid var(--line); border-radius:8px;
  padding:.35rem .5rem; margin:1rem 0 1.5rem; }
nav.toc summary { cursor:pointer; padding:.55rem .35rem; font-weight:600;
  min-height:44px; display:flex; align-items:center; }
nav.toc ol { list-style:none; margin:.2rem 0 .4rem; padding-left:.35rem; }
nav.toc li { margin:0; }
nav.toc a { display:block; padding:.6rem .35rem; min-height:44px;
  text-decoration:none; border-top:1px solid var(--line); }
nav.toc li:first-child a { border-top:none; }
nav.toc .lvl3 { padding-left:1.2rem; color:var(--dim); font-size:.94rem; }
ul.reports { list-style:none; padding:0; }
ul.reports li { margin:0; border-bottom:1px solid var(--line); }
ul.reports a { display:block; padding:1rem .25rem; min-height:44px;
  text-decoration:none; font-weight:600; }
p.note.stale { color:var(--hi); border:2px solid var(--hi); border-radius:10px;
  padding:.75rem .8rem; background:var(--code); font-size:.97rem; line-height:1.55; }
.note { color:var(--dim); font-size:.9rem; }
/* Counts strip. auto-fit rather than a fixed column count: at 375px it settles
   into two columns without a media query, and widens on its own. */
ul.stats { list-style:none; padding:0; margin:1rem 0 1.25rem; display:grid;
  grid-template-columns:repeat(auto-fit, minmax(9.5rem, 1fr)); gap:.5rem; }
ul.stats li { margin:0; background:var(--code); border:1px solid var(--line);
  border-radius:8px; padding:.65rem .7rem; }
ul.stats .n { display:block; font-size:1.6rem; font-weight:700; line-height:1.1;
  color:var(--acc); }
ul.stats .k { display:block; font-size:.9rem; font-weight:600; margin-top:.15rem; }
ul.stats .h { display:block; font-size:.78rem; color:var(--dim); margin-top:.2rem; }
details.band, details.drift { border:1px solid var(--line); border-radius:8px;
  margin:.6rem 0; background:var(--bg); }
details.band > summary, details.drift > summary { cursor:pointer; font-weight:700;
  padding:.85rem .75rem; min-height:44px; display:flex; align-items:center;
  gap:.5rem; justify-content:space-between; }
details.band > summary .c { background:var(--code); border:1px solid var(--line);
  border-radius:999px; padding:.1rem .55rem; font-size:.85rem; color:var(--fg); }
details.band > *:not(summary), details.drift > *:not(summary) { padding:0 .75rem; }
details.band > p.note { margin-top:0; }
details.band ul { padding-left:1.15rem; }
details.drift { border-color:var(--hi); }
details.drift code { font-weight:700; }
hr + h2 { margin-top:1.2rem; }
h1 { scroll-margin-top:4.5rem; }
.empty { border:1px dashed var(--line); border-radius:8px; padding:1rem; }
`;

/**
 * Wrap rendered body HTML in the full document shell.
 *
 * ⚠ `nav` is passed in rather than hardcoded because the two page kinds need
 * DIFFERENT controls, and the header used to render a back-link on both. On a
 * report that link goes somewhere; on the index it pointed at the page you were
 * already reading, so it did nothing at all. ⛔ A control that does nothing is
 * worse than no control — it is found in the first minute and it teaches the
 * reader that the chrome lies.
 */
/**
 * The shared page shell.
 *
 * ⚠ `style` is an OPTIONAL extra sheet appended after STYLE, for a sibling
 * surface whose rules do not belong in a stylesheet documented as being aimed at
 * long-form prose. It is additive only: callers that omit it get exactly the
 * bytes they got before.
 */
/**
 * ⛔⛔ THE WAY HOME IS EMITTED BY THE SHELL, NEVER BY THE CALLER.
 *
 * Measured before this was written, rather than assumed: FIVE of the eight pages
 * these renderers produce had no route back to the landing page at all — every
 * report page, the reports index, and both deep log pages. The three that did
 * have one carried it as a hand-copied literal in two different files, which is
 * the same second-copy problem in miniature: three places to edit, and the two
 * that were forgotten are the ones nobody notices until they are on a phone with
 * nowhere to go but the back button.
 *
 * ⭐ Emitting it HERE means a page cannot be built without it. A sixth page added
 * next month is covered because it went through this function, not because
 * somebody remembered — which is the only version of "every page" that stays true.
 *
 * ⚠ `atHome` is the single opt-out, and it exists because the landing page
 * linking to itself is a dead control that costs a tap to discover. It is a
 * deliberate flag rather than a title comparison: matching on a page's NAME would
 * silently start or stop working the day that name changed.
 *
 * ⛔ THE BOUNDARY OF WHAT THIS COVERS, STATED SO NOBODY READS MORE INTO IT.
 * This covers every page built on `page()`. It does NOT cover the generated queue
 * board, which builds its own complete document and is served as a static file —
 * measured, not assumed, and named in the guard so "every page" is never read as
 * a claim about that one.
 */
const HOME_LINK = '<a href="/">&#8592; Home</a>';

function page({ title, crumb, body, nav, style, atHome }) {
  const back = atHome === true ? '' : HOME_LINK;
  return `<!doctype html>
<html lang="en"><head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<meta name="robots" content="noindex, nofollow">
<title>${escapeHtml(title)}</title>
<style>${STYLE}${style || ''}</style>
</head><body>
<header class="top">${back}${nav || ''}<span class="name">${escapeHtml(crumb || '')}</span></header>
<main class="wrap">
${body}
</main></body></html>`;
}

/**
 * Build a tappable contents list from the rendered HTML's own headings.
 *
 * ⚠ Derived from the OUTPUT, not from a second parse of the markdown. A separate
 * pass over the source would be a second reader of the same document, free to
 * disagree with the one that produced the page — the anchors would drift from the
 * headings they point at and the contents would quietly stop working.
 */
function buildToc(html) {
  const items = [];
  const withIds = html.replace(/<(h[23])>([\s\S]*?)<\/\1>/g, (m, tag, inner) => {
    const text = inner.replace(/<[^>]*>/g, '').trim();
    if (!text) return m;
    const id = 's' + (items.length + 1);
    items.push({ id, tag, text });
    return `<${tag} id="${id}">${inner}</${tag}>`;
  });
  if (items.length < 3) return { html: withIds, toc: '' };
  const lis = items
    .map(
      it =>
        `<li><a class="${it.tag === 'h3' ? 'lvl3' : ''}" href="#${it.id}">${escapeHtml(it.text)}</a></li>`
    )
    .join('');
  const toc = `<nav class="toc"><details><summary>Contents (${items.length})</summary><ol>${lis}</ol></details></nav>`;
  return { html: withIds, toc };
}

/** Render one report's markdown into a complete page. */
function renderReport(name, markdown) {
  const lines = String(markdown).replace(/\r\n/g, '\n').split('\n');
  // The document's own leading `# ` line becomes the page title rather than a
  // second heading stacked under the one the shell already shows.
  let title = name;
  let start = 0;
  while (start < lines.length && !lines[start].trim()) start++;
  const h1 = /^#\s+(.*)$/.exec(lines[start] || '');
  if (h1) {
    title = h1[1].replace(/[*_`]/g, '').trim();
    start++;
  }
  const rendered = mdToHtml(lines.slice(start));
  const { html, toc } = buildToc(rendered);
  return page({
    title,
    crumb: name,
    // On a report this goes somewhere real: back to the index it was reached from.
    nav: '<a href="/reports/">&#8592; Reports</a>',
    body: `<h1>${escapeHtml(title)}</h1>\n${toc}\n${html}`,
  });
}

/**
 * ⭐ THE BOARD, ORDERED THE WAY THE QUESTION IS ASKED.
 *
 * The brief is "digestible AND fully understandable", and those pull against each
 * other. ⛔ It is NOT solved by hiding: every band is present, with its real
 * count, and nothing is truncated. It is solved by ORDER and by DEFAULT STATE —
 * the bands describing work in motion, and the ones waiting on a decision, are
 * open on first paint; the long inert ones are collapsed but one tap away and
 * still announce their size. A reader sees the shape of the whole thing without a
 * wall of text, and can reach every row without leaving the page.
 *
 * ⚠ The band ORDER here is this surface's own, not the generator's. The board
 * lists bands in the shared status vocabulary's order; a person opening this at
 * 7am wants "what is moving", "what needs me", "what is next" first, and the
 * parked/backlog mass last. Reordering a VIEW is not disagreeing with the source
 * — no row moves band, and no count changes.
 */
const BAND_ORDER = [
  'Active',
  'Attention',
  'Ready',
  'Deferred',
  'Parked',
  'Backlog',
  'UNCLASSIFIED',
];
// ⭐ EVERY BAND STARTS CLOSED — the OWNER'S call, after using the page.
//
// ⚠ This reverses a default that was measured and argued for: Active and
// Attention opened on their own so the actionable work was visible without a tap.
// The measurement behind that is still valid (opening Ready as well put ~156 rows
// and ~28,800px — about thirty-five phone screens — on first paint). What it got
// wrong was the goal. Landing on the page, he wants the SHAPE of the work and a
// way in, not to be handed the first two bands already unrolled; even 70 rows is
// something to scroll past on the way to anything else.
//
// ⛔ CLOSED IS NOT HIDDEN, and that distinction is what makes this safe: every
// band is present, in priority order, with its true count on its own header, and
// one tap from fully listed. The counts strip above answers "how much is left"
// before any band is touched — which was always the part doing the real work.
const BAND_OPEN = new Set();
const BAND_BLURB = {
  Active: 'Being worked on right now.',
  Attention:
    'Flagged ⚠️ on the heading. A flag, not a decision count: the open owner decisions are counted above, from the census, and most of them are not in this band.',
  Ready: 'Specified and unblocked. Could be started next.',
  Deferred: 'Deliberately put off, with a reason.',
  Parked: 'Stopped on purpose. Not abandoned, not scheduled.',
  Backlog: 'Everything else that is filed but not yet in motion.',
  UNCLASSIFIED:
    'Carries no recognised status — worth a look precisely because nothing could file it.',
};

/** Split the generated board into its `## ` sections, preserving body lines. */
function splitSections(md) {
  const out = [];
  let cur = null;
  for (const line of String(md).replace(/\r\n/g, '\n').split('\n')) {
    const h = /^##\s+(.*)$/.exec(line);
    if (h) {
      cur = { heading: h[1].trim(), lines: [] };
      out.push(cur);
    } else if (cur) {
      cur.lines.push(line);
    }
  }
  return out;
}

/** `## ⏭️ Ready (43)` → {label:'Ready', count:43}; `## ⬜ Backlog — 187 items` too. */
function bandOf(heading) {
  const paren = /^(.*?)\s*\((\d+)\)\s*$/.exec(heading);
  const dash = /^(.*?)\s*—\s*(\d+)\s+items?\s*$/.exec(heading);
  const m = paren || dash;
  if (!m) return null;
  const label = m[1].replace(/[\p{Extended_Pictographic}️‍]/gu, '').trim();
  return { label, count: Number(m[2]) };
}

const DONE_MARK = String.fromCodePoint(0x2705);

/**
 * Count items that LEAD with the done-mark while still filed in the open queue,
 * across the WHOLE queue — or report that it could not be measured.
 *
 * ⭐ The two rules this needs already exist and are both imported rather than
 * restated: the queue parser (which resolves an item's status from its EARLIEST
 * glyph, so "leads with" falls out of it) and `closedDiscipline` from the board
 * generator, which the commit-time guard uses for the same question. Retyping
 * either would create a second answer to one question.
 *
 * @returns {{observable: true, count: number, ids: string[], total: number}
 *          |{observable: false, why: string}}
 */
function closedOverWholeQueue(queueMd) {
  if (typeof queueMd !== 'string' || !queueMd.trim()) {
    return { observable: false, why: 'the queue itself is not readable from here' };
  }
  try {
    // Required lazily: this is the only place the board generator is needed, and
    // it must not become a load-time dependency of the renderer.
    const { parseQueue } = require('./queue-view.js');
    const { closedDiscipline } = require('./roadmap-generate.js');
    const items = parseQueue(queueMd).blocks.filter(b => b.type === 'item' && b.id);
    if (!items.length) {
      return { observable: false, why: 'the queue parsed to no items' };
    }
    const r = closedDiscipline(items);
    return {
      observable: true,
      count: r.total,
      ids: [...r.proved, ...r.violations].map(x => x.id),
      total: items.length,
    };
  } catch (e) {
    return { observable: false, why: 'the queue could not be parsed (' + e.message + ')' };
  }
}

/**
 * Render the board — the body of the `/queue` page.
 * @param {string} md   the generated board, read fresh
 * @param {Date}   when when it was last regenerated
 */
function renderRoadmapSection(md, when, queueMd, census) {
  // ⛔ Required here, not at module load, for the same reason as the rule above:
  // this is the only place the board generator is needed, and importing it is how
  // one definition of "does the board match the queue" stays one definition.
  const { boardCurrency } = require('./roadmap-generate.js');
  const sections = splitSections(md);
  const bands = new Map();
  for (const s of sections) {
    const b = bandOf(s.heading);
    if (b) bands.set(b.label, { ...b, lines: s.lines });
  }

  // ⭐ "HOW MUCH IS LEFT" IS THE QUESTION, so the numbers answer it directly.
  const n = k => (bands.get(k) ? bands.get(k).count : 0);
  // ⛔ The board's LISTED rows are deliberately no longer scraped here. That scrape
  // existed only to feed the honesty tile, and feeding it from the board was the
  // defect: the backlog is a count rather than a list, so a third of the items were
  // never inspected. The tile reads the whole queue instead. Nothing else wanted
  // these rows, so collecting them would now be work whose only product is a
  // shorter denominator.
  // ⚠ DERIVED FROM THE BOARD, AND ITS SCOPE IS STATED. These are rows whose own
  // text already reports finished work while the row is still filed as open —
  // the board disagreeing with reality. It can only be counted over LISTED rows:
  // the backlog is a count on this board, not a list, so its rows cannot be
  // inspected here and are honestly excluded rather than guessed at.
  // ⭐⭐ FINISHED-BUT-STILL-OPEN — computed over the WHOLE queue, or not at all.
  //
  // ⛔ THIS TILE HAD TWO DEFECTS AT ONCE, and both are the same disease this page
  // exists to treat.
  //
  //  1. A CENSORED DENOMINATOR. It counted over the board's LISTED rows — about a
  //     third of the items — because the backlog is a count here rather than a
  //     list. The exclusion was declared honestly in a hint string, and nobody
  //     reads a hint string. ⚠ A shrunken denominator reads exactly like good
  //     news, and a censored one inside the single metric whose job is measuring
  //     honesty is the sharpest possible version of the problem.
  //  2. THE PREDICATE DID NOT MEASURE THE LABEL. It tested whether a heading
  //     CONTAINS the done-mark. Measured on the live file, headings that contain
  //     it are mostly NOT finished items: they record a state change
  //     (`UNPARKED`, `UNBLOCKED`, `trigger has FIRED`) or a genuinely closed HALF
  //     of a still-open item. Only a heading that LEADS with the mark is a closed
  //     item, and a naive contains-test was wrong about half the time.
  //
  // ⭐ THE CORRECT RULE IS NOT RETYPED HERE. It already exists as `closedDiscipline`
  // in the board generator, is enforced on every commit, and is imported — because
  // a second copy of a rule is how two counts of one thing begin to disagree.
  //
  // ⛔ AND IF THE WHOLE SET CANNOT BE READ, THIS PRINTS `UNOBSERVABLE` RATHER THAN
  // A SMALLER NUMBER. A metric that cannot see its whole subject must not print an
  // integer.
  const closed = closedOverWholeQueue(queueMd);
  const inMotion = n('Active') + n('Ready');
  const total = [...bands.values()].reduce((a, b) => a + b.count, 0);

  const stat = (v, label, hint) =>
    `<li><span class="n">${v}</span><span class="k">${escapeHtml(label)}</span>` +
    (hint ? `<span class="h">${escapeHtml(hint)}</span>` : '') +
    `</li>`;

  // ⛔ EVERY LABEL STATES THE QUESTION IT ACTUALLY ANSWERS. None of these numbers
  // was ever wrong; one of them was wearing the wrong question. `before it is done`
  // read as the answer to "how much is left" while measuring active + ready —
  // a WORKLOAD measure under a COMPLETION label. Measured against what finishing
  // actually requires, it was wrong in BOTH directions at once: it omitted most of
  // the required work (which sits in the backlog) and included work that is not
  // required at all. A number wrong in both directions, under a label stating the
  // project's central question, is worse than no number — so it now says what it
  // measures and nothing more.
  // ⛔⛤ "NEED YOU" USED TO PRINT THE SIZE OF THE ⚠️ BAND. The parser assigns the band
  // from the heading glyph and consults no text, so the number was "how many items
  // lead with ⚠️" wearing the label "how many decisions are waiting on you".
  // Measured 2026-09-03 on the live board: 16 in the band, of which the project's
  // own census counted 2 as open owner decisions; the census's total was 29. Wrong
  // in both directions at once, under the one label the owner reads to decide
  // whether to act. ⭐ The fix is to MEASURE WHAT THE LABEL SAYS: the number now
  // comes from the planning tree's owner-decision census (item DD1, OD-RULE v1 —
  // a declared set cross-checked against the live parser), printed as the
  // FRACTION that rule requires, with the rule named and the date the declared
  // set was last edited, so the number expires visibly. The ⚠️ band keeps its
  // count under its honest name. ⛔ A census that cannot be run prints
  // UNOBSERVABLE with the reason — never 0, never the band's size again.
  const cz = census || { observable: false, why: 'no census was handed to the renderer' };
  const editedStamp =
    cz.observable && cz.editedAt ? String(cz.editedAt.toISOString()).slice(0, 10) : null;
  const censusHint = cz.observable
    ? `${cz.rule}: declared in the census, cross-checked open on the board · declared set last edited ${editedStamp || 'unknown'}` +
      (cz.closedSince ? ` · ⛔ ${cz.closedSince} declared row(s) no longer open` : '') +
      (cz.undeclared ? ` · ⚠ ${cz.undeclared} owner-shaped heading(s) not yet declared` : '')
    : `not measured — ${cz.why}`;
  const counts =
    `<ul class="stats">` +
    stat(n('Active'), 'being worked on now', 'started, not finished') +
    stat(
      cz.observable ? `${cz.count} of ${cz.total}` : 'UNOBSERVABLE',
      'need you — open owner decisions',
      censusHint
    ) +
    stat(
      n('Attention'),
      'flagged ⚠️',
      'the Attention band — a flag on the heading, not a decision count'
    ) +
    stat(n('Ready'), 'startable now', 'specified and unblocked') +
    stat(inMotion, 'startable or in flight', 'active + ready — a workload, not a finish line') +
    stat(
      n('Backlog') + n('Parked') + n('Deferred'),
      'filed for later',
      'backlog, parked and deferred'
    ) +
    stat(
      closed.observable ? closed.count : 'UNOBSERVABLE',
      'finished but still filed as open',
      closed.observable
        ? 'headings that LEAD with the done-mark, across all ' + closed.total + ' items'
        : 'not counted over the whole queue, so no number is shown — ' + closed.why
    ) +
    `</ul>`;

  const disagreeList =
    closed.observable && closed.count
      ? `<details class="drift"><summary>Which ${closed.count} of ${closed.total}</summary>` +
        `<ul>${closed.ids.map(id => `<li><code>${escapeHtml(id)}</code></li>`).join('')}</ul>` +
        `<p class="note">Each of these leads with the done-mark while still filed in the open queue. ` +
        `Read across every item, not only the ones this board lists.</p></details>`
      : '';

  // The owner asked for a MONITOR, and a number he cannot open is a number he
  // cannot check. Every declared decision is listed with its tier and the
  // evidence phrase the census carries for it, so a stale row is visible at a
  // glance rather than buried in a count.
  const decisionList =
    cz.observable && cz.rowsObservable && cz.rows.length
      ? `<details class="drift"><summary>Which ${cz.rows.length} of ${cz.total} — the declared open owner decisions</summary>` +
        `<ul>${cz.rows
          .map(
            r =>
              `<li><code>${escapeHtml(r.id)}</code> <span class="c">${escapeHtml(r.tier)} · ${escapeHtml(r.status)}</span> — ${escapeHtml(r.evidence)}</li>`
          )
          .join('')}</ul>` +
        `<p class="note">Declared in the planning tree's census with an evidence phrase each; the census ` +
        `re-checks on every run that the item is still open on the board. A ruled decision whose row ` +
        `was not removed still appears here — that is the list to prune, not a number to trust.</p></details>`
      : cz.observable && !cz.rowsObservable
        ? `<p class="note stale">⛔ The census reported a count but its row list could not be read; the number above stands, the names do not.</p>`
        : '';

  const bandHtml = BAND_ORDER.filter(k => bands.has(k))
    .map(k => {
      const b = bands.get(k);
      const open = BAND_OPEN.has(k) && b.count > 0 ? ' open' : '';
      return (
        `<details class="band"${open}><summary>${escapeHtml(k)} <span class="c">${b.count}</span></summary>` +
        `<p class="note">${escapeHtml(BAND_BLURB[k] || '')}</p>` +
        mdToHtml(b.lines) +
        `</details>`
      );
    })
    .join('\n');

  const stamp = when
    ? `${when.getFullYear()}-${String(when.getMonth() + 1).padStart(2, '0')}-${String(when.getDate()).padStart(2, '0')} ${String(when.getHours()).padStart(2, '0')}:${String(when.getMinutes()).padStart(2, '0')}`
    : 'unknown';

  // ── ⛔⛤ CURRENCY LEADS, AND IT IS A DIFFERENT FACT FROM THE REBUILD TIME ──
  //
  // This line used to read "N items on the board. Rebuilt <time> — read fresh from
  // the file every time this page loads, never cached." ⚠ Every word of that is
  // TRUE and none of it answers the question the reader is asking. It reports when
  // the FILE was written and how fresh the READ was; the reader hears "this is the
  // current picture". ⛔⛔ Measured 2026-09-01: the board was 59 items stale — 307
  // rendered against 366 live — and this page said exactly that sentence, in that
  // tone, for days, to somebody who was looking straight at it.
  //
  // ⭐ The comparison is FREE here: the whole queue is already read for the honesty
  // tile, so this costs one hash of a string that is in hand.
  //
  // ⚠ THE CEILING TRAVELS WITH THE CLAIM. This asks the FINGERPRINT question —
  // was the board built from this queue — not the stronger one `npm run
  // roadmap:check` asks, which rebuilds and compares byte for byte and costs too
  // much for a page load. So the page says which question it asked, rather than
  // borrowing the credibility of the answer it did not compute.
  const currency = boardCurrency(md, queueMd);
  const currencyLine = !currency.known
    ? `<p class="note stale">⛔ <strong>Whether this board is up to date could not be established.</strong> ` +
      `Either the queue could not be read from here or the board carries no source fingerprint, so ` +
      `nothing on this page can tell you whether it matches. That is not the same as it being fine. ` +
      // ⭐ The rebuild stamp is still a TRUE fact and is still shown — it just no
      // longer stands in for a currency it never established.
      `The ${total} item${total === 1 ? '' : 's'} below were rendered <strong>${escapeHtml(stamp)}</strong>.</p>`
    : currency.current
      ? `<p class="note">${total} item${total === 1 ? '' : 's'} on the board, and it was built from the queue as it reads ` +
        `right now. Rebuilt <strong>${escapeHtml(stamp)}</strong>, and re-read from the file on every ` +
        `visit — nothing here is cached. (Checked by comparing the board's recorded source ` +
        `fingerprint against the live queue; <code>npm run roadmap:check</code> does the stronger ` +
        `comparison and rebuilds the whole thing.)</p>`
      : `<p class="note stale">⛔ <strong>THIS BOARD IS OUT OF DATE.</strong> The queue has changed ` +
        `since this was built <strong>${escapeHtml(stamp)}</strong>, so anything added, closed or ` +
        `re-ordered since then is <strong>not on this page</strong> — and a stale board reads exactly ` +
        `like a current one, which is why this says so instead of leaving you the timestamp to ` +
        `interpret. The ${total} item${total === 1 ? '' : 's'} below are as they stood then. Run <code>npm run roadmap</code>.</p>`;

  return (
    `<h1 id="queue">The queue</h1>` +
    currencyLine +
    counts +
    decisionList +
    disagreeList +
    `<h2>The whole board</h2>` +
    `<p class="note">Every band is here with its real count. The ones in motion open on their own; ` +
    `the rest are one tap away — nothing is hidden or shortened.</p>` +
    bandHtml
  );
}

/**
 * `/queue` — the board, and ONLY the board.
 *
 * ⭐ OWNER RULING 2026-09-03: the queue and the reports are two pages, not one page
 * with a jump menu. They used to share `/reports`, with the board as the headline
 * and the report list underneath; the jump menu existed only to get past the
 * board, and it goes with the split. "What needs you" is the Attention count and
 * band on this page — it is not duplicated anywhere else.
 */
function renderQueue(board, queueMd, census) {
  const body = board
    ? renderRoadmapSection(board.text, board.mtime, queueMd, census)
    : `<h1 id="queue">The queue</h1><div class="empty"><p><strong>No board is reachable from this checkout.</strong></p>
<p class="note">The board is generated into the private planning tree, which a public clone does not
have. That is the normal state, not an error.</p></div>`;
  return page({ title: 'Queue', crumb: '', body });
}

/**
 * `/reports` — the report list, and ONLY the list. Newest first, as the resolver
 * hands them over. No board, no counts, no jump menu.
 */
function renderReportsIndex(names, note) {
  const list = names.length
    ? `<ul class="reports">${names
        .map(n => `<li><a href="/reports/${encodeURIComponent(n)}">${escapeHtml(n)}</a></li>`)
        .join('')}</ul>`
    : `<div class="empty"><p><strong>No reports are reachable from this checkout.</strong></p>
<p class="note">The reports live outside this repository by design, so a checkout without the private
sibling has nothing to show here. That is the normal state, not an error.</p></div>`;
  return page({
    title: 'Reports',
    crumb: '',
    body: `<h1 id="reports">Reports</h1>\n${list}\n<p class="note">${escapeHtml(note || '')}</p>`,
  });
}

/** The 404 page — deliberately says nothing about what does exist. */
function renderNotFound() {
  return page({
    title: 'Not found',
    crumb: '',
    body: `<h1>Not found</h1><p>No report by that name.</p>`,
  });
}

module.exports = {
  renderReport,
  renderQueue,
  renderReportsIndex,
  renderNotFound,
  page,
  escapeHtml,
  buildToc,
  // ⭐ Exported so the suite drives the REAL derivation rather than a restatement
  // of it — a test that retypes the rule only ever proves the retyped copy.
  closedOverWholeQueue,
};
