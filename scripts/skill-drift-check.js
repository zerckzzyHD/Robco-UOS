#!/usr/bin/env node
/**
 * scripts/skill-drift-check.js — robco-uos SKILL staleness NUDGE.
 *
 * A pre-push REMINDER (never a gate): the `robco-uos` skill reaches a session
 * as a READ-ONLY installed cache under the desktop app's skills-plugin store.
 * No session can write that cache — only the owner can refresh it, via
 * Settings › Capabilities. The committed source of truth is `skill/SKILL.md`,
 * and the gate keeps THAT correct (Suite 243). What the gate can't see is the
 * INSTALLED copy: if the owner edited the source but hasn't re-installed, every
 * session keeps reading a stale skill. This nudge closes exactly that loop.
 *
 * SIGNAL — stale markers, not a whole-body diff. It flags only when the
 * installed cache still contains a known-stale phrase that the CURRENT
 * `skill/SKILL.md` has already removed (the old repo path, the deleted second
 * test runner, etc.). This is self-clearing by construction: the instant the
 * owner re-installs from the corrected source, the markers are gone and the
 * nudge falls silent — so it can never become a false alarm that fires forever
 * (the exact anti-pattern a nudge must avoid). A whole-body diff would, because
 * the desktop app may re-wrap frontmatter on install.
 *
 * Fail-safe by construction, same shape as scripts/backup-nudge.js and
 * scripts/queue-drift-check.js (Protocol 33/48/50 DNA):
 *   - NEVER exits non-zero and NEVER throws to the shell.
 *   - If it cannot determine state for ANY reason (the skill cache is absent,
 *     invisible to this shell, the source is missing, anything unexpected), it
 *     stays completely SILENT and lets the push proceed. A machine without the
 *     installed skill sees no difference at all.
 */
'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');

const REPO_ROOT = path.resolve(__dirname, '..');
const SOURCE_PATH = process.env.ROBCO_SKILL_SOURCE || path.join(REPO_ROOT, 'skill', 'SKILL.md');

// The skills-plugin cache lives under the desktop app's session store. GUIDs in
// the path vary by machine, so discover rather than hardcode (same lesson as
// Protocol 48's memory discovery). An env override points tests at a fixture.
const SKILL_CACHE_BASE =
  process.env.ROBCO_SKILL_CACHE_BASE ||
  path.join(
    process.env.APPDATA || path.join(os.homedir(), 'AppData', 'Roaming'),
    'Claude',
    'local-agent-mode-sessions',
    'skills-plugin'
  );

// Phrases that appeared in the STALE skill and were removed from the corrected
// source. Only markers ABSENT from the current source are used — so if a term
// legitimately returns to the source later, it stops counting as "stale"
// automatically, and this list can never contradict the committed truth.
const CANDIDATE_MARKERS = [
  '!GEM', // the old repo path (C:\Dev\!GEM\Website version)
  'Website version',
  'robco-diagnostics.ps1', // the deleted PowerShell test runner (Protocol 15 retired)
  'both runners',
  'both test runners',
  'RULES.md', // the deleted redundant rulebook pointer (R3)
];

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

function safeRead(p) {
  try {
    return fs.readFileSync(p, 'utf8');
  } catch {
    return null;
  }
}

// Find every installed robco-uos SKILL.md under the plugin store:
//   <base>/<guidA>/<guidB>/skills/robco-uos/SKILL.md
function discoverInstalledSkills(base) {
  const found = [];
  if (!safeExists(base)) return found;
  for (const a of safeReadDir(base)) {
    if (!a.isDirectory()) continue;
    const aPath = path.join(base, a.name);
    for (const b of safeReadDir(aPath)) {
      if (!b.isDirectory()) continue;
      const skill = path.join(aPath, b.name, 'skills', 'robco-uos', 'SKILL.md');
      if (safeExists(skill)) found.push(skill);
    }
  }
  return found;
}

function main() {
  const source = safeRead(SOURCE_PATH);
  if (source === null) return; // no committed source visible — can't compare, stay silent

  // Markers that are genuinely "stale": in the candidate list AND no longer in
  // the corrected source.
  const staleMarkers = CANDIDATE_MARKERS.filter(m => !source.includes(m));
  if (staleMarkers.length === 0) return; // nothing to detect

  const installed = discoverInstalledSkills(SKILL_CACHE_BASE);
  if (installed.length === 0) return; // no installed skill visible — stay silent

  const drifted = [];
  for (const p of installed) {
    const text = safeRead(p);
    if (text === null) continue;
    const hits = staleMarkers.filter(m => text.includes(m));
    if (hits.length > 0) drifted.push({ path: p, hits });
  }

  if (drifted.length > 0) {
    const line = '-'.repeat(72);
    const details = drifted
      .map(d => '    - ' + d.path + '\n        stale markers: ' + d.hits.join(', '))
      .join('\n');
    process.stdout.write(
      '\n' +
        line +
        '\n' +
        '  OWNER ACTION — this reminder never blocks the push.\n' +
        '  The INSTALLED robco-uos skill is stale (it still contains phrases the\n' +
        '  corrected source skill/SKILL.md has removed):\n' +
        details +
        '\n' +
        '  Re-install the skill from skill/SKILL.md via the desktop app:\n' +
        '  Settings > Capabilities. The committed source is guarded (Suite 243);\n' +
        '  only the installed cache needs this manual refresh.\n' +
        line +
        '\n'
    );
  }
}

try {
  main();
} catch {
  // Fail-safe: a nudge must NEVER block or fail a push (Protocol 33/48/50 DNA).
}
process.exit(0);
