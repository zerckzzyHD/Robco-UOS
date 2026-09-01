#!/usr/bin/env node
/**
 * scripts/control-state.js — read-only resolver for the operational state
 * directory that sits OUTSIDE this repository.
 *
 * ── ⛔ READ-ONLY, AND STRUCTURALLY SO ───────────────────────────────────────
 * Nothing in this module opens a file for writing, truncates, renames or
 * deletes. The append-only logs it reads are hash-chained: a write from here
 * would not merely corrupt a file, it would break the chain that makes every
 * earlier record verifiable. There is no "safe" write from a viewer, so the
 * capability is simply absent rather than guarded.
 *
 * ── ⛔⛔ THE SIZE PROBLEM IS THE DESIGN CONSTRAINT, NOT A DETAIL ─────────────
 * Measured before writing a line of this: the log set is very large, and single
 * files run to tens of megabytes. `readFileSync` on the newest one would allocate
 * that much per request on a personal machine that is also serving the app — one
 * refresh could take the whole server down. So the only read offered
 * is a BOUNDED TAIL: seek to (size - N), read N bytes, discard the leading
 * partial line. Cost is constant no matter how large the file becomes.
 *
 * ⚠ There is deliberately no "read the whole thing" escape hatch. A helper that
 * exists is a helper that gets called.
 *
 * ── ⛔⛔ THE LOCATION IS CONFIGURED, NEVER WRITTEN DOWN HERE ────────────────
 * This module takes its directory from `ROBCO_CONTROL_STATE` and has no fallback
 * path at all. That is deliberate and it is not a convenience: THIS REPOSITORY
 * IS PUBLIC, and the name and layout of a private sibling directory is exactly
 * the kind of structural detail that should not be discoverable from it. A
 * hardcoded default would publish that layout permanently — a commit cannot be
 * recalled — in exchange for saving one environment variable.
 *
 * ⚠ THE COST IS REAL AND IS ACCEPTED, NOT HIDDEN: with the variable unset there
 * is nothing to read, and every page built on this says so plainly instead of
 * rendering an empty success. An operator sets it once; a stranger reading this
 * repository learns nothing about where anything lives.
 *
 * ⛔ NULL IS A NORMAL OUTCOME, not a failure — an unconfigured checkout has no
 * operational state and never will, and every consumer degrades to saying so.
 */
'use strict';

const fs = require('fs');
const path = require('path');

/** Bytes read for a tail. Enough for a useful window, small enough to be free. */
const TAIL_BYTES = 64 * 1024;

function safeIsDir(p) {
  try {
    return fs.statSync(p).isDirectory();
  } catch {
    return false;
  }
}

/**
 * Absolute path to the state directory, or null. Never throws.
 * ⛔ Configured only — there is no fallback location, by design (see the header).
 */
function stateDir() {
  const configured = process.env.ROBCO_CONTROL_STATE;
  if (!configured) return null;
  return safeIsDir(configured) ? path.resolve(configured) : null;
}

/** One line describing WHICH resolution case we are in — printed next to any empty state. */
function describeState() {
  const dir = stateDir();
  if (dir) return `state directory at ${dir}`;
  // ⛔ Neither branch names a path. "Where it should be" is the private detail.
  return process.env.ROBCO_CONTROL_STATE
    ? 'state directory is configured but does not exist'
    : 'no state directory is configured — nothing to read, which is the normal state for a checkout without one';
}

/**
 * ⛔ A requested log name is VALIDATED, never trusted. This joins onto a real
 * directory outside the repo, so an unchecked name is a read-anything primitive
 * reachable over the network. Two independent barriers: a strict basename
 * pattern (no separators, no `..`, no drive letter, no leading dot), AND a
 * containment check after resolution — the pattern can be out-thought by an
 * encoding, the containment check holds regardless of spelling.
 */
const LOG_NAME_RE = /^[A-Za-z0-9][A-Za-z0-9._-]*\.jsonl$/;
function logFile(name) {
  const dir = stateDir();
  if (!dir) return null;
  if (typeof name !== 'string' || !LOG_NAME_RE.test(name)) return null;
  const full = path.resolve(dir, name);
  if (path.dirname(full) !== dir) return null;
  try {
    return fs.statSync(full).isFile() ? full : null;
  } catch {
    return null;
  }
}

/**
 * The generated status snapshot.
 *
 * ⚠ RETURNS THE FILE'S OWN `generatedAt` ALONGSIDE THE READ TIME, and the caller
 * must show the difference. This file is produced on a schedule; reading it at
 * request time makes the READ fresh, not the DATA. Presenting it as "now" is the
 * single most misleading thing this whole surface could do.
 */
function readStatus() {
  const dir = stateDir();
  if (!dir) return null;
  const full = path.join(dir, 'status.json');
  try {
    const raw = fs.readFileSync(full, 'utf8');
    return { data: JSON.parse(raw), mtime: fs.statSync(full).mtime, bytes: raw.length };
  } catch {
    // Unreadable or unparsable is NOT the same as absent, and the caller is told
    // which by asking describeState() — but either way there is nothing to show.
    return null;
  }
}

/**
 * ⭐⭐ THE MOST RECENT WRITE ANYWHERE IN THE STATE DIRECTORY — A TIME, AND ONLY A
 * TIME.
 *
 * ── ⛔⛔ WHAT THIS IS FOR, AND WHY A SNAPSHOT'S AGE ALONE WAS NOT ENOUGH ─────
 * `readStatus()` already tells a caller how old the snapshot is. On 2026-09-01
 * that number was four days, and it left the only question that matters
 * unanswered: is this machine switched off, or is the thing that writes this one
 * file dead while everything around it keeps running? Those are different
 * problems with different responses, and an age cannot separate them.
 *
 * ⭐ THIS SEPARATES THEM BY MEASUREMENT RATHER THAN BY GUESS. A snapshot four days
 * old sitting in a directory written to two minutes ago is not a quiet system —
 * it is a live one with a stopped producer, and that is a fact rather than an
 * inference. The same reading, in a directory nothing has touched for four days,
 * says the opposite and says it just as plainly.
 *
 * ── ⛔ IT RETURNS NO NAME, AND THAT IS STRUCTURAL ───────────────────────────
 * There is no path through this function that can emit a filename. Several
 * entries in this directory are named after what they hold, and this repository is
 * PUBLIC — `listLogs()` may name the hash-chained logs because a caller has to
 * address one, and nothing here has to address anything. A Date carries no
 * structure, so this cannot leak one however it is rendered.
 *
 * ⚠ TOP LEVEL ONLY, DELIBERATELY. A directory's own mtime moves when an entry is
 * added to or removed from it, so activity inside a subdirectory is already
 * visible without walking into it — and a recursive walk over an operational tree
 * is an unbounded cost on a machine that is also serving the app, which is the
 * one thing this module refuses everywhere else.
 *
 * ⛔ NULL IS A NORMAL OUTCOME (no directory configured, or unreadable), and every
 * caller must render it as "not established" rather than as "nothing has happened".
 */
function newestWrite() {
  const dir = stateDir();
  if (!dir) return null;
  try {
    let newest = null;
    for (const name of fs.readdirSync(dir)) {
      let st;
      try {
        st = fs.statSync(path.join(dir, name));
      } catch {
        continue; // vanished between readdir and stat — a live directory does that
      }
      if (newest === null || st.mtime > newest) newest = st.mtime;
    }
    return newest;
  } catch {
    return null;
  }
}

/** Log files, newest first by modified time. Sizes only — nothing is opened. */
function listLogs() {
  const dir = stateDir();
  if (!dir) return [];
  try {
    return fs
      .readdirSync(dir)
      .filter(n => LOG_NAME_RE.test(n))
      .map(n => {
        const s = fs.statSync(path.join(dir, n));
        return { name: n, size: s.size, mtime: s.mtime };
      })
      .sort((a, b) => b.mtime - a.mtime);
  } catch {
    return [];
  }
}

/**
 * The last complete lines of one log, read by OFFSET.
 *
 * Returns `{ name, size, fromOffset, lines, truncated }`, or null when the file
 * cannot be resolved. `truncated` says the window started mid-file, which the
 * caller must surface — a tail presented as a whole file is a lie about scope.
 *
 * ⚠ The first line of the window is DISCARDED whenever the window did not start
 * at byte 0, because a seek lands mid-record and half a JSON object parses as
 * nothing. Dropping it is why what remains can be trusted.
 */
function tailLog(name, maxBytes = TAIL_BYTES) {
  const full = logFile(name);
  if (!full) return null;
  let fd = null;
  try {
    const size = fs.statSync(full).size;
    const want = Math.min(Math.max(1, maxBytes | 0), size);
    const fromOffset = size - want;
    const buf = Buffer.allocUnsafe(want);
    fd = fs.openSync(full, 'r'); // ⛔ 'r' — read-only, never 'a' or 'w'
    fs.readSync(fd, buf, 0, want, fromOffset);
    let text = buf.toString('utf8');
    if (fromOffset > 0) {
      const nl = text.indexOf('\n');
      text = nl === -1 ? '' : text.slice(nl + 1);
    }
    const lines = text.split('\n').filter(l => l.trim().length > 0);
    return { name, size, fromOffset, lines, truncated: fromOffset > 0 };
  } catch {
    return null;
  } finally {
    if (fd !== null) {
      try {
        fs.closeSync(fd);
      } catch {
        /* nothing useful to do, and it must not mask the read's result */
      }
    }
  }
}

module.exports = {
  LOG_NAME_RE,
  TAIL_BYTES,
  stateDir,
  describeState,
  logFile,
  readStatus,
  newestWrite,
  listLogs,
  tailLog,
};
