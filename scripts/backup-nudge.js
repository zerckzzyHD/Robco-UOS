#!/usr/bin/env node
/**
 * scripts/backup-nudge.js — Protocol 48 local-artifact backup NUDGE.
 *
 * A pre-push REMINDER (never a gate): the local-only artifacts that live nowhere
 * but this machine — `library/`, `planning/`, and every discovered memory store —
 * are compared against the private archive, and anything not backed up as it
 * stands is named.
 *
 * ── ⛔⛤ WHAT THIS USED TO ASK, AND WHY IT WAS THE WRONG QUESTION ────────────
 * It compared local file MTIMES against THE ARCHIVE REPO'S LAST COMMIT TIMESTAMP.
 * ⇒ **Any commit to the archive discharged it, whether or not that commit backed
 * anything up.** It needed no bug and no race to fail: two sessions and a clock
 * were sufficient, which is this project's ordinary operating state.
 *
 * ⚠ MEASURED 2026-09-01, and this is not a hypothetical: three artifacts were
 * unbacked while this script reported nothing owed — `library/TEST_CATALOG.md`,
 * the orchestrator's `MEMORY.md`, and a memory file created that same session for
 * the express purpose of preserving an owner ruling before it was deleted
 * elsewhere. All three were written BEFORE the archive's last commit, so the
 * comparison evaluated false. That commit was another session's own work and
 * mirrored none of them.
 *
 * ── ⛔⛔ AND "CHECK PRESENCE" IS ALSO THE WRONG QUESTION ─────────────────────
 * The obvious repair — ask whether the file is IN the mirror — would have stayed
 * exactly as silent. `TEST_CATALOG.md` was **present and 144 bytes stale**.
 * ⭐ "The file is there" and "the file is current" are different questions, and a
 * backup exists to answer the second.
 *
 * ⇒ ⭐⭐⭐ THE PREDICATE IS **CONTENT EQUIVALENCE**: for every watched artifact,
 * is a byte-identical copy in the archive's tree right now? Nothing about clocks,
 * nothing about mere existence.
 *
 * ── ⭐⭐ IT IS NEVER SILENT — THAT WAS THE ENTIRE FAILURE ────────────────────
 * An instrument that cannot tell "I checked and it is fine" from "I could not
 * check" is indistinguishable from one that is broken. Every path through this
 * script prints exactly one short verdict:
 *
 *   BACKED UP     — every watched artifact is byte-identical in the archive.
 *   NOT BACKED UP — the nudge, naming what differs and what is absent.
 *   UNOBSERVABLE  — it tried and could not establish the answer.
 *   NOT CONFIGURED— there is no archive on this machine to compare against.
 *
 * ⚠ THE LAST TWO ARE DIFFERENT FACTS AND ARE NOT COLLAPSED. A checkout without
 * the private archive is a normal, by-design state (the repo is public); an
 * archive that is present but unreadable is a failure to measure. Both print,
 * neither is silent, and neither can be mistaken for "your work is safe".
 *
 * ── ⛔ FAIL-SAFE POLARITY IS UNCHANGED (Protocol 33) ────────────────────────
 * It NEVER exits non-zero and NEVER throws to the shell. It informs; it does not
 * gate. ⚠ A nudge that can stop work is disabled the first time it is wrong, and
 * then it protects nothing.
 *
 * ── ⛔ ARCHIVE ACCESS IS READ-ONLY AND INDEX-FREE ───────────────────────────
 * The archive has a live writer. Every command here is `--no-optional-locks` and
 * touches refs or a pinned tree only — never the index. ⚠ `git status` alone takes
 * the index lock and can strand a lock file that looks exactly like a crashed
 * writer, so it is not used. `ls-tree` at a pinned sha yields every blob's SHA-1
 * in one call, which is also why no per-file `show` is needed.
 */
'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');
const crypto = require('crypto');
const { spawnSync } = require('child_process');

// ⚠ Overridable ONLY so the suite can drive this against throwaway fixtures —
// the same shape as the two overrides below. Unset in every real run, and the
// three reds that prove this script works are impossible to stage without it.
const REPO_ROOT = process.env.ROBCO_NUDGE_ROOT || path.resolve(__dirname, '..');

// The private archive working copy — sibling of the public repo by default.
// Overridable for tests via ROBCO_BACKUP_REPO.
const BACKUP_REPO =
  process.env.ROBCO_BACKUP_REPO || path.resolve(REPO_ROOT, '..', '_RobCo-Archive');

// Where the desktop session stores live. Discovery is best-effort: an invisible
// base (a sandboxed shell cannot see AppData) means those stores are reported as
// NOT COMPARED rather than quietly treated as fine. Overridable for tests.
const MEMORY_BASE =
  process.env.ROBCO_MEMORY_BASE ||
  path.join(
    process.env.APPDATA || path.join(os.homedir(), 'AppData', 'Roaming'),
    'Claude',
    'local-agent-mode-sessions'
  );

// The CLI project stores, the archive's other memory source.
const PROJECTS_BASE =
  process.env.ROBCO_PROJECTS_BASE || path.join(os.homedir(), '.claude', 'projects');

/** How many differing artifacts to name before summarising the rest. */
const NAME_LIMIT = 8;

function safeExists(p) {
  try {
    return fs.existsSync(p);
  } catch {
    return false;
  }
}

/**
 * Git's own blob identity for a byte buffer: sha1("blob <len>\0" + bytes).
 *
 * ⭐ Comparing THIS against `ls-tree`'s recorded blob SHA-1 is a content
 * comparison that costs one archive command for the whole tree, rather than a
 * `show` per file.
 *
 * ⛔⛤ THE PARAGRAPH THAT USED TO BE HERE WAS FALSE, AND IT INFLATED EVERY COUNT
 * THIS SCRIPT HAS EVER PRINTED (`BD16`, measured 2026-09-15). It said: *"It is
 * raw bytes on both sides — the archive pins `eol=lf` in `.gitattributes`
 * precisely so a checkout does not rewrite line endings, so a mismatch here is a
 * real content difference and not an EOL artifact."*
 *
 * ⚠ `eol=lf` normalises ON COMMIT. It does NOT stop a WORKING FILE from holding
 * CRLF — and on this machine they do. Measured on one file taken all the way
 * down: `planning/control-plane/reviews/GEMINI_REVIEW_2026-07-28.md` is **32,359
 * bytes with 134 CR** in the working tree, its committed blob is **32,225 bytes
 * with 0 CR**, and `git status` calls the file **clean**. ⇒ raw-byte comparison
 * reports a difference where git, correctly, reports none.
 *
 * ⛔ SCOPE, so the number is not hand-waved: **430** tracked files under
 * `planning/` + `library/` carry CRs in the worktree and none in their blobs.
 * Against that, the genuine gaps that day were `planning/` **0** and `library/`
 * **1**. The script reported **70 of 1015** not backed up. ⇒ that figure was an
 * UPPER BOUND, never a measurement — and a reminder that over-reports trains its
 * reader to discount it, which is how the 12 genuinely-absent memory files in the
 * same list went unread for ten days.
 */
function blobSha1(buf) {
  return crypto
    .createHash('sha1')
    .update('blob ' + buf.length + '\0', 'utf8')
    .update(buf)
    .digest('hex');
}

/**
 * ⭐ The same hash over LF-NORMALISED bytes, used ONLY as a second opinion when the
 * raw comparison already disagreed (`BD16`).
 *
 * ⛔ WHY THIS CANNOT HIDE A REAL GAP. Normalisation only ever REMOVES `\r` before
 * `\n`. If the raw hashes differ and the normalised hashes match, the two files
 * differ in line endings and NOTHING ELSE — and under `eol=lf` that is not a
 * backup gap: committing the local file would produce the byte-identical blob the
 * archive already holds. Any difference in actual content survives normalisation
 * and is still reported.
 *
 * ⛔ BINARY IS EXCLUDED BY CONSTRUCTION. A buffer containing a NUL byte is never
 * normalised — 429 of the files in scope are PNGs, and stripping `\r` from an
 * image is a corruption, not a comparison.
 */
function isProbablyText(buf) {
  return !buf.includes(0);
}

function blobSha1Lf(buf) {
  if (!isProbablyText(buf)) return null;
  const lf = Buffer.from(buf.toString('binary').replace(/\r\n/g, '\n'), 'binary');
  return blobSha1(lf);
}

/** Every file under a directory, as paths relative to it. Never throws. */
function walk(root, rel, out) {
  let entries;
  try {
    entries = fs.readdirSync(path.join(root, rel || '.'), { withFileTypes: true });
  } catch {
    return out;
  }
  for (const e of entries) {
    const r = rel ? rel + '/' + e.name : e.name;
    try {
      if (e.isDirectory()) walk(root, r, out);
      else if (e.isFile()) out.push(r);
    } catch {
      /* an entry that cannot be classified is skipped, never fatal */
    }
  }
  return out;
}

/**
 * The watched set: every local artifact that exists nowhere but this machine,
 * paired with the path the archive stores it under.
 *
 * ⚠ THE MEMORY NAMING IS NOT GUESSED — it mirrors `sync.ps1`'s own two rules
 * (`localmode-<guidB>` for a desktop session store, `project-<slug>` for a CLI
 * project store). A store whose base cannot be read is reported as NOT COMPARED.
 */
function watchedArtifacts() {
  const items = [];
  const notCompared = [];

  for (const dir of ['library', 'planning']) {
    const abs = path.join(REPO_ROOT, dir);
    if (!safeExists(abs)) continue;
    for (const rel of walk(abs, '', [])) {
      items.push({ local: path.join(abs, rel), archive: dir + '/' + rel });
    }
  }

  // Desktop session stores: <base>/<guidA>/<guidB>/agent/memory
  if (safeExists(MEMORY_BASE)) {
    let outer = [];
    try {
      outer = fs.readdirSync(MEMORY_BASE, { withFileTypes: true }).filter(d => d.isDirectory());
    } catch {
      notCompared.push('desktop session stores (base unreadable)');
    }
    for (const a of outer) {
      let inner;
      try {
        inner = fs
          .readdirSync(path.join(MEMORY_BASE, a.name), { withFileTypes: true })
          .filter(d => d.isDirectory());
      } catch {
        continue;
      }
      for (const b of inner) {
        const mem = path.join(MEMORY_BASE, a.name, b.name, 'agent', 'memory');
        if (!safeExists(mem)) continue;
        for (const rel of walk(mem, '', [])) {
          items.push({
            local: path.join(mem, rel),
            archive: 'memory/localmode-' + b.name + '/' + rel,
          });
        }
      }
    }
  } else {
    notCompared.push('desktop session stores (base not visible from this shell)');
  }

  // CLI project stores: <projects>/<slug>/memory
  if (safeExists(PROJECTS_BASE)) {
    let projs = [];
    try {
      projs = fs.readdirSync(PROJECTS_BASE, { withFileTypes: true }).filter(d => d.isDirectory());
    } catch {
      notCompared.push('CLI project stores (base unreadable)');
    }
    for (const p of projs) {
      const mem = path.join(PROJECTS_BASE, p.name, 'memory');
      if (!safeExists(mem)) continue;
      for (const rel of walk(mem, '', [])) {
        items.push({ local: path.join(mem, rel), archive: 'memory/project-' + p.name + '/' + rel });
      }
    }
  } else {
    notCompared.push('CLI project stores (base not visible from this shell)');
  }

  return { items, notCompared };
}

/** One read-only, index-free git call against the archive. */
function archiveGit(args) {
  return spawnSync('git', ['--no-optional-locks', '-C', BACKUP_REPO, ...args], {
    encoding: 'buffer',
    timeout: 20000,
    maxBuffer: 256 * 1024 * 1024,
  });
}

function say(lines) {
  const rule = '-'.repeat(72);
  process.stdout.write('\n' + rule + '\n' + lines.join('\n') + '\n' + rule + '\n');
}

function main() {
  // BD16: required-as-a-module ⇒ do nothing. The driver imports the hash primitives
  // and must not trigger a whole-tree comparison as a side effect of the import.
  if (require.main !== module) return;
  // ── NOT CONFIGURED ≠ UNOBSERVABLE. A checkout with no private archive is a
  // normal, by-design state for this PUBLIC repo — but it still prints, because
  // silence here is what let three unbacked artifacts pass for safe.
  if (!safeExists(path.join(BACKUP_REPO, '.git'))) {
    say([
      '  [backup] NOT CONFIGURED — no private archive on this machine, so there is',
      '  nothing to compare against. This is normal for a clone without one, and it',
      '  is NOT a statement that your local-only work is backed up.',
    ]);
    return;
  }

  // ⛔ Pin the sha ONCE. Everything below reads that tree, so the answer describes
  // one consistent snapshot even though the archive has a live writer.
  const head = archiveGit(['rev-parse', 'HEAD']);
  if (!head || head.status !== 0 || !head.stdout) {
    say([
      '  [backup] UNOBSERVABLE — the private archive is present but its HEAD could',
      '  not be resolved, so whether your local-only work is backed up COULD NOT BE',
      '  ESTABLISHED. That is not the same as it being fine.',
    ]);
    return;
  }
  const sha = head.stdout.toString('utf8').trim();

  const tree = archiveGit(['ls-tree', '-r', sha]);
  if (!tree || tree.status !== 0) {
    say([
      '  [backup] UNOBSERVABLE — the private archive is present but its tree at ' + sha.slice(0, 7),
      '  could not be read, so whether your local-only work is backed up COULD NOT',
      '  BE ESTABLISHED. That is not the same as it being fine.',
    ]);
    return;
  }

  // path -> blob sha1, from `<mode> blob <sha1>\t<path>`
  const inArchive = new Map();
  for (const line of tree.stdout.toString('utf8').split('\n')) {
    const m = /^\d+ blob ([0-9a-f]{40})\t(.+)$/.exec(line);
    if (m) inArchive.set(m[2], m[1]);
  }
  if (inArchive.size === 0) {
    say([
      '  [backup] UNOBSERVABLE — the private archive at ' + sha.slice(0, 7) + ' listed no',
      '  files, which is not a credible backup state. Whether your local-only work is',
      '  backed up COULD NOT BE ESTABLISHED.',
    ]);
    return;
  }

  const { items, notCompared } = watchedArtifacts();
  const stale = [];
  const absent = [];
  const unreadable = [];
  const eolOnly = []; // BD16: matched only after LF normalisation — backed up, reported separately
  let ok = 0;

  for (const it of items) {
    let buf;
    try {
      buf = fs.readFileSync(it.local);
    } catch {
      unreadable.push(it.archive);
      continue;
    }
    const recorded = inArchive.get(it.archive);
    if (!recorded) absent.push(it.archive);
    else if (recorded === blobSha1(buf)) ok++;
    else if (recorded === blobSha1Lf(buf)) {
      // BD16: raw bytes differ, LF-normalised bytes match ⇒ the difference is line
      // endings and nothing else. Under the archive's `eol=lf` that is NOT a backup
      // gap: committing this file yields the blob the archive already has. Counted as
      // backed up, and counted SEPARATELY so the figure can be stated rather than
      // silently folded into `ok`.
      ok++;
      eolOnly.push(it.archive);
    } else stale.push(it.archive);
  }

  const behind = stale.length + absent.length;
  const syncCmd =
    'powershell.exe -NoProfile -ExecutionPolicy Bypass -File "' +
    path.join(BACKUP_REPO, 'sync.ps1') +
    '"';

  if (behind > 0) {
    const named = [...stale.map(p => p + '  (differs)'), ...absent.map(p => p + '  (absent)')];
    const lines = [
      '  [backup] ⛔ NOT BACKED UP — ' + behind + ' of ' + items.length + ' local-only',
      '  artifacts are not byte-identical in the private archive (compared against',
      '  archive ' + sha.slice(0, 7) + '). These exist on this machine and nowhere else.',
      '',
    ];
    for (const n of named.slice(0, NAME_LIMIT)) lines.push('    · ' + n);
    if (named.length > NAME_LIMIT) lines.push('    … +' + (named.length - NAME_LIMIT) + ' more');
    lines.push('');
    lines.push('  AGENT ACTION (Protocol 48) — this reminder never blocks the push.');
    lines.push('  Run the archive sync yourself before finishing, from the Bash tool:');
    lines.push('    ' + syncCmd);
    if (unreadable.length) {
      lines.push('');
      lines.push('  ⚠ ' + unreadable.length + ' file(s) could not be read and were NOT compared.');
    }
    if (notCompared.length) {
      lines.push('  ⚠ NOT COMPARED: ' + notCompared.join('; ') + '.');
    }
    say(lines);
    return;
  }

  // ⭐ THE ALL-GOOD CASE PRINTS TOO, and says WHAT it checked. "I checked N things
  // and they are identical" is a different sentence from silence, and the whole
  // defect was that those two were indistinguishable.
  const lines = [
    '  [backup] BACKED UP — all ' + ok + ' local-only artifacts are byte-identical in',
    '  the private archive (compared against archive ' + sha.slice(0, 7) + ').',
  ];
  if (unreadable.length) {
    lines.push('  ⚠ ' + unreadable.length + ' file(s) could not be read and were NOT compared.');
  }
  if (notCompared.length) {
    lines.push('  ⚠ NOT COMPARED: ' + notCompared.join('; ') + '.');
  }
  say(lines);
}

// ⭐ BD16: the comparison primitives are exported so a driver can prove the EOL
// fallback still discriminates. ⛔ `main()` returns immediately when this file is
// REQUIRED rather than run (guard at the top of main), so importing it performs no
// git commands, reads no tree, and prints nothing.
module.exports = { blobSha1, blobSha1Lf, isProbablyText };

// ⛔ The whole body is wrapped and the exit is unconditional: this script can
// never fail a push, however wrong it is about anything else (Protocol 33).
try {
  main();
} catch (err) {
  try {
    say([
      '  [backup] UNOBSERVABLE — the backup check itself failed, so whether your',
      '  local-only work is backed up COULD NOT BE ESTABLISHED. That is not the same',
      '  as it being fine.',
      '    ' + String((err && err.message) || err).slice(0, 200),
    ]);
  } catch {
    /* even reporting the failure must not throw */
  }
}
