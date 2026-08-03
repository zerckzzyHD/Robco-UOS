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
  describe,
};
