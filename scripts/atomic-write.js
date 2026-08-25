'use strict';
/**
 * scripts/atomic-write.js — the ONE way a tool in THIS repo replaces a durable file.
 *
 * ── WHY THIS FILE EXISTS (the WF12 class) ───────────────────────────────────
 * `fs.writeFileSync(p, text)` DESTROYS THE DESTINATION BEFORE THE REPLACEMENT
 * BYTES EXIST. The open-for-write truncates at the moment it is called, so the
 * exposure window is not a narrow tail around the write — it is every instruction
 * between the truncation and a completed write. Any exception, crash, kill, or
 * full disk in that window is a total loss of the previous content, and there is
 * nothing to roll back to because the destruction already happened.
 *
 * This is not theoretical here. In the sibling private archive, `!PLANNING/QUEUE.md`
 * — the canonical roadmap — was truncated to ZERO BYTES on 2026-08-23 by exactly
 * this shape (an ad-hoc script's `open(p,'w')` followed by a write that raised).
 * Recovery was a `git checkout` and worked only because a push had landed twelve
 * minutes earlier. That incident is filed there as WF12.
 *
 * ── ⛔ THIS IS A DELIBERATE SECOND COPY, NOT AN IMPORT. READ THIS BEFORE EDITING.
 * The archive already has this helper at `_RobCo-Archive/!PLANNING/tools/atomic-write.cjs`,
 * and the control plane has a third at `_RobCo-Control/code/lib/atomic-write.js` (WF13).
 * This file does NOT import either, and must not be changed to.
 *
 *   WHY: importing across repos creates a CROSS-REPO RUNTIME DEPENDENCY — this
 *   PUBLIC repo's generators would silently depend on a PRIVATE checkout being
 *   present at a sibling path. Every other private-tree dependency here is
 *   deliberately OPTIONAL and degrades to a skip (see scripts/planning-paths.js,
 *   F04): a public clone has no archive BY DESIGN. A hard require of a sibling
 *   private path would be the first thing in this repo that simply breaks without
 *   it, and it would invert the private→public direction the whole boundary is
 *   built on.
 *
 *   THE COST, STATED PLAINLY RATHER THAN GLOSSED: there are now THREE copies of
 *   this logic across three repos, and they can drift. That has already happened
 *   once — the archive's copy carried the WF15 short-write bug for a day after the
 *   control plane's copy had been fixed. If a defect is found in ANY of the three,
 *   the other two must be checked. This file is written to the post-WF15 contract:
 *   same guarantees as both twins, same primary function name (`writeFileAtomic`),
 *   same short-write refusal.
 *
 *   ONE DELIBERATE SURFACE DIFFERENCE: the twins also export `updateFileAtomic`
 *   (read → transform → write). NOT copied, because no call site in this repo needs
 *   it — every generator here computes its complete output body before it writes
 *   anything, so the transform is already outside the window. Shipping an unused
 *   second entry point would be accretion for its own sake (Protocol 36b). The
 *   twins therefore differ from this file in SURFACE, and in NO guarantee of the
 *   function they share.
 *
 * ── ⚠ A SHORT WRITE IS A REAL FAILURE MODE, NOT A THEORETICAL ONE (WF15) ────
 * This implementation does NOT assume a write either fully succeeds or fully fails,
 * because that assumption is false. `fs.writeSync` may write FEWER bytes than asked
 * and throw nothing — it simply returns a smaller count. The archive's helper
 * originally called it once and discarded the return value; the result was that a
 * TRUNCATED temp file got fsync'ed, closed, and renamed over a perfectly good target
 * with every syscall reporting success. The rename — the entire mechanism this file
 * exists for — worked correctly and installed a partial file.
 *
 * So the write below is a LOOP that resumes at the byte already written, and refuses
 * BY NAME when a write makes no progress. That is why it is not a single call.
 *
 * ── SAME DIRECTORY IS NOT A DETAIL ──────────────────────────────────────────
 * A rename WITHIN one directory is a directory-entry swap the filesystem performs
 * atomically. A rename ACROSS volumes is a copy followed by a delete — which
 * re-opens exactly the window this file exists to close. The temp file is therefore
 * always a sibling of the target, never in %TEMP%.
 *
 * ── WINDOWS RENAME SEMANTICS ────────────────────────────────────────────────
 * `fs.renameSync` over an EXISTING destination does replace it on win32 (libuv
 * issues MoveFileEx with MOVEFILE_REPLACE_EXISTING) — it does not throw EEXIST the
 * way a naive MoveFile would. It CAN still fail transiently with EPERM/EACCES/EBUSY
 * when an antivirus scanner, the search indexer, or a backup agent holds a momentary
 * handle. That is a different failure from "rename cannot replace", it is real on
 * this platform, and it is why the rename is retried. ⛔ The retry is NOT a fallback
 * to a truncating write — there is no such fallback anywhere in this file. If the
 * rename cannot be made to happen, the call THROWS and the target keeps its old
 * bytes, which is the correct outcome and the whole point.
 *
 * ── NOT COVERED, SO NOBODY INFERS MORE THAN IS TRUE ─────────────────────────
 * This guarantees atomicity against PROCESS death (exception, crash, SIGKILL). It
 * does NOT guarantee durability against OS crash or power loss — that would also
 * require fsync of the containing DIRECTORY, which Windows does not expose through
 * Node. The file fsync below is best-effort and its failure is deliberately
 * swallowed: a failed flush degrades power-loss durability, it does not reopen the
 * truncation window.
 *
 * Guarded by Suite 259 (tests/robco-diagnostics.js), which RUNS this helper rather
 * than reading it — including a red-then-green demonstration that the truncating
 * form loses the target's bytes where this one does not.
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// Rename retry budget. Tuned for transient third-party file locks (AV / indexer),
// which clear in tens of milliseconds. Deliberately small: a lock that outlives this
// is a real problem the caller must see, not one to spin on.
const RENAME_ATTEMPTS = 10;
const RENAME_BACKOFF_MS = 20;
const TRANSIENT = new Set(['EPERM', 'EACCES', 'EBUSY', 'ENOTEMPTY']);

function sleepSync(ms) {
  // Synchronous sleep with no dependency and no child process: Atomics.wait on a
  // throwaway buffer. (A child process would be the wrong tool twice over — heavier
  // than the lock it waits on, and process creation is itself a thing that fails on
  // a loaded machine.)
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
}

/**
 * Replace `target`'s contents with `data`, atomically.
 *
 * The caller must hand over the COMPLETE body. A variant that accepted a callback or
 * a stream would put caller code back inside the window — the body being fully formed
 * before anything is opened is the invariant that makes this safe.
 *
 * @param {string} target  absolute or cwd-relative path to the file to replace
 * @param {string|Buffer|Uint8Array} data  the COMPLETE new contents
 * @param {object} [opts]
 * @param {string} [opts.encoding='utf8']  encoding used when `data` is a string
 * @param {number} [opts.mode]  mode for the created file (chmod is a no-op on Windows)
 * @returns {string} the absolute path written
 */
function writeFileAtomic(target, data, opts) {
  const options = opts || {};
  const encoding = options.encoding === undefined ? 'utf8' : options.encoding;
  const abs = path.resolve(target);
  const dir = path.dirname(abs);

  if (data === undefined || data === null) {
    throw new TypeError('writeFileAtomic: refusing to write ' + String(data) + ' to ' + abs);
  }
  const buf =
    Buffer.isBuffer(data) || data instanceof Uint8Array
      ? Buffer.from(data)
      : Buffer.from(String(data), encoding);

  fs.mkdirSync(dir, { recursive: true });

  // Sibling temp file. The pid + random suffix keeps two concurrent writers (and two
  // concurrent test runs) from colliding on the same scratch name. The leading dot and
  // the .tmp suffix make a stray one obvious if a process is killed between create and
  // rename — that stray is the ONLY residue this design can leave, and it is inert.
  const tmp = path.join(
    dir,
    '.' +
      path.basename(abs) +
      '.' +
      process.pid +
      '.' +
      crypto.randomBytes(6).toString('hex') +
      '.tmp'
  );

  let fd;
  try {
    // 'wx' — fail rather than clobber if that scratch name somehow already exists.
    fd = fs.openSync(tmp, 'wx', options.mode === undefined ? 0o666 : options.mode);

    // ⚠ A SHORT WRITE IS NOT AN ERROR — it returns a smaller count and throws nothing.
    // This loop is the whole of WF15: resume at the byte already written, and refuse by
    // name when a write makes NO progress. See the header.
    let off = 0;
    while (off < buf.length) {
      const n = fs.writeSync(fd, buf, off, buf.length - off, off);
      if (!(n > 0)) {
        throw new Error(
          'short-write: no progress at byte ' + off + ' of ' + buf.length + ' writing ' + abs
        );
      }
      off += n;
    }

    try {
      fs.fsyncSync(fd); // best-effort durability; see header
    } catch {
      /* flush failure does not reopen the truncation window — see header */
    }
    fs.closeSync(fd);
    fd = undefined;

    let lastErr;
    for (let i = 0; i < RENAME_ATTEMPTS; i++) {
      try {
        fs.renameSync(tmp, abs); // replaces an existing target on win32 — see header
        return abs;
      } catch (e) {
        lastErr = e;
        if (!TRANSIENT.has(e.code)) throw e;
        sleepSync(RENAME_BACKOFF_MS * (i + 1));
      }
    }
    throw lastErr;
  } catch (e) {
    // The target was never opened, so it still holds its previous bytes. Clean up the
    // scratch file and let the caller see the real error.
    if (fd !== undefined) {
      try {
        fs.closeSync(fd);
      } catch {
        /* already closed or invalid */
      }
    }
    try {
      fs.rmSync(tmp, { force: true });
    } catch {
      /* best effort */
    }
    throw e;
  }
}

module.exports = { writeFileAtomic };
