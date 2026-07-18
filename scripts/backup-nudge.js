#!/usr/bin/env node
/**
 * scripts/backup-nudge.js — Protocol 48 local-artifact backup NUDGE.
 *
 * A pre-push REMINDER (never a gate): if the local-only artifacts that live
 * nowhere but this machine — library/, planning/, and the orchestrator's memory
 * folder — have changed since the last archive sync, print a short reminder to
 * refresh the private archive. It is fail-safe by construction:
 *
 *   - It NEVER exits non-zero and NEVER throws to the shell. The pre-push hook
 *     must never be blocked or failed by this check (Protocol 33 DNA).
 *   - If it cannot determine state for ANY reason (the private archive repo is
 *     absent, a path doesn't resolve, git is unavailable, anything unexpected),
 *     it stays completely SILENT and lets the push proceed. A developer on a
 *     machine without the private backup sees no difference at all.
 *
 * "Changed since last sync" = any file under library/ or planning/ (always in
 * this repo) — and, best-effort, the discovered memory folder — has an mtime
 * newer than the private archive repo's last commit (its last successful sync).
 * A slightly over-eager reminder is fine; a blocked push is not — so every
 * uncertainty resolves toward SILENT + proceed, never toward firing or failing.
 */
'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');

const REPO_ROOT = path.resolve(__dirname, '..');

// The private archive working copy — sibling of the public repo by default.
// Overridable for tests via ROBCO_BACKUP_REPO.
const BACKUP_REPO =
  process.env.ROBCO_BACKUP_REPO || path.resolve(REPO_ROOT, '..', '_robco-local-backup');

// Where the orchestrator's session store lives. Memory discovery is best-effort:
// if the base is absent or invisible (e.g. a sandboxed shell can't see AppData),
// memory is silently skipped — never a failure. Overridable via ROBCO_MEMORY_BASE.
const MEMORY_BASE =
  process.env.ROBCO_MEMORY_BASE ||
  path.join(
    process.env.APPDATA || path.join(os.homedir(), 'AppData', 'Roaming'),
    'Claude',
    'local-agent-mode-sessions'
  );

// Largest file mtime (ms) under a directory tree, or 0 if unreadable/empty.
// Never throws — an unreadable entry is skipped, not surfaced.
function newestMtimeMs(dir) {
  let newest = 0;
  if (!safeExists(dir)) return 0;
  const stack = [dir];
  while (stack.length) {
    const cur = stack.pop();
    let entries;
    try {
      entries = fs.readdirSync(cur, { withFileTypes: true });
    } catch {
      // unreadable directory — skip, never fail
      continue;
    }
    for (const e of entries) {
      const full = path.join(cur, e.name);
      try {
        if (e.isDirectory()) {
          if (e.name === '.git' || e.name === 'node_modules') continue;
          stack.push(full);
        } else {
          const m = fs.statSync(full).mtimeMs;
          if (m > newest) newest = m;
        }
      } catch {
        // unreadable entry — skip, never fail
      }
    }
  }
  return newest;
}

// Best-effort newest memory-folder mtime across discovered sessions, or 0.
// A memory folder is <base>/<guidA>/<guidB>/agent/memory (mirrors sync.ps1).
function newestMemoryMtimeMs(base) {
  let newest = 0;
  if (!safeExists(base)) return 0;
  let level1;
  try {
    level1 = fs.readdirSync(base, { withFileTypes: true });
  } catch {
    // base invisible to this shell — skip memory, never fail
    return 0;
  }
  for (const a of level1) {
    if (!a.isDirectory()) continue;
    const aPath = path.join(base, a.name);
    let level2;
    try {
      level2 = fs.readdirSync(aPath, { withFileTypes: true });
    } catch {
      continue;
    }
    for (const b of level2) {
      if (!b.isDirectory()) continue;
      const mem = path.join(aPath, b.name, 'agent', 'memory');
      const m = newestMtimeMs(mem);
      if (m > newest) newest = m;
    }
  }
  return newest;
}

function safeExists(p) {
  try {
    return fs.existsSync(p);
  } catch {
    return false;
  }
}

function main() {
  // 1. The private archive repo must be present AND a git repo — else silent.
  if (!safeExists(path.join(BACKUP_REPO, '.git'))) return;

  // 2. Last sync time = archive repo's last commit timestamp (unix seconds).
  const res = spawnSync('git', ['-C', BACKUP_REPO, 'log', '-1', '--format=%ct'], {
    encoding: 'utf8',
    timeout: 8000,
  });
  if (!res || res.status !== 0 || !res.stdout) return;
  const lastSyncSec = parseInt(String(res.stdout).trim(), 10);
  if (!Number.isFinite(lastSyncSec) || lastSyncSec <= 0) return;
  const lastSyncMs = lastSyncSec * 1000;

  // 3. Newest change across the local-only artifacts (memory is best-effort).
  const newest = Math.max(
    newestMtimeMs(path.join(REPO_ROOT, 'library')),
    newestMtimeMs(path.join(REPO_ROOT, 'planning')),
    newestMemoryMtimeMs(MEMORY_BASE)
  );
  if (newest <= 0) return; // nothing readable — can't determine — stay silent

  // 4. Nudge only when something is genuinely newer than the last sync.
  if (newest > lastSyncMs) {
    const line = '-'.repeat(64);
    process.stdout.write(
      '\n' +
        line +
        '\n' +
        '  BACKUP REMINDER (Protocol 48) — reminder only; your push is proceeding.\n' +
        '  Your local-only artifacts (library/, planning/, memory) have changed\n' +
        '  since the last archive sync. They live nowhere but this machine.\n' +
        '  When convenient, refresh the private archive: run sync.ps1 in your\n' +
        '  local archive working copy.\n' +
        line +
        '\n'
    );
  }
}

try {
  main();
} catch {
  // Fail-safe: a nudge must NEVER block or fail a push (Protocol 48 / 33 DNA).
}
process.exit(0);
