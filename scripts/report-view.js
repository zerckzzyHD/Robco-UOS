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
  color:var(--acc); overflow-wrap:anywhere; }
/* ⛔⛤ A WORD-VALUED TILE IS NOT A BIG NUMBER, and setting it like one pushed the
   whole page sideways. "UNOBSERVABLE" at 1.6rem measures 196px; a tile's content
   box at 375px is 142px, the grid column cannot shrink below its 9.5rem minimum,
   and an unbreakable word therefore forced the DOCUMENT to 400px against a 375px
   viewport — a phone-wide horizontal scroll on every page that could not measure
   something. ⚠ Measured 2026-09-05, and it appeared the moment UNOBSERVABLE became
   a COMMON value rather than a rare one: the degradation path is the path this page
   is now most often on, so its layout has to be as sound as the happy one. The
   The overflow-wrap above is the backstop; this rule is the actual fix — a word gets
   word-sized type and stays inside its tile. */
ul.stats .n.word { font-size:1rem; letter-spacing:.03em; line-height:1.25;
  padding:.28rem 0 .1rem; }
/* The project filter. Chips scroll horizontally on a phone rather than wrapping
   into a block that pushes the board off the first screen. */
.pfilter { display:flex; gap:.4rem; overflow-x:auto; -webkit-overflow-scrolling:touch;
  padding:.3rem 0 .5rem; margin:.6rem 0 0; }
.pchip { flex:0 0 auto; min-height:40px; background:var(--code); color:var(--fg);
  border:1px solid var(--line); border-radius:999px; padding:.3rem .8rem;
  font:inherit; font-size:.85rem; font-weight:600; cursor:pointer; }
.pchip[aria-pressed="true"] { border-color:var(--acc); color:var(--acc); }
.pchip .c { opacity:.7; font-weight:400; }
.bandcounts, .pop { display:none; }
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
/* ── Item rows (the queue-sourced board) ─────────────────────────────────────
   One row per item, one line when it fits: id · title · chips. The row is a
   <details> so the body is one tap away without leaving the page — the body
   itself is fetched on first open (2.7MB of bodies cannot ride along inline). */
.rows { margin:0 0 .5rem; }
details.item { border:none; border-top:1px solid var(--line); border-radius:0;
  margin:0; background:none; }
details.item > summary { display:flex; flex-wrap:wrap; gap:.3rem .5rem;
  align-items:baseline; padding:.55rem .1rem; min-height:40px; cursor:pointer;
  font-weight:400; }
details.item > summary code { font-weight:700; }
details.item .t { flex:1 1 12rem; font-size:.92rem; line-height:1.35; }
details.item .ibody { padding:.15rem .4rem .7rem; font-size:.92rem; }
details.item .ibody p { margin:.4rem 0; }
.chip { display:inline-block; border:1px solid var(--line); border-radius:999px;
  padding:.02rem .45rem; font-size:.72rem; color:var(--dim); white-space:nowrap; }
.chip.m { color:var(--hi); border-color:var(--hi); font-weight:700; }
.chip.s { font-style:italic; }
details.band > summary .g { margin-left:auto; opacity:.8; }
/* The landed-not-confirmed watch list — the overnight run's own states, kept
   above the fold because they are what the owner is actually watching. */
section.watch { border:2px solid var(--acc); border-radius:10px;
  padding:.4rem .75rem .6rem; margin:1rem 0; }
section.watch h2 { margin:.4rem 0 .2rem; font-size:1.05rem; }
section.watch h2 .c { background:var(--code); border:1px solid var(--line);
  border-radius:999px; padding:.1rem .55rem; font-size:.85rem; }
section.watch ul { list-style:none; padding:0; margin:.3rem 0 .2rem; }
section.watch li { padding:.45rem 0; border-top:1px solid var(--line);
  font-size:.92rem; }
section.watch li:first-child { border-top:none; }
article.qitem h1 { font-size:1.15rem; line-height:1.4; }
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
</main>
<script>
/* ⭐ THE ONLY SCRIPT ON THIS PAGE. It hides rows, it LOOKS UP numbers, and it
   FETCHES an item's body from this same origin when a row is opened; it never
   computes a number. Every (band × project) figure was derived on the server, over
   the whole queue, and handed here as data — so the number a reader sees under a
   filter is the same derivation as the number they saw without one.

   ⛔⛤ AN EARLIER VERSION DID THE ARITHMETIC HERE, and that is the defect the owner
   found on his phone: it counted the RENDERED rows in each band while the band's
   headline came from the server over a different set, so tapping a pill moved a
   small caption and left the big number alone. Two numbers of different sets on one
   row, and the readable one did not answer him.

   ⚠ THREE-VALUED: a band with no entry in the map shows a question mark under a filter rather
   than a number the page cannot stand behind, and its unfiltered value is restored
   from the data-all attribute — also a lookup.

   ⚠ Degrades to nothing: with JS off every row stays visible and every band shows
   its unfiltered count, which is the honest failure. */
(function () {
  var chips = document.querySelectorAll('.pchip');
  if (!chips.length) return;
  var box = document.querySelector('.bandcounts');
  var counts = null;
  try {
    counts = box ? JSON.parse(box.dataset.counts) : null;
  } catch (e) {
    counts = null; /* unreadable data is not a reason to invent numbers */
  }
  var rows = document.querySelectorAll('[data-p]:not(.pchip)');
  chips.forEach(function (chip) {
    chip.addEventListener('click', function () {
      var want = chip.dataset.p;
      chips.forEach(function (c) {
        c.setAttribute('aria-pressed', String(c === chip));
      });
      rows.forEach(function (r) {
        r.hidden = !!want && r.dataset.p !== want;
      });
      document.querySelectorAll('details.band').forEach(function (d) {
        var cell = d.querySelector('summary > .c');
        if (!cell) return;
        if (!want) {
          cell.textContent = d.dataset.all;
          return;
        }
        var band = counts && counts[d.dataset.band];
        /* ⛔ No fallback to a row count. If the server did not hand over a figure
           for this band, the page says so rather than substituting a different
           question's answer, which is exactly how this row came to hold two. */
        var v = band ? band[want] : null;
        cell.textContent = typeof v === 'number' ? String(v) : band ? '0' : '?';
      });
    });
  });
})();
/* ── Lazy item bodies ─────────────────────────────────────────────────────────
   2.7MB of item bodies cannot ride along in the page, so a row's body is fetched
   from /queue/item/(id)?frag=1 — the SAME ref-read source, rendered by the same
   renderer — the first time that row is opened. Degrades to a link: the
   "Open the full item" anchor is server-rendered inside every row, and a failed
   fetch simply leaves it standing. With JS off, every row still reaches its item. */
(function () {
  document.querySelectorAll('details.item').forEach(function (d) {
    d.addEventListener('toggle', function () {
      if (!d.open) return;
      var box = d.querySelector('.ibody[data-id]');
      if (!box || box.dataset.loaded) return;
      box.dataset.loaded = '1';
      fetch('/queue/item/' + encodeURIComponent(box.dataset.id) + '?frag=1')
        .then(function (r) {
          if (!r.ok) throw new Error(String(r.status));
          return r.text();
        })
        .then(function (t) {
          box.innerHTML = t;
        })
        .catch(function () {
          /* the server-rendered link inside the box stays — the honest fallback */
        });
    });
  });
})();
</script>
</body></html>`;
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
  // ⭐ QUESTION SITS WITH THE OWNER-FACING BANDS, not in the filed-for-later mass:
  // an open question is a decision surface, and the owner reads this page top-down.
  'Question',
  // ⭐ `To-do`, BY ITS OWN NAME (owner, 2026-09-07: "the 'backlog' sections don't
  // even make sense"). `Backlog` was the BOARD DOCUMENT's deliberate local rename
  // of this same band (roadmap-generate.js BACKLOG_LABEL, Suite 248.8b) and it
  // reached this page only while the page scraped the board's headings. The
  // sections come from the queue's own status vocabulary now, so the band wears
  // the vocabulary's label. `Backlog` survives in this list solely for the
  // DEGRADED path — the board-scrape rendering used when the queue itself cannot
  // be read — because that path's headings still say it.
  'To-do',
  'Deferred',
  'Parked',
  'Backlog',
  // ⛔⛤ SETTLED WAS COUNTED AND NEVER SHOWN. It is in `bands`, so its 6 items were
  // inside this page's item total and inside every band-derived figure, while the
  // band itself was absent from this list and therefore never rendered. ⚠ That is
  // the defect this page keeps being rebuilt for, in its quietest form: a number
  // whose rows you cannot open. And it matters most for THIS band — the status
  // vocabulary's own note says a settled item is a LIVE CONSTRAINT on the items
  // that depend on it, and "a constraint nobody sees stops constraining".
  'Settled',
  // ⚠ Done renders only when it holds items — a heading that LEADS with ✅ is a
  // discipline violation (QR1 Part D) already counted by the honesty tile, and the
  // band exists so those rows are openable rather than a number with no list.
  'Done',
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
  Question: 'An open question — a decision surface, not filed work.',
  'To-do': 'Filed and waiting. Not started, not blocked — every item is listed here.',
  Deferred: 'Deliberately put off, with a reason.',
  Parked: 'Stopped on purpose. Not abandoned, not scheduled.',
  Backlog: 'Everything else that is filed but not yet in motion.',
  Settled:
    'Answered for good, no work will follow — kept visible because it still constrains the items that depend on it.',
  Done: '⛔ A heading that LEADS with the done-mark while still filed in the open queue — closed items belong in QUEUE_LOG.md, so anything here is drift.',
  UNCLASSIFIED:
    'Carries no recognised status — worth a look precisely because nothing could file it.',
};

/**
 * ── ⛔⛤ THE POPULATION A NUMBER COUNTS OVER — the guard-blindness this closes ──
 *
 * The provenance rule (see `stat`) makes every number name its SOURCE. It does not
 * make two numbers standing next to each other name the same POPULATION, and that
 * gap produced every defect on this page in one evening — each time two numbers
 * that were individually correct and individually sourced, placed adjacently as if
 * comparable:
 *
 *   · the band pill (board minus someday) beside a caption counting rendered rows
 *     with someday still in them — the owner found this on his phone;
 *   · a project pill over all 411 items beside the bands it controls over 352 —
 *     introduced by the FIRST fix for the line above, an hour earlier;
 *   · 352 on the board beside 411 in the Horizon section, related nowhere, which
 *     invited a reader to subtract them and call the difference a defect;
 *   · 168 bold-led bullets beside 160 tagged rows.
 *
 * ⭐ A READER SUBTRACTS ADJACENT NUMBERS. That is not a misuse of the page, it is
 * what a grid of figures is for — so two numbers over different populations may
 * only sit together when the page SAYS they do not share one.
 *
 * The token is short and stable because it is compared, never displayed raw:
 */
const POPULATIONS = {
  /** Every ID-bearing item the queue holds, someday included. The Horizon axis's own denominator. */
  QUEUE: 'queue',
  /** The board after the someday rule — the denominator of every band and band-derived total. */
  BOARD: 'board',
  /** Rows of BLOCKER-GRAPH.json classified to the owner, someday excluded. Not a board count. */
  OWNER: 'owner-graph',
  /** The planning tree's declared owner-decision roster — a hand-kept set, its own population. */
  CENSUS: 'census-roster',
  /** Items whose heading leads with the done-mark, counted across the whole queue. */
  CLOSED: 'closed-scan',
};

/**
 * Groups of numbers a reader will read as comparable, and whether each group is
 * honest about its populations.
 *
 * ⭐ RUN OVER THE RENDERED HTML, not over the intent that produced it. A check that
 * reads the renderer's variables proves the renderer meant well; this proves what
 * the page actually shows — the same reason `buildToc` derives from the output.
 *
 * A group is a `ul.stats` strip (tiles sit in a grid and a grid invites comparison)
 * or the filter-pill strip paired with the band headers it controls. A group that
 * mixes populations is a VIOLATION unless the page carries a `popmix` statement for
 * it, naming what does not match.
 *
 * @returns {{groups:Array, violations:Array}} violations non-empty ⇒ the page is
 *   presenting a comparison it has not earned.
 */
function comparabilityReport(html) {
  const s = String(html || '');
  const groups = [];
  const violations = [];

  // 1. every tile strip
  // ⚠ `[^>]*` — the FIRST version of this required the tag to end straight after
  // the class, and the strips carry a `data-strip` id. It matched nothing, found no
  // groups, and reported ZERO VIOLATIONS: a guard that passed by not looking.
  // Caught within minutes only because the group list printed empty.
  for (const m of s.matchAll(/<ul class="stats"([^>]*)>([\s\S]*?)<\/ul>/g)) {
    // ⚠ Split per tile and look INSIDE it. The token sits on the tile's own source
    // line rather than on its `<li>`, because twenty-plus existing assertions locate
    // a tile by the exact literal `<li><span class="n` — putting it on the element
    // broke every one of those locators while leaving their claims untouched, and
    // widening them would have been editing checks so this change could pass.
    const chunks = m[2].split(/<li\b/).slice(1);
    const tiles = chunks.length;
    const pops = chunks.map(c => (/data-pop="([^"]*)"/.exec(c) || [])[1]).filter(Boolean);
    // ⛔ The id comes from the MARKUP, never a counter. A positional id would
    // renumber every strip the moment one was added, silently re-pointing each
    // statement at a different group.
    const id = (/data-strip="([^"]*)"/.exec(m[1]) || [])[1] || 'strip-UNNAMED';
    // ⚠ A tile with NO population is worse than a mixed strip: it cannot even be
    // checked, and it reads as belonging to whatever surrounds it.
    const untagged = tiles - pops.length;
    const distinct = [...new Set(pops)];
    const stated = new RegExp('class="note popmix" data-for="' + id + '"').test(s);
    const g = { id, kind: 'stats', tiles, pops: distinct, untagged, stated };
    groups.push(g);
    if (untagged > 0) violations.push({ ...g, why: 'tiles carry no population token' });
    else if (distinct.length > 1 && !stated)
      violations.push({ ...g, why: 'one strip mixes populations and the page does not say so' });
  }

  // 2. the filter pills against the band headers they drive — the pair that broke
  //    an hour after the first fix, and the reason this is not only about strips.
  const pillPop = (/<div class="pfilter"[^>]*data-pop="([^"]*)"/.exec(s) || [])[1];
  const bandPops = [...s.matchAll(/<details class="band"[^>]*data-pop="([^"]*)"/g)].map(x => x[1]);
  if (pillPop || bandPops.length) {
    const distinct = [...new Set([pillPop, ...bandPops].filter(Boolean))];
    const stated = /class="note popmix" data-for="pill-band"/.test(s);
    const g = { id: 'pill-band', kind: 'control', pops: distinct, stated };
    groups.push(g);
    if (!pillPop || !bandPops.length)
      violations.push({
        ...g,
        why: 'the control or the bands it drives carry no population token',
      });
    else if (distinct.length > 1 && !stated)
      violations.push({
        ...g,
        why: 'the filter control counts a different population from the bands it filters, unstated',
      });
  }
  // ⛔⛤ AN EMPTY CHECK IS NOT A CLEAN ONE. This function's own first version
  // matched no strips and returned zero violations, which reads identically to a
  // page that is fully honest. Finding nothing to check is now itself the finding —
  // the same rule the page applies to every number it prints.
  if (!groups.length) {
    violations.push({
      id: 'self',
      kind: 'positive-control',
      why: 'the report found NO comparable groups at all — it checked nothing, which is not the same as finding nothing wrong',
    });
  }
  return { groups, violations };
}

/**
 * What each CP-RULE v1 domain actually contains, in the owner's own words for the
 * axis he asked for — including, where they differ, the fact that they differ.
 * ⛔ A blurb never renames a domain into a project it is not: CP is not "the control
 * plane" alone, it is the control plane AND the harness, and saying so on the tile is
 * the only thing that stops the label being read as the six-value axis.
 */
const PROJECT_BLURB = {
  APP: 'RobCo the app — this repo',
  'CONTROL-PLANE': 'the deterministic control plane',
  HARNESS: 'the harness — ⭐ its own value now, no longer folded into the control plane',
  MIST: 'Mist',
  MUSEUM: 'the museum / exhibit publication programme',
  BINDER: 'Binder — ⭐ it has a bucket now; a value with one row is still a value',
  UNKNOWN:
    '⚠ not placed: either a reader looked and the text does not settle it, or the only basis was a keyword match — see below',
  UNSET: 'no source has said anything about this item',
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
 * ── THE TWO NEW AXES, derived over the WHOLE queue ──────────────────────────
 *
 * `sources` carries what `planning-paths.js` resolved: the archive's item-format
 * grammar (the horizon vocabulary + accept-block parser), the blocker graph (the
 * owner axis), and the domain census (the project axis). Each is independently
 * three-cased, so one unreachable source degrades ONE axis rather than the page.
 *
 * ⛔ Derived HERE and not in the generator, deliberately: the board prints its
 * Backlog as a count rather than a list, so an axis computed from the board's rows
 * would silently cover about a third of the items. The queue is already in hand on
 * this route, so every count below is over all of it or is not printed.
 */
function boardAxes(queueMd, sources) {
  const s = sources || {};
  const out = {
    horizons: { observable: false, why: 'no queue was handed to the renderer' },
    projects: { observable: false, why: 'no queue was handed to the renderer' },
    bandCounts: { observable: false, why: 'no queue was handed to the renderer' },
    owner: { observable: false, why: 'no queue was handed to the renderer' },
    someday: { applied: false, byBand: new Map() },
    bandLabelOf: new Map(),
  };
  if (typeof queueMd !== 'string' || !queueMd.trim()) return out;
  try {
    const QV = require('./queue-view.js');
    const RG = require('./roadmap-generate.js');
    const A = require('./board-axes.js');
    const items = QV.parseQueue(queueMd).blocks.filter(b => b.type === 'item' && b.id);
    if (!items.length) {
      out.horizons = { observable: false, why: 'the queue parsed to no ID-bearing items' };
      out.projects = out.horizons;
      out.owner = out.horizons;
      return out;
    }
    const fmt = s.itemFormat && s.itemFormat.observable ? s.itemFormat.mod : null;
    const graph = s.graph && s.graph.observable ? s.graph.graph : null;
    const vocab = s.axisVocabulary && s.axisVocabulary.observable ? s.axisVocabulary : null;
    // ⛔ BOTH SOURCES, always. The accept block is the authored value; the graph
    // carries the board-wide assignment. Reading only the first is how this page
    // printed SOMEDAY-IF 0 against a board with 55 of them.
    out.horizons = A.readHorizons(items, {
      fmt,
      graph,
      vocabulary: vocab ? vocab.HORIZONS : null,
    });
    out.projects = A.readProjects(items, {
      graph,
      vocabulary: vocab ? vocab.PROJECTS : null,
    });
    if (!out.horizons.observable && s.itemFormat && s.itemFormat.why && !graph) {
      out.horizons.why = s.itemFormat.why;
    }
    const bands = A.bandById(queueMd, QV, RG.bandOfHeading);
    // band KEY → this page's display LABEL. ⚠ Built BEFORE the two derivations
    // below, both of which key off the label — populating it afterwards silently
    // filed every item under UNCLASSIFIED.
    //
    // ⭐ THE LABEL IS THE VOCABULARY'S OWN, `To-do` INCLUDED (owner, 2026-09-07:
    // "the 'backlog' sections don't even make sense"). `Backlog` was never a
    // state — it is the BOARD DOCUMENT's deliberate local override of the shared
    // vocabulary's `To-do` (roadmap-generate.js BACKLOG_LABEL, pinned by Suite
    // 248.8b), and it leaked onto this page only because this page used to scrape
    // the board's headings for its sections. The sections are the queue's own
    // states now, so every label comes straight from parser.STATUSES.
    for (const st of QV.STATUSES) {
      out.bandLabelOf.set(st.key, st.label);
    }
    out.someday = A.somedayByBand(out.horizons, bands);
    out.bandCounts = A.bandProjectCounts(items, bands, out.bandLabelOf, out.projects, out.horizons);
    const byId = new Map(items.map(i => [i.id, i]));
    out.owner = A.readOwnerAxis(
      s.graph && s.graph.observable ? s.graph.graph : null,
      byId,
      out.horizons
    );
    if (!out.owner.observable && s.graph && s.graph.why) out.owner.why = s.graph.why;
    out.total = items.length;
  } catch (e) {
    const why = 'the axes could not be derived (' + e.message + ')';
    out.horizons = { observable: false, why };
    out.projects = { observable: false, why };
    out.owner = { observable: false, why };
  }
  return out;
}

/**
 * Render the board — the body of the `/queue` page.
 * @param {string} md   the generated board, read fresh
 * @param {Date}   when when it was last regenerated
 */
function renderRoadmapSection(md, when, queueMd, census, sources) {
  // ⛔ Required here, not at module load, for the same reason as the rule above:
  // this is the only place the board generator is needed, and importing it is how
  // one definition of "does the board match the queue" stays one definition.
  const RG = require('./roadmap-generate.js');
  const { boardCurrency } = RG;
  const QV = require('./queue-view.js');
  // Both new axes, over the whole queue. Independently three-cased: one
  // unreachable source degrades one axis, never the page.
  const axes = boardAxes(queueMd, sources);

  // ── ⭐⭐ THE QUEUE IS THE SOURCE, AND WHEN IT IS IN HAND THE ROWS COME FROM IT ──
  //
  // (Owner, 2026-09-07: "get it fixed to match how the queue actually works now".)
  // The board document is a PROJECTION of the queue, and its Backlog band is a
  // count, deliberately not a list — so a page that scraped the board could never
  // open the largest band on it: ~two-thirds of the items were a number with no
  // rows. This route already reads the WHOLE queue at the same ref for the honesty
  // tile, so the sections are built from the queue itself: every status in the
  // shared vocabulary becomes a band, and every item — the To-do mass included —
  // gets a row.
  //
  // ⚠ MEMBERSHIP USES THE BOARD'S OWN CLASSIFIER (`bandOfHeading`, leading-glyph
  // only), not `detectStatus` (earliest-glyph): it is the stricter documented rule
  // ("a ✅ later in prose can never flip an open item"), and it is what
  // `bandProjectCounts` already keys on — so the number on a band header and the
  // server-computed figure the filter swaps in are ONE derivation by construction,
  // never two classifiers that happen to agree. Measured live 2026-09-08: the two
  // agree on all 425 current items, and this keeps it structural rather than lucky.
  //
  // ⛔ THE BOARD-SCRAPE PATH SURVIVES ONLY AS THE DEGRADED MODE — the queue
  // unreadable while the board still is. Its currency banner is already loud about
  // exactly that state.
  const qItems =
    typeof queueMd === 'string' && queueMd.trim()
      ? (() => {
          try {
            return QV.parseQueue(queueMd).blocks.filter(b => b.type === 'item' && b.id);
          } catch {
            return [];
          }
        })()
      : [];
  const queueMode = qItems.length > 0;

  // A readable queue that parses to no ID-bearing items is not a board — with no
  // board document either, there is nothing honest to render; the caller shows
  // its empty state instead of this function inventing one.
  if (!queueMode && !md) return null;

  const bands = new Map();
  if (queueMode) {
    const A = require('./board-axes.js');
    const bandKeyOf = A.bandById(queueMd, QV, RG.bandOfHeading);
    const labelOf = new Map(QV.STATUSES.map(s => [s.key, s.label]));
    const glyphOf = new Map(QV.STATUSES.map(s => [s.key, s.glyph]));
    // Seed every vocabulary band so an empty one still renders with its real 0 —
    // absent and zero are different facts here as everywhere else on this page.
    for (const s of QV.STATUSES) {
      bands.set(s.label, { label: s.label, glyph: s.glyph, count: 0, rows: [] });
    }
    for (const it of qItems) {
      const key = bandKeyOf.get(it.id) || null;
      const label = key ? labelOf.get(key) || 'UNCLASSIFIED' : 'UNCLASSIFIED';
      if (!bands.has(label)) {
        bands.set(label, { label, glyph: key ? glyphOf.get(key) || '' : '❔', count: 0, rows: [] });
      }
      const band = bands.get(label);
      band.count++;
      band.rows.push(it);
    }
    // Done and UNCLASSIFIED render only when they hold items — both are drift
    // surfaces, and a permanently-empty alarm band teaches the reader to skip it.
    for (const label of ['Done', 'UNCLASSIFIED']) {
      if (bands.has(label) && bands.get(label).count === 0) bands.delete(label);
    }
  } else {
    const sections = splitSections(md);
    for (const s of sections) {
      const b = bandOf(s.heading);
      if (b) bands.set(b.label, { ...b, lines: s.lines });
    }
  }

  // The landed-state heading markers — scanned here, above the counts strip,
  // because the strip carries their tile; the watch list itself renders further
  // down. The set is CLOSED and named: these three are the live run's own
  // deployment-pipeline states (owner requirement, 2026-09-07). Any other
  // bracketed marker stays visible in the row's title, unclassified on purpose.
  const LANDED_MARKS = [
    'MERGED-AWAITING-CONFIRMATION',
    'MERGED-NOT-DEPLOYED',
    'ADVANCED-NOT-CLOSED',
  ];
  const marksOf = title => LANDED_MARKS.filter(m => String(title).includes('[' + m + ']'));
  const watchRows = queueMode
    ? qItems.map(it => ({ it, marks: marksOf(it.title) })).filter(r => r.marks.length)
    : [];

  // ⭐ "HOW MUCH IS LEFT" IS THE QUESTION, so the numbers answer it directly.
  //
  // ⛔⛔ AND EVERY ONE OF THEM EXCLUDES `SOMEDAY-IF`, which is the whole point of
  // the horizon axis: "a SOMEDAY-IF item MUST NOT APPEAR IN A BACKLOG COUNT AT
  // ALL. If it still counts, the axis bought nothing." The board's band headings
  // do not know about horizon — the generator bands by glyph and counts
  // everything — so the subtraction happens here, against the whole queue, and it
  // is announced on every band it touches rather than applied quietly.
  //
  // ⚠ WHEN THE AXIS IS UNOBSERVABLE NOTHING IS SUBTRACTED and nothing claims to
  // be corrected: an uncorrected total with a stated ceiling beats a corrected-
  // looking one that could not run its correction.
  const somedayByLabel = new Map();
  if (axes.someday.applied) {
    for (const [bandKey, ids] of axes.someday.byBand) {
      const label = axes.bandLabelOf.get(bandKey) || 'UNCLASSIFIED';
      somedayByLabel.set(label, (somedayByLabel.get(label) || []).concat(ids));
    }
  }
  const n = k => (bands.get(k) ? bands.get(k).count : 0) - (somedayByLabel.get(k) || []).length;
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
  // ⚠ The board's own item total, MINUS every someday item on it — the same rule
  // as `n()`, applied once to the whole rather than band by band, so the sentence
  // "N items on the board" cannot disagree with the tiles above it.
  const somedayOnBoard = [...somedayByLabel.values()].reduce((a, ids) => a + ids.length, 0);
  const total = [...bands.values()].reduce((a, b) => a + b.count, 0) - somedayOnBoard;

  // ⚠ A value carrying NO DIGIT is a word, not a number, and is set as one — see
  // the `.n.word` rule for the phone-wide horizontal scroll this closes. The test
  // is "has no digit" rather than "equals UNOBSERVABLE" so a future word value
  // (UNKNOWN, PENDING, anything) is covered without anybody remembering to add it,
  // while a fraction like `3 of 40` keeps the big-number treatment it fits in.
  //
  // ── ⭐⭐⭐ EVERY NUMBER ON THIS PAGE NAMES WHERE IT CAME FROM ─────────────────
  //
  // ⛔⛤ THIS PAGE HAS BEEN WRONG THREE TIMES IN ONE EVENING, and each fix was a
  // rendering change while each CAUSE was a source problem wearing rendering
  // clothes:
  //   1. a tile counting a heading GLYPH under a label promising decisions;
  //   2. a tile reading a declared roster that had been EMPTIED two days earlier,
  //      and printing its `0` as though it meant "nothing is waiting on you";
  //   3. an axis wired to accept blocks while the board's assignment lived in the
  //      graph — `someday if 0` against a board carrying 55, every test green.
  //
  // ⭐ The pattern under all three: **the page printed numbers whose provenance
  // nobody had checked.** So the durable fix is not a fourth rendering change, it
  // is that a number cannot reach this page without saying where it came from —
  // and `stat()` is the one door every tile goes through, so the rule lives here
  // rather than in a convention somebody has to remember.
  //
  // ⚠ A MISSING HINT IS RENDERED, NOT SWALLOWED. Silently dropping it would put an
  // unsourced number on the page looking exactly like a sourced one, which is the
  // disease itself. It prints its own absence instead, and Suite 270.24 fails the
  // gate if any tile ever does.
  // ⚠ `pop` is the POPULATION this number counts over (see POPULATIONS). It is
  // emitted, not displayed — the guard compares it, a reader never sees the token.
  // An untagged tile is marked loudly for the same reason an unsourced one is:
  // silence would make it read as belonging to whatever strip surrounds it.
  const stat = (v, label, hint, pop) =>
    `<li><span class="n${/[0-9]/.test(String(v)) ? '' : ' word'}">${v}</span><span class="k">${escapeHtml(label)}</span>` +
    `<span class="h">${escapeHtml(hint || '⛔ SOURCE NOT STATED — this number reached the page without naming where it came from, which is the one thing every number here must do')}</span>` +
    `<span class="pop" data-pop="${escapeHtml(pop || 'UNSTATED-POPULATION')}"></span></li>`;

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

  // ── ⛔⛔ AN EMPTY ROSTER IS AN ABSENT SOURCE, AND AN ABSENT SOURCE IS
  //    `UNOBSERVABLE` — NEVER `0` (owner ruling, 2026-09-05) ─────────────────
  //
  // ⛔⛤ THIS TILE PRINTED `0 of 411` FOR TWO DAYS on the page the owner reads
  // from his phone to decide whether anything is waiting on him. Nothing was
  // broken: the census ran, the parser agreed, every cross-check passed, and the
  // hand-kept roster it counts had simply been EMPTIED on 2026-09-03 when its last
  // three rows were ruled — and never refilled. Measured the same day it was
  // found: the blocker graph counted 96 rows needing him and a read of those rows
  // put 23 questions and 18 hands genuinely on his list.
  //
  // ⭐ THE DEFECT IS NOT THE NUMBER, IT IS THE SHAPE: a missing INPUT rendered as
  // a reassuring ANSWER. That is the same disease as folding digest guesses into a
  // confident total, one level up — and it is why an earlier fix that only added a
  // WARNING SENTENCE beside the zero was not enough. A sentence sits next to the
  // number; a reader glancing at a tile sees the number.
  //
  // ⚠ AND THE TWO CASES ARE HELD APART, because collapsing them would throw away a
  // real measurement. A roster that DECLARES rows and finds none of them open is a
  // genuine `0` over a real set, and it prints. A roster that declares NOTHING has
  // measured nothing, so it prints UNOBSERVABLE with the reason. The predicate is
  // derived, not assumed: with no present rows AND no closed-since rows, the
  // declared set is empty — there was nothing for either bucket to hold.
  const rosterEmpty = cz.observable && cz.count === 0 && !(cz.rows || []).length && !cz.closedSince;
  const censusObservable = cz.observable && !rosterEmpty;
  const censusHint = censusObservable
    ? `${cz.rule}: declared in the census, cross-checked open on the board · declared set last edited ${editedStamp || 'unknown'}` +
      (cz.closedSince ? ` · ⛔ ${cz.closedSince} declared row(s) no longer open` : '') +
      (cz.undeclared ? ` · ⚠ ${cz.undeclared} owner-shaped heading(s) not yet declared` : '')
    : rosterEmpty
      ? `⛔ the declared roster is EMPTY — it has held no rows since it was last edited (${editedStamp || 'date unknown'}), so this measured nothing. ` +
        `⛔ That is NOT "nothing is waiting on you": it is a hand-kept list nobody has refilled. It moves only when somebody edits it. ` +
        `Look at the read-based lanes below instead` +
        (cz.undeclared
          ? ` · ⚠ ${cz.undeclared} owner-shaped heading(s) are not declared anywhere`
          : '')
      : `not measured — ${cz.why}`;
  // ── ⭐⭐ DECIDE AND DO ARE TWO ERRANDS, AND MERGING THEM LIES BY A FACTOR OF TWO ──
  //
  // ⛔ Even when the total is right. A question goes to a SITTING he books; a
  // hands task goes to a LIST he works through. Measured on the live board
  // 2026-09-05: of 96 owner-list rows, 23 ask a question and 18 need his hands
  // (4 are both) — one number over those is a number he cannot act on.
  //
  // ⭐ The split is `BLOCKER-GRAPH.json`'s own `actor` vocabulary, not a new one.
  //
  // ⛔⛔ AND THE COUNT IS THE ROWS SOMEBODY READ — the DIGEST remainder is NOT
  // FOLDED IN (owner ruling, 2026-09-05). Folding it produced 68 under "he
  // decides" on the live graph, where a read of those same rows measured 23. ⚠ A
  // reader glancing at a tile sees the NUMBER, not the basis split beside it, so a
  // tile confidently wrong by 3× is worse than one that says it cannot tell — and
  // "it cannot tell" is the three-valued rule this page applies everywhere else.
  // The unread remainder is printed as its own UNOBSERVABLE tile, at tile size,
  // rather than as a qualifier nobody reads.
  const ax = axes.owner;
  const ACTOR_OF = { decide: 'OWNER-RULING', do: 'OWNER-KEYBOARD', external: 'EXTERNAL' };
  const laneHint = lane => {
    if (!ax.observable) return 'not measured — ' + ax.why;
    const s = ax.laneSummary[lane];
    const when = ax.measuredAt ? String(ax.measuredAt).slice(0, 10) : 'unknown';
    const base =
      `BLOCKER-GRAPH.json actor=${ACTOR_OF[lane]}, cross-checked still open · measured ${when} · ` +
      // ⚠ THE FLOOR CLAUSE IS NOT OPTIONAL. `actorBasis` records how the GRAPH
      // classified a row, not whether a human ever read the item — and the
      // 2026-09-05 triage read rows and published to a markdown report WITHOUT
      // writing its verdicts back to the graph. So real reading exists that this
      // cannot see, and the number is a FLOOR. Saying "at least" is the difference
      // between a bound and a claim.
      `⛔ AT LEAST this many: only rows whose FULL BODY was read are counted`;
    return s.observable
      ? base +
          (s.unread
            ? ` · ${s.unread} more in this lane are classified from a heading only and are NOT counted — see the unread tile`
            : '') +
          (ax.somedayDropped ? ` · ${ax.somedayDropped} someday row(s) excluded` : '') +
          (ax.closedSince ? ` · ${ax.closedSince} graph row(s) no longer open, not counted` : '')
      : `⛔ NOT ZERO — no row in this lane has been read in full, so nothing here has been measured. ` +
          `${s.unread} row(s) are classified from a heading only. ` +
          base;
  };

  // The one place a lane's printed number is decided. Zero reads is UNOBSERVABLE,
  // never `0` — the same rule as the empty roster above, and the reason both live
  // behind a helper rather than at each call site.
  const laneCount = lane =>
    ax.observable && ax.laneSummary[lane].observable ? ax.laneSummary[lane].read : 'UNOBSERVABLE';

  // ⛔ THE REMAINDER GETS A TILE OF ITS OWN. It is the number the reader most needs
  // and the one a hint would hide: rows the graph files as needing him, classified
  // from a HEADING alone, on a board that records rulings in item BODIES and does
  // not update headings. Any one of them may be live work or may have been answered
  // weeks ago, and only reading it can say which.
  const unreadTile = !ax.observable
    ? ''
    : stat(
        'UNOBSERVABLE',
        `${ax.unreadTotal} unread — could be either`,
        'classified from a heading + Done-means, never the body — and this board records rulings in bodies without ' +
          'updating headings, so a heading-only row may be live or long since answered. ⛔ Deliberately not folded into ' +
          'the counts beside it: that fold is what made this tile read 68 where a read of the rows measured 23. ' +
          'Reading a row is what moves it out of here.',
        POPULATIONS.OWNER
      );

  const counts =
    `<ul class="stats" data-strip="strip-0">` +
    stat(n('Active'), 'being worked on now', 'started, not finished', POPULATIONS.BOARD) +
    stat(
      censusObservable ? `${cz.count} of ${cz.total}` : 'UNOBSERVABLE',
      'need you — open owner decisions',
      censusHint,
      POPULATIONS.CENSUS
    ) +
    // ⛔ `laneCount` is the ONE place a lane number is decided, so the "no reads ⇒
    // UNOBSERVABLE, never 0" rule cannot be honoured on one tile and forgotten on
    // the next. `.read` is deliberately unreachable without passing `.observable`.
    stat(laneCount('decide'), 'he decides — a sitting', laneHint('decide'), POPULATIONS.OWNER) +
    stat(laneCount('do'), 'his hands — a task list', laneHint('do'), POPULATIONS.OWNER) +
    unreadTile +
    stat(
      n('Attention'),
      'flagged ⚠️',
      'the Attention band — a flag on the heading, not a decision count',
      POPULATIONS.BOARD
    ) +
    stat(n('Ready'), 'startable now', 'specified and unblocked', POPULATIONS.BOARD) +
    stat(
      inMotion,
      'startable or in flight',
      'active + ready — a workload, not a finish line',
      POPULATIONS.BOARD
    ) +
    stat(
      // ⚠ `To-do` and `Backlog` are ONE band under two labels — the vocabulary's
      // own name in queue mode, the board document's local rename in the degraded
      // board-scrape — so exactly one of the two terms is ever non-zero.
      n('To-do') + n('Backlog') + n('Parked') + n('Deferred'),
      'filed for later',
      'to-do, parked and deferred',
      POPULATIONS.BOARD
    ) +
    stat(
      closed.observable ? closed.count : 'UNOBSERVABLE',
      'finished but still filed as open',
      closed.observable
        ? 'headings that LEAD with the done-mark, across all ' + closed.total + ' items'
        : 'not counted over the whole queue, so no number is shown — ' + closed.why,
      POPULATIONS.CLOSED
    ) +
    // ⭐ The landed-state tile — queue mode only: the degraded board-scrape cannot
    // see heading markers behind a counted band, so it must not print a number
    // about them. Population: the WHOLE queue, someday included — deployment state
    // is not a horizon question. The popmix note below names this.
    (queueMode
      ? stat(
          watchRows.length,
          'landed, not confirmed',
          'heading markers [MERGED-AWAITING-CONFIRMATION] / [MERGED-NOT-DEPLOYED] / [ADVANCED-NOT-CLOSED], ' +
            'written by the live run — over every item in the queue, someday included; the list is just below',
          POPULATIONS.QUEUE
        )
      : '') +
    `</ul>` +
    // ⛔⛤ THIS STRIP MIXES FOUR POPULATIONS, AND A GRID INVITES SUBTRACTION.
    //
    // Every tile above is individually correct and individually sourced. They are
    // not comparable with one another, and until tonight the page let a reader
    // assume they were — which is exactly how a correct 352 beside a correct 411
    // got read as a defect. `comparabilityReport()` REFUSES a mixed strip that does
    // not carry this note, so the statement cannot be dropped without going red.
    `<p class="note popmix" data-for="strip-0">⚠ <strong>These tiles do not all count the same thing, so do not subtract ` +
    `them.</strong> Being-worked-on, flagged, startable, in-flight and filed-for-later are over the ${total} items on this ` +
    `board. Open owner decisions is over the planning tree's declared roster. He-decides, his-hands and the unread ` +
    `remainder are over the rows the blocker graph files to him. Finished-but-still-open` +
    (queueMode ? ` and landed-not-confirmed are scans` : ` is a scan`) +
    ` of every item in the queue. Four questions, four denominators, one grid.</p>`;

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
      : // ⚠ `censusObservable`, not `cz.observable`: with an EMPTY roster the tile
        // above now prints UNOBSERVABLE, so "the number above stands" would be a
        // sentence about a number that is no longer on the page.
        censusObservable && !cz.rowsObservable
        ? `<p class="note stale">⛔ The census reported a count but its row list could not be read; the number above stands, the names do not.</p>`
        : '';

  // ── The two lanes, openable — "a number he cannot open is a number he cannot check" ──
  // Evidence is clipped: this list is read on a phone, and the whole phrase is in
  // the item. Each row wears its classification basis, so a DIGEST row is visibly
  // the weaker claim rather than sitting anonymously beside a READ one.
  const clip = (s, nMax) =>
    String(s).length > nMax
      ? String(s)
          .slice(0, nMax - 1)
          .trimEnd() + '…'
      : String(s);
  // ⭐ THE LIST IS CUT WHERE THE COUNT IS CUT. The counted (READ) rows are listed
  // first under a rule that says so, then a divider, then the unread ones — so the
  // boundary the tile draws is visible in the list the tile links to. A flat list
  // sorted by basis would put the same rows in the same order and still leave the
  // reader to work out where the number stopped.
  const laneList = (key, heading, blurb) => {
    if (!ax.observable) return '';
    const rows = ax.lanes[key];
    if (!rows.length) return '';
    const s = ax.laneSummary[key];
    const li = r =>
      `<li><code>${escapeHtml(r.id)}</code> <span class="c">${escapeHtml(r.basis)}</span> — ${escapeHtml(clip(r.evidence, 100))}</li>`;
    const readRows = rows.filter(r => r.basis === 'READ');
    const restRows = rows.filter(r => r.basis !== 'READ');
    const summaryCount = s.observable
      ? `${s.read} counted · ${s.unread} unread`
      : `${s.unread} unread, 0 counted`;
    return (
      `<details class="drift"><summary>${escapeHtml(heading)} <span class="c">${escapeHtml(summaryCount)}</span></summary>` +
      (readRows.length
        ? `<p class="note">⭐ <strong>Read in full — this is the counted set.</strong></p><ul>${readRows.map(li).join('')}</ul>`
        : `<p class="note">⛔ <strong>Nothing in this lane has been read in full</strong>, which is why its tile says UNOBSERVABLE rather than a number.</p>`) +
      (restRows.length
        ? `<p class="note">⛔ <strong>Heading-only — NOT counted.</strong> Classified from the heading and Done-means, ` +
          `never the body. This board records rulings in bodies without updating headings, so any of these may already ` +
          `be answered. Reading one is what moves it above this line.</p><ul>${restRows.map(li).join('')}</ul>`
        : '') +
      `<p class="note">${escapeHtml(blurb)}</p></details>`
    );
  };
  const ownerLists = !ax.observable
    ? `<p class="note stale">⛔ <strong>Whether anything needs you could not be measured.</strong> ${escapeHtml(ax.why)} — so no lane is shown. That is not the same as an empty list.</p>`
    : laneList(
        'decide',
        'He decides — the sitting',
        'Rows the graph files as needing an owner ruling. Every one carries how it was classified: DIGEST means only the ' +
          'heading and Done-means were read, and this board records rulings in item BODIES without updating headings — so a ' +
          'digest row may already be answered. Reading one is what removes it.'
      ) +
      laneList(
        'do',
        'His hands — the task list',
        'Nothing here asks a question. Each needs him to be somewhere, run something, or authorise something whose evidence ' +
          'is already assembled.'
      ) +
      laneList(
        'external',
        'Neither — waiting on someone else',
        'A third party, a platform, or a credential we will not touch. On his list only through a grouping defect.'
      ) +
      `<p class="note">⛔ <strong>An item that is BOTH a question and a hands task cannot appear as such.</strong> The graph ` +
      `gives each item one <code>actor</code>, so a row with a “QUESTION: … HANDS: …” body is filed under one of them and the ` +
      `other half is invisible here. A read of the rows on 2026-09-05 found four of exactly that shape. This page will not ` +
      `print a “both” count, because an intersection of these two lanes is empty by construction and would read as “there ` +
      `are none”.</p>`;

  // ── HORIZON — the axis the whole thing was for ──────────────────────────────
  //
  // ⛔ EVERY VALUE COMES FROM THE VOCABULARY, never from a literal here, and UNSET
  // / UNPARSEABLE / UNKNOWN are three different facts that are never merged:
  //   UNKNOWN      somebody read it and the text does not settle it (a finding)
  //   UNSET        no source has said anything about this item at all
  //   UNPARSEABLE  a value outside the vocabulary — the reader could not use it
  const hz = axes.horizons;
  const HZ_BLURB = {
    'BLOCKS-WORK-NOW': 'in the way of work today',
    NEXT: 'after the current thing',
    'SOMEDAY-IF': 'a captured thought with a condition — ⛔ in NO total on this page',
    UNKNOWN: '⚠ read, and the text does not settle it — folded into nothing, excluded from nothing',
  };
  const basisStrip = b =>
    Object.entries(b || {})
      .sort((x, y) => y[1] - x[1])
      .map(([k, v]) => `${k} ${v}`)
      .join(' · ');
  const horizonHtml = !hz.observable
    ? `<h2>Horizon</h2><p class="note stale">⛔ <strong>The horizon could not be read.</strong> ${escapeHtml(hz.why)}. ` +
      `⚠ That is NOT the same as “every item is unset” — this page cannot tell you either way, so it shows no number.</p>`
    : (() => {
        const c = hz.counts;
        const A = require('./board-axes.js');
        const someday = c[A.SOMEDAY_NAME] || 0;
        const cells = hz.vocabulary
          .map(v =>
            stat(
              c[v] || 0,
              v.toLowerCase().replace(/-/g, ' '),
              HZ_BLURB[v] || 'no blurb for this value',
              POPULATIONS.QUEUE
            )
          )
          .join('');
        const unset = c.UNSET
          ? stat(
              c.UNSET,
              'unset',
              'no source has said anything — ⛔ shown as unset, never counted as one of the values above, and deliberately not the same as UNKNOWN',
              POPULATIONS.QUEUE
            )
          : '';
        const unparse = c.UNPARSEABLE
          ? stat(
              c.UNPARSEABLE,
              'unreadable',
              'a value outside the vocabulary: ' + hz.unparseable.slice(0, 12).join(', '),
              POPULATIONS.QUEUE
            )
          : '';
        const somedayList = someday
          ? `<details class="drift"><summary>Which ${someday} someday-if <span class="c">excluded</span></summary>` +
            `<ul>${[...hz.someday]
              .map(
                id =>
                  `<li><code>${escapeHtml(id)}</code>${
                    hz.basisOf && hz.basisOf.get(id)
                      ? ` <span class="c">${escapeHtml(hz.basisOf.get(id))}</span>`
                      : ''
                  }</li>`
              )
              .join('')}</ul>` +
            `<p class="note">⛔ None of these is in any total above or in any band count below. Each carries how it was ` +
            `placed: READ is a reader's call with the words quoted, SIGNAL is the assignment tool's keyword match, ` +
            `GRAPH is a live blocking edge, STATUS is the item's parked/deferred state, BLOCK is the item's own accept block.</p></details>`
          : `<p class="note">No item carries <code>SOMEDAY-IF</code>, so no total changes. The exclusion is applied ` +
            `regardless — a rule that only starts working once somebody notices it is not a rule.</p>`;
        return (
          `<h2>Horizon</h2>` +
          `<p class="note">Should this item be counted yet, over all ${hz.total} items. Read from ${escapeHtml(hz.sourcedFrom)}` +
          `${hz.basisCounts && Object.keys(hz.basisCounts).length ? ` · basis ${escapeHtml(basisStrip(hz.basisCounts))}` : ''}. ` +
          `⛔ A <code>SOMEDAY-IF</code> item is in no total on this page.</p>` +
          `<ul class="stats" data-strip="strip-1">${cells}${unset}${unparse}</ul>` +
          // ⛔ THE SOURCES DISAGREE HERE, AND PRECEDENCE IS A RESOLUTION, NOT AN
          // ABSENCE OF CONFLICT. The hand-written block wins over a keyword-assigned
          // graph row — but a page that quietly picks one and shows a clean number is
          // how a board ends up carrying two answers nobody knows about.
          (hz.conflicts && hz.conflicts.length
            ? `<p class="note stale">⚠ <strong>${hz.conflicts.length} item(s) carry two different horizons.</strong> ` +
              `The item's own <code>accept</code> block is used, because a person wrote it and the archive's gate refuses it ` +
              `if it is malformed; the assignment disagrees on: ` +
              hz.conflicts
                .map(
                  x =>
                    `<code>${escapeHtml(x.id)}</code> block <strong>${escapeHtml(x.block)}</strong> vs ` +
                    `${escapeHtml(x.graph)} by ${escapeHtml(x.graphBasis)}`
                )
                .join('; ') +
              `. Resolving one of the two is the fix; showing you the winner alone is not.</p>`
            : '') +
          somedayList
        );
      })();

  // ── PROJECT — the owner's six, from the board's own per-item assignment ─────
  //
  // ⭐ THIS IS NO LONGER AN APPROXIMATION. The page used to render CP-RULE v1's
  // four-value domain census because the six-value axis did not exist. It exists
  // now, per item, with a basis and quoted evidence — and the two DISAGREE on 46
  // of 411 items (11.2%, measured with the census's CP counted as compatible with
  // EITHER control-plane or harness, the most generous mapping available). ⛔ So
  // the census is no longer rendered here: two answers to one question is the
  // disease, and only one of them can say which words decided each row.
  //
  // ⚠⚠ AND THE BASIS IS THE HEADLINE, NOT A FOOTNOTE. The assignment's own
  // declared-in-advance sample measured SIGNAL — the tool's keyword match — WRONG
  // ABOUT ONE PROJECT ROW IN THREE. Printing these counts without that beside them
  // would be a precision this axis has not earned yet.
  const pj = axes.projects;
  const projectHtml = !pj.observable
    ? `<h2>Project</h2><p class="note stale">⛔ <strong>The per-project split could not be read.</strong> ${escapeHtml(pj.why)}.</p>`
    : (() => {
        const cells = [...pj.vocabulary, 'UNSET']
          .filter(v => pj.counts[v])
          .sort((a, b) => pj.counts[b] - pj.counts[a])
          .map(v =>
            stat(pj.counts[v], v, PROJECT_BLURB[v] || 'no blurb for this value', POPULATIONS.QUEUE)
          )
          .join('');
        return (
          `<h2>Project</h2>` +
          `<p class="note">Which thing an item belongs to, assigned per item over all ${pj.total} of them, from the board's ` +
          `own axis assignment · basis ${escapeHtml(basisStrip(pj.basisCounts))}.</p>` +
          `<ul class="stats" data-strip="strip-2">${cells}</ul>` +
          (pj.demoted
            ? `<p class="note stale">⛔ <strong>${pj.demoted} rows say UNKNOWN because a keyword match is not a label.</strong> ` +
              `The assignment tool placed them by matching words in the item, and its own sample measured that ` +
              `<strong>wrong about one row in three</strong>. A count read as an estimate can carry that; a label sitting beside ` +
              `an item is read as a fact about that item, and somebody acts on the row. So those rows are shown as unknown ` +
              `rather than asserted. ` +
              `⚠ <strong>That is not the tool being useless — it is the tool declining to invent ${pj.demoted} answers</strong>, ` +
              `which is the same rule every other number on this page follows. The ${pj.total - (pj.counts.UNKNOWN || 0)} rows ` +
              `still shown were placed by a reader with the deciding words quoted, or by the ID-family rule. ` +
              `Reading a row is what moves it out of unknown.</p>`
            : '') +
          `<p class="note">⛔ The older four-value domain census (CP-RULE v1) is no longer shown here. It disagreed with this ` +
          `assignment on 46 of 411 items, it cannot separate the harness from the control plane, and it has no bucket for ` +
          `Binder — all three of which this one does.</p>`
        );
      })();

  // ── The per-band someday correction ─────────────────────────────────────────
  //
  // ⛔⛔ THE BOARD'S OWN BAND HEADINGS DO NOT KNOW ABOUT HORIZON. The generator
  // bands by status glyph and counts everything, so a SOMEDAY-IF item is inside
  // the number printed on the band. The owner's rule is that it must be in NO
  // backlog count, so the correction is applied HERE, from the queue.
  //
  // ⭐ AND THE CORRECTION IS SHOWN, NEVER SILENT. Printing a quietly smaller
  // number would leave the reader unable to tell a total that shrank from one that
  // was always that size — and it would put this page in silent disagreement with
  // the band heading the same reader can open in the board file. So a corrected
  // band reads `104 → 103`, with the excluded ids one tap away.
  // ── ⭐ THE PER-PROJECT FILTER — one board filtered, never six boards ────────
  //
  // The owner asked for per-project counts "by filtering rather than by splitting
  // anything". Counts alone were all this page could offer while the only source
  // was a subprocess census with no all-items output: per-item domains cost one
  // spawn per value, measured at 0.94s against 0.19s for one, on a page read on a
  // phone over a tailnet. ⭐ THAT OBJECTION IS GONE: the assignment now lives in
  // `BLOCKER-GRAPH.json`, which this route already reads once, so id → project is
  // free. Neither of the numbers I recorded applies to a file read.
  //
  // ⚠ WEIGHT, since it was the other objection: the board LISTS 168 rows (the rest
  // of the 411 are the Backlog's count), so the attribute costs roughly 3KB — and
  // it buys the filter over every listed row rather than a second rendering of
  // them. Rows the board does not list cannot be tagged, and the control says so
  // rather than letting a filtered view look complete.
  //
  // ⛔ DERIVED FROM THE RENDERED OUTPUT, not from a second parse of the board —
  // the same rule `buildToc` follows. A separate pass over the markdown would be a
  // second reader free to disagree with the one that produced the rows.
  const pjById = axes.projects.observable ? axes.projects.byId : null;
  const tagRows = html =>
    pjById
      ? html.replace(/<li><strong>([A-Za-z]+[0-9]*[a-z]?)<\/strong>/g, (m, id) =>
          pjById.has(id) ? `<li data-p="${escapeHtml(pjById.get(id))}"><strong>${id}</strong>` : m
        )
      : html;
  // ⛔ THE PILL COUNTS THE SET ITS OWN BANDS WILL SHOW. Falls back to the axis
  // census only when the per-band derivation is unavailable — and then the note
  // below says the bands cannot follow the control at all.
  const pillCount = v =>
    axes.bandCounts.observable && axes.bandCounts.perProject
      ? axes.bandCounts.perProject[v] || 0
      : axes.projects.counts[v];
  const filterHtml =
    pjById && axes.projects.vocabulary
      ? `<div class="pfilter" role="group" aria-label="Filter the board by project" data-pop="${POPULATIONS.BOARD}">` +
        `<button class="pchip" data-p="" aria-pressed="true">All</button>` +
        [...axes.projects.vocabulary]
          .filter(v => pillCount(v))
          .map(
            v =>
              `<button class="pchip" data-p="${escapeHtml(v)}" aria-pressed="false">${escapeHtml(v)} <span class="c">${pillCount(v)}</span></button>`
          )
          .join('') +
        `</div>` +
        // ⛔ THE SERVER'S ANSWERS, HANDED OVER RATHER THAN RECOMPUTED. Every
        // (band × project) figure is derived above, over the whole queue; the script
        // only picks one. A count computed in the browser would be a second answer to
        // a question this side already answered — the defect this page keeps having.
        (axes.bandCounts.observable
          ? `<div class="bandcounts" hidden data-counts="${escapeHtml(JSON.stringify(axes.bandCounts.byBand))}"></div>`
          : '') +
        `<p class="note">${
          axes.bandCounts.observable
            ? queueMode
              ? `Every band's number below follows this control — the counts are computed on the server, over the whole ` +
                `queue, not in your browser. Someday-if items are in none of these figures.`
              : `Every band's number below follows this control, the Backlog included — those counts are computed on the server, ` +
                `not in your browser. ⚠ The Backlog is a count rather than a list, so under a filter it reports a real number ` +
                `with no rows beneath it. Someday-if items are in none of these figures.`
            : `⛔ The band numbers CANNOT follow this control: ${escapeHtml(axes.bandCounts.why || 'the per-band counts could not be derived')}. ` +
              `They stay unfiltered, and the control only hides rows — so do not read a band's number as an answer to the filter.`
        }</p>`
      : '';

  // ── ⭐ THE ROWS THEMSELVES (queue mode) — one line per item, everything else a
  //    tap away ──────────────────────────────────────────────────────────────
  //
  // Row = id · title · chips (landed-marker · spec · horizon·basis · project ·
  // someday·basis). Opening a row shows the item's own Done-when clause (derived
  // by the board generator's summariser — imported, never restated), the graph
  // edges that touch it, and then fetches the FULL body from `/queue/item/<id>`
  // — the same ref-read source. 2.7MB of bodies cannot ride along inline.
  //
  // ⛔ EDGES ARE ATTRIBUTES, NEVER A TREE (owner ruling, 2026-09-08): the graph's
  // edges were recorded per-finding, not as a complete dependency survey, so a
  // cascade drawn from them tonight would be a cascade that is not in the data.
  // Each edge is shown on its item, with its basis, and nothing is transitive.
  //
  // ⚠ THE HORIZON CHIP ALWAYS CARRIES ITS BASIS — 215 of the live assignments are
  // SIGNAL (a keyword guess), and a horizon shown without its basis is a number
  // nobody should quote. No basis ⇒ no chip, same rule as the axis tiles.
  const hzById = axes.horizons.observable ? axes.horizons.byId : null;
  const hzBasisOf = axes.horizons.observable ? axes.horizons.basisOf : null;
  const HZ_SHORT = { 'BLOCKS-WORK-NOW': 'NOW', NEXT: 'NEXT', 'SOMEDAY-IF': 'SOMEDAY' };
  const fmtMod =
    sources && sources.itemFormat && sources.itemFormat.observable ? sources.itemFormat.mod : null;
  const hasSpec = it => {
    if (!fmtMod || typeof fmtMod.parseAccept !== 'function') return false;
    try {
      return (fmtMod.parseAccept(it.body) || []).length > 0;
    } catch {
      return false;
    }
  };
  // LIVE edges only, indexed both ways. `cond:` blockers are shown verbatim —
  // a named condition is a real blocker even though it is not an item.
  const graphEdges =
    sources && sources.graph && sources.graph.observable && Array.isArray(sources.graph.graph.edges)
      ? sources.graph.graph.edges.filter(e => e && e.state === 'LIVE')
      : [];
  const edgesBlocking = new Map(); // id → edges where this item is BLOCKED
  const edgesBlockedBy = new Map(); // id → edges where this item BLOCKS others
  for (const e of graphEdges) {
    if (e.blocked) {
      if (!edgesBlocking.has(e.blocked)) edgesBlocking.set(e.blocked, []);
      edgesBlocking.get(e.blocked).push(e);
    }
    if (e.blocker) {
      if (!edgesBlockedBy.has(e.blocker)) edgesBlockedBy.set(e.blocker, []);
      edgesBlockedBy.get(e.blocker).push(e);
    }
  }
  const chipsOf = it => {
    const out = [];
    for (const m of marksOf(it.title)) out.push(`<span class="chip m">${escapeHtml(m)}</span>`);
    if (hasSpec(it)) out.push(`<span class="chip">spec</span>`);
    if (hzById && hzById.has(it.id)) {
      const v = hzById.get(it.id);
      const basis = hzBasisOf && hzBasisOf.get(it.id);
      // UNSET ⇒ no chip (nothing was said, so nothing is shown); a value with no
      // recorded basis is not printed either — the basis IS the credibility.
      if (HZ_SHORT[v] && basis && v !== 'SOMEDAY-IF') {
        out.push(
          `<span class="chip h" title="${escapeHtml(v)}">${escapeHtml(HZ_SHORT[v])}·${escapeHtml(basis)}</span>`
        );
      }
      if (v === 'SOMEDAY-IF' && basis) {
        out.push(`<span class="chip s">someday·${escapeHtml(basis)}</span>`);
      }
    }
    if (pjById && pjById.has(it.id)) {
      const p = pjById.get(it.id);
      if (p && p !== 'UNSET' && p !== 'UNKNOWN') {
        out.push(`<span class="chip">${escapeHtml(p)}</span>`);
      }
    }
    return out.join('');
  };
  // The display title: markdown stripped, the landed marker lifted out (its chip
  // carries it), clipped for the one-line row. The FULL heading is in the item page.
  const rowTitle = it => {
    let t = QV.titleText(it.title);
    for (const m of LANDED_MARKS) t = t.split('[' + m + ']').join('');
    return clip(t.replace(/\s+/g, ' ').trim(), 120);
  };
  const rowHtml = it => {
    const p = pjById && pjById.has(it.id) ? pjById.get(it.id) : null;
    const dataP = p ? ` data-p="${escapeHtml(p)}"` : '';
    const sum = RG.deriveSummary(it.body);
    const sumHtml = sum
      ? `<p class="isum"><em>${escapeHtml(sum.label)}:</em> ${escapeHtml(sum.text)}</p>`
      : `<p class="isum note">⛔ No plain-English summary in the source — this item does not describe itself yet.</p>`;
    const edgeLine = (list, word) =>
      list && list.length
        ? `<p class="note">${word} ${list
            .map(
              e =>
                `<code>${escapeHtml(word === 'blocked by' ? e.blocker : e.blocked)}</code> <span class="c">${escapeHtml(
                  [e.kind, e.basis].filter(Boolean).join('·')
                )}</span>`
            )
            .join(', ')}</p>`
        : '';
    return (
      `<details class="item"${dataP}><summary><code>${escapeHtml(it.id)}</code> ` +
      `<span class="t">${escapeHtml(rowTitle(it))}</span>${chipsOf(it)}</summary>` +
      `<div class="ibody" data-id="${escapeHtml(it.id)}">${sumHtml}` +
      edgeLine(edgesBlocking.get(it.id), 'blocked by') +
      edgeLine(edgesBlockedBy.get(it.id), 'blocks') +
      `<p class="note"><a href="/queue/item/${encodeURIComponent(it.id)}">Open the full item ↗</a></p>` +
      `</div></details>`
    );
  };

  // ── ⭐⭐ LANDED, NOT CONFIRMED — the overnight run's own states, first-class ──
  //
  // (Owner requirement, 2026-09-07.) The live run marks an item's HEADING when its
  // work has merged but its confirmation has not landed: [MERGED-AWAITING-
  // CONFIRMATION], [MERGED-NOT-DEPLOYED], [ADVANCED-NOT-CLOSED]. Those rows are
  // what he watches overnight, and until now they hid inside Active. This list is
  // a VIEW of those rows — each is still counted once, in its own band below.
  // ⚠ Counted over EVERY item in the queue, someday included: deployment state is
  // not a horizon question, and a merged-but-unconfirmed someday row is still a
  // merged-but-unconfirmed row.
  const watchHtml = !queueMode
    ? ''
    : `<section class="watch"><h2>Landed, not confirmed <span class="c">${watchRows.length}</span></h2>` +
      (watchRows.length
        ? `<ul>${watchRows
            .map(
              r =>
                `<li><code>${escapeHtml(r.it.id)}</code> ` +
                r.marks.map(m => `<span class="chip m">${escapeHtml(m)}</span>`).join(' ') +
                ` <span class="t">${escapeHtml(rowTitle(r.it))}</span></li>`
            )
            .join('')}</ul>`
        : `<p class="note">No item carries a landed-state marker right now.</p>`) +
      `<p class="note">Heading markers written by the live run — merged or advanced, awaiting confirmation, ` +
      `deployment, or closure. Counted over every item in the queue, someday included; each row is also in its ` +
      `own band below, so nothing here is a second count.</p></section>`;

  const bandHtml = BAND_ORDER.filter(k => bands.has(k))
    .map(k => {
      const b = bands.get(k);
      const open = BAND_OPEN.has(k) && b.count > 0 ? ' open' : '';
      const excluded = somedayByLabel.get(k) || [];
      // ⛔⛤ THE ONE NUMBER ON THIS ROW, and it answers the filter.
      //
      // It used to be filter-blind while a caption beneath it responded — two
      // numbers of different sets on one row, and the bigger one was the wrong one.
      // It now starts at the unfiltered value and the script swaps it for the
      // SERVER's precomputed (band × project) figure. `data-all` carries the
      // unfiltered value so restoring "All" is also a lookup, never a recomputation.
      //
      // ⚠ THREE-VALUED: a band the derivation could not produce a figure for renders
      // `?` under a filter rather than a stale number — `data-all` is emitted either
      // way, so the unfiltered reading never degrades.
      const shown = b.count - excluded.length;
      const countCell = `<span class="c">${shown}</span>`;
      // ⚠ THE EXCLUSION IS ANNOUNCED ON THE BAND IT TOUCHES, with every excluded id
      // named — never a silently smaller number. (The prose is shorter than it was:
      // in queue mode the excluded rows are also LISTED below with a someday chip,
      // so the announcement no longer has to carry the whole story alone. The old
      // board-blindness clause went with the board-scrape — the rows come from the
      // queue now, so there is no blind upstream artifact to attribute the gap to.)
      const note = excluded.length
        ? `<p class="note">${b.count} filed in this band, <strong>${b.count - excluded.length} counted here</strong> — ` +
          `${excluded.length} carry <code>SOMEDAY-IF</code> and are in no total: ` +
          `${excluded.map(id => `<code>${escapeHtml(id)}</code>`).join(', ')}` +
          (queueMode
            ? `. They stay listed below, wearing a someday chip.</p>`
            : `. The board counts every item it files here ` +
              `and states on its own first page that it cannot apply the horizon rule; this is the surface where that rule is applied.</p>`)
        : '';
      const glyphCell =
        queueMode && b.glyph ? ` <span class="g">${escapeHtml(b.glyph)}</span>` : '';
      const body = queueMode
        ? `<div class="rows">${b.rows.map(rowHtml).join('')}</div>`
        : tagRows(mdToHtml(b.lines));
      return (
        `<details class="band"${open} data-band="${escapeHtml(k)}" data-all="${shown}" data-pop="${POPULATIONS.BOARD}"><summary>${escapeHtml(k)} ${countCell}${glyphCell}</summary>` +
        `<p class="note">${escapeHtml(BAND_BLURB[k] || '')}</p>` +
        note +
        body +
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
  const currency = md ? boardCurrency(md, queueMd) : { known: false, why: 'no board' };

  // ── ⭐⭐ QUEUE MODE'S OWN LEAD: THE ROWS COME FROM THE SOURCE, SO STALENESS IS
  //    NOT A STATE THIS PAGE CAN BE IN ─────────────────────────────────────────
  //
  // The staleness machinery above exists because the page used to render a
  // GENERATED artifact that could fall behind its source. In queue mode the rows
  // ARE the source — read at the ref, per visit — so the lead line reports
  // provenance (which commit of the queue this is), and the generated board's own
  // currency is demoted to the one clause that is still about a real artifact.
  // ⛔ The board-currency signal is kept, not dropped: ROADMAP.md still exists,
  // other surfaces still read it, and a stale board silently disagreeing with this
  // page is exactly the two-answers defect this file keeps being rebuilt to end.
  const prov = sources && sources.provenance;
  const provLine =
    prov && prov.ok === true && prov.mode === 'ref'
      ? `read from <code>QUEUE.md</code> at <code>${escapeHtml(String(prov.ref))}</code> @ <code>${escapeHtml(
          String(prov.sha)
        )}</code> (committed <strong>${escapeHtml(
          String(prov.committedAt || '')
            .slice(0, 16)
            .replace('T', ' ')
        )}</strong>), re-read on every visit — nothing here is cached`
      : prov && prov.ok === true
        ? `read from the planning tree at <code>${escapeHtml(String(prov.ref))}</code>, re-read on every visit`
        : `read from the queue as handed to this route, re-read on every visit`;
  const boardClause = !currency.known
    ? md
      ? ` ⚠ Whether the generated board (<code>ROADMAP.md</code>) still matches could not be established — ` +
        `it carries no readable source fingerprint. This page does not depend on it: every row below is rendered ` +
        `from the queue itself.`
      : ` (No generated board was read alongside — this page does not depend on one.)`
    : currency.current
      ? ` The generated board was built from the queue as it reads ` +
        `right now — rebuilt <strong>${escapeHtml(stamp)}</strong>. (Checked by comparing the board's recorded source ` +
        `fingerprint against the live queue; <code>npm run roadmap:check</code> does the stronger ` +
        `comparison and rebuilds the whole thing.)`
      : ` ⛔ <strong>The generated board (<code>ROADMAP.md</code>) is OUT OF DATE</strong> — rebuilt ` +
        `<strong>${escapeHtml(stamp)}</strong>, and the queue has changed since. <strong>This page is unaffected</strong>: ` +
        `every row below is rendered from the queue itself, as it reads right now. Other surfaces reading the board ` +
        `are behind until <code>npm run roadmap</code> runs.`;
  const twoDenoms =
    axes.horizons.observable && axes.horizons.total !== total
      ? ` <strong>⚠ Two denominators on this page, deliberately:</strong> the queue holds ` +
        `<strong>${axes.horizons.total}</strong> items and the bands count <strong>${total}</strong> — the ` +
        `${axes.horizons.total - total} carrying <code>SOMEDAY-IF</code> are in no total here. The Horizon section ` +
        `counts over all ${axes.horizons.total}, because its job is to explain that gap.`
      : '';
  const queueLead =
    `<p class="note">${total} open item${total === 1 ? '' : 's'}, ${provLine}.` +
    boardClause +
    twoDenoms +
    `</p>`;

  const boardCurrencyLine = !currency.known
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
        `comparison and rebuilds the whole thing.)` +
        // ⛔ THE ONE SURVIVING GAP BETWEEN TWO NUMBERS ON THIS PAGE, NAMED HERE
        // RATHER THAN LEFT FOR THE READER TO SPOT. The Horizon section counts over
        // every item the queue holds; every other total on this page counts what is
        // left after the someday rule. Both are right and they are different sets,
        // so the page says which is which and what the difference is made of —
        // silence between two numbers is how this surface has gone wrong before.
        (axes.horizons.observable && axes.horizons.total !== total
          ? ` <strong>⚠ Two denominators on this page, deliberately:</strong> the queue holds ` +
            `<strong>${axes.horizons.total}</strong> items and this board counts <strong>${total}</strong>. ` +
            `The difference is the ${axes.horizons.total - total} carrying <code>SOMEDAY-IF</code>, which are in no total ` +
            `here. The Horizon section below counts over all ${axes.horizons.total}, because its job is to explain that gap; ` +
            `everything else counts the ${total}.`
          : '') +
        `</p>`
      : `<p class="note stale">⛔ <strong>THIS BOARD IS OUT OF DATE.</strong> The queue has changed ` +
        `since this was built <strong>${escapeHtml(stamp)}</strong>, so anything added, closed or ` +
        `re-ordered since then is <strong>not on this page</strong> — and a stale board reads exactly ` +
        `like a current one, which is why this says so instead of leaving you the timestamp to ` +
        `interpret. The ${total} item${total === 1 ? '' : 's'} below are as they stood then. Run <code>npm run roadmap</code>.</p>`;

  const currencyLine = queueMode ? queueLead : boardCurrencyLine;

  return (
    `<h1 id="queue">The queue</h1>` +
    currencyLine +
    counts +
    watchHtml +
    ownerLists +
    decisionList +
    disagreeList +
    horizonHtml +
    projectHtml +
    `<h2>The whole board</h2>` +
    filterHtml +
    (queueMode
      ? `<p class="note">Every state in the queue's own vocabulary is a band here, with its real count and every row ` +
        `listed — the To-do mass included. Everything starts closed; nothing is hidden or shortened. A row opens to its ` +
        `own Done-when clause and full text.</p>`
      : `<p class="note">Every band is here with its real count. The ones in motion open on their own; ` +
        `the rest are one tap away — nothing is hidden or shortened.</p>`) +
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
function renderQueue(board, queueMd, census, sources) {
  // -- THE EMPTY STATE MUST NOT SAY "not an error" WHEN IT IS ONE --------------
  // Two different absences reach here and they need different words. A PUBLIC
  // CLONE has no private planning tree: normal, expected, not an error. A REF
  // THAT WILL NOT READ is a broken surface, and calling that "the normal state"
  // is exactly the silent staleness this page was rebuilt to stop. The whole
  // point of reading from a ref is that a failure is VISIBLE; a reassuring empty
  // state would hand that back. So the provenance decides the wording.
  const prov = sources && sources.provenance;
  const refFailed = prov && prov.ok === false;
  const empty = refFailed
    ? `<h1 id="queue">The queue</h1><div class="empty"><p><strong>THE BOARD COULD NOT BE READ, AND THIS IS AN ERROR.</strong></p>
<p class="note">The board is read from the ref <code>${escapeHtml(String(prov.ref || 'origin/main'))}</code>, not from any working
tree, so that what you see is what actually landed. That read FAILED: <code>${escapeHtml(String(prov.why || 'unknown'))}</code></p>
<p class="note">Nothing is being shown from a fallback copy on purpose. An out-of-date board that looks
current is worse than a page that says it is broken, because nobody investigates a number that looks fine.</p></div>`
    : `<h1 id="queue">The queue</h1><div class="empty"><p><strong>No board is reachable from this checkout.</strong></p>
<p class="note">The board is generated into the private planning tree, which a public clone does not
have. That is the normal state, not an error.</p></div>`;
  // ⭐ The QUEUE is the source, so a readable queue renders even with no generated
  // board alongside — the board-scrape is only the degraded path the other way
  // round (board readable, queue not). `renderRoadmapSection` returns null when
  // handed nothing it can honestly render, and the empty state stands.
  const body = refFailed
    ? empty
    : (board || (typeof queueMd === 'string' && queueMd.trim())
        ? renderRoadmapSection(
            board ? board.text : null,
            board ? board.mtime : null,
            queueMd,
            census,
            sources
          )
        : null) || empty;
  return page({ title: 'Queue', crumb: '', body });
}

/**
 * `/queue/item/<id>` — ONE item, in full, from the same ref-read queue.
 *
 * ⭐ This exists because the row list deliberately does not carry the bodies:
 * 2.7MB of item text cannot ride along on a phone page, so a row fetches its body
 * from here on first open (`frag: true` returns just the article), and the same
 * address works as a direct link (`frag: false` wraps it in the page shell).
 *
 * ⛔ The id is validated against the ONE exported ITEM_ID_RE — by probing the
 * pattern, never by retyping it — and an unknown id names nothing else: the page
 * says only that no item answers to it.
 *
 * @returns {{status:number, html:string, frag:boolean}}
 */
function renderQueueItem(queueMd, id, opts) {
  const QV = require('./queue-view.js');
  const frag = !!(opts && opts.frag);
  const wrap = (status, html, title) =>
    frag ? { status, html, frag } : { status, html: page({ title, crumb: '', body: html }), frag };
  const notFound = wrap(
    404,
    `<h1>Not found</h1><p class="note">No open item answers to that id.</p>`,
    'Not found'
  );
  if (typeof queueMd !== 'string' || !queueMd.trim()) return notFound;
  if (typeof id !== 'string' || !QV.ITEM_ID_RE.test(id + '. x')) return notFound;
  let items;
  try {
    items = QV.parseQueue(queueMd).blocks.filter(b => b.type === 'item' && b.id === id);
  } catch {
    return notFound;
  }
  if (!items.length) return notFound;
  const it = items[0];
  const heading = QV.titleText(it.title).trim();
  const art =
    `<article class="qitem"><h1 id="${escapeHtml(it.anchor)}"><code>${escapeHtml(it.id)}</code> ` +
    `${escapeHtml(heading)}</h1>` +
    QV.mdToHtml(it.body) +
    `<p class="note"><a href="/queue">&#8592; Back to the queue</a></p></article>`;
  return wrap(200, art, it.id);
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
  renderQueueItem,
  renderReportsIndex,
  renderNotFound,
  page,
  escapeHtml,
  buildToc,
  // ⭐ Exported so the suite drives the REAL derivation rather than a restatement
  // of it — a test that retypes the rule only ever proves the retyped copy.
  closedOverWholeQueue,
  POPULATIONS,
  comparabilityReport,
  boardAxes,
  PROJECT_BLURB,
};
