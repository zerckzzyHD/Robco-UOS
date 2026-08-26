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
function readPlanningFile(name) {
  const full = planningFile(name);
  if (!full) return null;
  try {
    return fs.readFileSync(full, 'utf8');
  } catch {
    return null;
  }
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

/** The available report basenames, newest-looking first. Never throws. */
function listReports() {
  const dir = reportsDir();
  if (!dir) return [];
  try {
    return fs
      .readdirSync(dir)
      .filter(n => REPORT_NAME_RE.test(n) && safeIsFile(path.join(dir, n)))
      .sort()
      .reverse();
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
  const dir = planningDir();
  if (!dir) return null;
  const full = path.join(dir, 'ROADMAP.md');
  if (!safeIsFile(full)) return null;
  try {
    return { text: fs.readFileSync(full, 'utf8'), mtime: fs.statSync(full).mtime };
  } catch {
    return null;
  }
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
};
