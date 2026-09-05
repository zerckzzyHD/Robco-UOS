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

/**
 * What each CP-RULE v1 domain actually contains, in the owner's own words for the
 * axis he asked for — including, where they differ, the fact that they differ.
 * ⛔ A blurb never renames a domain into a project it is not: CP is not "the control
 * plane" alone, it is the control plane AND the harness, and saying so on the tile is
 * the only thing that stops the label being read as the six-value axis.
 */
const PROJECT_BLURB = {
  CP: 'the control plane — ⚠ AND the harness, which has no bucket of its own',
  MIST: 'Mist',
  MUSEUM: 'the museum / exhibit publication programme',
  APP: 'RobCo the app — this repo',
  UNASSIGNED: 'no rule places these — a finding, never folded into CP',
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
    owner: { observable: false, why: 'no queue was handed to the renderer' },
    domains: s.domains || { observable: false, why: 'no domain census was handed to the renderer' },
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
      out.owner = out.horizons;
      return out;
    }
    const fmt = s.itemFormat && s.itemFormat.observable ? s.itemFormat.mod : null;
    out.horizons = A.readHorizons(items, fmt);
    if (!out.horizons.observable && s.itemFormat && s.itemFormat.why) {
      out.horizons.why = s.itemFormat.why;
    }
    const bands = A.bandById(queueMd, QV, RG.bandOfHeading);
    out.someday = A.somedayByBand(out.horizons, bands);
    // band KEY → the board's display LABEL, so a per-band correction can be shown
    // against the band the reader is actually looking at.
    for (const st of QV.STATUSES) {
      out.bandLabelOf.set(st.key, st.key === RG.BACKLOG_KEY ? RG.BACKLOG_LABEL : st.label);
    }
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
  const { boardCurrency } = require('./roadmap-generate.js');
  // Both new axes, over the whole queue. Independently three-cased: one
  // unreachable source degrades one axis, never the page.
  const axes = boardAxes(queueMd, sources);
  const sections = splitSections(md);
  const bands = new Map();
  for (const s of sections) {
    const b = bandOf(s.heading);
    if (b) bands.set(b.label, { ...b, lines: s.lines });
  }

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
  const stat = (v, label, hint) =>
    `<li><span class="n${/[0-9]/.test(String(v)) ? '' : ' word'}">${v}</span><span class="k">${escapeHtml(label)}</span>` +
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
          'Reading a row is what moves it out of here.'
      );

  const counts =
    `<ul class="stats">` +
    stat(n('Active'), 'being worked on now', 'started, not finished') +
    stat(
      censusObservable ? `${cz.count} of ${cz.total}` : 'UNOBSERVABLE',
      'need you — open owner decisions',
      censusHint
    ) +
    // ⛔ `laneCount` is the ONE place a lane number is decided, so the "no reads ⇒
    // UNOBSERVABLE, never 0" rule cannot be honoured on one tile and forgotten on
    // the next. `.read` is deliberately unreachable without passing `.observable`.
    stat(laneCount('decide'), 'he decides — a sitting', laneHint('decide')) +
    stat(laneCount('do'), 'his hands — a task list', laneHint('do')) +
    unreadTile +
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

  // ── HORIZON — three-valued, and UNSET is never a default ────────────────────
  const hz = axes.horizons;
  const horizonHtml = !hz.observable
    ? `<h2>Horizon</h2><p class="note stale">⛔ <strong>The horizon could not be read.</strong> ${escapeHtml(hz.why)}. ` +
      `⚠ That is NOT the same as “every item is unset” — this page cannot tell you either way, so it shows no number.</p>`
    : (() => {
        const c = hz.counts;
        const someday = c[require('./board-axes.js').SOMEDAY_NAME] || 0;
        const cells = hz.vocabulary
          .map(
            v =>
              `<li><span class="n">${c[v] || 0}</span><span class="k">${escapeHtml(v.toLowerCase().replace(/-/g, ' '))}</span>` +
              `<span class="h">${escapeHtml(
                v === 'BLOCKS-WORK-NOW'
                  ? 'in the way of work today'
                  : v === 'NEXT'
                    ? 'after the current thing'
                    : 'a captured thought with a condition — ⛔ in NO total on this page'
              )}</span></li>`
          )
          .join('');
        const unset =
          `<li><span class="n">${c.UNSET}</span><span class="k">unset</span>` +
          `<span class="h">no horizon stated — ⛔ shown as unset, never counted as one of the three. The field is being ` +
          `assigned now; unset means nobody has said yet.</span></li>`;
        const unparse = c.UNPARSEABLE
          ? `<li><span class="n">${c.UNPARSEABLE}</span><span class="k">unreadable</span>` +
            `<span class="h">a horizon line that is not one of the three words: ${escapeHtml(hz.unparseable.slice(0, 12).join(', '))}</span></li>`
          : '';
        const somedayList = someday
          ? `<details class="drift"><summary>Which ${someday} someday-if <span class="c">excluded</span></summary>` +
            `<ul>${[...hz.someday].map(id => `<li><code>${escapeHtml(id)}</code></li>`).join('')}</ul>` +
            `<p class="note">Visible because you asked. ⛔ None of these is in any total above or in any band count below.</p></details>`
          : `<p class="note">No item carries <code>SOMEDAY-IF</code> yet, so no total changes today. The exclusion is applied ` +
            `regardless — a rule that only starts working once somebody notices it is not a rule.</p>`;
        return (
          `<h2>Horizon</h2>` +
          `<p class="note">Should this item be counted yet — read from each item's own <code>accept</code> block, over all ` +
          `${hz.total} items. ⛔ A <code>SOMEDAY-IF</code> item is in no total on this page.</p>` +
          `<ul class="stats">${cells}${unset}${unparse}</ul>` +
          somedayList
        );
      })();

  // ── PROJECT — rendered under the rule that actually exists, with the gap named ──
  const dm = axes.domains;
  const projectHtml = !dm.observable
    ? `<h2>Project</h2><p class="note stale">⛔ <strong>The per-project split could not be measured.</strong> ${escapeHtml(dm.why)}.</p>`
    : `<h2>Project</h2>` +
      `<p class="note">Which thing an item belongs to, from the planning tree's own <strong>${escapeHtml(dm.rule)}</strong> ` +
      `domain census — one board filtered, never six boards. Assigned per ID-family with per-item overrides, each carrying its ` +
      `reason. Rule last edited ${escapeHtml(dm.editedAt ? String(dm.editedAt.toISOString()).slice(0, 10) : 'unknown')}.</p>` +
      `<ul class="stats">${Object.entries(dm.counts)
        .sort((a, b) => b[1] - a[1])
        .map(
          ([k, v]) =>
            `<li><span class="n">${v}</span><span class="k">${escapeHtml(k)}</span>` +
            `<span class="h">${escapeHtml(PROJECT_BLURB[k] || 'no blurb for this domain')}</span></li>`
        )
        .join('')}</ul>` +
      (dm.summed === dm.total
        ? ''
        : `<p class="note stale">⛔ The domains sum to ${dm.summed} but the census counted ${dm.total} items — it was read ` +
          `against a different moment of a queue that is being edited live. Treat the split as indicative, not exact.</p>`) +
      `<p class="note">⛔ <strong>This is four values where you named six.</strong> ${escapeHtml(dm.rule)} knows CP · MIST · ` +
      `MUSEUM · APP (+ UNASSIGNED). <strong>The harness is folded inside CP</strong> and <strong>Binder has no bucket at ` +
      `all</strong> — its items sit in CP and MIST under a rule whose own text excludes Binder from CP. There is no ` +
      `<code>project:</code> field: the item format's key set is closed and refuses an unknown key, so the six-value axis ` +
      `needs that key set opened in the archive before anything can carry it. Named here rather than approximated.</p>`;

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
  const bandHtml = BAND_ORDER.filter(k => bands.has(k))
    .map(k => {
      const b = bands.get(k);
      const open = BAND_OPEN.has(k) && b.count > 0 ? ' open' : '';
      const excluded = somedayByLabel.get(k) || [];
      const countCell = excluded.length
        ? `<span class="c">${b.count - excluded.length}</span>`
        : `<span class="c">${b.count}</span>`;
      const note = excluded.length
        ? `<p class="note">⛔ ${b.count} on the board, <strong>${b.count - excluded.length} counted here</strong> — ` +
          `${excluded.length} carry <code>SOMEDAY-IF</code> and are in no total: ` +
          `${excluded.map(id => `<code>${escapeHtml(id)}</code>`).join(', ')}. The board's own heading still counts them; ` +
          `this page does not.</p>`
        : '';
      return (
        `<details class="band"${open}><summary>${escapeHtml(k)} ${countCell}</summary>` +
        `<p class="note">${escapeHtml(BAND_BLURB[k] || '')}</p>` +
        note +
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
    ownerLists +
    decisionList +
    disagreeList +
    horizonHtml +
    projectHtml +
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
function renderQueue(board, queueMd, census, sources) {
  const body = board
    ? renderRoadmapSection(board.text, board.mtime, queueMd, census, sources)
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
  boardAxes,
  PROJECT_BLURB,
};
