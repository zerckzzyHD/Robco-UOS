'use strict';
/**
 * scripts/console-queue.js — the Mist Console's Queue pages (milestone 1,
 * merged build of the paired Opus / Fable runs, 2026-09-25).
 *
 *   /queue             NOW (always open: the pause state, landed work past its
 *                      limit, the owner's items that block work now, findings
 *                      past their limit), then one folded card per question —
 *                      needs you · blocked · landed · filed vs closed · pause
 *                      state · the board in numbers — each one line until
 *                      tapped, plus a labelled NOT-BUILT priority slot, a link
 *                      to every record, and how the page knows
 *   /queue?open=all    the same page with every card open
 *   /queue/all         every open item, one folded card per lifecycle state
 *   /queue/item/<id>   one item: its resolved facts, then its record unedited
 *   /queue/pause       the board's shutdown record, unedited
 *   /queue/terms       the one vocabulary and the one icon registry
 *
 * WHY THIS SHAPE (the owner, 2026-09-25, judging both builds on his phone):
 * "more organized and less scrolling unless expanded ... colors / icons that
 * make different sections stand out so it's not so easy to scroll past". Both
 * builds put a glance list ABOVE full sections, so every number was printed
 * twice and the page was several screens long. Here the folded card IS the
 * glance — its summary line is the count and the key signal — and the rows sit
 * inside it. What must never wait for a tap (the NOW block) is stated as a rule
 * on the page and computed, not chosen per render.
 *
 * WHERE THE MEANING COMES FROM. This file decides nothing about an item. Every
 * per-item value (state, next-step actor and its basis, horizon, project, kind
 * and the D6-A work flag, live blockers, the landed/confirmed record) is the
 * archive's ONE resolver's answer (`!PLANNING/tools/item-resolver.cjs`); the
 * landed clock and its limit are the resolver's `clock()`; filed versus closed
 * and the open findings are the intake tool's own read-only verbs. The pause
 * state is the halt file measured now at the path the kernel's own snapshot
 * names, beside that snapshot's own reading and the board's declaration. This
 * file groups, counts over a named population, and presents. Where a source
 * cannot be read, the section says UNOBSERVABLE and prints no number.
 *
 * PUBLIC REPO, PRIVATE DATA. No item text is written here or in any fixture:
 * the board is read at request time by the route, in memory, and only the
 * response carries it. Structural words this file keys on (a heading that reads
 * SHUTDOWN STATE, "Done means", the `reason:` field) are the board's grammar,
 * not its content.
 *
 * PURE. No I/O. `buildModel` takes what the route read; the renderers take the
 * model.
 */

const QV = require('./queue-view.js');
const S = require('./console-shell.js');

const { esc, icon, timeTag, fmtAge, card } = S;

// ── vocabulary for states, actors and horizons (the wire tokens, kept) ──────
const STATE_ORDER = Object.freeze([
  'ACTIVE',
  'LANDED',
  'CONFIRMED',
  'READY',
  'TODO',
  'BLOCKED',
  'QUESTION',
  'DEFERRED',
  'PARKED',
  'SETTLED',
]);
/**
 * "NEEDS YOU" — the one definition (reconciling the two builds: Opus counted
 * 71, Fable 85 on the same board). A work item is the owner's to act on NOW
 * when its next-step actor is the owner's, it is not SOMEDAY-IF, its state is
 * one of these, and nothing holds it. The owner-actor items this leaves out
 * (held by a blocker, parked, deferred, someday, not work) are counted on the
 * page beside the list, each with where to find it — never silently dropped.
 */
const LIVE_STATES = Object.freeze(['TODO', 'READY', 'ACTIVE', 'QUESTION']);
const OWNER_ACTORS = Object.freeze(['OWNER-RULING', 'OWNER-KEYBOARD']);
const HORIZON_ORDER = ['BLOCKS-WORK-NOW', 'NEXT', 'UNKNOWN', 'UNSET', 'UNPARSEABLE', 'SOMEDAY-IF'];
const isOwner = a => OWNER_ACTORS.includes(a);

// ── titles ───────────────────────────────────────────────────────────────────
// Board headings are long and emphatic. The page shows a SHORT display title,
// normalised, and says so; the heading as written is on the item page. Nothing
// here rewrites the record.
const PICTO_RE = /\p{Extended_Pictographic}|\u{FE0F}|\u{200D}|\u{20E3}/gu;
// Placeholders for code spans while a title is reworded (private-use characters).
const CODE_OPEN = '';
const CODE_CLOSE = '';
const CODE_SLOT_RE = /(\d+)/g;
const ACRONYMS = new Set(
  (
    'AI API APK CI CLI CP CSS DNS GPT HTML HTTP HTTPS ID IDS JSON LOG MCP MD OAUTH OD PC PR PRS ' +
    'PWA QR SHA SSE SW TTL UI UOS URL UX VM WSL OK OS DS VT GV GT RT QSA MCA'
  ).split(' ')
);
/**
 * Wire tokens keep their capitals inside a lowered title: they are vocabulary,
 * and DS13a ruling 5 keeps them exactly as written.
 */
const WIRE_TOKENS = new Set(
  (
    'TODO READY ACTIVE BLOCKED DEFERRED PARKED QUESTION SETTLED LANDED CONFIRMED ' +
    'NEXT UNKNOWN UNSET UNPARSEABLE UNOBSERVABLE STALE BLIND RED GREEN AMBER PASS FAIL ' +
    'ATTENTION CLAIMED DERIVED OBSERVED SESSION EXTERNAL LIVE DISCHARGED'
  ).split(' ')
);
function plain(md) {
  return String(md || '')
    .replace(/<[^>]+>/g, '')
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(PICTO_RE, '')
    .replace(/\*{1,3}|_{2}/g, '')
    .replace(/`+/g, '')
    .replace(/\(\s+/g, '(')
    .replace(/\s+\)/g, ')')
    .replace(/\(\)/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}
const COMMON2 = new Set(
  'AN AS AT BE BY DO GO IF IN IS IT ME MY NO OF ON OR SO TO UP US WE'.split(' ')
);
/** Names that keep their capital when a shouted title is lowered. */
const PROPER = {
  MIST: 'Mist',
  ROBCO: 'RobCo',
  BINDER: 'Binder',
  SIMS: 'Sims',
  DISPATCH: 'Dispatch',
  FABLE: 'Fable',
  OPUS: 'Opus',
  SONNET: 'Sonnet',
  CLAUDE: 'Claude',
  CODEX: 'Codex',
  GITHUB: 'GitHub',
  WINDOWS: 'Windows',
  CLOUDFLARE: 'Cloudflare',
  TAILSCALE: 'Tailscale',
  ANDROID: 'Android',
};
/**
 * De-shout: an all-caps word is lowered when the whole title is mostly
 * uppercase, or when it sits in a run of two or more all-caps words (emphasis
 * that reads as shouting). A lone emphasised word in mixed text is kept.
 * Acronyms, wire tokens, names and code spans (already set aside by the caller)
 * are kept. An identifier with a digit in it is never a match.
 */
function deshout(s) {
  const letters = s.replace(/[^A-Za-z]/g, '');
  const upper = s.replace(/[^A-Z]/g, '');
  const mostly = letters.length >= 8 && upper.length / letters.length >= 0.6;
  const WORD = /\b[A-Z][A-Z'’]*\b/g;
  const words = [...s.matchAll(WORD)].map(m => ({ w: m[0], i: m.index }));
  const inRun = new Set();
  for (let k = 0; k < words.length; k++) {
    const a = words[k];
    const b = words[k + 1];
    if (
      b &&
      a.w.length > 1 &&
      b.w.length > 1 &&
      /^[\s:,&/-]+$/.test(s.slice(a.i + a.w.length, b.i))
    ) {
      inRun.add(a.i);
      inRun.add(b.i);
    }
  }
  let out = s.replace(WORD, (w, i) => {
    const core = w.replace(/['’].*$/, '');
    const suffix = w.slice(core.length).toLowerCase();
    if (!mostly && !inRun.has(i)) return w;
    if (w.length === 1) return w === 'A' ? 'a' : w;
    // Two capitals are usually an id or an abbreviation; only common words are lowered.
    if (core.length === 2 && !COMMON2.has(core)) return w;
    if (ACRONYMS.has(core) || WIRE_TOKENS.has(core)) return core + suffix;
    if (PROPER[core]) return PROPER[core] + suffix;
    return w.toLowerCase();
  });
  out = out.replace(/(['’])S\b/g, '$1s');
  // Capitalise the first letter, unless the title opens with a code span.
  if (!out.trimStart().startsWith(CODE_OPEN))
    out = out.replace(/^([^A-Za-z]*)([a-z])/, (m, a, b) => a + b.toUpperCase());
  return out;
}
function clip(s, n) {
  if (s.length <= n) return { text: s, clipped: false };
  const cut = s.slice(0, n);
  const at = cut.lastIndexOf(' ');
  return {
    text: (at > n * 0.6 ? cut.slice(0, at) : cut).replace(/[\s,;:.—(-]+$/, '') + '…',
    clipped: true,
  };
}
const TITLE_MAX = 120;
/**
 * The row title: markdown and emoji gone, the first clause of the heading
 * (a trailing "— detail" or "(new …)" is the record's, not the title's),
 * shouting lowered, code spans kept exactly, bounded at TITLE_MAX.
 * @returns {{text:string, normalised:boolean}}
 */
function shortTitle(raw, max) {
  const lim = max || TITLE_MAX;
  // Code spans are kept exactly as written: set aside before any rewording.
  const code = [];
  const guarded = String(raw || '').replace(/`([^`]+)`/g, (m0, c) => {
    code.push(c);
    return CODE_OPEN + (code.length - 1) + CODE_CLOSE;
  });
  const whole = plain(guarded)
    .replace(/^\[[^\]]{0,40}\]\s*/, '') // a leading [tag · note] is a label, not the title
    .replace(/^[\s—:.·-]+/, '');
  const segs = whole.split(/\s+(?:—|--|·)\s+|\s+\(\s*(?=new\b|\d{4}-|[A-Z]{4,})/);
  let base = segs[0] || '';
  for (let i = 1; i < segs.length && base.replace(/[^A-Za-z]/g, '').length < 12; i++) {
    base += ' — ' + segs[i];
  }
  // An opening bracket the short title never closes is cut, with what follows it.
  const open = base.lastIndexOf('(');
  if (open > 0 && base.indexOf(')', open) < 0) base = base.slice(0, open);
  // A square bracket the short title never closes is dropped (the mark only).
  if (base.lastIndexOf('[') > base.lastIndexOf(']')) base = base.replace(/\[(?=[^\]]*$)/, '');
  base = base.replace(/[\s—:,-]+$/g, '');
  if (!base) base = whole || '(no title)';
  const ds = deshout(base).replace(CODE_SLOT_RE, (m0, n) => code[Number(n)]);
  const c = clip(ds, lim);
  const unguarded = whole.replace(CODE_SLOT_RE, (m0, n) => code[Number(n)]);
  return { text: c.text, normalised: c.clipped || c.text !== unguarded };
}
/** A short plain sentence from a record field: the first sentence if it fits, else clipped. */
function shortText(s, n) {
  const p = plain(s);
  if (!p) return '';
  const sentence = /^(.{40,}?[.;])\s/.exec(p);
  return clip(sentence && sentence[1].length <= n ? sentence[1] : p, n).text;
}
/** The item's own "Done means" sentence, if its body states one. */
function doneMeans(bodyLines) {
  for (const l of bodyLines || []) {
    const m = /^\s*\*\*Done means:?\*\*:?\s*(.*)$/i.exec(l) || /^\s*Done means:?\s*(.*)$/i.exec(l);
    if (m && m[1].trim()) return m[1].trim();
  }
  return null;
}

// ── the model ────────────────────────────────────────────────────────────────
function unobs(why) {
  return { observable: false, why: String(why || 'reason not given') };
}

/**
 * The board's own shutdown record: a heading that reads SHUTDOWN STATE in the
 * preamble (before the first item heading). Returns the lines verbatim.
 */
function readPause(queueMd) {
  const lines = String(queueMd || '')
    .replace(/\r\n/g, '\n')
    .split('\n');
  for (let i = 0; i < lines.length; i++) {
    if (/^###\s/.test(lines[i])) break;
    if (/^>?\s*#{1,3}\s.*SHUTDOWN STATE/.test(lines[i])) {
      const block = [lines[i]];
      if (/^>/.test(lines[i])) {
        for (let j = i + 1; j < lines.length && /^>/.test(lines[j]); j++) block.push(lines[j]);
      }
      const head = plain(lines[i].replace(/^>?\s*#{1,3}\s*/, ''));
      const title = head.split(/\s+—\s+/)[0];
      const date = (/(\d{4}-\d{2}-\d{2})/.exec(title) || [])[1] || null;
      const restart = /On restart, first:\s*([\s\S]+?)\*\*/.exec(block.join(' '));
      return {
        present: true,
        title,
        date,
        firstOnRestart: restart ? plain(restart[1]) : null,
        lines: block.map(l => l.replace(/^>\s?/, '')),
      };
    }
  }
  return { present: false };
}

/**
 * The pause state, read three ways (Fable lens) with the snapshot's own
 * freshness limit (Opus lens). The VERDICT is the halt file measured now: the
 * snapshot is only as fresh as its last publication, and the halt itself stops
 * the plane from publishing a newer one. An unreadable file makes the verdict
 * UNOBSERVABLE — the snapshot never stands in for it.
 */
function readPauseState(inp, readAt, queueMd) {
  const file = inp.killSwitch || unobs('no halt-file reading was handed to the renderer');
  const snapIn = inp.snapshot;
  let snapshot;
  if (!snapIn || !snapIn.data) {
    snapshot = unobs((snapIn && snapIn.why) || 'the kernel status snapshot could not be read');
  } else {
    const d = snapIn.data;
    const ks = d.killSwitch;
    const gen = new Date(d.generatedAt || snapIn.mtime);
    const ct = d.criticalTruth || {};
    const freshUntil = ct.freshUntil ? new Date(ct.freshUntil) : null;
    snapshot = {
      observable: true,
      present: ks && typeof ks.present === 'boolean' ? ks.present : null,
      generatedAt: isNaN(gen.getTime()) ? null : gen,
      freshUntil: freshUntil && !isNaN(freshUntil.getTime()) ? freshUntil : null,
      stale: freshUntil && !isNaN(freshUntil.getTime()) ? readAt > freshUntil : null,
    };
  }
  const verdict = !file.observable ? 'unobservable' : file.present ? 'paused' : 'running';
  let disagree = null;
  if (verdict === 'paused' && snapshot.observable && snapshot.present === false) {
    disagree =
      'The snapshot is older than the file: the halt stops the plane from publishing a newer one, so the file is the current reading and the snapshot is what the plane last said.';
  } else if (verdict === 'running' && snapshot.observable && snapshot.present === true) {
    disagree =
      'The file was removed after the snapshot was produced, and the plane has not published since.';
  }
  return { verdict, file, snapshot, disagree, board: readPause(queueMd) };
}

/**
 * Build the whole model. Every section is independently three-cased: one
 * unreadable source degrades one section and never becomes a zero.
 * @param {object} inp  the route's reads — see consoleQueueInputs in vite.config.mjs
 */
function buildModel(inp) {
  const readAt = inp.readAt instanceof Date ? inp.readAt : new Date();
  const today = inp.today || readAt.toISOString().slice(0, 10);
  const m = {
    readAt,
    today,
    provenance: inp.provenance || { ok: false, why: 'no provenance was handed over' },
    readFailed: false,
    board: unobs('the board was not read'),
    parsed: null,
    pause: null,
    flow: null,
    sources: [],
  };
  const src = (name, ok, detail) => m.sources.push({ name, ok, detail });
  const q = inp.queueMd;
  m.readFailed = !!(m.provenance && m.provenance.ok === false);
  m.pause = readPauseState(inp, readAt, m.readFailed ? '' : q);

  if (m.readFailed || typeof q !== 'string' || !q.trim()) {
    m.board = unobs(
      m.readFailed ? m.provenance.why || 'the ref read failed' : 'QUEUE.md could not be read'
    );
    src('Build board (QUEUE.md)', false, m.board.why);
  } else {
    const items = QV.parseQueue(q).blocks.filter(b => b.type === 'item' && b.id);
    m.parsed = items;
    const res = inp.resolver && inp.resolver.observable ? inp.resolver.mod : null;
    const graph = inp.graph && inp.graph.observable ? inp.graph.graph : null;
    const fmt = inp.itemFormat && inp.itemFormat.observable ? inp.itemFormat.mod : null;
    if (!items.length) {
      m.board = unobs('the board parsed to no items');
    } else if (!res) {
      m.board = unobs(
        'the one resolver is unavailable: ' + ((inp.resolver && inp.resolver.why) || 'not loaded')
      );
    } else if (!graph) {
      m.board = unobs(
        'the blocker graph is unavailable, so actors and blockers cannot be read: ' +
          ((inp.graph && inp.graph.why) || 'not read')
      );
    } else {
      try {
        m.board = resolveBoard(items, res, graph, fmt, inp.logMd, today);
      } catch (e) {
        m.board = unobs(
          'the board could not be resolved (' + String(e && e.message).slice(0, 140) + ')'
        );
      }
    }
    src(
      'Build board (QUEUE.md)',
      true,
      'read at the ref, ' + q.length.toLocaleString('en-US') + ' bytes, ' + items.length + ' items'
    );
    src(
      'The one resolver (item-resolver.cjs)',
      !!res,
      res ? 'loaded from the planning tree' : (inp.resolver && inp.resolver.why) || 'not loaded'
    );
    src(
      'Blocker graph (BLOCKER-GRAPH.json)',
      !!graph,
      graph
        ? 'measured ' + (graph.measuredAt || 'at an unstated time') + ', read at the ref'
        : (inp.graph && inp.graph.why) || 'not read'
    );
    src(
      'Item format (item-format-check.cjs)',
      !!fmt,
      fmt
        ? 'the accept-block grammar, used to read each record block'
        : (inp.itemFormat && inp.itemFormat.why) || 'not loaded'
    );
  }

  // ── filed vs closed, and the open findings: the intake tool's own verbs ──
  const I = inp.intake;
  if (!I || !I.observable) {
    m.flow = unobs((I && I.why) || 'the findings intake was not read');
  } else {
    const f = I.flow || null;
    const open = Array.isArray(I.open)
      ? I.open.map(x => ({
          id: x.id,
          title: shortTitle(x.title, 140).text,
          found: x.found,
          by: x.by,
          age: typeof x.age === 'number' ? x.age : null,
          project: x.project || null,
          source: x.source ? shortText(x.source, 160) : '',
          red: typeof I.redDays === 'number' && typeof x.age === 'number' && x.age > I.redDays,
        }))
      : null;
    m.flow = {
      observable: true,
      flow: f,
      flowWhy: f ? null : I.flowWhy || 'the flow could not be computed',
      open,
      openWhy: open ? null : I.openWhy || 'the open findings could not be listed',
      today: I.today || today,
      redDays: typeof I.redDays === 'number' ? I.redDays : null,
    };
  }
  src(
    'Findings intake (intake.cjs flow --json, list --json)',
    !!(m.flow.observable && m.flow.flow && m.flow.open),
    m.flow.observable
      ? 'filed vs closed ' +
          (m.flow.flow ? 'computed' : 'UNOBSERVABLE: ' + m.flow.flowWhy) +
          '; open findings ' +
          (m.flow.open ? 'listed' : 'UNOBSERVABLE: ' + m.flow.openWhy)
      : m.flow.why
  );
  const P = m.pause;
  src(
    'Kernel status snapshot (status.json)',
    P.snapshot.observable,
    P.snapshot.observable
      ? 'published ' +
          (P.snapshot.generatedAt
            ? P.snapshot.generatedAt.toISOString()
            : 'at an unreadable time') +
          (P.snapshot.stale ? ', past its own freshness limit (STALE)' : '')
      : P.snapshot.why
  );
  src(
    'Halt file (at the path the snapshot names)',
    P.file.observable,
    P.file.observable
      ? 'measured at request time: ' + (P.file.present ? 'present' : 'absent')
      : P.file.why
  );
  return m;
}

/** The resolver's answers, grouped for the page. Throws only if the resolver does. */
function resolveBoard(items, res, graph, fmt, logMd, today) {
  const resolved = res.resolveBoard({
    items,
    graph,
    logMd: typeof logMd === 'string' ? logMd : '',
    fmt: fmt || undefined,
  });
  const conds = new Map((graph.conditions || []).map(c => [c.id, c]));
  const liveInto = new Map();
  for (const e of graph.edges || []) {
    if (e.state !== 'LIVE' || e.kind !== 'blocks') continue;
    if (!liveInto.has(e.blocked)) liveInto.set(e.blocked, []);
    liveInto.get(e.blocked).push(e);
  }
  const recs = [];
  for (const it of items) {
    const r = resolved.byId.get(it.id);
    if (!r) continue;
    let fields = {};
    if (fmt) {
      try {
        const b = fmt.parseAccept(it.body || []);
        fields = b.length ? b[0].fields : {};
      } catch {
        fields = {};
      }
    }
    const st = shortTitle(it.title);
    const dm = doneMeans(it.body);
    recs.push({
      id: it.id,
      title: st.text,
      titleNormalised: st.normalised,
      headingRaw: QV.titleText(it.title).trim(),
      body: it.body,
      done: dm ? shortText(dm, 220) : '',
      reason: fields.reason ? shortText(fields.reason, 220) : '',
      r,
    });
  }
  const byId = new Map(recs.map(x => [x.id, x]));
  const holds = new Map();
  for (const e of graph.edges || []) {
    if (e.state !== 'LIVE' || e.kind !== 'blocks') continue;
    if (!byId.has(e.blocked)) continue;
    if (!holds.has(e.blocker)) holds.set(e.blocker, []);
    holds.get(e.blocker).push(e.blocked);
  }
  const clock = res.clock(resolved, today, new Map(items.map(i => [i.id, i.title || ''])));
  const work = recs.filter(x => x.r.work);
  const nonWork = recs.filter(x => !x.r.work);
  const held = x => x.r.blockers.length > 0 || x.r.state === 'BLOCKED';
  const someday = x => x.r.horizon === 'SOMEDAY-IF';
  const hRank = x => {
    const i = HORIZON_ORDER.indexOf(x.r.horizon);
    return i < 0 ? HORIZON_ORDER.length : i;
  };
  const byHorizon = (a, b) => hRank(a) - hRank(b); // stable: board order within a horizon

  // NEEDS YOU, and every owner-actor item the rule leaves out, counted
  const ownerWork = work.filter(x => isOwner(x.r.actor));
  const needs = ownerWork
    .filter(x => !someday(x) && LIVE_STATES.includes(x.r.state) && !held(x))
    .sort(byHorizon);
  const needsSet = new Set(needs);
  const outHeld = ownerWork.filter(x => !someday(x) && held(x));
  const outState = ownerWork.filter(x => !someday(x) && !held(x) && !needsSet.has(x));
  const outSomeday = ownerWork.filter(someday);
  const outNotWork = nonWork.filter(x => isOwner(x.r.actor));
  const decisions = needs.filter(x => x.r.actor === 'OWNER-RULING' && x.r.kind === 'DECISION');
  const rulings = needs.filter(x => x.r.actor === 'OWNER-RULING' && x.r.kind !== 'DECISION');
  const hands = needs.filter(x => x.r.actor === 'OWNER-KEYBOARD');

  // BLOCKED — open work held by a LIVE blocker or a record that says BLOCKED
  const blocked = work.filter(held).map(x => ({
    x,
    on: x.r.blockers.map(b => {
      const e = (liveInto.get(x.id) || []).find(y => y.blocker === b) || null;
      const t = byId.get(b);
      const edge = {
        // the edge's own words; a leading "unblocks when" is the label this page prints
        trigger:
          e && e.trigger
            ? shortText(String(e.trigger).replace(/^\s*unblocks when:?\s*/i, ''), 220)
            : '',
        evidence: e && e.evidence ? shortText(e.evidence, 200) : '',
        basis: e && e.basis ? e.basis : null,
      };
      if (t) return Object.assign({ kind: 'item', id: b, t }, edge);
      const c = conds.get(b);
      if (c || String(b).startsWith('cond:')) {
        return Object.assign(
          {
            kind: 'condition',
            id: b,
            actor: c && c.actor ? c.actor : 'UNKNOWN',
            text: c && c.evidence ? shortText(c.evidence, 180) : '',
          },
          edge
        );
      }
      return Object.assign({ kind: 'closed', id: b }, edge);
    }),
  }));
  const whose = b =>
    b.on.some(o => (o.kind === 'item' ? isOwner(o.t.r.actor) : isOwner(o.actor)))
      ? 'you'
      : b.on.length
        ? 'other'
        : 'unnamed';
  for (const b of blocked) b.whose = whose(b);
  const holderCount = new Map();
  for (const b of blocked)
    for (const o of b.on) holderCount.set(o.id, (holderCount.get(o.id) || 0) + 1);
  const topHolders = [...holderCount.entries()]
    .filter(([, n]) => n > 1)
    .sort((a, b) => b[1] - a[1] || String(a[0]).localeCompare(String(b[0])))
    .slice(0, 5)
    .map(([id, n]) => ({ id, n, t: byId.get(id) || null, cond: conds.get(id) || null }));

  // THE BOARD IN NUMBERS (the resolver's own census functions)
  const allR = recs.map(x => x.r);
  const byState = {};
  for (const r of allR) byState[r.state] = (byState[r.state] || 0) + 1;
  return {
    observable: true,
    total: recs.length,
    recs,
    byId,
    holds,
    conds,
    work,
    nonWork,
    needs,
    groups: { decisions, rulings, hands },
    bwn: needs.filter(x => x.r.horizon === 'BLOCKS-WORK-NOW'),
    out: { held: outHeld, state: outState, someday: outSomeday, notWork: outNotWork },
    blocked,
    topHolders,
    clock,
    limitDays:
      typeof res.CONFIRM_LIMIT_DAYS === 'number' ? res.CONFIRM_LIMIT_DAYS : clock.limitDays,
    census: typeof res.census === 'function' ? res.census(allR) : null,
    workCensus: typeof res.workCensus === 'function' ? res.workCensus(allR) : null,
    workLine:
      typeof res.workLine === 'function' && typeof res.workCensus === 'function'
        ? res.workLine('/queue', res.workCensus(allR))
        : null,
    byState,
    actorSources: ['QUOTED', 'BLOCK', 'GRAPH', 'NONE'].reduce(
      (a, k) => ((a[k] = allR.filter(r => (r.actorSource || 'NONE') === k).length), a),
      {}
    ),
    conflicts: allR.reduce((a, r) => a + (r.conflicts || []).length, 0),
    recordErrors: allR.filter(r => (r.errors || []).length).length,
    graphMeasuredAt: graph.measuredAt || null,
  };
}

// ── small renderers ─────────────────────────────────────────────────────────
function ep(token) {
  return '<span class="ep">' + esc(token) + '</span>';
}
function tok(token, cls) {
  return '<span class="tok' + (cls ? ' ' + cls : '') + '">' + esc(token) + '</span>';
}
function tag(iconId, text, cls) {
  return (
    '<span class="tag' +
    (cls ? ' ' + cls : '') +
    '">' +
    (iconId ? icon(iconId) : '') +
    esc(text) +
    '</span>'
  );
}
function itemHref(id) {
  return '/queue/item/' + encodeURIComponent(id);
}
function unobsLine(what, why) {
  return (
    '<div class="panel u"><p>' +
    tag('unobservable', 'UNOBSERVABLE') +
    ' ' +
    esc(what) +
    '</p><p class="muted">' +
    esc(why) +
    '. This is not a zero, and not "nothing to show".</p></div>'
  );
}
const BASIS_WORD = { QUOTED: 'quoted', BLOCK: 'block', GRAPH: 'graph', NONE: 'actor UNSET' };
function basisTok(r) {
  const s = r.actorSource || 'NONE';
  return tok(
    'basis: ' + (BASIS_WORD[s] || s) + (s === 'GRAPH' && r.actorBasis ? ' · ' + r.actorBasis : '')
  );
}
/**
 * One record row. The whole row is the link to the item page. `why` is the
 * row's reason line (already escaped HTML); o.* hide chips a section's
 * heading already states.
 */
function row(x, why, opts) {
  const o = opts || {};
  const r = x.r;
  const meta = [
    '<span class="id">' + esc(x.id) + '</span>',
    o.hideState ? '' : tok(r.state, r.state === 'BLOCKED' ? 'att' : ''),
    o.hideHorizon || !r.horizon || r.horizon === 'UNSET' ? '' : tok(r.horizon),
    o.hideActor ? '' : isOwner(r.actor) ? tok(r.actor, 'att') : '',
    o.showBasis ? basisTok(r) : '',
    r.work === false ? tag('not-work', 'not work: ' + (r.kind || '')) : '',
  ]
    .filter(Boolean)
    .join('');
  return (
    '<li><a class="row" href="' +
    itemHref(x.id) +
    '"><span class="go">' +
    icon('next') +
    '</span><span class="meta">' +
    meta +
    '</span><span class="t">' +
    esc(x.title) +
    '</span>' +
    (why ? '<span class="why">' + why + '</span>' : '') +
    '</a></li>'
  );
}
/** The row's own reason: the record's Done-means, else its accept-block reason. */
function ownWhy(x) {
  if (x.done) return '<b>Done means</b> ' + esc(x.done);
  if (x.reason) return '<b>Reason</b> ' + esc(x.reason);
  return '';
}
function list(rows) {
  return rows.length ? '<ul class="list">' + rows.join('') + '</ul>' : '';
}
function asOfLine(m, opts) {
  const o = opts || {};
  const p = m.provenance;
  const parts = ['<span>As of <b>' + timeTag(m.readAt) + '</b></span>'];
  if (!p || !p.ok) {
    parts.push(
      '<span>' +
        tag('unobservable', 'UNOBSERVABLE', 'bad') +
        ' board source: ' +
        esc((p && p.why) || 'unknown') +
        '</span>'
    );
  } else if (p.mode === 'tree') {
    parts.push('<span>board read from a working tree (' + esc(p.ref) + '), not a commit</span>');
  } else {
    parts.push(
      '<span>board <code>' +
        esc(p.ref) +
        '@' +
        esc(p.sha) +
        '</code>, committed ' +
        timeTag(p.committedAt) +
        ' (' +
        esc(fmtAge(m.readAt - new Date(p.committedAt))) +
        ' earlier)</span>'
    );
  }
  parts.push(
    '<span><a href="' +
      esc(o.self || '/queue') +
      '">Reload to read again</a> · no auto-refresh</span>'
  );
  if (o.openAll) parts.push(o.openAll);
  return parts.join('');
}
function crumbQueue() {
  return '<a href="/queue">' + icon('back') + 'Queue</a>';
}

// ── NOW: shown without opening anything ─────────────────────────────────────
function pauseBand(m) {
  const P = m.pause;
  const f = P.file;
  const s = P.snapshot;
  if (P.verdict === 'unobservable') {
    return (
      '<div class="band u">' +
      icon('unobservable') +
      '<span><b>PAUSE STATE UNOBSERVABLE</b> — the halt file could not be read: ' +
      esc(f.why) +
      '. Nothing stands in for it. <a href="#pause">The readings</a></span></div>'
    );
  }
  const head =
    P.verdict === 'paused'
      ? '<b>PAUSED</b> — the control plane’s halt file is present' +
        (f.since ? ', since ' + timeTag(f.since) : '') +
        ' ' +
        ep('OBSERVED')
      : '<b>Not paused by the halt file</b> — it is absent, measured now ' + ep('OBSERVED');
  const snap = !s.observable
    ? ' The kernel snapshot: ' + tag('unobservable', 'UNOBSERVABLE') + '.'
    : ' The kernel’s last snapshot says <b>' +
      (s.present === null ? 'nothing about it' : s.present ? 'present' : 'absent') +
      '</b>' +
      (s.stale ? ' and is ' + tag('stale', 'STALE') : '') +
      (P.disagree ? ', older than the file: they disagree.' : '.');
  const board = P.board.present
    ? ' The board declares SHUTDOWN STATE' +
      (P.board.date ? ' (' + esc(P.board.date) + ')' : '') +
      '.'
    : '';
  const restart =
    P.board.present && P.board.firstOnRestart
      ? '<br><b>On restart, first:</b> ' + esc(shortText(P.board.firstOnRestart, 180))
      : '';
  return (
    '<div class="band">' +
    icon(P.verdict === 'paused' ? 'paused' : 'provenance') +
    '<span>' +
    head +
    '.' +
    snap +
    board +
    restart +
    ' <a href="#pause">The three readings</a></span></div>'
  );
}

function renderNow(m) {
  const B = m.board;
  const parts = [pauseBand(m)];
  let urgent = 0;
  if (!B.observable) {
    parts.push(
      '<div class="band u">' +
        icon('unobservable') +
        '<span><b>UNOBSERVABLE</b> — overdue landings and your items that block work now cannot be read: ' +
        esc(B.why) +
        '.</span></div>'
    );
  } else {
    const red = B.clock.landed.filter(l => l.red);
    if (red.length) {
      urgent += red.length;
      parts.push(
        '<h3 class="bad">' +
          icon('overdue') +
          'Landed, past the ' +
          esc(B.limitDays) +
          '-day limit · ' +
          red.length +
          '</h3>' +
          list(
            red.map(l => {
              const x = B.byId.get(l.id);
              return x
                ? row(
                    x,
                    tok('RED', 'bad') +
                      ' landed ' +
                      esc(l.since) +
                      ' by <b>' +
                      esc(l.by) +
                      '</b>, <b class="bad">' +
                      esc(l.age) +
                      ' days</b> ago',
                    { hideHorizon: true }
                  )
                : '';
            })
          )
      );
    }
    if (B.bwn.length) {
      urgent += B.bwn.length;
      parts.push(
        '<h3 class="att">' +
          icon('needs-owner') +
          'Yours, and it blocks work now · ' +
          B.bwn.length +
          '</h3>' +
          list(B.bwn.map(x => row(x, '', { hideHorizon: true })))
      );
    }
  }
  const F = m.flow;
  if (F.observable && F.open) {
    const redF = F.open.filter(x => x.red);
    if (redF.length) {
      urgent += redF.length;
      parts.push(
        '<div class="band">' +
          icon('overdue', 'bad') +
          '<span><b class="bad">' +
          redF.length +
          ' finding' +
          (redF.length === 1 ? '' : 's') +
          ' open past ' +
          esc(F.redDays) +
          ' days</b> ' +
          tok('RED', 'bad') +
          ' — ' +
          redF.map(x => esc(x.id)).join(', ') +
          '. <a href="#flow">In Filed vs closed</a></span></div>'
      );
    }
  }
  if (!urgent && B.observable) {
    parts.push(
      '<p class="none">Nothing landed past its limit, nothing of yours blocks work now' +
        (F.observable && F.open ? ', no finding past its limit' : '') +
        ' — over ' +
        esc(B.work.length) +
        ' open work items at this commit.</p>'
    );
  }
  return (
    '<section class="now" id="now" aria-labelledby="now-h"><h2 id="now-h">' +
    icon('now') +
    'Now</h2><p class="def">Shown without opening anything, by rule: the pause state, landed work past its limit, your items that block work now, and findings past their limit. Everything else is one tap away below.</p>' +
    parts.join('') +
    '</section>'
  );
}

// ── the cards ───────────────────────────────────────────────────────────────
function needsCard(m) {
  const B = m.board;
  if (!B.observable) {
    return card({
      id: 'needs-you',
      section: 'needs',
      n: 'UNOBSERVABLE',
      sig: esc(B.why),
      body: unobsLine('What needs you cannot be read.', B.why),
    });
  }
  const G = B.groups;
  const O = B.out;
  const stateCounts = {};
  for (const x of O.state) stateCounts[x.r.state] = (stateCounts[x.r.state] || 0) + 1;
  const outParts = [];
  if (O.held.length)
    outParts.push(
      '<b>' + O.held.length + '</b> held by a blocker (<a href="#blocked">in Blocked</a>)'
    );
  for (const [s, n] of Object.entries(stateCounts))
    outParts.push(
      '<b>' + n + '</b> ' + tok(s) + ' (<a href="/queue/all#s-' + s.toLowerCase() + '">list</a>)'
    );
  if (O.someday.length)
    outParts.push(
      '<b>' +
        O.someday.length +
        '</b> ' +
        tok('SOMEDAY-IF') +
        ' (<a href="/queue/all#someday-yours">list</a>)'
    );
  if (O.notWork.length)
    outParts.push(
      '<b>' + O.notWork.length + '</b> typed not work (<a href="/queue/all#not-work">list</a>)'
    );
  const def =
    '<p class="def"><b>The rule:</b> open <b>work</b> whose next step is yours (' +
    tok('OWNER-RULING') +
    ' or ' +
    tok('OWNER-KEYBOARD') +
    ', read through the one resolver), in ' +
    LIVE_STATES.map(s => tok(s)).join(' ') +
    ', not ' +
    tok('SOMEDAY-IF') +
    ', and not held by a blocker. ' +
    ep('DERIVED') +
    ' Grouped, then by horizon, then board order. <b>Not ranked.</b></p>' +
    (outParts.length
      ? '<p class="def"><b>Also yours, left out by that rule:</b> ' + outParts.join(' · ') + '.</p>'
      : '');
  const group = (iconId, title, gloss, rows) =>
    '<h3>' +
    icon(iconId) +
    esc(title) +
    ' · ' +
    rows.length +
    '</h3>' +
    (rows.length
      ? '<p class="def">' +
        gloss +
        '</p>' +
        list(rows.map(x => row(x, ownWhy(x), { hideActor: true, showBasis: true })))
      : '<p class="def">' + gloss + ' None in this population at this commit.</p>');
  const body =
    def +
    group(
      'owner-ruling',
      'Decisions',
      'Your ruling on an item typed ' + tok('DECISION') + '.',
      G.decisions
    ) +
    group(
      'owner-ruling',
      'Rulings on other work',
      'Your ruling, on work of another kind.',
      G.rulings
    ) +
    group(
      'owner-keyboard',
      'Your hands',
      tok('OWNER-KEYBOARD') + ': done by you, at your machine.',
      G.hands
    );
  return card({
    id: 'needs-you',
    section: 'needs',
    n: B.needs.length,
    nCls: B.needs.length ? 'att' : '',
    sig:
      '<b>' +
      G.decisions.length +
      '</b> decisions · <b>' +
      G.rulings.length +
      '</b> rulings · <b>' +
      G.hands.length +
      '</b> your hands · <b>' +
      B.bwn.length +
      '</b> block work now',
    body,
  });
}

function blockedCard(m) {
  const B = m.board;
  if (!B.observable) {
    return card({
      id: 'blocked',
      section: 'blocked',
      n: 'UNOBSERVABLE',
      sig: esc(B.why),
      body: unobsLine('Blocked work cannot be read.', B.why),
    });
  }
  const onText = o => {
    const trig = o.trigger
      ? '<br><b>Unblocks when</b> ' + esc(o.trigger)
      : o.evidence
        ? '<br><b>Edge</b> ' + esc(o.evidence)
        : '';
    if (o.kind === 'item') {
      return (
        '<b>' +
        esc(o.id) +
        '</b> ' +
        tok(o.t.r.state) +
        (isOwner(o.t.r.actor) ? ' ' + tok(o.t.r.actor, 'att') : ' next step ' + tok(o.t.r.actor)) +
        ' ' +
        esc(o.t.title) +
        trig
      );
    }
    if (o.kind === 'condition') {
      return (
        '<b>a condition</b> ' +
        tok(o.actor, isOwner(o.actor) ? 'att' : '') +
        (o.text ? ' ' + esc(o.text) : '') +
        trig
      );
    }
    return '<b>' + esc(o.id) + '</b> (not an open item)' + trig;
  };
  const render = b =>
    row(
      b.x,
      b.on.length
        ? '<b>Waits on</b> ' + b.on.map(onText).join('<br><b>and</b> ')
        : '<b>Waits on</b> nothing the graph records — its record says BLOCKED and no edge names why.',
      { hideState: b.on.length > 0 }
    );
  const n = k => B.blocked.filter(b => b.whose === k).length;
  const groups = [
    ['you', 'Waiting on something of yours', 'needs-owner'],
    ['other', 'Waiting on other work', 'blocked'],
    ['unnamed', 'Marked BLOCKED, no blocker named', 'unobservable'],
  ]
    .map(([k, title, ic]) => {
      const rows = B.blocked.filter(b => b.whose === k);
      if (!rows.length) return '';
      return (
        '<h3 id="blocked-' +
        k +
        '">' +
        icon(ic) +
        esc(title) +
        ' · ' +
        rows.length +
        '</h3>' +
        list(rows.map(render))
      );
    })
    .join('');
  const top = B.topHolders.length
    ? '<h3>' +
      icon('blocked') +
      'What holds the most</h3><p class="def">' +
      B.topHolders
        .map(
          h =>
            (h.t
              ? '<a href="' + itemHref(h.id) + '">' + esc(h.id) + '</a>'
              : '<b>' + esc(h.id) + '</b>') +
            ' holds <b>' +
            h.n +
            '</b>'
        )
        .join(' · ') +
      '</p>'
    : '';
  const staleN = B.clock.stale ? B.clock.stale.length : 0;
  const def =
    '<p class="def">Open <b>work</b> held by a LIVE <b>blocks</b> edge in the blocker graph' +
    (B.graphMeasuredAt ? ' (measured ' + esc(String(B.graphMeasuredAt).slice(0, 10)) + ')' : '') +
    ', or whose record says ' +
    tok('BLOCKED') +
    '. Each row says what it waits on, whose move that is, and the edge’s own trigger. A DISCHARGED edge, or one whose blocker is closed (' +
    staleN +
    ' at this commit), is not a blocker. ' +
    ep('DERIVED') +
    '</p>';
  return card({
    id: 'blocked',
    section: 'blocked',
    n: B.blocked.length,
    sig:
      '<b>' +
      n('you') +
      '</b> waiting on you · <b>' +
      n('other') +
      '</b> on other work · <b>' +
      n('unnamed') +
      '</b> no blocker named',
    body: def + top + (groups || '<p class="def">No open work item is blocked at this commit.</p>'),
  });
}

function landedCard(m) {
  const B = m.board;
  if (!B.observable) {
    return card({
      id: 'landed',
      section: 'landed',
      n: 'UNOBSERVABLE',
      sig: esc(B.why),
      body: unobsLine('The landed clock cannot be read.', B.why),
    });
  }
  const C = B.clock;
  const red = C.landed.filter(l => l.red).length;
  const landedRows = C.landed.map(l => {
    const x = B.byId.get(l.id);
    if (!x) return '';
    return row(
      x,
      (l.red ? tok('RED', 'bad') + ' ' : '') +
        'Landed ' +
        esc(l.since) +
        ' by <b>' +
        esc(l.by) +
        '</b> · <b' +
        (l.red ? ' class="bad"' : '') +
        '>' +
        esc(l.age) +
        (l.age === 1 ? ' day' : ' days') +
        '</b> waiting · confirm by ' +
        esc(l.confirmBy || 'UNSET'),
      { hideState: true, hideHorizon: true }
    );
  });
  const confirmedRows = C.confirmed.map(c => {
    const x = B.byId.get(c.id);
    if (!x) return '';
    const v = String(c.done || '');
    const cls = /^GREEN/.test(v) ? 'ok' : /^RED/.test(v) ? 'bad' : '';
    return row(
      x,
      'Confirmed ' +
        esc(c.since) +
        ' (' +
        esc(c.age) +
        ' d ago) · done-check <span class="' +
        cls +
        '">' +
        esc(v || 'not stated') +
        '</span>',
      { hideState: true, hideHorizon: true }
    );
  });
  const legacy = (C.legacy || []).map(id => {
    const x = B.byId.get(id);
    return x
      ? row(x, 'A heading marker with no landed record: its age is not derivable from any field.')
      : '';
  });
  const body =
    '<p class="def">A builder recorded the work as ' +
    tok('LANDED') +
    '; a session other than the builder must confirm it (D3-A). Past ' +
    esc(B.limitDays) +
    ' days it reads ' +
    tok('RED', 'bad') +
    '. Report-only: this page confirms nothing. ' +
    ep('DERIVED') +
    '</p>' +
    (landedRows.length
      ? list(landedRows)
      : '<p class="def">Nothing is landed and unconfirmed at this commit, over every open item.</p>') +
    '<h3>' +
    icon('confirmed') +
    'Confirmed, open until its done-check · ' +
    confirmedRows.length +
    '</h3>' +
    (confirmedRows.length ? list(confirmedRows) : '<p class="def">None.</p>') +
    (legacy.length ? '<h3>Legacy heading markers · ' + legacy.length + '</h3>' + list(legacy) : '');
  return card({
    id: 'landed',
    section: 'landed',
    icon: red ? 'overdue' : 'landed',
    n: C.landed.length,
    nCls: red ? 'bad' : '',
    sig: red
      ? '<b class="bad">' +
        red +
        ' RED</b>, past the ' +
        esc(B.limitDays) +
        '-day limit · <b>' +
        C.confirmed.length +
        '</b> confirmed, not closed'
      : 'none past the ' +
        esc(B.limitDays) +
        '-day limit · <b>' +
        C.confirmed.length +
        '</b> confirmed, not closed',
    body,
  });
}

function flowCard(m) {
  const F = m.flow;
  if (!F.observable) {
    return card({
      id: 'flow',
      section: 'flow',
      n: 'UNOBSERVABLE',
      sig: esc(F.why),
      body: unobsLine('Filed versus closed, and the open findings, cannot be read.', F.why),
    });
  }
  const f = F.flow;
  const ids = (arr, n) =>
    arr.length
      ? ' <span class="muted">(' +
        esc(arr.slice(0, n).join(' ')) +
        (arr.length > n ? ' …' : '') +
        ')</span>'
      : '';
  const flowHtml = f
    ? '<dl class="facts"><dt>Range</dt><dd>since the last checkpoint’s archive head <code>' +
      esc(String(f.since || '').slice(0, 8)) +
      '</code> to the current head</dd>' +
      '<dt>Open items</dt><dd>' +
      esc(f.open0) +
      ' → <b>' +
      esc(f.open1) +
      '</b> (net <b>' +
      (f.net > 0 ? '+' : '') +
      esc(f.net) +
      '</b>)</dd>' +
      '<dt>Filed</dt><dd><b>' +
      f.filed.length +
      '</b> — through the intake ' +
      f.via.length +
      ' · straight onto the board ' +
      f.direct.length +
      ids(f.direct, 40) +
      '</dd>' +
      '<dt>Closed</dt><dd><b>' +
      f.closed.length +
      '</b>' +
      ids(f.closed, 40) +
      (f.returned && f.returned.length ? ' · returned ' + f.returned.length : '') +
      (f.leftNoAnchor && f.leftNoAnchor.length
        ? ' · <span class="bad">left with no log entry ' + f.leftNoAnchor.length + '</span>'
        : '') +
      '</dd>' +
      (f.intake
        ? '<dt>Intake</dt><dd>filed ' +
          esc(f.intake.filed) +
          ' · promoted ' +
          esc(f.intake.promoted) +
          ' · dismissed ' +
          esc(f.intake.dismissed) +
          ' · open ' +
          esc(f.intake.open) +
          '</dd>'
        : '') +
      '</dl>'
    : unobsLine('Filed versus closed cannot be computed.', F.flowWhy);
  let openHtml;
  if (F.open) {
    const redN = F.open.filter(x => x.red).length;
    openHtml =
      '<h3>' +
      icon('finding') +
      'Open findings · ' +
      F.open.length +
      (redN ? ' · <span class="bad">' + redN + ' RED</span>' : '') +
      '</h3>' +
      (F.open.length
        ? '<ul class="list">' +
          F.open
            .map(
              x =>
                '<li><div class="row"><span class="meta"><span class="id">' +
                esc(x.id) +
                '</span>' +
                (x.red ? tok('RED', 'bad') : '') +
                (x.project ? tok(x.project) : '') +
                '</span><span class="t">' +
                esc(x.title) +
                '</span><span class="why">Found ' +
                esc(x.found || '?') +
                ' by <b>' +
                esc(x.by || '?') +
                '</b> · <b' +
                (x.red ? ' class="bad"' : '') +
                '>' +
                (x.age === null ? 'age unreadable' : esc(x.age) + ' d') +
                '</b> open' +
                (x.source ? '<br><b>Source</b> ' + esc(x.source) : '') +
                '</span></div></li>'
            )
            .join('') +
          '</ul>'
        : '<p class="def">No open finding in the intake as of ' + esc(F.today) + '.</p>');
  } else {
    openHtml = unobsLine('The open findings cannot be listed.', F.openWhy);
  }
  const redN = F.open ? F.open.filter(x => x.red).length : 0;
  return card({
    id: 'flow',
    section: 'flow',
    n: f ? (f.net > 0 ? '+' : '') + f.net : 'UNOBSERVABLE',
    sig: f
      ? 'net since the last checkpoint · <b>' +
        f.filed.length +
        '</b> filed · <b>' +
        f.closed.length +
        '</b> closed · ' +
        (F.open
          ? '<b>' +
            F.open.length +
            '</b> open finding' +
            (F.open.length === 1 ? '' : 's') +
            (redN ? ', <b class="bad">' + redN + ' RED</b>' : '')
          : 'open findings UNOBSERVABLE')
      : esc(F.flowWhy),
    body:
      '<p class="def">The findings intake (owner ruling D9-A): filed versus closed since the last checkpoint and every open finding with its age, computed by the archive’s own intake tool from committed history (its read-only verbs), not by this page. A finding open more than ' +
      esc(F.redDays == null ? '?' : F.redDays) +
      ' days reads ' +
      tok('RED', 'bad') +
      '. ' +
      ep('DERIVED') +
      '</p>' +
      flowHtml +
      openHtml,
  });
}

function pauseCard(m) {
  const P = m.pause;
  const f = P.file;
  const s = P.snapshot;
  const fileP = !f.observable
    ? '<p>' +
      tag('unobservable', 'UNOBSERVABLE') +
      ' <b>The halt file</b> could not be read: ' +
      esc(f.why) +
      '. Nothing below stands in for it.</p>'
    : '<p><b>The halt file</b>, measured now at the path the kernel’s own snapshot names: <b>' +
      (f.present ? 'present' : 'absent') +
      '</b>' +
      (f.present && f.since ? ', since ' + timeTag(f.since) : '') +
      ' ' +
      ep('OBSERVED') +
      (f.present
        ? '. While it exists, the supervisor, watchdog, reaper and housekeeping stand down.'
        : '.') +
      '</p>';
  const snapP = !s.observable
    ? '<p>' +
      tag('unobservable', 'UNOBSERVABLE') +
      ' <b>The kernel snapshot</b>: ' +
      esc(s.why) +
      '.</p>'
    : '<p><b>The kernel snapshot</b>, produced ' +
      (s.generatedAt
        ? timeTag(s.generatedAt) + ' (' + esc(fmtAge(m.readAt - s.generatedAt)) + ' ago)'
        : 'at an unreadable time') +
      ': halt file <b>' +
      (s.present === null ? 'not stated' : s.present ? 'PRESENT' : 'absent') +
      '</b> ' +
      ep('OBSERVED') +
      '. ' +
      (s.stale === true
        ? tag('stale', 'STALE') +
          ' — its own freshness limit passed ' +
          timeTag(s.freshUntil) +
          ', so it is what the plane last said, not the present.'
        : s.stale === null
          ? 'It states no freshness limit, so its currency is not established.'
          : 'Within its own freshness limit.') +
      (P.disagree ? ' <b>They disagree.</b> ' + esc(P.disagree) : '') +
      '</p>';
  const B = P.board;
  const boardP = B.present
    ? '<p><b>The board</b> declares SHUTDOWN STATE' +
      (B.date ? ' (' + esc(B.date) + ')' : '') +
      ' ' +
      ep('CLAIMED') +
      ': ' +
      esc(shortText(B.title.replace(/^.*?SHUTDOWN STATE\s*/, ''), 160) || 'no further words') +
      (B.firstOnRestart
        ? '<br><b>On restart, first:</b> ' + esc(shortText(B.firstOnRestart, 260))
        : '') +
      '<br><a href="/queue/pause">The shutdown record, unedited ' +
      icon('next') +
      '</a></p>'
    : '<p><b>The board</b> carries no SHUTDOWN STATE declaration at this commit. That is what the board says, not proof that work is running.</p>';
  return card({
    id: 'pause',
    section: 'pause',
    icon: P.verdict === 'unobservable' ? 'unobservable' : 'paused',
    n: P.verdict === 'paused' ? 'PAUSED' : P.verdict === 'running' ? 'NOT PAUSED' : 'UNOBSERVABLE',
    sig:
      'three readings: the halt file (now) · the kernel snapshot' +
      (s.observable && s.stale ? ' (STALE)' : '') +
      ' · the board' +
      (P.disagree ? ' · <b>they disagree</b>' : ''),
    body:
      '<p class="def">Three readings that should agree, each with its own time. The verdict is the file, because the halt stops the plane from publishing a newer snapshot.</p>' +
      '<div class="panel">' +
      fileP +
      snapP +
      boardP +
      '</div>',
  });
}

function boardCard(m) {
  const B = m.board;
  if (!B.observable) {
    return card({
      id: 'board',
      section: 'board',
      n: m.parsed ? m.parsed.length : 'UNOBSERVABLE',
      sig: m.parsed ? 'parser count only — ' + esc(B.why) : esc(B.why),
      body: unobsLine('Work versus not work, state and horizon cannot be counted.', B.why),
    });
  }
  const W = B.workCensus || {
    work: B.work.length,
    nonWork: B.nonWork.length,
    untyped: 0,
    byKind: {},
  };
  const C = B.census || { horizon: {}, project: {} };
  const counts = (obj, order) => {
    const keys = order ? order.filter(k => obj[k]) : [];
    const rest = Object.keys(obj)
      .filter(k => !keys.includes(k) && obj[k])
      .sort();
    return (
      '<p class="counts">' +
      [...keys, ...rest].map(k => '<span>' + tok(k) + ' <b>' + obj[k] + '</b></span>').join('') +
      '</p>'
    );
  };
  const someday = (C.horizon && C.horizon['SOMEDAY-IF']) || 0;
  const body =
    '<p class="def">' +
    B.total +
    ' open ID-bearing items at the ref above. Every count names its population. ' +
    ep('DERIVED') +
    ' by the resolver’s own census.</p>' +
    '<h3>Work versus not work (D6-A)</h3><p class="counts"><span>work <b>' +
    W.work +
    '</b></span><span>of which untyped, counted as work <b>' +
    (W.untyped || 0) +
    '</b></span><span>not work <b>' +
    W.nonWork +
    '</b></span></p>' +
    (W.nonWork ? counts(W.byKind || {}) : '') +
    '<h3>State</h3>' +
    counts(B.byState, STATE_ORDER) +
    '<h3>Horizon</h3>' +
    counts(C.horizon || {}, HORIZON_ORDER) +
    '<h3>Project</h3>' +
    counts(C.project || {}) +
    '<h3>Where the actor came from</h3><p class="counts"><span>quoted <b>' +
    B.actorSources.QUOTED +
    '</b></span><span>block <b>' +
    B.actorSources.BLOCK +
    '</b></span><span>graph <b>' +
    B.actorSources.GRAPH +
    '</b></span><span>UNSET <b>' +
    B.actorSources.NONE +
    '</b></span></p>' +
    '<p class="def">' +
    (B.recordErrors
      ? '<span class="bad">' + B.recordErrors + ' item(s) with record errors</span> · '
      : '0 items with record errors · ') +
    B.conflicts +
    ' field conflict(s) between an item’s homes, resolved by the D2-A precedence rule and shown on each item page, never smoothed.</p>' +
    (B.workLine ? '<p class="def"><code>' + esc(B.workLine) + '</code></p>' : '');
  return card({
    id: 'board',
    section: 'board',
    n: B.total,
    sig:
      'open items · <b>' +
      W.work +
      '</b> work · <b>' +
      W.nonWork +
      '</b> not work · <b>' +
      someday +
      '</b> ' +
      'SOMEDAY-IF',
    body,
  });
}

/** A card that is not a fold: one line, either static or a single link. */
function lineCard(o) {
  const s = S.SECTIONS[o.section];
  const inner =
    '<span class="tile">' +
    icon(o.icon || s.icon) +
    '</span><span class="name">' +
    esc(o.name || s.name) +
    '</span><span class="n' +
    (typeof o.n !== 'number' ? ' word' : '') +
    '">' +
    esc(o.n) +
    '</span><span class="sig">' +
    o.sig +
    '</span>';
  return (
    '<section class="card link c-' +
    o.section +
    (o.cls ? ' ' + o.cls : '') +
    '" id="' +
    o.id +
    '"><div class="sum">' +
    inner +
    (o.href
      ? '<a class="hit" href="' + esc(o.href) + '" aria-label="' + esc(o.label || o.name) + '"></a>'
      : '') +
    '</div></section>'
  );
}

function priorityCard() {
  return lineCard({
    id: 'priority',
    section: 'sources',
    icon: 'unbuilt',
    name: 'Priority',
    n: 'Not built',
    cls: 'slot',
    sig: 'Not implemented; requires the guided finish-lines session. Nothing on this page is ranked: lists are grouped, then kept in board order.',
  });
}

function allCard(m) {
  const B = m.board;
  const sig = B.observable
    ? STATE_ORDER.filter(s => B.byState[s])
        .map(s => tok(s) + ' ' + B.byState[s])
        .join(' · ')
    : m.parsed
      ? 'parser-only list: the resolver is unobservable'
      : esc(B.why);
  return lineCard({
    id: 'all',
    section: 'state',
    name: 'Every record',
    n: B.observable ? B.total : m.parsed ? m.parsed.length : 'UNOBSERVABLE',
    sig,
    href: '/queue/all',
    label: 'Every record, by state',
  });
}

function sourcesCard(m) {
  const ok = m.sources.filter(s => s.ok).length;
  const bad = m.sources.length - ok;
  const rows = m.sources
    .map(
      s =>
        '<li>' +
        (s.ok ? tag('provenance', s.name) : tag('unobservable', s.name + ': UNOBSERVABLE')) +
        '<br><span class="muted">' +
        esc(s.detail) +
        '</span></li>'
    )
    .join('');
  const limits =
    '<li>Titles are shortened for reading (emoji and emphasis removed, shouting lowered, the first clause kept, cut at ' +
    TITLE_MAX +
    ' characters); each item page shows the heading as written.</li>' +
    '<li>This page renders records that already exist. It has no controls, no scripts and no forms; it authors no query and sends nothing. A section opens by following a link to it. A control wanted here belongs to the App (MI29, DS13a decision 1).</li>' +
    '<li>Nothing refreshes by itself (DS13a decision 4): reload to read again.</li>';
  return card({
    id: 'sources',
    section: 'sources',
    n: ok + ' of ' + m.sources.length,
    nCls: bad ? 'bad' : '',
    sig:
      'sources read' +
      (bad ? ' · <b class="bad">' + bad + ' UNOBSERVABLE</b>' : '') +
      ' · the words and icons are on their own page',
    body:
      '<p class="def">How this page knows what it shows. Planning is read at the pushed ref; the private archive is read at request time and nothing of it is stored.</p>' +
      '<ul class="gloss">' +
      rows +
      limits +
      '</ul><p class="src">' +
      icon('next') +
      '<span><a href="/queue/terms">What the words and icons mean</a> · <a href="/queue/legacy">The previous queue page</a></span></p>',
  });
}

// ── /queue ──────────────────────────────────────────────────────────────────
function renderOverview(m, opts) {
  const allOpen = !!(opts && opts.allOpen);
  const openAll = allOpen
    ? '<span><a href="/queue">Fold the sections</a></span>'
    : '<span><a href="/queue?open=all">Open every section</a></span>';
  if (m.readFailed) {
    const P = m.provenance;
    const body =
      '<div class="loud"><p class="lead">' +
      icon('unobservable') +
      'THE QUEUE COULD NOT BE READ</p><p>The board is read from the ref <code>' +
      esc(P.ref || 'origin/main') +
      '</code>, never a working tree, and that read failed: ' +
      esc(P.why || 'unknown') +
      '.</p><p>Nothing is shown from a fallback copy on purpose: a board that looks current and is not is worse than a page that says it is broken.</p></div>' +
      pauseCard(m) +
      sourcesCard(m);
    return S.shell({
      title: 'Queue',
      current: 'queue',
      readAt: m.readAt,
      asOfHtml: asOfLine(m),
      body,
      allOpen,
    });
  }
  const body =
    renderNow(m) +
    needsCard(m) +
    blockedCard(m) +
    landedCard(m) +
    flowCard(m) +
    pauseCard(m) +
    boardCard(m) +
    priorityCard() +
    allCard(m) +
    sourcesCard(m);
  return S.shell({
    title: 'Queue',
    current: 'queue',
    readAt: m.readAt,
    asOfHtml: asOfLine(m, { openAll }),
    body,
    allOpen,
  });
}

// ── /queue/all ──────────────────────────────────────────────────────────────
function renderAll(m) {
  const B = m.board;
  let body;
  if (B.observable) {
    const parts = [];
    for (const s of STATE_ORDER) {
      const rows = B.work.filter(x => x.r.state === s);
      if (!rows.length) continue;
      const gl = S.GLOSSARY.find(g => g.group === 'state' && g.token === s);
      parts.push(
        card({
          id: 's-' + s.toLowerCase(),
          section: 'state',
          name: s,
          n: rows.length,
          sig: esc(gl ? gl.gloss : ''),
          body: list(rows.map(x => row(x, '', { hideState: true }))),
        })
      );
    }
    const other = B.work.filter(x => !STATE_ORDER.includes(x.r.state));
    if (other.length) {
      parts.push(
        card({
          id: 's-other',
          section: 'state',
          name: 'State not in the vocabulary',
          n: other.length,
          sig: 'worth a look precisely because nothing could file it',
          body: list(other.map(x => row(x, ''))),
        })
      );
    }
    if (B.out.someday.length) {
      parts.push(
        card({
          id: 'someday-yours',
          section: 'needs',
          name: 'Yours, SOMEDAY-IF',
          n: B.out.someday.length,
          sig: 'your next step, but the item waits on a condition, not on you today; also listed under its state',
          body: list(B.out.someday.map(x => row(x, ownWhy(x)))),
        })
      );
    }
    parts.push(
      card({
        id: 'not-work',
        section: 'state',
        icon: 'not-work',
        name: 'Not work',
        n: B.nonWork.length,
        sig: 'typed RULE, SPECIMEN, CAPTURE or PROGRAMME: kept where their links point, not counted as work',
        body: list(B.nonWork.map(x => row(x, ''))),
      })
    );
    body =
      '<p class="def">' +
      B.total +
      ' open items at this commit: <b>' +
      B.work.length +
      ' work</b> by state, then ' +
      B.nonWork.length +
      ' not work. State, kind, horizon and actor come from the one resolver. Board order within each group; not ranked. Tap a state to open it.</p>' +
      parts.join('');
  } else if (m.parsed) {
    // With no resolver the record list still exists from the parser alone, and says so.
    const groups = new Map();
    for (const it of m.parsed) {
      const k = it.status && it.status !== 'none' ? String(it.status).toUpperCase() : 'NONE';
      if (!groups.has(k)) groups.set(k, []);
      groups.get(k).push(it);
    }
    body =
      unobsLine('The resolver’s reading of these records is unavailable.', B.why) +
      '<p class="def">' +
      m.parsed.length +
      ' items from the parser alone: state comes from the heading glyph alone, and no kind, horizon or actor is shown.</p>' +
      [...groups.entries()]
        .map(([k, its]) =>
          card({
            id: 's-' + k.toLowerCase(),
            section: 'state',
            name: k,
            n: its.length,
            sig: 'state from the heading glyph',
            body:
              '<ul class="list">' +
              its
                .map(
                  it =>
                    '<li><a class="row" href="' +
                    itemHref(it.id) +
                    '"><span class="meta"><span class="id">' +
                    esc(it.id) +
                    '</span></span><span class="t">' +
                    esc(shortTitle(it.title).text) +
                    '</span></a></li>'
                )
                .join('') +
              '</ul>',
          })
        )
        .join('');
  } else {
    body = unobsLine('The board cannot be read.', B.why);
  }
  return S.shell({
    title: 'Every record',
    current: 'queue',
    readAt: m.readAt,
    asOfHtml: asOfLine(m, { self: '/queue/all' }),
    crumbHtml: crumbQueue(),
    body,
  });
}

// ── /queue/item/<id> ────────────────────────────────────────────────────────
function renderItem(m, id) {
  const B = m.board;
  const frame = (status, title, body, extra) => ({
    status,
    html: S.shell(
      Object.assign(
        {
          title,
          current: 'queue',
          readAt: m.readAt,
          asOfHtml: asOfLine(m),
          crumbHtml: crumbQueue(),
          body,
        },
        extra || {}
      )
    ),
  });
  const raw = m.parsed && typeof id === 'string' ? m.parsed.find(b => b.id === id) : null;
  if (!m.parsed) return frame(503, 'Record', unobsLine('This record cannot be read.', B.why));
  if (!raw) {
    return frame(
      404,
      'Not an open item',
      '<div class="panel"><p>No open item answers to <code>' +
        esc(String(id || '').slice(0, 40)) +
        '</code> at this commit. It may be closed (closed items live in the log), or the id may be wrong. The board itself was read.</p></div>'
    );
  }
  const x = B.observable ? B.byId.get(id) : null;
  const record =
    '<section id="record" aria-labelledby="record-h"><h2 id="record-h">' +
    icon('reports') +
    'The record, as written</h2><p class="def">Unedited text from QUEUE.md at this commit, heading first. Symbols in it are the record’s own.</p>' +
    '<div class="record"><p><b>' +
    esc(QV.titleText(raw.title).trim()) +
    '</b></p>' +
    QV.mdToHtml(raw.body) +
    '</div></section>';
  if (!x) {
    return frame(
      200,
      raw.id,
      unobsLine('The resolver’s facts for this record are unavailable.', B.why) + record,
      { h1: raw.id, subtitle: shortTitle(raw.title).text }
    );
  }
  const r = x.r;
  const from = (source, basis) =>
    ' <span class="muted">(' +
    esc(
      source === 'NONE' || !source
        ? 'no source says'
        : 'from ' +
            (source === 'QUOTED'
              ? 'a quoted graph reading'
              : source === 'BLOCK'
                ? 'its record block'
                : source === 'GLYPH'
                  ? 'its heading marker'
                  : 'the blocker graph' + (basis ? ', basis ' + basis : ''))
    ) +
    ')</span>';
  const onList = r.blockers.length
    ? r.blockers
        .map(b => {
          const t = B.byId.get(b);
          if (t)
            return (
              '<a href="' +
              itemHref(b) +
              '">' +
              esc(b) +
              '</a> ' +
              tok(t.r.state) +
              ' next step ' +
              tok(t.r.actor, isOwner(t.r.actor) ? 'att' : '')
            );
          const c = B.conds.get(b);
          return (
            'a condition ' +
            tok((c && c.actor) || 'UNKNOWN') +
            (c && c.evidence ? ' ' + esc(shortText(c.evidence, 200)) : '')
          );
        })
        .join('<br>')
    : r.state === 'BLOCKED'
      ? 'Its record says BLOCKED; the graph names no live blocker.'
      : 'Nothing, per the blocker graph.';
  const holds =
    (B.holds.get(x.id) || [])
      .map(b => '<a href="' + itemHref(b) + '">' + esc(b) + '</a>')
      .join(', ') || 'Nothing, per the blocker graph.';
  const v1 = r.v1 || {};
  const landing = v1.landed
    ? '<dt>Landed</dt><dd>' +
      esc(
        (v1.landed.repo || '?') +
          '@' +
          String(v1.landed.sha || '').slice(0, 8) +
          ' on ' +
          v1.landed.date +
          ' by ' +
          v1.landed.by
      ) +
      '<br>To be confirmed by: ' +
      esc(v1.confirmBy || 'UNSET') +
      '</dd>' +
      (v1.confirmed
        ? '<dt>Confirmed</dt><dd>' +
          esc(
            v1.confirmed.date +
              ' by ' +
              v1.confirmed.by +
              ' at ' +
              v1.confirmed.repo +
              '@' +
              String(v1.confirmed.sha || '').slice(0, 8)
          ) +
          '</dd>'
        : '')
    : '';
  const conflicts = (r.conflicts || []).length
    ? '<dt>Conflicts</dt><dd>' +
      r.conflicts
        .map(c =>
          esc(
            c.field +
              ': record says ' +
              c.block +
              ', graph says ' +
              c.graph +
              ' (' +
              (c.graphBasis || '?') +
              ')'
          )
        )
        .join('<br>') +
      '</dd>'
    : '';
  const errors = (r.errors || []).length
    ? '<dt class="bad">Record errors</dt><dd class="bad">' +
      r.errors.map(esc).join('<br>') +
      '</dd>'
    : '';
  const facts =
    '<div class="panel"><dl class="facts">' +
    '<dt>State</dt><dd>' +
    tok(r.state) +
    from(r.stateSource === 'BLOCK' ? 'BLOCK' : 'GLYPH') +
    '</dd>' +
    '<dt>Next step</dt><dd>' +
    tok(r.actor, isOwner(r.actor) ? 'att' : '') +
    from(r.actorSource, r.actorBasis) +
    '</dd>' +
    '<dt>Horizon</dt><dd>' +
    tok(r.horizon) +
    from(r.horizonSource, r.horizonBasis) +
    '</dd>' +
    '<dt>Project</dt><dd>' +
    esc(r.project) +
    from(r.projectSource, r.projectBasis) +
    '</dd>' +
    '<dt>Kind</dt><dd>' +
    esc(r.kind || 'not stated') +
    (r.work ? ' · counts as work' : ' · ' + tag('not-work', 'not work')) +
    '</dd>' +
    (x.done ? '<dt>Done means</dt><dd>' + esc(x.done) + '</dd>' : '') +
    (x.reason ? '<dt>Reason</dt><dd>' + esc(x.reason) + '</dd>' : '') +
    '<dt>Waiting on</dt><dd>' +
    onList +
    '</dd>' +
    '<dt>Holds up</dt><dd>' +
    holds +
    '</dd>' +
    landing +
    conflicts +
    errors +
    '</dl><p class="src">' +
    icon('provenance') +
    '<span>Resolved by the one resolver (item-resolver.cjs) over the board and the blocker graph at this commit. ' +
    ep('DERIVED') +
    '</span></p></div>';
  return frame(200, x.id + ' · ' + x.title, facts + record, {
    h1: x.id,
    subtitle: x.title,
    crumbHtml: crumbQueue() + '<a href="/queue/all">Every record</a>',
  });
}

// ── /queue/pause ────────────────────────────────────────────────────────────
function renderPause(m) {
  const P = m.pause.board;
  const body = P.present
    ? '<p class="def">The board’s shutdown record, unedited, at this commit. ' +
      ep('CLAIMED') +
      ' The three readings of the pause state are on the <a href="/queue#pause">queue page</a>.</p><div class="record">' +
      QV.mdToHtml(P.lines) +
      '</div>'
    : '<div class="panel"><p>No shutdown record on the board at this commit.</p></div>';
  return S.shell({
    title: 'Shutdown record',
    current: 'queue',
    readAt: m.readAt,
    asOfHtml: asOfLine(m, { self: '/queue/pause' }),
    crumbHtml: crumbQueue(),
    body,
  });
}

// ── /queue/terms ────────────────────────────────────────────────────────────
const TERM_GROUPS = [
  ['page', 'Page terms'],
  ['evidence', 'How a fact is known'],
  ['basis', 'Where the actor came from'],
  ['state', 'Lifecycle states'],
  ['horizon', 'Horizons'],
  ['actor', 'Next-step actors'],
];
function renderTerms(m) {
  const terms = TERM_GROUPS.map(
    ([g, title]) =>
      '<h3>' +
      esc(title) +
      '</h3><ul class="gloss">' +
      S.GLOSSARY.filter(t => t.group === g)
        .map(
          t =>
            '<li><b>' +
            esc(t.term) +
            '</b>' +
            (t.token !== t.term ? ' <code>' + esc(t.token) + '</code>' : '') +
            '<br>' +
            esc(t.gloss) +
            '</li>'
        )
        .join('') +
      '</ul>'
  ).join('');
  const icons = Object.entries(S.ICONS)
    .map(
      ([id, v]) =>
        '<li>' +
        icon(id) +
        ' <code>' +
        esc(id) +
        '</code><br>' +
        esc(v.meaning) +
        ' <span class="muted">Never: ' +
        esc(v.not) +
        '.</span></li>'
    )
    .join('');
  const colours =
    '<ul class="gloss">' +
    Object.entries(S.SECTIONS)
      .map(
        ([id, s]) =>
          '<li class="c-' +
          id +
          '"><span class="cc">' +
          icon(s.icon) +
          ' <b>' +
          esc(s.name) +
          '</b></span> — this section’s own colour and icon. Identity only, never a verdict.</li>'
      )
      .join('') +
    '<li><span class="bad"><b>RED</b></span> — past a ruled limit, or a failed read. Always beside the word.</li>' +
    '<li><span class="att"><b>Amber</b></span> — the next step is yours. Always beside the actor token.</li>' +
    '<li><span class="ok"><b>Green</b></span> — only beside a named GREEN verdict.</li></ul>';
  const body =
    '<p class="def">One term, one meaning, on every console page. The code value is the exact token in the records (DS13a decision 5: the wire tokens are kept).</p>' +
    terms +
    '<h3>Colours</h3>' +
    colours +
    '<h3>Icons — one meaning each</h3><ul class="gloss">' +
    icons +
    '</ul>';
  return S.shell({
    title: 'What the words mean',
    current: 'queue',
    readAt: (m && m.readAt) || new Date(),
    asOfHtml: '<span>The console’s vocabulary. Not a reading of any record.</span>',
    crumbHtml: crumbQueue(),
    body,
  });
}

module.exports = {
  buildModel,
  renderOverview,
  renderAll,
  renderItem,
  renderPause,
  renderTerms,
  shortTitle,
  deshout,
  doneMeans,
  readPause,
  readPauseState,
  STATE_ORDER,
  LIVE_STATES,
  OWNER_ACTORS,
  TITLE_MAX,
};
