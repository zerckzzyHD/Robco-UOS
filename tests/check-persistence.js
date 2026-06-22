#!/usr/bin/env node
/**
 * RobCo Persistence Audit — tests/check-persistence.js
 *
 * AUTO-DISCOVERS every field in state.js and verifies it is handled by:
 *   - autoImportState() in api.js  (AI sync, file import, cloud pull)
 *   - exportSaveFile()  in state.js (export envelope)
 *   - pushToCloud()     in cloud.js (cloud push)
 *   - handleFileUpload() in ui.js   (file import)
 *
 * If a new field is added to `state` but NOT wired into autoImportState(),
 * this script will exit with code 1 and name the missing field.
 *
 * Run:       node tests/check-persistence.js
 * Auto-run:  install as .git/hooks/pre-commit  (see README at bottom)
 *
 * Requires:  Node.js (any version). Zero npm dependencies.
 */

'use strict';
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');

// ── Terminal helpers ───────────────────────────────────────────
let passed = 0,
  failed = 0;
const green = s => `\x1b[32m${s}\x1b[0m`;
const red = s => `\x1b[31m${s}\x1b[0m`;
const dim = s => `\x1b[2m${s}\x1b[0m`;

function pass(msg) {
  console.log(green('  ✓') + dim(`  ${msg}`));
  passed++;
}
function fail(msg) {
  console.error(red('  ✗') + `  ${msg}`);
  failed++;
}
function assert(ok, msg) {
  ok ? pass(msg) : fail(msg);
}
function header(title) {
  console.log(`\n── ${title} ${'─'.repeat(50 - title.length)}`);
}

function readFile(rel) {
  const abs = path.join(ROOT, rel);
  if (!fs.existsSync(abs)) {
    fail(`Source file not found: ${rel}`);
    process.exit(1);
  }
  return fs.readFileSync(abs, 'utf8');
}

// ── AST-lite helpers ───────────────────────────────────────────

/**
 * Extract the body of a function declaration by counting braces.
 * Works for both "function foo() {" and "= function() {" forms.
 */
function extractFunctionBody(source, fnName) {
  // Try declaration form first, then assignment form
  let idx = source.indexOf(`function ${fnName}`);
  if (idx === -1) idx = source.indexOf(`function(`); // fallback for anon (unused here)
  if (idx === -1) throw new Error(`Cannot find function "${fnName}"`);

  let i = source.indexOf('{', idx);
  if (i === -1) throw new Error(`No opening brace for "${fnName}"`);
  let depth = 0;
  const start = i;
  while (i < source.length) {
    if (source[i] === '{') depth++;
    else if (source[i] === '}' && --depth === 0) return source.slice(start, i + 1);
    i++;
  }
  throw new Error(`Unclosed brace for function "${fnName}"`);
}

/**
 * Extract top-level keys from "let state = { ... };" using brace-depth tracking.
 * Handles multi-key lines, nested objects (skills, factions), and arrays.
 *
 * This is the auto-discovery engine. Adding a new field to state will
 * automatically appear in the results — no manual list to maintain.
 */
function extractStateKeys(source) {
  const startM = source.match(/let state\s*=\s*\{/);
  if (!startM) throw new Error('Cannot find "let state = {" in state.js');

  // Walk from the opening '{' and collect depth-0 identifier keys
  let i = startM.index + startM[0].length - 1; // index of '{'
  let depth = 0;
  const keys = [];
  const re = /(\{|\[|\}|\])|(\b[a-zA-Z_]\w*)\s*:/g;

  // Advance re to the correct offset inside the string
  re.lastIndex = i;
  let m;
  while ((m = re.exec(source)) !== null) {
    const bracket = m[1],
      keyName = m[2];
    if (bracket === '{' || bracket === '[') {
      depth++;
      continue;
    }
    if (bracket === '}' || bracket === ']') {
      if (--depth === 0) break;
      continue;
    }
    if (keyName && depth === 1) keys.push(keyName); // depth 1 = inside outer { }
  }
  return [...new Set(keys)];
}

/** Pull all { key: '...' } strings from FACTION_REGISTRY. */
function extractFactionKeys(source) {
  const m = source.match(/const FACTION_REGISTRY\s*=\s*\[([^]*?)\];/);
  if (!m) throw new Error('Cannot find FACTION_REGISTRY in state.js');
  return [...m[1].matchAll(/key:\s*'([^']+)'/g)].map(x => x[1]);
}

/** Pull all quoted strings from SKILL_KEYS array. */
function extractSkillKeys(source) {
  const m = source.match(/const SKILL_KEYS\s*=\s*\[([^\]]+)\]/);
  if (!m) throw new Error('Cannot find SKILL_KEYS in state.js');
  return [...m[1].matchAll(/'([^']+)'/g)].map(x => x[1]);
}

// ══════════════════════════════════════════════════════════════
//  LOAD SOURCES
// ══════════════════════════════════════════════════════════════
const stateSource = readFile('js/state.js');
const apiSource = readFile('js/api.js');
const cloudSource = readFile('js/cloud.js');
const uiSource = readFile('js/ui.js');

console.log('\n══ RobCo Persistence Audit ════════════════════════════════════\n');

// ── Discover schema ────────────────────────────────────────────
let stateKeys, factionKeys, skillKeys, importBody;
try {
  stateKeys = extractStateKeys(stateSource);
  factionKeys = extractFactionKeys(stateSource);
  skillKeys = extractSkillKeys(stateSource);
  importBody = extractFunctionBody(apiSource, 'autoImportState');
} catch (e) {
  console.error(red(`FATAL — parser error: ${e.message}`));
  process.exit(1);
}

console.log(`  Auto-discovered ${stateKeys.length} top-level state keys:`);
console.log(dim(`  [ ${stateKeys.join(', ')} ]`));
console.log(`  ${factionKeys.length} faction keys  |  ${skillKeys.length} skill keys\n`);

// ══════════════════════════════════════════════════════════════
//  SUITE 0 — Parser sanity (guards against regex regression)
//  If this suite fails, the test itself is broken, not your code.
// ══════════════════════════════════════════════════════════════
header('Parser sanity');
const KNOWN_KEYS = [
  'lvl',
  'xp',
  'hpCur',
  'hpMax',
  's',
  'p',
  'e',
  'c',
  'i',
  'a',
  'l',
  'caps',
  'loc',
  'rads',
  'karma',
  'ticks',
  'la',
  'ra',
  'll',
  'rl',
  'hd',
  'factions',
  'skills',
  'status',
  'inventory',
  'squad',
  'campaign_notes',
];
for (const k of KNOWN_KEYS) {
  assert(stateKeys.includes(k), `Parser found known key: state.${k}`);
}

// ══════════════════════════════════════════════════════════════
//  SUITE 1 — Every state key is referenced in autoImportState()
//  This is the core auto-discovery suite.
//  Adding a new key to `state` and NOT wiring it here → FAIL.
// ══════════════════════════════════════════════════════════════
header('autoImportState() field coverage  ← core auto-discovery');
for (const key of stateKeys) {
  // Case-insensitive word-boundary search covers:
  //   flat.hpcur  (lowercase from the flatten() step)
  //   parsed.factions, parsed.skills, parsed.inventory, etc.
  //   'la','ra','ll','rl','hd'  (string array literals)
  //   's','p','e','c','i','a','l'  (string array literals)
  const found = new RegExp(`\\b${key}\\b`, 'i').test(importBody);
  assert(found, `state.${key}`);
}

// ══════════════════════════════════════════════════════════════
//  SUITE 2 — FACTION_REGISTRY completeness
// ══════════════════════════════════════════════════════════════
header('FACTION_REGISTRY completeness');
const EXPECTED_FACTIONS = [
  // Major (6)
  'ncr',
  'legion',
  'house',
  'bos',
  'boomers',
  'khans',
  // Minor (8)
  'followers',
  'powder',
  'kings',
  'wgs',
  'vangraff',
  'crimson',
  'chairmen',
  'omertas',
];
for (const key of EXPECTED_FACTIONS) {
  assert(factionKeys.includes(key), `FACTION_REGISTRY key: "${key}"`);
}
assert(
  /FACTION_REGISTRY\.forEach/.test(importBody) && /parsed\.factions/.test(importBody),
  'autoImportState() imports all factions via FACTION_REGISTRY.forEach'
);
assert(
  factionKeys.length === EXPECTED_FACTIONS.length,
  `FACTION_REGISTRY has exactly ${EXPECTED_FACTIONS.length} factions (${factionKeys.length} found)`
);

// ══════════════════════════════════════════════════════════════
//  SUITE 3 — SKILL_KEYS completeness
// ══════════════════════════════════════════════════════════════
header('SKILL_KEYS completeness');
const EXPECTED_SKILLS = [
  'barter',
  'energy_weapons',
  'explosives',
  'guns',
  'lockpick',
  'medicine',
  'melee_weapons',
  'repair',
  'science',
  'sneak',
  'speech',
  'survival',
  'unarmed',
];
for (const key of EXPECTED_SKILLS) {
  assert(skillKeys.includes(key), `SKILL_KEYS entry: "${key}"`);
}
assert(
  /SKILL_KEYS\.forEach/.test(importBody) && /parsed\.skills/.test(importBody),
  'autoImportState() imports all skills via SKILL_KEYS.forEach'
);

// ══════════════════════════════════════════════════════════════
//  SUITE 4 — Save export envelope (state.js exportSaveFile)
// ══════════════════════════════════════════════════════════════
header('exportSaveFile() envelope');
let exportBody = '';
try {
  exportBody = extractFunctionBody(stateSource, 'exportSaveFile');
} catch (e) {
  fail(`Cannot extract exportSaveFile: ${e.message}`);
}

assert(/state\s*:\s*state\b/.test(exportBody), 'serialises full state object');
assert(/chat\s*:\s*chatHistory/.test(exportBody), 'includes chat history');
assert(/playstyle/.test(exportBody), 'includes playstyle');
assert(/version/.test(exportBody), 'includes version tag (envelope detection)');

// ══════════════════════════════════════════════════════════════
//  SUITE 5 — File import (ui.js handleFileUpload)
// ══════════════════════════════════════════════════════════════
header('handleFileUpload() import');
let fileImportBody = '';
try {
  fileImportBody = extractFunctionBody(uiSource, 'handleFileUpload');
} catch (e) {
  fail(`Cannot extract handleFileUpload: ${e.message}`);
}

assert(
  /parsed\.version/.test(fileImportBody) && /parsed\.state/.test(fileImportBody),
  'detects v1.6.3+ envelope format'
);
assert(/restoreChatHistory/.test(fileImportBody), 'restores chat history');
assert(/parsed\.playstyle/.test(fileImportBody), 'restores playstyle');
assert(/autoImportState/.test(fileImportBody), 'calls autoImportState() for game state');

// ══════════════════════════════════════════════════════════════
//  SUITE 6 — Cloud sync (cloud.js)
// ══════════════════════════════════════════════════════════════
header('cloud.js push / pull');
assert(/state\s*:\s*stateObj/.test(cloudSource), 'pushToCloud() serialises full state');
assert(/chat\s*:\s*JSON\.parse/.test(cloudSource), 'pushToCloud() includes chat history');
assert(/playstyle/.test(cloudSource), 'pushToCloud() includes playstyle');
assert(
  /data\.version/.test(cloudSource) && /data\.state/.test(cloudSource),
  'pullFromCloud() detects envelope format'
);
assert(/restoreChatHistory/.test(cloudSource), 'pullFromCloud() restores chat history');
assert(/robco_playstyle/.test(cloudSource), 'pullFromCloud() restores playstyle');

// ══════════════════════════════════════════════════════════════
//  SUITE 7 — Backward compatibility / migration
// ══════════════════════════════════════════════════════════════
header('Backward compatibility');
assert(
  /state\.nf\s*!==\s*undefined/.test(uiSource),
  'onload migrates legacy nf/ni/lf/li/sf/si → state.factions'
);
assert(
  /legacy.*flat.*key|flat.*key.*fallback/i.test(apiSource),
  'autoImportState() has legacy flat-key fallback for old AI responses'
);

// ══════════════════════════════════════════════════════════════
//  RESULTS
// ══════════════════════════════════════════════════════════════
console.log('\n══════════════════════════════════════════════════════════════\n');
if (failed === 0) {
  console.log(green(`  ALL ${passed} TESTS PASSED — persistence fully verified.`));
  console.log(dim('  Every state field is covered by autoImportState, export, and cloud sync.\n'));
  process.exit(0);
} else {
  console.error(red(`  ${failed} TEST(S) FAILED  (${passed} passed)`));
  console.error(red('  Fields marked ✗ are missing from autoImportState() or the save envelope.'));
  console.error(dim('  Add them to autoImportState() in js/api.js then re-run.\n'));
  process.exit(1);
}

/*
 * ──────────────────────────────────────────────────────────────
 *  HOW TO MAKE THIS A PERMANENT SAFEGUARD (git pre-commit hook)
 * ──────────────────────────────────────────────────────────────
 *
 *  1. Open a terminal in the repository root.
 *
 *  2. Run this one-time command to create the hook:
 *
 *       node -e "
 *         const fs = require('fs');
 *         const hook = '#!/bin/sh\nnode tests/check-persistence.js\n';
 *         fs.mkdirSync('.git/hooks', {recursive:true});
 *         fs.writeFileSync('.git/hooks/pre-commit', hook);
 *         fs.chmodSync('.git/hooks/pre-commit', 0o755);
 *         console.log('Hook installed.');
 *       "
 *
 *  3. From now on, every `git commit` will run this audit first.
 *     If any state field is not persisted, the commit is BLOCKED
 *     until you fix the coverage and re-commit.
 *
 *  To uninstall:  del .git\hooks\pre-commit
 * ──────────────────────────────────────────────────────────────
 */
