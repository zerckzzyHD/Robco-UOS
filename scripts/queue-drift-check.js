#!/usr/bin/env node
/**
 * scripts/queue-drift-check.js — Protocol 50 queue-currency NUDGE.
 *
 * A pre-push REMINDER (never a gate): the orchestrator's memory store holds
 * `type: project` memories — by definition ongoing work or goals, exactly the
 * class that should have a queue entry. This lists every project memory and
 * flags the ones the queue record doesn't appear to mention, so a plan that
 * only ever lived in memory becomes visible instead of silently staying there.
 *
 * The "queue record" is TWO files since the 2026-07-21 split: QUEUE.md (open
 * work) + QUEUE_LOG.md (the append-only archive of shipped accounts). A memory
 * counts as referenced if it appears in EITHER — otherwise every shipped item's
 * memory would flag the moment its reasoning moved from the queue into the log.
 *
 * Fail-safe by construction, same shape as scripts/backup-nudge.js:
 *
 *   - It NEVER exits non-zero and NEVER throws to the shell. The pre-push
 *     hook must never be blocked or failed by this check (Protocol 33 DNA).
 *   - If it cannot determine state for ANY reason (the memory store is
 *     absent, invisible to this shell, unparsable, anything unexpected), it
 *     stays completely SILENT and lets the push proceed. A machine with no
 *     memory store sees no difference at all.
 *
 * The match is a heuristic word-overlap check, not a proof of drift — see
 * `looksReferenced()`. It is deliberately biased toward flagging (missing a
 * real gap defeats the point; a noisy false flag is just a line to skim). A
 * memory can opt out explicitly via `metadata.queue_status: not-applicable`
 * (or a top-level `queue_status` field) so an intentional exception is
 * recorded, not just silently never flagged.
 */
'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');

const REPO_ROOT = path.resolve(__dirname, '..');

// Same override name as scripts/backup-nudge.js on purpose — one env var
// points both nudges at a fake memory base for testing (Protocol 22).
const MEMORY_BASE =
  process.env.ROBCO_MEMORY_BASE ||
  path.join(
    process.env.APPDATA || path.join(os.homedir(), 'AppData', 'Roaming'),
    'Claude',
    'local-agent-mode-sessions'
  );

const QUEUE_PATH = process.env.ROBCO_QUEUE_PATH || path.join(REPO_ROOT, 'QUEUE.md');
// The "queue record" is TWO files since the 2026-07-21 restructure: QUEUE.md is
// the lean queue of open work, QUEUE_LOG.md the append-only archive of shipped
// accounts. A plan is "recorded" if it appears in EITHER — so a shipped item's
// memory must not start flagging merely because its reasoning moved to the log.
// QUEUE_LOG.md is optional: a machine without it still gets the QUEUE.md scan.
const QUEUE_LOG_PATH = process.env.ROBCO_QUEUE_LOG_PATH || path.join(REPO_ROOT, 'QUEUE_LOG.md');

function safeExists(p) {
  try {
    return fs.existsSync(p);
  } catch {
    return false;
  }
}

function safeReadDir(p) {
  try {
    return fs.readdirSync(p, { withFileTypes: true });
  } catch {
    return [];
  }
}

// Every `agent/memory` folder reachable under the base — mirrors the
// discovery shape backup-nudge.js already uses: <base>/<guidA>/<guidB>/agent/memory.
function discoverMemoryDirs(base) {
  const found = [];
  if (!safeExists(base)) return found;
  for (const a of safeReadDir(base)) {
    if (!a.isDirectory()) continue;
    const aPath = path.join(base, a.name);
    for (const b of safeReadDir(aPath)) {
      if (!b.isDirectory()) continue;
      const mem = path.join(aPath, b.name, 'agent', 'memory');
      if (safeExists(mem)) found.push(mem);
    }
  }
  return found;
}

// Minimal frontmatter parser for the fixed shape memory files are written in
// (see CLAUDE.md's auto-memory instructions) — a top-level `key: value` block
// plus an indented `metadata:` block. Not a general YAML parser; anything it
// can't confidently read is just left out of the returned object.
function parseFrontmatter(src) {
  if (!src.startsWith('---')) return null;
  const end = src.indexOf('\n---', 3);
  if (end === -1) return null;
  const block = src.slice(0, end).split('\n').slice(1);
  const top = {};
  const meta = {};
  let inMeta = false;
  for (const line of block) {
    const indented = /^\s{2,}\S/.test(line);
    const m = line.match(/^\s*([A-Za-z0-9_]+):\s*(.*)$/);
    if (!m) continue;
    const [, key, rawVal] = m;
    const val = rawVal.trim();
    if (!indented) {
      inMeta = key === 'metadata';
      if (!inMeta && val) top[key] = val;
    } else if (inMeta && val) {
      meta[key] = val;
    }
  }
  return { ...top, metadata: meta };
}

const STOPWORDS = new Set([
  'about',
  'after',
  'their',
  'there',
  'these',
  'which',
  'while',
  'would',
  'should',
  'could',
  'where',
  'across',
  'before',
  'every',
  'still',
  'never',
  'always',
  // Slug/description filler common to nearly every memory regardless of
  // subject — matching on these alone proves nothing (e.g. "project-state"
  // would trivially "match" any planning doc on the word "project").
  'project',
  'memory',
  'session',
  'general',
  'system',
  'update',
  'notes',
  'config',
  'status',
  'change',
  'feature',
]);

// Distinctive tokens, longest/rarest-first, drawn mostly from the description
// (slugs lean on generic scaffolding words; prose is more specific).
function signalTokens(fm) {
  const words = String(fm.description || '').match(/[A-Za-z]{6,}/g) || [];
  const nameWords = String(fm.name || '')
    .split(/[-_]/)
    .filter(w => w.length >= 6);
  const seen = new Set();
  const tokens = [];
  for (const w of [...words, ...nameWords]) {
    const lw = w.toLowerCase();
    if (STOPWORDS.has(lw) || seen.has(lw)) continue;
    seen.add(lw);
    tokens.push(lw);
  }
  tokens.sort((a, b) => b.length - a.length);
  return tokens.slice(0, 8);
}

// Heuristic only, not proof. Requiring a SINGLE substring hit was too
// lenient (one generic word anywhere in a 900-line QUEUE.md always "matches"
// something) — that produced false negatives, the direction that defeats the
// whole point. Require a plurality of the distinctive tokens to hit instead;
// still biased toward flagging (an empty token list is left unflagged as
// "can't determine," never silently treated as a pass).
function looksReferenced(tokens, queueTextLower) {
  if (tokens.length === 0) return true;
  const hits = tokens.filter(t => queueTextLower.includes(t)).length;
  // QUEUE.md is 900+ lines of dense prose — with only 1-2 hits required,
  // coincidental overlap on an UNRELATED memory reliably clears the bar
  // (measured: a fabricated "telemetry dashboard rewrite" memory scored 2/8
  // hits by chance alone). 3 absolute hits is a much harder coincidence,
  // while a memory with fewer than 3 signal tokens needs all of them to hit.
  const threshold = tokens.length >= 3 ? 3 : tokens.length;
  return hits >= threshold;
}

function isExempt(fm) {
  const status = String(fm.queue_status || fm.metadata.queue_status || '').toLowerCase();
  return status === 'not-applicable' || status === 'na' || status === 'skip';
}

function main() {
  if (!safeExists(QUEUE_PATH)) return; // can't determine — stay silent
  const memDirs = discoverMemoryDirs(MEMORY_BASE);
  if (memDirs.length === 0) return; // no memory store visible — stay silent

  let queueTextLower = fs.readFileSync(QUEUE_PATH, 'utf8').toLowerCase();
  if (safeExists(QUEUE_LOG_PATH)) {
    try {
      queueTextLower += '\n' + fs.readFileSync(QUEUE_LOG_PATH, 'utf8').toLowerCase();
    } catch {
      /* log optional — QUEUE.md scan alone still runs */
    }
  }
  const flagged = [];

  for (const dir of memDirs) {
    for (const entry of safeReadDir(dir)) {
      if (!entry.isFile() || !entry.name.endsWith('.md')) continue;
      if (entry.name.toUpperCase() === 'MEMORY.MD') continue;
      let src;
      try {
        src = fs.readFileSync(path.join(dir, entry.name), 'utf8');
      } catch {
        continue;
      }
      const fm = parseFrontmatter(src);
      if (!fm || fm.metadata.type !== 'project') continue;
      if (isExempt(fm)) continue;
      const tokens = signalTokens(fm);
      if (!looksReferenced(tokens, queueTextLower)) {
        flagged.push(fm.name || entry.name);
      }
    }
  }

  if (flagged.length > 0) {
    const line = '-'.repeat(72);
    process.stdout.write(
      '\n' +
        line +
        '\n' +
        '  AGENT ACTION (Protocol 50) — this reminder never blocks the push.\n' +
        '  These project-type memories do not appear referenced in QUEUE.md:\n' +
        flagged.map(n => '    - ' + n).join('\n') +
        '\n' +
        '  For each: add a QUEUE.md entry for the plan/decision it records, or\n' +
        '  mark it exempt with `queue_status: not-applicable` in its frontmatter\n' +
        '  if it genuinely is not queue-worthy (state that explicitly — do not\n' +
        '  just leave it unflagged next time).\n' +
        '  This is a word-overlap heuristic, not proof — verify before acting.\n' +
        line +
        '\n'
    );
  }
}

try {
  main();
} catch {
  // Fail-safe: a nudge must NEVER block or fail a push (Protocol 50 / 33 DNA).
}
process.exit(0);
