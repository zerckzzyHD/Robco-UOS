/**
 * scripts/planning-paths.js — the ONE resolver for the private planning tree.
 *
 * ── WHY THIS FILE EXISTS (F04, 2026-08-02) ──────────────────────────────────
 * `QUEUE.md`, `QUEUE_LOG.md` and `NORTH_STARS.md` used to live in THIS repo,
 * which is PUBLIC. They describe control-plane topology, incidents, backup gaps,
 * exact scheduled-task timing, mutation-gate design and planned security work —
 * none of it a credential or PII leak, but all of it operational detail with no
 * reason to be world-readable. The five-repo ground-truth audit named that a
 * public sink sitting outside the Archive→Exhibit/P16 boundary, and the owner
 * chose to close it: the canonical copies now live in the PRIVATE archive at
 * `_RobCo-Archive/!PLANNING/`, excluded from the museum walk so the archive
 * cannot re-expose them through the exhibit.
 *
 * ── THE CONTRACT ────────────────────────────────────────────────────────────
 * Resolution order, mirroring how `scripts/pre-push` and `scripts/robco-push.js`
 * already resolve the sibling control repo (an env override, else a sibling path):
 *
 *   1. `ROBCO_PLANNING_DIR`  — explicit override, for a machine that keeps the
 *                              archive somewhere else.
 *   2. `../_RobCo-Archive/!PLANNING`  — the sibling checkout. The normal case.
 *   3. `null`                — the tree is not reachable.
 *
 * ⛔ CASE 3 IS NOT A FAILURE, AND CALLERS MUST NOT TREAT IT AS ONE. A public
 * clone of this repo has no archive and never will; that is the entire point of
 * the move. Every consumer degrades: the generators no-op, the drift check stays
 * silent (it was already fail-safe by construction — Protocol 50(b)), and the
 * gate's queue suites SKIP with a stated reason rather than fail. Same DNA as the
 * `[ -f ]`-guarded push guard: a checkout without the private tooling is NEVER
 * blocked by machinery it was never meant to have.
 *
 * ⚠ The flip side, stated so it is not lost: on the OWNER's machine the tree IS
 * present, so the checks still really run. "Skips when absent" must never quietly
 * become "skips always" — `describe()` below exists so a caller can print WHICH
 * of the three cases it hit, and the suites do print it.
 */

'use strict';

const fs = require('fs');
const path = require('path');
const cp = require('child_process');

const REPO_ROOT = path.resolve(__dirname, '..');

/** The three canonical planning documents, in the order they are usually read. */
const PLANNING_FILES = ['QUEUE.md', 'QUEUE_LOG.md', 'NORTH_STARS.md'];

/** Default sibling location: `<repo>/../_RobCo-Archive/!PLANNING`. */
const DEFAULT_PLANNING_DIR = path.join(REPO_ROOT, '..', '_RobCo-Archive', '!PLANNING');

function safeIsDir(p) {
  try {
    return fs.statSync(p).isDirectory();
  } catch {
    return false;
  }
}

function safeIsFile(p) {
  try {
    return fs.statSync(p).isFile();
  } catch {
    return false;
  }
}

/**
 * Resolve the planning directory, or null when it is not reachable.
 * Never throws — an unreadable/odd path resolves to null like an absent one.
 */
function planningDir() {
  const override = process.env.ROBCO_PLANNING_DIR;
  if (override) return safeIsDir(override) ? path.resolve(override) : null;
  return safeIsDir(DEFAULT_PLANNING_DIR) ? path.resolve(DEFAULT_PLANNING_DIR) : null;
}

/**
 * -- OPTION A, owner-ruled 2026-09-07: THE BOARD IS READ FROM A REF, NEVER A TREE --
 *
 * THE DEFECT THIS CLOSES. This resolver used to hand back a DIRECTORY and every
 * caller did fs.readFileSync inside it. That directory is _RobCo-Archive's
 * PRIMARY checkout. Nothing has ever pulled it: it stayed current as a SIDE
 * EFFECT of sessions working directly in it, and that side effect ended the day
 * work moved into _wt-* worktrees. On 2026-09-07 the surface sat 202 commits and
 * 11.9 hours behind while a dozen sessions committed all night.
 *
 * WORSE, AND WHY THE TIMESTAMP LIED TOO. readRoadmap reported statSync().mtime as
 * "when this was built". An mtime is when the FILE WAS WRITTEN, not when its
 * CONTENT was made, and a checkout touch bumps it. The stale page said
 * "Rebuilt 02:16" while showing content committed at 02:44Z -- a stamp 3.5 hours
 * NEWER than the thing it stamped. The page already carries good staleness prose;
 * it was being fed the wrong clock.
 *
 * SO: content AND its timestamp both come from the ref. ROBCO_PLANNING_REF
 * overrides it (default origin/main). It is only as fresh as the last fetch,
 * which the page states rather than assumes.
 *
 * NO FALLBACK, DELIBERATELY. When the ref cannot be read these return their
 * unavailable shape and the page says so. Falling back to the working tree would
 * restore exactly the silent staleness this replaces, and a plausible wrong
 * number is worse than a visible failure -- nobody investigates a number that
 * looks fine.
 */
const PLANNING_REF = process.env.ROBCO_PLANNING_REF || 'origin/main';

/** The archive repo root -- the parent of the planning dir, resolved not assumed. */
function archiveRepo() {
  const dir = process.env.ROBCO_PLANNING_DIR || DEFAULT_PLANNING_DIR;
  return path.resolve(dir, '..');
}

/**
 * ROBCO_PLANNING_DIR is an EXPLICIT instruction to read a particular tree -- a test
 * fixture, a scratch copy, another checkout. Honour it as a TREE read.
 *
 * The ref is the default precisely because nobody ASKS for the stale primary checkout;
 * it was being read by accident. An override is not an accident, so overriding it into
 * `origin/main` would be the same silent-wrong-source bug pointed the other way: the
 * caller names a directory and is served something else without being told.
 */
function planningOverride() {
  const dir = process.env.ROBCO_PLANNING_DIR;
  return dir ? path.resolve(dir) : null;
}

/**
 * Where the board is being read from: { ok, mode:'ref', sha, committedAt, ref, repo }
 * or { ok, mode:'tree', dir } or { ok:false, why }. Never throws.
 */
function planningSource() {
  const override = planningOverride();
  if (override) return { ok: true, mode: 'tree', dir: override };
  const repo = archiveRepo();
  try {
    const sha = cp
      .execFileSync('git', ['-C', repo, 'rev-parse', PLANNING_REF], {
        encoding: 'utf8',
        timeout: 15000,
        stdio: ['ignore', 'pipe', 'ignore'],
      })
      .trim();
    if (!/^[0-9a-f]{7,40}$/.test(sha)) {
      return { ok: false, why: 'ref ' + PLANNING_REF + ' did not resolve to a sha' };
    }
    const committedAt = cp
      .execFileSync('git', ['-C', repo, 'log', '-1', '--format=%cI', sha], {
        encoding: 'utf8',
        timeout: 15000,
        stdio: ['ignore', 'pipe', 'ignore'],
      })
      .trim();
    return { ok: true, mode: 'ref', sha, committedAt, ref: PLANNING_REF, repo };
  } catch (e) {
    return {
      ok: false,
      why:
        'ref ' + PLANNING_REF + ' unreadable in ' + repo + ' -- ' + String(e.message).slice(0, 90),
    };
  }
}

/**
 * Read one planning file OUT OF THE REF. { ok:true, text, sha, committedAt } or
 * { ok:false, why }. Never falls back to the working tree.
 */
function planningReadRef(name) {
  const src = planningSource();
  if (!src.ok) return { ok: false, why: src.why };
  if (src.mode === 'tree') {
    const p = path.join(src.dir, name);
    try {
      const text = fs.readFileSync(p, 'utf8');
      // The tree has no commit date, so "as of" is the file's own mtime. Same shape as
      // the ref branch, so every caller's staleness prose keeps working unchanged.
      return {
        ok: true,
        text,
        mode: 'tree',
        sha: null,
        committedAt: fs.statSync(p).mtime.toISOString(),
        ref: src.dir,
      };
    } catch (e) {
      return { ok: false, why: name + ' not readable in ' + src.dir };
    }
  }
  try {
    const text = cp.execFileSync('git', ['-C', src.repo, 'show', src.sha + ':!PLANNING/' + name], {
      encoding: 'utf8',
      maxBuffer: 1 << 28,
      timeout: 30000,
      stdio: ['ignore', 'pipe', 'ignore'],
    });
    return { ok: true, text, sha: src.sha, committedAt: src.committedAt, ref: src.ref };
  } catch (e) {
    return {
      ok: false,
      why: name + ' not readable at ' + PLANNING_REF + ' -- ' + String(e.message).slice(0, 90),
    };
  }
}

/** What the page shows so "is this current" is answerable by LOOKING, not by an investigation. */
function planningProvenance() {
  const src = planningSource();
  if (!src.ok) return { ok: false, why: src.why, ref: PLANNING_REF };
  if (src.mode === 'tree') {
    return { ok: true, mode: 'tree', ref: src.dir, sha: null, committedAt: null };
  }
  return {
    ok: true,
    mode: 'ref',
    ref: src.ref,
    sha: src.sha.slice(0, 8),
    committedAt: src.committedAt,
    ageSeconds: Math.max(0, Math.round((Date.now() - new Date(src.committedAt).getTime()) / 1000)),
  };
}

/**
 * Absolute path to one planning file, or null if the tree or the file is absent.
 * @param {string} name one of PLANNING_FILES
 */
function planningFile(name) {
  const dir = planningDir();
  if (!dir) return null;
  const full = path.join(dir, name);
  return safeIsFile(full) ? full : null;
}

/**
 * Read a planning file's text, or null when unavailable. Never throws.
 * @param {string} name one of PLANNING_FILES
 */
/**
 * Read a planning file FROM THE WORKING TREE. This is the reader for TOOLING --
 * `roadmap-generate.js` writes ROADMAP.md into that same tree and then compares the
 * two, so redirecting this to the ref makes it compare a tree-built board against
 * ref source and it can never agree while the checkout is behind. Generators read
 * whatever they write next to. The SERVED surface wants the ref: see
 * `readPlanningFileAtRef`.
 */
function readPlanningFile(name) {
  const full = planningFile(name);
  if (!full) return null;
  try {
    return fs.readFileSync(full, 'utf8');
  } catch {
    return null;
  }
}

/**
 * The LOCALLY GENERATED museum: `museum/site/`, which generate.mjs calls its "final
 * output (atomically replaced)". ⛔ NOT `museum/public/`, which is the derived staging
 * tree for the public repo, and ⛔ not the published site.
 *
 * The generator emits no wall-clock timestamps (reproducibility is a property here), so
 * there is nothing inside the output that says when it was built. The newest mtime in
 * the tree is the honest available signal and is labelled as exactly that on the page --
 * a checkout would also set it, so it is a WRITE time, not a proof of content freshness.
 */
function museumSiteDir() {
  return path.join(archiveRepo(), 'museum', 'site');
}

/** { ok, dir, files, generatedAt } or { ok:false, dir, why }. Never throws, never guesses. */
function museumProvenance() {
  const dir = museumSiteDir();
  try {
    const index = path.join(dir, 'index.html');
    let newest = fs.statSync(index).mtime;
    let files = 0;
    const walk = d => {
      for (const e of fs.readdirSync(d, { withFileTypes: true })) {
        const p = path.join(d, e.name);
        if (e.isDirectory()) walk(p);
        else {
          files++;
          const m = fs.statSync(p).mtime;
          if (m > newest) newest = m;
        }
      }
    };
    walk(dir);
    return { ok: true, dir, files, generatedAt: newest.toISOString() };
  } catch (e) {
    return { ok: false, dir, why: String(e.message).slice(0, 120) };
  }
}

/** Read a planning file for DISPLAY: from the ref, no fallback, null if unreadable. */
function readPlanningFileAtRef(name) {
  const r = planningReadRef(name);
  return r.ok ? r.text : null;
}

/** True when every canonical planning file is readable. */
function planningAvailable() {
  return PLANNING_FILES.every(f => planningFile(f) !== null);
}

/**
 * Absolute path for a GENERATED planning artifact — a file this repo WRITES into
 * the private tree rather than reads from it (currently `ROADMAP.md`, produced by
 * scripts/roadmap-generate.js). Returns null when the tree is unreachable, which
 * is the public-clone case: nothing is written and that is not a failure.
 *
 * ⛔ A GENERATED FILE IS DELIBERATELY *NOT* IN `PLANNING_FILES`. That list is the
 * READ contract — `planningAvailable()` requires every entry to be readable, and
 * the gate's queue suites (246/248) SKIP when it is not. Putting a written file in
 * it would mean any checkout that simply has not run the generator yet reads as a
 * checkout with NO PLANNING TREE AT ALL, silently skipping every queue check on a
 * machine that has the queue right there. That converts a missing OUTPUT into a
 * skipped INPUT check — the precise "a skip that cannot be told from a pass"
 * dishonesty the header above exists to prevent. An output is never a
 * precondition for reading the input.
 *
 * The name is validated rather than trusted: this joins onto a real directory, so
 * a caller passing a traversal ("../../x") or an absolute path must not be able to
 * write outside the planning tree.
 */
function planningWritePath(name) {
  const dir = planningDir();
  if (!dir) return null;
  if (typeof name !== 'string' || !/^[A-Za-z0-9][A-Za-z0-9._-]*$/.test(name)) return null;
  return path.join(dir, name);
}

// ── The private REPORTS tree ─────────────────────────────────────────────────
//
// ⛔ THE REPORTS ARE NOT PUBLISHABLE AND MUST NEVER ENTER THIS REPO. They describe
// internal architecture, and at least one documents a live exposure in
// remediation detail. This repo is PUBLIC. So they are resolved the same way the
// planning tree is — an out-of-repo sibling, read at the moment of use — and are
// never copied, staged, generated into, or cached anywhere inside this checkout.
//
// ⚠ THE FAILURE THIS SHAPE IS AVOIDING IS RECENT AND REAL: a new folder was not in
// a generator's exclusion list, and uncurated reports silently became eligible to
// be published as pages. Nothing leaked, but only because publishing happened to
// be frozen. "Inside the repo but excluded" is a promise that one forgotten list
// entry breaks; OUTSIDE the repo is a property no list can forget. A dev server
// that serves this checkout would serve anything sitting in it — including a
// gitignored subdirectory — so the content simply does not live here.
//
// The resolution contract is the same three cases as the planning tree, and null
// is again a NORMAL outcome, not a failure: a public clone has no archive by
// design and the reports route degrades to an explanatory page.
const DEFAULT_REPORTS_DIR = path.join(REPO_ROOT, '..', '_RobCo-Archive', 'reports');

/** Absolute path to the private reports directory, or null when unreachable. */
function reportsDir() {
  const override = process.env.ROBCO_REPORTS_DIR;
  if (override) return safeIsDir(override) ? path.resolve(override) : null;
  return safeIsDir(DEFAULT_REPORTS_DIR) ? path.resolve(DEFAULT_REPORTS_DIR) : null;
}

/**
 * ⛔ A REQUESTED NAME IS VALIDATED, NEVER TRUSTED — this joins onto a real
 * directory that sits OUTSIDE the repo, so an unchecked name is a read-anything
 * primitive reachable over the network. Two independent barriers, deliberately
 * not one: the name must be a plain `*.md` basename (no separators, no `..`, no
 * drive letter, no leading dot), AND the resolved path must still be a direct
 * child of the reports directory. Either alone would probably do; the pattern
 * check can be out-thought by an encoding, and the containment check is the one
 * that holds regardless of how the name was spelled.
 */
const REPORT_NAME_RE = /^[A-Za-z0-9][A-Za-z0-9._-]*\.md$/;
function reportFile(name) {
  const dir = reportsDir();
  if (!dir) return null;
  if (typeof name !== 'string' || !REPORT_NAME_RE.test(name)) return null;
  const full = path.resolve(dir, name);
  if (path.dirname(full) !== dir) return null; // containment, checked after resolution
  return safeIsFile(full) ? full : null;
}

/**
 * The available report basenames, NEWEST FIRST — by the date in the name.
 *
 * ⛔ This used to be `.sort().reverse()`: alphabetical-descending on the NAME, which
 * put OVERNIGHT-REPORT-2026-08-24 above DISPATCH-RUNNING-REPORT-2026-09-01 because
 * "O" sorts after "D" — while the page above it said "newest first". Measured
 * 2026-09-03 with the Aug 24 report first and the Sep 1 report sixth. The order is
 * now the ISO date embedded in the name, descending; a name with no date falls
 * back to the file's mtime; ties break by name so the list is stable. Suite 267.
 */
const REPORT_DATE_RE = /(\d{4}-\d{2}-\d{2})/;
function reportSortKey(dir, name) {
  const m = REPORT_DATE_RE.exec(name);
  if (m) return m[1];
  try {
    return fs.statSync(path.join(dir, name)).mtime.toISOString().slice(0, 10);
  } catch {
    return '0000-00-00';
  }
}
function listReports() {
  const dir = reportsDir();
  if (!dir) return [];
  try {
    return fs
      .readdirSync(dir)
      .filter(n => REPORT_NAME_RE.test(n) && safeIsFile(path.join(dir, n)))
      .map(n => ({ n, k: reportSortKey(dir, n) }))
      .sort((a, b) => (a.k === b.k ? a.n.localeCompare(b.n) : a.k < b.k ? 1 : -1))
      .map(x => x.n);
  } catch {
    return [];
  }
}

/** Read one report's markdown, or null. Never throws. */
function readReport(name) {
  const full = reportFile(name);
  if (!full) return null;
  try {
    return fs.readFileSync(full, 'utf8');
  } catch {
    return null;
  }
}

/**
 * The generated roadmap board, read from the planning tree AT THE MOMENT OF USE.
 *
 * ⛔ NEVER CACHED, and that is the whole contract. The board is regenerated as
 * work closes — sometimes while a page is being read — so a snapshot held in
 * memory would show a stale picture while presenting it as the current one. That
 * is worse than showing nothing: the entire point of the board is that it matches
 * reality. Returns {text, mtime} so the reader can judge freshness themselves,
 * or null when the tree is unreachable.
 *
 * ⚠ ROADMAP.md is deliberately NOT in PLANNING_FILES — see planningWritePath().
 * It is an OUTPUT of this repo, and requiring it to exist would make a checkout
 * that simply has not generated it yet read as a checkout with no planning tree.
 */
function readRoadmap() {
  const r = planningReadRef('ROADMAP.md');
  if (!r.ok) return null;
  // `mtime` is the REF'S COMMIT DATE, not a file mtime. An mtime is when the file
  // was WRITTEN; a checkout touch bumps it and the page then reports a freshness it
  // does not have. This is the clock the staleness prose should always have had.
  return { text: r.text, mtime: new Date(r.committedAt), sha: r.sha, ref: r.ref };
}

/**
 * ── OPEN OWNER DECISIONS — read from the planning tree's OWN census, never derived here ──
 *
 * ⛔⛤ THE BOARD HAS NO MACHINE-READABLE MARKER FOR "OPEN OWNER DECISION". The
 * `/queue` tile used to print the size of the ⚠️ Attention band under the label
 * "need you". Measured 2026-09-03 on the live board: the band held 16 rows, of
 * which the project's own census counted 2 as open owner decisions — and the
 * census's total was 29. A count wrong in both directions at once, under the one
 * label the owner reads to decide whether anything is waiting on him.
 *
 * ⭐ THE CONVENTION ALREADY EXISTS AND IS USED, NOT REINVENTED: item DD1's rule
 * (OD-RULE v1) lives in `!PLANNING/tools/owner-decision-census.cjs` — a declared
 * set of ids, each with an evidence phrase, cross-checked against THIS repo's
 * parser on every run, reporting CLOSED-SINCE (a declared id no longer open) and
 * UNDECLARED (an owner-shaped heading not in the set) as drift. DD1's done-when:
 * "the count is a FRACTION with a stated rule, never a bare number." So this reads
 * that fraction, from that tool, and the tile prints it with the rule and the
 * date the declared set was last edited.
 *
 * ⛔ WHAT THIS CANNOT DO, said where the number is made: the declared set is
 * HAND-MAINTAINED in the archive. The count moves only when someone edits that
 * table. If a decision is ruled and the row stays, the tile keeps counting it;
 * if a new decision is filed and no row is added, the tile misses it unless the
 * heading is owner-shaped enough for the UNDECLARED scan to catch. Both drift
 * signals are surfaced on the tile rather than hidden, and the tool's last-edit
 * date is printed so the number expires visibly.
 *
 * Runs the tool as an EXTERNAL read-only program per request (the `/view` route's
 * pattern), from the planning tree, with this repo's path handed over so the
 * tool imports the same parser the board is built with. Never throws; every
 * failure is `{ observable: false, why }` — a tile that cannot measure says so.
 */
function ownerDecisionCensusPath() {
  const dir = planningDir();
  if (!dir) return null;
  const full = path.join(dir, 'tools', 'owner-decision-census.cjs');
  return safeIsFile(full) ? full : null;
}

const CENSUS_FRACTION_RE = /ON-BOARD open owner decisions\s*\.*\s*(\d+) of (\d+) ID-bearing items/;
const CENSUS_ROW_RE = /^(\S+)\s+(T1x?)\s+(\S+)\s+(.*)$/;

function runCensus(tool, args) {
  const { spawnSync } = require('child_process');
  const env = {};
  for (const k of Object.keys(process.env)) env[k] = process.env[k];
  env.ROBCO_APP_DIR = REPO_ROOT;
  const r = spawnSync(process.execPath, [tool, ...args], {
    cwd: path.dirname(tool),
    env,
    encoding: 'utf8',
    timeout: 20000,
    windowsHide: true,
  });
  if (r.error) return { ok: false, out: '', why: String(r.error.message || r.error) };
  if (r.status !== 0)
    return {
      ok: false,
      out: r.stdout || '',
      why: 'exit ' + r.status + ' ' + (r.stderr || '').trim(),
    };
  return { ok: true, out: r.stdout || '', why: null };
}

function readOwnerDecisionCensus() {
  const tool = ownerDecisionCensusPath();
  if (!tool) {
    return {
      observable: false,
      why: planningDir()
        ? 'the planning tree has no tools/owner-decision-census.cjs'
        : 'no planning tree on this machine',
    };
  }
  let editedAt;
  try {
    editedAt = fs.statSync(tool).mtime;
  } catch {
    editedAt = null;
  }
  const main = runCensus(tool, []);
  if (!main.ok) return { observable: false, why: 'census did not run: ' + main.why };
  if (/^owner-decision-census: SKIP/m.test(main.out)) {
    const m = main.out.match(/SKIP — (.*)$/m);
    return {
      observable: false,
      why: 'census skipped: ' + (m ? m[1].trim() : 'reason not printed'),
    };
  }
  const frac = main.out.match(CENSUS_FRACTION_RE);
  if (!frac) return { observable: false, why: 'census output carried no fraction line' };
  const closedSince = (main.out.match(/^\s+(\S+)\s+(NOT PARSED|status is done)/gm) || []).length;
  const undeclaredM = main.out.match(/UNDECLARED — (\d+) owner-shaped/);
  const undeclared = undeclaredM ? Number(undeclaredM[1]) : 0;
  const list = runCensus(tool, ['--list']);
  const rows = [];
  if (list.ok) {
    for (const line of list.out.split('\n')) {
      const m = line.match(CENSUS_ROW_RE);
      if (m) rows.push({ id: m[1], tier: m[2], status: m[3], evidence: m[4].trim() });
    }
  }
  return {
    observable: true,
    count: Number(frac[1]),
    total: Number(frac[2]),
    rows,
    rowsObservable: list.ok,
    closedSince,
    undeclared,
    editedAt,
    rule: 'OD-RULE v1',
    tool,
  };
}

/**
 * ── THE HORIZON AXIS'S GRAMMAR — imported from the archive, never re-implemented ──
 *
 * The `horizon` field lives inside an ```accept``` block in an item's BODY, and the
 * grammar for that block is `!PLANNING/tools/item-format-check.cjs` — the check that
 * REFUSES a malformed block on the archive's own pre-commit. Its `parseAccept` and its
 * `HORIZON` vocabulary are exported precisely so a consumer imports them.
 *
 * ⭐ THIS DIRECTION IS THE MIRROR OF ONE THAT ALREADY EXISTS: that check imports THIS
 * repo's `parseQueue` (via `ROBCO_APP_DIR`) rather than writing a second board parser.
 * Importing its block grammar back is the same discipline pointed the other way, and it
 * is the whole reason a `horizon:` typo cannot mean one thing to the gate and another to
 * this page.
 *
 * ⚠ REQUIRED, not spawned — unlike the census, which is an external PROGRAM whose
 * product is a report. This is a pure grammar with a `require.main` guard and no
 * load-time side effects, so requiring it is both cheaper and honest about what it is.
 * The require is wrapped: a tree present but carrying a broken or absent tool is
 * `observable:false` with the reason, never a silent fallback to a home-grown parser.
 *
 * ⛔ There is deliberately NO local fallback grammar. An absent tool must make the axis
 * UNOBSERVABLE, not "every item is UNSET" — those are different facts and only one of
 * them is about the board.
 */
function itemFormatToolPath() {
  const dir = planningDir();
  if (!dir) return null;
  const full = path.join(dir, 'tools', 'item-format-check.cjs');
  return safeIsFile(full) ? full : null;
}

function loadItemFormat() {
  const tool = itemFormatToolPath();
  if (!tool) {
    return {
      observable: false,
      why: planningDir()
        ? 'the planning tree has no tools/item-format-check.cjs'
        : 'no planning tree on this machine',
    };
  }
  try {
    const mod = require(tool);
    if (typeof mod.parseAccept !== 'function' || !Array.isArray(mod.HORIZON)) {
      return {
        observable: false,
        why: 'tools/item-format-check.cjs is missing parseAccept or HORIZON',
      };
    }
    return { observable: true, mod, tool, vocabulary: mod.HORIZON.slice() };
  } catch (e) {
    return { observable: false, why: 'tools/item-format-check.cjs threw on load: ' + e.message };
  }
}

/**
 * ── THE TWO AXES' VOCABULARIES — declared once, in the archive, and imported ──
 *
 * `!PLANNING/tools/axis-assign.cjs` is the tool that assigns `project` and `horizon`
 * across the board and exports both vocabularies:
 *
 *   PROJECTS  APP · CONTROL-PLANE · HARNESS · MIST · MUSEUM · BINDER · UNKNOWN
 *   HORIZONS  BLOCKS-WORK-NOW · NEXT · SOMEDAY-IF · UNKNOWN
 *
 * ⭐ THAT IS THE OWNER'S SIX-VALUE PROJECT AXIS, and it now exists — so the
 * four-value approximation this page used to render (CP-RULE v1's domain census)
 * is superseded rather than merely incomplete. ⛔ The two DISAGREE on 46 of 411
 * items (11.2%, measured 2026-09-05 with the census's CP counted as compatible
 * with EITHER CONTROL-PLANE or HARNESS — the most generous possible mapping). Two
 * answers to one question is the disease this project keeps naming, so `/queue`
 * renders exactly one of them: this one, which carries a per-row basis and quoted
 * evidence the census cannot.
 *
 * ⚠ `HORIZONS` here carries `UNKNOWN`, which the ACCEPT-BLOCK vocabulary
 * (`item-format-check.cjs`, gated by R10) does not — and that asymmetry is
 * deliberate rather than a drift. An author writing a block must pick one of the
 * three real values; an ASSIGNMENT pass reading 411 items must be able to say "the
 * text does not settle this" and have that survive as a value. Keep both, import
 * both, and never substitute one for the other.
 *
 * Required, not spawned — `require.main`-guarded with its exports at module scope,
 * exactly like the format module.
 */
function axisToolPath() {
  const dir = planningDir();
  if (!dir) return null;
  const full = path.join(dir, 'tools', 'axis-assign.cjs');
  return safeIsFile(full) ? full : null;
}

function loadAxisVocabulary() {
  const tool = axisToolPath();
  if (!tool) {
    return {
      observable: false,
      why: planningDir()
        ? 'the planning tree has no tools/axis-assign.cjs'
        : 'no planning tree on this machine',
    };
  }
  try {
    const mod = require(tool);
    if (!Array.isArray(mod.PROJECTS) || !Array.isArray(mod.HORIZONS)) {
      return { observable: false, why: 'tools/axis-assign.cjs is missing PROJECTS or HORIZONS' };
    }
    return {
      observable: true,
      PROJECTS: mod.PROJECTS.slice(),
      HORIZONS: mod.HORIZONS.slice(),
      tool,
    };
  } catch (e) {
    return { observable: false, why: 'tools/axis-assign.cjs threw on load: ' + e.message };
  }
}

/**
 * `BLOCKER-GRAPH.json` — the per-item `actor` classification behind DECIDE vs DO,
 * and (since 2026-09-05) the per-item `project` / `horizon` assignment with a
 * `projectBasis` / `horizonBasis` and quoted evidence on every row.
 *
 * ⚠ It is a MEASURED SNAPSHOT with its own timestamp, not a live view, so the caller
 * prints `measuredAt` beside anything derived from it. Never throws; a tree with no
 * graph, or an unparsable one, is `observable:false` with the reason — the /queue tiles
 * then say UNOBSERVABLE rather than showing a lane with nothing in it, which would read
 * as "nothing needs you".
 */
function readBlockerGraph() {
  const r = planningReadRef('BLOCKER-GRAPH.json');
  if (!r.ok) return { observable: false, why: r.why };
  try {
    const graph = JSON.parse(r.text);
    if (!graph || typeof graph.items !== 'object' || graph.items === null) {
      return { observable: false, why: 'BLOCKER-GRAPH.json carries no items map' };
    }
    return { observable: true, graph };
  } catch (e) {
    return { observable: false, why: 'BLOCKER-GRAPH.json could not be parsed (' + e.message + ')' };
  }
}

/**
 * ── THE PROJECT AXIS — read from the planning tree's OWN domain census ───────────
 *
 * ⛔⛤ THE FIELD THE OWNER ASKED FOR DOES NOT EXIST, AND THIS SAYS SO RATHER THAN
 * INVENTING IT. `QUEUE.md` has no `project:` field; the item format's key set is closed
 * and its R2 rule REFUSES an unknown key, so a `project:` line in an accept block is a
 * commit-time refusal in the archive until that key set gains it. What DOES exist, at
 * full coverage, is `!PLANNING/tools/cp-domain-census.cjs` — CP-RULE v1, which assigns a
 * DOMAIN per ID-family with per-item overrides, each carrying its reason.
 *
 * ⚠⚠ AND ITS VOCABULARY IS FOUR VALUES WHERE THE OWNER NAMED SIX. CP-RULE v1 knows
 * CP · MIST · MUSEUM · APP (+ UNASSIGNED). The requested axis is *the app · the control
 * plane · the harness · Mist · the museum · Binder*. So the HARNESS is folded inside CP,
 * and BINDER has no bucket at all — its items are scattered (PJ→CP, MI→MIST) by a rule
 * whose own text excludes Binder from CP. Rendering this under the label "project" would
 * therefore be a number wearing a different question's label, which is the exact defect
 * the `/queue` tiles have twice been rebuilt to remove. The caller prints it under
 * CP-RULE v1's own name and states the gap.
 *
 * ONE spawn, aggregate only. Per-item domains would need one `--list <DOMAIN>` spawn per
 * value (measured 2026-09-05: 0.94s for five, against 0.19s for one) because the tool
 * has no all-items mode and no exports — a full second added to a page read on a phone
 * over a tailnet, for a filter. The cheap fix is a `--json` mode in that tool; it is
 * named here rather than paid for here.
 */
const DOMAIN_LINE_RE = /^by domain\s*\.*\s*(.+)$/m;
const DOMAIN_PAIR_RE = /([A-Z][A-Z-]*)\s+(\d+)/g;
const DOMAIN_TOTAL_RE = /^ID-bearing items \(parser\)\s*\.*\s*(\d+)/m;

function domainCensusPath() {
  const dir = planningDir();
  if (!dir) return null;
  const full = path.join(dir, 'tools', 'cp-domain-census.cjs');
  return safeIsFile(full) ? full : null;
}

function readDomainCensus() {
  const tool = domainCensusPath();
  if (!tool) {
    return {
      observable: false,
      why: planningDir()
        ? 'the planning tree has no tools/cp-domain-census.cjs'
        : 'no planning tree on this machine',
    };
  }
  let editedAt = null;
  try {
    editedAt = fs.statSync(tool).mtime;
  } catch {
    // an unreadable mtime is not a failure — the tile prints 'unknown'
  }
  const r = runCensus(tool, []);
  if (!r.ok) return { observable: false, why: 'domain census did not run: ' + r.why };
  if (/^cp-domain-census: SKIP/m.test(r.out)) {
    const m = r.out.match(/SKIP — (.*)$/m);
    return {
      observable: false,
      why: 'domain census skipped: ' + (m ? m[1].trim() : 'reason not printed'),
    };
  }
  const line = DOMAIN_LINE_RE.exec(r.out);
  const totalM = DOMAIN_TOTAL_RE.exec(r.out);
  if (!line || !totalM) {
    return { observable: false, why: 'domain census output carried no "by domain" line' };
  }
  const counts = {};
  DOMAIN_PAIR_RE.lastIndex = 0;
  let m;
  while ((m = DOMAIN_PAIR_RE.exec(line[1])) !== null) counts[m[1]] = Number(m[2]);
  if (!Object.keys(counts).length) {
    return { observable: false, why: 'the "by domain" line parsed to no domains' };
  }
  const summed = Object.values(counts).reduce((a, b) => a + b, 0);
  return {
    observable: true,
    counts,
    total: Number(totalM[1]),
    summed,
    editedAt,
    rule: 'CP-RULE v1',
    tool,
  };
}

/** The reports-tree counterpart of describe() — printed next to any empty state. */
function describeReports() {
  const dir = reportsDir();
  if (!dir) {
    return process.env.ROBCO_REPORTS_DIR
      ? `reports tree NOT FOUND at ROBCO_REPORTS_DIR=${process.env.ROBCO_REPORTS_DIR}`
      : `reports tree NOT PRESENT (no ${DEFAULT_REPORTS_DIR} sibling) — expected in a public clone`;
  }
  return `reports tree at ${dir} — ${listReports().length} report(s)`;
}

/**
 * One line describing WHICH resolution case we are in — so a skip is never
 * mistaken for a pass. Callers print this next to any skip.
 */
function describe() {
  const dir = planningDir();
  if (!dir) {
    return process.env.ROBCO_PLANNING_DIR
      ? `planning tree NOT FOUND at ROBCO_PLANNING_DIR=${process.env.ROBCO_PLANNING_DIR}`
      : `planning tree NOT PRESENT (no ${DEFAULT_PLANNING_DIR} sibling) — expected in a public clone`;
  }
  const missing = PLANNING_FILES.filter(f => planningFile(f) === null);
  return missing.length
    ? `planning tree at ${dir} — MISSING: ${missing.join(', ')}`
    : `planning tree at ${dir} — all ${PLANNING_FILES.length} files present`;
}

module.exports = {
  PLANNING_FILES,
  DEFAULT_PLANNING_DIR,
  planningDir,
  planningFile,
  readPlanningFile,
  readPlanningFileAtRef,
  museumSiteDir,
  museumProvenance,
  planningSource,
  planningReadRef,
  planningProvenance,
  planningAvailable,
  planningWritePath,
  describe,
  // The private reports tree — resolved, never copied in. See the block above.
  DEFAULT_REPORTS_DIR,
  REPORT_NAME_RE,
  reportsDir,
  reportFile,
  listReports,
  readReport,
  readRoadmap,
  describeReports,
  // The planning tree's own owner-decision census (OD-RULE v1) — resolved and RUN, never derived here.
  ownerDecisionCensusPath,
  readOwnerDecisionCensus,
  // The two NEW board axes' sources — each resolved from the archive, none re-implemented here.
  itemFormatToolPath,
  loadItemFormat,
  axisToolPath,
  loadAxisVocabulary,
  readBlockerGraph,
  domainCensusPath,
  readDomainCensus,
};
