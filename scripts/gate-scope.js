#!/usr/bin/env node
'use strict';
/**
 * scripts/gate-scope.js — doc-only gate fast path (QUEUE.md item CPB4, Protocol 36)
 *
 * The pre-push gate's heavy checks (Playwright boot-smoke / render / a11y /
 * test.html / save-survival / offline-first) protect the *app*. They give a
 * planning-doc edit zero protection, yet a forced 3-6 minute Playwright run on
 * every queue push is exactly what makes a manual owner-authorized `--no-verify`
 * tempting on doc-only pushes. This script scopes the push: if EVERY changed
 * file across the pushed range is a documentation file, the hook runs the docs
 * gate (lint + format + Node runner + static checks — NO browser) instead of the
 * full gate. Any diff touching app code runs the FULL gate exactly as before.
 *
 * ⚠ This is a deliberate gate-weakening, so it is FAIL-CLOSED by construction:
 * on ANY uncertainty — no push payload, an unresolvable range, a new/deleted
 * ref, a git failure, an unrecognized path — it prints FULL and the complete
 * gate runs. It only ever prints DOCS_ONLY when it can positively prove every
 * changed path is a doc. A "doc" is an allowlist (*.md anywhere, or under
 * planning/**); everything else — index.html, css/**, js/**, sw.js, tests/**,
 * build/CI config, LICENSE, anything unknown — is treated as code and forces
 * the full gate. Renames are read via `git diff --no-renames`, so a moved or
 * renamed code file surfaces as delete-old + add-new (both code paths) and can
 * never slip through the fast path as "doc-only".
 *
 * Ties into the existing gate-scoping precedent (Protocol 41's `eslint .` →
 * git-tracked-manifest scoping) — same principle, applied to the push boundary.
 *
 * As a MODULE it exports the pure classifier (isDocPath / classifyPaths) for the
 * Node runner (Suite 253). As a CLI it reads the git pre-push payload from stdin,
 * resolves the changed files, and prints exactly one token — DOCS_ONLY or FULL —
 * to stdout (diagnostics go to stderr so they never pollute the token).
 */

const { execFileSync } = require('child_process');
const fs = require('fs');

const ZERO_OID = '0000000000000000000000000000000000000000';

/**
 * True only for documentation paths that are safe to skip the app-integrity
 * checks for. Deliberately an allowlist: anything not matched here is treated
 * as code (forces the full gate). Fail-closed.
 */
function isDocPath(p) {
  if (typeof p !== 'string') return false;
  const s = p.trim().replace(/\\/g, '/');
  if (!s) return false;
  // Any Markdown doc, anywhere (QUEUE.md, QUEUE_LOG.md, README/CHANGELOG/
  // ARCHITECTURE/CLAUDE, rules/*.md, skill/SKILL.md, planning/**/*.md, …).
  if (s.toLowerCase().endsWith('.md')) return true;
  // The entire planning tree (gitignored in practice, but explicit per CPB4).
  if (s.startsWith('planning/')) return true;
  return false;
}

/**
 * Classify a list of changed paths.
 *   'docs-only' — every path is a doc AND there is at least one path.
 *   'full'      — any path is not a doc, OR the list is empty/invalid.
 * Empty/invalid → 'full' is the fail-closed default: if we cannot see any
 * concrete change to prove doc-only, we run the full gate.
 */
function classifyPaths(paths) {
  if (!Array.isArray(paths) || paths.length === 0) return 'full';
  for (const p of paths) {
    if (!isDocPath(p)) return 'full';
  }
  return 'docs-only';
}

/**
 * Changed files for one pushed ref-range (remoteOid..localOid).
 * Returns an array of paths, or null on ANY uncertainty (caller → fail-closed).
 * `--no-renames` is load-bearing: it makes a rename surface as delete-old +
 * add-new so a renamed code file cannot be mistaken for a doc-only change.
 */
function changedFilesForRange(remoteOid, localOid, cwd) {
  // New branch / unknown remote tip → we cannot compute a diff → fail-closed.
  if (!remoteOid || remoteOid === ZERO_OID) return null;
  if (!localOid || localOid === ZERO_OID) return null;
  try {
    const out = execFileSync('git', ['diff', '--name-only', '--no-renames', remoteOid, localOid], {
      cwd: cwd || process.cwd(),
      encoding: 'utf8',
    });
    return out
      .split(/\r?\n/)
      .map(s => s.trim())
      .filter(Boolean);
  } catch {
    return null;
  }
}

/**
 * Resolve the whole pre-push payload (one line per pushed ref:
 * `<local ref> <local oid> <remote ref> <remote oid>`) to a single decision.
 * Any malformed line, any unresolvable range, or an empty payload → 'FULL'.
 */
function decideFromPayload(payload, cwd) {
  const lines = String(payload || '')
    .split(/\r?\n/)
    .map(l => l.trim())
    .filter(Boolean);
  if (lines.length === 0) return 'FULL'; // no payload → cannot prove doc-only

  const all = [];
  for (const line of lines) {
    const parts = line.split(/\s+/);
    if (parts.length < 4) return 'FULL'; // malformed → fail-closed
    const localOid = parts[1];
    const remoteOid = parts[3];
    const files = changedFilesForRange(remoteOid, localOid, cwd);
    if (files === null) return 'FULL'; // unresolvable range → fail-closed
    for (const f of files) all.push(f);
  }
  return classifyPaths(all) === 'docs-only' ? 'DOCS_ONLY' : 'FULL';
}

function main() {
  let payload;
  try {
    payload = fs.readFileSync(0, 'utf8'); // fd 0 = the git pre-push payload
  } catch {
    payload = '';
  }
  let decision;
  try {
    decision = decideFromPayload(payload, process.cwd());
  } catch (e) {
    // Any unexpected failure → full gate. Never let this weaken the gate.
    process.stderr.write('[gate-scope] error, defaulting to FULL: ' + (e && e.message) + '\n');
    decision = 'FULL';
  }
  process.stdout.write(decision);
}

if (require.main === module) {
  main();
}

module.exports = { isDocPath, classifyPaths, changedFilesForRange, decideFromPayload };
