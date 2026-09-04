/**
 * scripts/worktree-state.js — READ-ONLY measurement of one git worktree, shared by
 * `worktree-preflight.js` (Codex setup hook) and `worktree-teardown-guard.js`
 * (Codex cleanup hook). One module so the two hooks cannot disagree about what
 * "dirty" or "another writer" means.
 *
 * ── ⛔ EVERY git CALL GOES THROUGH runGit(), AND runGit() PREPENDS
 *    `--no-optional-locks` ──────────────────────────────────────────────────────
 * A plain `git status` refreshes the index and takes `index.lock` to do it. If the
 * process dies mid-refresh — or the disk is slow and a second reader races it —
 * a 0-byte `index.lock` is left behind that is indistinguishable from a crashed
 * writer. A preflight whose job is to detect stranded locks must not be able to
 * create one; `--no-optional-locks` makes status a pure reader. Suite 266 asserts
 * both halves: the flag is present on every invocation, and running these hooks
 * over a repo leaves no `index.lock` and does not touch the index's mtime.
 *
 * ── WHAT IT NEVER DOES ──────────────────────────────────────────────────────
 * No fetch (network, and a read-only hook must not change remote-tracking refs),
 * no stash, reset, clean, checkout, worktree add/remove, no writes inside any
 * repository. The only write anywhere is the teardown guard's rescue copy, which
 * lives in that file, outside every repo, and is not this module's concern.
 *
 * ── HOW "ANOTHER WRITER" IS ANSWERED, AND ITS CEILING ───────────────────────
 * Three independent, cheap, platform-standard sources — none of them a private
 * sibling repo's layout, because this repository is PUBLIC (see
 * `scripts/control-state.js` for that rule):
 *   1. Claude Code session records: `~/.claude/sessions/<pid>.json` carry
 *      `{ pid, cwd, startedAt }`. A record whose cwd is inside any worktree of
 *      this repo names a session; `process.kill(pid, 0)` says whether the pid is
 *      present. ⚠ PID PRESENCE IS NOT IDENTITY — a recycled pid reads as live.
 *      The output says "pid present", never "verified".
 *   2. Codex session rollouts: `~/.codex/sessions/YYYY/MM/DD/rollout-*.jsonl`,
 *      whose first line is `session_meta` with `cwd`. Codex leaves no pid record,
 *      so liveness is the rollout's mtime (active within RECENT_MS).
 *   3. The tree itself: `index.lock` in the worktree's git dir and in the common
 *      dir (with size and age), the newest write in the working tree, and the
 *      dirtiness of the MAIN checkout — someone's uncommitted work in the main
 *      tree is the strongest "another writer" signal there is, and it is the one
 *      Codex halts on.
 * Each source degrades to `{ observable: false, reason }` rather than to zero.
 * An empty list from a source that could not be read is reported as UNOBSERVABLE,
 * never as "no writers" (the `sync.ps1` WF2 lesson: a swallowed access denial
 * looks exactly like an empty directory).
 */

'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');

const RECENT_MS = 10 * 60 * 1000; // a Codex rollout written within 10 min counts as active
const LOCK_FRESH_MS = 60 * 1000; // an index.lock younger than this may be a live writer
const MOTION_FILE_CAP = 20000; // bound the newest-write walk on huge trees
const MOTION_TIME_CAP_MS = 3000;
const GIT_TIMEOUT_MS = 20000;

/** Env for child git: strip GIT_* so a hook-launched process cannot redirect us. */
function childEnv() {
  const env = {};
  for (const k of Object.keys(process.env)) if (!/^GIT_/i.test(k)) env[k] = process.env[k];
  env.LC_ALL = 'C';
  return env;
}

/** The ONE git runner. `ROBCO_GIT_BIN` exists so a test can prove the "git unavailable" path. */
function runGit(args, cwd) {
  const bin = process.env.ROBCO_GIT_BIN || 'git';
  const r = spawnSync(bin, ['--no-optional-locks', ...args], {
    cwd,
    env: childEnv(),
    encoding: 'utf8',
    timeout: GIT_TIMEOUT_MS,
    windowsHide: true,
    maxBuffer: 32 * 1024 * 1024,
  });
  if (r.error)
    return { ok: false, out: '', raw: '', err: String(r.error.message || r.error), status: null };
  // `raw` is untrimmed: porcelain status records START with a space (" M file"),
  // and trimming the first one silently eats the first character of its path.
  return {
    ok: r.status === 0,
    out: (r.stdout || '').trim(),
    raw: r.stdout || '',
    err: (r.stderr || '').trim(),
    status: r.status,
  };
}

/**
 * ⛔ A LEXICAL COMPARE IS NOT AN ANSWER TO "IS THIS THE SAME DIRECTORY".
 *
 * The two sides of every comparison in this module come from different
 * producers that spell the same place differently. A session record's `cwd` is
 * a plain string a session wrote down — on Windows, whatever `TEMP` literally
 * says. `roots` come from `git worktree list`, which git reports only after its
 * own `real_path()` has expanded short names and followed junctions. Compared
 * as strings the two read as different directories, every session in that tree
 * is filtered out, and the preflight prints "no session has its cwd inside a
 * worktree of this repository" — a false NEGATIVE, in the one module whose
 * whole doctrine is that an unreadable source is UNOBSERVABLE and never "no
 * writers" (see the header). ⚠ The wrong answer here is the confident one.
 *
 * ⭐ MEASURED ON THE RUNNER, 2026-09-04, not reasoned about: GitHub Actions'
 * `windows-latest` hands out `os.tmpdir()` = `C:\Users\RUNNER~1\AppData\Local\
 * Temp` — the 8.3 SHORT form — while git reports `C:/Users/runneradmin/...`.
 * That is why Suite 266's `266.25` failed on `windows-latest` on 9 of 9 runs
 * from the moment it landed while `ubuntu-latest` passed all 9 (there,
 * `/tmp` is already canonical). ⛔ It was NOT the clock: the same probe measured
 * the boot-time recomputation moving 9 ms across the child spawn, on a VM 122 s
 * old — the exact fresh-VM condition the clock-skew hypothesis named.
 *
 * `fs.realpathSync.native` is the OS call (`GetFinalPathNameByHandle` on
 * Windows), so — unlike `fs.realpathSync` — it also expands 8.3 short names.
 * A path that does not exist cannot be resolved at all, so resolve the longest
 * ancestor that DOES and re-append the rest; if nothing on it exists (a stale
 * record naming a deleted worktree) fall back to the lexical form, which is
 * what this function did for everything before.
 */
const REAL_CACHE = new Map(); // these are one-shot CLI runs: one answer per path per run

function realPathish(p) {
  const key = String(p);
  const hit = REAL_CACHE.get(key);
  if (hit !== undefined) return hit;
  const resolved = path.resolve(key);
  let cur = resolved;
  const tail = [];
  let out = resolved;
  for (;;) {
    try {
      const real = fs.realpathSync.native(cur);
      out = tail.length ? path.join(real, ...tail.reverse()) : real;
      break;
    } catch {
      const parent = path.dirname(cur);
      if (parent === cur) break; // hit the root with nothing resolvable — keep the lexical form
      tail.push(path.basename(cur));
      cur = parent;
    }
  }
  REAL_CACHE.set(key, out);
  return out;
}

function normPath(p) {
  if (!p) return '';
  let s = realPathish(p).replace(/[\\/]+$/, '');
  if (process.platform === 'win32') s = s.replace(/\//g, '\\').toLowerCase();
  return s;
}

function isInside(child, parent) {
  const c = normPath(child);
  const p = normPath(parent);
  return c === p || c.startsWith(p + path.sep);
}

function safeStat(p) {
  try {
    return fs.statSync(p);
  } catch {
    return null;
  }
}

/** Where are we? Resolves toplevel, git dir, common dir, HEAD, branch. */
function resolveRepo(cwd) {
  const top = runGit(['rev-parse', '--show-toplevel'], cwd);
  if (!top.ok) {
    return {
      observable: false,
      reason: 'not a git worktree, or git unavailable: ' + (top.err || 'no output'),
    };
  }
  const toplevel = path.resolve(top.out);
  const gitDir = runGit(['rev-parse', '--absolute-git-dir'], toplevel);
  const commonDir = runGit(['rev-parse', '--git-common-dir'], toplevel);
  const head = runGit(['rev-parse', 'HEAD'], toplevel);
  const sym = runGit(['symbolic-ref', '-q', '--short', 'HEAD'], toplevel);
  const commonAbs = commonDir.ok ? path.resolve(toplevel, commonDir.out) : null;
  return {
    observable: true,
    toplevel,
    gitDir: gitDir.ok ? path.resolve(gitDir.out) : null,
    commonDir: commonAbs,
    // A linked worktree's git dir is `<common>/worktrees/<name>`; the main checkout's is `<common>`.
    isLinkedWorktree: !!(gitDir.ok && commonAbs && normPath(gitDir.out) !== normPath(commonAbs)),
    head: head.ok ? head.out : null,
    headReason: head.ok ? null : head.err || 'no HEAD (unborn branch?)',
    branch: sym.ok ? sym.out : null, // null = detached
  };
}

/**
 * Tracked vs untracked, COUNTED SEPARATELY, files named.
 * `--porcelain=v1 --untracked-files=all -z`: `??` = untracked; anything else is a
 * tracked change (staged, unstaged, renamed, deleted, unmerged). `-z` so a file
 * name with a space or a newline cannot split a record.
 */
function dirtyState(cwd) {
  const r = runGit(['status', '--porcelain=v1', '--untracked-files=all', '-z'], cwd);
  if (!r.ok) return { observable: false, reason: 'git status failed: ' + (r.err || 'unknown') };
  const tracked = [];
  const untracked = [];
  const parts = r.raw.split('\0');
  for (let i = 0; i < parts.length; i++) {
    const rec = parts[i];
    if (!rec) continue;
    const code = rec.slice(0, 2);
    const file = rec.slice(3);
    if (code === '??') untracked.push(file);
    else {
      tracked.push(code.trim() + ' ' + file);
      // A rename record carries the original path as the NEXT -z field.
      if (/R|C/.test(code)) i++;
    }
  }
  return { observable: true, tracked, untracked };
}

/** Local vs upstream, against the LAST FETCHED remote-tracking ref (no fetch here). */
function upstreamParity(cwd) {
  const up = runGit(['rev-parse', '--abbrev-ref', '--symbolic-full-name', '@{upstream}'], cwd);
  if (!up.ok)
    return { observable: true, hasUpstream: false, reason: 'no upstream configured for HEAD' };
  const lr = runGit(['rev-list', '--left-right', '--count', 'HEAD...@{upstream}'], cwd);
  if (!lr.ok) return { observable: false, reason: 'rev-list failed: ' + (lr.err || 'unknown') };
  const m = lr.out.match(/^(\d+)\s+(\d+)/);
  if (!m) return { observable: false, reason: 'unparseable rev-list output: ' + lr.out };
  return {
    observable: true,
    hasUpstream: true,
    upstream: up.out,
    ahead: Number(m[1]),
    behind: Number(m[2]),
    equal: Number(m[1]) === 0 && Number(m[2]) === 0,
  };
}

/**
 * Commits that would become unreachable if this worktree were deleted.
 * On a BRANCH the branch survives worktree removal, so local commits are only
 * "unpushed" (reported, not fatal). On a DETACHED HEAD nothing survives: if no
 * branch or remote ref contains HEAD, deleting the worktree loses the commits.
 */
function orphanRisk(cwd, repo) {
  if (!repo.head) return { observable: false, reason: 'no HEAD to test' };
  if (repo.branch) return { observable: true, detached: false, unreachable: 0 };
  const local = runGit(['branch', '--contains', 'HEAD', '--format=%(refname:short)'], cwd);
  const remote = runGit(['branch', '-r', '--contains', 'HEAD', '--format=%(refname:short)'], cwd);
  if (!local.ok || !remote.ok) return { observable: false, reason: 'branch --contains failed' };
  // git prints a "(HEAD detached at …)" / "(no branch)" placeholder row for the
  // detached worktree itself; that is not a holder.
  const holders = [local.out, remote.out]
    .join('\n')
    .split('\n')
    .map(s => s.trim())
    .filter(s => s && !s.startsWith('('));
  if (holders.length) return { observable: true, detached: true, unreachable: 0, holders };
  // How many commits would go: HEAD minus everything any ref reaches.
  const n = runGit(
    ['rev-list', '--count', 'HEAD', '--not', '--branches', '--remotes', '--tags'],
    cwd
  );
  const count = n.ok && /^\d+$/.test(n.out) ? Number(n.out) : null;
  return {
    observable: count !== null,
    detached: true,
    unreachable: count === null ? 1 : count,
    holders: [],
  };
}

function stashCount(cwd) {
  const r = runGit(['stash', 'list'], cwd);
  if (!r.ok) return { observable: false, reason: 'stash list failed' };
  return { observable: true, count: r.out ? r.out.split('\n').filter(Boolean).length : 0 };
}

/** index.lock in the worktree's own git dir and in the common dir, with age and size. */
function lockEvidence(repo) {
  const locks = [];
  const dirs = [];
  if (repo.gitDir) dirs.push(repo.gitDir);
  if (repo.commonDir && (!repo.gitDir || normPath(repo.commonDir) !== normPath(repo.gitDir)))
    dirs.push(repo.commonDir);
  for (const d of dirs) {
    const p = path.join(d, 'index.lock');
    const st = safeStat(p);
    if (st) {
      const ageMs = Date.now() - st.mtimeMs;
      locks.push({ path: p, size: st.size, ageMs, fresh: ageMs < LOCK_FRESH_MS });
    }
  }
  return { observable: true, locks };
}

/** Newest write in the working tree (excluding .git and node_modules). Bounded. */
function treeMotion(toplevel) {
  const start = Date.now();
  let files = 0;
  let newest = null;
  let capped = false;
  const stack = [toplevel];
  try {
    while (stack.length) {
      if (files >= MOTION_FILE_CAP || Date.now() - start > MOTION_TIME_CAP_MS) {
        capped = true;
        break;
      }
      const dir = stack.pop();
      let entries;
      try {
        entries = fs.readdirSync(dir, { withFileTypes: true });
      } catch {
        return { observable: false, reason: 'could not enumerate ' + dir };
      }
      for (const e of entries) {
        if (e.name === '.git' || e.name === 'node_modules') continue;
        const full = path.join(dir, e.name);
        if (e.isDirectory()) stack.push(full);
        else if (e.isFile()) {
          files++;
          const st = safeStat(full);
          if (st && (!newest || st.mtimeMs > newest.mtimeMs))
            newest = { path: full, mtimeMs: st.mtimeMs };
        }
      }
    }
  } catch (e) {
    return { observable: false, reason: 'walk failed: ' + (e && e.message) };
  }
  return {
    observable: true,
    files,
    capped,
    newest,
    ageMs: newest ? Date.now() - newest.mtimeMs : null,
  };
}

/** All worktrees of the repository this cwd belongs to. */
function worktreeList(cwd) {
  const r = runGit(['worktree', 'list', '--porcelain'], cwd);
  if (!r.ok) return { observable: false, reason: 'worktree list failed: ' + (r.err || 'unknown') };
  const out = [];
  let cur = null;
  for (const line of r.out.split('\n')) {
    if (line.startsWith('worktree ')) {
      cur = { path: path.resolve(line.slice(9)), branch: null, detached: false };
      out.push(cur);
    } else if (cur && line.startsWith('branch '))
      cur.branch = line.slice(7).replace(/^refs\/heads\//, '');
    else if (cur && line === 'detached') cur.detached = true;
  }
  return { observable: true, worktrees: out };
}

/**
 * ⛔ EPERM IS NOT "PRESENT" ON WINDOWS. Measured 2026-09-03 after a reboot: two
 * session records from before the boot named pids 5396 and 5560; `Get-Process`
 * said both were GONE, and `process.kill(pid, 0)` threw EPERM for both — the
 * numbers had been handed to processes this user may not open. The first draft
 * read EPERM as "present" and reported two live writers in repos that had none.
 * EPERM now reads as INCONCLUSIVE, and the boot-time rule below settles the
 * pre-reboot case outright.
 */
function pidPresent(pid) {
  if (!Number.isInteger(pid) || pid <= 0) return 'unknown';
  try {
    process.kill(pid, 0);
    return 'present';
  } catch (e) {
    if (e && e.code === 'EPERM') return 'inconclusive';
    if (e && e.code === 'ESRCH') return 'gone';
    return 'unknown';
  }
}

/** When this machine last booted, from os.uptime() — no shell, no WMI. */
function bootTimeMs() {
  return Date.now() - os.uptime() * 1000;
}

/**
 * Claude Code sessions whose cwd is inside any of `roots`.
 *
 * ⭐ A record whose `startedAt` predates the machine's boot cannot be a live
 * session whatever its pid says — the process it describes died with the
 * previous boot, and the pid may since have been recycled. Such a record is
 * reported STALE (predates boot) and never counted as a writer. `ROBCO_CLAUDE_SESSIONS_DIR`
 * exists so Suite 266 can prove this on a fixture instead of the real store.
 */
function claudeSessions(roots) {
  const dir =
    process.env.ROBCO_CLAUDE_SESSIONS_DIR || path.join(os.homedir(), '.claude', 'sessions');
  const boot = bootTimeMs();
  if (!safeStat(dir))
    return {
      observable: true,
      sessions: [],
      note: 'no ~/.claude/sessions directory (known empty)',
    };
  let names;
  try {
    names = fs.readdirSync(dir).filter(n => /^\d+\.json$/.test(n));
  } catch (e) {
    return {
      observable: false,
      reason: '~/.claude/sessions exists but could not be enumerated: ' + (e && e.message),
    };
  }
  const sessions = [];
  for (const n of names) {
    let rec;
    try {
      rec = JSON.parse(fs.readFileSync(path.join(dir, n), 'utf8'));
    } catch {
      continue; // a half-written record is not a session we can name; the count of unreadable ones is reported
    }
    if (!rec || !rec.cwd) continue;
    const inRoot = roots.find(r => isInside(rec.cwd, r));
    if (!inRoot) continue;
    const predatesBoot = typeof rec.startedAt === 'number' && rec.startedAt < boot;
    sessions.push({
      kind: 'claude',
      pid: rec.pid,
      cwd: rec.cwd,
      root: inRoot,
      startedAt: rec.startedAt ? new Date(rec.startedAt).toISOString() : null,
      name: rec.name || null,
      liveness: predatesBoot ? 'stale' : pidPresent(rec.pid),
      predatesBoot,
    });
  }
  return { observable: true, sessions };
}

/** Codex rollouts from today and yesterday whose session_meta.cwd is inside any of `roots`. */
function codexSessions(roots) {
  const base = path.join(os.homedir(), '.codex', 'sessions');
  if (!safeStat(base))
    return { observable: true, sessions: [], note: 'no ~/.codex/sessions directory (known empty)' };
  const days = [];
  for (const back of [0, 1]) {
    const d = new Date(Date.now() - back * 86400000);
    const y = String(d.getFullYear());
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    days.push(path.join(base, y, m, dd));
  }
  const sessions = [];
  let scanned = 0;
  for (const day of days) {
    if (!safeStat(day)) continue;
    let names;
    try {
      names = fs.readdirSync(day).filter(n => /^rollout-.*\.jsonl$/.test(n));
    } catch (e) {
      return {
        observable: false,
        reason: day + ' exists but could not be enumerated: ' + (e && e.message),
      };
    }
    for (const n of names) {
      if (scanned++ > 400) break;
      const full = path.join(day, n);
      const st = safeStat(full);
      if (!st) continue;
      let first;
      try {
        const fd = fs.openSync(full, 'r');
        const buf = Buffer.alloc(8192);
        const got = fs.readSync(fd, buf, 0, buf.length, 0);
        fs.closeSync(fd);
        first = buf.toString('utf8', 0, got).split('\n')[0];
      } catch {
        continue;
      }
      let meta;
      try {
        meta = JSON.parse(first);
      } catch {
        continue;
      }
      const cwd = meta && meta.payload && meta.payload.cwd;
      if (!cwd) continue;
      const inRoot = roots.find(r => isInside(cwd, r));
      if (!inRoot) continue;
      const ageMs = Date.now() - st.mtimeMs;
      sessions.push({
        kind: 'codex',
        rollout: n,
        cwd,
        root: inRoot,
        originator: meta.payload.originator || null,
        lastWriteAgeMs: ageMs,
        liveness: ageMs < RECENT_MS ? 'active' : 'idle',
      });
    }
  }
  return { observable: true, sessions };
}

/**
 * The full measurement. Never throws; every section carries `observable`.
 * @param {string} cwd
 */
function measure(cwd) {
  const repo = resolveRepo(cwd);
  if (!repo.observable) return { repo };
  const t = repo.toplevel;
  const wl = worktreeList(t);
  const roots = wl.observable ? wl.worktrees.map(w => w.path) : [t];
  const mainRoot = repo.commonDir ? path.dirname(repo.commonDir) : null;
  const mainDirty =
    mainRoot && repo.isLinkedWorktree && safeStat(mainRoot) ? dirtyState(mainRoot) : null;
  return {
    repo,
    dirty: dirtyState(t),
    upstream: upstreamParity(t),
    orphan: orphanRisk(t, repo),
    stash: stashCount(t),
    locks: lockEvidence(repo),
    motion: treeMotion(t),
    worktrees: wl,
    mainRoot,
    mainDirty,
    claude: claudeSessions(roots),
    codex: codexSessions(roots),
  };
}

function fmtAge(ms) {
  if (ms === null || ms === undefined) return '?';
  const s = Math.round(ms / 1000);
  if (s < 90) return s + ' s';
  const m = Math.round(s / 60);
  if (m < 90) return m + ' min';
  return (ms / 3600000).toFixed(1) + ' h';
}

module.exports = {
  RECENT_MS,
  LOCK_FRESH_MS,
  runGit,
  measure,
  resolveRepo,
  dirtyState,
  upstreamParity,
  orphanRisk,
  lockEvidence,
  treeMotion,
  worktreeList,
  claudeSessions,
  codexSessions,
  fmtAge,
  normPath,
  isInside,
};
