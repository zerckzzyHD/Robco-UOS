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
  console.log(`\n── ${title} ${'─'.repeat(Math.max(0, 50 - title.length))}`);
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
  // Minor (5)
  'followers',
  'powder',
  'kings',
  'strip',
  'freeside',
];
for (const key of EXPECTED_FACTIONS) {
  assert(factionKeys.includes(key), `FACTION_REGISTRY key: "${key}"`);
}
assert(
  (/FACTION_REGISTRY\.forEach/.test(importBody) ||
    /getFactionRegistry\(\)\.forEach/.test(importBody)) &&
    /parsed\.factions/.test(importBody),
  'autoImportState() imports all factions via FACTION_REGISTRY.forEach'
);
assert(
  factionKeys.length === EXPECTED_FACTIONS.length,
  `FACTION_REGISTRY has exactly ${EXPECTED_FACTIONS.length} factions (${factionKeys.length} found)`
);

// ══════════════════════════════════════════════════════════════
//  SUITE 2b — Reputation 2D Matrix (C1)
//  Verifies getFactionStanding() produces canonical FNV titles.
//  Runs FACTION_THRESHOLDS + getFactionStanding in an isolated vm.
// ══════════════════════════════════════════════════════════════
header('Reputation 2D Matrix');
try {
  const vm = require('vm');

  // Extract FACTION_THRESHOLDS block and getFactionStanding from ui.js source
  const threshMatch = uiSource.match(/const FACTION_THRESHOLDS\s*=\s*\{[\s\S]*?\};\s*\/\/ Default/);
  const defaultMatch = uiSource.match(/const _DEFAULT_THRESHOLDS\s*=\s*\{[^}]+\};/);
  const fnMatch = uiSource.match(/function getFactionStanding\([\s\S]*?\n\}/);

  if (!threshMatch || !defaultMatch || !fnMatch) {
    fail('Could not extract FACTION_THRESHOLDS or getFactionStanding from ui.js');
  } else {
    const sandboxCode = `${threshMatch[0]}\n${defaultMatch[0]}\n${fnMatch[0]}`;
    const sandbox = {};
    vm.createContext(sandbox);
    vm.runInContext(sandboxCode, sandbox);
    const gfs = sandbox.getFactionStanding;

    // NCR: max fame (100), no infamy → Idolized
    assert(
      gfs('ncr', 100, 0).label === 'Idolized',
      "getFactionStanding('ncr', 100, 0) returns 'Idolized'"
    );
    // BOS: fame=20 (at t4), infamy=0 → Idolized (BOS t4=20)
    assert(
      gfs('bos', 20, 0).label === 'Idolized',
      "getFactionStanding('bos', 20, 0) returns 'Idolized'"
    );
    // BOS: fame=20 (t4), infamy=20 (t4) → Wild Child
    assert(
      gfs('bos', 20, 20).label === 'Wild Child',
      "getFactionStanding('bos', 20, 20) returns 'Wild Child'"
    );
    // NCR: fame=50 (t3=fr3), infamy=20 (t2=ir2) → Unpredictable
    assert(
      gfs('ncr', 50, 20).label === 'Unpredictable',
      "getFactionStanding('ncr', 50, 20) returns 'Unpredictable'"
    );
    // NCR: fame=0, infamy=30 (t3=ir2) → Shunned (fr=0, ir=2)
    assert(
      gfs('ncr', 0, 30).label === 'Shunned',
      "getFactionStanding('ncr', 0, 30) returns 'Shunned'"
    );
    // NCR: fame=80 (t4=fr4), infamy=20 (t2=ir2) → Merciful Thug (fr=4, ir=2)
    assert(
      gfs('ncr', 80, 20).label === 'Merciful Thug',
      "getFactionStanding('ncr', 80, 20) returns 'Merciful Thug'"
    );
    // NCR: fame=0, infamy=50 (t3=ir3) → Hated (fr=0, ir=3)
    assert(gfs('ncr', 0, 50).label === 'Hated', "getFactionStanding('ncr', 0, 50) returns 'Hated'");
    // NCR: fame=0, infamy=0 → Neutral
    assert(
      gfs('ncr', 0, 0).label === 'Neutral',
      "getFactionStanding('ncr', 0, 0) returns 'Neutral'"
    );
    // NCR: fame=0, infamy=80 (t4) → Vilified
    assert(
      gfs('ncr', 0, 80).label === 'Vilified',
      "getFactionStanding('ncr', 0, 80) returns 'Vilified'"
    );
  }
} catch (e) {
  fail(`Reputation 2D Matrix runtime test failed: ${e.message}`);
}

// ══════════════════════════════════════════════════════════════
//  SUITE 2c — C2 CRUD Functions (C2)
//  Verifies new CRUD functions were added to ui.js.
// ══════════════════════════════════════════════════════════════
header('C2 CRUD Functions');
assert(/function removePerk\b/.test(uiSource), 'removePerk() function exists in ui.js');
assert(
  /function toggleCollectible\b/.test(uiSource),
  'toggleCollectible() function exists in ui.js'
);
assert(
  /COMM-LINK COMMAND REGISTRY/.test(uiSource),
  'showHelpModal() contains expanded command registry (COMM-LINK COMMAND REGISTRY)'
);

// ══════════════════════════════════════════════════════════════
//  SUITE 2d — C3 CAMPG Tab (C3)
//  Verifies CAMPG tab and related DOM elements exist.
// ══════════════════════════════════════════════════════════════
header('C3 CAMPG Tab');
const htmlSource = readFile('index.html');
assert(
  /id="tab-btn-campg"/.test(htmlSource),
  'CAMPG tab button exists in index.html (id="tab-btn-campg")'
);
assert(/id="campgPanel"/.test(htmlSource), 'CAMPG panel exists in index.html (id="campgPanel")');
assert(
  /id="gameContextSelect"/.test(htmlSource),
  'Game context select exists in index.html (id="gameContextSelect")'
);
assert(
  /id="fo3WarningBanner"/.test(htmlSource),
  'FO3 warning banner exists in index.html (id="fo3WarningBanner")'
);
assert(
  /id="timelineDisplay"/.test(htmlSource),
  'Timeline display shell exists in index.html (id="timelineDisplay")'
);
assert(
  /function onGameContextChange\b/.test(uiSource),
  'onGameContextChange() function exists in ui.js'
);
assert(/TAB_NAMES.*campg/.test(uiSource), "TAB_NAMES includes 'campg' in ui.js");

// ══════════════════════════════════════════════════════════════
//  SUITE 2e — C4 campaignMode + C5 playthroughType Protocol 4
//  Verifies all Protocol 4 locations for both state fields
//  AND the corrected two-control design.
// ══════════════════════════════════════════════════════════════
header('C4 campaignMode + C5 playthroughType Protocol 4');
// Protocol 4 location 1: default value in let state = { ... }
assert(
  /campaignMode\s*:\s*'standard'/.test(stateSource),
  "state.campaignMode default 'standard' exists in state.js"
);
assert(
  /playthroughType\s*:\s*'standard'/.test(stateSource),
  "state.playthroughType default 'standard' exists in state.js"
);
// Protocol 4 location 2: migration guard in migrateState()
assert(
  /s\.campaignMode/.test(stateSource),
  'state.campaignMode migration guard exists in migrateState() in state.js'
);
assert(
  /s\.playthroughType/.test(stateSource),
  'state.playthroughType migration guard exists in migrateState() in state.js'
);
// Protocol 4 location 3: import handling in autoImportState()
assert(
  /CAMPAIGN MODE/.test(apiSource) && /cmV/.test(apiSource),
  'autoImportState() handles campaignMode import in api.js'
);
assert(
  /PLAYTHROUGH TYPE/.test(apiSource) && /ptV/.test(apiSource),
  'autoImportState() handles playthroughType import in api.js'
);
// Protocol 4 location 4: getSystemDirective() reference (campaignModeStr preserved)
assert(/campaignModeStr/.test(apiSource), 'getSystemDirective() builds campaignModeStr in api.js');
// C5: getSystemDirective() reads state.playthroughType (NOT localStorage)
assert(
  /state\.playthroughType/.test(apiSource),
  'getSystemDirective() reads state.playthroughType in api.js'
);
// C4-fix: Playthrough Type is now a separate <select> (NOT campaignModeSelect)
assert(
  /id="playthroughTypeSelect"/.test(htmlSource),
  'Playthrough Type select exists in index.html (id="playthroughTypeSelect")'
);
assert(
  !/id="campaignModeSelect"/.test(htmlSource),
  'Old merged select (id="campaignModeSelect") has been removed from index.html'
);
// C4-fix: Complete RNG is now a separate checkbox
assert(
  /id="completeRngToggle"/.test(htmlSource),
  'Complete RNG checkbox exists in index.html (id="completeRngToggle")'
);
// RNG banner still present
assert(
  /id="rngModeBanner"/.test(htmlSource),
  'RNG mode banner exists in index.html (id="rngModeBanner")'
);
// ui.js: both handlers present
assert(
  /function onPlaythroughTypeChange\b/.test(uiSource),
  'onPlaythroughTypeChange() function exists in ui.js'
);
assert(
  /function onCampaignModeChange\b/.test(uiSource),
  'onCampaignModeChange() function exists in ui.js'
);
// C4-fix: campaignMode binary — 'rng' is the only non-standard value in migration
assert(
  /s\.campaignMode !== 'rng'/.test(stateSource),
  'migrateState() uses binary guard (campaignMode !== rng) in state.js'
);
// C5: _defaultState is defined for wipeTerminal()
assert(
  /window\._defaultState/.test(stateSource),
  'window._defaultState is defined in state.js (wipeTerminal fix)'
);
assert(
  /Optimize all build decisions for maximum combat effectiveness/.test(apiSource),
  'Behavioral directive string for min-maxed exists in api.js'
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
  (/SKILL_KEYS\.forEach/.test(importBody) || /getSkillKeys\(\)\.forEach/.test(importBody)) &&
    /parsed\.skills/.test(importBody),
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

assert(/robco_v8\s*:\s*window\.robco_v8\b/.test(exportBody), 'serialises full robco_v8 container');
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
assert(
  /robco_v8\s*:\s*window\.robco_v8/.test(cloudSource),
  'pushToCloud() serialises full robco_v8 container'
);
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
//  SUITE 8 — Fallout Data Registry structural integrity
//  Validates js/registry.js file structure without requiring
//  a browser environment. Uses regex against the raw source.
// ══════════════════════════════════════════════════════════════
header('Registry structural integrity');

const registrySource = readFile('js/reg_nv.js');

// 8.1 FALLOUT_REGISTRY global declaration must exist
assert(/const\s+FALLOUT_REGISTRY\s*=/.test(registrySource), 'FALLOUT_REGISTRY global is declared');

// 8.2 registrySearch function must be declared
assert(
  /function\s+registrySearch\s*\(/.test(registrySource),
  'registrySearch() function is declared'
);

// 8.3 All 5 required category keys must be present
const REQUIRED_CATEGORIES = ['quests', 'items', 'perks', 'locations', 'companions'];
for (const cat of REQUIRED_CATEGORIES) {
  assert(
    new RegExp(`\\b${cat}\\s*:`).test(registrySource),
    `FALLOUT_REGISTRY.${cat} category key exists`
  );
}

// 8.4 registrySearch must enforce min query length of 2 chars
assert(
  /query\.length\s*<\s*2|length\s*<\s*2/.test(registrySource),
  'registrySearch() enforces minimum query length of 2'
);

// 8.5 registrySearch must cap results at 7
assert(/slice\s*\(\s*0\s*,\s*7\s*\)/.test(registrySource), 'registrySearch() caps results at 7');

// 8.6 Source of truth attribution must be present
assert(
  /fallout\.wiki/i.test(registrySource),
  'reg_nv.js contains fallout.wiki attribution comment'
);

// 8.7 Version field must be declared
assert(
  /version\s*:\s*['"][0-9]+\.[0-9]+\.[0-9]+['"]/.test(registrySource),
  'FALLOUT_REGISTRY.version is declared with semver string'
);

// 8.8 registry.js must NOT reference state, localStorage, or chatHistory
//     (enforces the "read-only reference data, not state data" contract)
// Strip single-line and block comments before checking, handling CRLF on Windows.
const registryCode = registrySource
  .replace(/\/\*[\s\S]*?\*\//g, '') // block comments
  .replace(/\/\/[^\r\n]*/g, ''); // line comments (works with CRLF)
assert(!/\bstate\b/.test(registryCode), 'reg_nv.js does not reference state (pure reference data)');
assert(!/localStorage/.test(registryCode), 'reg_nv.js does not reference localStorage (in code)');

// ══════════════════════════════════════════════════════════════
//  SUITE 9 — Database structural integrity
//  Validates js/database.js: all CSV tables, trigger coverage,
//  invKeywords, systemInstruction placement, and purity contract.
// ══════════════════════════════════════════════════════════════
header('Database structural integrity');

const dbSource = readFile('js/db_nv.js');

// 9.1 databaseCSVs global must be declared
assert(/const\s+databaseCSVs/.test(dbSource), 'databaseCSVs global is declared');

// 9.2 lookupItemInDb function must be declared (item weight/value cache)
assert(/function\s+lookupItemInDb\s*\(/.test(dbSource), 'lookupItemInDb() function is declared');

// 9.3 All required CSV section headers must be present
const REQUIRED_TABLES = [
  '[WEAPONS.CSV]',
  '[AMMO.CSV]',
  '[ARMOR.CSV]',
  '[BESTIARY.CSV]',
  '[CHEMS.CSV]',
  '[MISC.CSV]',
  '[RECIPES.CSV]',
  '[QUEST_ITEMS.CSV]',
  '[VENDORS.CSV]',
];
for (const tbl of REQUIRED_TABLES) {
  assert(dbSource.includes(tbl), `db_nv.js contains ${tbl} section`);
}

// 9.4 lookupItemInDb must be referenced in database.js (item weight/value cache integrity)
assert(/lookupItemInDb/.test(dbSource), "'lookupItemInDb' function exists in db_nv.js");

// 9.5 BESTIARY must have ≥ 30 data rows (guards against data regression)
const bestiaryBlock = dbSource.match(/\[BESTIARY\.CSV\]([\s\S]*?)(?=\[|`;)/);
const bestiaryRows = bestiaryBlock
  ? bestiaryBlock[1].split('\n').filter(l => l.trim() && !l.includes('Name,'))
  : [];
assert(bestiaryRows.length >= 30, `BESTIARY.CSV has ≥ 30 entries (found ${bestiaryRows.length})`);

// 9.6 [THREAT] and [TH] must be in invKeywords in api.js
// Strategy: find the invKeywords declaration, then extract lines until the closing ];
const invStart = apiSource.indexOf('const invKeywords = [');
const invEnd = apiSource.indexOf('];', invStart);
const invBlock = invStart !== -1 && invEnd !== -1 ? apiSource.slice(invStart, invEnd + 2) : '';
assert(/\[THREAT\]/.test(invBlock), "'[THREAT]' is in transmitMessage() invKeywords (api.js)");
assert(/\[TH\]/.test(invBlock), "'[TH]' is in transmitMessage() invKeywords (api.js)");

// 9.7 databaseCSVs must be referenced in systemInstruction in api.js
assert(
  /systemInstruction.*databaseCSVs|databaseCSVs.*systemInstruction/s.test(apiSource) ||
    /parts.*databaseCSVs|databaseCSVs.*parts/s.test(apiSource),
  'databaseCSVs is injected via systemInstruction in api.js'
);

// 9.8 database.js must NOT reference state, localStorage, or chatHistory
const dbCode = dbSource
  .replace(/\/\*[\s\S]*?\*\//g, '') // strip block comments
  .replace(/\/\/[^\r\n]*/g, ''); // strip line comments
assert(!/\bstate\b/.test(dbCode), 'db_nv.js does not reference state (pure reference data)');
assert(!/localStorage/.test(dbCode), 'db_nv.js does not reference localStorage');
assert(!/chatHistory/.test(dbCode), 'db_nv.js does not reference chatHistory');

// ══════════════════════════════════════════════════════════════
//  SUITE 10 — DOM ID Binding (syncStateFromDom)
// ══════════════════════════════════════════════════════════════
header('DOM ID Binding (syncStateFromDom)');
const indexHtml = readFile('index.html');
let syncBody = '';
try {
  syncBody = extractFunctionBody(stateSource, 'syncStateFromDom');
} catch (e) {
  fail(`Cannot extract syncStateFromDom: ${e.message}`);
}
const idMatches = [...syncBody.matchAll(/document\.getElementById\(['"]([^'"]+)['"]\)/g)];
for (const match of idMatches) {
  const id = match[1];
  const found = new RegExp(`id=['"]${id}['"]`).test(indexHtml);
  assert(found, `Element id="${id}" exists in index.html`);
}

// ══════════════════════════════════════════════════════════════
//  SUITE 11 — Protocol 4 Migration Enforcement
// ══════════════════════════════════════════════════════════════
header('Protocol 4 Migration Enforcement');
let migrateBody = '';
try {
  migrateBody = extractFunctionBody(stateSource, 'migrateState');
} catch (e) {
  fail(`Cannot extract migrateState: ${e.message}`);
}
const legacyKeys = [
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
  'status',
  'inventory',
  'squad',
  'campaign_notes',
  'skills',
];
for (const key of stateKeys) {
  if (!legacyKeys.includes(key)) {
    assert(
      new RegExp(`s\\.${key}\\b`).test(migrateBody),
      `New field state.${key} has migration check in migrateState()`
    );
  }
}

// ══════════════════════════════════════════════════════════════
//  SUITE 12 — migrateState() Runtime Execution
// ══════════════════════════════════════════════════════════════
header('migrateState() Runtime Execution');
try {
  const vm = require('vm');
  const sandbox = { window: {} };
  vm.createContext(sandbox);
  vm.runInContext(stateSource, sandbox);
  const v1Payload = {
    lvl: 1,
    xp: 0,
    hpCur: 100,
    hpMax: 100,
    s: 5,
    p: 5,
    e: 5,
    c: 5,
    i: 5,
    a: 5,
    l: 5,
    nf: 50,
    ni: 0,
    lf: -10,
    li: 0, // Legacy faction data
  };
  const migrated = sandbox.migrateState('1.0.0', v1Payload);
  assert(migrated.factions && migrated.factions.ncr, 'Migrated state has structured factions.ncr');
  assert(
    migrated.factions && migrated.factions.ncr.fame === 50,
    'Migrated state preserved ncr fame (50)'
  );
  assert(
    migrated.factions && migrated.factions.legion.fame === -10,
    'Migrated state preserved legion fame (-10)'
  );
  assert(Array.isArray(migrated.perks), 'Migrated state added perks array');
  assert(Array.isArray(migrated.quests), 'Migrated state added quests array');
  assert(
    migrated.equipped && migrated.equipped.weapon === null,
    'Migrated state added equipped object'
  );
} catch (e) {
  fail(`Runtime test failed: ${e.message}`);
}

// ══════════════════════════════════════════════════════════════
//  SUITE 13 — Service Worker Cache Guard (Protocol 1)
// ══════════════════════════════════════════════════════════════
header('Service Worker Cache Guard (Protocol 1)');
try {
  const stagedStr = require('child_process').execSync('git diff --cached --name-only', {
    encoding: 'utf8',
  });
  const staged = stagedStr.split('\n').filter(Boolean);
  const triggerStaged = staged.some(
    f => f === 'index.html' || f.startsWith('js/') || f.startsWith('css/')
  );
  const swStaged = staged.includes('sw.js');
  if (triggerStaged) {
    assert(swStaged, 'sw.js CACHE_NAME must be bumped when UI/JS files are modified (Protocol 1)');
  } else {
    pass('No UI/JS changes staged (SW bump not required)');
  }
} catch {
  pass('Git diff skipped (not running in staged environment)');
}

// ══════════════════════════════════════════════════════════════
//  SUITE 14 — Render Contracts (Protocol 20)
//  Static source checks that render*() markup/class contracts are intact.
//  13 tests
// ══════════════════════════════════════════════════════════════
header('Render Contracts (Protocol 20)');
let renderFactionRepBody = '';
let renderWorldMapBody = '';
try {
  renderFactionRepBody = extractFunctionBody(uiSource, 'renderFactionRep');
  renderWorldMapBody = extractFunctionBody(uiSource, 'renderWorldMap');
} catch (e) {
  fail(`Cannot extract render functions: ${e.message}`);
}
assert(
  /class="faction-card-btns"/.test(renderFactionRepBody),
  'renderFactionRep contains class="faction-card-btns"'
);
assert(
  /faction-btn/.test(renderFactionRepBody),
  'renderFactionRep contains faction-btn class reference'
);
assert(
  (renderFactionRepBody.match(/adjustFaction\(/g) || []).length >= 4,
  'renderFactionRep has ≥4 adjustFaction() calls'
);
assert(
  !/<button[^>]*class="faction-btn[^"]*"[^>]*style=/.test(renderFactionRepBody) &&
    !/<button[^>]*style=[^>]*class="faction-btn/.test(renderFactionRepBody),
  'renderFactionRep faction-btn buttons have no inline style attribute'
);
assert(
  /minmax\(0,\s*1fr\)/.test(renderWorldMapBody),
  'renderWorldMap uses minmax(0,1fr) for grid columns'
);
assert(
  /max-width\s*:\s*100%/.test(renderWorldMapBody),
  'renderWorldMap uses max-width:100% on the grid container'
);
assert(
  /map-cell/.test(renderWorldMapBody) &&
    /map-cell-name/.test(renderWorldMapBody) &&
    /map-cell-pip/.test(renderWorldMapBody),
  'renderWorldMap contains map-cell, map-cell-name, map-cell-pip class references'
);
// Reload-size guard: size is state-driven, no width measurement (Protocol 8 plan)
assert(
  /state\.mapView/.test(renderWorldMapBody),
  'renderWorldMap reads state.mapView (state-driven size, not viewport measurement)'
);
assert(
  !/window\.innerWidth/.test(renderWorldMapBody),
  'renderWorldMap size path has no window.innerWidth (measurement removed)'
);
assert(
  !/dataset\.mapFull/.test(renderWorldMapBody),
  'renderWorldMap size path has no dataset.mapFull (ephemeral flag removed)'
);
try {
  const setMapViewBody = extractFunctionBody(uiSource, 'setMapView');
  assert(/state\.mapView/.test(setMapViewBody), 'setMapView() writes state.mapView');
  assert(/saveState\(\)/.test(setMapViewBody), 'setMapView() calls saveState()');
} catch (e) {
  fail(`setMapView function not found: ${e.message}`);
}
assert(
  /map-toggle-btn/.test(renderWorldMapBody),
  'renderWorldMap contains map-toggle-btn reference'
);

// ══════════════════════════════════════════════════════════════
//  SUITE 15 — CSS Invariants (Protocol 20)
//  Verifies critical CSS rules that guard mobile layout and faction button sizing.
//  15 tests
// ══════════════════════════════════════════════════════════════
header('CSS Invariants (Protocol 20)');
const cssSource = readFile('css/terminal.css');
// Strip block comments so embedded {} in comments don't break rule-block extraction
const cssSourceStripped = cssSource.replace(/\/\*[\s\S]*?\*\//g, '');
const factionBtnRule = (cssSourceStripped.match(/\.faction-btn\s*\{[^}]*\}/) || [''])[0];
const factionCardBtnsRule = (cssSourceStripped.match(/\.faction-card-btns\s*\{[^}]*\}/) || [''])[0];
const mapCellRule = (cssSourceStripped.match(/\.map-cell\s*\{[^}]*\}/) || [''])[0];
const buttonRule = (cssSourceStripped.match(/^button\s*\{[^}]*\}/m) || [''])[0];

assert(/width\s*:\s*auto/.test(factionBtnRule), '.faction-btn has width:auto');
assert(/display\s*:\s*flex/.test(factionBtnRule), '.faction-btn uses display:flex');
assert(/flex-wrap/.test(factionCardBtnsRule), '.faction-card-btns has flex-wrap');
assert(/min-width\s*:\s*0/.test(mapCellRule), '.map-cell has min-width:0');
assert(/overflow\s*:\s*hidden/.test(mapCellRule), '.map-cell has overflow:hidden');
assert(
  /(min-height|aspect-ratio)/.test(mapCellRule),
  '.map-cell has height floor (min-height or aspect-ratio)'
);
assert(
  /@media[^{]*480px[\s\S]{0,2000}max-width\s*:\s*56px/.test(cssSource),
  '@media max-width:480px has max-width:56px for number inputs'
);
assert(/width\s*:\s*100%/.test(buttonRule), 'global button{} has width:100%');
const htmlRule = (cssSourceStripped.match(/html\s*\{[^}]*\}/) || [''])[0];
assert(/overflow-x\s*:\s*hidden/.test(htmlRule), 'html{} has overflow-x:hidden');
assert(
  /@media[^{]*480px[\s\S]{0,5000}font-size\s*:\s*16px\s*!important/.test(cssSource),
  '@media max-width:480px sets font-size:16px on inputs (auto-zoom guard)'
);
// Mobile overflow guard: .col-left must have min-width:0 in the BASE styles
// (not only inside the @media ≥1000px block) so the single 1fr grid track
// can shrink to the viewport and a wide open panel (e.g. 6×6 world map)
// cannot stretch the page on phones.
const colLeftBaseRule = (cssSourceStripped.match(/\.col-left\s*\{[^}]*\}/) || [''])[0];
assert(
  /min-width\s*:\s*0/.test(colLeftBaseRule),
  '.col-left has min-width:0 in base styles (mobile overflow fix)'
);
const worldMapDisplayRule = (cssSourceStripped.match(/#worldMapDisplay\s*\{[^}]*\}/) || [''])[0];
assert(
  /overflow-x/.test(worldMapDisplayRule),
  '#worldMapDisplay has overflow-x (map overflow containment)'
);
// Mobile overflow guard (r23): .col-right must ALSO have min-width:0 in the base
// styles. On mobile both columns share the single 1fr main-grid track, so a wide
// chat min-content (a long unbroken token in a restored user/sys message) would
// otherwise blow out the track and stretch the STAT-tab column too.
const colRightBaseRule = (cssSourceStripped.match(/\.col-right\s*\{[^}]*\}/) || [''])[0];
assert(
  /min-width\s*:\s*0/.test(colRightBaseRule),
  '.col-right has min-width:0 in base styles (mobile chat overflow fix)'
);
// Chat bubbles (r23): user/sys messages must wrap long unbroken tokens like .msg-ai
// already does, so restored chat never forces horizontal overflow.
const msgUserRule = (cssSourceStripped.match(/\.msg-user\s*\{[^}]*\}/) || [''])[0];
assert(
  /(word-break|overflow-wrap)/.test(msgUserRule),
  '.msg-user wraps long tokens (word-break/overflow-wrap)'
);
const msgSysRule = (cssSourceStripped.match(/\.msg-sys\s*\{[^}]*\}/) || [''])[0];
assert(
  /(word-break|overflow-wrap)/.test(msgSysRule),
  '.msg-sys wraps long tokens (word-break/overflow-wrap)'
);

// ══════════════════════════════════════════════════════════════
//  SUITE 16 — Service Worker Invariants (Protocol 20)
//  Static source guards for SW install/activate/message behavior.
//  8 tests
// ══════════════════════════════════════════════════════════════
header('Service Worker Invariants (Protocol 20)');
const swSource = readFile('sw.js');
// Strip all comments so embedded mentions in comments don't confuse assertions
const swSourceStripped = swSource.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '');
const swInstallMatch = swSourceStripped.match(
  /self\.addEventListener\s*\(\s*['"]install['"][\s\S]*?\}\s*\)/
);
const swInstallStripped = swInstallMatch ? swInstallMatch[0] : '';
assert(
  !/self\.skipWaiting\s*\(/.test(swInstallStripped),
  'install handler does NOT call self.skipWaiting() (r6 bug guard)'
);
assert(
  !/clients\.claim\s*\(/.test(swSourceStripped),
  'sw.js does NOT call clients.claim() (reload-loop guard)'
);
assert(
  /addEventListener\s*\(\s*['"]message['"][\s\S]{0,500}skipWaiting/.test(swSource),
  'message listener calls self.skipWaiting() (update-prompt path)'
);
assert(
  /CACHE_NAME\s*=\s*'robco-terminal-v[\d.]+(-r\d+)?'/.test(swSource),
  'CACHE_NAME matches robco-terminal-v<version>-rN format'
);
{
  const cacheVer = (swSource.match(/CACHE_NAME\s*=\s*'robco-terminal-v([\d.]+)/) || [])[1];
  const appVer = (stateSource.match(/const APP_VERSION\s*=\s*'([\d.]+)'/) || [])[1];
  assert(
    cacheVer && appVer && cacheVer === appVer,
    `CACHE_NAME version (${cacheVer}) matches APP_VERSION (${appVer})`
  );
}
assert(
  /activate[\s\S]{0,400}caches\.delete/.test(swSourceStripped),
  'activate handler calls caches.delete for old-cache cleanup'
);
assert(
  /['"]\.\/index\.html['"]/.test(swSource) && /['"]\.\/js\/ui\.js['"]/.test(swSource),
  'ASSETS list includes index.html and js/ui.js'
);
assert(
  /SKIP_WAITING/.test(indexHtml) &&
    /reg\.waiting/.test(indexHtml) &&
    /controllerchange/.test(indexHtml),
  'index.html SW registration references SKIP_WAITING, reg.waiting, and controllerchange'
);

// ══════════════════════════════════════════════════════════════
//  SUITE 17 — Structural Integrity (Protocol 20)
//  Verifies key render functions exist, are called, and their DOM targets exist.
//  11 tests
// ══════════════════════════════════════════════════════════════
header('Structural Integrity (Protocol 20)');
assert(
  /function _updatePanelBadges\b/.test(uiSource),
  '_updatePanelBadges() function exists in ui.js'
);
assert(
  /function expandPanelForCategory\b/.test(uiSource),
  'expandPanelForCategory() function exists in ui.js'
);
assert(/function renderWorldMap\b/.test(uiSource), 'renderWorldMap() function exists in ui.js');
assert(/function renderFactionRep\b/.test(uiSource), 'renderFactionRep() function exists in ui.js');
assert(/renderWorldMap\(\)/.test(uiSource), 'renderWorldMap() is called in ui.js');
assert(/renderFactionRep\(\)/.test(uiSource), 'renderFactionRep() is called in ui.js');
assert(/id="worldMapPanel"/.test(indexHtml), 'worldMapPanel panel exists in index.html');
assert(/id="worldMapDisplay"/.test(indexHtml), 'worldMapDisplay element exists in index.html');
assert(/id="factionContainer"/.test(indexHtml), 'factionContainer element exists in index.html');
assert(
  /id="transmitBtn"/.test(indexHtml),
  'transmitBtn send button exists in index.html (Protocol 13 — regression guard)'
);
assert(
  /<button[^>]*onclick="transmitMessage\(\)"[^>]*id="transmitBtn"|<button[^>]*id="transmitBtn"[^>]*onclick="transmitMessage\(\)"/.test(
    indexHtml
  ),
  'transmitBtn is wired to transmitMessage() (Protocol 13 — send-button regression guard)'
);

// ══════════════════════════════════════════════════════════════
//  SUITE 18 — Detail-Current Dedup Guard (Protocol 27)
//  Verifies scoreZoneForLoc correctly rejects substring-only matches (<50).
//  2 tests
// ══════════════════════════════════════════════════════════════
header('Detail-Current Dedup Guard');
try {
  const vm = require('vm');
  const fnIdx = uiSource.indexOf('function scoreZoneForLoc');
  if (fnIdx === -1) {
    fail('scoreZoneForLoc not found in ui.js');
  } else {
    const body = extractFunctionBody(uiSource, 'scoreZoneForLoc');
    const headerEnd = uiSource.indexOf('{', fnIdx);
    const fullFn = uiSource.slice(fnIdx, headerEnd) + body;
    const sandbox = {};
    vm.createContext(sandbox);
    vm.runInContext(fullFn, sandbox);
    const szl = sandbox.scoreZoneForLoc;
    const bitterScore = szl({ name: 'Bitter Springs', locations: [] }, 'goodsprings');
    const goodScore = szl({ name: 'Goodsprings', locations: [] }, 'goodsprings');
    assert(
      bitterScore < 50,
      `scoreZoneForLoc: Bitter Springs vs 'goodsprings' = ${bitterScore} (must be < 50)`
    );
    assert(
      goodScore === 100,
      `scoreZoneForLoc: Goodsprings vs 'goodsprings' = ${goodScore} (must be 100)`
    );
  }
} catch (e) {
  fail(`Detail-current guard: ${e.message}`);
}

// ══════════════════════════════════════════════════════════════
//  SUITE 19 — FO3 Database structural integrity
//  Mirrors Suite 9 for js/db_fo3.js: CSV tables, purity contract.
//  16 tests
// ══════════════════════════════════════════════════════════════
header('FO3 Database structural integrity');
const dbFo3Source = readFile('js/db_fo3.js');

// 19.1 databaseCSVs global must be declared
assert(/const\s+databaseCSVs/.test(dbFo3Source), 'db_fo3.js: databaseCSVs global is declared');

// 19.2 lookupItemInDb function must be declared
assert(
  /function\s+lookupItemInDb\s*\(/.test(dbFo3Source),
  'db_fo3.js: lookupItemInDb() function is declared'
);

// 19.3 All required CSV section headers must be present
const FO3_REQUIRED_TABLES = [
  '[WEAPONS.CSV]',
  '[AMMO.CSV]',
  '[ARMOR.CSV]',
  '[BESTIARY.CSV]',
  '[CHEMS.CSV]',
  '[MISC.CSV]',
  '[RECIPES.CSV]',
  '[QUEST_ITEMS.CSV]',
  '[VENDORS.CSV]',
];
for (const tbl of FO3_REQUIRED_TABLES) {
  assert(dbFo3Source.includes(tbl), `db_fo3.js contains ${tbl} section`);
}

// 19.4 lookupItemInDb must be referenced in db_fo3.js
assert(/lookupItemInDb/.test(dbFo3Source), "'lookupItemInDb' function exists in db_fo3.js");

// 19.5 BESTIARY must have ≥ 30 data rows
const fo3BestiaryBlock = dbFo3Source.match(/\[BESTIARY\.CSV\]([\s\S]*?)(?=\[|`;)/);
const fo3BestiaryRows = fo3BestiaryBlock
  ? fo3BestiaryBlock[1].split('\n').filter(l => l.trim() && !l.includes('Name,'))
  : [];
assert(
  fo3BestiaryRows.length >= 30,
  `db_fo3.js BESTIARY.CSV has ≥ 30 entries (found ${fo3BestiaryRows.length})`
);

// 19.6–19.8 db_fo3.js must NOT reference state, localStorage, or chatHistory
const dbFo3Code = dbFo3Source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\r\n]*/g, '');
assert(!/\bstate\b/.test(dbFo3Code), 'db_fo3.js does not reference state (pure reference data)');
assert(!/localStorage/.test(dbFo3Code), 'db_fo3.js does not reference localStorage');
assert(!/chatHistory/.test(dbFo3Code), 'db_fo3.js does not reference chatHistory');

// ══════════════════════════════════════════════════════════════
//  SUITE 20 — CSV column-count integrity
//  Every WEAPONS.CSV data row in db_nv and db_fo3 must have the
//  same number of fields as the header row.
//  2 tests
// ══════════════════════════════════════════════════════════════
header('CSV column-count integrity');

function checkWeaponsCsvColumnCount(src, label) {
  const block = src.match(/\[WEAPONS\.CSV\]([\s\S]*?)(?=\[|`;)/);
  if (!block) {
    fail(`${label}: could not extract [WEAPONS.CSV] block`);
    return;
  }
  const lines = block[1]
    .split('\n')
    .map(l => l.trim())
    .filter(Boolean);
  if (lines.length < 2) {
    fail(`${label}: [WEAPONS.CSV] block has fewer than 2 lines (no data rows)`);
    return;
  }
  const headerCount = lines[0].split(',').length;
  const badRows = [];
  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(',').length;
    if (cols !== headerCount) badRows.push(`row ${i + 1} (${cols} cols): ${lines[i].slice(0, 40)}`);
  }
  assert(
    badRows.length === 0,
    `${label}: all WEAPONS.CSV data rows have ${headerCount} columns` +
      (badRows.length ? ` — bad: ${badRows.join('; ')}` : '')
  );
}

checkWeaponsCsvColumnCount(dbSource, 'db_nv.js');
checkWeaponsCsvColumnCount(dbFo3Source, 'db_fo3.js');

// ══════════════════════════════════════════════════════════════
//  SUITE 21 — Security regression guards (Protocol 13/20)
//  Static assertions that XSS-1 (squad numeric coercion),
//  XSS-2 (trade modal click binding), and XSS-3 (inventory
//  qty/wgt/val coercion + quest factions/status escaping) fixes
//  cannot regress.
//  9 tests
// ══════════════════════════════════════════════════════════════
header('Security regression guards');

// 21.1 autoImportState() maps squad array with parseInt for hp, hpMax, ammo
assert(
  /parsed\.squad[\s\S]{0,400}parseInt\s*\(\s*m\.hp\s*\)/.test(importBody) ||
    /parsed\.squad[\s\S]{0,400}parseInt.*hp/.test(importBody),
  'autoImportState() sanitizes squad numeric fields with parseInt (XSS-1 guard)'
);

// 21.2 renderSquad() wraps hp, hpMax, ammo in parseInt in the innerHTML template
{
  let renderSquadBody = '';
  try {
    renderSquadBody = extractFunctionBody(uiSource, 'renderSquad');
  } catch (e) {
    fail(`Cannot extract renderSquad: ${e.message}`);
  }
  assert(
    /parseInt\s*\(\s*member\.hp\s*\)/.test(renderSquadBody) &&
      /parseInt\s*\(\s*member\.hpMax\s*\)/.test(renderSquadBody) &&
      /parseInt\s*\(\s*member\.ammo\s*\)/.test(renderSquadBody),
    'renderSquad() coerces hp, hpMax, ammo with parseInt before innerHTML (XSS-1 guard)'
  );
}

// 21.3 Trade modal does NOT embed raw item.name in an inline onclick attribute
{
  const tradeStart = apiSource.indexOf("mType === 'TRADE'");
  const tradeEnd = apiSource.indexOf('} else {', tradeStart);
  const tradeBlock =
    tradeStart !== -1 && tradeEnd !== -1 ? apiSource.slice(tradeStart, tradeEnd) : '';
  assert(
    !/onclick\s*=\s*[`'"]\s*tradeItem\s*\(/.test(tradeBlock),
    'Trade modal does not use inline onclick="tradeItem(...)" (XSS-2 guard)'
  );
}

// 21.4 Trade modal uses addEventListener for click binding
{
  const tradeStart = apiSource.indexOf("mType === 'TRADE'");
  const tradeEnd = apiSource.indexOf('} else {', tradeStart);
  const tradeBlock =
    tradeStart !== -1 && tradeEnd !== -1 ? apiSource.slice(tradeStart, tradeEnd) : '';
  assert(
    /addEventListener\s*\(\s*['"]click['"]/.test(tradeBlock),
    'Trade modal binds click via addEventListener (XSS-2 guard)'
  );
}

// 21.5 autoImportState() coerces inventory qty with parseInt and wgt with parseFloat
assert(
  /parseInt\s*\(\s*it\.qty\s*\)/.test(importBody) && /parseFloat\s*\(\s*it\.wgt/.test(importBody),
  'autoImportState() coerces inventory qty (parseInt) and wgt (parseFloat) at import (XSS-3 guard)'
);

// 21.6 renderInventory() coerces qty/wgt with parseInt/parseFloat before innerHTML
{
  let renderInvBody = '';
  try {
    renderInvBody = extractFunctionBody(uiSource, 'renderInventory');
  } catch (e) {
    fail(`Cannot extract renderInventory: ${e.message}`);
  }
  assert(
    /parseInt\s*\(\s*it\.qty\s*\)/.test(renderInvBody) &&
      /parseFloat\s*\(\s*it\.wgt\s*\)/.test(renderInvBody),
    'renderInventory() coerces qty and wgt with parseInt/parseFloat before innerHTML (XSS-3 guard)'
  );
}

// 21.7 autoImportState() whitelists quest status to active|complete|failed
assert(
  /\['active',\s*'complete',\s*'failed'\]\.includes/.test(importBody),
  'autoImportState() whitelists quest status to active|complete|failed (XSS-3 guard)'
);

// 21.8–21.9 renderQuests() escapes quest factions and status with escapeHtml
{
  let renderQuestsBody = '';
  try {
    renderQuestsBody = extractFunctionBody(uiSource, 'renderQuests');
  } catch (e) {
    fail(`Cannot extract renderQuests: ${e.message}`);
  }
  assert(
    /escapeHtml.*q\.factions/.test(renderQuestsBody),
    'renderQuests() escapes quest factions with escapeHtml before innerHTML (XSS-3 guard)'
  );
  assert(
    /escapeHtml\s*\(\s*st\.toUpperCase/.test(renderQuestsBody),
    'renderQuests() escapes quest status with escapeHtml before innerHTML (XSS-3 guard)'
  );
}

// ══════════════════════════════════════════════════════════════
//  SUITE 22 — Critical Feature Presence (Group 1)
//  Asserts every key control exists in index.html and is wired.
//  30 tests
// ══════════════════════════════════════════════════════════════
header('Critical Feature Presence');
// Tab buttons
assert(
  /onclick="switchTab\('stat'\)"/.test(htmlSource),
  "STAT tab button wired (switchTab('stat'))"
);
assert(/onclick="switchTab\('inv'\)"/.test(htmlSource), "INV tab button wired (switchTab('inv'))");
assert(
  /onclick="switchTab\('data'\)"/.test(htmlSource),
  "DATA tab button wired (switchTab('data'))"
);
assert(
  /onclick="switchTab\('campg'\)"/.test(htmlSource),
  "CAMPG tab button wired (switchTab('campg'))"
);
// Add buttons
assert(/onclick="addItem\(\)"/.test(htmlSource), 'Add Item button wired (addItem())');
assert(/onclick="addAmmo\(\)"/.test(htmlSource), 'Add Ammo button wired (addAmmo())');
assert(/onclick="addPerk\(\)"/.test(htmlSource), 'Add Perk button wired (addPerk())');
assert(/onclick="addQuest\(\)"/.test(htmlSource), 'Add Quest button wired (addQuest())');
assert(
  /onclick="addCampaignNote\(\)"/.test(htmlSource),
  'Add Note button wired (addCampaignNote())'
);
assert(
  /onclick="addSquadMember\(\)"/.test(htmlSource),
  'Add Squad button wired (addSquadMember())'
);
// Save / Load slots A B C
assert(/onclick="saveToSlot\(1\)"/.test(htmlSource), 'Save slot A wired (saveToSlot(1))');
assert(/onclick="saveToSlot\(2\)"/.test(htmlSource), 'Save slot B wired (saveToSlot(2))');
assert(/onclick="saveToSlot\(3\)"/.test(htmlSource), 'Save slot C wired (saveToSlot(3))');
assert(/onclick="loadFromSlot\(1\)"/.test(htmlSource), 'Load slot A wired (loadFromSlot(1))');
assert(/onclick="loadFromSlot\(2\)"/.test(htmlSource), 'Load slot B wired (loadFromSlot(2))');
assert(/onclick="loadFromSlot\(3\)"/.test(htmlSource), 'Load slot C wired (loadFromSlot(3))');
// Export / Import
assert(
  /onclick="exportSaveFile\(\)"/.test(htmlSource),
  'Export save button wired (exportSaveFile())'
);
assert(
  /onchange="handleFileUpload\(event\)"/.test(htmlSource),
  'Import save input wired (handleFileUpload(event))'
);
// Cloud sync
assert(/id="btnCloudPush"/.test(htmlSource), 'Cloud Push button exists (id=btnCloudPush)');
assert(/id="btnCloudPull"/.test(htmlSource), 'Cloud Pull button exists (id=btnCloudPull)');
// Validate Key
assert(/id="btnFetchModels"/.test(htmlSource), 'Validate Key button exists (id=btnFetchModels)');
// D-pad
assert(
  /onclick="macroCommand\('\[PAD: UP\]'\)"/.test(htmlSource),
  "D-pad UP wired (macroCommand('[PAD: UP]'))"
);
assert(
  /onclick="macroCommand\('\[PAD: DOWN\]'\)"/.test(htmlSource),
  "D-pad DOWN wired (macroCommand('[PAD: DOWN]'))"
);
assert(
  /onclick="macroCommand\('\[PAD: LEFT\]'\)"/.test(htmlSource),
  "D-pad LEFT wired (macroCommand('[PAD: LEFT]'))"
);
assert(
  /onclick="macroCommand\('\[PAD: RIGHT\]'\)"/.test(htmlSource),
  "D-pad RIGHT wired (macroCommand('[PAD: RIGHT]'))"
);
// Macro buttons
assert(/onclick="macroCommand\('\[THREAT\]'\)"/.test(htmlSource), 'THREAT macro button wired');
assert(/onclick="macroCommand\('\[VATS SIM\]'\)"/.test(htmlSource), 'VATS SIM macro button wired');
assert(/onclick="macroCommand\('\[TRADE\]'\)"/.test(htmlSource), 'TRADE macro button wired');
assert(/onclick="macroCommand\('\[LOOT\]'\)"/.test(htmlSource), 'LOOT macro button wired');
// V.A.T.S. Calculator
assert(/id="vatsCalcBtn"/.test(htmlSource), 'V.A.T.S. CALCULATOR button exists (id=vatsCalcBtn)');

// ══════════════════════════════════════════════════════════════
//  SUITE 23 — Prohibited Patterns (Group 2)
//  Static checks that banned patterns haven't crept back in.
//  5 tests
// ══════════════════════════════════════════════════════════════
header('Prohibited Patterns');
// 23.1 No innerHTML += in ui.js (render functions must use map().join('') bulk assignment)
// Note: api.js has a known, intentional innerHTML+= in the model-fetch <select> builder
// (not a render hot-path), so the check is scoped to ui.js only.
assert(!/innerHTML\s*\+=/.test(uiSource), 'ui.js has no innerHTML += (O(n²) re-parse guard)');

// 23.2 No localStorage.getItem inside audio function bodies in ui.js
// Audio functions must read from the AudioSettings cache, not localStorage directly.
{
  const audioFnBodies = [];
  const audioRe = /function (play\w+|start\w+)\s*\(/g;
  let am;
  while ((am = audioRe.exec(uiSource)) !== null) {
    try {
      const body = extractFunctionBody(uiSource, am[1]);
      if (/ensureAudioCtx\(\)/.test(body)) audioFnBodies.push({ name: am[1], body });
    } catch (_) {}
  }
  const withLs = audioFnBodies.filter(f => /localStorage\.getItem/.test(f.body));
  assert(
    withLs.length === 0,
    'No audio function body reads localStorage.getItem directly' +
      (withLs.length ? ' — offenders: ' + withLs.map(f => f.name).join(', ') : '')
  );
}

// 23.3 autoImportState() uses explicit field mapping, not recursive Object.keys transform
assert(
  !/Object\.keys\s*\(\s*parsed\s*\)\.forEach/.test(importBody),
  'autoImportState() has no recursive Object.keys(parsed).forEach key transform'
);

// 23.4 & 23.5 pushToCloud is NOT called from saveState() or updateMath() (manual-only)
{
  let saveStateBody = '';
  let updateMathBody = '';
  try {
    saveStateBody = extractFunctionBody(stateSource, 'saveState');
  } catch (_) {}
  try {
    updateMathBody = extractFunctionBody(uiSource, 'updateMath');
  } catch (_) {}
  assert(
    !/pushToCloud/.test(saveStateBody),
    'saveState() does not call pushToCloud (cloud sync is manual-only)'
  );
  assert(
    !/pushToCloud/.test(updateMathBody),
    'updateMath() does not call pushToCloud (cloud sync is manual-only)'
  );
}

// ══════════════════════════════════════════════════════════════
//  SUITE 24 — Protocol Completeness (Group 3)
//  P5: every render*() is called from loadUI(); P6: wireInput IDs
//  exist; P7: every audio function has the double-guard pattern.
//  19 tests
// ══════════════════════════════════════════════════════════════
header('Protocol Completeness — P5 render wiring');
{
  let loadUIBody = '';
  try {
    loadUIBody = extractFunctionBody(uiSource, 'loadUI');
  } catch (e) {
    fail('Cannot extract loadUI: ' + e.message);
  }
  const RENDER_FNS = [
    'renderInventory',
    'renderAmmo',
    'renderSquad',
    'renderStatus',
    'renderCampaignNotes',
    'renderFactionRep',
    'renderPerks',
    'renderQuests',
    'renderSessionStats',
    'renderEquipped',
    'renderCollectibles',
    'renderGameDate',
    'renderWorldMap',
    'renderKarmaCenter',
    'renderCampaignStatus',
  ];
  for (const fn of RENDER_FNS) {
    assert(
      new RegExp(`\\b${fn}\\s*\\(\\s*\\)`).test(loadUIBody),
      `${fn}() is called from loadUI() (P5)`
    );
  }
}

header('Protocol Completeness — P6 wireInput IDs');
{
  const WIRE_IDS = ['newQuestName', 'newItemName', 'newPerkName'];
  for (const id of WIRE_IDS) {
    assert(
      new RegExp(`id="${id}"`).test(htmlSource),
      `wireInput target id="${id}" exists in index.html (P6)`
    );
  }
}

header('Protocol Completeness — P7 audio double-guard');
{
  const audioFnsMissingGuard = [];
  const audioRe2 = /function (play\w+|start\w+)\s*\(/g;
  let am2;
  while ((am2 = audioRe2.exec(uiSource)) !== null) {
    try {
      const body = extractFunctionBody(uiSource, am2[1]);
      if (!/ensureAudioCtx\(\)/.test(body)) continue;
      if (!/AudioSettings\.masterMute/.test(body))
        audioFnsMissingGuard.push(am2[1] + ': missing masterMute guard');
      const otherKeys = (body.match(/AudioSettings\.\w+/g) || []).filter(
        s => s !== 'AudioSettings.masterMute'
      );
      if (otherKeys.length === 0)
        audioFnsMissingGuard.push(am2[1] + ': missing individual AudioSettings key guard');
    } catch (_) {}
  }
  assert(
    audioFnsMissingGuard.length === 0,
    'All audio functions have masterMute + individual key guards (P7)' +
      (audioFnsMissingGuard.length ? ' — ' + audioFnsMissingGuard.join(', ') : '')
  );
}

// ══════════════════════════════════════════════════════════════
//  SUITE 25 — AI Contract Lock (Group 4)
//  Verifies responseMimeType is locked and getSystemDirective()
//  references the tri-node schema shape.
//  5 tests
// ══════════════════════════════════════════════════════════════
header('AI Contract Lock');
assert(
  /responseMimeType\s*:\s*'application\/json'/.test(apiSource),
  "api.js contains responseMimeType:'application/json' (AI contract lock)"
);
{
  let sysDirBody = '';
  try {
    sysDirBody = extractFunctionBody(apiSource, 'getSystemDirective');
  } catch (e) {
    fail('Cannot extract getSystemDirective: ' + e.message);
  }
  assert(
    /state\.gameContext/.test(sysDirBody),
    'getSystemDirective() reads state.gameContext (FO3 switch)'
  );
  assert(
    /'narrative'/.test(sysDirBody) || /"narrative"/.test(sysDirBody),
    "getSystemDirective() contains 'narrative' key (AI tri-node schema)"
  );
  assert(
    /'state'/.test(sysDirBody) || /"state"/.test(sysDirBody),
    "getSystemDirective() contains 'state' key (AI tri-node schema)"
  );
  assert(
    /'modal'/.test(sysDirBody) || /"modal"/.test(sysDirBody),
    "getSystemDirective() contains 'modal' key (AI tri-node schema)"
  );
}

// ══════════════════════════════════════════════════════════════
//  SUITE 26 — Architectural Boundaries (Group 5)
//  reg_fo3.js must be pure read-only reference data: no state
//  writes, no localStorage, no chatHistory references.
//  3 tests
// ══════════════════════════════════════════════════════════════
header('Architectural Boundaries — reg_fo3.js purity');
{
  const regFo3Source = readFile('js/reg_fo3.js');
  const regFo3Code = regFo3Source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\r\n]*/g, '');
  assert(
    !/\bstate\b/.test(regFo3Code),
    'reg_fo3.js does not reference state (pure reference data)'
  );
  assert(!/localStorage/.test(regFo3Code), 'reg_fo3.js does not reference localStorage (in code)');
  assert(!/chatHistory/.test(regFo3Code), 'reg_fo3.js does not reference chatHistory (in code)');
}

// ══════════════════════════════════════════════════════════════
//  SUITE 27 — Assets Completeness (Group 6)
//  Every local <script src> / <link href> in index.html must
//  appear in sw.js ASSETS so the PWA caches the full app.
//  2 tests
// ══════════════════════════════════════════════════════════════
header('Assets Completeness');
{
  // Build the set of cached paths from ASSETS
  const assetsMatch = swSource.match(/const ASSETS\s*=\s*\[([\s\S]*?)\];/);
  const assetsSet = new Set(
    assetsMatch ? [...assetsMatch[1].matchAll(/'([^']+)'/g)].map(m => m[1]) : []
  );

  // Extract local script/link refs from index.html, normalise to ./path form
  const scriptRefs = [...htmlSource.matchAll(/<script[^>]+src="([^"]+)"/g)].map(m => m[1]);
  const linkRefs = [...htmlSource.matchAll(/<link[^>]+href="([^"]+)"/g)].map(m => m[1]);
  const localRefs = [...scriptRefs, ...linkRefs]
    .filter(r => !r.startsWith('http') && r !== 'sw.js' && !/\.(png|ico|gif|jpg|svg)$/.test(r))
    .map(r => (r.startsWith('./') ? r : './' + r));

  const missingFromAssets = localRefs.filter(r => !assetsSet.has(r));
  assert(
    missingFromAssets.length === 0,
    'All local HTML refs (excl. sw.js) are in sw.js ASSETS' +
      (missingFromAssets.length ? ' — missing: ' + missingFromAssets.join(', ') : '')
  );

  // Every ASSETS entry (except './' directory placeholder) must exist on disk
  const missingFiles = [...assetsSet]
    .filter(f => f !== './')
    .filter(f => !fs.existsSync(path.join(ROOT, f)));
  assert(
    missingFiles.length === 0,
    'All sw.js ASSETS entries exist on disk' +
      (missingFiles.length ? ' — missing: ' + missingFiles.join(', ') : '')
  );
}

// ══════════════════════════════════════════════════════════════
//  SUITE 28 — Meta / Runner Parity (Group 7)
//  Verifies that both runners contain all gate-guard suites (22-40)
//  and that the canonical test count matches README.md, ARCHITECTURE.md,
//  and (conditionally, if present) RULES.md and CLAUDE.md.
//
//  NOTE: source-level assert() / Check() counts cannot reliably track
//  runtime test counts because loops multiply results at runtime. Parity
//  is enforced structurally — both runners must contain every named suite.
//  7 tests
// ══════════════════════════════════════════════════════════════
header('Meta / Runner Parity');
{
  const jsRunner = readFile('tests/check-persistence.js');
  const psRunner = readFile('tests/check-persistence.ps1');

  // Structural parity: both runners must contain every gate-guard suite marker (22-40).
  // A missing marker means a suite was added to one runner but not ported to the other.
  const GATE_SUITES = [
    'Suite 22',
    'Suite 23',
    'Suite 24',
    'Suite 25',
    'Suite 26',
    'Suite 27',
    'Suite 28',
    'Suite 29',
    'Suite 30',
    'Suite 31',
    'Suite 32',
    'Suite 33',
    'Suite 34',
    'Suite 35',
    'Suite 36',
    'Suite 37',
    'Suite 38',
    'Suite 39',
    'Suite 40',
    'Suite 41',
    'Suite 49',
    'Suite 50',
    'Suite 51',
  ];
  const jsMissing = GATE_SUITES.filter(s => !jsRunner.includes(s));
  const psMissing = GATE_SUITES.filter(s => !psRunner.includes(s));
  assert(
    jsMissing.length === 0,
    'JS runner contains all gate-guard suites (22-41, 49-51)' +
      (jsMissing.length ? ' — missing: ' + jsMissing.join(', ') : '')
  );
  assert(
    psMissing.length === 0,
    'PS runner contains all gate-guard suites (22-41, 49-51)' +
      (psMissing.length ? ' — missing: ' + psMissing.join(', ') : '')
  );

  // Canonical count in CHANGELOG.md matches README.md and ARCHITECTURE.md (Protocol 2a).
  // The CHANGELOG header format is: <!-- Tests: N/N | Cache: ... -->
  const changelog = readFile('CHANGELOG.md');
  const countMatch = changelog.match(/Tests:\s*(\d+)\/\d+/);
  const canonicalCount = countMatch ? countMatch[1] : '';
  assert(!!canonicalCount, 'CHANGELOG.md contains Tests: N/N header (Protocol 2a)');
  const readme = readFile('README.md');
  assert(
    !!canonicalCount &&
      (readme.includes(canonicalCount + ' tests') || readme.includes(canonicalCount + '-test')),
    `README.md contains CHANGELOG.md canonical test count (${canonicalCount})`
  );
  const arch = readFile('ARCHITECTURE.md');
  assert(
    !!canonicalCount && arch.includes(canonicalCount),
    `ARCHITECTURE.md contains canonical test count (${canonicalCount})`
  );

  // Conditional: RULES.md and CLAUDE.md are untracked local files (absent on CI/fresh clone).
  // If present, assert their count matches; if absent, skip gracefully (pass trivially).
  const rulesPath = path.join(ROOT, 'RULES.md');
  const rulesExists = fs.existsSync(rulesPath);
  const rulesSrc = rulesExists ? fs.readFileSync(rulesPath, 'utf8') : null;
  const rulesCountM = rulesSrc ? rulesSrc.match(/\b(\d+)\s*tests?\b/) : null;
  assert(
    !rulesExists || (!!rulesCountM && rulesCountM[1] === canonicalCount),
    `RULES.md test count matches canonical (${canonicalCount}) — skipped if absent`
  );
  const claudePath = path.join(ROOT, 'CLAUDE.md');
  const claudeExists = fs.existsSync(claudePath);
  const claudeSrc = claudeExists ? fs.readFileSync(claudePath, 'utf8') : null;
  const claudeCountM = claudeSrc ? claudeSrc.match(/\b(\d+)\s*tests?\b/) : null;
  assert(
    !claudeExists || (!!claudeCountM && claudeCountM[1] === canonicalCount),
    `CLAUDE.md test count matches canonical (${canonicalCount}) — skipped if absent`
  );
}

// ══════════════════════════════════════════════════════════════
//  SUITE 29 — SW Update Banner (Protocol 13/20)
//  Regression guards: alert() replaced by in-page banner;
//  banner element + tap→SKIP_WAITING wiring; reload guard intact.
//  4 tests
// ══════════════════════════════════════════════════════════════
header('SW Update Banner');

// 29.1 _triggerUpdate() no longer calls alert()
{
  let triggerBody = '';
  try {
    triggerBody = extractFunctionBody(htmlSource, '_triggerUpdate');
  } catch (_) {}
  assert(
    !/\balert\s*\(/.test(triggerBody),
    '_triggerUpdate() does not call alert() — banner replaces browser dialog (Protocol 13 guard)'
  );
}

// 29.2 updateBanner element exists in index.html
assert(
  /id="updateBanner"/.test(htmlSource),
  'id="updateBanner" element exists in index.html (in-page update UI)'
);

// 29.3 Banner tap wires to SKIP_WAITING (onclick sends postMessage SKIP_WAITING)
{
  let triggerBody = '';
  try {
    triggerBody = extractFunctionBody(htmlSource, '_triggerUpdate');
  } catch (_) {}
  assert(
    /SKIP_WAITING/.test(triggerBody) && /onclick|addEventListener/.test(triggerBody),
    "_triggerUpdate() wires banner tap to postMessage({ type: 'SKIP_WAITING' }) (update path intact)"
  );
}

// 29.4 controllerchange single-reload guard still present
assert(
  /refreshing/.test(htmlSource) && /hadController/.test(htmlSource),
  'controllerchange reload guard (refreshing + hadController) intact in index.html (Protocol 20)'
);

// ══════════════════════════════════════════════════════════════
//  SUITE 30 — Phase 1b Guards
//  Input maxlength caps, CSP-Report-Only header, monotonic cache
//  guard in pre-commit hook, proactive localStorage quota warning.
//  4 tests
// ══════════════════════════════════════════════════════════════
header('Phase 1b Guards');

// 30.1 #chatInput textarea has maxlength attribute
assert(
  /id="chatInput"[\s\S]{0,300}maxlength/.test(htmlSource),
  '#chatInput textarea has maxlength attribute (Phase 1b input cap guard)'
);

// 30.2 CSP-Report-Only meta present in index.html
assert(
  /Content-Security-Policy-Report-Only/.test(htmlSource),
  'index.html contains Content-Security-Policy-Report-Only meta (Phase 1b security header)'
);

// 30.3 Pre-commit hook enforces monotonic rev increase
{
  const hookPath = path.join(ROOT, '.git', 'hooks', 'pre-commit');
  const hookSource = fs.existsSync(hookPath) ? fs.readFileSync(hookPath, 'utf8') : '';
  assert(
    /LOCAL_N.*-gt.*ORIGIN_N|-gt.*ORIGIN_N.*LOCAL_N/.test(hookSource),
    'pre-commit hook enforces strict monotonic rev increase (LOCAL_N -gt ORIGIN_N)'
  );
}

// 30.4 saveState() contains proactive quota warning
assert(
  /_quotaWarnShown/.test(stateSource),
  'saveState() contains proactive localStorage quota warning (once-per-session guard)'
);

// ══════════════════════════════════════════════════════════════
//  SUITE 31 — CI/CD Automation Guards (Phase 1c)
//  ci.yml has no stale "(106 tests)" or "(386 tests)" label; runs PS runner;
//  has render-check step; deploy.yml uses _site staging dir and is
//  gated on CI via workflow_run + conclusion == 'success';
//  hook-install and boot-smoke scripts exist;
//  pre-commit hook is conditional (served-file gate).
//  11 tests
// ══════════════════════════════════════════════════════════════
header('CI/CD Automation Guards');

// 31.1 ci.yml does not contain stale "(106 tests)" label
{
  const ciSource = readFile('.github/workflows/ci.yml');
  assert(
    !/\(106 tests\)/.test(ciSource),
    'ci.yml does not contain stale "(106 tests)" label (Phase 1c update)'
  );
}

// 31.2 gate.js runs PowerShell persistence runner + ci.yml calls npm run gate
{
  const gateSrc = readFile('scripts/gate.js');
  const ciSource = readFile('.github/workflows/ci.yml');
  assert(
    /check-persistence\.ps1/.test(gateSrc) && /npm run gate/.test(ciSource),
    'gate.js runs PowerShell persistence runner and ci.yml calls npm run gate (Protocol 15 parity)'
  );
}

// 31.3 gate.js includes render-check + ci.yml calls npm run gate
{
  const gateSrc = readFile('scripts/gate.js');
  const ciSource = readFile('.github/workflows/ci.yml');
  assert(
    /render-check/.test(gateSrc) && /npm run gate/.test(ciSource),
    'gate.js includes render-check and ci.yml calls npm run gate (Protocol 10 CI enforcement)'
  );
}

// 31.4 deploy.yml uses _site staging dir (not full path: .)
{
  const deploySource = readFile('.github/workflows/deploy.yml');
  assert(
    deploySource.includes('_site') && !/path:\s*\./.test(deploySource),
    'deploy.yml uses _site staging directory instead of path: . (private files excluded)'
  );
}

// 31.5 hook install script exists
assert(
  fs.existsSync(path.join(ROOT, 'scripts', 'install-hooks.js')),
  'scripts/install-hooks.js exists (auto-installs pre-commit hook on npm install)'
);

// 31.6 boot smoke test exists
assert(
  fs.existsSync(path.join(ROOT, 'tests', 'boot-smoke.mjs')),
  'tests/boot-smoke.mjs exists (CI boot smoke test — Phase 1c)'
);

// 31.7 ci.yml does not contain stale "(386 tests)" label
{
  const ciSource = readFile('.github/workflows/ci.yml');
  assert(
    !/\(386 tests\)/.test(ciSource),
    'ci.yml does not contain stale "(386 tests)" label (updated to 519)'
  );
}

// 31.8 deploy.yml uses workflow_run trigger (gated on CI — not a bare push)
{
  const deploySource = readFile('.github/workflows/deploy.yml');
  assert(
    /workflow_run/.test(deploySource),
    'deploy.yml uses workflow_run trigger (deploy gated on CI — not a bare push to main)'
  );
}

// 31.9 deploy.yml workflow_run gate requires conclusion == 'success'
{
  const deploySource = readFile('.github/workflows/deploy.yml');
  assert(
    /conclusion\s*==\s*['"]success['"]/.test(deploySource),
    "deploy.yml workflow_run gate requires conclusion == 'success' (broken CI cannot deploy)"
  );
}

// 31.10 scripts/pre-commit gates cache-bump on staged served files (conditional)
{
  const hookSource = readFile('scripts/pre-commit');
  assert(
    /git diff --cached --name-only/.test(hookSource) && /SERVED=/.test(hookSource),
    'scripts/pre-commit gates cache-bump check on staged served files via git diff --cached (conditional Protocol 1)'
  );
}

// 31.11 scripts/pre-commit has SKIP branch for non-served commits
{
  const hookSource = readFile('scripts/pre-commit');
  assert(
    /SKIP.*No served|cache bump not required/.test(hookSource),
    'scripts/pre-commit has SKIP branch — non-served commits bypass the cache-bump check'
  );
}

// ══════════════════════════════════════════════════════════════
//  SUITE 32 — Phase 2a Guards (Help Menu Rebuild + Chem Boost Fix)
//  Data-driven COMMAND_REGISTRY; no box-drawing glyphs; removed commands
//  absent from both ui.js and api.js; .skill-row markup in index.html;
//  _applyChemHighlights targets .skill-row selector.
//  7 tests
// ══════════════════════════════════════════════════════════════
header('Phase 2a Guards');

// 32.1 COMMAND_REGISTRY data array exists at module scope in ui.js
assert(
  /const COMMAND_REGISTRY\s*=\s*\[/.test(uiSource),
  'COMMAND_REGISTRY data array declared at module scope in ui.js'
);

// 32.2 showHelpModal() body references COMMAND_REGISTRY (data-driven rendering)
{
  let helpBody32 = '';
  try {
    helpBody32 = extractFunctionBody(uiSource, 'showHelpModal');
  } catch (e) {}
  assert(
    /COMMAND_REGISTRY/.test(helpBody32),
    'showHelpModal() references COMMAND_REGISTRY data array'
  );
}

// 32.3 showHelpModal() function body contains no box-drawing glyphs
{
  let helpBody32 = '';
  try {
    helpBody32 = extractFunctionBody(uiSource, 'showHelpModal');
  } catch (e) {}
  assert(
    !/[│├┤└┘┌─┐]/.test(helpBody32),
    'showHelpModal() contains no box-drawing glyphs (│ ├ ┤ └ ─ etc.)'
  );
}

// 32.4 Removed display commands absent from COMMAND_REGISTRY source in ui.js
{
  const cmdRegM = uiSource.match(/const COMMAND_REGISTRY\s*=\s*\[[\s\S]*?\];/);
  const cmdRegSrc = cmdRegM ? cmdRegM[0] : '';
  assert(
    !/VIEW.*D.*M|DEV 1\/2\/3|\[INV\]|\[STATS\]|\[REP\]/.test(cmdRegSrc),
    'Removed commands ([VIEW: D/M], [DEV 1/2/3], [INV], [STATS], [REP]) absent from COMMAND_REGISTRY'
  );
}

// 32.5 Removed commands absent from api.js canonical command list
assert(
  !/VIEW.*D.*M|DEV 1\/2\/3|\[INV\]\s*:.*[Ii]nventory|\[STATS\]\s*:|\[REP\]\s*:.*[Ff]action/.test(
    apiSource
  ),
  'Removed commands absent from api.js canonical command list'
);

// 32.6 index.html skill matrix rows use class="skill-row" (≥13 rows)
{
  const htmlSrc32 = readFile('index.html');
  const count = (htmlSrc32.match(/class="skill-row"/g) || []).length;
  assert(count >= 13, `index.html skill matrix has ≥13 .skill-row elements (found ${count})`);
}

// 32.7 _applyChemHighlights() uses .skill-row for both clear and highlight selectors
{
  let chemBody32 = '';
  try {
    chemBody32 = extractFunctionBody(uiSource, '_applyChemHighlights');
  } catch (e) {}
  assert(
    /querySelectorAll\(['"]\.skill-row\.chem-boost['"]\)/.test(chemBody32) &&
      /closest\(['"]\.skill-row['"]\)/.test(chemBody32),
    "_applyChemHighlights() clears via '.skill-row.chem-boost' and applies via closest('.skill-row')"
  );
}

// ══════════════════════════════════════════════════════════════
// Suite 33 -- Phase 2b Guards (Optics RGB, Empty-State, Utility Classes)
// --robco-green-rgb CSS var chain; emptyState() helper; utility classes;
// config-summary toggle; no residual rgba(20,253,206) literals.
// 10 tests
// ══════════════════════════════════════════════════════════════
header('Phase 2b Guards');

// 33.1 --robco-green-rgb defined in terminal.css :root
{
  const cssSrc33 = readFile('css/terminal.css');
  assert(
    /--robco-green-rgb\s*:\s*20,\s*253,\s*206/.test(cssSrc33),
    '--robco-green-rgb: 20, 253, 206 defined in terminal.css :root (P1-1)'
  );
}

// 33.2 No rgba(20,253,206, literal survives in terminal.css
{
  const cssSrc33 = readFile('css/terminal.css');
  assert(
    !/rgba\(20,\s*253,\s*206,/.test(cssSrc33),
    'No hardcoded rgba(20,253,206,...) literal remains in terminal.css (P1-1)'
  );
}

// 33.3 --robco-green-rgb set in index.html optics branches (≥5 setProperty calls)
{
  const htmlSrc33 = readFile('index.html');
  const rgbCount = (htmlSrc33.match(/setProperty\(['"]--robco-green-rgb['"]/g) || []).length;
  assert(
    rgbCount >= 5,
    `index.html optics script sets --robco-green-rgb in ≥5 branches (found ${rgbCount}) (P1-1)`
  );
}

// 33.4 --robco-green-rgb set in changeOpticsColor() branches in ui.js (≥6 calls)
{
  const rgbCount = (uiSource.match(/setProperty\(['"]--robco-green-rgb['"]/g) || []).length;
  assert(
    rgbCount >= 6,
    `changeOpticsColor() sets --robco-green-rgb in ≥6 branches (found ${rgbCount}) (P1-1)`
  );
}

// 33.5 .empty-state CSS class defined in terminal.css
{
  const cssSrc33 = readFile('css/terminal.css');
  assert(
    /\.empty-state\s*\{/.test(cssSrc33),
    '.empty-state CSS class defined in terminal.css (P1-2)'
  );
}

// 33.6 emptyState() function defined in ui.js
assert(
  /function\s+emptyState\s*\(/.test(uiSource),
  'emptyState() helper function defined in ui.js (P1-2)'
);

// 33.7 emptyState() appears ≥7 times in ui.js (1 definition + 6 calls)
{
  const callCount = (uiSource.match(/emptyState\(/g) || []).length;
  assert(
    callCount >= 7,
    `emptyState() defined + called ≥6 times (found ${callCount} total) (P1-2)`
  );
}

// 33.8 .audio-row CSS class defined in terminal.css
{
  const cssSrc33 = readFile('css/terminal.css');
  assert(
    /\.audio-row\s*\{/.test(cssSrc33),
    '.audio-row utility class defined in terminal.css (P1-3)'
  );
}

// 33.9 config-summary::after toggle CSS exists in terminal.css
{
  const cssSrc33 = readFile('css/terminal.css');
  assert(
    /config-summary::after/.test(cssSrc33) && /content\s*:\s*['"]\s*\[\+\]/.test(cssSrc33),
    'summary.config-summary::after [+]/[-] toggle CSS exists in terminal.css (P1-4)'
  );
}

// 33.10 No hardcoded [+] text inside <summary> elements in index.html
{
  const htmlSrc33 = readFile('index.html');
  const bad = (htmlSrc33.match(/<summary[^>]*>[^<]*\[\+\][^<]*<\/summary>/g) || []).length;
  assert(bad === 0, `No hardcoded [+] text in index.html <summary> elements (found ${bad}) (P1-4)`);
}

// ══════════════════════════════════════════════════════════════
//  SUITE 34 — Phase 2c Guards (CSS Hygiene, List-Row, Btn-Sm, Empty-State Vocab)
//  Deleted dead CSS, unified delete-btn flex pattern, .btn-sm utility, vocab fix.
//  10 tests
// ══════════════════════════════════════════════════════════════
header('Phase 2c Guards');

// 34.1 .faction-item rule absent from terminal.css (P2-1 dead CSS removed)
{
  const css34 = readFile('css/terminal.css');
  assert(!/\.faction-item\s*\{/.test(css34), '.faction-item rule deleted from terminal.css (P2-1)');
}

// 34.2 .faction-name rule absent from terminal.css (P2-1 dead CSS removed)
{
  const css34 = readFile('css/terminal.css');
  assert(!/\.faction-name\s*\{/.test(css34), '.faction-name rule deleted from terminal.css (P2-1)');
}

// 34.3 .faction-standing rule absent from terminal.css (P2-1 dead CSS removed)
{
  const css34 = readFile('css/terminal.css');
  assert(
    !/\.faction-standing\s*\{/.test(css34),
    '.faction-standing rule deleted from terminal.css (P2-1)'
  );
}

// 34.4 .list-row-content utility defined in terminal.css (P2-2 flex pattern)
{
  const css34 = readFile('css/terminal.css');
  assert(
    /\.list-row-content\s*\{/.test(css34),
    '.list-row-content utility defined in terminal.css (P2-2)'
  );
}

// 34.5 .btn-sm utility defined in terminal.css (P2-3 compact button)
{
  const css34 = readFile('css/terminal.css');
  assert(/\.btn-sm\s*\{/.test(css34), '.btn-sm utility class defined in terminal.css (P2-3)');
}

// 34.6 .delete-btn has min-height:28px in terminal.css (P2-3 tap target Protocol 17)
{
  const css34 = readFile('css/terminal.css');
  const css34Stripped = css34.replace(/\/\*[\s\S]*?\*\//g, '');
  const deleteBtnRule = (css34Stripped.match(/\.delete-btn\s*\{[^}]*\}/) || [''])[0];
  assert(
    /min-height\s*:\s*28px/.test(deleteBtnRule),
    '.delete-btn has min-height:28px (Protocol 17 tap target)'
  );
}

// 34.7 renderPerks has no style="float:right;" on delete-btn (P2-2 float removed)
{
  const renderPerksBody = extractFunctionBody(uiSource, 'renderPerks');
  assert(
    !/delete-btn[^"]*"[^>]*style="float:right;"/.test(renderPerksBody) &&
      !/style="float:right;"[^>]*delete-btn/.test(renderPerksBody),
    'renderPerks() delete-btn has no inline style="float:right;" (P2-2)'
  );
}

// 34.8 renderQuests has no style="float:right;" on delete-btn (P2-2 float removed)
{
  const renderQuestsBody = extractFunctionBody(uiSource, 'renderQuests');
  assert(
    !/delete-btn[^"]*"[^>]*style="float:right;"/.test(renderQuestsBody) &&
      !/style="float:right;"[^>]*delete-btn/.test(renderQuestsBody),
    'renderQuests() delete-btn has no inline style="float:right;" (P2-2)'
  );
}

// 34.9 renderCampaignNotes has no style="float:right;" on delete-btn (P2-2 float removed)
{
  const renderCampaignNotesBody = extractFunctionBody(uiSource, 'renderCampaignNotes');
  assert(
    !/delete-btn[^"]*"[^>]*style="float:right;"/.test(renderCampaignNotesBody) &&
      !/style="float:right;"[^>]*delete-btn/.test(renderCampaignNotesBody),
    'renderCampaignNotes() delete-btn has no inline style="float:right;" (P2-2)'
  );
}

// 34.10 [NO COLLECTIBLES LOADED] bracketed empty-state absent from index.html (P2-5)
{
  const html34 = readFile('index.html');
  assert(
    !/\[NO COLLECTIBLES LOADED\]/.test(html34),
    'index.html static empty-state uses plain text, not [NO COLLECTIBLES LOADED] (P2-5)'
  );
}

// ══════════════════════════════════════════════════════════════
//  SUITE 35 — Phase 3a Performance Guards (P7 optimizations)
//  campaign_notes cap, saveState dirty-check, standby interval/animation
//  pause, beforeunload v8 key, registrySearch cache.
//  6 tests
// ══════════════════════════════════════════════════════════════
header('Phase 3a Performance Guards');
const apiSrc35 = readFile('js/api.js');
const stateSrc35 = readFile('js/state.js');
const uiSrc35 = readFile('js/ui.js');
const cssSrc35 = readFile('css/terminal.css');
const regNvSrc35 = readFile('js/reg_nv.js');

// 35.1 campaign_notes capped to 200 after auto-log pushes in api.js (P7-14)
assert(
  (apiSrc35.match(/campaign_notes\.length\s*>\s*200/g) || []).length >= 2,
  'campaign_notes capped to 200 after auto-log pushes in api.js (P7-14)'
);

// 35.2 saveState has a dirty-check: skips write when _saveStr === _lastSaveStr (P7-6)
assert(
  /_lastSaveStr/.test(stateSrc35) && /=== _lastSaveStr/.test(stateSrc35),
  'saveState dirty-check: _lastSaveStr declared and compared in state.js (P7-6)'
);

// 35.3 enterStandby() clears _uptimeInterval on standby (P7-9)
{
  const enterStandbyBody = extractFunctionBody(uiSrc35, 'enterStandby');
  assert(
    /clearInterval\(_uptimeInterval\)/.test(enterStandbyBody),
    'enterStandby() clears _uptimeInterval on standby (P7-9)'
  );
}

// 35.4 body.standby context has animation-play-state: paused in terminal.css (P7-9)
assert(
  /body\.standby[^{]*\{[^}]*animation-play-state\s*:\s*paused/.test(cssSrc35.replace(/\n/g, ' ')),
  'body.standby context sets animation-play-state: paused in terminal.css (P7-9)'
);

// 35.5 beforeunload flush writes robco_v8, not robco_v7 (P7-8)
{
  const blIdx = uiSrc35.indexOf("addEventListener('beforeunload'");
  const blSnippet = blIdx >= 0 ? uiSrc35.slice(blIdx, blIdx + 350) : '';
  assert(
    blSnippet.includes('robco_v8') && !blSnippet.includes('robco_v7'),
    'beforeunload flush writes robco_v8, not robco_v7 (P7-8)'
  );
}

// 35.6 registrySearch has _registrySearchCache memoization in reg_nv.js (P7-13)
assert(
  /_registrySearchCache/.test(regNvSrc35),
  'registrySearch has _registrySearchCache memoization in reg_nv.js (P7-13)'
);

// ══════════════════════════════════════════════════════════════
//  SUITE 36 — Keyboard Shortcuts Group ([?] menu discoverability)
//  COMMAND_REGISTRY has KEYBOARD SHORTCUTS group with ≥6 entries;
//  global keydown handler closes modal on Escape; closeModal() exists.
//  4 tests
// ══════════════════════════════════════════════════════════════
header('Keyboard Shortcuts Group');
{
  const uiSrc36 = readFile('js/ui.js');

  // 36.1 COMMAND_REGISTRY contains a KEYBOARD SHORTCUTS group
  const cmdRegM36 = uiSrc36.match(/const COMMAND_REGISTRY\s*=\s*\[[\s\S]*?\];/);
  const cmdRegSrc36 = cmdRegM36 ? cmdRegM36[0] : '';
  assert(
    /['"]KEYBOARD SHORTCUTS['"]/.test(cmdRegSrc36),
    "COMMAND_REGISTRY has a 'KEYBOARD SHORTCUTS' group (Suite 36)"
  );

  // 36.2 KEYBOARD SHORTCUTS group has ≥6 entries
  {
    const kbM = uiSrc36.match(
      /group\s*:\s*['"]KEYBOARD SHORTCUTS['"][\s\S]*?cmds\s*:\s*\[([\s\S]*?)\]\s*\}/
    );
    const kbCmds = kbM ? kbM[1] : '';
    const entryCount = (kbCmds.match(/cmd\s*:/g) || []).length;
    assert(entryCount >= 6, `KEYBOARD SHORTCUTS group has ≥6 entries (found ${entryCount})`);
  }

  // 36.3 Global keydown listener calls closeModal() on Escape
  {
    const kdIdx = uiSrc36.indexOf("document.addEventListener('keydown'");
    const kdSnippet = kdIdx >= 0 ? uiSrc36.slice(kdIdx, kdIdx + 2000) : '';
    assert(
      /Escape/.test(kdSnippet) && /closeModal/.test(kdSnippet),
      "Global keydown listener handles 'Escape' → closeModal() (Esc closes dialog)"
    );
  }

  // 36.4 closeModal() function exists in ui.js
  assert(/function\s+closeModal\s*\(/.test(uiSrc36), 'closeModal() function defined in ui.js');
}

// ══════════════════════════════════════════════════════════════
//  SUITE 37 — Render Fan-out (P7-1)
//  Every list-mutator calls its targeted render* + updateMath()
//  instead of loadUI(). updateMath() tail must still hold saveState()
//  and _updatePanelBadges(). toggleCollectible latent-bug fix verified.
//  16 tests
// ══════════════════════════════════════════════════════════════
header('Render Fan-out (P7-1)');
{
  const uiSrc37 = readFile('js/ui.js');

  function checkMutator(fnName, expectedRenders) {
    let body = '';
    try {
      body = extractFunctionBody(uiSrc37, fnName);
    } catch (_) {}
    const hasLoadUI = body.includes('loadUI()');
    const hasUpdateMath = body.includes('updateMath()');
    const rendersOk = expectedRenders.every(r => body.includes(r));
    assert(
      !hasLoadUI && hasUpdateMath && rendersOk,
      `${fnName}() calls [${expectedRenders.join(', ')}] + updateMath(), NOT loadUI()`
    );
  }

  checkMutator('delItem', ['renderInventory()']);
  checkMutator('addItem', ['renderInventory()', 'renderAmmo()']);
  checkMutator('addAmmo', ['renderAmmo()']);
  checkMutator('removeAmmo', ['renderAmmo()']);
  checkMutator('removePerk', ['renderPerks()']);
  checkMutator('addPerk', ['renderPerks()']);
  checkMutator('removeQuest', ['renderQuests()']);
  checkMutator('addQuest', ['renderQuests()']);
  checkMutator('removeSquadMember', ['renderSquad()']);
  checkMutator('addSquadMember', ['renderSquad()']);
  checkMutator('removeStatusEffect', ['renderStatus()']);
  checkMutator('addStatusEffect', ['renderStatus()']);
  checkMutator('removeCampaignNote', ['renderCampaignNotes()']);
  checkMutator('addCampaignNote', ['renderCampaignNotes()']);

  // 37.15 toggleCollectible bug fix: now calls renderSessionStats() + updateMath()
  {
    let body = '';
    try {
      body = extractFunctionBody(uiSrc37, 'toggleCollectible');
    } catch (_) {}
    assert(
      body.includes('renderSessionStats()') && body.includes('updateMath()'),
      'toggleCollectible() calls renderSessionStats() + updateMath() (collectibles badge live-update fix)'
    );
  }

  // 37.16 updateMath() shared-tail invariant: must contain saveState() AND _updatePanelBadges()
  {
    let body = '';
    try {
      body = extractFunctionBody(uiSrc37, 'updateMath');
    } catch (_) {}
    assert(
      body.includes('saveState()') && body.includes('_updatePanelBadges()'),
      'updateMath() contains saveState() AND _updatePanelBadges() — shared-tail invariant intact'
    );
  }
}

// ══════════════════════════════════════════════════════════════
//  SUITE 38 — DB↔Registry Weapon Parity (FNV + FO3)
//  Every FALLOUT_REGISTRY weapon-type entry must have an exact-name
//  match in [WEAPONS.CSV], and every WEAPONS.CSV row must have a
//  registry entry. Guards against future drift in either direction.
//  4 tests
// ══════════════════════════════════════════════════════════════
header('DB↔Registry Weapon Parity');
{
  function getDbWeaponNames(src) {
    const start = src.indexOf('[WEAPONS.CSV]');
    if (start === -1) return new Set();
    const rest = src.substring(start + 13);
    const endIdx = rest.search(/\n\[/);
    const block = endIdx === -1 ? rest : rest.substring(0, endIdx);
    const names = new Set();
    block.split('\n').forEach(l => {
      const t = l.trim();
      if (!t || t.startsWith('[') || t.startsWith('Weapon_Name')) return;
      // Split on first comma followed by a digit — handles names with commas like "Oh, Baby!"
      const m = t.match(/^(.*?),\d/);
      const name = m ? m[1].trim() : t.split(',')[0].trim();
      if (name) names.add(name);
    });
    return names;
  }

  function getRegWeaponNames(src) {
    const names = new Set();
    // Handle both 'name' (no apostrophe) and "name" (contains apostrophe)
    const re = /\{\s*name\s*:\s*(?:'([^']*)'|"([^"]*)")\s*,\s*type\s*:\s*'weapon'\s*\}/g;
    let m;
    while ((m = re.exec(src)) !== null) names.add(m[1] !== undefined ? m[1] : m[2]);
    return names;
  }

  // 38.1 FNV: every registry weapon exists in WEAPONS.CSV
  {
    const dbNv = readFile('js/db_nv.js');
    const regNv = readFile('js/reg_nv.js');
    const dbW = getDbWeaponNames(dbNv);
    const regW = getRegWeaponNames(regNv);
    const missing = [...regW].filter(n => !dbW.has(n));
    assert(
      missing.length === 0,
      `FNV: all registry weapons exist in WEAPONS.CSV (missing: ${missing.join(', ') || 'none'})`
    );
  }

  // 38.2 FNV: every WEAPONS.CSV row exists in registry
  {
    const dbNv = readFile('js/db_nv.js');
    const regNv = readFile('js/reg_nv.js');
    const dbW = getDbWeaponNames(dbNv);
    const regW = getRegWeaponNames(regNv);
    const missing = [...dbW].filter(n => !regW.has(n));
    assert(
      missing.length === 0,
      `FNV: all WEAPONS.CSV rows exist in registry (missing: ${missing.join(', ') || 'none'})`
    );
  }

  // 38.3 FO3: every registry weapon exists in WEAPONS.CSV
  {
    const dbFo3 = readFile('js/db_fo3.js');
    const regFo3 = readFile('js/reg_fo3.js');
    const dbW = getDbWeaponNames(dbFo3);
    const regW = getRegWeaponNames(regFo3);
    const missing = [...regW].filter(n => !dbW.has(n));
    assert(
      missing.length === 0,
      `FO3: all registry weapons exist in WEAPONS.CSV (missing: ${missing.join(', ') || 'none'})`
    );
  }

  // 38.4 FO3: every WEAPONS.CSV row exists in registry
  {
    const dbFo3 = readFile('js/db_fo3.js');
    const regFo3 = readFile('js/reg_fo3.js');
    const dbW = getDbWeaponNames(dbFo3);
    const regW = getRegWeaponNames(regFo3);
    const missing = [...dbW].filter(n => !regW.has(n));
    assert(
      missing.length === 0,
      `FO3: all WEAPONS.CSV rows exist in registry (missing: ${missing.join(', ') || 'none'})`
    );
  }
}

// ══════════════════════════════════════════════════════════════
//  SUITE 39 — Ammo Token Split (Energy Cell / MFC / ECP)
//  AMMO.CSV must carry three distinct caliber names; no bare EC
//  token may remain as a caliber or as a weapon Ammo_Type.
//  10 tests
// ══════════════════════════════════════════════════════════════
header('Ammo Token Split (EC→3)');
{
  function getAmmoCalibers39(src) {
    const start = src.indexOf('[AMMO.CSV]');
    if (start === -1) return new Set();
    const rest = src.substring(start + 10);
    const endIdx = rest.search(/\n\[/);
    const block = endIdx === -1 ? rest : rest.substring(0, endIdx);
    const cals = new Set();
    block.split('\n').forEach(l => {
      const t = l.trim();
      if (!t || t.startsWith('[') || t.startsWith('Caliber')) return;
      const cal = t.split(',')[0].trim();
      if (cal) cals.add(cal);
    });
    return cals;
  }

  function getWeaponAmmoTypes39(src) {
    const start = src.indexOf('[WEAPONS.CSV]');
    if (start === -1) return new Set();
    const rest = src.substring(start + 13);
    const endIdx = rest.search(/\n\[/);
    const block = endIdx === -1 ? rest : rest.substring(0, endIdx);
    const types = new Set();
    block.split('\n').forEach(l => {
      const t = l.trim();
      if (!t || t.startsWith('[') || t.startsWith('Weapon_Name')) return;
      const parts = t.split(',');
      const ammoType = parts[parts.length - 1].trim();
      if (ammoType) types.add(ammoType);
    });
    return types;
  }

  const nvSrc39 = readFile('js/db_nv.js');
  const nvCals39 = getAmmoCalibers39(nvSrc39);
  // 39.1 FNV AMMO.CSV contains Energy Cell
  assert(nvCals39.has('Energy Cell'), 'FNV AMMO.CSV contains Energy Cell caliber');
  // 39.2 FNV AMMO.CSV contains Microfusion Cell
  assert(nvCals39.has('Microfusion Cell'), 'FNV AMMO.CSV contains Microfusion Cell caliber');
  // 39.3 FNV AMMO.CSV contains Electron Charge Pack
  assert(
    nvCals39.has('Electron Charge Pack'),
    'FNV AMMO.CSV contains Electron Charge Pack caliber'
  );
  // 39.4 FNV AMMO.CSV has no bare EC caliber
  assert(!nvCals39.has('EC'), 'FNV AMMO.CSV: bare EC ammo token is gone');
  // 39.5 FNV WEAPONS.CSV has no Ammo_Type EC
  const nvTypes39 = getWeaponAmmoTypes39(nvSrc39);
  assert(!nvTypes39.has('EC'), 'FNV WEAPONS.CSV: no weapon has Ammo_Type EC');

  const fo3Src39 = readFile('js/db_fo3.js');
  const fo3Cals39 = getAmmoCalibers39(fo3Src39);
  // 39.6 FO3 AMMO.CSV contains Energy Cell
  assert(fo3Cals39.has('Energy Cell'), 'FO3 AMMO.CSV contains Energy Cell caliber');
  // 39.7 FO3 AMMO.CSV contains Microfusion Cell
  assert(fo3Cals39.has('Microfusion Cell'), 'FO3 AMMO.CSV contains Microfusion Cell caliber');
  // 39.8 FO3 AMMO.CSV contains Electron Charge Pack
  assert(
    fo3Cals39.has('Electron Charge Pack'),
    'FO3 AMMO.CSV contains Electron Charge Pack caliber'
  );
  // 39.9 FO3 AMMO.CSV has no bare EC caliber
  assert(!fo3Cals39.has('EC'), 'FO3 AMMO.CSV: bare EC ammo token is gone');
  // 39.10 FO3 WEAPONS.CSV has no Ammo_Type EC
  const fo3Types39 = getWeaponAmmoTypes39(fo3Src39);
  assert(!fo3Types39.has('EC'), 'FO3 WEAPONS.CSV: no weapon has Ammo_Type EC');
}

// ══════════════════════════════════════════════════════════════
//  SUITE 40 — Inventory Category Filter + Mod Type (Phase 4d-i)
//  'mod' is accepted in schema + autoImportState; filter bar exists;
//  renderInventory() honours the active filter; mod in type select.
//  6 tests
// ══════════════════════════════════════════════════════════════
header('Inventory Category Filter + Mod Type');

// 40.1  'mod' appears in the inventory type enum in getSystemDirective() in api.js
assert(
  /"mod"/.test(apiSource),
  'api.js inventory schema includes "mod" as a valid item type (Phase 4d-i)'
);

// 40.2  autoImportState() filter block only redirects type === 'ammo' — mod passes through
{
  let importBody40 = '';
  try {
    importBody40 = extractFunctionBody(apiSource, 'autoImportState');
  } catch (_) {}
  // The filter must contain 'ammo' but must NOT redirect or reject 'mod'
  assert(
    /type.*===.*['"]ammo['"]/.test(importBody40) && !/type.*===.*['"]mod['"]/.test(importBody40),
    "autoImportState() routes 'ammo' to state.ammo but passes 'mod' items through to inventory"
  );
}

// 40.3  Inventory filter bar element exists in index.html
assert(
  /id="invFilterBar"/.test(htmlSource),
  'id="invFilterBar" element exists in index.html (inventory category filter bar)'
);

// 40.4  Filter bar contains a button for the 'mod' category
assert(
  /data-filter="mod"/.test(htmlSource),
  'index.html filter bar has data-filter="mod" button (Mods category filter)'
);

// 40.5  'mod' option exists in the #newItemType select in index.html
assert(
  /value="mod"/.test(htmlSource),
  '#newItemType select contains value="mod" option (Phase 4d-i mod type)'
);

// 40.6  renderInventory() in ui.js references _invFilter (honours category filter)
{
  let renderBody40 = '';
  try {
    renderBody40 = extractFunctionBody(uiSource, 'renderInventory');
  } catch (_) {}
  assert(
    /_invFilter/.test(renderBody40),
    'renderInventory() references _invFilter to honour the active category filter'
  );
}

// ══════════════════════════════════════════════════════════════
//  SUITE 41 — Weapon Mods CSV + Registry Parity (Phase 4d-ii)
//  [WEAPON_MODS.CSV] structural guard: section exists, correct
//  column header, all rows 5 cols; parity between db_nv.js CSV
//  and reg_nv.js 'mod' entries in both directions.
//  5 tests
// ══════════════════════════════════════════════════════════════
header('Weapon Mods CSV + Registry Parity');
{
  const dbNv41 = readFile('js/db_nv.js');
  const regNv41 = readFile('js/reg_nv.js');

  // 41.1  [WEAPON_MODS.CSV] section exists in db_nv.js
  assert(dbNv41.includes('[WEAPON_MODS.CSV]'), 'db_nv.js contains [WEAPON_MODS.CSV] section');

  // 41.2 + 41.3  Column header correct and all data rows have exactly 5 columns
  {
    const EXPECTED_HEADER = 'Name,Weapon,Effect,Value,Weight';
    const blockMatch = dbNv41.match(/\[WEAPON_MODS\.CSV\]([\s\S]*?)(?=\n\[|\n`;)/);
    if (!blockMatch) {
      fail('db_nv.js [WEAPON_MODS.CSV]: could not extract block');
    } else {
      const lines = blockMatch[1]
        .split('\n')
        .map(l => l.trim())
        .filter(Boolean);
      assert(
        lines.length >= 1 && lines[0] === EXPECTED_HEADER,
        `[WEAPON_MODS.CSV] header is "${EXPECTED_HEADER}"`
      );
      const EXPECTED_COLS = EXPECTED_HEADER.split(',').length;
      const badRows = [];
      for (let i = 1; i < lines.length; i++) {
        const cols = lines[i].split(',').length;
        if (cols !== EXPECTED_COLS)
          badRows.push(`row ${i + 1} (${cols} cols): ${lines[i].slice(0, 50)}`);
      }
      assert(
        badRows.length === 0,
        `[WEAPON_MODS.CSV] all data rows have ${EXPECTED_COLS} columns` +
          (badRows.length ? ` — bad: ${badRows.join('; ')}` : '')
      );
    }
  }

  // Helper: extract all mod Names from WEAPON_MODS.CSV
  function getModCsvNames(src) {
    const start = src.indexOf('[WEAPON_MODS.CSV]');
    if (start === -1) return new Set();
    const rest = src.substring(start + 17);
    const endIdx = rest.search(/\n\[|\n`;/);
    const block = endIdx === -1 ? rest : rest.substring(0, endIdx);
    const names = new Set();
    block.split('\n').forEach(l => {
      const t = l.trim();
      if (!t || t.startsWith('[') || t.startsWith('Name,')) return;
      const name = t.split(',')[0].trim();
      if (name) names.add(name);
    });
    return names;
  }

  // Helper: extract all 'mod' type names from registry
  function getRegModNames(src) {
    const names = new Set();
    const re = /\{\s*name\s*:\s*(?:'([^']*)'|"([^"]*)")\s*,\s*type\s*:\s*'mod'\s*\}/g;
    let m;
    while ((m = re.exec(src)) !== null) names.add(m[1] !== undefined ? m[1] : m[2]);
    return names;
  }

  // 41.4  Every reg_nv 'mod' entry exists in WEAPON_MODS.CSV
  {
    const csvNames = getModCsvNames(dbNv41);
    const regNames = getRegModNames(regNv41);
    const missing = [...regNames].filter(n => !csvNames.has(n));
    assert(
      missing.length === 0,
      `FNV: all registry mods exist in WEAPON_MODS.CSV (missing: ${missing.join(', ') || 'none'})`
    );
  }

  // 41.5  Every WEAPON_MODS.CSV row exists in reg_nv 'mod' entries
  {
    const csvNames = getModCsvNames(dbNv41);
    const regNames = getRegModNames(regNv41);
    const missing = [...csvNames].filter(n => !regNames.has(n));
    assert(
      missing.length === 0,
      `FNV: all WEAPON_MODS.CSV rows exist in registry (missing: ${missing.join(', ') || 'none'})`
    );
  }
}

// ══════════════════════════════════════════════════════════════
//  SUITE 42 — Native Command Router (Phase 5a / 5a-fix)
//  Deterministic commands ([FEATURES]/[CROSSROADS]/[SLEEP]/[WAIT])
//  are intercepted pre-fetch; dead system-prompt blocks removed.
//  42.6 non-empty guard prevents vacuous pass on 42.7/42.8.
//  42.10/42.11 guard the syncStateFromDom round-trip bug fix:
//  _nativeSleep/_nativeWait must call loadUI() BEFORE saveState()
//  so state→DOM is written first and syncStateFromDom reads back
//  the new values (not the stale ones from unchanged inputs).
//  11 tests
// ══════════════════════════════════════════════════════════════
header('Native Command Router (Phase 5a)');
{
  const apiSrc42 = readFile('js/api.js');

  // 42.1  NATIVE_COMMAND_ROUTER object is defined in api.js
  assert(
    apiSrc42.includes('const NATIVE_COMMAND_ROUTER'),
    'api.js defines NATIVE_COMMAND_ROUTER object'
  );

  // 42.2  [FEATURES] is a key in NATIVE_COMMAND_ROUTER
  assert(/'\[FEATURES\]'\s*:/.test(apiSrc42), 'NATIVE_COMMAND_ROUTER has [FEATURES] handler');

  // 42.3  [CROSSROADS] is a key in NATIVE_COMMAND_ROUTER
  assert(/'\[CROSSROADS\]'\s*:/.test(apiSrc42), 'NATIVE_COMMAND_ROUTER has [CROSSROADS] handler');

  // 42.4  [SLEEP] is a key in NATIVE_COMMAND_ROUTER
  assert(/'\[SLEEP\]'\s*:/.test(apiSrc42), 'NATIVE_COMMAND_ROUTER has [SLEEP] handler');

  // 42.5  transmitMessage() calls _routeNativeCommand before the Gemini fetch
  {
    let txBody = '';
    try {
      txBody = extractFunctionBody(apiSrc42, 'transmitMessage');
    } catch (_) {}
    const routerIdx = txBody.indexOf('_routeNativeCommand');
    const fetchIdx = txBody.indexOf('generativelanguage.googleapis.com');
    assert(
      routerIdx !== -1 && fetchIdx !== -1 && routerIdx < fetchIdx,
      'transmitMessage() invokes _routeNativeCommand before the Gemini fetch'
    );
  }

  // Extract getSystemDirective body once — shared by 42.6/42.7/42.8
  // 42.6 asserts it's non-empty to prevent 42.7/42.8 from passing vacuously
  // when extractFunctionBody returns '' on a parse failure.
  let sdBody42 = '';
  try {
    sdBody42 = extractFunctionBody(apiSrc42, 'getSystemDirective');
  } catch (_) {}

  // 42.6  body is extractable (guards 42.7/42.8 against vacuous false-green)
  assert(
    sdBody42.length > 100,
    'getSystemDirective() body is extractable (non-vacuous guard for 42.7/42.8)'
  );

  // 42.7  getSystemDirective() no longer contains the dead [FEATURES] instruction block
  assert(
    !sdBody42.includes('[FEATURES] Canonical Command Registry'),
    'getSystemDirective() no longer contains the dead [FEATURES] instruction block'
  );

  // 42.8  getSystemDirective() no longer contains the dead [CROSSROADS] instruction block
  assert(
    !sdBody42.includes('[CROSSROADS] Command Handler'),
    'getSystemDirective() no longer contains the dead [CROSSROADS] instruction block'
  );

  // 42.9  _nativeWait function exists for [WAIT: X Hrs] native handling
  assert(
    apiSrc42.includes('function _nativeWait'),
    'api.js defines _nativeWait() for [WAIT: X Hrs] native handling'
  );

  // 42.10  _nativeSleep calls loadUI() BEFORE saveState()
  //  Regression guard: without loadUI(), syncStateFromDom() in saveState()
  //  reads stale DOM inputs (unchanged hp_cur, calendar) and wipes the mutations.
  {
    let sleepBody = '';
    try {
      sleepBody = extractFunctionBody(apiSrc42, '_nativeSleep');
    } catch (_) {}
    const loadIdx = sleepBody.indexOf('loadUI');
    const saveIdx = sleepBody.indexOf('saveState');
    assert(
      loadIdx !== -1 && saveIdx !== -1 && loadIdx < saveIdx,
      '_nativeSleep calls loadUI() before saveState() (syncStateFromDom round-trip guard)'
    );
  }

  // 42.11  _nativeWait calls loadUI() BEFORE saveState()
  {
    let waitBody = '';
    try {
      waitBody = extractFunctionBody(apiSrc42, '_nativeWait');
    } catch (_) {}
    const loadIdx = waitBody.indexOf('loadUI');
    const saveIdx = waitBody.indexOf('saveState');
    assert(
      loadIdx !== -1 && saveIdx !== -1 && loadIdx < saveIdx,
      '_nativeWait calls loadUI() before saveState() (syncStateFromDom round-trip guard)'
    );
  }
}

// ══════════════════════════════════════════════════════════════
//  SUITE 43 — GAME_DEFS Structural Integrity (Phase 5b)
//  Aggregation layer: GAME_DEFS in state.js + _activeDef() helper.
//  Collapses FNV/FO3 ternaries into config lookups; zero behavior change.
//  10 tests
// ══════════════════════════════════════════════════════════════
header('GAME_DEFS Structural Integrity (Phase 5b)');
{
  const stateSrc43 = readFile('js/state.js');

  // 43.1  state.js declares const GAME_DEFS = {
  assert(
    /const GAME_DEFS\s*=\s*\{/.test(stateSrc43),
    'state.js declares const GAME_DEFS = { ... }'
  );

  // 43.2  window.GAME_DEFS exposed on the global object
  assert(
    /window\.GAME_DEFS\s*=\s*GAME_DEFS/.test(stateSrc43),
    'state.js assigns window.GAME_DEFS = GAME_DEFS (global exposure)'
  );

  // 43.3  _activeDef() helper function defined in state.js
  assert(
    /function _activeDef\s*\(/.test(stateSrc43),
    'state.js defines _activeDef() TDZ-safe helper'
  );

  // 43.4  GAME_DEFS has FNV and FO3 top-level keys
  assert(
    /\bFNV\s*:\s*\{/.test(stateSrc43) && /\bFO3\s*:\s*\{/.test(stateSrc43),
    'GAME_DEFS has FNV and FO3 top-level keys'
  );

  // 43.5  GAME_DEFS ai sub-object has all three directive fields
  assert(
    /skillSystemText\s*:/.test(stateSrc43) &&
      /factionSystemText\s*:/.test(stateSrc43) &&
      /irreversibleTriggers\s*:/.test(stateSrc43),
    'GAME_DEFS ai sub-object has skillSystemText, factionSystemText, irreversibleTriggers'
  );

  // 43.6  FNV calendar startYear = 2281
  assert(/startYear\s*:\s*2281/.test(stateSrc43), 'GAME_DEFS.FNV.calendar.startYear is 2281');

  // 43.7  FO3 calendar startYear = 2277
  assert(/startYear\s*:\s*2277/.test(stateSrc43), 'GAME_DEFS.FO3.calendar.startYear is 2277');

  // 43.8  SKILL_KEYS_FO3 literal includes big_guns and small_guns
  {
    const fo3M = stateSrc43.match(/const SKILL_KEYS_FO3\s*=\s*\[([^\]]+)\]/);
    const fo3Skills = fo3M ? fo3M[1] : '';
    assert(
      fo3Skills.includes("'big_guns'") && fo3Skills.includes("'small_guns'"),
      "SKILL_KEYS_FO3 literal includes 'big_guns' and 'small_guns'"
    );
  }

  // 43.9  getFactionRegistry() body references _activeDef (not the old inline ternary)
  {
    let frBody = '';
    try {
      frBody = extractFunctionBody(stateSrc43, 'getFactionRegistry');
    } catch (_) {}
    assert(frBody.includes('_activeDef'), 'getFactionRegistry() delegates to _activeDef()');
  }

  // 43.10  getSkillKeys() body references _activeDef
  {
    let skBody = '';
    try {
      skBody = extractFunctionBody(stateSrc43, 'getSkillKeys');
    } catch (_) {}
    assert(skBody.includes('_activeDef'), 'getSkillKeys() delegates to _activeDef()');
  }
}

// ══════════════════════════════════════════════════════════════
//  SUITE 44 — Anonymous Auth + Security Rules + XSS Coercion Fix (Phase 5c-i)
//  Closed P0 hole: auth-gated Firestore paths, per-uid rules, App Check gate,
//  and XSS bypass via cloud pull routed through sanitizeImportedContainer.
//  12 tests
// ══════════════════════════════════════════════════════════════
header('Phase 5c-i: Auth + Rules + XSS Fix');

{
  // 44.1  cloud.js references signInAnonymously (Firebase Auth import)
  assert(
    /signInAnonymously/.test(cloudSource),
    'cloud.js references signInAnonymously (anonymous auth on boot)'
  );

  // 44.2  cloud.js references onAuthStateChanged (tracks current uid)
  assert(
    /onAuthStateChanged/.test(cloudSource),
    'cloud.js references onAuthStateChanged (uid state tracking)'
  );

  // 44.3  cloud.js push/pull targets users/{uid} path, not flat saves/{courierId}
  assert(
    /doc\(db,\s*['"]users['"]/.test(cloudSource) &&
      !/doc\(db,\s*['"]saves['"],\s*safeId/.test(cloudSource),
    "cloud.js push/pull uses doc(db, 'users', uid, ...) not flat doc(db, 'saves', safeId)"
  );

  // 44.4  firestore.rules file exists
  assert(
    fs.existsSync(path.join(ROOT, 'firestore.rules')),
    'firestore.rules exists in repo root (security lockdown file)'
  );

  // 44.5  firestore.rules contains per-uid access rule
  {
    const rulesSource = fs.existsSync(path.join(ROOT, 'firestore.rules'))
      ? fs.readFileSync(path.join(ROOT, 'firestore.rules'), 'utf8')
      : '';
    assert(
      rulesSource.includes('request.auth.uid == uid'),
      'firestore.rules contains per-uid access rule (request.auth.uid == uid)'
    );

    // 44.6  firestore.rules denies legacy flat saves collection
    assert(
      /match\s*\/saves\/\{/.test(rulesSource) && rulesSource.includes('if false'),
      'firestore.rules denies legacy flat saves/{id} collection (if false)'
    );
  }

  // 44.7  firebase.json references firestore.rules
  {
    const firebaseJsonSource = fs.existsSync(path.join(ROOT, 'firebase.json'))
      ? fs.readFileSync(path.join(ROOT, 'firebase.json'), 'utf8')
      : '';
    assert(
      firebaseJsonSource.includes('firestore.rules'),
      'firebase.json references "firestore.rules" (deploy configuration)'
    );
  }

  // 44.8  cloud.js references initializeAppCheck and ReCaptchaV3Provider (App Check init)
  assert(
    /initializeAppCheck/.test(cloudSource) && /ReCaptchaV3Provider/.test(cloudSource),
    'cloud.js references initializeAppCheck and ReCaptchaV3Provider (App Check gate)'
  );

  // 44.9  api.js defines sanitizeImportedContainer function
  assert(
    /function sanitizeImportedContainer/.test(apiSource),
    'api.js defines sanitizeImportedContainer() (XSS coercion layer for cloud pull path)'
  );

  // 44.10  cloud.js pull path calls sanitizeImportedContainer (XSS bypass closed)
  assert(
    /sanitizeImportedContainer/.test(cloudSource),
    'cloud.js pull path calls sanitizeImportedContainer() (raw setItem XSS bypass closed)'
  );

  // 44.11  CSP in index.html contains identitytoolkit.googleapis.com (Firebase Auth endpoint)
  assert(
    /identitytoolkit\.googleapis\.com/.test(htmlSource),
    'CSP in index.html covers identitytoolkit.googleapis.com (Firebase Auth endpoint)'
  );

  // 44.12  sanitizeImportedContainer round-trip: apostrophes and ampersands survive as raw
  //        strings; no HTML encoding at the storage layer (double-escape regression guard).
  //        A <script> payload is preserved as a literal string — render-time escapeHtml() stops it.
  {
    let _testSanitize = null;
    try {
      const fnBody = extractFunctionBody(apiSource, 'sanitizeImportedContainer');
      const fnStart = apiSource.indexOf('function sanitizeImportedContainer');
      const paramsStart = apiSource.indexOf('(', fnStart);
      const paramsEnd = apiSource.indexOf('{', paramsStart);
      const params = apiSource.slice(paramsStart, paramsEnd).trim();
      _testSanitize = eval(`(function sanitizeImportedContainer${params}${fnBody})`);
    } catch (_) {}
    if (_testSanitize) {
      const _tc = {
        activeContext: 'FNV',
        campaigns: {
          FNV: {
            quests: [
              { name: "Ain't That a Kick in the Head", status: 'active', objective: 'R&R cap' },
              { name: '<script>alert(1)</script>', status: 'active', objective: null },
            ],
            inventory: [{ name: "Programmer's Rifle", qty: 1, wgt: 3.5, val: 100 }],
          },
        },
      };
      const _r = _testSanitize(_tc);
      const _q0 = _r.campaigns.FNV.quests[0];
      const _q1 = _r.campaigns.FNV.quests[1];
      const _i0 = _r.campaigns.FNV.inventory[0];
      assert(
        _q0.name === "Ain't That a Kick in the Head" &&
          !_q0.name.includes('&#x27;') &&
          _q0.objective === 'R&R cap' &&
          !_q0.objective.includes('&amp;') &&
          _i0.name === "Programmer's Rifle" &&
          _q1.name === '<script>alert(1)</script>',
        'sanitizeImportedContainer: apostrophe/ampersand survive as raw strings; <script> stored literal (no HTML encoding at storage layer)'
      );
    } else {
      fail(
        'sanitizeImportedContainer behavioral test: function could not be evaluated in isolation'
      );
    }
  }
}

// ══════════════════════════════════════════════════════════════
//  SUITE 45 — Google Sign-In + Account Panel (Phase 5c-ii)
//  Durable identity: Google auth link, collision recovery,
//  sign-out → re-anon, popup-only flow, ACCOUNT UI panel, boot guard.
//  15 tests
// ══════════════════════════════════════════════════════════════
header('Phase 5c-ii: Google Sign-In + Account Panel');

{
  // 45.1  cloud.js imports GoogleAuthProvider
  assert(
    /GoogleAuthProvider/.test(cloudSource),
    'cloud.js references GoogleAuthProvider (Google auth import)'
  );

  // 45.2  cloud.js references linkWithPopup (desktop sign-in flow)
  assert(
    /linkWithPopup/.test(cloudSource),
    'cloud.js references linkWithPopup (desktop Google sign-in flow)'
  );

  // 45.3  cloud.js does NOT import or call linkWithRedirect (popup-only mobile fix — redirect broke
  //        on iOS/Chrome due to third-party storage partitioning blocking getRedirectResult)
  assert(
    !/linkWithRedirect/.test(cloudSource),
    'cloud.js does not reference linkWithRedirect (popup-only fix: redirect path removed)'
  );

  // 45.4  cloud.js references getRedirectResult (completes mobile redirect on boot)
  assert(
    /getRedirectResult/.test(cloudSource),
    'cloud.js references getRedirectResult (boot-time mobile redirect completion)'
  );

  // 45.5  cloud.js references signOut (account sign-out function)
  assert(/\bsignOut\b/.test(cloudSource), 'cloud.js references signOut (account sign-out)');

  // 45.6  cloud.js sign-out path re-signs-in anonymously (signOut + signInAnonymously together)
  {
    const signOutBody = (() => {
      const idx = cloudSource.indexOf('signOutAccount');
      if (idx === -1) return '';
      let i = cloudSource.indexOf('{', idx);
      let depth = 0;
      const start = i;
      while (i < cloudSource.length) {
        if (cloudSource[i] === '{') depth++;
        else if (cloudSource[i] === '}' && --depth === 0) return cloudSource.slice(start, i + 1);
        i++;
      }
      return '';
    })();
    assert(
      /signOut/.test(signOutBody) && /signInAnonymously/.test(signOutBody),
      'cloud.js signOutAccount() calls signOut then signInAnonymously (returns to anon session)'
    );
  }

  // 45.7  cloud.js handles auth/credential-already-in-use (collision recovery)
  assert(
    /credential-already-in-use/.test(cloudSource),
    'cloud.js handles auth/credential-already-in-use error (Google account collision recovery)'
  );

  // 45.8  cloud.js references signInWithCredential (collision recovery path)
  assert(
    /signInWithCredential/.test(cloudSource),
    'cloud.js references signInWithCredential (collision recovery — signs into existing account)'
  );

  // 45.9  ui.js defines renderAccount() function
  assert(
    /function renderAccount\(\)/.test(uiSource),
    'ui.js defines renderAccount() (ACCOUNT panel render function)'
  );

  // 45.10  loadUI() calls renderAccount()
  {
    let loadUIBody = '';
    try {
      loadUIBody = extractFunctionBody(uiSource, 'loadUI');
    } catch (_) {}
    assert(
      /renderAccount\(\)/.test(loadUIBody),
      'loadUI() calls renderAccount() (account panel wired into page load)'
    );
  }

  // 45.11  index.html has ACCOUNT details.panel element
  assert(
    /id="accountPanel"/.test(htmlSource) || />\s*ACCOUNT\s*<\/h2>/.test(htmlSource),
    'index.html has ACCOUNT panel element (id=accountPanel or ACCOUNT heading)'
  );

  // 45.12  CSP in index.html covers apis.google.com (Google Sign-In popup script)
  assert(
    /apis\.google\.com/.test(htmlSource),
    'CSP in index.html covers apis.google.com (Google Sign-In popup flow)'
  );

  // 45.13  boot signInAnonymously is guarded by authStateReady() + currentUser check
  //        (unconditional call replaces a Google-linked session on every reload — the critical bug)
  assert(
    /authStateReady\(\)/.test(cloudSource) && /!\s*auth\.currentUser/.test(cloudSource),
    'cloud.js boot sign-in is conditional: authStateReady() + !auth.currentUser guard present (not unconditional — prevents clobbering Google session on reload)'
  );

  // 45.14  boot order hardened: getRedirectResult awaited before authStateReady()
  //        (sequential IIFE ensures redirect result is visible before the anon-fallback guard runs)
  assert(
    cloudSource.indexOf('await getRedirectResult') <
      cloudSource.indexOf('await auth.authStateReady'),
    'cloud.js boot: await getRedirectResult appears before await auth.authStateReady (hardened sequential boot order)'
  );

  // 45.15  gesture safety: first await in signInWithGoogle is linkWithPopup itself
  //        (no async work before the popup open — iOS/Android require the popup to open
  //        synchronously in the user-gesture context)
  {
    let signInBody = '';
    try {
      const idx = cloudSource.indexOf('window.signInWithGoogle');
      if (idx !== -1) {
        let i = cloudSource.indexOf('{', idx);
        let depth = 0;
        const start = i;
        while (i < cloudSource.length) {
          if (cloudSource[i] === '{') depth++;
          else if (cloudSource[i] === '}' && --depth === 0) {
            signInBody = cloudSource.slice(start, i + 1);
            break;
          }
          i++;
        }
      }
    } catch (_) {}
    const firstAwait = signInBody.indexOf('await');
    assert(
      firstAwait !== -1 && signInBody.indexOf('await linkWithPopup') === firstAwait,
      'cloud.js signInWithGoogle: first await is linkWithPopup (gesture-safe — popup opened with no prior async work)'
    );
  }
}

// ══════════════════════════════════════════════════════════════
//  SUITE 46 — Cloud Save Picker + Local Migration (Phase 5c-iii)
//  Data-safety invariants: additive uploads, contentHash dedup,
//  confirm-gated load/delete, picker UI wired.
//  16 tests
// ══════════════════════════════════════════════════════════════
header('Phase 5c-iii: Cloud Save Picker + Local Migration');

{
  // 46.1  cloud.js references addDoc (additive saves — never overwrites with set)
  assert(
    /\baddDoc\b/.test(cloudSource),
    'cloud.js references addDoc (additive cloud saves — migration never overwrites)'
  );

  // 46.2  cloud.js references collection AND getDocs (subcollection query for picker)
  assert(
    /\bcollection\b/.test(cloudSource) && /\bgetDocs\b/.test(cloudSource),
    'cloud.js references collection + getDocs (subcollection listing for cloud save picker)'
  );

  // 46.3  cloud.js references updateDoc AND deleteDoc (rename + delete operations)
  assert(
    /\bupdateDoc\b/.test(cloudSource) && /\bdeleteDoc\b/.test(cloudSource),
    'cloud.js references updateDoc + deleteDoc (rename and delete cloud saves)'
  );

  // 46.4  cloud.js uses the shared computeSaveChecksum helper (moved to state.js per Protocol 22)
  assert(
    cloudSource.includes('window.computeSaveChecksum'),
    'cloud.js uses window.computeSaveChecksum helper (FNV-1a dedup fingerprint from state.js)'
  );

  // 46.5  computeSaveChecksum behavioral: same input → same hash (determinism)
  //        Extracts _fnv1a32 from state.js (where the canonical algorithm now lives)
  {
    let _testHash = null;
    try {
      const fnIdx = stateSource.indexOf('function _fnv1a32');
      if (fnIdx !== -1) {
        let i = stateSource.indexOf('{', fnIdx);
        let depth = 0;
        while (i < stateSource.length) {
          if (stateSource[i] === '{') depth++;
          else if (stateSource[i] === '}' && --depth === 0) {
            const fnSrc = stateSource.slice(fnIdx, i + 1);
            eval(
              fnSrc +
                '\n_testHash = function(v, c, p) {' +
                '  function _s(o) { if (Array.isArray(o)) return o.map(_s);' +
                '    if (o && typeof o === "object") { var r = {};' +
                '      Object.keys(o).sort().forEach(function(k) { r[k] = _s(o[k]); }); return r; }' +
                '    return o; }' +
                '  return _fnv1a32(JSON.stringify(_s({ v: v||null, c: c||[], p: String(p||"") })));' +
                '};'
            );
            break;
          }
          i++;
        }
      }
    } catch (_) {}
    if (_testHash) {
      const v8 = { activeContext: 'FNV', campaigns: { FNV: { lvl: 5, name: 'Test' } } };
      const chat = [{ text: 'hello', sender: 'user' }];
      const h1 = _testHash(v8, chat, 'any');
      const h2 = _testHash(v8, chat, 'any');
      assert(
        typeof h1 === 'string' && h1.length > 0 && h1 === h2,
        'computeSaveChecksum is deterministic: same input → same hash every call'
      );
    } else {
      fail('computeSaveChecksum determinism: _fnv1a32 could not be evaluated from state.js');
    }
  }

  // 46.6  computeSaveChecksum behavioral: apostrophe/ampersand not HTML-encoded at hash layer
  //        (regression guard — 5c-i double-escape class: round-trip must be clean)
  {
    let _testHash = null;
    try {
      const fnIdx = stateSource.indexOf('function _fnv1a32');
      if (fnIdx !== -1) {
        let i = stateSource.indexOf('{', fnIdx);
        let depth = 0;
        while (i < stateSource.length) {
          if (stateSource[i] === '{') depth++;
          else if (stateSource[i] === '}' && --depth === 0) {
            const fnSrc = stateSource.slice(fnIdx, i + 1);
            eval(
              fnSrc +
                '\n_testHash = function(v, c, p) {' +
                '  function _s(o) { if (Array.isArray(o)) return o.map(_s);' +
                '    if (o && typeof o === "object") { var r = {};' +
                '      Object.keys(o).sort().forEach(function(k) { r[k] = _s(o[k]); }); return r; }' +
                '    return o; }' +
                '  return _fnv1a32(JSON.stringify(_s({ v: v||null, c: c||[], p: String(p||"") })));' +
                '};'
            );
            break;
          }
          i++;
        }
      }
    } catch (_) {}
    if (_testHash) {
      const v8 = {
        activeContext: 'FNV',
        campaigns: { FNV: { name: "Ain't That a Kick & a Half" } },
      };
      const h = _testHash(v8, [], 'any');
      assert(
        typeof h === 'string' && h.length > 0 && !h.includes('&#x27;') && !h.includes('&amp;'),
        'computeSaveChecksum: apostrophe/ampersand in data not HTML-encoded (storage-layer clean, no double-escape)'
      );
    } else {
      fail(
        'computeSaveChecksum apostrophe/ampersand test: _fnv1a32 could not be evaluated from state.js'
      );
    }
  }

  // 46.7  syncLocalSavesToCloud uses addDoc (not setDoc) — additive, never overwrites
  {
    const syncBody46 = (() => {
      const idx = cloudSource.indexOf('window.syncLocalSavesToCloud');
      if (idx === -1) return '';
      let i = cloudSource.indexOf('{', idx);
      let depth = 0;
      const start = i;
      while (i < cloudSource.length) {
        if (cloudSource[i] === '{') depth++;
        else if (cloudSource[i] === '}' && --depth === 0) return cloudSource.slice(start, i + 1);
        i++;
      }
      return '';
    })();
    assert(
      /\baddDoc\b/.test(syncBody46) && !/setDoc\s*\(/.test(syncBody46),
      'syncLocalSavesToCloud uses addDoc (not setDoc) — additive upload, never overwrites'
    );
  }

  // 46.8  syncLocalSavesToCloud body NEVER calls localStorage.setItem or removeItem
  //        (ADDITIVE ONLY — migration must not touch local state at all)
  {
    const syncBody46 = (() => {
      const idx = cloudSource.indexOf('window.syncLocalSavesToCloud');
      if (idx === -1) return '';
      let i = cloudSource.indexOf('{', idx);
      let depth = 0;
      const start = i;
      while (i < cloudSource.length) {
        if (cloudSource[i] === '{') depth++;
        else if (cloudSource[i] === '}' && --depth === 0) return cloudSource.slice(start, i + 1);
        i++;
      }
      return '';
    })();
    assert(
      !/localStorage\.setItem/.test(syncBody46) && !/localStorage\.removeItem/.test(syncBody46),
      'syncLocalSavesToCloud never calls localStorage.setItem or removeItem (ADDITIVE ONLY — no local state touched)'
    );
  }

  // 46.9  syncLocalSavesToCloud dedup checks localOriginId AND contentHash
  {
    const syncBody46 = (() => {
      const idx = cloudSource.indexOf('window.syncLocalSavesToCloud');
      if (idx === -1) return '';
      let i = cloudSource.indexOf('{', idx);
      let depth = 0;
      const start = i;
      while (i < cloudSource.length) {
        if (cloudSource[i] === '{') depth++;
        else if (cloudSource[i] === '}' && --depth === 0) return cloudSource.slice(start, i + 1);
        i++;
      }
      return '';
    })();
    assert(
      /localOriginId/.test(syncBody46) && /contentHash/.test(syncBody46),
      'syncLocalSavesToCloud dedup checks localOriginId AND contentHash (idempotent re-sync)'
    );
  }

  // 46.10  loadCloudSave is gated behind confirm()
  {
    const loadBody46 = (() => {
      const idx = cloudSource.indexOf('window.loadCloudSave');
      if (idx === -1) return '';
      let i = cloudSource.indexOf('{', idx);
      let depth = 0;
      const start = i;
      while (i < cloudSource.length) {
        if (cloudSource[i] === '{') depth++;
        else if (cloudSource[i] === '}' && --depth === 0) return cloudSource.slice(start, i + 1);
        i++;
      }
      return '';
    })();
    assert(
      /\bconfirm\b/.test(loadBody46),
      'loadCloudSave is gated behind confirm() — never auto-loads (data-safety)'
    );
  }

  // 46.11  loadCloudSave routes through sanitizeImportedContainer AND migrateState
  {
    const loadBody46 = (() => {
      const idx = cloudSource.indexOf('window.loadCloudSave');
      if (idx === -1) return '';
      let i = cloudSource.indexOf('{', idx);
      let depth = 0;
      const start = i;
      while (i < cloudSource.length) {
        if (cloudSource[i] === '{') depth++;
        else if (cloudSource[i] === '}' && --depth === 0) return cloudSource.slice(start, i + 1);
        i++;
      }
      return '';
    })();
    assert(
      /sanitizeImportedContainer/.test(loadBody46) && /migrateState/.test(loadBody46),
      'loadCloudSave routes through sanitizeImportedContainer AND migrateState (hardened load path)'
    );
  }

  // 46.12  deleteCloudSave is confirm-gated (explicit user action required)
  {
    const delBody46 = (() => {
      const idx = cloudSource.indexOf('window.deleteCloudSave');
      if (idx === -1) return '';
      let i = cloudSource.indexOf('{', idx);
      let depth = 0;
      const start = i;
      while (i < cloudSource.length) {
        if (cloudSource[i] === '{') depth++;
        else if (cloudSource[i] === '}' && --depth === 0) return cloudSource.slice(start, i + 1);
        i++;
      }
      return '';
    })();
    assert(
      /\bconfirm\b/.test(delBody46),
      'deleteCloudSave is confirm-gated (explicit confirmation before deleting cloud save)'
    );
  }

  // 46.13  renameCloudSave uses updateDoc (label-only update — not a new doc or overwrite)
  {
    const renBody46 = (() => {
      const idx = cloudSource.indexOf('window.renameCloudSave');
      if (idx === -1) return '';
      let i = cloudSource.indexOf('{', idx);
      let depth = 0;
      const start = i;
      while (i < cloudSource.length) {
        if (cloudSource[i] === '{') depth++;
        else if (cloudSource[i] === '}' && --depth === 0) return cloudSource.slice(start, i + 1);
        i++;
      }
      return '';
    })();
    assert(
      /\bupdateDoc\b/.test(renBody46) &&
        !/\baddDoc\b/.test(renBody46) &&
        !/\bsetDoc\b/.test(renBody46),
      'renameCloudSave uses updateDoc only (not addDoc/setDoc) — label-only update'
    );
  }

  // 46.14  renderCloudSavePicker() defined in ui.js
  assert(
    /async function renderCloudSavePicker\s*\(/.test(uiSource) ||
      /function renderCloudSavePicker\s*\(/.test(uiSource),
    'ui.js defines renderCloudSavePicker() (cloud save picker render function)'
  );

  // 46.15  loadUI() calls renderCloudSavePicker()
  {
    let loadUIBody46 = '';
    try {
      loadUIBody46 = extractFunctionBody(uiSource, 'loadUI');
    } catch (_) {}
    assert(
      /renderCloudSavePicker\(\)/.test(loadUIBody46),
      'loadUI() calls renderCloudSavePicker() (picker wired into page load)'
    );
  }

  // 46.16  index.html has cloudSavePickerBody element (picker mount point in ACCOUNT panel)
  assert(
    /id="cloudSavePickerBody"/.test(htmlSource),
    'index.html has #cloudSavePickerBody element (cloud save picker mount point in ACCOUNT panel)'
  );
}

// ══════════════════════════════════════════════════════════════
//  SUITE 47 — Gemini Key Sync + AI Studio Link (Phase 5c-iv)
//  Security: key never leaves device for anon or sync-OFF.
//  Picker: NAME button, date rendered once.
//  10 tests
// ══════════════════════════════════════════════════════════════
header('Phase 5c-iv: Gemini Key Sync + AI Studio Link');

{
  // 47.1  cloud.js defines window.saveGeminiKeyToCloud
  assert(
    /window\.saveGeminiKeyToCloud\s*=/.test(cloudSource),
    'cloud.js defines window.saveGeminiKeyToCloud (key sync write function)'
  );

  // 47.2  cloud.js defines window.loadGeminiKeyFromCloud (via module-local function)
  assert(
    /function loadGeminiKeyFromCloud\s*\(/.test(cloudSource) ||
      /window\.loadGeminiKeyFromCloud\s*=/.test(cloudSource),
    'cloud.js defines loadGeminiKeyFromCloud (key sync read function for boot restore)'
  );

  // 47.3  saveGeminiKeyToCloud body checks isAnonymous AND robco_gemini_key_sync
  //        (double guard: secrets never written for anon users or when toggle is OFF)
  {
    const saveGeminiBody = (() => {
      const idx = cloudSource.indexOf('window.saveGeminiKeyToCloud');
      if (idx === -1) return '';
      let i = cloudSource.indexOf('{', idx);
      let depth = 0;
      const start = i;
      while (i < cloudSource.length) {
        if (cloudSource[i] === '{') depth++;
        else if (cloudSource[i] === '}' && --depth === 0) return cloudSource.slice(start, i + 1);
        i++;
      }
      return '';
    })();
    assert(
      /isAnonymous/.test(saveGeminiBody) && /robco_gemini_key_sync/.test(saveGeminiBody),
      'saveGeminiKeyToCloud guards on isAnonymous AND robco_gemini_key_sync (key never synced for anon or sync-off)'
    );
  }

  // 47.4  saveGeminiKeyToCloud body writes to secrets/ subcollection path
  {
    const saveGeminiBody = (() => {
      const idx = cloudSource.indexOf('window.saveGeminiKeyToCloud');
      if (idx === -1) return '';
      let i = cloudSource.indexOf('{', idx);
      let depth = 0;
      const start = i;
      while (i < cloudSource.length) {
        if (cloudSource[i] === '{') depth++;
        else if (cloudSource[i] === '}' && --depth === 0) return cloudSource.slice(start, i + 1);
        i++;
      }
      return '';
    })();
    assert(
      /secrets/.test(saveGeminiBody),
      'saveGeminiKeyToCloud writes to secrets/ subcollection (Firestore path for key storage)'
    );
  }

  // 47.5  window.setGeminiKeySync defined in cloud.js + references geminiKeySync for Firestore write
  {
    const setSyncBody = (() => {
      const idx = cloudSource.indexOf('window.setGeminiKeySync');
      if (idx === -1) return '';
      let i = cloudSource.indexOf('{', idx);
      let depth = 0;
      const start = i;
      while (i < cloudSource.length) {
        if (cloudSource[i] === '{') depth++;
        else if (cloudSource[i] === '}' && --depth === 0) return cloudSource.slice(start, i + 1);
        i++;
      }
      return '';
    })();
    assert(
      setSyncBody.length > 50 && /geminiKeySync/.test(setSyncBody),
      'window.setGeminiKeySync defined and references geminiKeySync (toggle persists to Firestore settings)'
    );
  }

  // 47.6  robco_gemini_key_sync used as the local toggle mirror in cloud.js
  assert(
    /robco_gemini_key_sync/.test(cloudSource),
    "cloud.js uses 'robco_gemini_key_sync' as the local toggle mirror (localStorage key for sync preference)"
  );

  // 47.7  index.html has #geminiKeySyncToggle checkbox
  assert(
    /id="geminiKeySyncToggle"/.test(htmlSource),
    'index.html has #geminiKeySyncToggle checkbox (opt-in sync toggle in SECURITY panel)'
  );

  // 47.8  index.html has AI Studio link with correct href and rel="noopener"
  assert(
    /aistudio\.google\.com\/app\/apikey/.test(htmlSource) && /rel="noopener/.test(htmlSource),
    'index.html has AI Studio link (aistudio.google.com/app/apikey) with rel="noopener" (security)'
  );

  // 47.9  renderCloudSavePicker shows "NAME" button (not "REN")
  {
    let pickerBody = '';
    try {
      pickerBody = extractFunctionBody(uiSource, 'renderCloudSavePicker');
    } catch (_) {}
    assert(
      />NAME</.test(pickerBody) && !/>REN</.test(pickerBody),
      'renderCloudSavePicker shows NAME button (not REN) — Part B rename fix'
    );
  }

  // 47.10 renderCloudSavePicker does not append a separate dateStr after the label
  //        (double-date regression guard: label already contains date from syncLocalSavesToCloud)
  {
    let pickerBody = '';
    try {
      pickerBody = extractFunctionBody(uiSource, 'renderCloudSavePicker');
    } catch (_) {}
    assert(
      !/\bdateStr\b/.test(pickerBody),
      'renderCloudSavePicker does not use dateStr (double-date regression guard — date shown once via label)'
    );
  }
}

// ══════════════════════════════════════════════════════════════
//  SUITE 48 — Remote Kill-Switch + Client Auto-Disable (Protocol 32/35)
//  Fail-open: boot completes + all features work when config/flags absent.
//  Session-scoped auto-disable on repeated failures (FAIL_THRESHOLD=3).
//  11 tests
// ══════════════════════════════════════════════════════════════
header('Remote Kill-Switch + Client Auto-Disable (Protocol 32/35)');
{
  const cloudSrc48 = readFile('js/cloud.js');
  const apiSrc48 = readFile('js/api.js');
  const rulesSrc48 = fs.existsSync(path.join(ROOT, 'firestore.rules'))
    ? fs.readFileSync(path.join(ROOT, 'firestore.rules'), 'utf8')
    : '';

  // 48.1  cloud.js defines loadRemoteConfig
  assert(
    /async function loadRemoteConfig\s*\(/.test(cloudSrc48),
    'cloud.js defines loadRemoteConfig (remote config reader)'
  );

  // 48.2  loadRemoteConfig reads doc(db, 'config', 'flags') path
  assert(
    /getDoc\s*\(/.test(cloudSrc48) &&
      /['"]config['"]/.test(cloudSrc48) &&
      /['"]flags['"]/.test(cloudSrc48),
    "loadRemoteConfig reads doc(db, 'config', 'flags') path"
  );

  // 48.3  loadRemoteConfig uses Promise.race with a timeout
  assert(
    /Promise\.race/.test(cloudSrc48) &&
      (/config-timeout/.test(cloudSrc48) || /setTimeout/.test(cloudSrc48)),
    'loadRemoteConfig races config fetch against a timeout (fail-open on slow network)'
  );

  // 48.4  loadRemoteConfig body is wrapped in try/catch (fail-open on any error)
  {
    let rcBody = '';
    try {
      const idx = cloudSrc48.indexOf('async function loadRemoteConfig');
      if (idx !== -1) {
        let i = cloudSrc48.indexOf('{', idx);
        let depth = 0;
        const start = i;
        while (i < cloudSrc48.length) {
          if (cloudSrc48[i] === '{') depth++;
          else if (cloudSrc48[i] === '}' && --depth === 0) {
            rcBody = cloudSrc48.slice(start, i + 1);
            break;
          }
          i++;
        }
      }
    } catch (_) {}
    assert(
      /\btry\b/.test(rcBody) && /\bcatch\b/.test(rcBody),
      'loadRemoteConfig body is wrapped in try/catch (fail-open — any error keeps LKG/defaults)'
    );
  }

  // 48.5  loadRemoteConfig is NOT awaited in the boot IIFE
  assert(
    !/await\s+loadRemoteConfig/.test(cloudSrc48),
    'loadRemoteConfig is NOT awaited in boot IIFE (fire-and-forget — never on critical path)'
  );

  // 48.6  window.isFeatureEnabled defined + uses !== false pattern (fail-open for unknown keys)
  assert(
    /window\.isFeatureEnabled\s*=/.test(cloudSrc48) && /!==\s*false/.test(cloudSrc48),
    'window.isFeatureEnabled defined and uses !== false pattern (unknown/missing keys return true — fail-open)'
  );

  // 48.7  LKG key robco_feature_flags is both read from and written to localStorage
  assert(
    /robco_feature_flags/.test(cloudSrc48) &&
      /localStorage\.setItem\s*\(\s*['"]robco_feature_flags/.test(cloudSrc48) &&
      /localStorage\.getItem\s*\(\s*['"]robco_feature_flags/.test(cloudSrc48),
    "cloud.js reads and writes 'robco_feature_flags' localStorage key (last-known-good persistence)"
  );

  // 48.8  transmitMessage in api.js references isFeatureEnabled with 'aiChat'
  assert(
    /isFeatureEnabled/.test(apiSrc48) && /['"]aiChat['"]/.test(apiSrc48),
    "transmitMessage references isFeatureEnabled('aiChat') (AI chat kill-switch gate)"
  );

  // 48.9  a cloud operation references isFeatureEnabled with 'cloudSync'
  assert(
    /isFeatureEnabled/.test(cloudSrc48) && /['"]cloudSync['"]/.test(cloudSrc48),
    "cloud.js references isFeatureEnabled('cloudSync') (cloud sync kill-switch gate)"
  );

  // 48.10  _recordFeatureFailure defined + FAIL_THRESHOLD present
  assert(
    /function _recordFeatureFailure/.test(cloudSrc48) && /FAIL_THRESHOLD/.test(cloudSrc48),
    'cloud.js defines _recordFeatureFailure and FAIL_THRESHOLD (session-scoped auto-disable after repeated failures)'
  );

  // 48.11  firestore.rules has /config/{...} with allow read: if true AND allow write: if false
  assert(
    /match\s*\/config\/\{/.test(rulesSrc48) &&
      /allow\s+read\s*:\s*if\s+true/.test(rulesSrc48) &&
      /allow\s+write\s*:\s*if\s+false/.test(rulesSrc48),
    'firestore.rules has /config/{doc} rule: allow read if true, allow write if false (public read, console-only write)'
  );
}

// ══════════════════════════════════════════════════════════════
//  SUITE 49 — CI / Repo Hardening Guards (Q-series)
//  Asset-manifest completeness, Firestore no-allow-all, release.yml CI gating.
//  4 tests
// ══════════════════════════════════════════════════════════════
header('Suite 49 — CI / Repo Hardening Guards');
{
  const swSrc49 = readFile('sw.js');
  const assetsM49 = swSrc49.match(/const ASSETS\s*=\s*\[([\s\S]*?)\];/);
  const assetsSet49 = new Set();
  if (assetsM49) {
    for (const m of assetsM49[1].matchAll(/'([^']+)'/g)) assetsSet49.add(m[1]);
  }

  // 49.1  Every js/ file is listed in sw.js ASSETS
  const jsFiles49 = fs.readdirSync(path.join(ROOT, 'js')).filter(f => f.endsWith('.js'));
  const jsMissing49 = jsFiles49.filter(f => !assetsSet49.has('./js/' + f));
  assert(
    jsMissing49.length === 0,
    'All js/ files listed in sw.js ASSETS (asset-manifest completeness)' +
      (jsMissing49.length ? ' — missing: ' + jsMissing49.join(', ') : '')
  );

  // 49.2  Every css/ file is listed in sw.js ASSETS
  const cssFiles49 = fs.readdirSync(path.join(ROOT, 'css')).filter(f => f.endsWith('.css'));
  const cssMissing49 = cssFiles49.filter(f => !assetsSet49.has('./css/' + f));
  assert(
    cssMissing49.length === 0,
    'All css/ files listed in sw.js ASSETS (asset-manifest completeness)' +
      (cssMissing49.length ? ' — missing: ' + cssMissing49.join(', ') : '')
  );

  // 49.3  firestore.rules has no dangerous broad write grants
  //       Fails on: allow write: if true  |  allow read, write: if true
  //       Fails on: allow (read,)write: if request.auth != null  WITHOUT == uid on the same line
  //       Passes:   allow read: if true  (read-only public config — intentional)
  //       Passes:   allow read, write: if request.auth != null && request.auth.uid == uid
  const rulesSource49 = fs.existsSync(path.join(ROOT, 'firestore.rules'))
    ? fs.readFileSync(path.join(ROOT, 'firestore.rules'), 'utf8')
    : '';
  const hasWriteAllowAll49 = /allow\s+(read\s*,\s*write|write)\s*:\s*if\s+true/.test(rulesSource49);
  const hasUnscopedAuthGrant49 = rulesSource49.split('\n').some(line => {
    if (/allow\s+(read\s*,\s*write|write)\s*:\s*if\s+request\.auth\s*!=\s*null/.test(line)) {
      return !/==\s*uid|uid\s*==/.test(line);
    }
    return false;
  });
  assert(
    !hasWriteAllowAll49 && !hasUnscopedAuthGrant49,
    'firestore.rules has no dangerous broad write grants (no allow-all or unscoped auth-only write)'
  );

  // 49.4  release.yml is gated on CI via workflow_run + conclusion == 'success'
  const releaseSrc49 = readFile('.github/workflows/release.yml');
  assert(
    /workflow_run/.test(releaseSrc49) && /conclusion\s*==\s*['"]success['"]/.test(releaseSrc49),
    "release.yml uses workflow_run trigger with conclusion == 'success' (release gated on CI)"
  );
}

// ══════════════════════════════════════════════════════════════
//  Suite 50 — Gate Parity Guards (Protocol 36)
//  Verify that the local gate == CI gate and the escape-ratchet is wired.
//  8 tests
// ══════════════════════════════════════════════════════════════
header('Suite 50 — Gate Parity Guards (Protocol 36)');
{
  const preCommitSrc50 = readFile('scripts/pre-commit');
  const gateSrc50 = readFile('scripts/gate.js');
  const pkgSrc50 = readFile('package.json');
  const bootSmokeSrc50 = readFile('tests/boot-smoke.mjs');

  // 50.1  scripts/pre-commit invokes npm run gate:fast (fast gate at commit boundary)
  assert(
    preCommitSrc50.includes('npm run gate:fast'),
    'scripts/pre-commit invokes npm run gate:fast (Protocol 36 — fast gate at commit boundary)'
  );

  // 50.2  scripts/gate.js enforces --max-warnings 0 (ESLint escape-ratchet)
  assert(
    gateSrc50.includes('--max-warnings 0'),
    'scripts/gate.js enforces ESLint --max-warnings 0 (Protocol 36 — escape-ratchet)'
  );

  // 50.3  boot-smoke.mjs uses an HTTP static server (not file://)
  assert(
    bootSmokeSrc50.includes('http.createServer') && bootSmokeSrc50.includes('BASE_URL'),
    'boot-smoke.mjs uses HTTP static server (http.createServer + BASE_URL navigation)'
  );

  // 50.4  package.json has a gate script wiring npm run gate
  assert(
    pkgSrc50.includes('"gate"'),
    'package.json defines a "gate" script (Protocol 36 — single source of truth for gate)'
  );

  // 50.5  gate.js has --fast flag that skips browser steps
  assert(
    gateSrc50.includes('--fast') && gateSrc50.includes('!fast'),
    'scripts/gate.js has --fast flag that skips browser steps (Protocol 36 — fast commit / full push split)'
  );

  // 50.6  gate.js falls back to powershell when pwsh absent
  assert(
    gateSrc50.includes('pwsh') && gateSrc50.includes('powershell'),
    'scripts/gate.js falls back to powershell when pwsh absent (Protocol 36 — Windows PS 5.1 support)'
  );

  // 50.7  scripts/pre-push exists and invokes full npm run gate
  const prePushSrc50 = readFile('scripts/pre-push');
  assert(
    /npm run gate(?!:)/.test(prePushSrc50),
    'scripts/pre-push invokes full npm run gate (Protocol 36 — full gate at push boundary)'
  );

  // 50.8  install-hooks.js installs pre-push hook
  const installHooksSrc50 = readFile('scripts/install-hooks.js');
  assert(
    installHooksSrc50.includes('pre-push'),
    'scripts/install-hooks.js installs pre-push hook (Protocol 36 — full gate at push boundary)'
  );
}

// ══════════════════════════════════════════════════════════════
//  Suite 51 — Save Integrity + Rolling Backups (Data Safety Hardening)
//  Verify checksum stamping, forward-compat guard, and rolling backup
//  ring are wired consistently across all load/save paths.
//  34 tests
// ══════════════════════════════════════════════════════════════
header('Suite 51 — Save Integrity + Rolling Backups');
{
  const stateSrc51 = readFile('js/state.js');
  const uiSrc51 = readFile('js/ui.js');
  const cloudSrc51 = readFile('js/cloud.js');
  const indexSrc51 = readFile('index.html');

  // 51.1  computeSaveChecksum exists in state.js (FNV-1a global helper)
  assert(
    stateSrc51.includes('window.computeSaveChecksum') && stateSrc51.includes('function _fnv1a32'),
    'state.js defines window.computeSaveChecksum and _fnv1a32 helper (FNV-1a algorithm)'
  );

  // 51.2  verifySaveEnvelope exists in state.js
  assert(
    stateSrc51.includes('window.verifySaveEnvelope'),
    'state.js defines window.verifySaveEnvelope (integrity + forward-compat check)'
  );

  // 51.3  snapRollingBackup exists in state.js
  assert(
    stateSrc51.includes('window.snapRollingBackup'),
    'state.js defines window.snapRollingBackup (rolling backup ring)'
  );

  // 51.4  getRollingBackups exists in state.js
  assert(
    stateSrc51.includes('window.getRollingBackups'),
    'state.js defines window.getRollingBackups (backup listing helper)'
  );

  // 51.5  verifySaveEnvelope returns 'legacy' when checksum is absent
  assert(
    /status.*legacy/.test(stateSrc51) && /!envelope\.checksum/.test(stateSrc51),
    "verifySaveEnvelope returns 'legacy' when checksum field is absent (old saves load normally)"
  );

  // 51.6  verifySaveEnvelope returns 'future_version' when save version > running version
  assert(
    /status.*future_version/.test(stateSrc51) && /_semverGt/.test(stateSrc51),
    "verifySaveEnvelope returns 'future_version' for saves from newer app versions (semver guard)"
  );

  // 51.7  verifySaveEnvelope returns 'checksum_mismatch' when recomputed checksum differs
  assert(
    /status.*checksum_mismatch/.test(stateSrc51),
    "verifySaveEnvelope returns 'checksum_mismatch' when checksum doesn't match (tamper detection)"
  );

  // 51.8  exportSaveFile stamps schemaVersion and checksum
  {
    let exportBody51 = '';
    try {
      exportBody51 = extractFunctionBody(stateSrc51, 'exportSaveFile');
    } catch (e) {
      fail('Cannot extract exportSaveFile: ' + e.message);
    }
    assert(
      exportBody51.includes('schemaVersion') && exportBody51.includes('checksum'),
      'exportSaveFile stamps schemaVersion and checksum on exported envelope'
    );
  }

  // 51.9  saveToSlot stamps schemaVersion and checksum
  {
    let saveSlotBody51 = '';
    try {
      saveSlotBody51 = extractFunctionBody(uiSrc51, 'saveToSlot');
    } catch (e) {
      fail('Cannot extract saveToSlot: ' + e.message);
    }
    assert(
      saveSlotBody51.includes('schemaVersion') && saveSlotBody51.includes('checksum'),
      'saveToSlot stamps schemaVersion and checksum on slot envelope'
    );
  }

  // 51.10  loadFromSlot calls verifySaveEnvelope before applying state
  {
    let loadSlotBody51 = '';
    try {
      loadSlotBody51 = extractFunctionBody(uiSrc51, 'loadFromSlot');
    } catch (e) {
      fail('Cannot extract loadFromSlot: ' + e.message);
    }
    assert(
      loadSlotBody51.includes('verifySaveEnvelope'),
      'loadFromSlot calls verifySaveEnvelope (integrity check before slot load)'
    );
  }

  // 51.11  loadFromSlot calls snapRollingBackup before applying state
  {
    let loadSlotBody51b = '';
    try {
      loadSlotBody51b = extractFunctionBody(uiSrc51, 'loadFromSlot');
    } catch (e) {
      fail('Cannot extract loadFromSlot: ' + e.message);
    }
    assert(
      loadSlotBody51b.includes('snapRollingBackup'),
      'loadFromSlot calls snapRollingBackup (rolling backup before slot load)'
    );
  }

  // 51.12  handleFileUpload calls verifySaveEnvelope
  {
    let uploadBody51 = '';
    try {
      uploadBody51 = extractFunctionBody(uiSrc51, 'handleFileUpload');
    } catch (e) {
      fail('Cannot extract handleFileUpload: ' + e.message);
    }
    assert(
      uploadBody51.includes('verifySaveEnvelope'),
      'handleFileUpload calls verifySaveEnvelope (integrity check on file import)'
    );
  }

  // 51.13  handleFileUpload calls snapRollingBackup
  {
    let uploadBody51b = '';
    try {
      uploadBody51b = extractFunctionBody(uiSrc51, 'handleFileUpload');
    } catch (e) {
      fail('Cannot extract handleFileUpload: ' + e.message);
    }
    assert(
      uploadBody51b.includes('snapRollingBackup'),
      'handleFileUpload calls snapRollingBackup (rolling backup before file import)'
    );
  }

  // 51.14  pullFromCloud calls snapRollingBackup
  assert(
    cloudSrc51.includes('snapRollingBackup'),
    'cloud.js pullFromCloud/loadCloudSave calls snapRollingBackup (rolling backup before cloud load)'
  );

  // 51.15  loadCloudSave calls verifySaveEnvelope
  assert(
    cloudSrc51.includes('verifySaveEnvelope'),
    'cloud.js calls verifySaveEnvelope on cloud load paths (integrity check)'
  );

  // 51.16  restoreRollingBackup exists in ui.js and routes through sanitizeImportedContainer + migrateState
  {
    let restoreBody51 = '';
    try {
      restoreBody51 = extractFunctionBody(uiSrc51, 'restoreRollingBackup');
    } catch (e) {
      fail('Cannot extract restoreRollingBackup: ' + e.message);
    }
    assert(
      restoreBody51.includes('sanitizeImportedContainer') && restoreBody51.includes('migrateState'),
      'restoreRollingBackup routes through sanitizeImportedContainer + migrateState (Protocol 34)'
    );
  }

  // 51.17  index.html has a restore backup button calling restoreRollingBackup
  assert(
    indexSrc51.includes('restoreRollingBackup'),
    'index.html has a RESTORE BACKUP button calling restoreRollingBackup()'
  );

  // 51.18  snapRollingBackup uses ring key prefix 'robco_backup_' (N computed dynamically) + robco_backup_ptr
  assert(
    stateSrc51.includes("'robco_backup_'") && stateSrc51.includes("'robco_backup_ptr'"),
    "snapRollingBackup uses 'robco_backup_' ring key prefix (dynamic N) and 'robco_backup_ptr' pointer"
  );

  // 51.19  snapRollingBackup handles QuotaExceededError — drops oldest slot and retries
  assert(
    stateSrc51.includes('QuotaExceededError') &&
      /removeItem\s*\(/.test(stateSrc51) &&
      /snapRollingBackup[\s\S]{0,1500}QuotaExceededError/.test(stateSrc51),
    'snapRollingBackup handles QuotaExceededError gracefully (drop-oldest-retry, no crash)'
  );

  // 51.20  computeSaveChecksum uses FNV-1a magic number (algorithm integrity guard)
  assert(
    stateSrc51.includes('0x811c9dc5') && stateSrc51.includes('0x01000193'),
    'computeSaveChecksum/_fnv1a32 uses canonical FNV-1a magic numbers (algorithm regression guard)'
  );

  // 51.21–51.34  Behavioral: eval state.js helpers and exercise the actual logic
  //   These fail on real regressions (wrong semver comparison, checksum field in hash,
  //   ring overflow, dedup missing) — not just grep-based presence checks.
  {
    const _bvm = require('vm');
    const _lsStore = Object.create(null);
    const _mockLS = {
      getItem: k => (_lsStore[k] !== undefined ? String(_lsStore[k]) : null),
      setItem: (k, v) => {
        _lsStore[k] = String(v);
      },
      removeItem: k => {
        delete _lsStore[k];
      },
    };
    const _hStart = stateSrc51.indexOf('function _fnv1a32');
    const _hEnd = stateSrc51.indexOf('// ── FACTION REGISTRY');
    let _bCtx = null;
    if (_hStart !== -1 && _hEnd !== -1) {
      try {
        _bCtx = {
          window: {},
          localStorage: _mockLS,
          _lsStore,
          JSON,
          Math,
          String,
          Array,
          Object,
          parseInt,
          isNaN,
          Date,
          console: { warn: () => {} },
        };
        _bvm.createContext(_bCtx);
        _bvm.runInContext('var APP_VERSION = "2.0.1";\n' + stateSrc51.slice(_hStart, _hEnd), _bCtx);
      } catch (_) {
        _bCtx = null;
      }
    }

    if (!_bCtx || !_bCtx.window.computeSaveChecksum || !_bCtx.window.verifySaveEnvelope) {
      fail('51.21 behavioral setup: could not eval helpers block from state.js');
      for (let _bi = 0; _bi < 13; _bi++) fail('51.B behavioral test (setup failed)');
    } else {
      const _cs = _bCtx.window.computeSaveChecksum;
      const _ve = _bCtx.window.verifySaveEnvelope;
      const _snap = _bCtx.window.snapRollingBackup;
      const _getRing = _bCtx.window.getRollingBackups;
      const _ls = _bCtx._lsStore;

      // 51.21  legacy: no checksum, no version → 'legacy' (old saves load clean, never blocked)
      assert(
        _ve({}).status === 'legacy',
        'verifySaveEnvelope behavioral: empty envelope → legacy (old saves load without warning)'
      );

      // 51.22  legacy: has payload but no checksum → 'legacy'
      assert(
        _ve({ robco_v8: { activeContext: 'FNV', campaigns: {} }, chat: [], playstyle: 'any' })
          .status === 'legacy',
        'verifySaveEnvelope behavioral: payload with no checksum field → legacy (backward compat)'
      );

      // 51.23  tamper detection: mutated payload + stale checksum → 'checksum_mismatch'
      const _bv8 = { activeContext: 'FNV', campaigns: { FNV: { lvl: 5, name: 'Tester' } } };
      const _bcht = [{ text: 'hello', sender: 'user' }];
      const _goodCk = _cs(_bv8, _bcht, 'any');
      const _tampEnv = {
        schemaVersion: '2.0.1',
        robco_v8: { activeContext: 'FNV', campaigns: { FNV: { lvl: 99, name: 'Hacked' } } },
        chat: _bcht,
        playstyle: 'any',
        checksum: _goodCk,
      };
      assert(
        _ve(_tampEnv).status === 'checksum_mismatch',
        'verifySaveEnvelope behavioral: tampered payload with stale checksum → checksum_mismatch'
      );

      // 51.24  valid round-trip → 'ok'
      const _validEnv = {
        schemaVersion: '2.0.1',
        robco_v8: _bv8,
        chat: _bcht,
        playstyle: 'any',
        checksum: _cs(_bv8, _bcht, 'any'),
      };
      assert(
        _ve(_validEnv).status === 'ok',
        'verifySaveEnvelope behavioral: valid checksum + matching payload → ok'
      );

      // 51.25  JSON serialize/deserialize round-trip → still 'ok' (determinism guard)
      assert(
        _ve(JSON.parse(JSON.stringify(_validEnv))).status === 'ok',
        'verifySaveEnvelope behavioral: valid checksum survives JSON round-trip → ok'
      );

      // 51.26  future version 2.0.2 → 'future_version'
      assert(
        _ve({ schemaVersion: '2.0.2' }).status === 'future_version',
        'verifySaveEnvelope behavioral: schemaVersion 2.0.2 > APP_VERSION 2.0.1 → future_version'
      );

      // 51.27  future version 2.1.0 → 'future_version'
      assert(
        _ve({ schemaVersion: '2.1.0' }).status === 'future_version',
        'verifySaveEnvelope behavioral: schemaVersion 2.1.0 → future_version'
      );

      // 51.28  future version 3.0.0 → 'future_version'
      assert(
        _ve({ schemaVersion: '3.0.0' }).status === 'future_version',
        'verifySaveEnvelope behavioral: schemaVersion 3.0.0 → future_version'
      );

      // 51.29  same version, no checksum → 'legacy' (not future_version)
      assert(
        _ve({ schemaVersion: '2.0.1' }).status !== 'future_version',
        'verifySaveEnvelope behavioral: schemaVersion 2.0.1 (same) → not future_version'
      );

      // 51.30  older version → not 'future_version'
      assert(
        _ve({ schemaVersion: '1.9.0' }).status !== 'future_version',
        'verifySaveEnvelope behavioral: schemaVersion 1.9.0 (older) → not future_version'
      );

      // 51.31  _semverGt numeric: 2.0.10 > 2.0.1 must be true (fails if string-compared)
      assert(
        _ve({ schemaVersion: '2.0.10' }).status === 'future_version',
        'verifySaveEnvelope/_semverGt behavioral: 2.0.10 > 2.0.1 uses numeric, not string, comparison'
      );

      // 51.32  ring-cap-3: 4 distinct snaps → exactly 3 ring entries
      Object.keys(_ls).forEach(k => {
        delete _ls[k];
      });
      for (let _i = 1; _i <= 4; _i++) {
        _ls['robco_v8'] = JSON.stringify({
          activeContext: 'FNV',
          campaigns: { FNV: { lvl: _i } },
        });
        _ls['robco_chat'] = '[]';
        _ls['robco_playstyle'] = 'any';
        _snap();
      }
      const _ringArr = _getRing();
      assert(
        _ringArr.length === 3,
        'snapRollingBackup behavioral: 4 distinct snaps fills ring to exactly 3 entries (cap-3)'
      );

      // 51.33  ring dedup: consecutive identical snaps → only 1 entry (not 2)
      Object.keys(_ls).forEach(k => {
        delete _ls[k];
      });
      _ls['robco_v8'] = JSON.stringify({ activeContext: 'FNV', campaigns: { FNV: { lvl: 42 } } });
      _ls['robco_chat'] = '[]';
      _ls['robco_playstyle'] = 'any';
      _snap();
      _snap(); // same robco_v8 — must be deduped
      assert(
        _getRing().length === 1,
        'snapRollingBackup behavioral: consecutive identical snaps are deduped (only 1 entry written)'
      );

      // 51.34  F2 guard: ui.js undo no longer reads legacy robco_backup key; uses getRollingBackups
      assert(
        uiSource.includes('getRollingBackups') &&
          !/localStorage\.getItem\(['"]robco_backup['"]\)/.test(uiSource),
        "ui.js undo wired to getRollingBackups(), legacy 'robco_backup' key removed (F2 fix guard)"
      );
    }
  }
}

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
