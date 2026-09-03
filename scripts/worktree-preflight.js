#!/usr/bin/env node
/**
 * scripts/worktree-preflight.js — the Codex SETUP hook. Prints the state of the
 * repository a fresh worktree was just cut from, so a worker starts with the
 * facts instead of re-taking them by hand (Codex halted eight times in one day
 * on "the tree is moving" — this makes that a printed fact, not a step).
 *
 * ── THE ONE LINE THAT GOES IN CODEX'S SETUP-SCRIPT BOX ──────────────────────
 *     node "C:/Dev/!RobCo/!RobCo-UOS/scripts/worktree-preflight.js"
 * The logic lives here, versioned and gate-tested; the vendor box holds a pointer.
 * Codex runs the setup script with the NEW WORKTREE as cwd and no special env,
 * so this reads `process.cwd()`. Pass a path as the first argument to run it
 * against any other tree.
 *
 * ── ⛔ IT REPORTS. IT NEVER REFUSES. exit 0 ALWAYS. ────────────────────────
 * A setup hook that fails blocks worktree creation — a new way to be stuck, in a
 * workflow that already halts too readily. So: every internal failure prints as
 * UNOBSERVABLE and the process still exits 0. Suite 266 asserts no non-zero
 * exit exists in this file and that a non-repo directory still exits 0.
 *
 * ── ⛔ READ-ONLY, INCLUDING OF GIT'S OWN FILES ──────────────────────────────
 * Every git call goes through worktree-state.js's runGit(), which prepends
 * `--no-optional-locks`. A plain `git status` takes `index.lock` to refresh the
 * index and can strand a 0-byte lock that looks exactly like a crashed writer —
 * the very condition this hook reports on. Suite 266 proves the hook leaves no
 * lock and does not touch the index mtime.
 *
 * ── WHAT "ANOTHER WRITER" MEANS HERE ────────────────────────────────────────
 * See worktree-state.js: Claude session records (pid present — not identity-
 * verified), Codex rollouts (recent mtime), index.lock evidence, newest write in
 * the tree, and the MAIN checkout's own dirtiness. Sources that cannot be read say
 * so; an empty list is never printed over a failed read.
 */

'use strict';

const path = require('path');
const ws = require('./worktree-state.js');

function main() {
  const cwd = path.resolve(process.argv[2] || process.cwd());
  const lines = [];
  const say = s => lines.push(s);
  const moving = [];

  say('WORKTREE PREFLIGHT  ' + cwd);
  const m = ws.measure(cwd);
  if (!m.repo.observable) {
    say('  repo        UNOBSERVABLE: ' + m.repo.reason);
    say(
      'VERDICT       UNOBSERVABLE — could not read a repository here. This hook never refuses (exit 0).'
    );
    return lines;
  }
  const r = m.repo;
  say(
    '  toplevel    ' +
      r.toplevel +
      (r.isLinkedWorktree ? '  (linked worktree of ' + m.mainRoot + ')' : '  (main checkout)')
  );
  say(
    '  HEAD        ' +
      (r.head || 'UNOBSERVABLE: ' + r.headReason) +
      (r.branch ? '  on ' + r.branch : '  DETACHED')
  );

  // origin parity — against the last fetch; this hook does not fetch.
  const u = m.upstream;
  if (!u.observable) say('  origin      UNOBSERVABLE: ' + u.reason);
  else if (!u.hasUpstream) say('  origin      no upstream configured for HEAD');
  else if (u.equal)
    say(
      '  origin      local == ' +
        u.upstream +
        '  (ahead 0, behind 0, as of the last fetch — this hook does not fetch)'
    );
  else
    say(
      '  origin      local != ' +
        u.upstream +
        '  (ahead ' +
        u.ahead +
        ', behind ' +
        u.behind +
        ', as of the last fetch — this hook does not fetch)'
    );

  // dirtiness of THIS tree, tracked and untracked counted separately
  const d = m.dirty;
  if (!d.observable) {
    say('  dirty       UNOBSERVABLE: ' + d.reason);
    moving.push('this tree could not be read');
  } else {
    say(
      '  dirty       tracked-modified ' + d.tracked.length + ' · untracked ' + d.untracked.length
    );
    for (const f of d.tracked.slice(0, 20)) say('                ' + f);
    for (const f of d.untracked.slice(0, 20)) say('                ?? ' + f);
    const more =
      d.tracked.length +
      d.untracked.length -
      Math.min(20, d.tracked.length) -
      Math.min(20, d.untracked.length);
    if (more > 0) say('                … and ' + more + ' more');
    if (d.tracked.length + d.untracked.length) moving.push('this tree is dirty');
  }

  // the main checkout's dirtiness — the signal Codex actually halts on
  if (m.mainDirty) {
    const md = m.mainDirty;
    if (!md.observable) {
      say('  main tree   UNOBSERVABLE: ' + md.reason);
      moving.push('the main checkout could not be read');
    } else {
      say(
        '  main tree   ' +
          m.mainRoot +
          ': tracked-modified ' +
          md.tracked.length +
          ' · untracked ' +
          md.untracked.length
      );
      for (const f of md.tracked.slice(0, 10)) say('                ' + f);
      for (const f of md.untracked.slice(0, 10)) say('                ?? ' + f);
      if (md.tracked.length + md.untracked.length)
        moving.push('the main checkout has uncommitted work');
    }
  }

  // stranded or live locks
  const locks = m.locks.locks;
  if (!locks.length) say('  locks       none');
  for (const l of locks) {
    say(
      '  locks       index.lock PRESENT  ' +
        l.path +
        '  (' +
        l.size +
        ' bytes, age ' +
        ws.fmtAge(l.ageMs) +
        ')' +
        (l.fresh
          ? '  — young: a writer may be mid-operation'
          : '  — old: a 0-byte lock left behind reads exactly like a crashed writer') +
        '  [not created by this hook: it runs git with --no-optional-locks]'
    );
    moving.push(l.fresh ? 'a fresh index.lock' : 'a stranded index.lock');
  }

  // newest write in the tree
  const mo = m.motion;
  if (!mo.observable) say('  motion      UNOBSERVABLE: ' + mo.reason);
  else if (!mo.newest) say('  motion      no files in tree');
  else {
    say(
      '  motion      newest write ' +
        ws.fmtAge(mo.ageMs) +
        ' ago  ' +
        path.relative(r.toplevel, mo.newest.path) +
        (mo.capped ? '  (walk capped — partial)' : '')
    );
    if (mo.ageMs !== null && mo.ageMs < 60000) moving.push('a file was written in the last minute');
  }

  // writers: sessions whose cwd is inside any worktree of this repository
  const wl = m.worktrees;
  if (!wl.observable) say('  worktrees   UNOBSERVABLE: ' + wl.reason);
  else
    say(
      '  worktrees   ' +
        wl.worktrees.length +
        ' registered' +
        (wl.worktrees.length > 1
          ? ' (' +
            wl.worktrees.map(w => w.branch || (w.detached ? 'detached' : '?')).join(', ') +
            ')'
          : '')
    );

  const sessions = [];
  const blind = [];
  if (m.claude.observable) sessions.push(...m.claude.sessions);
  else blind.push('Claude sessions: ' + m.claude.reason);
  if (m.codex.observable) sessions.push(...m.codex.sessions);
  else blind.push('Codex sessions: ' + m.codex.reason);
  if (blind.length) {
    for (const b of blind) say('  writers     UNOBSERVABLE — ' + b);
    moving.push('the session list could not be read');
  }
  if (!sessions.length && !blind.length)
    say(
      '  writers     no Claude or Codex session has its cwd inside a worktree of this repository'
    );
  else if (sessions.length) {
    say(
      '  writers     ' +
        sessions.length +
        ' session(s) with cwd inside a worktree of this repository:'
    );
    for (const s of sessions) {
      const here =
        ws.isInside(s.cwd, r.toplevel) && ws.normPath(s.cwd) === ws.normPath(r.toplevel)
          ? '  [THIS worktree]'
          : '';
      if (s.kind === 'claude') {
        say(
          '                claude pid ' +
            s.pid +
            '  ' +
            s.liveness.toUpperCase() +
            (s.liveness === 'present'
              ? ' (pid present — identity not verified)'
              : s.liveness === 'stale'
                ? ' (record predates this boot — the process died with the previous boot)'
                : s.liveness === 'inconclusive'
                  ? ' (pid check answered EPERM — may be recycled; not counted as a writer)'
                  : '') +
            '  cwd ' +
            s.cwd +
            (s.startedAt ? '  started ' + s.startedAt : '') +
            here
        );
        if (s.liveness === 'present')
          moving.push('a Claude session (pid ' + s.pid + ') is in this repository');
      } else {
        say(
          '                codex  ' +
            s.rollout +
            '  ' +
            s.liveness.toUpperCase() +
            ' (last write ' +
            ws.fmtAge(s.lastWriteAgeMs) +
            ' ago)  cwd ' +
            s.cwd +
            here
        );
        if (s.liveness === 'active') moving.push('a Codex session is active in this repository');
      }
    }
  }

  if (moving.length) {
    say('SUMMARY       TREE IS MOVING — ' + moving.join('; ') + '.');
    say(
      '              Do not stash, revert, commit or work around files you did not create; report them by name.'
    );
  } else say('SUMMARY       QUIET — nothing here indicates another writer.');
  say('VERDICT       INFORMATIONAL — this hook never refuses (exit 0).');
  return lines;
}

let out;
try {
  out = main();
} catch (e) {
  out = [
    'WORKTREE PREFLIGHT  ' + process.cwd(),
    '  UNOBSERVABLE: preflight crashed: ' + (e && e.stack ? e.stack.split('\n')[0] : e),
    'VERDICT       INFORMATIONAL — this hook never refuses (exit 0).',
  ];
}
process.stdout.write(out.join('\n') + '\n');
process.exitCode = 0;
