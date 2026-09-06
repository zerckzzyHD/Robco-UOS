/**
 * scripts/board-axes.js — the ONE derivation of the board's two NEW axes.
 *
 * ── WHY THIS FILE EXISTS (owner's diagnosis, 2026-09-05) ────────────────────
 * "we setup the queue for a small workflow like RobCo, then I expanded into a
 * control plane / harness and started putting ideas from all directions and from
 * all timelines (now to in months from now) and it fucked it."
 *
 * Two axes answer that, and they answer DIFFERENT questions from the status
 * glyph, which is why they are fields and not more glyphs:
 *
 *   HORIZON  — should this item be counted YET.  BLOCKS-WORK-NOW · NEXT · SOMEDAY-IF
 *   PROJECT  — which of the six things this item belongs to.
 *
 * ⛔⛔ THE RULE THAT GIVES THE HORIZON AXIS ITS POINT, AND THE ONLY ONE THAT COSTS
 * ANYTHING: a `SOMEDAY-IF` item MUST NOT APPEAR IN A BACKLOG COUNT AT ALL. If it
 * still counts, the axis bought nothing — a captured thought would keep weighing
 * exactly as much as a live blocker, which is the disease, not the diagnosis.
 * `excludeSomeday()` below is that rule, in one place, and every total on the
 * `/queue` page goes through it.
 *
 * ── ⭐⭐ THREE-VALUED THROUGHOUT, AND AT TWO DIFFERENT LEVELS ─────────────────
 * ⚠ THIS PARAGRAPH DESCRIBED A BOARD THAT NO LONGER EXISTS, and the correction is
 * kept rather than overwritten because it is the whole lesson. When this file was
 * written the axes were assigned on 6 of 411 items, so the degrade path was the
 * ordinary path. Later the same evening a board-wide pass assigned BOTH axes to
 * all 411 — into `BLOCKER-GRAPH.json`, not into the accept blocks this module was
 * reading. Measured at archive `origin/main`: SOMEDAY-IF **55 of 411 (13.4%)**,
 * UNKNOWN horizons 14, UNKNOWN projects 12. ⛔ The reader printed `SOMEDAY-IF 0`
 * and `UNSET 405` against that board and no test went red, because the fixture put
 * the data where the reader looked. See `readHorizons` for the two-source fix.
 *
 *   PER ITEM   : a vocabulary value · `UNSET` · `UNPARSEABLE`.
 *                ⛔ An unset horizon is NEVER defaulted. Reading unset as
 *                BLOCKS-WORK-NOW inflates the live count; reading it as
 *                SOMEDAY-IF hides real work. Both are wrong and the second is
 *                worse, because it hides work while looking like progress.
 *
 *   PER AXIS   : `observable: true` with counts · `observable: false` with a
 *                stated reason.
 *                ⛔⛔ AND THESE TWO ARE NOT THE SAME FACT: "every item is UNSET"
 *                and "the field could not be read at all" would print the same
 *                reassuring shape — a big UNSET number — while meaning entirely
 *                different things. One says the assignment work has not happened;
 *                the other says this page cannot tell you anything. When the
 *                format module is unreachable the axis is UNOBSERVABLE and prints
 *                no integer, exactly as the honesty tile refuses to print a
 *                number over a censored denominator.
 *
 * ── ⛔ NO RULE IS RETYPED HERE ──────────────────────────────────────────────
 * The `accept`-block grammar and the horizon vocabulary live in the ARCHIVE, in
 * `!PLANNING/tools/item-format-check.cjs` — the check that REFUSES a malformed
 * block on the archive's own pre-commit. That module is injected (`fmt`), never
 * re-implemented, for the same reason the archive imports THIS repo's
 * `parseQueue` rather than writing a second one: two copies of one grammar is
 * how two counts of one thing begin to disagree. `fmt.HORIZON` is the vocabulary;
 * this file does not contain the three words as literals anywhere that a count
 * depends on.
 *
 * Pure functions only — no I/O, no `require` of the archive. The resolution is
 * `scripts/planning-paths.js`'s job (its three-case contract), so this module is
 * unit-testable against a stub `fmt` with no planning tree present at all.
 */

'use strict';

/** An item whose accept block carries no `horizon:` line — or has no block. */
const HORIZON_UNSET = 'UNSET';
/** An item whose `horizon:` line is present but not in the vocabulary. */
const HORIZON_UNPARSEABLE = 'UNPARSEABLE';

/**
 * The horizon of ONE item, read from its own first `accept` block.
 *
 * ⚠ FIRST BLOCK WINS, because that is what the archive's check enforces (R1: a
 * second block is refused). Reading a later one here would make this page
 * disagree with the gate that decides what is well-formed.
 *
 * @param {string[]} bodyLines the item's raw body lines, as parseQueue returns them
 * @param {{parseAccept:Function, HORIZON:string[]}} fmt the ARCHIVE's format module
 * @returns {string} a vocabulary value, HORIZON_UNSET, or HORIZON_UNPARSEABLE
 */
function horizonOfBody(bodyLines, fmt) {
  let blocks;
  try {
    blocks = fmt.parseAccept(bodyLines || []);
  } catch {
    // A body the archive's own parser throws on is not silently "unset" — the
    // field could not be read, which is the UNPARSEABLE fact, not the UNSET one.
    return HORIZON_UNPARSEABLE;
  }
  if (!Array.isArray(blocks) || !blocks.length) return HORIZON_UNSET;
  const raw = blocks[0] && blocks[0].fields ? blocks[0].fields.horizon : undefined;
  if (raw === undefined) return HORIZON_UNSET;
  return fmt.HORIZON.includes(raw) ? raw : HORIZON_UNPARSEABLE;
}

/**
 * The horizon axis over a whole set of parsed items.
 *
 * @param {Array<{id:string, body:string[]}>} items ID-bearing items from parseQueue
 * @param {object|null} fmt the archive's format module, or null when unreachable
 * @returns {{observable:boolean, why?:string, byId?:Map, counts?:object,
 *            vocabulary?:string[], someday?:Set<string>, unparseable?:string[]}}
 */
/**
 * ── ⛔⛤ TWO SOURCES, AND LOOKING IN ONLY ONE IS HOW THIS SHIPPED WRONG ────────
 *
 * The first version of this read the horizon from each item's own `accept` block
 * and nowhere else. That was right about the FORMAT — `horizon` is an accept-block
 * field, gated by R10 — and wrong about where the data would actually arrive.
 *
 * ⛔ MEASURED 2026-09-05, and it is the reason this function has two sources: the
 * board-wide assignment landed the same evening across all 411 items, and it went
 * into `BLOCKER-GRAPH.json` and `AXES-OVERRIDES.json`, NOT into accept blocks —
 * which still carry 6 horizons between them. Against that board the accept-block
 * reader printed `SOMEDAY-IF 0` and `UNSET 405` while the truth was `55` and `0`.
 * ⭐ Nothing was broken and every test passed: the fixture that proved the rule
 * put the horizon where the reader looked, which is exactly what a fixture cannot
 * test. *A feature verified only against data you authored is verified against
 * your own assumptions.*
 *
 * ── PRECEDENCE, and why this way round ──────────────────────────────────────
 *   1. the item's own `accept` block   — AUTHORED by a person, and REFUSED by the
 *                                        archive's pre-commit if malformed (R10).
 *                                        A hand-written value outranks a derived one.
 *   2. the graph's `horizon`           — the ASSIGNMENT, with a basis per row.
 *   3. neither                         — `UNSET`. Still never a default.
 *
 * ⚠ `UNKNOWN` IS A FIRST-CLASS VALUE FROM SOURCE 2 AND IS NOT `UNSET`. The
 * assignment pass deliberately left 14 items UNKNOWN — settled records that carry
 * no work, a live conflict between an item and a graph edge, a stage behind a
 * deferred stage — each with its reason quoted. ⛔ An item nobody could place is
 * not a `BLOCKS-WORK-NOW` and it is not a `SOMEDAY-IF`: it is not folded into any
 * band, it is not excluded from any total, and it is rendered under its own name.
 * Collapsing it into UNSET would erase the difference between "nobody has said"
 * and "somebody looked and the text does not settle it".
 *
 * @param {Array<{id:string, body:string[]}>} items ID-bearing items from parseQueue
 * @param {{fmt?:object, graph?:object, vocabulary?:string[]}} sources
 */
function readHorizons(items, sources) {
  const s = sources || {};
  const fmt = s.fmt && typeof s.fmt.parseAccept === 'function' ? s.fmt : null;
  const graphItems =
    s.graph && s.graph.items && typeof s.graph.items === 'object' ? s.graph.items : null;
  // The vocabulary is the ASSIGNMENT's (four values incl. UNKNOWN) when it is
  // reachable, else the accept block's three. Never a literal list here.
  const vocab = Array.isArray(s.vocabulary)
    ? s.vocabulary.slice()
    : fmt && Array.isArray(fmt.HORIZON)
      ? fmt.HORIZON.slice()
      : null;
  if (!vocab || (!fmt && !graphItems)) {
    return {
      observable: false,
      why: !vocab
        ? 'no horizon vocabulary is reachable (neither the archive’s item-format module nor its axis tool)'
        : 'neither an item-format module nor a blocker graph is reachable, so no item’s horizon could be read',
    };
  }
  if (!Array.isArray(items) || !items.length) {
    return { observable: false, why: 'the queue parsed to no ID-bearing items' };
  }
  const byId = new Map();
  const basisOf = new Map();
  const counts = {};
  for (const v of vocab) counts[v] = 0;
  counts[HORIZON_UNSET] = 0;
  counts[HORIZON_UNPARSEABLE] = 0;
  const unparseable = [];
  const someday = new Set();
  const basisCounts = {};
  const conflicts = [];
  for (const it of items) {
    let h = fmt ? horizonOfBody(it.body, fmt) : HORIZON_UNSET;
    let basis = h === HORIZON_UNSET || h === HORIZON_UNPARSEABLE ? null : 'BLOCK';
    const gRow = graphItems ? graphItems[it.id] : null;
    if (h === HORIZON_UNSET && gRow) {
      const raw = gRow.horizon;
      if (raw !== undefined) {
        h = vocab.includes(raw) ? raw : HORIZON_UNPARSEABLE;
        basis = String(gRow.horizonBasis || 'UNSTATED').toUpperCase();
      }
    } else if (basis === 'BLOCK' && gRow && gRow.horizon !== undefined && gRow.horizon !== h) {
      // ⛔⛤ THE SOURCES DISAGREE, AND PRECEDENCE MUST NOT HIDE IT. The block wins —
      // it is hand-written and gated, the graph row here is usually a keyword match
      // — but "the block wins" is a resolution, not an absence of conflict.
      // Measured at archive origin/main: 3 of the 6 accept-block horizons contradict
      // the assignment (DL1, GV20, GV22 — block BLOCKS-WORK-NOW, graph NEXT by
      // SIGNAL). ⚠ A page that silently picks one and shows a clean number is how a
      // board ends up with two answers nobody knows about. The caller prints these.
      conflicts.push({
        id: it.id,
        block: h,
        graph: gRow.horizon,
        graphBasis: String(gRow.horizonBasis || 'UNSTATED').toUpperCase(),
      });
    }
    byId.set(it.id, h);
    if (basis) {
      basisOf.set(it.id, basis);
      basisCounts[basis] = (basisCounts[basis] || 0) + 1;
    }
    counts[h] = (counts[h] || 0) + 1;
    if (h === HORIZON_UNPARSEABLE) unparseable.push(it.id);
    if (h === SOMEDAY_NAME && vocab.includes(SOMEDAY_NAME)) someday.add(it.id);
  }
  return {
    observable: true,
    byId,
    basisOf,
    basisCounts,
    counts,
    vocabulary: vocab,
    someday,
    unparseable,
    conflicts,
    total: items.length,
    sourcedFrom: [fmt ? 'accept blocks' : null, graphItems ? 'BLOCKER-GRAPH.json' : null]
      .filter(Boolean)
      .join(' + '),
  };
}

/**
 * ── THE PROJECT AXIS, from the graph's per-item assignment ──────────────────
 *
 * ⭐ This is the OWNER'S SIX-VALUE AXIS and it exists as of 2026-09-05:
 * APP · CONTROL-PLANE · HARNESS · MIST · MUSEUM · BINDER, plus UNKNOWN. It
 * supersedes the four-value domain census this page used to render — those two
 * disagree on 46 of 411 items (11.2%), so only one can be shown.
 *
 * ⚠⚠ AND THE BASIS IS NOT DECORATION HERE, IT IS THE HEADLINE CAVEAT. The
 * assignment's own measured miss rate: `SIGNAL` (a keyword/phrase match made by
 * the tool) was **wrong about one project row in three** on a declared-in-advance
 * sample. `READ` rows carry a reader's call with the deciding words quoted. So the
 * counts are printed with their basis split beside them, and a SIGNAL-heavy column
 * is a column to re-read, not a fact.
 *
 * ⛔ `UNKNOWN` is rendered under its own name and folded into nothing, for the
 * same reason as the horizon's.
 */
function readProjects(items, sources) {
  const s = sources || {};
  const graphItems =
    s.graph && s.graph.items && typeof s.graph.items === 'object' ? s.graph.items : null;
  const vocab = Array.isArray(s.vocabulary) ? s.vocabulary.slice() : null;
  if (!graphItems || !vocab) {
    return {
      observable: false,
      why: !graphItems
        ? 'BLOCKER-GRAPH.json is not reachable, so no item’s project could be read'
        : 'no project vocabulary is reachable (the archive’s axis tool did not load)',
    };
  }
  if (!Array.isArray(items) || !items.length) {
    return { observable: false, why: 'the queue parsed to no ID-bearing items' };
  }
  const byId = new Map();
  const counts = {};
  for (const v of vocab) counts[v] = 0;
  const UNSET = HORIZON_UNSET; // same word, same meaning: no source said anything
  counts[UNSET] = 0;
  const basisCounts = {};
  for (const it of items) {
    const row = graphItems[it.id];
    const raw = row ? row.project : undefined;
    const p = raw === undefined ? UNSET : vocab.includes(raw) ? raw : HORIZON_UNPARSEABLE;
    byId.set(it.id, p);
    counts[p] = (counts[p] || 0) + 1;
    if (p !== UNSET) {
      const b = String((row && row.projectBasis) || 'UNSTATED').toUpperCase();
      basisCounts[b] = (basisCounts[b] || 0) + 1;
    }
  }
  return { observable: true, byId, counts, basisCounts, vocabulary: vocab, total: items.length };
}

/**
 * The `SOMEDAY-IF` value, taken from the injected vocabulary rather than typed.
 *
 * ⚠ It is the LAST entry by the archive's own ordering (BLOCKS-WORK-NOW · NEXT ·
 * SOMEDAY-IF — nearest first), but positional trust is exactly the kind of
 * assumption that goes quiet when somebody reorders a list. So the value is
 * matched by name against the vocabulary and, if the vocabulary ever stops
 * carrying it, this returns a sentinel that matches NOTHING — no item is silently
 * classified as someday, and `excludeSomeday()` then removes nobody rather than
 * removing the wrong body of work.
 */
const SOMEDAY_NAME = 'SOMEDAY-IF';

/**
 * ⛔⛔ THE RULE, IN ONE PLACE: a SOMEDAY-IF item is not in the count.
 *
 * Takes any collection of ids and returns `{ kept, dropped }`. Callers print
 * `kept.length` and, when `dropped.length` is non-zero, say so beside it — a
 * silent subtraction is its own dishonesty, because the reader cannot tell a
 * number that shrank from a number that was always that size.
 *
 * ⚠ WHEN THE AXIS IS UNOBSERVABLE THIS REMOVES NOTHING and says so via
 * `applied:false`. It must not quietly behave like "there were none": a total
 * that could not apply the exclusion is a total with a stated ceiling, not a
 * corrected one.
 *
 * @param {Iterable<string>} ids
 * @param {{observable:boolean, someday?:Set<string>}} horizons from readHorizons
 */
function excludeSomeday(ids, horizons) {
  const all = [...(ids || [])];
  if (!horizons || !horizons.observable || !horizons.someday) {
    return { kept: all, dropped: [], applied: false };
  }
  const kept = [];
  const dropped = [];
  for (const id of all) (horizons.someday.has(id) ? dropped : kept).push(id);
  return { kept, dropped, applied: true };
}

/**
 * Every `###` heading's raw content, in document order.
 *
 * ⚠ RAW, not the parsed title. The band rule reads the heading's leading glyph,
 * and `parseQueue` STRIPS that glyph off `title` — deriving a band from the title
 * is the mistake the parser's own header warns consumers about by name. This is
 * the same raw scan `roadmap-generate.js` does before banding, kept in step with
 * it deliberately: both feed `bandOfHeading`, so both must see the same string.
 */
function rawItemHeadings(queueMd) {
  const out = [];
  for (const line of String(queueMd || '')
    .replace(/\r\n/g, '\n')
    .split('\n')) {
    const h = /^#{3}\s+(.*)$/.exec(line);
    if (h) out.push(h[1].trim());
  }
  return out;
}

/**
 * id → band key, over the WHOLE queue.
 *
 * ⭐⭐ THIS IS WHY THE PAGE CAN CORRECT A BAND COUNT THE BOARD CANNOT. The board
 * prints the Backlog as a COUNT rather than a list ("a projection of the ORDER of
 * the work, not a dump of it"), so a consumer reading the board can never tell
 * which items are in it — and a horizon correction computed from the board's rows
 * would therefore silently skip roughly two thirds of the items. This reads the
 * queue itself, which the `/queue` route already holds in memory for the honesty
 * tile, so the correction is computed over every item or not at all. Same
 * censored-denominator lesson, applied before it could be repeated.
 *
 * @param {string} queueMd
 * @param {object} QV      scripts/queue-view.js (for STATUSES / ITEM_ID_RE)
 * @param {Function} bandOfHeading  roadmap-generate.js's band rule — imported, never retyped
 * @returns {Map<string,string|null>} id → status key, or null for unclassified
 */
function bandById(queueMd, QV, bandOfHeading) {
  const out = new Map();
  for (const content of rawItemHeadings(queueMd)) {
    const r = bandOfHeading(content, QV);
    if (!r || !r.id) continue;
    out.set(r.id, r.band || null);
  }
  return out;
}

/**
 * How many SOMEDAY-IF items sit in each band — the per-band correction.
 *
 * Returns `{ applied, byBand: Map<bandKey, string[]> }`. `applied:false` means
 * the horizon axis was UNOBSERVABLE, so no band's count may be described as
 * corrected. The caller renders `104` or `104 (103 counted, 1 someday)`; it never
 * renders a corrected number with no trace of the correction.
 */
function somedayByBand(horizons, bands) {
  if (!horizons || !horizons.observable || !horizons.someday) {
    return { applied: false, byBand: new Map() };
  }
  const byBand = new Map();
  for (const id of horizons.someday) {
    const b = bands.get(id) || 'unclassified';
    if (!byBand.has(b)) byBand.set(b, []);
    byBand.get(b).push(id);
  }
  return { applied: true, byBand };
}

/**
 * ── THE OWNER AXIS: DECIDE vs DO, which are two different errands ────────────
 *
 * ⛔⛤ A TILE THAT MERGES THEM IS LYING BY A FACTOR OF TWO EVEN WHEN ITS COUNT IS
 * RIGHT. Measured on the live board 2026-09-05: of the owner list's 96 rows, 23
 * ask him a QUESTION, 18 need his HANDS, and 4 are both. Those go to him
 * differently — one is a sitting he books, the other is a task list he works
 * through — so a single "needs you: 37" is a number he cannot act on.
 *
 * ⭐ THE SPLIT IS NOT INVENTED HERE. It is `BLOCKER-GRAPH.json`'s own `actor`
 * vocabulary, which already distinguishes exactly this:
 *   OWNER-RULING   "needs an owner ruling or a decision only he can make"  → DECIDE
 *   OWNER-KEYBOARD "needs a human physically at the keyboard / phone"      → DO
 *   EXTERNAL       "a third party, or a credential we will not touch"      → neither
 * The graph is the artifact the triage itself was measured against, it is
 * regenerated by a tool, and it carries per-row evidence. So this maps that
 * vocabulary onto two labels and adds nothing.
 *
 * ⚠⚠ AND ITS CEILING TRAVELS WITH IT, because this is the exact number that has
 * been wrong twice. Every row carries `actorBasis` — READ (full body), DIGEST
 * (heading + done-means), KEYWORD (a heading marker only) — and the measured
 * inflation mechanism is DIGEST: rulings on this board land in item BODIES while
 * HEADINGS are not updated, so a digest-based pass re-lists everything that was
 * ruled in the body. 2026-09-05: 83 of the 96 owner rows were classified from a
 * digest, and the triage that actually READ them cut 96 to 37. So the basis
 * counts are returned alongside the totals and the caller MUST print them — a
 * bare 68 under "decide" would repeat, in a new tile, the defect the last two
 * rebuilds of this tile were for.
 *
 * Cross-checked against the live parser exactly as the census is: a graph row
 * whose item is no longer OPEN on the board is drift, reported, never counted.
 *
 * @param {object|null} graph  the parsed BLOCKER-GRAPH.json, or null
 * @param {Map<string,{status:string}>} itemsById  live parsed items, by id
 * @param {object} horizons  from readHorizons — SOMEDAY-IF rows are excluded here too
 */
const OWNER_ACTORS = {
  'OWNER-RULING': 'decide',
  'OWNER-KEYBOARD': 'do',
  EXTERNAL: 'external',
};

function readOwnerAxis(graph, itemsById, horizons) {
  if (!graph || typeof graph !== 'object' || !graph.items || typeof graph.items !== 'object') {
    return {
      observable: false,
      why: 'BLOCKER-GRAPH.json is not reachable or carries no items map',
    };
  }
  const lanes = { decide: [], do: [], external: [] };
  const basis = { READ: 0, DIGEST: 0, KEYWORD: 0, UNSTATED: 0 };
  let closedSince = 0;
  let somedayDropped = 0;
  for (const [id, row] of Object.entries(graph.items)) {
    const lane = OWNER_ACTORS[row && row.actor];
    if (!lane) continue; // SESSION / UNKNOWN — not his errand
    const live = itemsById.get(id);
    // ⛔ A row whose item is gone, or is done, is NOT counted. The census learned
    // this the expensive way: a hand list that keeps a closed row keeps reporting it.
    if (!live || live.status === 'done') {
      closedSince++;
      continue;
    }
    if (horizons && horizons.observable && horizons.someday && horizons.someday.has(id)) {
      somedayDropped++;
      continue;
    }
    lanes[lane].push({
      id,
      status: live.status,
      basis: (row.actorBasis || 'UNSTATED').toUpperCase(),
      evidence: String(row.actorEvidence || '').trim(),
    });
    const b = (row.actorBasis || 'UNSTATED').toUpperCase();
    basis[b] = (basis[b] || 0) + 1;
  }
  // ⭐ READ rows first, then DIGEST, then KEYWORD — the strongest evidence at the
  // top of the list rather than an alphabet that mixes a verified row in among
  // eighty guesses. Ties break by id so the order is stable between reads.
  const rank = b => (b === 'READ' ? 0 : b === 'DIGEST' ? 1 : 2);
  for (const k of Object.keys(lanes)) {
    lanes[k].sort((a, b) => rank(a.basis) - rank(b.basis) || a.id.localeCompare(b.id));
  }

  // ── ⭐⭐ THE COUNTED SET IS THE ROWS SOMEBODY ACTUALLY READ (owner ruling,
  //    2026-09-05) ──────────────────────────────────────────────────────────
  //
  // ⛔⛤ THIS TILE HAS NOW BEEN WRONG TWICE, IN DIFFERENT WAYS, AND BOTH TIMES A
  // CONFIDENT NUMBER WAS THE MECHANISM. First it counted a heading GLYPH under a
  // label promising decisions (16 in the band, 2 of them decisions). Then the
  // declared roster it was rebuilt onto was emptied and it printed `0` — read as
  // "nothing is waiting on you" — for two days. Folding DIGEST rows into a lane
  // total would be the third instance of the same disease: on the live graph that
  // fold produced 68 where a read of the rows measured roughly a third of it.
  //
  // ⭐ SO THE LANE COUNT IS THE `READ` ROWS ONLY — rows whose FULL BODY somebody
  // read — and the DIGEST/KEYWORD remainder is returned separately so the caller
  // can print it as UNOBSERVABLE at tile size rather than burying it in a hint
  // beside a number three times too large. ⚠ A DIGEST row is a heading + Done-means
  // reading, and this board records rulings in item BODIES without updating
  // headings, so a digest row may be open, may be long since answered, and nothing
  // short of reading it can say which.
  //
  // ⛔ A LANE WITH ZERO READ ROWS IS `UNOBSERVABLE`, NEVER `0`. That is the same
  // rule as the empty roster one level up: an absent measurement is not the
  // measurement "none".
  //
  // ⚠⚠ AND THE CEILING ON THE READ COUNT ITSELF, because it is the next way this
  // can mislead: `actorBasis` records how the GRAPH classified a row, not whether
  // a human has ever read the item. The 2026-09-05 owner-list triage read rows and
  // published its verdicts to a markdown report WITHOUT writing them back to the
  // graph — so real reading exists that this count cannot see, and the READ number
  // is a FLOOR. Writing that triage's verdicts into BLOCKER-GRAPH.json is what
  // raises it; until then the honest reading of a lane is "at least this many".
  const laneSummary = {};
  for (const k of Object.keys(lanes)) {
    const read = lanes[k].filter(r => r.basis === 'READ');
    laneSummary[k] = {
      read: read.length,
      unread: lanes[k].length - read.length,
      total: lanes[k].length,
      // ⛔ `observable` is about whether a COUNT can be printed for this lane, and
      // it is false on zero reads. Callers must not print `laneSummary[k].read`
      // without consulting it, or the zero comes straight back.
      observable: read.length > 0,
    };
  }
  const unreadTotal = Object.values(laneSummary).reduce((a, s) => a + s.unread, 0);

  return {
    observable: true,
    lanes,
    laneSummary,
    unreadTotal,
    basis,
    closedSince,
    somedayDropped,
    // ⛔⛔ NO "BOTH" LANE IS COMPUTED, AND THE ABSENCE IS THE FINDING. `actor` is
    // SINGLE-VALUED in the graph, so an item that both asks a question AND needs
    // his hands can only be filed as one of them. The 2026-09-05 triage READ the
    // rows and found FOUR of exactly that shape (BD11, CP5, GV13, SEC5 — each
    // written up with a "QUESTION: … HANDS: …" body). ⚠ A `both` derived from an
    // intersection of these two lanes would be empty BY CONSTRUCTION and would
    // read as "there are none", which is a fabricated zero — the cheapest way to
    // put a confident wrong number on this page. So the lanes are reported as
    // what they are, and the caller states this ceiling in the tile's own words.
    bothIsUnrepresentable: true,
    measuredAt: graph.measuredAt || null,
    measuredAgainst: graph.measuredAgainst || null,
  };
}

module.exports = {
  HORIZON_UNSET,
  HORIZON_UNPARSEABLE,
  SOMEDAY_NAME,
  horizonOfBody,
  readHorizons,
  excludeSomeday,
  rawItemHeadings,
  bandById,
  somedayByBand,
  readProjects,
  readOwnerAxis,
  OWNER_ACTORS,
};
