'use strict';
/**
 * scripts/console-shell.js — the Mist Console's ONE identity and frame source.
 *
 * Milestone 1 of the Mist Console (DS13 / DS13a, 2026-09-23), merged build
 * (mc1/queue-merged, 2026-09-25) of the two paired blind builds: the Opus lens's
 * shell and route boundary, the Fable lens's identity registry and glossary,
 * joined into one file so one term, one colour and one icon keep one meaning
 * across every console page.
 *
 *   TOKENS    the one palette. The CSS below is generated from it; no surface
 *             file carries a colour literal of its own.
 *   SECTIONS  each queue section's identity: its accent token, its icon, its
 *             name. A section is recognisable by colour AND icon AND word —
 *             never colour alone.
 *   ICONS     the one icon registry. Each id has exactly one meaning, written
 *             next to its drawing, and names what it must never be used for.
 *             Icons sit beside visible text and are aria-hidden.
 *   GLOSSARY  the one vocabulary: the exact wire token (DS13a ruling 5: the
 *             current wire tokens are kept), and a plain gloss.
 *   shell()   the page frame: header, "as of" stamp, the bottom tab bar, the
 *             read-only statement.
 *
 * WHAT A VIEW MAY CONTAIN (the Mist View boundary, _Mist-Forge
 * view/docs/BOUNDARY.md; MCA-2026-09-23 §4.2A and §6.7; DS13a ruling 1).
 * Links, document anchors and text. No <script>, <form>, <button>, <input>,
 * <select>, <textarea>, <details>, inline handler, javascript: URL, meta
 * refresh or timer. Enforced twice: by the Content-Security-Policy the route
 * sends, and by viewBoundary() below, which the test runner applies to every
 * rendered page.
 *
 * HOW A SECTION FOLDS WITHOUT A CONTROL. The owner asked for sections folded to
 * one line and opened on a tap (2026-09-25). A <details> element would do it
 * and is named in the boundary as forbidden, so the fold is built from what the
 * boundary allows: document anchors and CSS. A folded card's summary is a link
 * to the card's own anchor; the browser's :target selector opens that card; the
 * same summary then links to an anchor just above the card, which folds it in
 * place. Nothing runs, nothing is sent, and with CSS off every section is open.
 * One section is open at a time; `?open=all` renders every section open.
 *
 * PURE. No I/O. Everything here is a function of its arguments.
 */

// ── tokens ──────────────────────────────────────────────────────────────────
// The audit's palette (MCA-2026-09-23 §4.6), adopted provisionally (DS13a
// ruling 6), plus three section accents chosen for this merge. Contrast, the
// standard relative-luminance formula, calculated 2026-09-25 (token pairs, not a
// rendered audit): on `surface` — text 13.24, text2 7.64, accent 7.76, fail
// 7.93, attention 9.18, pass 8.58, blocked 7.81, landed 8.91, flow 7.57; on each
// section's own tint (the accent at 14% over surface) — text ≥ 9.66, text2
// ≥ 5.58, the accent itself ≥ 5.68. Every pair clears 4.5:1.
const TOKENS = Object.freeze({
  canvas: '#141B22',
  surface: '#1B2530',
  surface2: '#212D39',
  text: '#E8EEF1',
  text2: '#AAB8C2',
  accent: '#9FBCC9',
  stroke: '#6D8491',
  rule: '#2A3845',
  fail: '#F0A7A0',
  attention: '#E2C38D',
  pass: '#A6C9B2',
  blocked: '#C6ABF7',
  landed: '#74D3D9',
  flow: '#9DB2FF',
  radius: '10px',
  gutter: '16px',
  measure: '44rem',
  font: "system-ui, -apple-system, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif",
  mono: "ui-monospace, 'SF Mono', 'Cascadia Mono', Consolas, 'Liberation Mono', monospace",
});

/**
 * Colour MEANINGS. Semantic colours carry one meaning each, always beside a
 * word: fail = RED (past a ruled limit) or a failed read; attention = the
 * next step is the owner's; pass = a named GREEN verdict. The three section
 * accents are identity only — they say which section you are in, never a verdict.
 */
const SECTIONS = Object.freeze({
  needs: { accent: 'attention', icon: 'needs-owner', name: 'Needs you' },
  blocked: { accent: 'blocked', icon: 'blocked', name: 'Blocked' },
  landed: { accent: 'landed', icon: 'landed', name: 'Landed, unconfirmed' },
  flow: { accent: 'flow', icon: 'flow', name: 'Filed vs closed' },
  pause: { accent: 'text', icon: 'paused', name: 'Pause state' },
  board: { accent: 'accent', icon: 'queue', name: 'The board in numbers' },
  sources: { accent: 'stroke', icon: 'provenance', name: 'How this page knows' },
  state: { accent: 'accent', icon: 'queue', name: 'Records by state' },
});

/** A token blended over `surface` — the section tint. Generated, never typed. */
function tint(hex, t) {
  const a = TOKENS.surface;
  return (
    '#' +
    [1, 3, 5]
      .map(i =>
        Math.round(
          parseInt(hex.slice(i, i + 2), 16) * t + parseInt(a.slice(i, i + 2), 16) * (1 - t)
        )
          .toString(16)
          .padStart(2, '0')
      )
      .join('')
  );
}

// ── icons ───────────────────────────────────────────────────────────────────
// 24-unit square, 1.75 stroke, round caps and joins, no fill; a dot is a
// zero-length segment with round caps. `meaning` is the ONE thing the icon may
// stand for; `not` names the nearby meanings it must never be used for.
// Merged from the two builds' registries (23 + 13): the twelve shared meanings
// kept once, the destination icons renamed to the pages they open, and one new
// glyph (`now`) for the always-open urgent block.
const ICONS = Object.freeze({
  'mist-mark': {
    meaning: 'Mist Console identity. Never a status.',
    not: 'liveness, loading, success',
    d: 'M4 8.5Q12 4 20 8.5M4 15.5Q12 20 20 15.5',
  },
  home: {
    meaning: 'The Home destination (the start page).',
    not: 'dashboard health',
    d: 'M3.5 4.5h17v15h-17zM3.5 11h17M12 11v8.5',
  },
  queue: {
    meaning: 'Queue records: the build board and its items.',
    not: 'a task list you can edit',
    d: 'M9 7h11M9 12h11M9 17h11M4.5 7h.01M4.5 12h.01M4.5 17h.01',
  },
  status: {
    meaning: 'The Status destination: readings about the control plane.',
    not: 'settings, a control, "healthy"',
    d: 'M4 5h16v14H4zM4 9h2.5M20 9h-2.5M4 15h2.5M20 15h-2.5M12 5v2.5M12 19v-2.5',
  },
  reports: {
    meaning: 'The Reports destination: authored reports.',
    not: 'proof that something passed',
    d: 'M8 3.5h8.5l3 3V17H8zM16.5 3.5v3h3M5 7v13.5h11',
  },
  now: {
    meaning:
      'Now: shown without opening a section, because it meets the urgency rule stated beside it.',
    not: 'a producer ATTENTION verdict, a ranking',
    d: 'M12 3l9 9-9 9-9-9zM12 8v5M12 16h.01',
  },
  'needs-owner': {
    meaning: 'The next step is the owner’s: a ruling or his own hands.',
    not: 'an error, a ranking',
    d: 'M12 20v-8M12 12L7.5 6.5M12 12l4.5-5.5M7 5h.01M17 5h.01',
  },
  'owner-ruling': {
    meaning: 'The next step is a ruling only the owner can make (OWNER-RULING).',
    not: 'a vote, approval already given',
    d: 'M12 4.5v15M7 19.5h10M5 8h14M5 8l-2.5 5.5h5zM19 8l-2.5 5.5h5z',
  },
  'owner-keyboard': {
    meaning: 'The next step needs the owner at the keyboard (OWNER-KEYBOARD).',
    not: 'a ruling, a session task',
    d: 'M3.5 7h17v10.5h-17zM7 10.5h.01M10.3 10.5h.01M13.7 10.5h.01M17 10.5h.01M8 14h8',
  },
  blocked: {
    meaning: 'Held: a LIVE blocker, or a record that says BLOCKED.',
    not: 'failed, rejected, paused',
    d: 'M3.5 12h9M9.5 8.5l3.5 3.5-3.5 3.5M17 5v14',
  },
  landed: {
    meaning: 'LANDED: work is in; a session other than its builder has not confirmed it yet.',
    not: 'done, passed, closed, deployed',
    d: 'M12 4v10.5M8 10.5l4 4 4-4M5 19.5h14',
  },
  confirmed: {
    meaning: 'CONFIRMED by a non-builder; still open until its done-check.',
    not: 'closed, passed',
    d: 'M3.5 12.5l3.5 3.5 6-7M11 16l1 1 8-9.5',
  },
  overdue: {
    meaning: 'RED: past its ruled time limit.',
    not: 'stale data, an error',
    d: 'M12 21a7.5 7.5 0 1 0 0-15 7.5 7.5 0 0 0 0 15zM12 10v3.5l2.5 1.5M9.5 3h5',
  },
  flow: {
    meaning: 'Items filed versus items closed over a stated range.',
    not: 'sync, refresh, progress',
    d: 'M4 8.5h12.5M13 5l3.5 3.5L13 12M20 15.5H7.5M11 12l-3.5 3.5L11 19',
  },
  finding: {
    meaning: 'An entry in the findings intake, not yet on the board.',
    not: 'a board item, a defect confirmed',
    d: 'M3.5 13.5 6 6h12l2.5 7.5v5.5h-17zM3.5 13.5H8.5l1.5 2.5h4l1.5-2.5h5',
  },
  paused: {
    meaning: 'PAUSED: the control plane’s halt file is present.',
    not: 'a stopped server, an offline phone, an error',
    d: 'M9 6v12M15 6v12',
  },
  unobservable: {
    meaning: 'UNOBSERVABLE: a required reading could not be made.',
    not: 'zero, empty, fine, loading',
    d: 'M18.5 7A8 8 0 1 0 19 16M20 11.5h.01',
  },
  stale: {
    meaning: "STALE: the producer's own freshness limit has passed.",
    not: 'overdue work, an error',
    d: 'M19.8 12A7.8 7.8 0 1 1 16.9 6M12 8v4l3 2',
  },
  unbuilt: {
    meaning: 'Not built yet: a labelled slot, not a capability.',
    not: 'empty, disabled, loading',
    d: 'M5 5h3M11 5h2M16 5h3v3M19 11v2M19 16v3h-3M13 19h-2M8 19H5v-3M5 13v-2M5 8V5',
  },
  'not-work': {
    meaning: 'On the board but typed as not work (D6-A): not counted or ranked as work.',
    not: 'done, hidden',
    d: 'M7 4h10v16l-5-4-5 4z',
  },
  provenance: {
    meaning: 'Where a displayed fact came from.',
    not: 'verification, proof it is correct',
    d: 'M15.5 5H19v14h-3.5M5 12h8.5M5 12h.01',
  },
  'read-only': {
    meaning: 'This page only shows records. It has no controls.',
    not: 'private, secure',
    d: 'M2.5 12S6 6 12 6s9.5 6 9.5 6-3.5 6-9.5 6-9.5-6-9.5-6zM12 14.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5z',
  },
  private: {
    meaning: 'This surface is classified private. Not an access-control claim.',
    not: 'authenticated, secure',
    d: 'M7.5 5H4v14h3.5M16.5 5H20v14h-3.5M12 12h.01',
  },
  next: {
    meaning: 'Go to the linked detail.',
    not: 'progress, success, an ordering',
    d: 'M9.5 6l6 6-6 6',
  },
  back: {
    meaning: 'Go to the named parent page.',
    not: 'undo, revert',
    d: 'M14.5 6l-6 6 6 6',
  },
});

/** The inline <use> for one registered icon. An unregistered id throws: no ad hoc glyphs. */
function icon(id, cls) {
  if (!Object.prototype.hasOwnProperty.call(ICONS, id)) {
    throw new Error('console-shell: unregistered icon "' + id + '"');
  }
  return (
    '<svg class="i' +
    (cls ? ' ' + cls : '') +
    '" aria-hidden="true" focusable="false"><use href="#i-' +
    id +
    '"/></svg>'
  );
}

/** One hidden sprite holding every registered symbol. Inline, so the page loads nothing. */
function sprite() {
  const syms = Object.entries(ICONS)
    .map(
      ([id, v]) =>
        '<symbol id="i-' +
        id +
        '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" ' +
        'stroke-linecap="round" stroke-linejoin="round"><path d="' +
        v.d +
        '"/></symbol>'
    )
    .join('');
  return '<svg class="sprite" aria-hidden="true" focusable="false">' + syms + '</svg>';
}

// ── vocabulary ──────────────────────────────────────────────────────────────
// ONE glossary, merged from both builds. `token` is the exact wire value where
// one exists (DS13a ruling 5: kept, unaliased); `gloss` is the plain reading.
// `group` only orders the /queue/terms page.
const GLOSSARY = Object.freeze([
  // page terms
  {
    group: 'page',
    term: 'Open item',
    token: '### <ID>.',
    gloss: 'An ID-bearing item on the build board (QUEUE.md) at the commit this page read.',
  },
  {
    group: 'page',
    term: 'Work',
    token: 'work',
    gloss:
      'An open item whose kind is not RULE, SPECIMEN, CAPTURE or PROGRAMME (owner ruling D6-A). An item with no record block has no stated kind and counts as work.',
  },
  {
    group: 'page',
    term: 'Not work',
    token: 'RULE · SPECIMEN · CAPTURE · PROGRAMME',
    gloss: 'Kept on the board where its links point, but not counted or ranked as work.',
  },
  {
    group: 'page',
    term: 'Needs you',
    token: 'actor OWNER-RULING | OWNER-KEYBOARD',
    gloss:
      'A work item whose next step is yours, in state TODO, READY, ACTIVE or QUESTION, not SOMEDAY-IF, and not held by a blocker. Yours but held, parked, deferred or someday are counted beside it, not hidden.',
  },
  {
    group: 'page',
    term: 'Now',
    token: 'Now',
    gloss:
      'The part of /queue shown without opening anything: the pause state, landed work past its limit, your items that block work now, and findings past their limit.',
  },
  {
    group: 'page',
    term: 'Blocked',
    token: 'BLOCKED · a LIVE blocks-edge',
    gloss:
      'Cannot proceed until something else happens: its record says BLOCKED, or the blocker graph names a LIVE blocker. A DISCHARGED edge, or one whose blocker is already closed, is not a blocker.',
  },
  {
    group: 'page',
    term: 'RED',
    token: 'RED',
    gloss:
      'Past a ruled limit: landed and unconfirmed for more than CONFIRM_LIMIT_DAYS (3, D3-A), or a finding open for more than FINDING_RED_DAYS (14).',
  },
  {
    group: 'page',
    term: 'Finding',
    token: 'F-NNNN',
    gloss: 'An entry in the findings intake (FINDINGS-INTAKE.md). Not a board item until promoted.',
  },
  {
    group: 'page',
    term: 'Filed / closed',
    token: 'board-inflow/v1 (D9-A)',
    gloss:
      'Items that appeared on the board, and items that left it for the log, since the last checkpoint — computed by the archive’s intake tool, not by this page.',
  },
  {
    group: 'page',
    term: 'as of',
    token: 'as of',
    gloss:
      'The moment this page read its sources. Nothing refreshes by itself: reload to read again.',
  },
  // evidence words
  {
    group: 'evidence',
    term: 'UNOBSERVABLE',
    token: 'UNOBSERVABLE',
    gloss: 'A required reading could not be made. Never a zero and never "fine".',
  },
  {
    group: 'evidence',
    term: 'STALE',
    token: 'STALE',
    gloss:
      "The producer's own freshness limit has passed; the value is shown with its age and is not the present.",
  },
  {
    group: 'evidence',
    term: 'UNSET',
    token: 'UNSET',
    gloss: 'The record carries no value for this field. Never defaulted.',
  },
  {
    group: 'evidence',
    term: 'UNPARSEABLE',
    token: 'UNPARSEABLE',
    gloss: 'The field is present but not in its vocabulary.',
  },
  {
    group: 'evidence',
    term: 'UNKNOWN',
    token: 'UNKNOWN',
    gloss: 'Somebody looked, and the text does not settle it.',
  },
  {
    group: 'evidence',
    term: 'CLAIMED',
    token: 'CLAIMED',
    gloss: 'Written down by a session or the owner; this page shows it and did not measure it.',
  },
  {
    group: 'evidence',
    term: 'DERIVED',
    token: 'DERIVED',
    gloss: 'Computed from the named records; no stronger than those records.',
  },
  {
    group: 'evidence',
    term: 'OBSERVED',
    token: 'OBSERVED',
    gloss: 'Read directly from a producer record, or measured, at the time shown.',
  },
  // actor basis
  {
    group: 'basis',
    term: 'quoted',
    token: 'QUOTED',
    gloss: 'Basis: a reading that quotes the words it was decided from. Strongest.',
  },
  { group: 'basis', term: 'block', token: 'BLOCK', gloss: 'Basis: the item’s own accept block.' },
  {
    group: 'basis',
    term: 'graph',
    token: 'GRAPH',
    gloss:
      'Basis: another graph row (a digest, a keyword, a status). Weakest; shown with its basis word.',
  },
  // lifecycle states
  { group: 'state', term: 'TODO', token: 'TODO', gloss: 'Filed, not started.' },
  { group: 'state', term: 'READY', token: 'READY', gloss: 'Specified and unblocked; can start.' },
  { group: 'state', term: 'ACTIVE', token: 'ACTIVE', gloss: 'Being worked on.' },
  {
    group: 'state',
    term: 'BLOCKED',
    token: 'BLOCKED',
    gloss:
      'Its record says it cannot proceed (the heading glyph the old page labelled "Attention").',
  },
  {
    group: 'state',
    term: 'QUESTION',
    token: 'QUESTION',
    gloss: 'An open question: a decision surface, not yet filed work.',
  },
  {
    group: 'state',
    term: 'DEFERRED',
    token: 'DEFERRED',
    gloss: 'Deliberately not now, with a reason.',
  },
  {
    group: 'state',
    term: 'PARKED',
    token: 'PARKED',
    gloss: 'Stopped on purpose until a condition; not abandoned.',
  },
  {
    group: 'state',
    term: 'SETTLED',
    token: 'SETTLED',
    gloss: 'Answered for good; stays visible because it still constrains others.',
  },
  {
    group: 'state',
    term: 'LANDED',
    token: 'LANDED',
    gloss:
      'The builder recorded the work as landed; a session other than the builder must confirm it (D3-A).',
  },
  {
    group: 'state',
    term: 'CONFIRMED',
    token: 'CONFIRMED',
    gloss: 'Confirmed by a non-builder; open until its done-check reads green.',
  },
  // horizons
  {
    group: 'horizon',
    term: 'BLOCKS-WORK-NOW',
    token: 'BLOCKS-WORK-NOW',
    gloss: 'Horizon: this item stands in the way of work now.',
  },
  {
    group: 'horizon',
    term: 'NEXT',
    token: 'NEXT',
    gloss: 'Horizon: counted, queued behind what blocks work now.',
  },
  {
    group: 'horizon',
    term: 'SOMEDAY-IF',
    token: 'SOMEDAY-IF',
    gloss: 'Horizon: waits on a condition, not on anyone today; in no work total on this page.',
  },
  // actors
  {
    group: 'actor',
    term: 'OWNER-RULING',
    token: 'OWNER-RULING',
    gloss: 'Actor: the next step is a decision only the owner can make.',
  },
  {
    group: 'actor',
    term: 'OWNER-KEYBOARD',
    token: 'OWNER-KEYBOARD',
    gloss: 'Actor: the next step is done by the owner’s own hands, at his machine.',
  },
  {
    group: 'actor',
    term: 'SESSION',
    token: 'SESSION',
    gloss: 'Actor: the next step is a session’s.',
  },
  {
    group: 'actor',
    term: 'EXTERNAL',
    token: 'EXTERNAL',
    gloss: 'Actor: the next step is outside this estate.',
  },
]);

// ── text helpers ────────────────────────────────────────────────────────────
function esc(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * A time for a person: local, with the offset spelled out, so a phone reading
 * it elsewhere is never guessing. The exact ISO value rides in <time datetime>.
 */
function fmtTime(d) {
  const t = d instanceof Date ? d : new Date(d);
  if (isNaN(t.getTime())) return 'time unreadable';
  const date = t.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  const clock = t.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  const off = -t.getTimezoneOffset();
  const sign = off >= 0 ? '+' : '−';
  const hh = Math.floor(Math.abs(off) / 60);
  const mm = Math.abs(off) % 60;
  return (
    date + ', ' + clock + ' (UTC' + sign + hh + (mm ? ':' + String(mm).padStart(2, '0') : '') + ')'
  );
}

function timeTag(d) {
  const t = d instanceof Date ? d : new Date(d);
  if (isNaN(t.getTime())) return '<span>time unreadable</span>';
  return '<time datetime="' + esc(t.toISOString()) + '">' + esc(fmtTime(t)) + '</time>';
}

/** "4 min", "3 h", "2 d" — an age, never rounded to "just now". */
function fmtAge(ms) {
  if (typeof ms !== 'number' || !isFinite(ms)) return 'age unknown';
  if (ms < 0) return 'in the future (clock disagreement)';
  const s = Math.round(ms / 1000);
  if (s < 90) return s + ' s';
  const m = Math.round(s / 60);
  if (m < 90) return m + ' min';
  const h = Math.round(m / 60);
  if (h < 48) return h + ' h';
  return Math.round(h / 24) + ' d';
}

// ── the frame ───────────────────────────────────────────────────────────────
function css() {
  const t = TOKENS;
  const vars = Object.entries(t)
    .map(([k, v]) => '--' + k + ':' + v + ';')
    .join('');
  // One rule per section: its accent and its tint, both generated from TOKENS.
  const sec = Object.entries(SECTIONS)
    .map(
      ([id, s]) => '.c-' + id + '{--c:var(--' + s.accent + ');--ct:' + tint(t[s.accent], 0.14) + '}'
    )
    .join('');
  return `
:root{color-scheme:dark;${vars}--nav-h:64px}
${sec}
*{box-sizing:border-box}
html{-webkit-text-size-adjust:100%;text-size-adjust:100%}
body{margin:0;background:var(--canvas);color:var(--text);font:17px/1.5 var(--font);padding-bottom:calc(var(--nav-h) + env(safe-area-inset-bottom) + 24px)}
a{color:var(--accent);text-underline-offset:3px}
a:focus-visible,.row:focus-visible{outline:2px solid var(--accent);outline-offset:2px;border-radius:6px}
code,.mono{font-family:var(--mono);font-size:.88em}
p{overflow-wrap:anywhere}
.sprite{position:absolute;width:0;height:0;overflow:hidden}
.i{width:20px;height:20px;flex:none;vertical-align:-4px}
.skip{position:absolute;left:-9999px}.skip:focus{left:var(--gutter);top:8px;background:var(--surface);padding:8px 12px;z-index:9}
.wrap{max-width:var(--measure);margin:0 auto;padding:0 var(--gutter)}
header.top{border-bottom:1px solid var(--rule)}
.brand{display:flex;align-items:center;gap:8px;padding-top:14px;color:var(--text2);font-size:14px;letter-spacing:.02em}
.brand .i{color:var(--accent);width:22px;height:22px}
.brand b{color:var(--text);font-weight:600}
.class{margin-left:auto;display:inline-flex;align-items:center;gap:6px}
.class .i{width:16px;height:16px;color:var(--text2)}
h1{font-size:28px;line-height:1.2;margin:10px 0 4px;font-weight:650;letter-spacing:-.01em}
.subtitle{font-size:19px;line-height:1.35;font-weight:550;margin:0 0 8px;overflow-wrap:anywhere}
.asof{color:var(--text2);font-size:14px;margin:0 0 12px;display:flex;flex-wrap:wrap;gap:2px 12px}
.asof b{color:var(--text);font-weight:600}
.crumb{font-size:14px;margin:12px 0 0;display:flex;flex-wrap:wrap;gap:4px 10px}
.crumb a{display:inline-flex;align-items:center;gap:2px;min-height:32px}
main{padding-top:10px}
h2{font-size:20px;line-height:1.3;margin:0 0 6px;display:flex;align-items:center;gap:8px;font-weight:650}
h3{font-size:15px;margin:16px 0 6px;color:var(--text2);font-weight:600;letter-spacing:.02em;display:flex;align-items:center;gap:6px}
h3 .i{width:18px;height:18px}
.def{color:var(--text2);font-size:14px;margin:0 0 10px}
.def b{color:var(--text);font-weight:600}
.att{color:var(--attention)}.bad{color:var(--fail)}.ok{color:var(--pass)}.muted{color:var(--text2)}
.tag{display:inline-flex;align-items:center;gap:4px;white-space:nowrap}
.tag .i{width:16px;height:16px;vertical-align:-3px}
.tok{font-family:var(--mono);font-size:12px;letter-spacing:.03em;border:1px solid var(--rule);border-radius:4px;padding:0 4px;color:var(--text2);white-space:nowrap}
.tok.att{color:var(--attention);border-color:var(--attention)}
.tok.bad{color:var(--fail);border-color:var(--fail)}
.tok.ok{color:var(--pass);border-color:var(--pass)}
.ep{font-family:var(--mono);font-size:12px;letter-spacing:.04em;border:1px solid var(--stroke);border-radius:4px;padding:0 4px;color:var(--text2);white-space:nowrap}
/* ── the always-open urgent block ── */
.now{margin:4px 0 14px;border:1px solid var(--stroke);border-left:4px solid var(--text);border-radius:var(--radius);background:var(--surface);padding:10px 12px}
.now>h2{font-size:17px;margin:0 0 2px}
.now>.def{margin:0 0 6px}
.now .band{border-top:1px solid var(--rule);padding:8px 0;display:grid;grid-template-columns:22px 1fr;gap:2px 10px;font-size:15px}
.now .band .i{width:22px;height:22px;margin-top:1px}
.now .band b{font-weight:650}
.now .band.u{border-top-style:dashed}
.now .list{border-top:0}
.now .none{border-top:1px solid var(--rule);padding:8px 0 2px;font-size:15px;color:var(--text2)}
/* ── section cards: one line folded, open on tap (:target), never a control ── */
.xa{display:block;height:0;scroll-margin-top:8px}
.card{position:relative;margin:10px 0;background:var(--surface);border:1px solid var(--rule);border-left:4px solid var(--c);border-radius:var(--radius);scroll-margin-top:8px}
.card .sum{position:relative;display:grid;grid-template-columns:40px 1fr auto;gap:0 12px;align-items:center;padding:10px 12px 10px 10px;min-height:60px}
.card .tile{grid-row:1 / 3;width:40px;height:40px;border-radius:10px;background:var(--ct);color:var(--c);display:grid;place-items:center}
.card .tile .i{width:24px;height:24px}
.card .name{display:block;margin:0;font-weight:650;color:var(--c);font-size:17px;line-height:1.3}
.cc{color:var(--c)}
.card .n{font-size:22px;line-height:1.1;font-weight:700;font-variant-numeric:tabular-nums;text-align:right;color:var(--text)}
.card .n.word{font-size:13px;letter-spacing:.04em}
.card .sig{grid-column:2 / 4;font-size:14px;line-height:1.4;color:var(--text2);overflow-wrap:anywhere}
.card .sig b{color:var(--text);font-weight:600}
.card .tog{position:absolute;right:12px;bottom:8px;font-size:12px;color:var(--c);letter-spacing:.04em}
.card .sum .sig{padding-right:44px}
.card .hit{position:absolute;inset:0;border-radius:var(--radius);z-index:1}
.card .hit:focus-visible{outline:2px solid var(--c);outline-offset:2px}
.card .shut,.card .t-hide{display:none}
.card .body{display:none;padding:2px 12px 12px;border-top:1px solid var(--rule)}
.card:target .body,.card:has(:target) .body,.all-open .card .body{display:block}
.card:target .open,.card:has(:target) .open,.card:target .t-show,.card:has(:target) .t-show{display:none}
.card:target .shut,.card:has(:target) .shut,.card:target .t-hide,.card:has(:target) .t-hide{display:block}
.card:target{border-color:var(--c)}
.all-open .card .hit,.all-open .card .tog{display:none}
.card.slot{border-style:dashed;border-left-style:dashed}
.card.link .sum{padding-right:12px}
/* ── rows ── */
.list{list-style:none;margin:0;padding:0;border-top:1px solid var(--rule)}
.list>li{border-bottom:1px solid var(--rule)}
.list>li:last-child{border-bottom:0}
.row{display:block;padding:10px 2px;color:var(--text);text-decoration:none;min-height:44px}
.row:active{background:var(--surface2)}
.row .meta{display:flex;flex-wrap:wrap;align-items:center;gap:2px 8px;font-size:13px;color:var(--text2)}
.row .meta .id{font-family:var(--mono);color:var(--text);font-size:14px;font-weight:650}
.row .t{display:block;margin-top:2px;font-weight:500;line-height:1.35;overflow-wrap:anywhere}
.row .why{display:block;margin-top:3px;font-size:14px;line-height:1.4;color:var(--text2);overflow-wrap:anywhere}
.row .why b{color:var(--text);font-weight:600}
.row .go{float:right;color:var(--stroke);margin:0 0 0 8px}
.panel{background:var(--surface2);border:1px solid var(--rule);border-radius:8px;padding:10px 12px;margin:8px 0}
.panel.u{border-style:dashed;border-color:var(--stroke)}
.panel p{margin:0 0 6px}.panel p:last-child{margin-bottom:0}
.facts{margin:0;display:grid;grid-template-columns:minmax(6.5em,auto) 1fr;gap:6px 14px;font-size:15px}
.facts dt{color:var(--text2)}
.facts dd{margin:0;overflow-wrap:anywhere}
.counts{display:flex;flex-wrap:wrap;gap:4px 14px;font-size:15px;margin:4px 0 8px}
.counts b{font-variant-numeric:tabular-nums}
.src{font-size:14px;color:var(--text2);margin:8px 0 0;display:flex;gap:6px;align-items:flex-start}
.src .i{width:16px;height:16px;margin-top:3px}
.gloss{margin:0;padding:0;list-style:none;font-size:15px}
.gloss li{padding:8px 0;border-bottom:1px solid var(--rule)}
.gloss code{color:var(--text2)}
.record{border-top:1px solid var(--rule);margin-top:10px;padding-top:6px;font-size:16px;overflow-wrap:anywhere}
.record pre{white-space:pre-wrap;background:var(--surface);padding:10px;border-radius:8px;font-size:13px}
.record table{border-collapse:collapse;display:block;overflow-x:auto;font-size:14px}
.record td,.record th{border:1px solid var(--rule);padding:4px 6px}
.record blockquote{margin:8px 0;padding-left:12px;border-left:2px solid var(--stroke);color:var(--text2)}
.loud{border:1px solid var(--fail);border-radius:var(--radius);padding:12px 14px;background:var(--surface);margin:8px 0}
.loud .lead{font-weight:650;display:flex;gap:8px;align-items:center}
footer.foot{margin-top:28px;border-top:1px solid var(--rule);padding-top:12px;font-size:14px;color:var(--text2)}
footer.foot p{margin:0 0 8px;display:flex;gap:6px;align-items:flex-start}
footer.foot .i{width:16px;height:16px;margin-top:3px}
nav.bottom{position:fixed;left:0;right:0;bottom:0;background:var(--surface);border-top:1px solid var(--rule);padding-bottom:env(safe-area-inset-bottom);z-index:5}
nav.bottom ul{max-width:var(--measure);margin:0 auto;padding:0 6px;list-style:none;display:grid;grid-template-columns:repeat(4,1fr)}
nav.bottom a{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:2px;height:var(--nav-h);color:var(--text2);text-decoration:none;font-size:13px;border-radius:8px;margin:4px 2px 0}
nav.bottom a .i{width:22px;height:22px}
nav.bottom a[aria-current="page"]{color:var(--text);background:var(--surface2)}
nav.bottom a[aria-current="page"] span{font-weight:600}
@media (min-width:1000px){
  body{padding-bottom:0}
  nav.bottom{position:fixed;top:0;bottom:0;right:auto;width:200px;border-top:0;border-right:1px solid var(--rule)}
  nav.bottom ul{grid-template-columns:1fr;padding:84px 10px 0;gap:4px}
  nav.bottom a{flex-direction:row;justify-content:flex-start;gap:10px;height:44px;padding:0 12px;font-size:15px}
  .wrap{margin-left:max(224px,calc((100vw - var(--measure)) / 2))}
}
@media (prefers-reduced-motion:no-preference){a,.row{transition:background-color .12s,color .12s}}
`;
}

/** The four bottom tabs: the pages they open, named as those pages name themselves. */
const DESTINATIONS = Object.freeze([
  { id: 'home', href: '/', label: 'Home' },
  { id: 'queue', href: '/queue', label: 'Queue' },
  { id: 'status', href: '/status', label: 'Status' },
  { id: 'reports', href: '/reports', label: 'Reports' },
]);

/**
 * The page frame.
 * @param {object} o
 * @param {string} o.title       page title (one H1 unless o.h1)
 * @param {string} o.current     destination id for aria-current
 * @param {Date}   o.readAt      when this response was built
 * @param {string} o.asOfHtml    the data's own "as of" line (already escaped HTML)
 * @param {string} [o.crumbHtml] a breadcrumb row (already escaped HTML)
 * @param {string} o.body        main content (already escaped HTML)
 * @param {boolean} [o.allOpen]  every section card renders open
 */
function shell(o) {
  const nav = DESTINATIONS.map(
    d =>
      '<li><a href="' +
      d.href +
      '"' +
      (d.id === o.current ? ' aria-current="page"' : '') +
      '>' +
      icon(d.id) +
      '<span>' +
      esc(d.label) +
      '</span></a></li>'
  ).join('');
  return (
    '<!doctype html><html lang="en"><head><meta charset="utf-8">' +
    '<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">' +
    '<meta name="color-scheme" content="dark">' +
    '<meta name="robots" content="noindex,nofollow"><meta name="referrer" content="no-referrer">' +
    '<meta name="theme-color" content="' +
    TOKENS.canvas +
    '">' +
    '<title>' +
    esc(o.title) +
    ' · Mist Console</title><style>' +
    css() +
    '</style></head><body' +
    (o.allOpen ? ' class="all-open"' : '') +
    '>' +
    sprite() +
    '<a class="skip" href="#main">Skip to content</a>' +
    '<header class="top" id="top"><div class="wrap">' +
    '<div class="brand">' +
    icon('mist-mark') +
    '<b>Mist Console</b><span class="class">' +
    icon('private') +
    'Private · snapshot</span></div>' +
    (o.crumbHtml ? '<div class="crumb">' + o.crumbHtml + '</div>' : '') +
    '<h1>' +
    esc(o.h1 || o.title) +
    '</h1>' +
    (o.subtitle ? '<p class="subtitle">' + esc(o.subtitle) + '</p>' : '') +
    '<p class="asof">' +
    o.asOfHtml +
    '</p>' +
    '</div></header>' +
    '<main id="main" class="wrap">' +
    o.body +
    '<footer class="foot">' +
    '<p>' +
    icon('read-only') +
    '<span>Read-only. This page shows records and has no controls: a section opens by following a link to it. Nothing on it updates by itself; reload to read again. Page built ' +
    timeTag(o.readAt) +
    '.</span></p>' +
    '</footer></main>' +
    '<nav class="bottom" aria-label="Console destinations"><ul>' +
    nav +
    '</ul></nav>' +
    '</body></html>'
  );
}

/**
 * A section card: folded to one summary line, opened by following a link to
 * it. `summaryHtml` is { n, sig } — the count (or a word) and the key signal.
 * The body is always in the page (a reader without CSS sees everything); CSS
 * shows it when the card is the document's :target.
 */
function card(o) {
  const s = SECTIONS[o.section];
  if (!s) throw new Error('console-shell: unknown section "' + o.section + '"');
  const name = o.name || s.name;
  const iconId = o.icon || s.icon;
  const word = typeof o.n !== 'number';
  return (
    '<i class="xa" id="x-' +
    o.id +
    '"></i>' +
    '<section class="card c-' +
    o.section +
    (o.cls ? ' ' + o.cls : '') +
    '" id="' +
    o.id +
    '" aria-labelledby="' +
    o.id +
    '-h">' +
    '<div class="sum"><span class="tile">' +
    icon(iconId) +
    '</span><h2 class="name" id="' +
    o.id +
    '-h">' +
    esc(name) +
    '</h2><span class="n' +
    (word ? ' word' : '') +
    (o.nCls ? ' ' + o.nCls : '') +
    '">' +
    esc(o.n == null ? '' : o.n) +
    '</span><span class="sig">' +
    (o.sig || '') +
    '</span>' +
    '<span class="tog" aria-hidden="true"><span class="t-show">Show</span><span class="t-hide">Hide</span></span>' +
    '<a class="hit open" href="#' +
    o.id +
    '" aria-label="Show ' +
    esc(name) +
    '"></a><a class="hit shut" href="#x-' +
    o.id +
    '" aria-label="Hide ' +
    esc(name) +
    '"></a></div>' +
    '<div class="body">' +
    o.body +
    '</div></section>'
  );
}

/**
 * The View boundary, checked on RENDERED output. Returns the list of violations;
 * an empty list means none of the forbidden constructs is present. A check that
 * finds nothing is only trusted beside its planted positive control (tests).
 */
const VIEW_FORBIDDEN = Object.freeze([
  { id: 'script', re: /<script\b/i },
  { id: 'form', re: /<form\b/i },
  { id: 'button', re: /<button\b/i },
  { id: 'input', re: /<input\b/i },
  { id: 'select', re: /<select\b/i },
  { id: 'textarea', re: /<textarea\b/i },
  { id: 'details', re: /<details\b/i },
  { id: 'iframe', re: /<iframe\b/i },
  { id: 'inline-handler', re: /\son[a-z]+\s*=/i },
  { id: 'javascript-url', re: /javascript:/i },
  { id: 'meta-refresh', re: /http-equiv\s*=\s*["']?refresh/i },
]);
function viewBoundary(html) {
  const s = String(html || '');
  return VIEW_FORBIDDEN.filter(f => f.re.test(s)).map(f => f.id);
}

/** The response headers every console page carries: no script can run, nothing is kept. */
const VIEW_HEADERS = Object.freeze({
  'Content-Type': 'text/html; charset=utf-8',
  'Cache-Control': 'no-store, max-age=0',
  'Content-Security-Policy':
    "default-src 'none'; style-src 'unsafe-inline'; img-src data:; base-uri 'none'; form-action 'none'; frame-ancestors 'none'",
  'Referrer-Policy': 'no-referrer',
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'X-Robots-Tag': 'noindex, nofollow',
});

module.exports = {
  TOKENS,
  SECTIONS,
  ICONS,
  GLOSSARY,
  DESTINATIONS,
  VIEW_FORBIDDEN,
  VIEW_HEADERS,
  icon,
  sprite,
  esc,
  fmtTime,
  fmtAge,
  timeTag,
  tint,
  css,
  shell,
  card,
  viewBoundary,
};
