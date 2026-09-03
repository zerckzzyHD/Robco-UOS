#!/usr/bin/env node
/**
 * scripts/worktree-teardown-guard.js — the Codex CLEANUP hook. Refuses to let a
 * worktree be discarded while it holds uncommitted work.
 *
 * ── THE ONE LINE THAT GOES IN CODEX'S CLEANUP-SCRIPT BOX ────────────────────
 *     node "C:/Dev/!RobCo/!RobCo-UOS/scripts/worktree-teardown-guard.js"
 * Codex runs it with the worktree being removed as cwd. Pass a path as the first
 * argument to run it against any other tree.
 *
 * ── WHY ─────────────────────────────────────────────────────────────────────
 * `C:\Dev\_wt-af14` was found holding 8 modified and 8 untracked files, including
 * a fully drafted commit message — real work, invisible, in a worktree nobody
 * was watching, in a repository with twelve registered worktrees. Automated
 * cleanup deletes on archive or when the worktree limit is exceeded. This is
 * the last thing that runs before that.
 *
 * ── EXIT CODES — FAIL-CLOSED ────────────────────────────────────────────────
 *   0  CLEAN      nothing uncommitted, nothing unreachable: safe to tear down
 *   1  REFUSED    uncommitted work (tracked and/or untracked) or a detached HEAD
 *                 whose commits no branch or remote reaches — every file NAMED
 *   2  REFUSED    UNOBSERVABLE — not a git tree, git unavailable, a status that
 *                 would not read, or a FRESH index.lock (a writer may be mid-
 *                 operation). An unreadable tree is not a clean tree.
 * Only exit 0 permits. Nothing here deletes, resets, stashes, cleans, checks
 * out or removes anything; every git call is `--no-optional-locks` (see
 * worktree-state.js). Suite 266 asserts the absence of mutating verbs and
 * proves red-before-green on a throwaway repo.
 *
 * ── ⚠ ADVISORY UNTIL THE HOST IS SHOWN TO HONOUR THE EXIT CODE ──────────────
 * Codex's documentation (learn.chatgpt.com/docs/environments/local-environment,
 * read 2026-09-03) does not say what a non-zero cleanup-script exit does, and
 * openai/codex issue #19480 (open) reports the cleanup script NOT RUNNING at all
 * on archive. It has NOT been verified on this machine whether a non-zero exit
 * prevents deletion or is merely logged. Until a measured refusal is on record,
 * read this file as ADVISORY: a note the host may ignore, not a gate.
 *
 * How to measure it (owner, one time — this script cannot do it from inside):
 *   1. Paste the one-liner into the cleanup-script box for a scratch project.
 *   2. Start a thread so Codex cuts a worktree; add an untracked file in it.
 *   3. Archive the thread.
 *   4. Look for the receipt this guard writes (see below) and for the worktree:
 *        receipt says REFUSED and the worktree still exists → the exit code is
 *        HONOURED — edit this header to say so, with the date.
 *        receipt says REFUSED and the worktree is gone → ADVISORY, confirmed —
 *        the rescue copy is then the only thing standing between the work and
 *        the bin, and it should be said so in the same edit.
 *        no receipt at all → the hook did not run (issue #19480's shape).
 *
 * ── THE SEATBELT: RESCUE COPY + RECEIPT, OUTSIDE EVERY REPO ─────────────────
 * Because the refusal may be ignored, on REFUSED this guard also copies the work
 * out BEFORE returning: `git diff HEAD` (staged + unstaged) as a patch, every
 * untracked file byte-for-byte, and a RECEIPT naming what was found, under
 *     ~/.robco/worktree-rescue/<repo>-<timestamp>/        (override: ROBCO_WORKTREE_RESCUE_DIR)
 * It is the same rescue the owner performed by hand for `_wt-af14`, done first
 * instead of after. The rescue is bounded (files over 50 MB are listed, not
 * copied), best-effort, and never changes the verdict: a rescue that fails is
 * reported inside the refusal, and the refusal stands. On CLEAN nothing is
 * written anywhere. This is the ONLY write these hooks perform, and it is never
 * inside a repository.
 */

'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');
const ws = require('./worktree-state.js');
// The rescue is DURABLE by definition — it may be the only surviving copy of the
// work — so every file it writes goes temp-in-the-same-directory + rename
// (Suite 259.11 classifies this file DURABLE; a half-written patch is no rescue).
const { writeFileAtomic } = require('./atomic-write.js');

const RESCUE_FILE_CAP = 50 * 1024 * 1024;

/** Copy one file atomically: copy to a sibling temp name, then rename over the target. */
function copyFileAtomic(src, dst) {
  fs.mkdirSync(path.dirname(dst), { recursive: true });
  const tmp = dst + '.tmp-' + process.pid + '-' + Date.now();
  fs.copyFileSync(src, tmp);
  fs.renameSync(tmp, dst);
}

function rescueDir(toplevel) {
  const base =
    process.env.ROBCO_WORKTREE_RESCUE_DIR || path.join(os.homedir(), '.robco', 'worktree-rescue');
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  return path.join(base, path.basename(toplevel) + '-' + stamp);
}

/** Copy the endangered work out. Returns lines describing what happened; never throws. */
function rescue(toplevel, dirty, receiptLines) {
  const out = [];
  let dir;
  try {
    dir = rescueDir(toplevel);
    fs.mkdirSync(dir, { recursive: true });
  } catch (e) {
    return ['  rescue      FAILED to create rescue dir: ' + (e && e.message)];
  }
  // tracked changes → one patch (staged + unstaged against HEAD)
  if (dirty.tracked.length) {
    const p = ws.runGit(['diff', 'HEAD', '--binary'], toplevel);
    try {
      if (p.ok) {
        writeFileAtomic(path.join(dir, 'tracked-changes.patch'), p.out + '\n');
        out.push(
          '  rescue      tracked changes → ' +
            path.join(dir, 'tracked-changes.patch') +
            ' (' +
            p.out.length +
            ' bytes)'
        );
      } else
        out.push(
          '  rescue      FAILED to capture tracked changes: ' + (p.err || 'git diff failed')
        );
    } catch (e) {
      out.push('  rescue      FAILED to write patch: ' + (e && e.message));
    }
  }
  // untracked files → copied under untracked/<relative path>
  let copied = 0;
  let skipped = 0;
  for (const rel of dirty.untracked) {
    const src = path.join(toplevel, rel);
    const dst = path.join(dir, 'untracked', rel);
    try {
      const st = fs.statSync(src);
      if (!st.isFile()) continue;
      if (st.size > RESCUE_FILE_CAP) {
        skipped++;
        out.push('  rescue      SKIPPED (over ' + RESCUE_FILE_CAP / 1048576 + ' MB): ' + rel);
        continue;
      }
      copyFileAtomic(src, dst);
      copied++;
    } catch (e) {
      out.push('  rescue      FAILED to copy ' + rel + ': ' + (e && e.message));
    }
  }
  if (dirty.untracked.length)
    out.push(
      '  rescue      untracked files copied: ' +
        copied +
        (skipped ? ' (skipped ' + skipped + ')' : '') +
        ' → ' +
        path.join(dir, 'untracked')
    );
  try {
    writeFileAtomic(path.join(dir, 'RECEIPT.txt'), receiptLines.join('\n') + '\n');
    out.push('  receipt     ' + path.join(dir, 'RECEIPT.txt'));
  } catch (e) {
    out.push('  receipt     FAILED to write: ' + (e && e.message));
  }
  return out;
}

function main() {
  const cwd = path.resolve(process.argv[2] || process.cwd());
  const lines = [];
  const say = s => lines.push(s);
  say('WORKTREE TEARDOWN GUARD  ' + cwd + '  ' + new Date().toISOString());

  const repo = ws.resolveRepo(cwd);
  if (!repo.observable) {
    say('  repo        UNOBSERVABLE: ' + repo.reason);
    say(
      'REFUSED (exit 2) — cannot determine the state of this tree, so it is not known to be clean.'
    );
    return { code: 2, lines };
  }
  const t = repo.toplevel;
  say(
    '  toplevel    ' +
      t +
      (repo.isLinkedWorktree
        ? '  (linked worktree)'
        : '  (MAIN checkout — cleanup hooks should not be pointed here)')
  );
  say(
    '  HEAD        ' +
      (repo.head || 'UNOBSERVABLE: ' + repo.headReason) +
      (repo.branch ? '  on ' + repo.branch : '  DETACHED')
  );

  // A fresh lock means a writer may be mid-operation: the picture is not trustworthy.
  const locks = ws.lockEvidence(repo).locks;
  for (const l of locks) {
    say(
      '  locks       index.lock PRESENT  ' +
        l.path +
        '  (' +
        l.size +
        ' bytes, age ' +
        ws.fmtAge(l.ageMs) +
        ')' +
        (l.fresh ? '  — FRESH' : '  — stranded (old); not created by this guard')
    );
  }
  if (locks.some(l => l.fresh)) {
    say(
      'REFUSED (exit 2) — a fresh index.lock means git may be mid-write here; the state cannot be trusted. Re-run in a minute.'
    );
    return { code: 2, lines };
  }

  const dirty = ws.dirtyState(t);
  if (!dirty.observable) {
    say('  dirty       UNOBSERVABLE: ' + dirty.reason);
    say(
      'REFUSED (exit 2) — the working tree would not read; an unreadable tree is not a clean tree.'
    );
    return { code: 2, lines };
  }
  say(
    '  dirty       tracked-modified ' +
      dirty.tracked.length +
      ' · untracked ' +
      dirty.untracked.length
  );

  const orphan = ws.orphanRisk(t, repo);
  if (!orphan.observable) say('  commits     UNOBSERVABLE: ' + orphan.reason);
  else if (orphan.detached && orphan.unreachable > 0)
    say(
      '  commits     DETACHED HEAD with ' +
        orphan.unreachable +
        ' commit(s) reachable from NO branch, remote or tag — deleting this worktree loses them'
    );
  else if (orphan.detached)
    say('  commits     detached, but HEAD is held by ' + orphan.holders.join(', '));
  else say('  commits     on branch ' + repo.branch + ' — the branch survives worktree removal');

  const up = ws.upstreamParity(t);
  if (up.observable && up.hasUpstream && up.ahead > 0)
    say(
      '  unpushed    ' +
        up.ahead +
        ' commit(s) ahead of ' +
        up.upstream +
        ' — kept by the branch, not by this worktree; push when ready'
    );

  const reasons = [];
  if (dirty.tracked.length)
    reasons.push(dirty.tracked.length + ' tracked file(s) with uncommitted changes');
  if (dirty.untracked.length) reasons.push(dirty.untracked.length + ' untracked file(s)');
  if (!orphan.observable)
    reasons.push('could not determine whether HEAD is reachable from any branch');
  else if (orphan.detached && orphan.unreachable > 0)
    reasons.push(orphan.unreachable + ' commit(s) reachable only from this detached HEAD');

  if (!reasons.length) {
    say('CLEAN (exit 0) — nothing uncommitted and nothing unreachable; safe to tear down.');
    return { code: 0, lines };
  }

  say('REFUSED (exit 1) — tearing this worktree down would discard: ' + reasons.join('; ') + '.');
  for (const f of dirty.tracked) say('    ' + f);
  for (const f of dirty.untracked) say('    ?? ' + f);
  say(
    '  To proceed: commit, or move the work out, then re-run. This guard never deletes, resets, stashes or cleans.'
  );
  const receipt = lines.slice();
  const r = rescue(t, dirty, receipt);
  for (const l of r) say(l);
  say(
    '  ⚠ Whether Codex honours this exit code is UNVERIFIED (see header). The rescue copy above is the seatbelt if it does not.'
  );
  return { code: 1, lines };
}

let result;
try {
  result = main();
} catch (e) {
  result = {
    code: 2,
    lines: [
      'WORKTREE TEARDOWN GUARD  ' + process.cwd(),
      '  crashed: ' + (e && e.stack ? e.stack.split('\n')[0] : e),
      'REFUSED (exit 2) — the guard itself failed; fail closed.',
    ],
  };
}
process.stdout.write(result.lines.join('\n') + '\n');
process.exitCode = result.code;
