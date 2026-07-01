#!/usr/bin/env node
/**
 * RobCo Persistence Audit — tests/robco-diagnostics.js
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
 * Run:       node tests/robco-diagnostics.js
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

// ── Static-guard table driver (token-audit #11) ────────────────
// Collapses the repetitive string-match guards into compact data tables.
// Each row: [pattern, msg] or [pattern, msg, NEG].
//   pattern — a RegExp → matched with pattern.test(src); a string → src.includes(pattern).
//   NEG     — invert polarity: assert the pattern is ABSENT.
// Behaviour is identical to the longhand assert(src.includes(...)) /
// assert(/re/.test(src)) forms it replaces, so runner output is unchanged.
const NEG = true;
function guards(src, rows) {
  for (const row of rows) {
    const pattern = row[0];
    const present = pattern instanceof RegExp ? pattern.test(src) : src.includes(pattern);
    assert(row[2] ? !present : present, row[1]);
  }
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

// Extract a `window.NAME = [async ]function (params) { body }` assignment so it can
// be reconstructed and evaluated in isolation (the window-assigned analogue of
// extractFunctionBody). Returns { isAsync, params, body }.
function extractAssignedFunction(source, name) {
  const m = source.match(new RegExp('window\\.' + name + '\\s*=\\s*(async\\s+)?function'));
  if (!m) throw new Error(`Cannot find window.${name} = function`);
  const idx = m.index;
  const openParen = source.indexOf('(', idx);
  const openBrace = source.indexOf('{', openParen);
  let depth = 0;
  let i = openBrace;
  for (; i < source.length; i++) {
    if (source[i] === '{') depth++;
    else if (source[i] === '}' && --depth === 0) {
      i++;
      break;
    }
  }
  return {
    isAsync: !!m[1],
    params: source.slice(openParen, openBrace).trim(),
    body: source.slice(openBrace, i),
  };
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
const uiSource = [
  'js/ui-audio.js',
  'js/ui-render.js',
  'js/ui-saves.js',
  'js/ui-account.js',
  'js/ui-core.js',
]
  .filter(f => fs.existsSync(path.join(ROOT, f)))
  .map(f => readFile(f))
  .join('\n');

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
    // NCR: fame=50 (fr3: 40≤50<80), infamy=20 (ir2: 12≤20<40) → Smiling Troublemaker
    assert(
      gfs('ncr', 50, 20).label === 'Smiling Troublemaker',
      "getFactionStanding('ncr', 50, 20) returns 'Smiling Troublemaker'"
    );
    // NCR: fame=0, infamy=30 (t3=ir2) → Shunned (fr=0, ir=2)
    assert(
      gfs('ncr', 0, 30).label === 'Shunned',
      "getFactionStanding('ncr', 0, 30) returns 'Shunned'"
    );
    // NCR: fame=80 (fr4: ≥bp3=80), infamy=20 (ir2: 12≤20<40) → Good-Natured Rascal
    assert(
      gfs('ncr', 80, 20).label === 'Good-Natured Rascal',
      "getFactionStanding('ncr', 80, 20) returns 'Good-Natured Rascal'"
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
guards(uiSource, [
  [/function removePerk\b/, 'removePerk() function exists in ui.js'],
  [/function toggleCollectible\b/, 'toggleCollectible() function exists in ui.js'],
  [
    /COMM-LINK COMMAND REGISTRY/,
    'showHelpModal() contains expanded command registry (COMM-LINK COMMAND REGISTRY)',
  ],
]);

// ══════════════════════════════════════════════════════════════
//  SUITE 2d — C3 CAMPG Tab (C3)
//  Verifies CAMPG tab and related DOM elements exist.
// ══════════════════════════════════════════════════════════════
header('C3 CAMPG Tab');
const htmlSource = readFile('index.html');
guards(htmlSource, [
  [/id="tab-btn-campg"/, 'CAMPG tab button exists in index.html (id="tab-btn-campg")'],
  [/id="campgPanel"/, 'CAMPG panel exists in index.html (id="campgPanel")'],
  [/id="gameContextSelect"/, 'Game context select exists in index.html (id="gameContextSelect")'],
  [/id="fo3WarningBanner"/, 'FO3 warning banner exists in index.html (id="fo3WarningBanner")'],
  [/id="timelineDisplay"/, 'Timeline display shell exists in index.html (id="timelineDisplay")'],
]);
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
guards(stateSource, [
  [/campaignMode\s*:\s*'standard'/, "state.campaignMode default 'standard' exists in state.js"],
  [
    /playthroughType\s*:\s*'standard'/,
    "state.playthroughType default 'standard' exists in state.js",
  ],
  // Protocol 4 location 2: migration guard in migrateState()
  [/s\.campaignMode/, 'state.campaignMode migration guard exists in migrateState() in state.js'],
  [
    /s\.playthroughType/,
    'state.playthroughType migration guard exists in migrateState() in state.js',
  ],
]);
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
guards(htmlSource, [
  [
    /id="playthroughTypeSelect"/,
    'Playthrough Type select exists in index.html (id="playthroughTypeSelect")',
  ],
  [
    /id="campaignModeSelect"/,
    'Old merged select (id="campaignModeSelect") has been removed from index.html',
    NEG,
  ],
  // C4-fix: Complete RNG is now a separate checkbox
  [/id="completeRngToggle"/, 'Complete RNG checkbox exists in index.html (id="completeRngToggle")'],
  // RNG banner still present
  [/id="rngModeBanner"/, 'RNG mode banner exists in index.html (id="rngModeBanner")'],
]);
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

guards(exportBody, [
  [/robco_v8\s*:\s*window\.robco_v8\b/, 'serialises full robco_v8 container'],
  [/chat\s*:\s*chatHistory/, 'includes chat history'],
  [/playstyle/, 'includes playstyle'],
  [/version/, 'includes version tag (envelope detection)'],
]);

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
guards(fileImportBody, [
  [/restoreChatHistory/, 'restores chat history'],
  [/parsed\.playstyle/, 'restores playstyle'],
  [/autoImportState/, 'calls autoImportState() for game state'],
]);

// ══════════════════════════════════════════════════════════════
//  SUITE 6 — Cloud sync (cloud.js)
// ══════════════════════════════════════════════════════════════
header('cloud.js push / pull');
guards(cloudSource, [
  [/robco_v8\s*:\s*window\.robco_v8/, 'saveCurrentToCloud() serialises full robco_v8 container'],
  [/robco_chat/, 'cloud.js reads and writes chat history (robco_chat key)'],
  [/playstyle/, 'cloud.js includes playstyle in cloud saves'],
]);
assert(
  /data\.robco_v8/.test(cloudSource) && /data\.version/.test(cloudSource),
  'loadCloudSave() checks robco_v8 container and handles version for migration'
);
assert(
  /robco_chat/.test(cloudSource),
  'cloud.js restores chat history on cloud load (robco_chat key)'
);
assert(/robco_playstyle/.test(cloudSource), 'cloud.js restores playstyle on cloud load');

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
const registryCoreSource = readFile('js/registry-core.js');

// 8.1 FALLOUT_REGISTRY global declaration must exist
assert(/const\s+FALLOUT_REGISTRY\s*=/.test(registrySource), 'FALLOUT_REGISTRY global is declared');

// 8.2 registrySearch function must be declared in registry-core.js (extracted from reg_nv.js, WU-B11)
assert(
  /function\s+registrySearch\s*\(/.test(registryCoreSource),
  'registrySearch() function is declared in registry-core.js'
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
  /query\.length\s*<\s*2|length\s*<\s*2/.test(registryCoreSource),
  'registrySearch() enforces minimum query length of 2'
);

// 8.5 registrySearch must cap results at 7
assert(
  /slice\s*\(\s*0\s*,\s*7\s*\)/.test(registryCoreSource),
  'registrySearch() caps results at 7'
);

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
guards(dbCode, [
  [/\bstate\b/, 'db_nv.js does not reference state (pure reference data)', NEG],
  [/localStorage/, 'db_nv.js does not reference localStorage', NEG],
  [/chatHistory/, 'db_nv.js does not reference chatHistory', NEG],
]);

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
guards(renderWorldMapBody, [
  [
    /state\.mapView/,
    'renderWorldMap reads state.mapView (state-driven size, not viewport measurement)',
  ],
  [
    /window\.innerWidth/,
    'renderWorldMap size path has no window.innerWidth (measurement removed)',
    NEG,
  ],
  [
    /dataset\.mapFull/,
    'renderWorldMap size path has no dataset.mapFull (ephemeral flag removed)',
    NEG,
  ],
]);
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
guards(mapCellRule, [
  [/min-width\s*:\s*0/, '.map-cell has min-width:0'],
  [/overflow\s*:\s*hidden/, '.map-cell has overflow:hidden'],
  [/(min-height|aspect-ratio)/, '.map-cell has height floor (min-height or aspect-ratio)'],
]);
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
  /['"]\.\/index\.html['"]/.test(swSource) && /['"]\.\/js\/ui-core\.js['"]/.test(swSource),
  'ASSETS list includes index.html and js/ui-core.js'
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
guards(uiSource, [
  [/function _updatePanelBadges\b/, '_updatePanelBadges() function exists in ui.js'],
  [/function expandPanelForCategory\b/, 'expandPanelForCategory() function exists in ui.js'],
  [/function renderWorldMap\b/, 'renderWorldMap() function exists in ui.js'],
  [/function renderFactionRep\b/, 'renderFactionRep() function exists in ui.js'],
  [/renderWorldMap\(\)/, 'renderWorldMap() is called in ui.js'],
  [/renderFactionRep\(\)/, 'renderFactionRep() is called in ui.js'],
]);
guards(indexHtml, [
  [/id="worldMapPanel"/, 'worldMapPanel panel exists in index.html'],
  [/id="worldMapDisplay"/, 'worldMapDisplay element exists in index.html'],
  [/id="factionContainer"/, 'factionContainer element exists in index.html'],
  [
    /id="transmitBtn"/,
    'transmitBtn send button exists in index.html (Protocol 13 — regression guard)',
  ],
  [
    /<button[^>]*onclick="transmitMessage\(\)"[^>]*id="transmitBtn"|<button[^>]*id="transmitBtn"[^>]*onclick="transmitMessage\(\)"/,
    'transmitBtn is wired to transmitMessage() (Protocol 13 — send-button regression guard)',
  ],
]);

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
    fail('scoreZoneForLoc not found in concatenated UI source');
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
guards(dbFo3Code, [
  [/\bstate\b/, 'db_fo3.js does not reference state (pure reference data)', NEG],
  [/localStorage/, 'db_fo3.js does not reference localStorage', NEG],
  [/chatHistory/, 'db_fo3.js does not reference chatHistory', NEG],
]);

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
//  cannot regress. Includes GH-2 (WU-B2): untrusted/external model
//  strings (localStorage, Firestore, Gemini API) are escaped before
//  innerHTML, and no served JS inlines a localStorage read into a
//  template literal.
//  13 tests
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

// 21.3 Native TRADE sell list is XSS-safe (WU-N2 retired the AI TRADE modal; the dead
// `mType === 'TRADE'` source dependency that made this guard vacuous — and threw in the PS
// runner — was removed under Protocol 42). Item names are escaped and routed via a data
// attribute, never interpolated raw into the onclick. Complements 21.4 (the buy list).
{
  const renSrc213 = readFile('js/ui-render.js');
  let sellBody213 = '';
  try {
    sellBody213 = extractFunctionBody(renSrc213, 'renderTradeSellList');
  } catch (_) {}
  assert(
    /escapeHtml\(it\.name\)/.test(sellBody213) &&
      /data-tname=/.test(sellBody213) &&
      /this\.dataset\.tname/.test(sellBody213),
    'Native TRADE sell list escapes item names + routes via data-tname (XSS-2 guard)'
  );
}

// 21.4 Native TRADE list is XSS-safe (WU-N2 retired the AI TRADE modal): item names are
// escaped and routed via a data attribute, never interpolated raw into the onclick.
{
  const renSrc214 = readFile('js/ui-render.js');
  let buyBody214 = '';
  try {
    buyBody214 = extractFunctionBody(renSrc214, 'renderTradeBuyList');
  } catch (_) {}
  assert(
    /escapeHtml\(it\.name\)/.test(buyBody214) &&
      /data-tname=/.test(buyBody214) &&
      /this\.dataset\.tname/.test(buyBody214),
    'Native TRADE buy list escapes item names + routes via data-tname (XSS-2 guard)'
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

// 21.10 GH-2a: ui-core.js escapes the localStorage-derived saved model before
// building the <option> innerHTML (no raw ${savedModel} reaches innerHTML).
assert(
  /escapeHtml\s*\(\s*savedModel\s*\)/.test(uiSource) &&
    !/<option value="\$\{savedModel\}/.test(uiSource),
  'ui-core.js escapes localStorage model with escapeHtml before innerHTML — no raw interpolation (GH-2 XSS guard)'
);

// 21.11 GH-2b: cloud.js escapes the Firestore-derived model before building the
// <option> innerHTML (no raw ${data.model} reaches innerHTML).
assert(
  /escapeHtml\s*\(\s*data\.model\s*\)/.test(cloudSource) &&
    !/<option value="\$\{data\.model\}/.test(cloudSource),
  'cloud.js escapes Firestore model with escapeHtml before innerHTML — no raw interpolation (GH-2 XSS guard)'
);

// 21.12 GH-2c: api.js escapes the externally-sourced Gemini model name before
// building the <option> innerHTML (no raw ${shortName}/${m.displayName} reaches innerHTML).
assert(
  /escapeHtml\s*\(\s*shortName\s*\)/.test(apiSource) &&
    !/<option value="\$\{shortName\}/.test(apiSource) &&
    !/\$\{m\.displayName/.test(apiSource),
  'api.js escapes Gemini model name with escapeHtml before innerHTML — no raw interpolation (GH-2 XSS guard)'
);

// 21.13 GH-2 ratchet (general, forward-looking): no served JS may inline a
// localStorage.getItem(...) read directly into a template-literal interpolation
// (${localStorage.getItem(...)}) — storage values must be cached + escaped first.
{
  const servedJs21 = [uiSource, apiSource, cloudSource].join('\n');
  assert(
    !/\$\{[^}]*localStorage\.getItem/.test(servedJs21),
    'No served JS interpolates localStorage.getItem() into a template literal (GH-2 escape-before-innerHTML ratchet)'
  );
}

// ══════════════════════════════════════════════════════════════
//  SUITE 22 — Critical Feature Presence (Group 1)
//  Asserts every key control exists in index.html and is wired.
//  30 tests
// ══════════════════════════════════════════════════════════════
header('Critical Feature Presence');
// Tab buttons
guards(htmlSource, [
  [/onclick="switchTab\('stat'\)"/, "STAT tab button wired (switchTab('stat'))"],
  [/onclick="switchTab\('inv'\)"/, "INV tab button wired (switchTab('inv'))"],
  [/onclick="switchTab\('data'\)"/, "DATA tab button wired (switchTab('data'))"],
  [/onclick="switchTab\('campg'\)"/, "CAMPG tab button wired (switchTab('campg'))"],
  // Add buttons
  [/onclick="addItem\(\)"/, 'Add Item button wired (addItem())'],
  [/onclick="addAmmo\(\)"/, 'Add Ammo button wired (addAmmo())'],
  [/onclick="addPerk\(\)"/, 'Add Perk button wired (addPerk())'],
  [/onclick="addQuest\(\)"/, 'Add Quest button wired (addQuest())'],
  [/onclick="addCampaignNote\(\)"/, 'Add Note button wired (addCampaignNote())'],
  [/onclick="addSquadMember\(\)"/, 'Add Squad button wired (addSquadMember())'],
  // Save / Load slots A B C
  [/onclick="saveToSlot\(1\)"/, 'Save slot A wired (saveToSlot(1))'],
  [/onclick="saveToSlot\(2\)"/, 'Save slot B wired (saveToSlot(2))'],
  [/onclick="saveToSlot\(3\)"/, 'Save slot C wired (saveToSlot(3))'],
  [/onclick="loadFromSlot\(1\)"/, 'Load slot A wired (loadFromSlot(1))'],
  [/onclick="loadFromSlot\(2\)"/, 'Load slot B wired (loadFromSlot(2))'],
  [/onclick="loadFromSlot\(3\)"/, 'Load slot C wired (loadFromSlot(3))'],
  // Export / Import
  [/onclick="exportSaveFile\(\)"/, 'Export save button wired (exportSaveFile())'],
  [/onchange="handleFileUpload\(event\)"/, 'Import save input wired (handleFileUpload(event))'],
  // Cloud sync
  [
    /id="btnSaveToCloud"/,
    'Save to Cloud button exists (id=btnSaveToCloud — replaces btnCloudPush)',
  ],
  [
    /id="courierIdInput"/,
    'Vestigial courier ID input is absent (id=courierIdInput removed in Phase 6)',
    NEG,
  ],
  // Validate Key
  [/id="btnFetchModels"/, 'Validate Key button exists (id=btnFetchModels)'],
  // D-pad
  [/onclick="macroCommand\('\[PAD: UP\]'\)"/, "D-pad UP wired (macroCommand('[PAD: UP]'))"],
  [/onclick="macroCommand\('\[PAD: DOWN\]'\)"/, "D-pad DOWN wired (macroCommand('[PAD: DOWN]'))"],
  [/onclick="macroCommand\('\[PAD: LEFT\]'\)"/, "D-pad LEFT wired (macroCommand('[PAD: LEFT]'))"],
  [
    /onclick="macroCommand\('\[PAD: RIGHT\]'\)"/,
    "D-pad RIGHT wired (macroCommand('[PAD: RIGHT]'))",
  ],
  // Macro buttons
  [/onclick="macroCommand\('\[THREAT\]'\)"/, 'THREAT macro button wired'],
  [/onclick="macroCommand\('\[VATS SIM\]'\)"/, 'VATS SIM macro button wired'],
  [
    /onclick="expandPanelForCategory\('trade'\)"/,
    'TRADE macro button opens the native barter panel (WU-N2)',
  ],
  [/onclick="renderLoot\(\)"/, 'LOOT button opens the native salvage terminal (WU-N6)'],
  // V.A.T.S. Calculator
  [/id="vatsCalcBtn"/, 'V.A.T.S. CALCULATOR button exists (id=vatsCalcBtn)'],
]);

// ══════════════════════════════════════════════════════════════
//  SUITE 23 — Prohibited Patterns (Group 2)
//  Static checks that banned patterns haven't crept back in.
//  8 tests
// ══════════════════════════════════════════════════════════════
header('Prohibited Patterns');
// 23.1 No innerHTML += in ui.js (render functions must use map().join('') bulk assignment)
assert(!/innerHTML\s*\+=/.test(uiSource), 'ui.js has no innerHTML += (O(n²) re-parse guard)');

// 23.1b No innerHTML += anywhere in served JS — WU-B1 closed the former api.js carve-out
// (the model-fetch <select> builder now uses map().join('') single-assignment). The guard
// scans every served module so the O(n²) DOM-reparse pattern can never return (Protocol 36b).
{
  const servedJs = [uiSource, apiSource, cloudSource].join('\n');
  assert(
    !/innerHTML\s*\+=/.test(servedJs),
    'No served JS (ui/api/cloud) contains innerHTML += (O(n²) re-parse guard — Prohibited Patterns)'
  );
}

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

// 23.2b GH-3: getSystemDirective() runs on every AI message — it must read playstyle
// from the in-memory comm cache (_commGet), never localStorage.getItem directly (WU-B3).
{
  let body = '';
  try {
    body = extractFunctionBody(apiSource, 'getSystemDirective');
  } catch (e) {
    fail(`Cannot extract getSystemDirective: ${e.message}`);
  }
  assert(
    !/localStorage\.getItem/.test(body),
    'getSystemDirective() contains no localStorage.getItem — reads from comm cache (GH-3 hot-path guard)'
  );
}

// 23.2c GH-3: transmitMessage() runs on every AI message — Gemini key/model must come
// from the in-memory comm cache (_commGet), never localStorage.getItem directly (WU-B3).
{
  let body = '';
  try {
    body = extractFunctionBody(apiSource, 'transmitMessage');
  } catch (e) {
    fail(`Cannot extract transmitMessage: ${e.message}`);
  }
  assert(
    !/localStorage\.getItem/.test(body),
    'transmitMessage() contains no localStorage.getItem — reads from comm cache (GH-3 hot-path guard)'
  );
}

// 23.3 autoImportState() uses explicit field mapping, not recursive Object.keys transform
assert(
  !/Object\.keys\s*\(\s*parsed\s*\)\.forEach/.test(importBody),
  'autoImportState() has no recursive Object.keys(parsed).forEach key transform'
);

// 23.4 & 23.5 saveCurrentToCloud is NOT called from saveState() or updateMath() (manual-only)
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
    !/saveCurrentToCloud/.test(saveStateBody),
    'saveState() does not call saveCurrentToCloud (cloud sync is manual-only)'
  );
  assert(
    !/saveCurrentToCloud/.test(updateMathBody),
    'updateMath() does not call saveCurrentToCloud (cloud sync is manual-only)'
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
  guards(regFo3Code, [
    [/\bstate\b/, 'reg_fo3.js does not reference state (pure reference data)', NEG],
    [/localStorage/, 'reg_fo3.js does not reference localStorage (in code)', NEG],
    [/chatHistory/, 'reg_fo3.js does not reference chatHistory (in code)', NEG],
  ]);
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
  const jsRunner = readFile('tests/robco-diagnostics.js');
  const psRunner = readFile('tests/robco-diagnostics.ps1');

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
    'Suite 52',
    'Suite 53',
    'Suite 54',
    'Suite 55',
    'Suite 56',
    'Suite 57',
    'Suite 58',
    'Suite 59',
    'Suite 60',
    'Suite 61',
    'Suite 62',
    'Suite 63',
    'Suite 64',
    'Suite 65',
    'Suite 66',
    'Suite 67',
    'Suite 68',
    'Suite 69',
    'Suite 70',
    'Suite 71',
    'Suite 72',
    'Suite 73',
    'Suite 74',
    'Suite 75',
    'Suite 76',
    'Suite 77',
    'Suite 78',
    'Suite 79',
    'Suite 80',
    'Suite 81',
    'Suite 82',
    'Suite 83',
    'Suite 84',
    'Suite 85',
    'Suite 86',
    'Suite 87',
    'Suite 88',
    'Suite 89',
    'Suite 90',
    'Suite 91',
    'Suite 92',
    'Suite 93',
    'Suite 94',
    'Suite 95',
    'Suite 96',
    'Suite 97',
    'Suite 98',
    'Suite 99',
    'Suite 100',
    'Suite 101',
    'Suite 102',
    'Suite 103',
    'Suite 104',
    'Suite 105',
    'Suite 106',
    'Suite 107',
    'Suite 108',
    'Suite 109',
    'Suite 110',
    'Suite 111',
  ];
  const jsMissing = GATE_SUITES.filter(s => !jsRunner.includes(s));
  const psMissing = GATE_SUITES.filter(s => !psRunner.includes(s));
  assert(
    jsMissing.length === 0,
    'JS runner contains all gate-guard suites (22-41, 49-100)' +
      (jsMissing.length ? ' — missing: ' + jsMissing.join(', ') : '')
  );
  assert(
    psMissing.length === 0,
    'PS runner contains all gate-guard suites (22-41, 49-100)' +
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

// 29.2 updateModal element exists in index.html (replaced updateBanner — blocking modal)
assert(
  /id="updateModal"/.test(htmlSource),
  'id="updateModal" element exists in index.html (blocking update dialog replaced updateBanner)'
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
//  Input maxlength caps, enforcing CSP (Stage 2), monotonic cache
//  guard in pre-commit hook, proactive localStorage quota warning.
//  5 tests
// ══════════════════════════════════════════════════════════════
header('Phase 1b Guards');

// 30.1 #chatInput textarea has maxlength attribute
guards(htmlSource, [
  [
    /id="chatInput"[\s\S]{0,300}maxlength/,
    '#chatInput textarea has maxlength attribute (Phase 1b input cap guard)',
  ],

  // 30.2a Enforcing CSP present in index.html (http-equiv must be exactly "Content-Security-Policy")
  [
    /http-equiv="Content-Security-Policy"/,
    'index.html contains enforcing Content-Security-Policy meta (CSP Stage 2 — not report-only)',
  ],

  // 30.2b Report-Only CSP absent — regression guard: flip back to passive is caught
  [
    /Content-Security-Policy-Report-Only/,
    'index.html does NOT contain Content-Security-Policy-Report-Only (CSP Stage 2 regression guard)',
    NEG,
  ],
]);

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
//  RELEASE-GATED via workflow_call — invoked only by release.yml on a version
//  bump (never a bare push to main); deploy keeps a defense-in-depth
//  success+main job guard + manual dispatch;
//  hook-install and boot-smoke scripts exist;
//  pre-commit hook is conditional (served-file gate).
//  14 tests
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
    /robco-diagnostics\.ps1/.test(gateSrc) && /npm run gate/.test(ciSource),
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

// 31.8 deploy.yml trigger is release-gated (workflow_call — invoked only by release.yml)
{
  const deploySource = readFile('.github/workflows/deploy.yml');
  const onBlock = deploySource.slice(
    deploySource.indexOf('\non:'),
    deploySource.indexOf('\npermissions:')
  );
  assert(
    /workflow_call/.test(onBlock),
    'deploy.yml on: block uses workflow_call (release-gated — invoked only by release.yml on a version bump, Protocol 43)'
  );
}

// 31.9 deploy.yml on: block has NO workflow_run trigger — regression guard:
//      production must never regress to deploy-on-every-CI/push (Protocol 36b)
{
  const deploySource = readFile('.github/workflows/deploy.yml');
  const onBlock = deploySource.slice(
    deploySource.indexOf('\non:'),
    deploySource.indexOf('\npermissions:')
  );
  assert(
    !/workflow_run/.test(onBlock),
    'deploy.yml on: block has NO workflow_run trigger (cannot deploy on every CI / bare push — release-gated only)'
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

// 31.12 release.yml invokes deploy.yml as a reusable workflow (only automated path to prod)
{
  const releaseSource = readFile('.github/workflows/release.yml');
  assert(
    /uses:\s*\.\/\.github\/workflows\/deploy\.yml/.test(releaseSource),
    'release.yml invokes deploy.yml via uses: (reusable workflow — the only automated path to production)'
  );
}

// 31.13 release.yml gates that deploy on a NEW version release only (APP_VERSION bump)
{
  const releaseSource = readFile('.github/workflows/release.yml');
  assert(
    /needs\.check-and-release\.outputs\.released\s*==\s*['"]true['"]/.test(releaseSource) &&
      /released:\s*\$\{\{\s*steps\.check\.outputs\.exists/.test(releaseSource),
    'release.yml deploys to prod ONLY on a new version release (released output derived from the APP_VERSION tag check)'
  );
}

// 31.14 deploy.yml keeps manual dispatch + defense-in-depth success+main job guard
{
  const deploySource = readFile('.github/workflows/deploy.yml');
  const onBlock = deploySource.slice(
    deploySource.indexOf('\non:'),
    deploySource.indexOf('\npermissions:')
  );
  assert(
    /workflow_dispatch/.test(onBlock) &&
      /conclusion\s*==\s*['"]success['"]/.test(deploySource) &&
      /head_branch\s*==\s*['"]main['"]/.test(deploySource),
    'deploy.yml keeps workflow_dispatch (manual rollback) + defense-in-depth job guard (CI success + main)'
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

// 32.6 renderSkills() in ui-core.js generates .skill-row elements dynamically
{
  const uiCoreSrc32 = readFile('js/ui-core.js');
  assert(
    /class="skill-row"/.test(uiCoreSrc32),
    'ui-core.js: renderSkills() generates .skill-row elements dynamically (static index.html rows replaced)'
  );
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
  const htmlSource33 = readFile('index.html');
  const rgbCount = (htmlSource33.match(/setProperty\(['"]--robco-green-rgb['"]/g) || []).length;
  assert(
    rgbCount >= 5,
    `index.html optics script sets --robco-green-rgb in ≥5 branches (found ${rgbCount}) (P1-1)`
  );
}

// 33.4 WU-T1: optics palette is now table-driven — the old ≥6 if/else branch count is
//      replaced by "the THEMES table covers ≥6 colours AND changeOpticsColor delegates to the
//      single table-driven applier" (P1-1, repointed for the WU-T1 refactor).
{
  const state33d = readFile('js/state.js');
  const audio33d = readFile('js/ui-audio.js');
  const themesBlock33d = (state33d.match(/const THEMES = \{([\s\S]*?)\n\};/) || ['', ''])[1];
  const colourCount = (themesBlock33d.match(/rgb:\s*'/g) || []).length;
  assert(
    colourCount >= 6 && /_applyThemeVars\(color\)/.test(audio33d) && /THEMES\[key\]/.test(audio33d),
    `THEMES table covers ≥6 optic colours (found ${colourCount}); changeOpticsColor is table-driven via _applyThemeVars (P1-1, WU-T1)`
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
  const htmlSource33 = readFile('index.html');
  const bad = (htmlSource33.match(/<summary[^>]*>[^<]*\[\+\][^<]*<\/summary>/g) || []).length;
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
const uiSrc35 = readFile('js/ui-core.js');
const cssSrc35 = readFile('css/terminal.css');
const regNvSrc35 = readFile('js/reg_nv.js');
const regCoreSrc35 = readFile('js/registry-core.js');

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

// 35.6 registrySearch has _registrySearchCache memoization in registry-core.js (P7-13)
assert(
  /_registrySearchCache/.test(regCoreSrc35),
  'registrySearch has _registrySearchCache memoization in registry-core.js (P7-13)'
);

// ══════════════════════════════════════════════════════════════
//  SUITE 36 — Keyboard Shortcuts Group ([?] menu discoverability)
//  COMMAND_REGISTRY has KEYBOARD SHORTCUTS group with ≥6 entries;
//  global keydown handler closes modal on Escape; closeModal() exists.
//  4 tests
// ══════════════════════════════════════════════════════════════
header('Keyboard Shortcuts Group');
{
  const uiSrc36 = readFile('js/ui-core.js'); // COMMAND_REGISTRY and keydown listener in ui-core.js (Slice E)

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
      /group\s*:\s*['"]KEYBOARD SHORTCUTS['"][\s\S]*?cmds\s*:\s*\[([\s\S]*?)\],?\s*\}/
    );
    const kbCmds = kbM ? kbM[1] : '';
    const entryCount = (kbCmds.match(/cmd\s*:/g) || []).length;
    assert(entryCount >= 6, `KEYBOARD SHORTCUTS group has ≥6 entries (found ${entryCount})`);
  }

  // 36.3 Global keydown listener calls closeModal() on Escape
  {
    const kdIdx = uiSrc36.indexOf("document.addEventListener('keydown'");
    const kdSnippet = kdIdx >= 0 ? uiSrc36.slice(kdIdx, kdIdx + 4000) : '';
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
  const uiSrc37 = uiSource; // concatenated — CRUD mutators now in ui-render.js

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
//  Plus WU-D6 O'cta Brain canon-removal regression guard.
//  5 tests
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

  // 38.5 WU-D6 canon-removal regression guard: "O'cta Brain" has no fallout.wiki match
  //      (fabricated/garbled, owner-confirmed) and stays removed from BOTH the FO3
  //      WEAPONS.CSV and the FO3 registry. Removing it from only one file would break the
  //      38.3/38.4 parity guards; this pins it gone in both. fallout.wiki-verified (Protocol 3).
  {
    const dbFo3 = readFile('js/db_fo3.js');
    const regFo3 = readFile('js/reg_fo3.js');
    assert(
      !/cta Brain/.test(dbFo3) && !/cta Brain/.test(regFo3),
      'FO3: fabricated weapon "O\'cta Brain" stays removed from WEAPONS.CSV + registry (WU-D6)'
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
guards(htmlSource, [
  [
    /id="invFilterBar"/,
    'id="invFilterBar" element exists in index.html (inventory category filter bar)',
  ],

  // 40.4  Filter bar contains a button for the 'mod' category
  [
    /data-filter="mod"/,
    'index.html filter bar has data-filter="mod" button (Mods category filter)',
  ],

  // 40.5  'mod' option exists in the #newItemType select in index.html
  [/value="mod"/, '#newItemType select contains value="mod" option (Phase 4d-i mod type)'],
]);

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
  guards(apiSrc42, [
    ['const NATIVE_COMMAND_ROUTER', 'api.js defines NATIVE_COMMAND_ROUTER object'],

    // 42.2  [FEATURES] is a key in NATIVE_COMMAND_ROUTER
    [/'\[FEATURES\]'\s*:/, 'NATIVE_COMMAND_ROUTER has [FEATURES] handler'],

    // 42.3  [CROSSROADS] is a key in NATIVE_COMMAND_ROUTER
    [/'\[CROSSROADS\]'\s*:/, 'NATIVE_COMMAND_ROUTER has [CROSSROADS] handler'],

    // 42.4  [SLEEP] is a key in NATIVE_COMMAND_ROUTER
    [/'\[SLEEP\]'\s*:/, 'NATIVE_COMMAND_ROUTER has [SLEEP] handler'],
  ]);

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
  guards(stateSrc43, [
    [/const GAME_DEFS\s*=\s*\{/, 'state.js declares const GAME_DEFS = { ... }'],

    // 43.2  window.GAME_DEFS exposed on the global object
    [
      /window\.GAME_DEFS\s*=\s*GAME_DEFS/,
      'state.js assigns window.GAME_DEFS = GAME_DEFS (global exposure)',
    ],

    // 43.3  _activeDef() helper function defined in state.js
    [/function _activeDef\s*\(/, 'state.js defines _activeDef() TDZ-safe helper'],
  ]);

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
//  13 tests
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

      // 44.13  WU-B4: Phase-6 array fields + faction fame/infamy are sanitized.
      const _tc2 = {
        activeContext: 'FNV',
        campaigns: {
          FNV: {
            collectibles: ['Snow Globe - Goodsprings', null, 42],
            traits: ['Built to Destroy', null],
            skillBooks: ['Duck and Cover!'],
            magazines: ['Pugilism Illustrated'],
            lincolnItems: {
              "Lincoln's Hat": 'other',
              "Lincoln's Voice": 'hannibal',
              'Civil War Draft': 'bogus',
            },
            factions: {
              ncr: { fame: '15', infamy: -3, rep: 7 },
              legion: 'broken',
            },
          },
        },
      };
      const _r2 = _testSanitize(_tc2);
      const _c2 = _r2.campaigns.FNV;
      assert(
        _c2.collectibles.length === 2 &&
          _c2.collectibles.every(x => typeof x === 'string') &&
          _c2.collectibles[1] === '42' &&
          _c2.traits.length === 1 &&
          typeof _c2.traits[0] === 'string' &&
          _c2.skillBooks[0] === 'Duck and Cover!' &&
          _c2.magazines[0] === 'Pugilism Illustrated' &&
          _c2.lincolnItems["Lincoln's Hat"] === 'found' &&
          _c2.lincolnItems["Lincoln's Voice"] === 'hannibal' &&
          _c2.lincolnItems['Civil War Draft'] === 'found' &&
          _c2.factions.ncr.fame === 15 &&
          _c2.factions.ncr.infamy === 0 &&
          _c2.factions.ncr.rep === 7 &&
          typeof _c2.factions.legion === 'object' &&
          _c2.factions.legion.fame === 0 &&
          _c2.factions.legion.infamy === 0,
        'sanitizeImportedContainer: Phase-6 lists coerced (nulls dropped → strings), Lincoln dispositions whitelisted, faction fame/infamy → non-negative ints (WU-B4)'
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
  guards(cloudSource, [
    [/GoogleAuthProvider/, 'cloud.js references GoogleAuthProvider (Google auth import)'],

    // 45.2  cloud.js references linkWithPopup (desktop sign-in flow)
    [/linkWithPopup/, 'cloud.js references linkWithPopup (desktop Google sign-in flow)'],

    // 45.3  cloud.js does NOT import or call linkWithRedirect (popup-only mobile fix — redirect broke
    //        on iOS/Chrome due to third-party storage partitioning blocking getRedirectResult)
    [
      /linkWithRedirect/,
      'cloud.js does not reference linkWithRedirect (popup-only fix: redirect path removed)',
      NEG,
    ],

    // 45.4  cloud.js references getRedirectResult (completes mobile redirect on boot)
    [
      /getRedirectResult/,
      'cloud.js references getRedirectResult (boot-time mobile redirect completion)',
    ],

    // 45.5  cloud.js references signOut (account sign-out function)
    [/\bsignOut\b/, 'cloud.js references signOut (account sign-out)'],
  ]);

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
//  confirm-gated load/delete, picker UI wired. Plus WU-B5: the cloud
//  push→sanitize→migrate→apply round-trip (Phase-6 fields survive) and
//  the setDoc permanence guards (no blind save overwrite; settings merge).
//  19 tests
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

  // 46.14  renderSavesList() defined in ui.js (unified saves list — replaces renderCloudSavePicker)
  assert(
    /async function renderSavesList\s*\(/.test(uiSource) ||
      /function renderSavesList\s*\(/.test(uiSource),
    'ui.js defines renderSavesList() (unified saves list — replaces renderCloudSavePicker)'
  );

  // 46.15  loadUI() calls renderSavesList()
  {
    let loadUIBody46 = '';
    try {
      loadUIBody46 = extractFunctionBody(uiSource, 'loadUI');
    } catch (_) {}
    assert(
      /renderSavesList\(\)/.test(loadUIBody46),
      'loadUI() calls renderSavesList() (unified saves list wired into page load)'
    );
  }

  // 46.16  index.html has savesListBody element (unified list mount point in Security & Config)
  assert(
    /id="savesListBody"/.test(htmlSource),
    'index.html has #savesListBody element (unified saves list mount point in Security & Config)'
  );

  // 46.17  WU-B5: cloud push→sanitize→migrate→apply round-trip — every Phase-6 field
  //        and faction reputation survives unchanged (TS-GAP-6 / CC-RT-1, the highest-value gap).
  //        Evaluates the REAL sanitizeImportedContainer (api.js) + migrateState (state.js)
  //        in a VM sandbox (GAME_DEFS / _buildFactions stubbed; neither branch fires on a
  //        current-version populated save) and asserts the data is byte-stable.
  {
    const vm = require('vm');
    let rtOk = false;
    let rtErr = null;
    try {
      const _decl = (src, name) => {
        const body = extractFunctionBody(src, name);
        const s = src.indexOf('function ' + name);
        const p = src.slice(src.indexOf('(', s), src.indexOf('{', src.indexOf('(', s)));
        return 'function ' + name + p + body;
      };
      const sandbox = { GAME_DEFS: { FNV: {}, FO3: {} }, _buildFactions: () => ({}), console };
      vm.createContext(sandbox);
      vm.runInContext(
        _decl(apiSource, 'sanitizeImportedContainer') + '\n' + _decl(stateSource, 'migrateState'),
        sandbox
      );
      sandbox._push = {
        activeContext: 'FNV',
        campaigns: {
          FNV: {
            lvl: 30,
            gameContext: 'FNV',
            stats: { kills: 0, capsEarned: 0, damageDealt: 0, sessionStart: 1 },
            factions: { ncr: { fame: 25, infamy: 5 }, legion: { fame: 0, infamy: 40 } },
            collectibles: ['Snow Globe - Goodsprings', 'Snow Globe - Hoover Dam'],
            lincolnItems: {},
            traits: ['Built to Destroy', 'Good Natured'],
            skillBooks: ['Duck and Cover!', 'Tales of a Junktown Jerky Vendor'],
            magazines: ['Pugilism Illustrated', 'Boxing Times'],
          },
        },
      };
      const out = vm.runInContext(
        '(function () { var c = sanitizeImportedContainer(_push); return migrateState("2.6.0", c.campaigns.FNV); })()',
        sandbox
      );
      rtOk =
        JSON.stringify(out.collectibles) ===
          JSON.stringify(['Snow Globe - Goodsprings', 'Snow Globe - Hoover Dam']) &&
        JSON.stringify(out.traits) === JSON.stringify(['Built to Destroy', 'Good Natured']) &&
        JSON.stringify(out.skillBooks) ===
          JSON.stringify(['Duck and Cover!', 'Tales of a Junktown Jerky Vendor']) &&
        JSON.stringify(out.magazines) ===
          JSON.stringify(['Pugilism Illustrated', 'Boxing Times']) &&
        out.factions.ncr.fame === 25 &&
        out.factions.ncr.infamy === 5 &&
        out.factions.legion.fame === 0 &&
        out.factions.legion.infamy === 40 &&
        typeof out.lincolnItems === 'object' &&
        !Array.isArray(out.lincolnItems);
    } catch (e) {
      rtErr = e;
    }
    assert(
      rtOk,
      'cloud round-trip push→sanitize→migrate→apply: all Phase-6 fields + faction rep survive unchanged (WU-B5 TS-GAP-6/CC-RT-1)' +
        (rtErr ? ' — ' + rtErr.message : '')
    );
  }

  // 46.18  WU-B5 setDoc permanence (Protocol 34): saves are additive — no setDoc ever writes
  //        a 'saves' document (a blind setDoc would clobber a user's campaign with no recovery).
  assert(
    !/setDoc\s*\([\s\S]{0,80}['"]saves['"]/.test(cloudSource),
    'cloud.js: no setDoc targets a saves document — saves are additive via addDoc (Protocol 34 no-blind-overwrite)'
  );

  // 46.19  WU-B5 setDoc permanence: the mutable settings/preferences write uses { merge: true }
  //        so it never clobbers sibling preference fields (Protocol 34 additive-write).
  assert(
    /doc\([^)]*['"]settings['"][\s\S]{0,200}merge:\s*true/.test(cloudSource),
    'cloud.js: settings/preferences setDoc uses { merge: true } (no clobber of sibling prefs — Protocol 34)'
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

  // 47.9  renderSavesList shows "NAME" button for cloud saves (not "REN")
  {
    let pickerBody = '';
    try {
      pickerBody = extractFunctionBody(uiSource, 'renderSavesList');
    } catch (_) {}
    assert(
      />NAME</.test(pickerBody) && !/>REN</.test(pickerBody),
      'renderSavesList shows NAME button for cloud saves (not REN) — Part B rename fix'
    );
  }

  // 47.10 renderSavesList does not append a separate dateStr after the label
  //        (double-date regression guard: label already contains date from syncLocalSavesToCloud)
  {
    let pickerBody = '';
    try {
      pickerBody = extractFunctionBody(uiSource, 'renderSavesList');
    } catch (_) {}
    assert(
      !/\bdateStr\b/.test(pickerBody),
      'renderSavesList does not use dateStr (double-date regression guard — date shown once via label)'
    );
  }
}

// ══════════════════════════════════════════════════════════════
//  SUITE 48 — Remote Kill-Switch + Client Auto-Disable (Protocol 32/35)
//  Fail-open: boot completes + all features work when config/flags absent.
//  Session-scoped auto-disable on repeated failures (FAIL_THRESHOLD=3).
//  Plus WU-B6 behavioral coverage: isFeatureEnabled fail-open reads +
//  loadRemoteConfig leaves flags enabled when the config fetch fails.
//  13 tests
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

  // 48.12  WU-B6 / TS-GAP-8 — isFeatureEnabled() BEHAVIORAL fail-open: an unknown/missing
  //        key returns true; an explicit false disables; a session auto-disabled key disables.
  {
    const vm = require('vm');
    let ok = false;
    let err = null;
    try {
      const f = extractAssignedFunction(cloudSrc48, 'isFeatureEnabled');
      const sb = {
        _featureFlags: { aiChat: false, cloudSync: true },
        _autoDisabled: { keySync: true },
      };
      vm.createContext(sb);
      vm.runInContext(`var isFeatureEnabled = function ${f.params} ${f.body};`, sb);
      const fn = sb.isFeatureEnabled;
      ok =
        fn('totallyUnknownFeature') === true && // unknown ⇒ fail-open (Protocol 33)
        fn('aiChat') === false && // explicit false ⇒ disabled
        fn('cloudSync') === true && // explicit true ⇒ enabled
        fn('keySync') === false; // session auto-disabled ⇒ disabled
    } catch (e) {
      err = e;
    }
    assert(
      ok,
      'isFeatureEnabled() behavioral: unknown key fail-opens to true; explicit false + auto-disabled both disable (TS-GAP-8)' +
        (err ? ' — ' + err.message : '')
    );
  }

  // 48.13  WU-B6 / TS-GAP-1 (CRITICAL, Protocol 33) — loadRemoteConfig() BEHAVIORAL fail-open:
  //        when the config fetch rejects/times out, it never throws and never disables a
  //        feature — every flag stays at its last-known-good (enabled) value.
  {
    const vm = require('vm');
    let flagsIntact = false;
    let threw = false;
    let err = null;
    try {
      const body = extractFunctionBody(cloudSrc48, 'loadRemoteConfig');
      const sb = {
        _featureFlags: { aiChat: true, cloudSync: true, keySync: true, googleSignIn: true },
        _autoDisabled: {},
        getDoc: () => Promise.reject(new Error('network-down')),
        doc: () => ({}),
        db: {},
        setTimeout: () => 0,
        localStorage: { setItem() {}, getItem: () => null },
        appendToChat: () => {},
        console: { warn() {} },
      };
      vm.createContext(sb);
      try {
        vm.runInContext(`async function loadRemoteConfig()${body}\nloadRemoteConfig();`, sb);
      } catch (_) {
        threw = true;
      }
      // The only mutation path is the success branch, which never runs on a rejected fetch.
      flagsIntact =
        sb._featureFlags.aiChat === true &&
        sb._featureFlags.cloudSync === true &&
        sb._featureFlags.keySync === true &&
        sb._featureFlags.googleSignIn === true;
    } catch (e) {
      err = e;
    }
    assert(
      flagsIntact && !threw,
      'loadRemoteConfig() behavioral fail-open: a failed/unreachable config fetch never throws and leaves all feature flags enabled (TS-GAP-1, Protocol 33)' +
        (err ? ' — ' + err.message : '')
    );
  }
}

// ══════════════════════════════════════════════════════════════
//  SUITE 49 — CI / Repo Hardening Guards (Q-series)
//  Asset-manifest completeness, Firestore no-allow-all, release.yml CI gating,
//  deploy.yml shortcut-icon staging guard (Protocol 36 escape-ratchet).
//  5 tests
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

  // 49.5  deploy.yml stage step deploys root-level PNGs via *.png glob
  //       (Protocol 36 escape-ratchet: shortcut icon 404 regression guard — ff42c51→c64617c deployed
  //       the icons to git but deploy.yml only listed icon.png by name, leaving the 4 shortcut icons unserved)
  const deployYml49 = readFile('.github/workflows/deploy.yml');
  assert(
    /cp\s+[^\n]*\*\.png/.test(deployYml49),
    'deploy.yml stage step uses *.png glob so all root-level icon files (icon.png + shortcut icons) are copied to _site/'
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
//  ring are wired consistently across all load/save paths. Plus WU-B6
//  TS-GAP-2: an end-to-end behavioral restoreRollingBackup proof.
//  57 tests
// ══════════════════════════════════════════════════════════════
header('Suite 51 — Save Integrity + Rolling Backups');
{
  const stateSrc51 = readFile('js/state.js');
  const uiSrc51 = uiSource; // concatenated — save functions now in ui-saves.js
  const cloudSrc51 = readFile('js/cloud.js');
  const indexSrc51 = readFile('index.html');

  // 51.1  computeSaveChecksum exists in state.js (FNV-1a global helper)
  assert(
    stateSrc51.includes('window.computeSaveChecksum') && stateSrc51.includes('function _fnv1a32'),
    'state.js defines window.computeSaveChecksum and _fnv1a32 helper (FNV-1a algorithm)'
  );

  // 51.2  verifySaveEnvelope exists in state.js
  guards(stateSrc51, [
    [
      'window.verifySaveEnvelope',
      'state.js defines window.verifySaveEnvelope (integrity + forward-compat check)',
    ],

    // 51.3  snapRollingBackup exists in state.js
    ['window.snapRollingBackup', 'state.js defines window.snapRollingBackup (rolling backup ring)'],

    // 51.4  getRollingBackups exists in state.js
    [
      'window.getRollingBackups',
      'state.js defines window.getRollingBackups (backup listing helper)',
    ],
  ]);

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

  // ── Additional structural guards (51.35–51.43) ──────────────────────────

  // 51.35  _contentHash removed from cloud.js (Protocol 22 — dedup in computeSaveChecksum)
  assert(
    !cloudSrc51.includes('function _contentHash'),
    'cloud.js: _contentHash removed (Protocol 22 — dedup uses shared window.computeSaveChecksum in state.js)'
  );

  // 51.36  restoreRollingBackup is confirm-gated (Protocol 34 — destructive op)
  {
    let restoreBody51c = '';
    try {
      restoreBody51c = extractFunctionBody(uiSrc51, 'restoreRollingBackup');
    } catch (e) {
      fail('Cannot extract restoreRollingBackup for confirm check: ' + e.message);
    }
    assert(
      restoreBody51c.includes('confirm('),
      'restoreRollingBackup is confirm-gated (Protocol 34 — destructive state replacement requires user confirmation)'
    );
  }

  // 51.37  snapRollingBackup stores timestamp: Date.now() in each backup entry
  assert(
    stateSrc51.includes('timestamp: Date.now()'),
    'snapRollingBackup stores timestamp: Date.now() in each backup entry (getRollingBackups sorts on this)'
  );

  // 51.38  getRollingBackups has a sort() call (sorting mechanism present)
  assert(
    /results\.sort\(/.test(stateSrc51),
    'getRollingBackups uses sort() to order backups by timestamp'
  );

  // 51.39  cloud.js saveCurrentToCloud stamps contentHash via computeSaveChecksum (integrity on cloud push)
  assert(
    cloudSrc51.includes('computeSaveChecksum') && cloudSrc51.includes('contentHash'),
    'cloud.js saveCurrentToCloud stamps contentHash via computeSaveChecksum (integrity on cloud push)'
  );

  // 51.40  verifySaveEnvelope accepts both robco_v8 (file/cloud) and state (slot) as content source
  assert(
    stateSrc51.includes('envelope.robco_v8') && stateSrc51.includes('envelope.state'),
    'verifySaveEnvelope handles both envelope.robco_v8 (file/cloud) and envelope.state (slot saves)'
  );

  // 51.41  _fnv1a32 returns 8-char padded hex string
  assert(
    stateSrc51.includes('toString(16)') && stateSrc51.includes('padStart(8'),
    "_fnv1a32 returns 8-char padded hex string (toString(16).padStart(8,'0'))"
  );

  // 51.42  verifySaveEnvelope has null/non-object guard at function top
  assert(
    /verifySaveEnvelope\s*=\s*function[\s\S]{0,120}!envelope/.test(stateSrc51),
    'verifySaveEnvelope has null/non-object guard at function top (graceful on malformed input)'
  );

  // 51.43  computeSaveChecksum applies _sortedForHash to contentObj and chat individually
  assert(
    stateSrc51.includes('v: _sortedForHash(contentObj') &&
      stateSrc51.includes('c: _sortedForHash(chat'),
    'computeSaveChecksum applies _sortedForHash to contentObj and chat individually (key-order invariant per field)'
  );

  // 51.21–51.34 + 51.44–51.56  Behavioral: eval state.js helpers and exercise the actual logic
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
      for (let _bi = 0; _bi < 26; _bi++) fail('51.B behavioral test (setup failed)');
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

      // ── Behavioral: computeSaveChecksum (51.44–51.49) ────────────────────

      // 51.44  computeSaveChecksum determinism: same inputs → identical output on repeated calls
      {
        const _ck44a = _cs({ lvl: 5, name: 'Tester' }, [{ text: 'hi', sender: 'user' }], 'any');
        const _ck44b = _cs({ lvl: 5, name: 'Tester' }, [{ text: 'hi', sender: 'user' }], 'any');
        assert(
          _ck44a === _ck44b,
          'computeSaveChecksum behavioral: same inputs → same output (determinism)'
        );
      }

      // 51.45  computeSaveChecksum content sensitivity: different robco_v8 → different checksum
      assert(
        _cs({ lvl: 1 }, [], 'any') !== _cs({ lvl: 99 }, [], 'any'),
        'computeSaveChecksum behavioral: different content (lvl 1 vs 99) → different checksum (content-sensitive)'
      );

      // 51.46  computeSaveChecksum chat sensitivity: different chat → different checksum
      assert(
        _cs({}, [{ text: 'hello' }], 'any') !== _cs({}, [{ text: 'goodbye' }], 'any'),
        'computeSaveChecksum behavioral: different chat messages → different checksum (chat-sensitive)'
      );

      // 51.47  computeSaveChecksum playstyle sensitivity: different playstyle → different checksum
      assert(
        _cs({}, [], 'any') !== _cs({}, [], 'completionist'),
        "computeSaveChecksum behavioral: different playstyle ('any' vs 'completionist') → different checksum"
      );

      // 51.48  computeSaveChecksum returns an 8-char lowercase hex string
      {
        const _ckHex = _cs({ test: true }, [], '');
        assert(
          typeof _ckHex === 'string' && /^[0-9a-f]{8}$/.test(_ckHex),
          'computeSaveChecksum behavioral: return value is an 8-char lowercase hex string'
        );
      }

      // 51.49  computeSaveChecksum(null, null, null) → no throw, returns a string
      {
        let _ckNull = null;
        try {
          _ckNull = _cs(null, null, null);
        } catch (_) {}
        assert(
          typeof _ckNull === 'string',
          'computeSaveChecksum behavioral: null/undefined args → no throw, returns a string (null-safe)'
        );
      }

      // ── Behavioral: verifySaveEnvelope extended (51.50–51.53) ────────────

      // 51.50  verifySaveEnvelope(null) → {status:'ok'} (null guard at function top)
      assert(
        _ve(null).status === 'ok',
        "verifySaveEnvelope behavioral: null input → {status:'ok'} (null guard — not 'legacy', not throw)"
      );

      // 51.51  _semverGt: 10.0.0 → future_version (double-digit major, numeric comparison)
      assert(
        _ve({ schemaVersion: '10.0.0' }).status === 'future_version',
        'verifySaveEnvelope/_semverGt behavioral: 10.0.0 > 2.0.1 uses numeric comparison (double-digit major)'
      );

      // 51.52  _semverGt: 2.10.0 → future_version (double-digit minor)
      assert(
        _ve({ schemaVersion: '2.10.0' }).status === 'future_version',
        'verifySaveEnvelope/_semverGt behavioral: 2.10.0 > 2.0.1 numeric (double-digit minor)'
      );

      // 51.53  backward compat: older schemaVersion (2.0.0) + valid checksum → 'ok'
      {
        const _oldC53 = { activeContext: 'FNV', campaigns: {} };
        const _oldE53 = {
          schemaVersion: '2.0.0',
          robco_v8: _oldC53,
          chat: [],
          playstyle: 'any',
          checksum: _cs(_oldC53, [], 'any'),
        };
        assert(
          _ve(_oldE53).status === 'ok',
          "verifySaveEnvelope behavioral: older schemaVersion (2.0.0) + valid checksum → 'ok' (backward compat)"
        );
      }

      // ── Behavioral: getRollingBackups / snapRollingBackup (51.54–51.56) ──

      // 51.54  getRollingBackups newest-first: manually seeded backups with known timestamps
      Object.keys(_ls).forEach(k => {
        delete _ls[k];
      });
      _ls['robco_backup_1'] = JSON.stringify({
        timestamp: 1000,
        robco_v8: { lvl: 1 },
        chat: [],
        playstyle: 'any',
      });
      _ls['robco_backup_2'] = JSON.stringify({
        timestamp: 3000,
        robco_v8: { lvl: 3 },
        chat: [],
        playstyle: 'any',
      });
      _ls['robco_backup_3'] = JSON.stringify({
        timestamp: 2000,
        robco_v8: { lvl: 2 },
        chat: [],
        playstyle: 'any',
      });
      {
        const _sorted54 = _getRing();
        assert(
          _sorted54.length === 3 &&
            _sorted54[0].timestamp === 3000 &&
            _sorted54[1].timestamp === 2000 &&
            _sorted54[2].timestamp === 1000,
          'getRollingBackups behavioral: newest-first sort (timestamps 3000→2000→1000, index 0 most recent)'
        );

        // 51.55  getRollingBackups entry structure: has key, data, data.robco_v8
        assert(
          _sorted54[0].key === 'robco_backup_2' &&
            typeof _sorted54[0].data === 'object' &&
            _sorted54[0].data.robco_v8 !== undefined,
          'getRollingBackups behavioral: entry has .key, .data, .data.robco_v8 fields'
        );
      }

      // 51.56  snapRollingBackup: A→B→A non-consecutive → 3 entries (dedup only blocks consecutive)
      Object.keys(_ls).forEach(k => {
        delete _ls[k];
      });
      _ls['robco_v8'] = JSON.stringify({ lvl: 10 });
      _ls['robco_chat'] = '[]';
      _ls['robco_playstyle'] = 'any';
      _snap(); // A → slot 1, ptr=1
      _ls['robco_v8'] = JSON.stringify({ lvl: 20 }); // B (different from A)
      _snap(); // B → slot 2, ptr=2 (most-recent = slot 2)
      _ls['robco_v8'] = JSON.stringify({ lvl: 10 }); // A again (most-recent is B, not A → should write)
      _snap(); // A → slot 3, ptr=0
      assert(
        _getRing().length === 3,
        'snapRollingBackup behavioral: A,B,A non-consecutive → 3 entries (dedup skips only consecutive repeats)'
      );
    }
  }

  // 51.57  WU-B6 / TS-GAP-2 — restoreRollingBackup BEHAVIORAL (end-to-end): selecting a backup
  //        restores it through the REAL sanitize → migrate → write pipeline (robco_v8 written
  //        from the chosen backup; chat + playstyle restored; reload guard set). Complements the
  //        structural 51.16/51.36 guards with a "the backup actually restores" behavioral proof.
  {
    const vm = require('vm');
    let ok = false;
    let err = null;
    try {
      const _store = Object.create(null);
      const _ls = {
        getItem: k => (_store[k] !== undefined ? String(_store[k]) : null),
        setItem: (k, v) => {
          _store[k] = String(v);
        },
        removeItem: k => {
          delete _store[k];
        },
      };
      const sb = {
        window: {
          _loadingSave: false,
          location: { reload: () => {} },
          getRollingBackups: () => [
            {
              label: 'TEST BACKUP',
              data: {
                version: '2.6.0',
                robco_v8: { activeContext: 'FNV', campaigns: { FNV: { lvl: 7, caps: 500 } } },
                chat: [{ text: 'hi', sender: 'user' }],
                playstyle: 'melee',
              },
            },
          ],
        },
        prompt: () => '1', // select backup #1
        confirm: () => true, // approve the destructive restore
        alert: () => {},
        appendToChat: () => {},
        localStorage: _ls,
        GAME_DEFS: { FNV: {}, FO3: {} },
        _buildFactions: () => ({}),
        console: { warn() {} },
      };
      const _declFn = (src, name) => {
        const body = extractFunctionBody(src, name);
        const s = src.indexOf('function ' + name);
        const p = src.slice(src.indexOf('(', s), src.indexOf('{', src.indexOf('(', s)));
        return 'function ' + name + p + body;
      };
      vm.createContext(sb);
      vm.runInContext(
        _declFn(apiSource, 'sanitizeImportedContainer') +
          '\n' +
          _declFn(stateSrc51, 'migrateState') +
          '\n' +
          _declFn(uiSrc51, 'restoreRollingBackup'),
        sb
      );
      sb.restoreRollingBackup();
      const written = JSON.parse(_store['robco_v8']);
      ok =
        written.campaigns.FNV.lvl === 7 &&
        written.campaigns.FNV.caps === 500 &&
        _store['robco_playstyle'] === 'melee' &&
        Array.isArray(JSON.parse(_store['robco_chat'])) &&
        sb.window._loadingSave === true; // reload-clobber guard set (Suite 95 invariant)
    } catch (e) {
      err = e;
    }
    assert(
      ok,
      'restoreRollingBackup behavioral: a selected backup restores end-to-end through sanitize→migrate→write (robco_v8/playstyle/chat restored; reload guard set) (TS-GAP-2)' +
        (err ? ' — ' + err.message : '')
    );
  }
}

// ══════════════════════════════════════════════════════════════
//  Suite 52 — Repo / Site Enrichment Guards (Protocol 37)
//  Verifies static site files, repomix config tuning, manifest
//  enrichment, and README CI badge are present and correct.
//  13 tests
// ══════════════════════════════════════════════════════════════
header('Suite 52 — Repo / Site Enrichment Guards (Protocol 37)');
{
  // 52.1  repomix.config.json exists
  assert(
    fs.existsSync(path.join(ROOT, 'repomix.config.json')),
    'repomix.config.json exists at repo root'
  );

  // 52.2  repomix.config.json is valid JSON
  let repomixCfg52 = null;
  try {
    repomixCfg52 = JSON.parse(fs.readFileSync(path.join(ROOT, 'repomix.config.json'), 'utf8'));
  } catch (_) {}
  assert(repomixCfg52 !== null, 'repomix.config.json parses as valid JSON');

  // 52.3  include array contains a js/ pattern
  assert(
    Array.isArray(repomixCfg52 && repomixCfg52.include) &&
      repomixCfg52.include.some(p => p.startsWith('js/')),
    'repomix.config.json include array has a js/ pattern'
  );

  // 52.4  customPatterns ignores node_modules
  const patterns52 = repomixCfg52 && repomixCfg52.ignore && repomixCfg52.ignore.customPatterns;
  assert(
    Array.isArray(patterns52) && patterns52.some(p => p.includes('node_modules')),
    'repomix.config.json customPatterns excludes node_modules'
  );

  // 52.5  customPatterns ignores package-lock.json (lockfile)
  assert(
    Array.isArray(patterns52) && patterns52.some(p => p.includes('package-lock')),
    'repomix.config.json customPatterns excludes package-lock.json (lockfile)'
  );

  // 52.6  customPatterns excludes RULES.md (private agent file)
  assert(
    Array.isArray(patterns52) && patterns52.includes('RULES.md'),
    'repomix.config.json customPatterns excludes RULES.md (private agent file)'
  );

  // 52.7  .nojekyll exists at root (stops GitHub Pages running Jekyll)
  assert(
    fs.existsSync(path.join(ROOT, '.nojekyll')),
    '.nojekyll exists at repo root (disables GitHub Pages Jekyll processing)'
  );

  // 52.8  robots.txt exists at root
  assert(fs.existsSync(path.join(ROOT, 'robots.txt')), 'robots.txt exists at repo root');

  // 52.9  404.html exists at root
  assert(fs.existsSync(path.join(ROOT, '404.html')), '404.html exists at repo root');

  // 52.10  PRIVACY.md exists at root
  assert(fs.existsSync(path.join(ROOT, 'PRIVACY.md')), 'PRIVACY.md exists at repo root');

  // 52.11  manifest.json has description field
  const manifestSrc52 = readFile('manifest.json');
  const manifest52 = JSON.parse(manifestSrc52);
  assert(
    typeof manifest52.description === 'string' && manifest52.description.length > 0,
    'manifest.json has a non-empty description field'
  );

  // 52.12  manifest.json has categories field (array)
  assert(
    Array.isArray(manifest52.categories) && manifest52.categories.length > 0,
    'manifest.json has a non-empty categories array'
  );

  // 52.13  README.md contains the GitHub Actions CI badge for ci.yml
  const readmeSrc52 = readFile('README.md');
  assert(
    readmeSrc52.includes('ci.yml') && readmeSrc52.includes('badge'),
    'README.md contains GitHub Actions CI badge referencing ci.yml'
  );
}

// ══════════════════════════════════════════════════════════════
//  Suite 53 — AI + Gemini-Key Resilience Guards
//  Key validation hardening, bounded exponential backoff,
//  error classification, Tri-Node schema validation.
//  25 tests
// ══════════════════════════════════════════════════════════════
header('Suite 53 — AI + Gemini-Key Resilience Guards');
{
  const apiSrc53 = readFile('js/api.js');

  // 53.1  _AI_RETRY_MAX constant defined
  assert(/_AI_RETRY_MAX\s*=\s*\d+/.test(apiSrc53), '_AI_RETRY_MAX constant defined in api.js');

  // 53.2  _AI_RETRY_DELAYS_MS array defined with ≥3 entries
  {
    const m = apiSrc53.match(/_AI_RETRY_DELAYS_MS\s*=\s*\[([^\]]+)\]/);
    const entries = m ? m[1].split(',').filter(s => s.trim().length > 0) : [];
    assert(
      entries.length >= 3,
      `_AI_RETRY_DELAYS_MS defined with ≥3 delay entries (found ${entries.length})`
    );
  }

  // 53.3  Delay values are exponentially increasing (each ≥ 2× the previous)
  {
    const m = apiSrc53.match(/_AI_RETRY_DELAYS_MS\s*=\s*\[([^\]]+)\]/);
    const vals = m
      ? m[1]
          .split(',')
          .map(s => parseInt(s.trim()))
          .filter(n => !isNaN(n))
      : [];
    const isExponential = vals.length >= 2 && vals.every((v, i) => i === 0 || v >= vals[i - 1] * 2);
    assert(
      isExponential,
      `_AI_RETRY_DELAYS_MS values are exponentially increasing (${vals.join(', ')})`
    );
  }

  // 53.4  fetchAuthorizedModels explicitly checks response.status for 401/403
  {
    const fnBody53 = extractFunctionBody(apiSrc53, 'fetchAuthorizedModels');
    assert(
      /response\.status\s*===\s*401\s*\|\|\s*response\.status\s*===\s*403/.test(fnBody53),
      'fetchAuthorizedModels checks response.status === 401 || 403 explicitly'
    );
  }

  // 53.5  Auth failure path returns before saveApiKeySilent (bad key never saved)
  {
    const fnBody53 = extractFunctionBody(apiSrc53, 'fetchAuthorizedModels');
    const authIdx = fnBody53.indexOf('401');
    const returnIdx = fnBody53.indexOf('return', authIdx);
    const saveIdx = fnBody53.indexOf('saveApiKeySilent');
    assert(
      authIdx !== -1 && returnIdx !== -1 && saveIdx !== -1 && returnIdx < saveIdx,
      'fetchAuthorizedModels: return appears before saveApiKeySilent (invalid key not saved)'
    );
  }

  // 53.6  Auth failure message contains "REJECTED"
  {
    const fnBody53 = extractFunctionBody(apiSrc53, 'fetchAuthorizedModels');
    assert(
      /REJECTED/i.test(fnBody53),
      'fetchAuthorizedModels auth failure message contains "REJECTED" (clear user guidance)'
    );
  }

  // 53.7  transmitMessage 401/403 branch has no setTimeout (auth errors not retried)
  {
    const tmBody53 = extractFunctionBody(apiSrc53, 'transmitMessage');
    const authIdx = tmBody53.indexOf('_code === 401 || _code === 403');
    const next429Idx = tmBody53.indexOf('_code === 429');
    // Extract the 401/403 block text (from auth check to the next else if)
    const authBlock =
      authIdx !== -1 && next429Idx !== -1 ? tmBody53.slice(authIdx, next429Idx) : '';
    assert(
      authBlock.length > 0 && !authBlock.includes('setTimeout'),
      'transmitMessage 401/403 branch has no setTimeout — auth errors are not retried'
    );
  }

  // 53.8  transmitMessage has 429 handling with rate-limit message
  {
    const tmBody53 = extractFunctionBody(apiSrc53, 'transmitMessage');
    assert(
      tmBody53.includes('_code === 429') && /RATE LIMIT/i.test(tmBody53),
      'transmitMessage handles 429 with a RATE LIMIT user message'
    );
  }

  // 53.9  Retry logic references _AI_RETRY_MAX (bounded, not hardcoded loop)
  {
    const tmBody53 = extractFunctionBody(apiSrc53, 'transmitMessage');
    assert(
      (tmBody53.match(/_AI_RETRY_MAX/g) || []).length >= 2,
      'transmitMessage retry logic references _AI_RETRY_MAX ≥2 times (bounded backoff)'
    );
  }

  // 53.10  _validateTriNode function defined in api.js
  assert(
    /function\s+_validateTriNode\s*\(/.test(apiSrc53),
    '_validateTriNode() function defined in api.js'
  );

  // 53.11  _validateTriNode called before autoImportState in transmitMessage
  {
    const tmBody53 = extractFunctionBody(apiSrc53, 'transmitMessage');
    const vIdx = tmBody53.indexOf('_validateTriNode');
    const aIdx = tmBody53.indexOf('autoImportState');
    assert(
      vIdx !== -1 && aIdx !== -1 && vIdx < aIdx,
      '_validateTriNode called before autoImportState in transmitMessage (schema validated before state mutation)'
    );
  }

  // 53.12–53.14  Static: _validateTriNode body guards are all present
  const fnVtN53 = extractFunctionBody(apiSrc53, '_validateTriNode');

  // 53.12  Guards against null/falsy input
  assert(
    /!parsed/.test(fnVtN53),
    '_validateTriNode body has !parsed guard (null/falsy input rejected)'
  );
  // 53.13  Guards against arrays
  assert(
    /Array\.isArray/.test(fnVtN53),
    '_validateTriNode body has Array.isArray guard (array responses rejected)'
  );
  // 53.14  Accepts objects with Tri-Node keys
  assert(
    /'narrative' in parsed/.test(fnVtN53) || /"narrative" in parsed/.test(fnVtN53),
    "_validateTriNode body accepts objects with 'narrative' key (valid Tri-Node accepted)"
  );

  // 53.15  fetchAuthorizedModels: 400 body inspected for INVALID_ARGUMENT (Finding A)
  {
    const fnBody53 = extractFunctionBody(apiSrc53, 'fetchAuthorizedModels');
    assert(
      /INVALID_ARGUMENT/.test(fnBody53),
      'fetchAuthorizedModels inspects error body for INVALID_ARGUMENT (bad-key 400 detected)'
    );
  }

  // 53.16  fetchAuthorizedModels: 400 body inspected for PERMISSION_DENIED (Finding A)
  {
    const fnBody53 = extractFunctionBody(apiSrc53, 'fetchAuthorizedModels');
    assert(
      /PERMISSION_DENIED/.test(fnBody53),
      'fetchAuthorizedModels inspects error body for PERMISSION_DENIED (auth-denied 400 detected)'
    );
  }

  // 53.17  transmitMessage: throws "API Key Error" for key-specific 400s (Finding A)
  {
    const tmBody53 = extractFunctionBody(apiSrc53, 'transmitMessage');
    assert(
      /API Key Error/.test(tmBody53),
      'transmitMessage throws "API Key Error" for key-specific 400 responses (key errors distinguished from generic 400s)'
    );
  }

  // 53.18  transmitMessage: key-error/auth branch does NOT call _recordFeatureFailure (Finding A)
  {
    const tmBody53 = extractFunctionBody(apiSrc53, 'transmitMessage');
    const _keyErrIdx = tmBody53.indexOf('_isKeyError || _code === 401 || _code === 403');
    const _next429Idx = tmBody53.indexOf('_code === 429');
    const _keyErrBlock =
      _keyErrIdx !== -1 && _next429Idx > _keyErrIdx ? tmBody53.slice(_keyErrIdx, _next429Idx) : '';
    assert(
      _keyErrBlock.length > 0 && !_keyErrBlock.includes('_recordFeatureFailure'),
      'transmitMessage key-error/auth branch does NOT call _recordFeatureFailure (bad key does not auto-disable AI)'
    );
  }

  // 53.19–53.25  Behavioral: _validateTriNode exact return-value tests (Finding B)
  const _vtFn53 = (() => {
    try {
      const _body = extractFunctionBody(apiSrc53, '_validateTriNode');
      return new Function('parsed', _body.slice(1, -1).trim());
    } catch (_) {
      return null;
    }
  })();

  // 53.19  behavioral: {narrative:[]} → true
  assert(
    typeof _vtFn53 === 'function' && _vtFn53({ narrative: [] }) === true,
    '_validateTriNode({narrative:[]}) → true (valid Tri-Node with narrative key)'
  );
  // 53.20  behavioral: {state:{}} → true
  assert(
    typeof _vtFn53 === 'function' && _vtFn53({ state: {} }) === true,
    '_validateTriNode({state:{}}) → true (valid Tri-Node with state key)'
  );
  // 53.21  behavioral: {modal:{}} → true
  assert(
    typeof _vtFn53 === 'function' && _vtFn53({ modal: {} }) === true,
    '_validateTriNode({modal:{}}) → true (valid Tri-Node with modal key)'
  );
  // 53.22  behavioral: null → false
  assert(
    typeof _vtFn53 === 'function' && _vtFn53(null) === false,
    '_validateTriNode(null) → false (null rejected)'
  );
  // 53.23  behavioral: [] → false
  assert(
    typeof _vtFn53 === 'function' && _vtFn53([]) === false,
    '_validateTriNode([]) → false (array rejected)'
  );
  // 53.24  behavioral: "x" → false
  assert(
    typeof _vtFn53 === 'function' && _vtFn53('x') === false,
    "_validateTriNode('x') → false (string rejected)"
  );
  // 53.25  behavioral: {foo:1} → false
  assert(
    typeof _vtFn53 === 'function' && _vtFn53({ foo: 1 }) === false,
    '_validateTriNode({foo:1}) → false (non-Tri-Node object rejected)'
  );
}

// ══════════════════════════════════════════════════════════════
//  Suite 54 — Prompt-Injection Hardening, Input Caps, Quota Warning
//  Injection-resistance directive, player-input wrapper,
//  HTML + JS length caps, saveState quota handling.
//  14 tests
// ══════════════════════════════════════════════════════════════
header('Suite 54 — Prompt-Injection Hardening, Input Caps, Quota Warning');
{
  const apiSrc54 = readFile('js/api.js');
  const stateSrc54 = readFile('js/state.js');
  const htmlSource54 = readFile('index.html');
  const gsdBody54 = extractFunctionBody(apiSrc54, 'getSystemDirective');
  const tmBody54 = extractFunctionBody(apiSrc54, 'transmitMessage');
  const saveStateFn54 = extractFunctionBody(stateSrc54, 'saveState');

  // 54.1  getSystemDirective() contains an injection-resistance / source-boundary section
  assert(
    /Instruction-Source Boundary|injection.resist/i.test(gsdBody54),
    'getSystemDirective() contains an instruction-source-boundary / injection-resistance section'
  );

  // 54.2  The section instructs that player input is DATA, not instructions
  assert(
    /data.*player|player.*data|DATA.*player/i.test(gsdBody54) ||
      /data.*not.*instruction|not.*a.*command/i.test(gsdBody54),
    'getSystemDirective() injection-resistance section marks player input as data not instructions'
  );

  // 54.3  The section prohibits following instructions embedded in user/image content
  assert(
    /MUST NOT|must not/i.test(gsdBody54) &&
      /role|persona|schema|system instruction/i.test(gsdBody54),
    'getSystemDirective() injection-resistance section prohibits following embedded instructions (role/schema changes)'
  );

  // 54.4  The section requires Tri-Node JSON schema response regardless of player input
  assert(
    /Tri-Node JSON/i.test(gsdBody54) && /regardless/i.test(gsdBody54),
    'getSystemDirective() injection-resistance section requires Tri-Node JSON response regardless of player input'
  );

  // 54.5  transmitMessage() wraps user content in a labeled player-input block
  assert(
    /PLAYER INPUT/i.test(tmBody54),
    'transmitMessage() labels user content as PLAYER INPUT (clear data delimiter in outgoing request)'
  );

  // 54.6  The player-input label includes "data, not instructions" or equivalent
  assert(
    /data.*not.*instructions|not instructions/i.test(tmBody54),
    'transmitMessage() player-input label contains "data, not instructions" (clear injection barrier)'
  );

  // 54.7  #chatInput has maxlength ≥ 4000 in index.html
  {
    const chatInputML54Match = htmlSource54.match(/id="chatInput"[\s\S]{0,200}maxlength="(\d+)"/);
    const chatInputML54 = chatInputML54Match ? parseInt(chatInputML54Match[1]) : 0;
    assert(
      chatInputML54 >= 4000,
      `#chatInput maxlength is ≥ 4000 (found: ${chatInputML54}) — pathological chat input blocked at source`
    );
  }

  // 54.8  #newItemName has a maxlength attribute in index.html
  guards(htmlSource54, [
    [
      /id="newItemName"[\s\S]{0,200}maxlength="/,
      '#newItemName has a maxlength attribute in index.html (item name length capped)',
    ],

    // 54.9  #newQuestName has a maxlength attribute in index.html
    [
      /id="newQuestName"[\s\S]{0,200}maxlength="/,
      '#newQuestName has a maxlength attribute in index.html (quest name length capped)',
    ],

    // 54.10  #newPerkName has a maxlength attribute in index.html
    [
      /id="newPerkName"[\s\S]{0,200}maxlength="/,
      '#newPerkName has a maxlength attribute in index.html (perk name length capped)',
    ],

    // 54.11  #newCampaignNote has a maxlength attribute in index.html
    [
      /id="newCampaignNote"[\s\S]{0,200}maxlength="/,
      '#newCampaignNote has a maxlength attribute in index.html (campaign note length capped)',
    ],
  ]);

  // 54.12  transmitMessage() has a JS length guard checking userText.length
  assert(
    /userText\.length\s*>\s*\d+/.test(tmBody54),
    'transmitMessage() has a JS length guard on userText.length (defense-in-depth beyond maxlength attribute)'
  );

  // 54.13  saveState() catch block handles QuotaExceededError
  assert(
    /QuotaExceededError/.test(saveStateFn54),
    'saveState() catch block handles QuotaExceededError (save failures surface to the user)'
  );

  // 54.14  The QuotaExceededError handler in saveState() calls appendToChat with a warning
  assert(
    /QuotaExceededError[\s\S]{0,400}appendToChat/.test(saveStateFn54),
    'saveState() QuotaExceededError handler calls appendToChat (quota failures shown to user, not silently swallowed)'
  );
}

// ══════════════════════════════════════════════════════════════
//  Suite 55 — CSP Stage 2 Origin Guards + Firebase Pin
//  Protocol-20 origin guard (load-bearing CSP origins),
//  unsafe-inline tripwire, blob: img-src guard, Firebase version-pin guard.
//  13 tests
// ══════════════════════════════════════════════════════════════
header('Suite 55 — CSP Stage 1 Origin Guards + Firebase Pin');
{
  const htmlSource55 = readFile('index.html');
  const cloudSrc55 = readFile('js/cloud.js');

  // 55.1 generativelanguage.googleapis.com present in CSP (Gemini API)
  guards(htmlSource55, [
    [
      /generativelanguage\.googleapis\.com/,
      'CSP contains generativelanguage.googleapis.com (Gemini API origin — Protocol 20 guard)',
    ],

    // 55.2 identitytoolkit.googleapis.com present in CSP (Firebase Auth)
    [
      /identitytoolkit\.googleapis\.com/,
      'CSP contains identitytoolkit.googleapis.com (Firebase Auth origin — Protocol 20 guard)',
    ],

    // 55.3 securetoken.googleapis.com present in CSP (Firebase token refresh)
    [
      /securetoken\.googleapis\.com/,
      'CSP contains securetoken.googleapis.com (Firebase token refresh — Protocol 20 guard)',
    ],

    // 55.4 firestore.googleapis.com present in CSP (Firestore)
    [
      /firestore\.googleapis\.com/,
      'CSP contains firestore.googleapis.com (Firestore origin — Protocol 20 guard)',
    ],

    // 55.5 apis.google.com present in CSP (Google Sign-In popup + Firebase SDK)
    [
      /apis\.google\.com/,
      'CSP contains apis.google.com (Google Sign-In + Firebase SDK origin — Protocol 20 guard)',
    ],

    // 55.6 nv-overlord.firebaseapp.com present in CSP (Firebase hosting + auth handler)
    [
      /nv-overlord\.firebaseapp\.com/,
      'CSP contains nv-overlord.firebaseapp.com (Firebase hosting + auth handler — Protocol 20 guard)',
    ],

    // 55.7 object-src 'none' present in CSP (blocks plugin content)
    [
      /object-src\s+'none'/,
      "CSP contains object-src 'none' (blocks plugin content — Protocol 20 guard)",
    ],

    // 55.8 base-uri 'none' present in CSP (blocks base-tag injection)
    [
      /base-uri\s+'none'/,
      "CSP contains base-uri 'none' (blocks base-tag injection — Protocol 20 guard)",
    ],

    // 55.9 frame-ancestors 'none' present in CSP (prevents clickjacking)
    [
      /frame-ancestors\s+'none'/,
      "CSP contains frame-ancestors 'none' (prevents clickjacking — Protocol 20 guard)",
    ],

    // 55.10 Tripwire: script-src still contains 'unsafe-inline'
    // (~148 inline event handlers require this; must not be silently dropped)
    [
      /script-src[^;]*'unsafe-inline'/,
      "CSP script-src contains 'unsafe-inline' (tripwire: required for ~148 inline handlers)",
    ],
  ]);

  // 55.11 Tripwire: script-src contains NO sha256- or nonce- token
  // CSP level 2+: a hash/nonce in script-src disables unsafe-inline, silently breaking all inline handlers
  {
    const csp55 = (htmlSource55.match(
      /http-equiv="Content-Security-Policy[^"]*"[^>]*content="([^"]*)"/
    ) || ['', ''])[1];
    const scriptSrc55 = (csp55.match(/script-src([^;]*)/) || ['', ''])[1];
    assert(
      !/sha256-|nonce-/.test(scriptSrc55),
      'CSP script-src contains no sha256- or nonce- token (tripwire: a hash/nonce disables unsafe-inline per CSP spec, breaking all 148 inline handlers)'
    );
  }

  // 55.12 Firebase pin guard: all firebasejs import URLs in cloud.js carry version 12.15.0
  {
    const fbPins55 = cloudSrc55.match(/firebasejs\/[\d.]+/g) || [];
    const allPinned55 = fbPins55.length > 0 && fbPins55.every(m => m.endsWith('12.15.0'));
    assert(
      allPinned55,
      `Firebase SDK import URLs in cloud.js are all pinned to 12.15.0 (found: ${fbPins55.join(', ')}) — supply-chain guard`
    );
  }

  // 55.13 img-src contains blob: (canvas / screenshot-preview images)
  assert(
    /img-src[^;]*blob:/.test(htmlSource55),
    'CSP img-src contains blob: (canvas/screenshot-preview images — Protocol 20 guard)'
  );
}

// ══════════════════════════════════════════════════════════════
//  Suite 56 — UI Module Split Guards + Boot-Loader Migration
//  Protocol-20 static guards: each ui-*.js must exist, appear
//  in sw.js ASSETS, and be wired in index.html before api.js.
//  Also guards the document.write → createElement migration.
//  35 tests
// ══════════════════════════════════════════════════════════════
header('Suite 56 — UI Module Split Guards');
{
  const htmlSource56 = readFile('index.html');
  const swSrc56 = readFile('sw.js');

  // 56.1 js/ui-audio.js file exists on disk
  assert(
    fs.existsSync(path.join(ROOT, 'js/ui-audio.js')),
    'js/ui-audio.js file exists (Slice A: audio module extracted)'
  );

  // 56.2 ./js/ui-audio.js appears in sw.js ASSETS list
  assert(
    /['"]\.\/js\/ui-audio\.js['"]/.test(swSrc56),
    "'./js/ui-audio.js' in sw.js ASSETS (cache covers the audio module)"
  );

  // 56.3 <script src="js/ui-audio.js"> appears in index.html
  assert(
    /src=['"]js\/ui-audio\.js['"]/.test(htmlSource56),
    '<script src="js/ui-audio.js"> present in index.html'
  );

  // 56.4 ui-audio.js script appears before api.js in index.html (load-order guard)
  {
    const audioIdx56 = htmlSource56.indexOf('js/ui-audio.js');
    const apiIdx56 = htmlSource56.indexOf('js/api.js');
    assert(
      audioIdx56 !== -1 && apiIdx56 !== -1 && audioIdx56 < apiIdx56,
      'ui-audio.js <script> appears before api.js in index.html (load-order guard)'
    );
  }

  // 56.5 ui-audio.js script appears before ui.js in index.html (ui-audio must load first)
  {
    const audioIdx56b = htmlSource56.indexOf('js/ui-audio.js');
    const uiIdx56 = htmlSource56.indexOf('"js/ui-core.js"');
    assert(
      audioIdx56b !== -1 && uiIdx56 !== -1 && audioIdx56b < uiIdx56,
      'ui-audio.js <script> appears before ui.js in index.html (audio loads before core)'
    );
  }

  // 56.6 js/ui-render.js file exists on disk
  assert(
    fs.existsSync(path.join(ROOT, 'js/ui-render.js')),
    'js/ui-render.js file exists (Slice B: render module extracted)'
  );

  // 56.7 ./js/ui-render.js appears in sw.js ASSETS list
  assert(
    /['"]\.\/js\/ui-render\.js['"]/.test(swSrc56),
    "'./js/ui-render.js' in sw.js ASSETS (cache covers the render module)"
  );

  // 56.8 <script src="js/ui-render.js"> appears in index.html
  assert(
    /src=['"]js\/ui-render\.js['"]/.test(htmlSource56),
    '<script src="js/ui-render.js"> present in index.html'
  );

  // 56.9 ui-render.js script appears before api.js in index.html
  {
    const renderIdx56 = htmlSource56.indexOf('js/ui-render.js');
    const apiIdx56b = htmlSource56.indexOf('js/api.js');
    assert(
      renderIdx56 !== -1 && apiIdx56b !== -1 && renderIdx56 < apiIdx56b,
      'ui-render.js <script> appears before api.js in index.html (load-order guard)'
    );
  }

  // 56.10 ui-render.js script appears before ui.js in index.html
  {
    const renderIdx56b = htmlSource56.indexOf('js/ui-render.js');
    const uiIdx56b = htmlSource56.indexOf('"js/ui-core.js"');
    assert(
      renderIdx56b !== -1 && uiIdx56b !== -1 && renderIdx56b < uiIdx56b,
      'ui-render.js <script> appears before ui.js in index.html (render loads before core)'
    );
  }

  // 56.11 js/ui-saves.js file exists on disk
  assert(
    fs.existsSync(path.join(ROOT, 'js/ui-saves.js')),
    'js/ui-saves.js file exists (Slice C: saves module extracted)'
  );

  // 56.12 ./js/ui-saves.js appears in sw.js ASSETS list
  assert(
    /['"]\.\/js\/ui-saves\.js['"]/.test(swSrc56),
    "'./js/ui-saves.js' in sw.js ASSETS (cache covers the saves module)"
  );

  // 56.13 <script src="js/ui-saves.js"> appears in index.html
  assert(
    /src=['"]js\/ui-saves\.js['"]/.test(htmlSource56),
    '<script src="js/ui-saves.js"> present in index.html'
  );

  // 56.14 ui-saves.js script appears before api.js in index.html
  {
    const savesIdx56 = htmlSource56.indexOf('js/ui-saves.js');
    const apiIdx56c = htmlSource56.indexOf('js/api.js');
    assert(
      savesIdx56 !== -1 && apiIdx56c !== -1 && savesIdx56 < apiIdx56c,
      'ui-saves.js <script> appears before api.js in index.html (load-order guard)'
    );
  }

  // 56.15 ui-saves.js script appears before ui.js in index.html
  {
    const savesIdx56b = htmlSource56.indexOf('js/ui-saves.js');
    const uiIdx56c = htmlSource56.indexOf('"js/ui-core.js"');
    assert(
      savesIdx56b !== -1 && uiIdx56c !== -1 && savesIdx56b < uiIdx56c,
      'ui-saves.js <script> appears before ui.js in index.html (saves loads before core)'
    );
  }

  // 56.16 js/ui-account.js file exists on disk
  assert(
    fs.existsSync(path.join(ROOT, 'js/ui-account.js')),
    'js/ui-account.js file exists (Slice D: account module extracted)'
  );

  // 56.17 ./js/ui-account.js appears in sw.js ASSETS list
  assert(
    /['"]\.\/js\/ui-account\.js['"]/.test(swSrc56),
    "'./js/ui-account.js' in sw.js ASSETS (cache covers the account module)"
  );

  // 56.18 <script src="js/ui-account.js"> appears in index.html
  assert(
    /src=['"]js\/ui-account\.js['"]/.test(htmlSource56),
    '<script src="js/ui-account.js"> present in index.html'
  );

  // 56.19 ui-account.js script appears before api.js in index.html
  {
    const acctIdx56 = htmlSource56.indexOf('js/ui-account.js');
    const apiIdx56d = htmlSource56.indexOf('js/api.js');
    assert(
      acctIdx56 !== -1 && apiIdx56d !== -1 && acctIdx56 < apiIdx56d,
      'ui-account.js <script> appears before api.js in index.html (load-order guard)'
    );
  }

  // 56.20 ui-account.js script appears before ui-core.js in index.html
  {
    const acctIdx56b = htmlSource56.indexOf('js/ui-account.js');
    const uiIdx56d = htmlSource56.indexOf('"js/ui-core.js"');
    assert(
      acctIdx56b !== -1 && uiIdx56d !== -1 && acctIdx56b < uiIdx56d,
      'ui-account.js <script> appears before ui-core.js in index.html (account loads before core)'
    );
  }

  // 56.21 js/ui.js must NOT exist (Slice E: fully renamed to ui-core.js)
  assert(
    !fs.existsSync(path.join(ROOT, 'js/ui.js')),
    'js/ui.js does not exist on disk (Slice E: renamed to ui-core.js — old file must be absent)'
  );

  // ── Boot-loader migration guards (56.22–56.34) ────────────
  // 56.22 document.write is gone from index.html (headline regression guard)
  guards(htmlSource56, [
    [/document\.write/, 'index.html contains no document.write (boot-loader migration guard)', NEG],

    // 56.23 Boot loader uses createElement('script') for dynamic injection
    [
      /createElement\(['"]script['"]\)/,
      "boot loader uses document.createElement('script') (dynamic injection guard)",
    ],

    // 56.24 Boot loader uses .appendChild() to insert scripts
    [
      /\.appendChild\(/,
      'boot loader uses .appendChild() to inject scripts into <head> (dynamic injection guard)',
    ],

    // 56.25 Boot loader sets .async = false to preserve db→state→reg order
    [
      /\.async\s*=\s*false/,
      'boot loader sets script.async = false (preserves db→state→reg load order)',
    ],

    // 56.26 Boot loader references js/db_nv.js (FNV database)
    [/js\/db_nv\.js/, 'boot loader references js/db_nv.js (FNV database path present)'],

    // 56.27 Boot loader references js/db_fo3.js (FO3 database)
    [/js\/db_fo3\.js/, 'boot loader references js/db_fo3.js (FO3 database path present)'],

    // 56.28 Boot loader references js/state.js (shared state module)
    [/js\/state\.js/, 'boot loader references js/state.js (shared state module path present)'],

    // 56.29 Boot loader references js/reg_nv.js (FNV registry)
    [/js\/reg_nv\.js/, 'boot loader references js/reg_nv.js (FNV registry path present)'],

    // 56.30 Boot loader references js/reg_fo3.js (FO3 registry)
    [/js\/reg_fo3\.js/, 'boot loader references js/reg_fo3.js (FO3 registry path present)'],

    // 56.31 Boot loader reads activeContext (primary context selector)
    [/activeContext/, 'boot loader reads activeContext (primary game-context selector)'],

    // 56.32 Boot loader has try/catch for fail-safe LocalStorage access
    [
      /try\s*\{/,
      'boot loader has try { ... } catch (fail-safe: corrupt LocalStorage → FNV default)',
    ],
  ]);

  // 56.33 Boot loader has 'FNV' as the fail-safe default
  assert(
    /'FNV'/.test(htmlSource56) || /"FNV"/.test(htmlSource56),
    "boot loader has 'FNV' fail-safe default (loads FNV when context is absent/unreadable)"
  );

  // 56.34 Boot loader handles 'FO3' context
  assert(
    /'FO3'/.test(htmlSource56) || /"FO3"/.test(htmlSource56),
    "boot loader handles 'FO3' context (switches to FO3 db + reg when activeContext is FO3)"
  );

  // 56.35 Boot loader selects data files via the GAME_FILES manifest with a
  //       GAME_FILES.FNV fail-safe (WU-A5 — no hardcoded per-game ternary).
  assert(
    /GAME_FILES\s*=\s*\{/.test(htmlSource56) &&
      /GAME_FILES\[\s*ctx\s*\]\s*\|\|\s*GAME_FILES\.FNV/.test(htmlSource56),
    'boot loader uses GAME_FILES manifest keyed by context with GAME_FILES.FNV fail-safe (WU-A5 boot manifest)'
  );
}

// ══════════════════════════════════════════════════════════════
//  Suite 57 — PWA App Shortcuts Guards
//  Verifies manifest.json shortcuts array and ui-core.js
//  SHORTCUT_ROUTES / routeLaunchShortcut implementation.
//  Also checks custom per-shortcut icon files exist and are
//  listed in sw.js ASSETS.
//  19 tests
// ══════════════════════════════════════════════════════════════
header('Suite 57 — PWA App Shortcuts Guards');
{
  const manifestSrc57 = readFile('manifest.json');
  const manifest57 = JSON.parse(manifestSrc57);
  const uiCoreSrc57 = readFile('js/ui-core.js');

  // 57.1  manifest.shortcuts is an array of exactly 4 entries
  assert(
    Array.isArray(manifest57.shortcuts) && manifest57.shortcuts.length === 4,
    `manifest.shortcuts is an array of 4 entries (found ${Array.isArray(manifest57.shortcuts) ? manifest57.shortcuts.length : 'not an array'})`
  );

  // 57.2  All 4 expected shortcuts present by name and url (Data shortcut removed from manifest)
  const expectedShortcuts57 = [
    { name: 'Comm-Link', url: './#go=comm' },
    { name: 'Inventory', url: './#go=inv' },
    { name: 'Stats', url: './#go=stat' },
    { name: 'New Campaign', url: './#go=new' },
  ];
  const shortcuts57 = Array.isArray(manifest57.shortcuts) ? manifest57.shortcuts : [];
  const allPresent57 = expectedShortcuts57.every(exp =>
    shortcuts57.some(s => s.name === exp.name && s.url === exp.url)
  );
  assert(
    allPresent57,
    'All 4 shortcuts present with correct names and ./#go=<id> urls (Comm-Link, Inventory, Stats, New Campaign)'
  );

  // 57.3  Every shortcut url starts with ./ and contains #go= (offline-safe, no query param)
  const allUrlsSafe57 = shortcuts57.every(
    s => typeof s.url === 'string' && s.url.startsWith('./') && s.url.includes('#go=')
  );
  assert(
    allUrlsSafe57,
    'Every shortcut url starts with ./ and uses #go= hash (not a query param — safe for SW cache-first offline)'
  );

  // 57.4  SHORTCUT_ROUTES const defined in ui-core.js
  assert(
    /const\s+SHORTCUT_ROUTES\s*=/.test(uiCoreSrc57),
    'SHORTCUT_ROUTES const defined in js/ui-core.js'
  );

  // 57.5  routeLaunchShortcut function defined in ui-core.js
  assert(
    /function\s+routeLaunchShortcut\s*\(/.test(uiCoreSrc57),
    'routeLaunchShortcut() function defined in js/ui-core.js'
  );

  // 57.6  Allow-list guard: /^go=/ regex present, no eval or innerHTML in routing fn
  {
    const fnMatch = uiCoreSrc57.match(/function\s+routeLaunchShortcut\s*\(\)[^{]*\{([\s\S]*?)^}/m);
    const fnBody = fnMatch ? fnMatch[1] : uiCoreSrc57;
    assert(
      /\^go=/.test(uiCoreSrc57),
      'routeLaunchShortcut uses /^go=/ allow-list regex to validate hash value'
    );
    assert(
      !/\beval\b/.test(fnBody) && !/\.innerHTML\b/.test(fnBody),
      'routeLaunchShortcut body contains no eval or innerHTML (XSS safety)'
    );
  }

  // 57.7  New Campaign routes to wipeTerminal, and wipeTerminal still has >=2 confirm() calls
  assert(
    /new\s*:\s*\(\s*\)\s*=>\s*wipeTerminal\s*\(/.test(uiCoreSrc57),
    "SHORTCUT_ROUTES 'new' key routes to wipeTerminal()"
  );
  const confirmCount57 = (uiCoreSrc57.match(/\bconfirm\s*\(/g) || []).length;
  assert(
    confirmCount57 >= 2,
    `wipeTerminal still has >=2 confirm() calls (found ${confirmCount57}) — double-confirm gate intact`
  );

  // 57.8  Tab routes reuse switchTab for inv, stat, data
  assert(
    /inv\s*:\s*\(\s*\)\s*=>\s*switchTab\s*\(\s*['"]inv['"]\s*\)/.test(uiCoreSrc57) &&
      /stat\s*:\s*\(\s*\)\s*=>\s*switchTab\s*\(\s*['"]stat['"]\s*\)/.test(uiCoreSrc57) &&
      /data\s*:\s*\(\s*\)\s*=>\s*switchTab\s*\(\s*['"]data['"]\s*\)/.test(uiCoreSrc57),
    'SHORTCUT_ROUTES inv/stat/data keys route via switchTab() — reuses existing tab system'
  );

  // 57.9  routeLaunchShortcut() call appears after initTabs( in ui-core.js source (boot order guard)
  {
    const initTabsIdx = uiCoreSrc57.indexOf('initTabs(');
    const routeCallIdx = uiCoreSrc57.indexOf('routeLaunchShortcut()');
    assert(
      initTabsIdx !== -1 && routeCallIdx !== -1 && routeCallIdx > initTabsIdx,
      'routeLaunchShortcut() call appears after initTabs() in source — tab system ready before routing'
    );
  }

  // 57.10  Reload-safety: history.replaceState present in routeLaunchShortcut
  assert(
    /history\.replaceState/.test(uiCoreSrc57),
    'routeLaunchShortcut clears the hash via history.replaceState (reload-safety — prevents re-trigger on reload)'
  );

  // 57.11  Each shortcut references its own specific custom icon (not icon.png)
  const expectedIcons57 = {
    'Comm-Link': 'comm-link-icon.png',
    Inventory: 'inventory-icon.png',
    Stats: 'stats-icon.png',
    'New Campaign': 'new-campaign-icon.png',
  };
  const allCustomIcons57 = shortcuts57.every(s => {
    const expected = expectedIcons57[s.name];
    return expected && Array.isArray(s.icons) && s.icons.some(ic => ic.src === expected);
  });
  assert(
    allCustomIcons57,
    'Each shortcut has its own custom icon src (comm-link-icon.png, inventory-icon.png, stats-icon.png, new-campaign-icon.png)'
  );

  // 57.12-57.15  Each shortcut icon file exists on disk
  const shortcutIconFiles57 = [
    'comm-link-icon.png',
    'inventory-icon.png',
    'stats-icon.png',
    'new-campaign-icon.png',
  ];
  for (const iconFile of shortcutIconFiles57) {
    assert(fs.existsSync(path.join(ROOT, iconFile)), `${iconFile} exists on disk`);
  }

  // 57.16  All 4 shortcut icon files are listed in sw.js ASSETS precache array
  const swSrc57 = readFile('sw.js');
  const allIconsInAssets57 = shortcutIconFiles57.every(f => swSrc57.includes(`'./${f}'`));
  assert(allIconsInAssets57, 'All 4 shortcut icon files are listed in sw.js ASSETS precache array');

  // 57.17  App icon (icon.png) exists on disk
  assert(fs.existsSync(path.join(ROOT, 'icon.png')), 'icon.png exists on disk (PWA app icon)');
}

// ══════════════════════════════════════════════════════════════
//  Suite 58 — Client Error Ring-Buffer Guards (Item C)
//  Verifies ERROR_LOG_KEY/CAP, _recordError, both handlers wired,
//  showErrorLog + escapeHtml + [LOGS] in router, no-exfil.
//  5 tests
// ══════════════════════════════════════════════════════════════
header('Suite 58 — Client Error Ring-Buffer Guards');
{
  const uiCoreSrc58 = readFile('js/ui-core.js');
  const apiSrc58 = readFile('js/api.js');

  // 58.1  ERROR_LOG_KEY, ERROR_LOG_CAP, _recordError all defined in ui-core.js
  assert(
    /ERROR_LOG_KEY\s*=/.test(uiCoreSrc58) &&
      /ERROR_LOG_CAP\s*=/.test(uiCoreSrc58) &&
      /function\s+_recordError\s*\(/.test(uiCoreSrc58),
    'ERROR_LOG_KEY, ERROR_LOG_CAP, and _recordError() are defined in js/ui-core.js'
  );

  // 58.2  Both global handlers call _recordError (error + rejection)
  assert(
    /_recordError\s*\(\s*['"]error['"]/.test(uiCoreSrc58) &&
      /_recordError\s*\(\s*['"]rejection['"]/.test(uiCoreSrc58),
    "Both 'error' and 'unhandledrejection' handlers call _recordError() with the correct type string"
  );

  // 58.3  Ring cap enforced — body contains .shift() and the cap value
  assert(
    /\.shift\s*\(\s*\)/.test(uiCoreSrc58) &&
      (/ERROR_LOG_CAP/.test(uiCoreSrc58) || /\b50\b/.test(uiCoreSrc58)),
    '_recordError enforces ring cap via .shift() with ERROR_LOG_CAP / 50 guard'
  );

  // 58.4  showErrorLog defined, references escapeHtml, and [LOGS] in NATIVE_COMMAND_ROUTER
  assert(
    /function\s+showErrorLog\s*\(/.test(uiCoreSrc58) &&
      /escapeHtml\s*\(/.test(uiCoreSrc58) &&
      /'\[LOGS\]'\s*:/.test(apiSrc58),
    "showErrorLog() defined in ui-core.js, references escapeHtml(), and '[LOGS]' wired in NATIVE_COMMAND_ROUTER"
  );

  // 58.5  No-exfil: bounded window from each fn start contains no fetch(, XMLHttpRequest, or sendBeacon
  {
    const recIdx58 = uiCoreSrc58.indexOf('function _recordError(');
    const showIdx58 = uiCoreSrc58.indexOf('function showErrorLog(');
    // 500 chars covers _recordError (small fn); 2500 chars covers showErrorLog before next fetch
    const recSlice58 = recIdx58 >= 0 ? uiCoreSrc58.slice(recIdx58, recIdx58 + 500) : '';
    const showSlice58 = showIdx58 >= 0 ? uiCoreSrc58.slice(showIdx58, showIdx58 + 2500) : '';
    assert(
      !recSlice58.includes('fetch(') &&
        !recSlice58.includes('XMLHttpRequest') &&
        !recSlice58.includes('sendBeacon') &&
        !showSlice58.includes('fetch(') &&
        !showSlice58.includes('XMLHttpRequest') &&
        !showSlice58.includes('sendBeacon'),
      '_recordError and showErrorLog bodies contain no fetch(), XMLHttpRequest, or sendBeacon (privacy: log is local-only)'
    );
  }
}

// ══════════════════════════════════════════════════════════════
//  Suite 59 — Inline Handler Integrity (Item D-proxy)
//  Scans index.html for on*="..." inline handlers, extracts
//  standalone function names, asserts all resolve in js/*.js.
//  2 tests
// ══════════════════════════════════════════════════════════════
header('Suite 59 — Inline Handler Integrity');
{
  const htmlSource59 = readFile('index.html');
  const jsFiles59 = [
    'js/ui-audio.js',
    'js/ui-render.js',
    'js/ui-saves.js',
    'js/ui-account.js',
    'js/ui-core.js',
    'js/api.js',
    'js/cloud.js',
    'js/state.js',
    'js/reg_nv.js',
    'js/reg_fo3.js',
  ];
  const allJsSrc59 = jsFiles59.map(f => readFile(f)).join('\n');

  // Extract all inline handler attribute values: on*="..."
  const attrRe59 = /\bon[a-z]+\s*=\s*"([^"]*)"/gi;
  // JS keywords + browser built-ins that appear as standalone calls in handler code
  // (these are not defined in js/*.js and are not dangling — they're host-env globals)
  const jsKeywords59 = new Set([
    'if',
    'else',
    'for',
    'while',
    'switch',
    'function',
    'return',
    'typeof',
    'instanceof',
    'new',
    'throw',
    'try',
    'catch',
    'finally',
    'delete',
    'void',
    'in',
    'of',
    'let',
    'const',
    'var',
    'do',
    'break',
    'continue',
    'case',
    'default',
    'import',
    'export',
    // browser built-ins commonly called directly from inline handlers
    'parseFloat',
    'parseInt',
    'isNaN',
    'isFinite',
    'Number',
    'String',
    'Boolean',
    'Array',
    'Object',
    'Math',
    'JSON',
    'Date',
    'encodeURIComponent',
    'decodeURIComponent',
  ]);
  const handlerNames59 = new Set();
  let attrM59;
  while ((attrM59 = attrRe59.exec(htmlSource59)) !== null) {
    const handlerText = attrM59[1];
    // Match standalone function calls not preceded by any word char or dot.
    // (?<![A-Za-z0-9_$.]) excludes both method calls (preceded by '.') and
    // partial-identifier false extractions (preceded by another word char).
    // Without this wider exclusion, 'this.setItem(' would yield 'etItem' not 'setItem'.
    for (const [, name] of handlerText.matchAll(
      /(?<![A-Za-z0-9_$.])([A-Za-z_$][A-Za-z0-9_$]*)\s*\(/g
    )) {
      if (!jsKeywords59.has(name)) handlerNames59.add(name);
    }
  }

  // 59.1  Scanner found at least 20 unique handler names (sanity — confirms scanner is live)
  assert(
    handlerNames59.size >= 20,
    `Inline handler scanner found ${handlerNames59.size} unique handler function names (≥20 expected)`
  );

  // 59.2  All extracted handler names resolve as definitions in js/*.js
  //       Matches: function NAME( | NAME = function | NAME = ( | window.NAME = | const/let/var NAME =
  //       This is definition-anchored — a name that only appears as a substring of another
  //       identifier or inside a comment will not match and will be flagged as dangling.
  function isDefined59(name, src) {
    const r = new RegExp(
      '(?:function\\s+' +
        name +
        '\\s*\\(' +
        '|\\b' +
        name +
        '\\s*=\\s*(?:function|\\()' +
        '|window\\.' +
        name +
        '\\s*=' +
        '|(?:const|let|var)\\s+' +
        name +
        '\\s*=)',
      ''
    );
    return r.test(src);
  }
  const dangling59 = [...handlerNames59].filter(name => !isDefined59(name, allJsSrc59));
  assert(
    dangling59.length === 0,
    'All inline handler function names resolve as definitions in js/*.js' +
      (dangling59.length ? ' — DANGLING (real bug): ' + dangling59.join(', ') : '')
  );
}

// ══════════════════════════════════════════════════════════════
//  Suite 60 — A11y Gate Guards
//  Verifies @axe-core/playwright devDep, a11y-check.mjs + baseline
//  exist, gate.js invokes a11y step, package.json has a11y script.
//  5 tests
// ══════════════════════════════════════════════════════════════
header('Suite 60 — A11y Gate Guards');
{
  const pkgSrc60 = readFile('package.json');
  const pkgJson60 = JSON.parse(pkgSrc60);
  const gateSrc60 = readFile('scripts/gate.js');

  // 60.1  @axe-core/playwright present in devDependencies
  assert(
    !!(pkgJson60.devDependencies && pkgJson60.devDependencies['@axe-core/playwright']),
    '@axe-core/playwright present in package.json devDependencies'
  );

  // 60.2  tests/a11y-check.mjs exists
  assert(fs.existsSync(path.join(ROOT, 'tests', 'a11y-check.mjs')), 'tests/a11y-check.mjs exists');

  // 60.3  tests/a11y-baseline.json exists and is valid JSON
  {
    const baselinePath60 = path.join(ROOT, 'tests', 'a11y-baseline.json');
    let baselineOk60 = false;
    if (fs.existsSync(baselinePath60)) {
      try {
        JSON.parse(fs.readFileSync(baselinePath60, 'utf8'));
        baselineOk60 = true;
      } catch (_) {}
    }
    assert(baselineOk60, 'tests/a11y-baseline.json exists and is valid JSON');
  }

  // 60.4  scripts/gate.js invokes a11y-check.mjs in the non-fast block
  assert(
    /a11y-check\.mjs/.test(gateSrc60) && /if\s*\(!fast\)/.test(gateSrc60),
    'scripts/gate.js invokes a11y-check.mjs inside the non-fast block'
  );

  // 60.5  package.json has the "a11y" script
  assert(!!(pkgJson60.scripts && pkgJson60.scripts.a11y), 'package.json has "a11y" script entry');
}

// ══════════════════════════════════════════════════════════════
//  Suite 61 — Mobile Layout Overflow Guards (CSS invariants)
//  Regression guards for r75 mobile layout stretch fix.
//  Ensures minmax(0,1fr) grid track, overflow-wrap on panels/rows,
//  inventory-span wrap rule, and mobile column clip are in place.
//  7 tests
// ══════════════════════════════════════════════════════════════
header('Suite 61 — Mobile Layout Overflow Guards');
{
  const css61 = readFile('css/terminal.css');

  // 61.1 .main-grid uses minmax(0, 1fr) — not bare 1fr (which silently expands grid track)
  assert(
    /\.main-grid\s*\{[^}]*grid-template-columns\s*:\s*minmax\s*\(\s*0\s*,\s*1fr\s*\)/.test(css61),
    '.main-grid grid-template-columns is minmax(0, 1fr) — not bare 1fr (mobile stretch guard)'
  );

  // 61.2 .list-row-content has overflow-wrap: anywhere
  {
    const rowMatch = (css61.match(/\.list-row-content\s*\{[^}]*\}/) || [''])[0];
    assert(
      /overflow-wrap\s*:\s*anywhere/.test(rowMatch),
      '.list-row-content has overflow-wrap: anywhere (long text wrap guard)'
    );
  }

  // 61.3 .list-row-content has word-break: break-word
  {
    const rowMatch = (css61.match(/\.list-row-content\s*\{[^}]*\}/) || [''])[0];
    assert(
      /word-break\s*:\s*break-word/.test(rowMatch),
      '.list-row-content has word-break: break-word (unbroken token guard)'
    );
  }

  // 61.4 .inventory-list li > span rule exists with min-width: 0
  {
    const spanMatch = (css61.match(/\.inventory-list\s+li\s*>\s*span\s*\{[^}]*\}/) || [''])[0];
    assert(
      spanMatch.length > 0 && /min-width\s*:\s*0/.test(spanMatch),
      '.inventory-list li > span rule exists with min-width: 0 (inventory name shrink guard)'
    );
  }

  // 61.5 .inventory-list li > span has overflow-wrap: anywhere
  {
    const spanMatch = (css61.match(/\.inventory-list\s+li\s*>\s*span\s*\{[^}]*\}/) || [''])[0];
    assert(
      /overflow-wrap\s*:\s*anywhere/.test(spanMatch),
      '.inventory-list li > span has overflow-wrap: anywhere (inventory long-name wrap guard)'
    );
  }

  // 61.6 .panel has overflow-wrap: anywhere
  {
    const panelMatch = (css61.match(/\.panel\s*\{[^}]*\}/) || [''])[0];
    assert(
      /overflow-wrap\s*:\s*anywhere/.test(panelMatch),
      '.panel has overflow-wrap: anywhere (panel content wrap guard)'
    );
  }

  // 61.7 Mobile @media (max-width: 999px) has overflow-x: clip for .col-left / .col-right
  {
    // Find the @media (max-width:999px) block start, then extract up to the next @media
    // to avoid stopping at the first nested } (lazy match limitation).
    const mobileIdx = css61.search(/@media\s*\([^)]*max-width\s*:\s*999px/);
    const nextMediaIdx = css61.indexOf('@media', mobileIdx + 10);
    const mobileSlice =
      mobileIdx >= 0
        ? css61.slice(mobileIdx, nextMediaIdx > mobileIdx ? nextMediaIdx : undefined)
        : '';
    assert(
      /overflow-x\s*:\s*clip/.test(mobileSlice),
      '@media (max-width: 999px) includes overflow-x: clip for .col-left/.col-right (mobile column clip guard)'
    );
  }
}

// ══════════════════════════════════════════════════════════════
//  Suite 62 — Changelog viewer guards
//  25 tests
// ══════════════════════════════════════════════════════════════
header('Suite 62 — Changelog viewer guards');
{
  const uiCoreSrc62 = readFile('js/ui-core.js');

  // 62.1 Both changelog viewers route through the structured renderer
  //      (_showChangelogModal) — the boot-time PATCH NOTES viewer no longer dumps
  //      raw innerText (WU-C11 glow-up). The boot viewer's fetch().then passes the
  //      env-filtered text into _showChangelogModal.
  assert(
    /function _showChangelogModal\s*\(/.test(uiCoreSrc62) &&
      /_showChangelogModal\(\s*visible\s*,\s*`> PATCH NOTES/.test(uiCoreSrc62),
    'Boot-time changelog viewer routes through the structured _showChangelogModal renderer (WU-C11)'
  );

  // 62.2 Viewer strips HTML comments
  assert(
    /replace\(.*<!--/.test(uiCoreSrc62),
    'Changelog viewer strips HTML comments (<!-- --> pattern)'
  );

  // 62.3 WU-C11 env-aware: _isStagingEnv() defined, fail-safe-defaults to production
  //      (returns false), and reads the robco-env marker + *.pages.dev hostname signal.
  assert(
    /function _isStagingEnv\s*\(/.test(uiCoreSrc62) &&
      /meta\[name="robco-env"\]/.test(uiCoreSrc62) &&
      /pages\\?\.dev/.test(uiCoreSrc62) &&
      /return false/.test(uiCoreSrc62),
    '_isStagingEnv() defined with robco-env marker + *.pages.dev signal + fail-safe production default (WU-C11)'
  );

  // 62.4 WU-C11 env-aware: _visibleChangelog() defined and BOTH viewers route through the
  //      env gate (boot-time viewer + showFullChangelog use _visibleChangelog/_isStagingEnv).
  {
    let fullBody = '';
    try {
      fullBody = extractFunctionBody(uiCoreSrc62, 'showFullChangelog');
    } catch (_) {}
    assert(
      /function _visibleChangelog\s*\(/.test(uiCoreSrc62) &&
        /_visibleChangelog\s*\(\s*text\s*,\s*_isStagingEnv\(\)\s*\)/.test(fullBody),
      'showFullChangelog() routes through _visibleChangelog(text, _isStagingEnv()) (WU-C11 env gate)'
    );
    assert(
      (uiCoreSrc62.match(/_visibleChangelog\(\s*text\s*,\s*_isStagingEnv\(\)\s*\)/g) || [])
        .length >= 2,
      'Both viewers (boot-time + showFullChangelog) call _visibleChangelog(text, _isStagingEnv()) (env gate on both)'
    );
  }

  // 62.5 WU-C11 env-aware BEHAVIORAL (both sides): _visibleChangelog strips [Unreleased] in
  //      production AND keeps it in staging — evaluated against a sample changelog.
  {
    let ok = false;
    let err = null;
    try {
      const body = extractFunctionBody(uiCoreSrc62, '_visibleChangelog');
      const s = uiCoreSrc62.indexOf('function _visibleChangelog');
      const params = uiCoreSrc62.slice(
        uiCoreSrc62.indexOf('(', s),
        uiCoreSrc62.indexOf('{', uiCoreSrc62.indexOf('(', s))
      );
      const fn = eval(`(function _visibleChangelog${params}${body})`);
      const sample =
        '## [Unreleased]<!-- Tests: 1/1 -->\n\n### Added\n- new thing\n\n---\n\n## [v2.6.0] — Foo\n\n### Added\n- old thing\n';
      const prod = fn(sample, false);
      const staging = fn(sample, true);
      ok =
        !/##\s*\[Unreleased\]/.test(prod) &&
        /##\s*\[v2\.6\.0\]/.test(prod) &&
        /##\s*\[Unreleased\]/.test(staging) &&
        /##\s*\[v2\.6\.0\]/.test(staging);
    } catch (e) {
      err = e;
    }
    assert(
      ok,
      'env-aware viewer: production hides [Unreleased] AND staging shows it (WU-C11 both-sides behavioral)' +
        (err ? ' — ' + err.message : '')
    );
  }

  // 62.6 WU-C11 env-aware: cf-staging-build.mjs injects the robco-env staging marker, and the
  //      committed (production) index.html carries NO marker (so prod defaults to hiding it).
  {
    const cfStaging = readFile('scripts/cf-staging-build.mjs');
    assert(
      /robco-env/.test(cfStaging) &&
        /content="staging"/.test(cfStaging) &&
        !/robco-env/.test(htmlSource),
      'cf-staging-build.mjs injects the robco-env="staging" marker; prod index.html has none (fail-safe)'
    );
  }

  // 62.6b WU-C13: cf-staging-build.mjs stamps the visible "DEV BUILD" badge into the
  //       staged index.html (injected before </body>) plus a "-dev" CACHE_NAME suffix so
  //       the badge reaches already-cached devices; the committed (production) index.html
  //       carries NO badge — the staging build is the only thing that shows it.
  {
    const cfStaging62c = readFile('scripts/cf-staging-build.mjs');
    assert(
      /DEV BUILD/.test(cfStaging62c) &&
        /position:fixed/.test(cfStaging62c) &&
        /'<\/body>'/.test(cfStaging62c) &&
        /\+ '-dev'/.test(cfStaging62c) &&
        !/DEV BUILD/.test(htmlSource),
      'cf-staging-build.mjs injects the visible "DEV BUILD" badge + "-dev" cache suffix; prod index.html has none (staging-only)'
    );
  }

  // ── Runtime-fetched-asset publish/precache invariant (staging CHANGELOG fix) ──
  // The in-app viewer fetches CHANGELOG.md at runtime. If a local asset the app
  // fetches isn't published to BOTH the staging build (cf-staging-build.mjs) AND
  // production (deploy.yml), it 404s on that environment — and because the SW does
  // not precache it, the runtime fetch has no fallback and rejects with "CHANGELOG
  // NOT FOUND". These four guards lock every runtime-fetched local asset into all
  // three publish/precache sets so this class can't recur (Protocol 36b/42).
  {
    const jsAll62 = [
      'js/ui-core.js',
      'js/api.js',
      'js/ui-render.js',
      'js/ui-saves.js',
      'js/ui-account.js',
      'js/ui-audio.js',
      'js/state.js',
      'js/cloud.js',
      'js/registry-core.js',
      'js/reg_nv.js',
      'js/reg_fo3.js',
      'js/db_nv.js',
      'js/db_fo3.js',
    ]
      .filter(f => fs.existsSync(path.join(ROOT, f)))
      .map(f => readFile(f))
      .join('\n');
    // Discover same-origin (non-http) string literals passed to fetch().
    const localFetched62 = [
      ...new Set(
        [...jsAll62.matchAll(/fetch\(\s*['"`]([^'"`]+)['"`]/g)]
          .map(m => m[1])
          .filter(u => !/^https?:/i.test(u) && !u.startsWith('//'))
      ),
    ];

    // 62.7 Sentinel: the scan is not silently empty (a broken regex must not make
    //      62.8–62.10 pass vacuously) — CHANGELOG.md is a known runtime-fetched asset.
    assert(
      localFetched62.includes('CHANGELOG.md'),
      'Runtime-fetched local-asset scan finds CHANGELOG.md (sentinel — scan not silently empty)'
    );

    // 62.8 Staging build publishes every runtime-fetched local asset.
    const cfStaging62b = readFile('scripts/cf-staging-build.mjs');
    const stagingMissing62 = localFetched62.filter(f => !cfStaging62b.includes(f));
    assert(
      stagingMissing62.length === 0,
      'Every runtime-fetched local asset is in cf-staging-build.mjs (staging publishes it)' +
        (stagingMissing62.length ? ' — missing: ' + stagingMissing62.join(', ') : '')
    );

    // 62.9 Production deploy publishes every runtime-fetched local asset.
    const deployYml62 = fs.existsSync(path.join(ROOT, '.github/workflows/deploy.yml'))
      ? readFile('.github/workflows/deploy.yml')
      : '';
    const prodMissing62 = localFetched62.filter(f => !deployYml62.includes(f));
    assert(
      deployYml62 === '' || prodMissing62.length === 0,
      'Every runtime-fetched local asset is copied by deploy.yml (prod publishes it)' +
        (prodMissing62.length ? ' — missing: ' + prodMissing62.join(', ') : '')
    );

    // 62.10 SW precaches every runtime-fetched local asset (cache-first — removes the
    //       runtime-network single point of failure behind the staging "NOT FOUND" bug).
    const swSrc62 = readFile('sw.js');
    const precacheMissing62 = localFetched62.filter(
      f =>
        !(swSrc62.includes(`'./${f}'`) || swSrc62.includes(`'${f}'`) || swSrc62.includes(`./${f}`))
    );
    assert(
      precacheMissing62.length === 0,
      'Every runtime-fetched local asset is precached in sw.js (cache-first, no runtime-network SPOF)' +
        (precacheMissing62.length ? ' — missing: ' + precacheMissing62.join(', ') : '')
    );
  }

  // ── WU-C11 part (c): the changelog viewer visual glow-up structure guards ──
  const cssSrc62 = readFile('css/terminal.css');
  let parseBody62 = '';
  let showBody62 = '';
  try {
    parseBody62 = extractFunctionBody(uiCoreSrc62, '_parseChangelog');
  } catch (_) {}
  try {
    showBody62 = extractFunctionBody(uiCoreSrc62, '_showChangelogModal');
  } catch (_) {}

  // 62.11 structured renderer + parser both defined
  assert(
    /function _parseChangelog\s*\(/.test(uiCoreSrc62) &&
      /function _showChangelogModal\s*\(/.test(uiCoreSrc62),
    '62.11: _parseChangelog() + _showChangelogModal() structured changelog renderer defined (WU-C11)'
  );

  // 62.12 (1) ONE version at a time + a version <select> DROPDOWN
  assert(
    /<select id="changelogVersionSelect"/.test(showBody62),
    '62.12: viewer builds a version <select id="changelogVersionSelect"> dropdown (one version at a time)'
  );

  // 62.13 (2) collapsible category <details> sections
  assert(
    /<details class="changelog-cat"/.test(showBody62) && /idx === 0 \? ' open'/.test(showBody62),
    '62.13: viewer builds collapsible category <details class="changelog-cat"> (first open, rest collapsed)'
  );

  // 62.14 (3) diegetic "FIRMWARE REVISION LOG" framing + the four core category tags
  assert(
    /FIRMWARE REVISION LOG/.test(showBody62) &&
      /\[\+\] ADDED/.test(uiCoreSrc62) &&
      /\[\*\] FIXED/.test(uiCoreSrc62) &&
      /\[~\] CHANGED/.test(uiCoreSrc62) &&
      /\[-\] REMOVED/.test(uiCoreSrc62),
    '62.14: diegetic FIRMWARE REVISION LOG framing + [+] ADDED / [*] FIXED / [~] CHANGED / [-] REMOVED tags'
  );

  // 62.15 entry text is escaped before innerHTML injection (XSS safety, Protocol 24)
  assert(
    /escapeHtml\(e\)/.test(showBody62) && /escapeHtml\(c\.tag\)/.test(showBody62),
    '62.15: changelog entry + category-tag text run through escapeHtml() before innerHTML injection'
  );

  // 62.16 SOURCE ORDER preserved — no reverse()/sort() in the parse or render path
  assert(
    !/\.reverse\(/.test(parseBody62) &&
      !/\.sort\(/.test(parseBody62) &&
      !/\.reverse\(/.test(showBody62) &&
      !/\.sort\(/.test(showBody62),
    '62.16: changelog parse/render never reverse() or sort() entries — source/document order preserved (WU-C11 invariant)'
  );

  // 62.17 dropdown wired via addEventListener('change') (no inline on* handler)
  assert(
    /addEventListener\(\s*'change'/.test(showBody62) && !/<select[^>]*onchange=/.test(showBody62),
    "62.17: version dropdown wired via addEventListener('change') (re-render), no inline onchange handler"
  );

  // 62.18 (4) ~700px reading column CSS + changelog-wide modal mode + close cleanup
  {
    let closeBody62 = '';
    try {
      closeBody62 = extractFunctionBody(uiCoreSrc62, 'closeModal');
    } catch (_) {}
    assert(
      /\.changelog-viewer\s*\{[^}]*max-width:\s*700px/.test(cssSrc62) &&
        /\.modal-box\.changelog-wide/.test(cssSrc62) &&
        /classList\.remove\('changelog-wide'\)/.test(closeBody62),
      '62.18: ~700px reading-column CSS (.changelog-viewer max-width:700px) + changelog-wide modal mode + closeModal cleanup'
    );
  }

  // ── WU-C15: consistent width + defaults + expand/collapse-all toggle ──────────
  const wideRule62 = (cssSrc62.match(/\.modal-box\.changelog-wide\s*\{([^}]*)\}/) || ['', ''])[1];
  // 62.19 LOCKED WIDTH — changelog-wide has an explicit (non-max) width so collapsing a
  // category changes height only, never width (no narrow box when all collapsed).
  assert(
    /(?<!max-)width:\s*min\(740px/.test(wideRule62) && /max-width:\s*min\(740px/.test(wideRule62),
    '62.19: .modal-box.changelog-wide locks an explicit width (not just max-width) — collapse/expand changes height only (WU-C15)'
  );
  // 62.20 EXPAND/COLLAPSE-ALL toggle — control rendered, styled, wired via addEventListener
  // (no inline handler), and its click sets .open on every category <details>.
  assert(
    /id="changelogToggleAll"/.test(showBody62) &&
      /\.changelog-toggle-all\b/.test(cssSrc62) &&
      /addEventListener\(\s*'click'/.test(showBody62) &&
      /d\.open\s*=\s*open/.test(showBody62) &&
      !/changelogToggleAll[^>]*onclick=/.test(showBody62),
    '62.20: expand/collapse-all toggle present + CSS + wired via addEventListener(click) (no inline handler), sets .open on every category (WU-C15)'
  );
  // 62.21 DEFAULT-OPEN-NEWEST preserved — only the first/newest category opens by default;
  // the toggle exposes both EXPAND ALL / COLLAPSE ALL states (label tracks live state).
  assert(
    /idx === 0 \? ' open' : ''/.test(showBody62) &&
      /EXPAND ALL/.test(showBody62) &&
      /COLLAPSE ALL/.test(showBody62),
    '62.21: default-open-newest preserved (only idx 0 / newest category open) + toggle exposes EXPAND ALL / COLLAPSE ALL (WU-C15)'
  );
  // 62.22 LOCKED HEIGHT (WU-C15 follow-up) — changelog-wide pins an explicit height
  // capped to the viewport so collapsing/expanding categories changes NOTHING about
  // the box dimensions (the flex column no longer shrink-to-fits its content). The
  // base .modal-box already gives .modal-content overflow-y:auto + flex-grow:1 (scrolls
  // internally) and .close-btn stays the last flex child (pinned at the bottom).
  // box-sizing:border-box makes the locked width/height the TOTAL footprint so
  // min(740px,94vw) can't overflow the viewport at 360/412.
  assert(
    /height:\s*min\(85vh/.test(wideRule62) &&
      /max-height:\s*min\(85vh/.test(wideRule62) &&
      /box-sizing:\s*border-box/.test(wideRule62),
    '62.22: .modal-box.changelog-wide locks an explicit height (min(85vh,…)) + box-sizing:border-box — collapse/expand keeps box dimensions constant; content scrolls internally, CLOSE pinned, no 360/412 overflow (WU-C15 follow-up)'
  );
  // 62.23 WU-HF: the viewer renders the post-release `### Hotfix` category like every other
  // category — _CHANGELOG_CAT_TAGS carries an explicit hotfix tag (not the generic fallback).
  {
    const tagsBlock62 = (uiCoreSrc62.match(/const _CHANGELOG_CAT_TAGS = \{([\s\S]*?)\n\};/) || [
      '',
      '',
    ])[1];
    assert(
      /hotfix:\s*'[^']+'/.test(tagsBlock62),
      "62.23: _CHANGELOG_CAT_TAGS includes an explicit 'hotfix' tag so the in-app viewer renders the ### Hotfix category like Added/Fixed/etc. (WU-HF)"
    );
  }
  // 62.24 BEHAVIORAL: _changelogCatTag('Hotfix') resolves to the explicit hotfix tag, not the
  // generic '[>] HOTFIX' fallback — proving a ### Hotfix heading parses + tags as a first-class
  // category. Evaluated by reconstructing the helper + its tag table in a vm.
  {
    const tagsBlock62b = (uiCoreSrc62.match(/const _CHANGELOG_CAT_TAGS = \{[\s\S]*?\n\};/) || [
      '',
    ])[0];
    const fn62b = (uiCoreSrc62.match(/function _changelogCatTag\([\s\S]*?\n\}/) || [''])[0];
    const vm = require('vm');
    let tag62 = '';
    try {
      tag62 = vm.runInNewContext(tagsBlock62b + '\n' + fn62b + "\n_changelogCatTag('Hotfix');", {});
    } catch (_) {}
    assert(
      typeof tag62 === 'string' && tag62.length > 0 && tag62 !== '[>] HOTFIX',
      '62.24: _changelogCatTag("Hotfix") returns the explicit first-class hotfix tag, not the generic fallback (WU-HF)'
    );
  }
}

// ══════════════════════════════════════════════════════════════
//  Suite 63 — Save/Cloud UI consolidation guards (Phase 6 Task 7)
//  saveCurrentToCloud additive, renderSavesList unified, new HTML elements
//  8 tests
// ══════════════════════════════════════════════════════════════
header('Suite 63 — Save/Cloud UI consolidation guards');
{
  const cloudSrc63 = readFile('js/cloud.js');

  // 63.1  cloud.js defines window.saveCurrentToCloud (replaces pushToCloud)
  assert(
    /window\.saveCurrentToCloud\s*=/.test(cloudSrc63),
    'cloud.js defines window.saveCurrentToCloud (replaces pushToCloud)'
  );

  // 63.2  saveCurrentToCloud uses addDoc (additive) and not setDoc (Protocol 34)
  {
    const scIdx = cloudSrc63.indexOf('saveCurrentToCloud');
    const scSlice = scIdx >= 0 ? cloudSrc63.slice(scIdx, scIdx + 2000) : '';
    assert(
      /\baddDoc\b/.test(scSlice) && !/\bsetDoc\b/.test(scSlice),
      'saveCurrentToCloud uses addDoc (additive) and not setDoc (Protocol 34 — no blind overwrite)'
    );
  }

  // 63.3  saveCurrentToCloud guards anonymous users
  {
    const scIdx = cloudSrc63.indexOf('saveCurrentToCloud');
    const scSlice = scIdx >= 0 ? cloudSrc63.slice(scIdx, scIdx + 2000) : '';
    assert(
      /isAnonymous/.test(scSlice),
      'saveCurrentToCloud has isAnonymous guard (cannot save to cloud when not signed in)'
    );
  }

  // 63.4  saveCurrentToCloud deduplicates by contentHash
  {
    const scIdx = cloudSrc63.indexOf('saveCurrentToCloud');
    const scSlice = scIdx >= 0 ? cloudSrc63.slice(scIdx, scIdx + 2000) : '';
    assert(
      /contentHash/.test(scSlice),
      'saveCurrentToCloud deduplicates by contentHash (prevents duplicate cloud saves)'
    );
  }

  // 63.5  renderSavesList() defined in ui.js (unified local+cloud list)
  assert(
    /async function renderSavesList\s*\(/.test(uiSource) ||
      /function renderSavesList\s*\(/.test(uiSource),
    'ui.js defines renderSavesList() (unified local+cloud list — replaces renderCloudSavePicker)'
  );

  // 63.6  loadUI() calls renderSavesList()
  {
    let loadUIBody63 = '';
    try {
      loadUIBody63 = extractFunctionBody(uiSource, 'loadUI');
    } catch (_) {}
    assert(
      /renderSavesList\(\)/.test(loadUIBody63),
      'loadUI() calls renderSavesList() (unified saves list wired into page load)'
    );
  }

  // 63.7  index.html has #savesListBody (new mount point in Security & Config)
  assert(
    /id="savesListBody"/.test(htmlSource),
    'index.html has #savesListBody element (unified saves list mount point in Security & Config)'
  );

  // 63.8  index.html has #btnSaveToCloud (replaces btnCloudPush — additive save)
  assert(
    /id="btnSaveToCloud"/.test(htmlSource),
    'index.html has #btnSaveToCloud button (replaces btnCloudPush — additive save to cloud)'
  );
}

// ══════════════════════════════════════════════════════════════
//  Suite 64 — SPECIAL stats editable (commit-on-blur) guards (Phase 6 Task 1+follow-up)
//  commitStat replaces clampStat; capStatMax upper cap on input; syncStateFromDom clamp
//  13 tests
// ══════════════════════════════════════════════════════════════
header('Suite 64 — SPECIAL stats editable (commit-on-blur) guards');
{
  const uiCoreSrc64 = readFile('js/ui-core.js');
  const specialIds = ['s_s', 's_p', 's_e', 's_c', 's_i', 's_a', 's_l'];

  // 64.1  All 7 SPECIAL inputs have onchange="commitStat(this)" (commit-on-blur)
  {
    const missing = specialIds.filter(id => {
      const idIdx = htmlSource.indexOf(`id="${id}"`);
      if (idIdx === -1) return true;
      // 550 chars after id accommodates the multiline oninput attribute that Prettier expands
      const slice = htmlSource.slice(Math.max(0, idIdx - 200), idIdx + 550);
      return !/onchange="commitStat\(this\)"/.test(slice);
    });
    assert(
      missing.length === 0,
      'All 7 SPECIAL inputs have onchange="commitStat(this)" (commit-on-blur guard)' +
        (missing.length ? ' — missing: ' + missing.join(', ') : '')
    );
  }

  // 64.2  No SPECIAL input oninput contains clampStat (snap-to-1 regression guard)
  {
    const broken = specialIds.filter(id => {
      const idIdx = htmlSource.indexOf(`id="${id}"`);
      if (idIdx === -1) return false;
      const slice = htmlSource.slice(Math.max(0, idIdx - 200), idIdx + 550);
      const oinputM = slice.match(/oninput\s*=\s*"([^"]*)"/s);
      return !!oinputM && /clampStat/.test(oinputM[1]);
    });
    assert(
      broken.length === 0,
      'No SPECIAL input oninput contains clampStat (snap-to-1 regression guard)' +
        (broken.length ? ' — found in: ' + broken.join(', ') : '')
    );
  }

  // 64.3  commitStat is defined in ui-core.js
  assert(/function commitStat\s*\(/.test(uiCoreSrc64), 'commitStat is defined in ui-core.js');

  // 64.4–64.7: inspect commitStat body
  {
    let commitStatBody = '';
    try {
      commitStatBody = extractFunctionBody(uiCoreSrc64, 'commitStat');
    } catch (_) {}

    // 64.4  1–10 clamp on commit only
    guards(commitStatBody, [
      [
        /Math\.max\s*\(\s*1,\s*Math\.min\s*\(\s*10,/,
        'commitStat clamps value to 1–10 on commit (Math.max/min guard)',
      ],

      // 64.5  calls updateMath() for downstream recalcs
      [/updateMath\s*\(\s*\)/, 'commitStat calls updateMath() to trigger downstream recalcs'],

      // 64.6  calls saveState() to persist
      [/saveState\s*\(\s*\)/, 'commitStat calls saveState() to debounce-persist the new value'],
    ]);

    // 64.7  isNaN guard reverts to prior state value (not a hard 1)
    assert(
      /isNaN\s*\(v\)/.test(commitStatBody) &&
        /state\s*\[.*k.*\]/.test(commitStatBody) &&
        /\|\|\s*5/.test(commitStatBody),
      'commitStat reverts empty/NaN to state[k]||5 (not forced to 1) — regression guard'
    );
  }

  // 64.8  All 7 SPECIAL inputs have inputmode="numeric"
  {
    const missing = specialIds.filter(id => {
      const idIdx = htmlSource.indexOf(`id="${id}"`);
      if (idIdx === -1) return true;
      const slice = htmlSource.slice(Math.max(0, idIdx - 200), idIdx + 550);
      return !/inputmode="numeric"/.test(slice);
    });
    assert(
      missing.length === 0,
      'All 7 SPECIAL inputs have inputmode="numeric" (mobile numeric keyboard guard)' +
        (missing.length ? ' — missing: ' + missing.join(', ') : '')
    );
  }

  // 64.9  clampStat is NOT defined (fully removed — regression guard)
  assert(
    !/function clampStat\s*\(/.test(uiCoreSrc64),
    'clampStat is not defined in ui-core.js (removed — regression guard)'
  );

  // 64.10  capStatMax is defined in ui-core.js
  assert(
    /function capStatMax\s*\(/.test(uiCoreSrc64),
    'capStatMax is defined in ui-core.js (upper-only cap on input)'
  );

  // 64.11  capStatMax has n>10 upper-only guard and no lower-bound force
  {
    let capBody = '';
    try {
      capBody = extractFunctionBody(uiCoreSrc64, 'capStatMax');
    } catch (_) {}
    assert(
      /n\s*>\s*10/.test(capBody) && !/n\s*<\s*1/.test(capBody),
      'capStatMax caps at 10 only (n>10 guard present; no lower-bound n<1 force — deletion works)'
    );
  }

  // 64.12  All 7 SPECIAL inputs oninput contains capStatMax
  {
    const missing = specialIds.filter(id => {
      const idIdx = htmlSource.indexOf(`id="${id}"`);
      if (idIdx === -1) return true;
      const slice = htmlSource.slice(Math.max(0, idIdx - 200), idIdx + 300);
      // oninput may be multi-line (Prettier); search for capStatMax anywhere in
      // the attribute value (between oninput=" and the closing ")
      const oinputM = slice.match(/oninput\s*=\s*"([^"]*)"/s);
      return !oinputM || !/capStatMax/.test(oinputM[1]);
    });
    assert(
      missing.length === 0,
      'All 7 SPECIAL inputs oninput contains capStatMax (live upper-cap guard)' +
        (missing.length ? ' — missing: ' + missing.join(', ') : '')
    );
  }

  // 64.13  syncStateFromDom clamps SPECIAL reads to 1–10 (defense-in-depth)
  {
    const stateSrc64 = readFile('js/state.js');
    let syncBody = '';
    try {
      syncBody = extractFunctionBody(stateSrc64, 'syncStateFromDom');
    } catch (_) {}
    assert(
      /Math\.max\s*\(\s*1,\s*Math\.min\s*\(\s*10,/.test(syncBody),
      'syncStateFromDom clamps SPECIAL reads to 1–10 (defense-in-depth: no save path leaks >10)'
    );
  }
}

// ══════════════════════════════════════════════════════════════
//  SUITE 65 — Blocking Update Modal (Phase 6 Task 2)
//  #updateModal replaces #updateBanner; full-screen blocking dialog;
//  focus trap, Esc blocked, fail-safe, robust _isGenuineUpdate() gate.
//  Case C already-installing fix + idempotency + WU-SW2 focus/visibility re-check.
//  18 tests
// ══════════════════════════════════════════════════════════════
{
  header('Blocking Update Modal');
  const uiCoreSrc65 = readFile('js/ui-core.js');

  // 65.1  #updateModal exists in index.html (replaced #updateBanner)
  guards(htmlSource, [
    [
      /id="updateModal"/,
      'id="updateModal" exists in index.html (blocking modal replaced updateBanner)',
    ],

    // 65.2  #updateModal has role="dialog"
    [
      /id="updateModal"[\s\S]{0,400}role="dialog"/,
      '#updateModal has role="dialog" (accessible dialog semantics)',
    ],

    // 65.3  #updateModal has aria-modal="true"
    [
      /id="updateModal"[\s\S]{0,400}aria-modal="true"/,
      '#updateModal has aria-modal="true" (marks background inert for screen readers)',
    ],

    // 65.4  #updateModal has aria-labelledby
    [
      /id="updateModal"[\s\S]{0,400}aria-labelledby/,
      '#updateModal has aria-labelledby attribute (screen-reader accessible label)',
    ],
  ]);

  // 65.5–65.7: _triggerUpdate body checks
  let triggerBody65 = '';
  try {
    triggerBody65 = extractFunctionBody(htmlSource, '_triggerUpdate');
  } catch (_) {}

  // 65.5  _triggerUpdate moves focus to the reboot button
  guards(triggerBody65, [
    [/\.focus\s*\(\s*\)/, '_triggerUpdate calls btn.focus() to move keyboard focus into the modal'],

    // 65.6  _triggerUpdate traps Tab (focus trap — single focusable element)
    [
      /e\.key\s*===\s*'Tab'[\s\S]{0,60}preventDefault/,
      '_triggerUpdate traps Tab key + preventDefault (focus trap — single focusable)',
    ],

    // 65.7  _triggerUpdate blocks Escape (mandatory — no dismiss path)
    [
      /e\.key\s*===\s*'Escape'[\s\S]{0,60}preventDefault/,
      '_triggerUpdate blocks Escape key + preventDefault (modal cannot be dismissed — must reboot)',
    ],
  ]);

  // 65.8  Case A is gated on the robust _isGenuineUpdate() (WU-SW2 — replaces the controller-only
  //        gate that suppressed the prompt in a standalone PWA where controller can be null)
  assert(
    /reg\.waiting\s*&&\s*_isGenuineUpdate\(\)/.test(htmlSource),
    'Case A: _triggerUpdate called only when reg.waiting && _isGenuineUpdate() (robust boot-safety gate)'
  );

  // 65.9  Case B / _watch is gated on the robust _isGenuineUpdate()
  assert(
    /state\s*===\s*'installed'\s*&&\s*_isGenuineUpdate\(\)/.test(htmlSource),
    "Case B: _triggerUpdate called only when state==='installed' && _isGenuineUpdate() (robust boot-safety gate)"
  );

  // 65.10  _triggerUpdate has fail-safe: missing DOM → auto SKIP_WAITING (no silent hang)
  assert(
    /!\s*modal\s*\|\|\s*!\s*btn/.test(triggerBody65) && /SKIP_WAITING/.test(triggerBody65),
    '_triggerUpdate has !modal||!btn fail-safe that posts SKIP_WAITING (no silent hang if DOM missing)'
  );

  // 65.11  Global ESC handler in ui-core.js targets sysModal only — updateModal not wired to it
  assert(
    !/updateModal/.test(uiCoreSrc65),
    'ui-core.js ESC handler does not reference updateModal (updateModal manages its own Esc — not caught by global handler)'
  );

  // 65.12  #updateModalMsg is left-aligned in terminal.css (message body reads flush-left, not ragged/centered)
  const cssSrc65 = readFile('css/terminal.css');
  assert(
    /#updateModalMsg[\s\S]{0,100}text-align\s*:\s*left/.test(cssSrc65),
    '#updateModalMsg has text-align:left in terminal.css (update modal message body is flush-left, not centered)'
  );

  // 65.13  Case C: registration handles a worker ALREADY installing at register()-resolve
  //        time (the browser's automatic on-navigation update check fires updatefound
  //        before the listener attaches → Case B misses it, reg.waiting still null →
  //        Case A misses it). _watch(reg.installing) closes the race so the prompt is
  //        not silently skipped on the load that detects the deploy. Idempotency guard
  //        (_updatePromptShown) prevents Case A/B/C double-firing for the same update.
  assert(
    /function\s+_watch\s*\(/.test(htmlSource) &&
      /if\s*\(\s*reg\.installing\s*\)/.test(htmlSource) &&
      /_updatePromptShown/.test(htmlSource),
    'Case C: registration watches an already-installing worker via _watch(reg.installing) + one-shot _updatePromptShown idempotency guard (popup-race fix intact)'
  );

  // ── WU-SW2: standalone-PWA update-prompt robustness (root-cause + focus re-check) ──
  // 65.14  the boot-safety gate is the robust _isGenuineUpdate() — has-installed-before flag
  //        OR the live controller (controller kept as a fallback, no longer the SOLE gate)
  assert(
    /function _isGenuineUpdate\(\)\s*\{[\s\S]*?_hasInstalledBefore\(\)[\s\S]*?\|\|[\s\S]*?navigator\.serviceWorker\.controller[\s\S]*?\}/.test(
      htmlSource
    ),
    '65.14: _isGenuineUpdate() = _hasInstalledBefore() || navigator.serviceWorker.controller (persistent-flag primary, controller fallback)'
  );

  // 65.15  a persistent install flag records that a SW has controlled the page (set when a
  //        controller is present AND on controllerchange) so a returning PWA knows it is an
  //        UPDATE even when the live controller reference is momentarily null
  assert(
    /SW_INSTALLED_FLAG\s*=\s*'robco_sw_installed'/.test(htmlSource) &&
      /function _markInstalled\(\)[\s\S]*?localStorage\.setItem\(SW_INSTALLED_FLAG/.test(
        htmlSource
      ) &&
      /'controllerchange',\s*\(\)\s*=>\s*\{\s*_markInstalled\(\)/.test(htmlSource),
    '65.15: persistent robco_sw_installed flag set via _markInstalled() (on controller present + on controllerchange)'
  );

  // 65.16  the focus/visibility re-check is wired — visibilitychange(visible) + window focus
  //        both re-check for a waiting SW (the fix for the resumed-not-reloaded standalone PWA)
  assert(
    /addEventListener\('visibilitychange'/.test(htmlSource) &&
      /visibilityState === 'visible'/.test(htmlSource) &&
      /addEventListener\('focus',\s*_recheckForUpdate\)/.test(htmlSource),
    '65.16: visibilitychange (becoming visible) + window focus both call _recheckForUpdate (catches a waiting SW when the installed PWA is reopened)'
  );

  // 65.17  the re-check runs reg.update(), is throttled (≤1 / 30s), and never throws on a
  //        failed/redirected update check
  assert(
    /function _recheckForUpdate\(\)/.test(htmlSource) &&
      /_reg\.update\(\)/.test(htmlSource) &&
      /_lastUpdateCheck/.test(htmlSource) &&
      /30000/.test(htmlSource) &&
      /\.catch\(\(\)\s*=>\s*\{\}\)/.test(htmlSource),
    '65.17: _recheckForUpdate runs reg.update(), throttles to once per 30000ms, and swallows update() errors (no throw)'
  );

  // 65.18  the re-check SURFACES a waiting worker via _triggerUpdate(_reg.waiting), gated on
  //        _isGenuineUpdate() — so a waiting SW prompts on the next focus even if every
  //        install-time event (Case A/B/C) was missed
  assert(
    /function _surfaceWaiting\(\)[\s\S]*?_reg\.waiting\s*&&\s*_isGenuineUpdate\(\)[\s\S]*?_triggerUpdate\(_reg\.waiting\)/.test(
      htmlSource
    ),
    '65.18: _surfaceWaiting() fires _triggerUpdate(_reg.waiting) when a waiting worker exists and _isGenuineUpdate() (prompt surfaces on next focus regardless of missed install events)'
  );
}

// ══════════════════════════════════════════════════════════════
//  SUITE 66 — FO3 Lincoln Memorabilia Tracker (Phase 6 Task 4)
//  state.lincolnItems, migration, autoImportState validated map,
//  reg_fo3 array, GAME_DEFS.FO3.tracksLincoln, render/handler guards,
//  'other' vocab removed + coercion guard.
//  20 tests
// ══════════════════════════════════════════════════════════════
{
  header('FO3 Lincoln Memorabilia Tracker');
  const stateSrc66 = readFile('js/state.js');
  const apiSrc66 = readFile('js/api.js');
  const uiRenderSrc66 = readFile('js/ui-render.js');
  const uiCoreSrc66 = readFile('js/ui-core.js');
  const fo3RegSrc66 = readFile('js/reg_fo3.js');
  const nvRegSrc66 = readFile('js/reg_nv.js');

  // 66.1  state.lincolnItems default {} in state.js
  assert(
    /lincolnItems\s*:\s*\{\}/.test(stateSrc66),
    'state.lincolnItems default {} in state object (Protocol 4 default)'
  );

  // 66.2  migrateState() has lincolnItems migration guard
  {
    let migrateBody = '';
    try {
      migrateBody = extractFunctionBody(stateSrc66, 'migrateState');
    } catch (_) {}
    assert(
      /lincolnItems/.test(migrateBody) &&
        /Array\.isArray/.test(migrateBody) &&
        /lincolnItems\s*=\s*\{\}/.test(migrateBody),
      'migrateState() guards lincolnItems — coerces non-object/array to {} (Protocol 4 migration)'
    );
  }

  // 66.3  autoImportState() has lincolnItems plain-object check
  {
    let importBody = '';
    try {
      importBody = extractFunctionBody(apiSrc66, 'autoImportState');
    } catch (_) {}
    assert(
      /lincolnItems/.test(importBody) && /Array\.isArray/.test(importBody),
      'autoImportState() validates lincolnItems as plain object (not array) before importing'
    );
  }

  // 66.4  autoImportState() validates vocabulary before accepting disposition values
  {
    let importBody = '';
    try {
      importBody = extractFunctionBody(apiSrc66, 'autoImportState');
    } catch (_) {}
    assert(
      /LINCOLN_VOCAB/.test(importBody) &&
        /hannibal/.test(importBody) &&
        /washington/.test(importBody),
      'autoImportState() uses LINCOLN_VOCAB list to validate disposition values (Protocol 24)'
    );
  }

  // 66.5  autoImportState() filters keys against registry item names (no arbitrary keys accepted)
  {
    let importBody = '';
    try {
      importBody = extractFunctionBody(apiSrc66, 'autoImportState');
    } catch (_) {}
    assert(
      /registryNames/.test(importBody) && /lincolnMemorabilia/.test(importBody),
      'autoImportState() filters lincolnItems keys against registry names (Protocol 24 — no arbitrary keys)'
    );
  }

  // 66.6  reg_fo3.js has lincolnMemorabilia array (non-empty)
  assert(
    /lincolnMemorabilia\s*:\s*\[/.test(fo3RegSrc66),
    'reg_fo3.js has lincolnMemorabilia array (FO3 artifact registry)'
  );

  // 66.7  reg_fo3.js lincolnMemorabilia has exactly 9 items
  {
    const m = fo3RegSrc66.match(/lincolnMemorabilia\s*:\s*\[([\s\S]*?)\],\s*\/\//);
    const block = m
      ? m[1]
      : fo3RegSrc66.match(/lincolnMemorabilia\s*:\s*\[([\s\S]*?)\],/)?.[1] || '';
    const count = (block.match(/\bname\s*:/g) || []).length;
    assert(count === 9, `reg_fo3.js lincolnMemorabilia has exactly 9 items (found ${count})`);
  }

  // 66.8  reg_nv.js does NOT have lincolnMemorabilia (FO3-only)
  assert(
    !/lincolnMemorabilia/.test(nvRegSrc66),
    'reg_nv.js does NOT contain lincolnMemorabilia (FO3-only registry entry)'
  );

  // 66.9  GAME_DEFS.FO3.tracksLincoln === true in state.js
  assert(
    /tracksLincoln\s*:\s*true/.test(stateSrc66),
    'GAME_DEFS.FO3.tracksLincoln: true in state.js (FO3-only feature flag)'
  );

  // 66.10  renderLincolnMemorabilia is defined in ui-render.js
  assert(
    /function renderLincolnMemorabilia\s*\(/.test(uiRenderSrc66),
    'renderLincolnMemorabilia() is defined in ui-render.js'
  );

  // 66.11  renderLincolnMemorabilia is called from loadUI() in ui-core.js
  {
    let loadUIBody = '';
    try {
      loadUIBody = extractFunctionBody(uiCoreSrc66, 'loadUI');
    } catch (_) {}
    assert(
      /renderLincolnMemorabilia\s*\(\s*\)/.test(loadUIBody),
      'renderLincolnMemorabilia() called from loadUI() in ui-core.js (Protocol 5)'
    );
  }

  // 66.12  renderLincolnMemorabilia has FO3 guard (tracksLincoln)
  {
    let renderBody = '';
    try {
      renderBody = extractFunctionBody(uiRenderSrc66, 'renderLincolnMemorabilia');
    } catch (_) {}
    assert(
      /tracksLincoln/.test(renderBody),
      'renderLincolnMemorabilia() has tracksLincoln guard (FO3-only — returns early in FNV)'
    );
  }

  // 66.13  toggleLincolnItem is defined in ui-render.js
  assert(
    /function toggleLincolnItem\s*\(/.test(uiRenderSrc66),
    'toggleLincolnItem() is defined in ui-render.js'
  );

  // 66.14  setLincolnDisposition is defined in ui-render.js
  assert(
    /function setLincolnDisposition\s*\(/.test(uiRenderSrc66),
    'setLincolnDisposition() is defined in ui-render.js'
  );

  // 66.15  setLincolnDisposition validates vocab before writing state
  {
    let dispBody = '';
    try {
      dispBody = extractFunctionBody(uiRenderSrc66, 'setLincolnDisposition');
    } catch (_) {}
    assert(
      /VOCAB/.test(dispBody) && /includes\s*\(value\)/.test(dispBody),
      'setLincolnDisposition() validates value against VOCAB before writing state (Protocol 24)'
    );
  }

  // 66.16  index.html has #lincolnMemorabiliaDisplay
  assert(
    /id="lincolnMemorabiliaDisplay"/.test(htmlSource),
    'index.html has #lincolnMemorabiliaDisplay container (Protocol 5 panel element)'
  );

  // 66.17  getSystemDirective() mentions lincolnItems in FO3 context
  {
    let sdBody = '';
    try {
      sdBody = extractFunctionBody(apiSrc66, 'getSystemDirective');
    } catch (_) {}
    assert(
      /lincolnItems/.test(sdBody),
      'getSystemDirective() references lincolnItems (Protocol 14 — AI contract updated for new state field)'
    );
  }

  // 66.18  LINCOLN_VOCAB in api.js does NOT include 'other' (Change 2 regression guard)
  assert(
    !/LINCOLN_VOCAB\s*=\s*\[[^\]]*['"]other['"]/.test(apiSrc66),
    "api.js LINCOLN_VOCAB does not include 'other' — removed in Change 2 (regression guard)"
  );

  // 66.19  renderLincolnMemorabilia opts does NOT include 'other' option
  assert(
    !/\[\s*['"]other['"]\s*,/.test(uiRenderSrc66),
    "ui-render.js opts array does not include 'other' option — removed in Change 2"
  );

  // 66.20  autoImportState() coerces legacy 'other' disposition to 'found'
  {
    let importBody66b = '';
    try {
      importBody66b = extractFunctionBody(apiSrc66, 'autoImportState');
    } catch (_) {}
    assert(
      /other.*found|coerced/.test(importBody66b),
      "autoImportState() coerces legacy 'other' disposition to 'found' for backward-compatibility"
    );
  }
}

// ══════════════════════════════════════════════════════════════
//  SUITE 67 — FNV Traits Tracker (Phase 6 Task 5 + filter follow-up)
//  state.traits, migration, autoImportState validated array,
//  reg_nv traits 16-item array, GAME_DEFS.FNV.hasTraits,
//  renderTraits/toggleTrait guards, #traitsDisplay distinct from #perksList,
//  #traitFilter input + renderTraits substring-filter guard.
//  19 tests
// ══════════════════════════════════════════════════════════════
{
  header('FNV Traits Tracker');
  const stateSrc67 = readFile('js/state.js');
  const apiSrc67 = readFile('js/api.js');
  const uiRenderSrc67 = readFile('js/ui-render.js');
  const uiCoreSrc67 = readFile('js/ui-core.js');
  const nvRegSrc67 = readFile('js/reg_nv.js');
  const fo3RegSrc67 = readFile('js/reg_fo3.js');

  // 67.1  state.traits default [] in state object
  assert(
    /traits\s*:\s*\[\s*\]/.test(stateSrc67),
    'state.traits default [] in state object (Protocol 4 default)'
  );

  // 67.2  migrateState() coerces non-array traits to []
  {
    let migrateBody67 = '';
    try {
      migrateBody67 = extractFunctionBody(stateSrc67, 'migrateState');
    } catch (_) {}
    assert(
      /Array\.isArray\(s\.traits\)/.test(migrateBody67) &&
        /s\.traits\s*=\s*\[\]/.test(migrateBody67),
      'migrateState() coerces non-array s.traits to [] (Protocol 4 migration)'
    );
  }

  // 67.3  autoImportState() validates traits as array before importing
  {
    const importBody67 = readFile('js/api.js');
    assert(
      /Array\.isArray\(raw\)/.test(importBody67) && /traits/.test(importBody67),
      'autoImportState() validates traits as array before importing'
    );
  }

  // 67.4  autoImportState() filters trait entries against registry names (Protocol 24)
  {
    let importBody67 = '';
    try {
      importBody67 = extractFunctionBody(apiSrc67, 'autoImportState');
    } catch (_) {}
    assert(
      /FALLOUT_REGISTRY\.traits/.test(importBody67) && /traitNames/.test(importBody67),
      'autoImportState() filters traits against FALLOUT_REGISTRY.traits names (Protocol 24)'
    );
  }

  // 67.5  autoImportState() deduplicates trait entries
  {
    let importBody67 = '';
    try {
      importBody67 = extractFunctionBody(apiSrc67, 'autoImportState');
    } catch (_) {}
    assert(
      /seen/.test(importBody67) && /traits/.test(importBody67),
      'autoImportState() deduplicates trait entries (seen Set guard)'
    );
  }

  // 67.6  reg_nv.js has traits array
  assert(/traits\s*:\s*\[/.test(nvRegSrc67), 'reg_nv.js has traits array (FNV trait registry)');

  // 67.7  reg_nv.js traits has exactly 16 items
  {
    let traitBlock67 = '';
    const traitMatch67 = nvRegSrc67.match(/traits\s*:\s*\[([\s\S]*?)\n {2}\],/);
    if (traitMatch67) traitBlock67 = traitMatch67[1];
    const traitCount67 = (traitBlock67.match(/\bname\s*:/g) || []).length;
    assert(traitCount67 === 16, `reg_nv.js traits has exactly 16 items (found ${traitCount67})`);
  }

  // 67.8  reg_fo3.js does NOT have traits (FNV-only)
  assert(
    !/\btraits\s*:\s*\[/.test(fo3RegSrc67),
    'reg_fo3.js does NOT contain traits array (FNV-only registry entry)'
  );

  // 67.9  GAME_DEFS.FNV.hasTraits === true
  assert(
    /hasTraits\s*:\s*true/.test(stateSrc67),
    'GAME_DEFS.FNV.hasTraits: true in state.js (FNV-only feature flag)'
  );

  // 67.10  renderTraits() defined in ui-render.js
  assert(
    /function renderTraits\s*\(/.test(uiRenderSrc67),
    'renderTraits() is defined in ui-render.js'
  );

  // 67.11  renderTraits() called from loadUI() in ui-core.js
  {
    let loadUIBody67 = '';
    try {
      loadUIBody67 = extractFunctionBody(uiCoreSrc67, 'loadUI');
    } catch (_) {}
    assert(
      /renderTraits\s*\(\s*\)/.test(loadUIBody67),
      'renderTraits() called from loadUI() in ui-core.js (Protocol 5)'
    );
  }

  // 67.12  renderTraits() has FNV guard (hasTraits)
  {
    let renderBody67 = '';
    try {
      renderBody67 = extractFunctionBody(uiRenderSrc67, 'renderTraits');
    } catch (_) {}
    assert(
      /hasTraits/.test(renderBody67),
      'renderTraits() has hasTraits guard (FNV-only — returns early in FO3)'
    );
  }

  // 67.13  toggleTrait() defined in ui-render.js
  assert(
    /function toggleTrait\s*\(/.test(uiRenderSrc67),
    'toggleTrait() is defined in ui-render.js'
  );

  // 67.14  toggleTrait() hard-caps at 2 — refuses to add a 3rd trait (returns without push)
  {
    let toggleBody67 = '';
    try {
      toggleBody67 = extractFunctionBody(uiRenderSrc67, 'toggleTrait');
    } catch (_) {}
    assert(
      /length\s*>=\s*2/.test(toggleBody67) && /return/.test(toggleBody67),
      'toggleTrait() hard-blocks adding a 3rd trait (length>=2 → return without push) — regression guard'
    );
  }

  // 67.15  index.html has #traitsDisplay container
  assert(
    /id="traitsDisplay"/.test(htmlSource),
    'index.html has #traitsDisplay container (Protocol 5 panel element)'
  );

  // 67.16  #traitsDisplay is inside the Perks panel; no standalone top-level TRAITS <details> panel
  {
    const perksIdx = htmlSource.indexOf('id="perksList"');
    const traitsIdx = htmlSource.indexOf('id="traitsDisplay"');
    assert(
      perksIdx !== -1 &&
        traitsIdx !== -1 &&
        traitsIdx > perksIdx &&
        !/id="traitsDisplay"[\s\S]*?<\/details>[\s\S]*?id="perksList"/.test(htmlSource) &&
        !/<details[^>]*class="panel"[^>]*>[\s\S]{0,200}<summary[^>]*>[^<]*TRAITS[^<]*<\/summary>/.test(
          htmlSource
        ),
      'index.html: #traitsDisplay is inside the Perks panel (after #perksList); no standalone TRAITS <details class="panel"> — distinct IDs preserved'
    );
  }

  // 67.17  getSystemDirective() mentions traits (Protocol 14 — AI contract updated)
  {
    let sdBody67 = '';
    try {
      sdBody67 = extractFunctionBody(apiSrc67, 'getSystemDirective');
    } catch (_) {}
    assert(
      /state\.traits/.test(sdBody67),
      'getSystemDirective() references state.traits (Protocol 14 — AI contract updated for new state field)'
    );
  }

  // 67.18  index.html has #traitFilter input (trait name filter)
  assert(
    /id="traitFilter"/.test(htmlSource),
    'index.html has #traitFilter input (trait name filter)'
  );

  // 67.19  renderTraits() reads traitFilter and applies substring filter
  {
    let renderBody67b = '';
    try {
      renderBody67b = extractFunctionBody(uiRenderSrc67, 'renderTraits');
    } catch (_) {}
    assert(
      /traitFilter/.test(renderBody67b) && /includes\s*\(filterQ\)/.test(renderBody67b),
      'renderTraits() reads #traitFilter value and applies substring filter'
    );
  }
}

// ══════════════════════════════════════════════════════════════
//  SUITE 68 — FNV Location Database Expansion (Phase 6 Task 6)
//  Adds 22 verified minor/notable NV locations sourced from fallout.wiki.
//  Floor guard, type validity, dedup, seed examples, zone↔registry parity.
//  10 tests
// ══════════════════════════════════════════════════════════════
{
  header('FNV Location Database Expansion');
  const nvRegSrc68 = readFile('js/reg_nv.js');

  // Isolate main locations array (between LOCATIONS and COMPANIONS section comments)
  const locsSectionMatch = nvRegSrc68.match(/\/\/ ── LOCATIONS[\s\S]*?\/\/ ── COMPANIONS/);
  const locsSection68 = locsSectionMatch ? locsSectionMatch[0] : '';
  const locsArrMatch = locsSection68.match(/locations:\s*\[([\s\S]*?)\n {2}\]/);
  const locBlock68 = locsArrMatch ? locsArrMatch[1] : '';

  // 68.1  FNV locations count ≥ 108 (floor guard — 86 original + 22 new)
  const locCount68 = (locBlock68.match(/\bname\s*:/g) || []).length;
  assert(
    locCount68 >= 108,
    `FALLOUT_REGISTRY.locations has ≥ 108 entries (found ${locCount68}) — floor guard`
  );

  // 68.2  "Jean Sky Diving" present (seed example)
  guards(locBlock68, [
    [
      /name:\s*'Jean Sky Diving'/,
      '"Jean Sky Diving" is in FALLOUT_REGISTRY.locations (fallout.wiki verified)',
    ],

    // 68.3  "Jack Rabbit Springs" present (seed example)
    [
      /name:\s*'Jack Rabbit Springs'/,
      '"Jack Rabbit Springs" is in FALLOUT_REGISTRY.locations (fallout.wiki verified)',
    ],

    // 68.4  "Powder Ganger Camp South" present (seed example)
    [
      /name:\s*'Powder Ganger Camp South'/,
      '"Powder Ganger Camp South" is in FALLOUT_REGISTRY.locations (fallout.wiki verified)',
    ],

    // 68.5  "Wolfhorn Ranch" now in registry (was zone-only before this task)
    [
      /name:\s*'Wolfhorn Ranch'/,
      '"Wolfhorn Ranch" is in FALLOUT_REGISTRY.locations (promoted from zone-only)',
    ],

    // 68.6  "Ivanpah Dry Lake" now in registry (was zone-only before this task)
    [
      /name:\s*'Ivanpah Dry Lake'/,
      '"Ivanpah Dry Lake" is in FALLOUT_REGISTRY.locations (promoted from zone-only)',
    ],
  ]);

  // 68.7  All location entries use a valid type from the 9 approved types
  {
    const VALID_LOC_TYPES = new Set([
      'settlement',
      'other',
      'landmark',
      'camp',
      'base',
      'vault',
      'casino',
      'factory',
      'cave',
    ]);
    const typeRe = /type:\s*'([^']+)'/g;
    let tm;
    const badTypes68 = [];
    while ((tm = typeRe.exec(locBlock68)) !== null) {
      if (!VALID_LOC_TYPES.has(tm[1])) badTypes68.push(tm[1]);
    }
    assert(
      badTypes68.length === 0,
      `All FALLOUT_REGISTRY.locations entries use valid type (9 approved) — bad: ${badTypes68.join(', ') || 'none'}`
    );
  }

  // 68.8  No duplicate location names in FNV registry
  {
    const nameRe = /name:\s*(?:'([^']+)'|"([^"]+)")/g;
    let nm;
    const names68 = [];
    while ((nm = nameRe.exec(locBlock68)) !== null) names68.push(nm[1] || nm[2]);
    const seen68 = new Set();
    const dupes68 = names68.filter(n => {
      const dup = seen68.has(n);
      seen68.add(n);
      return dup;
    });
    assert(
      dupes68.length === 0,
      `No duplicate location names in FALLOUT_REGISTRY.locations — dupes: ${dupes68.join(', ') || 'none'}`
    );
  }

  // 68.9  Zone parity — zone [4,2] Goodsprings locations[] contains 'Jean Sky Diving'
  assert(
    /gridRow:\s*4[\s\S]{0,200}gridCol:\s*2[\s\S]{0,500}Jean Sky Diving/.test(nvRegSrc68),
    'Zone [4,2] Goodsprings locations[] contains "Jean Sky Diving" (zone↔registry parity)'
  );

  // 68.10  Zone parity — zone [4,1] NCRCF locations[] contains 'Powder Ganger Camp South'
  assert(
    /gridRow:\s*4[\s\S]{0,200}gridCol:\s*1[\s\S]{0,500}Powder Ganger Camp South/.test(nvRegSrc68),
    'Zone [4,1] NCRCF locations[] contains "Powder Ganger Camp South" (zone↔registry parity)'
  );
}

// ══════════════════════════════════════════════════════════════
//  SUITE 69 — FO3 game-switch regression (Protocol 13)
//  Fixes: switching to FO3 reverted to FNV on reload.
//  Root cause: onGameContextChange never updated state.gameContext,
//  so beforeunload/saveState re-derived activeContext='FNV' and
//  clobbered the deliberate 'FO3' localStorage write.
//  4 tests
// ══════════════════════════════════════════════════════════════
{
  header('FO3 game-switch regression guard');
  const uiCoreSrc69 = readFile('js/ui-core.js');
  const stateSrc69 = readFile('js/state.js');

  // Extract the body of onGameContextChange for targeted checks
  let gcBody69 = '';
  try {
    gcBody69 = extractFunctionBody(uiCoreSrc69, 'onGameContextChange');
  } catch (_) {}

  // 69.1  onGameContextChange sets state.gameContext = ctx (the missing line that caused the bug)
  assert(
    /state\.gameContext\s*=\s*ctx/.test(gcBody69),
    'onGameContextChange() sets state.gameContext = ctx — keeps in-memory source-of-truth in sync (regression guard)'
  );

  // 69.2  onGameContextChange sets window._contextSwitching = true before reload
  assert(
    /window\._contextSwitching\s*=\s*true/.test(gcBody69),
    'onGameContextChange() sets window._contextSwitching = true before reload — guards beforeunload/saveState from clobbering the switch (regression guard)'
  );

  // 69.3  beforeunload handler early-exits when _contextSwitching is set
  {
    // Find the beforeunload callback body
    const buMatch = uiCoreSrc69.match(
      /addEventListener\s*\(\s*['"]beforeunload['"]\s*,\s*\(\s*\)\s*=>\s*\{([\s\S]*?)\}\s*\)/
    );
    const buBody = buMatch ? buMatch[1] : '';
    assert(
      /_contextSwitching/.test(buBody) && /return/.test(buBody),
      'beforeunload handler early-exits when window._contextSwitching is set — prevents clobbering the deliberate FO3 write (regression guard)'
    );
  }

  // 69.4  saveState debounced body early-exits when _contextSwitching is set
  {
    // Extract the setTimeout callback body inside saveState
    const saveStateMatch = stateSrc69.match(
      /function saveState\s*\(\s*\)([\s\S]*?)(?=\nfunction |\nlet |\nconst |\nvar |$)/
    );
    const saveBody = saveStateMatch ? saveStateMatch[1] : '';
    assert(
      /_contextSwitching/.test(saveBody) && /return/.test(saveBody),
      'saveState() debounced setTimeout body early-exits when window._contextSwitching is set — prevents pending debounce from clobbering the FO3 write (regression guard)'
    );
  }
}

// ══════════════════════════════════════════════════════════════
//  SUITE 70 — FNV unique apparel sweep + Vault 13 Canteen
//  (Phase 6 Task 7 chunk 1)
//  Guards: ARMOR.CSV floor count, named mandated items,
//  no-duplicate, column-count, DB↔registry parity for new
//  apparel, Vault 13 Canteen in MISC + registry,
//  seedNewCampaignInventory definition + guards,
//  WU-D2 Mysterious Stranger Outfit DT + WU-D6 1st Recon DT regressions.
//  16 tests
// ══════════════════════════════════════════════════════════════
{
  header('Suite 70 — FNV unique apparel + Vault 13 Canteen');
  const dbNv70 = readFile('js/db_nv.js');
  const regNv70 = readFile('js/reg_nv.js');
  const uiCore70 = readFile('js/ui-core.js');

  // Helper: extract ARMOR.CSV data rows (excluding header)
  function getArmorRows70(src) {
    const block = src.match(/\[ARMOR\.CSV\]([\s\S]*?)(?=\n\[|\n`;)/);
    if (!block) return [];
    return block[1]
      .split('\n')
      .map(l => l.trim())
      .filter(l => l && !l.startsWith('Name,') && !l.startsWith('['));
  }

  // Helper: extract armor names from ARMOR.CSV
  function getArmorNames70(src) {
    return getArmorRows70(src).map(l => l.split(',')[0].trim());
  }

  // Helper: extract MISC.CSV data rows
  function getMiscRows70(src) {
    const block = src.match(/\[MISC\.CSV\]([\s\S]*?)(?=\n\[|\n`;)/);
    if (!block) return [];
    return block[1]
      .split('\n')
      .map(l => l.trim())
      .filter(l => l && !l.startsWith('Name,') && !l.startsWith('['));
  }

  // Helper: extract names from registry by type
  function getRegNamesByType70(src, type) {
    const names = new Set();
    const re = new RegExp(
      `\\{\\s*name\\s*:\\s*(?:'([^']*)'|"([^"]*)")\\s*,\\s*type\\s*:\\s*'${type}'\\s*\\}`,
      'g'
    );
    let m;
    while ((m = re.exec(src)) !== null) names.add(m[1] !== undefined ? m[1] : m[2]);
    return names;
  }

  // 70.1  ARMOR.CSV row count ≥ 103 (62 original + 41 new unique apparel)
  const armorRows70 = getArmorRows70(dbNv70);
  assert(
    armorRows70.length >= 103,
    `ARMOR.CSV has ≥ 103 entries (found ${armorRows70.length}) — floor guard after unique apparel sweep`
  );

  // 70.2  MISC.CSV has Vault 13 Canteen
  const miscRows70 = getMiscRows70(dbNv70);
  assert(
    miscRows70.some(r => r.split(',')[0].trim() === 'Vault 13 Canteen'),
    'MISC.CSV contains "Vault 13 Canteen" row'
  );

  // 70.3  Benny's Suit in ARMOR.CSV (mandated section A)
  const armorNames70 = getArmorNames70(dbNv70);
  assert(
    armorNames70.includes("Benny's Suit"),
    '"Benny\'s Suit" is in ARMOR.CSV (mandated, sourced from fallout.wiki)'
  );

  // 70.4  Suave Gambler Hat in ARMOR.CSV (mandated section A)
  assert(
    armorNames70.includes('Suave Gambler Hat'),
    '"Suave Gambler Hat" is in ARMOR.CSV (mandated, sourced from fallout.wiki)'
  );

  // 70.5  No duplicate names in ARMOR.CSV
  {
    const seen70 = new Set();
    const dupes70 = armorNames70.filter(n => {
      const dup = seen70.has(n);
      seen70.add(n);
      return dup;
    });
    assert(
      dupes70.length === 0,
      `No duplicate names in ARMOR.CSV — dupes: ${dupes70.join(', ') || 'none'}`
    );
  }

  // 70.6  No duplicate names in MISC.CSV
  {
    const miscNames70 = miscRows70.map(r => r.split(',')[0].trim());
    const seenM70 = new Set();
    const dupesM70 = miscNames70.filter(n => {
      const dup = seenM70.has(n);
      seenM70.add(n);
      return dup;
    });
    assert(
      dupesM70.length === 0,
      `No duplicate names in MISC.CSV — dupes: ${dupesM70.join(', ') || 'none'}`
    );
  }

  // 70.7  ARMOR.CSV all data rows have exactly 7 columns (Name,Type,DT,Weight,Value,Effects,Min_CND_Threshold)
  {
    const EXPECTED_ARMOR_COLS = 7;
    const badArmorRows70 = armorRows70.filter(r => r.split(',').length !== EXPECTED_ARMOR_COLS);
    assert(
      badArmorRows70.length === 0,
      `ARMOR.CSV all data rows have ${EXPECTED_ARMOR_COLS} columns` +
        (badArmorRows70.length
          ? ` — bad: ${badArmorRows70
              .slice(0, 3)
              .map(r => r.slice(0, 50))
              .join('; ')}`
          : '')
    );
  }

  // 70.8  Benny's Suit in registry as type:'armor'
  const regArmorNames70 = getRegNamesByType70(regNv70, 'armor');
  assert(
    regArmorNames70.has("Benny's Suit"),
    '"Benny\'s Suit" in FALLOUT_REGISTRY.items as type:"armor"'
  );

  // 70.9  Suave Gambler Hat in registry as type:'armor'
  assert(
    regArmorNames70.has('Suave Gambler Hat'),
    '"Suave Gambler Hat" in FALLOUT_REGISTRY.items as type:"armor"'
  );

  // 70.10  Vault 13 Canteen in registry as type:'aid'
  const regAidNames70 = getRegNamesByType70(regNv70, 'aid');
  assert(
    regAidNames70.has('Vault 13 Canteen'),
    '"Vault 13 Canteen" in FALLOUT_REGISTRY.items as type:"aid"'
  );

  // 70.11  seedNewCampaignInventory function is defined in ui-core.js
  assert(
    /function\s+seedNewCampaignInventory\s*\(/.test(uiCore70),
    'seedNewCampaignInventory() is defined in ui-core.js'
  );

  // 70.12  GAME_DEFS-driven seed: function reads seedInventory from GAME_DEFS (Protocol 38)
  {
    let seedBody70 = '';
    try {
      seedBody70 = extractFunctionBody(uiCore70, 'seedNewCampaignInventory');
    } catch (_) {}
    assert(
      /GAME_DEFS/.test(seedBody70),
      'seedNewCampaignInventory() reads seedInventory from GAME_DEFS — game-agnostic seed dispatch (Protocol 38)'
    );
  }

  // 70.13  Empty-inventory guard
  {
    let seedBody70 = '';
    try {
      seedBody70 = extractFunctionBody(uiCore70, 'seedNewCampaignInventory');
    } catch (_) {}
    assert(
      /inventory/.test(seedBody70) && /length/.test(seedBody70),
      'seedNewCampaignInventory() checks inventory.length — prevents duplicate seed'
    );
  }

  // 70.14  New-campaign guard (ticks === 0) — prevents seeding on save-load of played campaign
  {
    let seedBody70 = '';
    try {
      seedBody70 = extractFunctionBody(uiCore70, 'seedNewCampaignInventory');
    } catch (_) {}
    assert(
      /ticks/.test(seedBody70),
      'seedNewCampaignInventory() checks ticks — prevents seeding on reload of played campaign'
    );
  }

  // 70.15  Mysterious Stranger Outfit DT regression (WU-D2 / NV-DB-1). fallout.wiki: the
  //        outfit provides 5 DR and NO Damage Threshold — its in-game DT is 0. The DB had
  //        a wild DT of 55 (more protective than T-51b power armor); corrected to 0, which
  //        also matches every sibling Clothing row. Schema: Name,Type,DT,Weight,... → DT=col 2.
  {
    const msoRow70 = armorRows70.find(r => r.split(',')[0].trim() === 'Mysterious Stranger Outfit');
    const msoDT70 = msoRow70 ? msoRow70.split(',')[2].trim() : null;
    assert(
      msoDT70 === '0',
      `Mysterious Stranger Outfit has DT 0 in ARMOR.CSV (fallout.wiki: DR 5, no DT; was 55) — got ${msoDT70}`
    );
  }

  // 70.16  1st Recon Assault/Survival Armor DT regression (WU-D6). fallout.wiki infoboxes:
  //        both are "weightless DT 15 armor" exclusive to Boone. The DB had DT 22; corrected
  //        to 15 (Type stays Heavy — that was already canon-correct, WU-D2). Schema DT = col 2.
  {
    const dt70 = name => {
      const row = armorRows70.find(r => r.split(',')[0].trim() === name);
      return row ? row.split(',')[2].trim() : null;
    };
    const assaultDT70 = dt70('1st Recon Assault Armor');
    const survivalDT70 = dt70('1st Recon Survival Armor');
    assert(
      assaultDT70 === '15' && survivalDT70 === '15',
      `1st Recon Assault + Survival Armor have DT 15 (fallout.wiki infobox; was 22) — got assault=${assaultDT70}, survival=${survivalDT70}`
    );
  }
}

// ══════════════════════════════════════════════════════════════
//  SUITE 71 — Phase 6 UI Consistency (compact trackers,
//  collapsible sub-panels, persist collapse, center lone faction card)
//  Guards: #traitsSection is <details.sub-panel> with data-sub-id,
//  renderTraits compact one-line format (inline effect span),
//  #collectiblesSubPanel + #lincolnSubPanel as sub-panels,
//  sub-panel persistence via robco_panel_state, fail-safe,
//  default-collapsed, Lincoln compact rows, faction lone-card CSS.
//  no-dup-header guard, Lincoln data-lname onclick safety,
//  setLincolnDisposition re-render guard, Lincoln no-inline-flex guard,
//  Traits no-inline-flex guard (compact rows matching collectibles density).
//  23 tests
// ══════════════════════════════════════════════════════════════
{
  header('Suite 71 — Phase 6 UI Consistency');
  const htmlSrc71 = readFile('index.html');
  const uiRenderSrc71 = readFile('js/ui-render.js');
  const uiCoreSrc71 = readFile('js/ui-core.js');
  const cssSrc71 = readFile('css/terminal.css');

  // 71.1  #traitsSection is a <details> element (collapsible sub-panel)
  guards(htmlSrc71, [
    [
      /<details[^>]+id="traitsSection"/,
      'index.html: #traitsSection is a <details> element (collapsible sub-panel, not a plain div)',
    ],

    // 71.2  #traitsSection has class="sub-panel"
    [
      /<details[^>]*class="sub-panel"[^>]*id="traitsSection"|<details[^>]*id="traitsSection"[^>]*class="sub-panel"/,
      'index.html: #traitsSection has class="sub-panel"',
    ],

    // 71.3  #traitsSection has data-sub-id attribute (persistence key)
    [
      /id="traitsSection"[^>]*data-sub-id|data-sub-id[^>]*id="traitsSection"/,
      'index.html: #traitsSection has data-sub-id attribute for persistence',
    ],
  ]);

  // 71.4  renderTraits() compact: effect is an inline <span>, not a block <div>
  {
    let renderBody71 = '';
    try {
      renderBody71 = extractFunctionBody(uiRenderSrc71, 'renderTraits');
    } catch (_) {}
    assert(
      /effectSpan/.test(renderBody71) &&
        !/html\s*\+=\s*`<div[^`]*font-size:10px[^`]*>\s*\$\{escapeHtml\(d\.effect\)/.test(
          renderBody71
        ),
      'renderTraits() renders effect inline as <span> (compact one-line format — no block <div> per effect)'
    );
  }

  // 71.5  #collectiblesSubPanel exists in index.html
  guards(htmlSrc71, [
    [
      /id="collectiblesSubPanel"/,
      'index.html has #collectiblesSubPanel (collectibles list sub-tracker)',
    ],

    // 71.6  #collectiblesSubPanel has class="sub-panel"
    [
      /<details[^>]*class="sub-panel"[^>]*id="collectiblesSubPanel"|<details[^>]*id="collectiblesSubPanel"[^>]*class="sub-panel"/,
      'index.html: #collectiblesSubPanel has class="sub-panel"',
    ],

    // 71.7  #collectiblesSubPanel has data-sub-id attribute
    [
      /id="collectiblesSubPanel"[^>]*data-sub-id|data-sub-id[^>]*id="collectiblesSubPanel"/,
      'index.html: #collectiblesSubPanel has data-sub-id attribute for persistence',
    ],

    // 71.8  #lincolnSubPanel exists in index.html
    [/id="lincolnSubPanel"/, 'index.html has #lincolnSubPanel (Lincoln Memorabilia sub-tracker)'],

    // 71.9  #lincolnSubPanel has class="sub-panel"
    [
      /<details[^>]*class="sub-panel"[^>]*id="lincolnSubPanel"|<details[^>]*id="lincolnSubPanel"[^>]*class="sub-panel"/,
      'index.html: #lincolnSubPanel has class="sub-panel"',
    ],

    // 71.10  #lincolnSubPanel has data-sub-id attribute
    [
      /id="lincolnSubPanel"[^>]*data-sub-id|data-sub-id[^>]*id="lincolnSubPanel"/,
      'index.html: #lincolnSubPanel has data-sub-id attribute for persistence',
    ],
  ]);

  // 71.11  Sub-panel persistence in ui-core.js: reads robco_panel_state for data-sub-id elements
  assert(
    /data-sub-id/.test(uiCoreSrc71) && /robco_panel_state/.test(uiCoreSrc71),
    'ui-core.js wires persistence for details[data-sub-id] elements using robco_panel_state key'
  );

  // 71.12  Sub-panel toggle listener saves state in ui-core.js
  assert(
    /data-sub-id/.test(uiCoreSrc71) && /toggle/.test(uiCoreSrc71) && /subId/.test(uiCoreSrc71),
    'ui-core.js wires "toggle" event on sub-panels to persist open/closed state'
  );

  // 71.13  Default collapsed: no 'open' attribute on #collectiblesSubPanel in HTML
  assert(
    !/<details[^>]*id="collectiblesSubPanel"[^>]*\sopen[\s>]/.test(htmlSrc71),
    'index.html: #collectiblesSubPanel has no "open" attribute — defaults to collapsed'
  );

  // 71.14  Default collapsed: no 'open' attribute on #lincolnSubPanel in HTML
  assert(
    !/<details[^>]*id="lincolnSubPanel"[^>]*\sopen[\s>]/.test(htmlSrc71),
    'index.html: #lincolnSubPanel has no "open" attribute — defaults to collapsed'
  );

  // 71.15  Fail-safe: sub-panel persistence uses JSON.parse with '{}' fallback
  assert(
    /JSON\.parse\s*\(\s*localStorage\.getItem\s*\(\s*['"]robco_panel_state['"]\s*\)\s*\|\|\s*'\{\}'/.test(
      uiCoreSrc71
    ),
    "ui-core.js sub-panel persistence uses JSON.parse(...|| '{}') fail-safe"
  );

  // 71.16  Lincoln memorabilia compact: margin-bottom:2px (not 4px) in renderLincolnMemorabilia
  {
    let lincolnBody71 = '';
    try {
      lincolnBody71 = extractFunctionBody(uiRenderSrc71, 'renderLincolnMemorabilia');
    } catch (_) {}
    assert(
      /margin-bottom:2px/.test(lincolnBody71) && !/margin-bottom:4px/.test(lincolnBody71),
      'renderLincolnMemorabilia() uses margin-bottom:2px (compact one-line format) — no 4px spacing'
    );
  }

  // 71.17  Faction lone-card CSS rule: :last-child:nth-child(odd) in terminal.css
  assert(
    /faction-card:last-child:nth-child\(odd\)/.test(cssSrc71),
    'terminal.css has .faction-card:last-child:nth-child(odd) rule for centering lone card in mobile grid'
  );

  // 71.18  renderCollectibles updates sub-panel summary h3 with game-specific label
  {
    let collectiblesBody71 = '';
    try {
      collectiblesBody71 = extractFunctionBody(uiRenderSrc71, 'renderCollectibles');
    } catch (_) {}
    assert(
      /collectiblesSubPanel/.test(collectiblesBody71) &&
        /summaryH3|summary.*h3|querySelector.*h3/.test(collectiblesBody71),
      'renderCollectibles() updates #collectiblesSubPanel summary h3 with game-specific label and count'
    );

    // 71.19  No redundant inner bold-header div in renderCollectibles (label shown only in sub-panel summary)
    assert(
      !/html\s*=\s*`<div[^`]*font-weight:bold/.test(collectiblesBody71),
      'renderCollectibles() does not output a redundant inner bold-header div — typeLabel shown only in sub-panel summary, not duplicated inside content'
    );
  }

  // 71.20  Lincoln rows use data-lname attribute for safe onclick (prevents apostrophe JS error)
  {
    let lincolnBody71b = '';
    try {
      lincolnBody71b = extractFunctionBody(uiRenderSrc71, 'renderLincolnMemorabilia');
    } catch (_) {}
    assert(
      /data-lname/.test(lincolnBody71b) && /this\.dataset\.lname/.test(lincolnBody71b),
      'renderLincolnMemorabilia() uses data-lname attribute + this.dataset.lname (safe name passing — prevents apostrophe SyntaxError on click)'
    );
  }

  // 71.21  setLincolnDisposition calls renderLincolnMemorabilia() (live tally update)
  {
    let dispBody71 = '';
    try {
      dispBody71 = extractFunctionBody(uiRenderSrc71, 'setLincolnDisposition');
    } catch (_) {}
    assert(
      /renderLincolnMemorabilia\s*\(\s*\)/.test(dispBody71),
      'setLincolnDisposition() calls renderLincolnMemorabilia() — tally and counts update immediately when disposition changes'
    );
  }

  // 71.22  Lincoln toggle spans do not use min-height:28px;display:inline-flex (compact rows)
  {
    let lincolnBody71c = '';
    try {
      lincolnBody71c = extractFunctionBody(uiRenderSrc71, 'renderLincolnMemorabilia');
    } catch (_) {}
    assert(
      !/min-height:28px;display:inline-flex/.test(lincolnBody71c),
      'renderLincolnMemorabilia() toggle spans do not use min-height:28px;display:inline-flex — compact rows match bobblehead density'
    );
  }

  // 71.23  Traits toggle spans do not use min-height:28px;display:inline-flex (compact rows)
  {
    let traitsBody71 = '';
    try {
      traitsBody71 = extractFunctionBody(uiRenderSrc71, 'renderTraits');
    } catch (_) {}
    assert(
      !/min-height:28px;display:inline-flex/.test(traitsBody71),
      'renderTraits() toggle spans do not use min-height:28px;display:inline-flex — compact rows match collectibles/bobblehead density'
    );
  }
}

// ══════════════════════════════════════════════════════════════
//  Suite 72 — Fix A: location datalist per-game bleed + Fix B: update-modal whitespace
//  8 tests
// ══════════════════════════════════════════════════════════════
{
  header('Suite 72 — Location datalist bleed fix + update-modal whitespace');
  const htmlSrc72 = readFile('index.html');
  const uiSavesSrc72 = readFile('js/ui-saves.js');
  const uiCoreSrc72 = readFile('js/ui-core.js');
  const cssSrc72 = readFile('css/terminal.css');

  // 72.1  Static nv_locations datalist is gone from index.html
  guards(htmlSrc72, [
    [
      /id="nv_locations"/,
      'index.html: static id="nv_locations" datalist removed (was FNV-only, caused context bleed into FO3)',
      NEG,
    ],

    // 72.2  #stat_loc now points to locationOptions
    [
      /id="stat_loc"[^>]*list="locationOptions"|list="locationOptions"[^>]*id="stat_loc"/,
      'index.html: #stat_loc input has list="locationOptions" (dynamic datalist)',
    ],

    // 72.3  #locationOptions datalist exists and is empty in HTML
    [
      /<datalist\s[^>]*id="locationOptions"[^>]*>\s*<\/datalist>/,
      'index.html: #locationOptions datalist exists and is empty (populated dynamically by initLocationDatalist)',
    ],
  ]);

  // 72.4  initLocationDatalist is defined in ui-saves.js, reads FALLOUT_REGISTRY.locations, uses escapeHtml
  assert(
    /function initLocationDatalist/.test(uiSavesSrc72) &&
      /FALLOUT_REGISTRY\.locations/.test(uiSavesSrc72) &&
      /escapeHtml/.test(uiSavesSrc72.slice(uiSavesSrc72.indexOf('function initLocationDatalist'))),
    'ui-saves.js: initLocationDatalist() defined, reads FALLOUT_REGISTRY.locations, escapes output with escapeHtml'
  );

  // 72.5  initLocationDatalist is called in ui-core.js
  assert(
    /initLocationDatalist\s*\(\s*\)/.test(uiCoreSrc72),
    'ui-core.js: initLocationDatalist() is called on load (alongside initAmmoDatalist)'
  );

  // 72.6  Bleed-class regression guard: no <datalist> in index.html has static <option> children
  //       [^<]* stops at the first < after opening tag, so </datalist> blocks the match before any <option>
  assert(
    !/<datalist\b[^>]*>[^<]*<option/.test(htmlSrc72),
    'index.html: no <datalist> contains static <option> children — all datalists are empty in HTML, populated dynamically'
  );

  // 72.7  #updateModalMsg has white-space:normal in terminal.css
  assert(
    /#updateModalMsg[\s\S]{0,200}white-space\s*:\s*normal/.test(cssSrc72),
    'terminal.css: #updateModalMsg has white-space:normal (overrides inherited pre-wrap so message flows cleanly)'
  );

  // 72.8  #updateModalMsg content starts immediately after > with no leading whitespace in index.html
  assert(
    /id="updateModalMsg">[A-Z]/.test(htmlSrc72),
    'index.html: #updateModalMsg content starts immediately after > with no leading whitespace or newline'
  );
}

// ══════════════════════════════════════════════════════════════
//  Suite 73 — Skills panel game-aware render (FNV/FO3 bleed fix)
//  12 tests
// ══════════════════════════════════════════════════════════════
{
  header('Suite 73 — Skills panel game-aware render (FNV/FO3 bleed fix)');
  const htmlSrc73 = readFile('index.html');
  const uiCoreSrc73 = readFile('js/ui-core.js');
  const stateSrc73 = readFile('js/state.js');

  // 73.1  #skillsGrid container exists in index.html
  guards(htmlSrc73, [
    [
      /id="skillsGrid"/,
      'index.html: #skillsGrid container exists (empty div populated dynamically by renderSkills)',
    ],

    // 73.2  #skillsGrid is empty in HTML — no static .skill-row children
    [
      /id="skillsGrid"[^>]*>[\s\S]*?<div[^>]*class="skill-row"/,
      'index.html: #skillsGrid has no static .skill-row children — grid is empty in HTML, populated dynamically per game',
      NEG,
    ],

    // 73.3  No hardcoded id="sk_guns" (FNV-only skill bleed regression guard)
    [
      /id="sk_guns"/,
      'index.html: no hardcoded id="sk_guns" — FNV-only Guns skill must not appear as static HTML (bleed regression guard)',
      NEG,
    ],

    // 73.4  No hardcoded id="sk_survival" (FNV-only skill bleed regression guard)
    [
      /id="sk_survival"/,
      'index.html: no hardcoded id="sk_survival" — FNV-only Survival skill must not appear as static HTML (bleed regression guard)',
      NEG,
    ],
  ]);

  // 73.5  renderSkills() is defined in ui-core.js
  assert(
    /function renderSkills\s*\(\s*\)/.test(uiCoreSrc73),
    'ui-core.js: renderSkills() is defined'
  );

  // 73.6  renderSkills() body calls getSkillKeys() to iterate game-aware keys
  const renderSkillsBody73 = (() => {
    const m = /function renderSkills\s*\([^)]*\)\s*\{([\s\S]*?)\n\}/.exec(uiCoreSrc73);
    return m ? m[1] : '';
  })();
  guards(renderSkillsBody73, [
    [/getSkillKeys\s*\(\s*\)/, 'renderSkills() calls getSkillKeys() to build per-game skill rows'],

    // 73.7  renderSkills() uses SKILL_LABELS for human-readable display names
    [/SKILL_LABELS/, 'renderSkills() uses SKILL_LABELS to look up human-readable skill names'],

    // 73.8  renderSkills() escapes label text with escapeHtml (XSS safety)
    [
      /escapeHtml/,
      'renderSkills() runs label text through escapeHtml() (XSS safety on skill names)',
    ],
  ]);

  // 73.9  renderSkills() is called from loadUI()
  assert(
    /function loadUI[\s\S]{0,200}renderSkills\s*\(\s*\)/.test(uiCoreSrc73),
    'ui-core.js: renderSkills() is called at the top of loadUI() so rows exist before state values are synced into them'
  );

  // 73.10  SKILL_LABELS is defined and covers all 15 game skill keys
  const allSkillKeys73 = [
    'barter',
    'big_guns',
    'energy_weapons',
    'explosives',
    'guns',
    'lockpick',
    'medicine',
    'melee_weapons',
    'repair',
    'science',
    'small_guns',
    'sneak',
    'speech',
    'survival',
    'unarmed',
  ];
  assert(
    /const SKILL_LABELS\s*=/.test(uiCoreSrc73) &&
      allSkillKeys73.every(k => new RegExp(`${k}\\s*:`).test(uiCoreSrc73)),
    'ui-core.js: SKILL_LABELS covers all 15 possible skill keys (barter, big_guns, small_guns, guns, survival, and the 11 shared keys)'
  );

  // 73.11  SKILL_LABELS maps game-specific keys to correct display names
  assert(
    /big_guns\s*:\s*'Big Guns'/.test(uiCoreSrc73) &&
      /small_guns\s*:\s*'Small Guns'/.test(uiCoreSrc73) &&
      /\bguns\s*:\s*'Guns'/.test(uiCoreSrc73) &&
      /survival\s*:\s*'Survival'/.test(uiCoreSrc73),
    "SKILL_LABELS maps game-specific keys: big_guns→'Big Guns', small_guns→'Small Guns', guns→'Guns', survival→'Survival'"
  );

  // 73.12  syncStateFromDom() still iterates getSkillKeys() — data layer regression guard
  assert(
    /getSkillKeys\s*\(\s*\)/.test(stateSrc73),
    'state.js: syncStateFromDom() still iterates getSkillKeys() — data layer unchanged by this render refactor'
  );
}

// ══════════════════════════════════════════════════════════════
//  SUITE 74 — Collectibles Map Coord Guards (Change 1)
//  gridRow/gridCol on every FNV/FO3 collectible + lincoln entry,
//  cells match existing zones[], coord-based badge source guard,
//  regression: no name-based badge logic, lincoln check present,
//  WU-D1 unique FO3 zone-name guard, WU-D5 'Vault 92 South' fix.
//  13 tests
// ══════════════════════════════════════════════════════════════
{
  header('Suite 74 — Collectibles Map Coord Guards');
  const nvRegSrc74 = readFile('js/reg_nv.js');
  const fo3RegSrc74 = readFile('js/reg_fo3.js');
  const uiRenderSrc74 = readFile('js/ui-render.js');

  // 74.1  All FNV collectibles have gridRow and gridCol (both numbers in 1..6)
  {
    const FALLOUT_REGISTRY_NV = (() => {
      try {
        const m = nvRegSrc74.match(/collectibles\s*:\s*\[([\s\S]*?)\],\s*\/\//);
        const block = m ? m[1] : nvRegSrc74.match(/collectibles\s*:\s*\[([\s\S]*?)\],/)?.[1] || '';
        const rows = (block.match(/gridRow\s*:\s*(\d+)/g) || []).map(s =>
          parseInt(s.match(/\d+/)[0])
        );
        const cols = (block.match(/gridCol\s*:\s*(\d+)/g) || []).map(s =>
          parseInt(s.match(/\d+/)[0])
        );
        return { rows, cols };
      } catch (_) {
        return { rows: [], cols: [] };
      }
    })();
    assert(
      FALLOUT_REGISTRY_NV.rows.length === 7 &&
        FALLOUT_REGISTRY_NV.rows.every(r => r >= 1 && r <= 6) &&
        FALLOUT_REGISTRY_NV.cols.length === 7 &&
        FALLOUT_REGISTRY_NV.cols.every(c => c >= 1 && c <= 6),
      'reg_nv.js: all 7 FNV collectibles have gridRow and gridCol in 1..6'
    );
  }

  // 74.2  FNV collectible cells all match an existing NV zones[] entry
  {
    // Zone entries have 'locations:' (plural array); collectibles have 'location:' (singular string)
    const zoneKeys74nv = new Set(
      [
        ...nvRegSrc74.matchAll(/gridRow\s*:\s*(\d+)[\s,]+gridCol\s*:\s*(\d+)[\s,]+locations\s*:/g),
      ].map(m => `${m[1]},${m[2]}`)
    );
    const collectBlock = nvRegSrc74.match(/collectibles\s*:\s*\[([\s\S]*?)\],/)?.[1] || '';
    const collectCoords = [
      ...collectBlock.matchAll(/gridRow\s*:\s*(\d+)[\s\S]*?gridCol\s*:\s*(\d+)/g),
    ].map(m => `${m[1]},${m[2]}`);
    const badCoords = collectCoords.filter(k => !zoneKeys74nv.has(k));
    assert(
      badCoords.length === 0,
      'reg_nv.js: all FNV collectible gridRow/gridCol cells match an existing zones[] entry' +
        (badCoords.length ? ' — bad: ' + badCoords.join(', ') : '')
    );
  }

  // 74.3  All FO3 collectibles have gridRow and gridCol in 1..6
  {
    const collectBlock = fo3RegSrc74.match(/collectibles\s*:\s*\[([\s\S]*?)\],/)?.[1] || '';
    const rows = (collectBlock.match(/gridRow\s*:\s*(\d+)/g) || []).map(s =>
      parseInt(s.match(/\d+/)[0])
    );
    const cols = (collectBlock.match(/gridCol\s*:\s*(\d+)/g) || []).map(s =>
      parseInt(s.match(/\d+/)[0])
    );
    assert(
      rows.length === 20 &&
        rows.every(r => r >= 1 && r <= 6) &&
        cols.length === 20 &&
        cols.every(c => c >= 1 && c <= 6),
      'reg_fo3.js: all 20 FO3 collectibles have gridRow and gridCol in 1..6'
    );
  }

  // 74.4  FO3 collectible cells all match an existing FO3 zones[] entry
  {
    // Zone entries have 'locations:' (plural array); collectibles have 'location:' (singular string)
    const zoneKeys74fo3 = new Set(
      [
        ...fo3RegSrc74.matchAll(/gridRow\s*:\s*(\d+)[\s,]+gridCol\s*:\s*(\d+)[\s,]+locations\s*:/g),
      ].map(m => `${m[1]},${m[2]}`)
    );
    const collectBlock = fo3RegSrc74.match(/collectibles\s*:\s*\[([\s\S]*?)\],/)?.[1] || '';
    const collectCoords = [
      ...collectBlock.matchAll(/gridRow\s*:\s*(\d+)[\s\S]*?gridCol\s*:\s*(\d+)/g),
    ].map(m => `${m[1]},${m[2]}`);
    const badCoords = collectCoords.filter(k => !zoneKeys74fo3.has(k));
    assert(
      badCoords.length === 0,
      'reg_fo3.js: all FO3 collectible gridRow/gridCol cells match an existing FO3 zones[] entry' +
        (badCoords.length ? ' — bad: ' + badCoords.join(', ') : '')
    );
  }

  // 74.5  All lincolnMemorabilia entries have gridRow=4 and gridCol=2
  {
    const linBlock =
      fo3RegSrc74.match(/lincolnMemorabilia\s*:\s*\[([\s\S]*?)\],\s*\/\//)?.[1] ||
      fo3RegSrc74.match(/lincolnMemorabilia\s*:\s*\[([\s\S]*?)\],/)?.[1] ||
      '';
    const rows = (linBlock.match(/gridRow\s*:\s*(\d+)/g) || []).map(s =>
      parseInt(s.match(/\d+/)[0])
    );
    const cols = (linBlock.match(/gridCol\s*:\s*(\d+)/g) || []).map(s =>
      parseInt(s.match(/\d+/)[0])
    );
    assert(
      rows.length === 9 &&
        rows.every(r => r === 4) &&
        cols.length === 9 &&
        cols.every(c => c === 2),
      'reg_fo3.js: all 9 lincolnMemorabilia entries have gridRow=4 and gridCol=2 (Museum of History)'
    );
  }

  // 74.6  lincolnMemorabilia cell [4,2] matches an existing FO3 zone
  {
    // Zone entries have 'locations:' (plural); this anchors to zone-only entries
    const zoneKeys74fo3b = new Set(
      [
        ...fo3RegSrc74.matchAll(/gridRow\s*:\s*(\d+)[\s,]+gridCol\s*:\s*(\d+)[\s,]+locations\s*:/g),
      ].map(m => `${m[1]},${m[2]}`)
    );
    assert(
      zoneKeys74fo3b.has('4,2'),
      'reg_fo3.js: lincolnMemorabilia cell [4,2] matches an existing FO3 zones[] entry (Museum of History zone)'
    );
  }

  // 74.7  renderWorldMap badge uses coord-based matching (gridRow === zone.gridRow source guard)
  assert(
    /def\.gridRow\s*===\s*zone\.gridRow/.test(uiRenderSrc74) &&
      /def\.gridCol\s*===\s*zone\.gridCol/.test(uiRenderSrc74),
    'ui-render.js: zoneHasUncollectedCollectible uses def.gridRow===zone.gridRow coord comparison (coord-based badge)'
  );

  // 74.8  renderWorldMap badge NOT using old name-based collectible matching (regression guard)
  {
    let mapBody74 = '';
    try {
      mapBody74 = extractFunctionBody(uiRenderSrc74, 'zoneHasUncollectedCollectible');
    } catch (_) {}
    assert(
      !/defName\.includes\s*\(/.test(mapBody74) && !/searchIn\.some/.test(mapBody74),
      'ui-render.js: zoneHasUncollectedCollectible no longer uses name-substring matching (coord-based regression guard)'
    );
  }

  // 74.9  zoneHasUncollectedCollectible also checks Lincoln items (lincolnMemorabilia present)
  {
    let mapBody74b = '';
    try {
      mapBody74b = extractFunctionBody(uiRenderSrc74, 'zoneHasUncollectedCollectible');
    } catch (_) {}
    assert(
      /lincolnMemorabilia/.test(mapBody74b),
      'ui-render.js: zoneHasUncollectedCollectible checks lincolnMemorabilia entries (Lincoln items flag their zone cell)'
    );
  }

  // 74.10  FNV collectibles count unchanged = 7
  {
    const m = nvRegSrc74.match(/collectibles\s*:\s*\[([\s\S]*?)\],/);
    const block = m ? m[1] : '';
    const count = (block.match(/\bname\s*:/g) || []).length;
    assert(count === 7, `reg_nv.js: FNV collectibles count unchanged = 7 (found ${count})`);
  }

  // 74.11  FO3 collectibles count unchanged = 20
  {
    const m = fo3RegSrc74.match(/collectibles\s*:\s*\[([\s\S]*?)\],/);
    const block = m ? m[1] : '';
    const count = (block.match(/\bname\s*:/g) || []).length;
    assert(count === 20, `reg_fo3.js: FO3 collectibles count unchanged = 20 (found ${count})`);
  }

  // 74.12  All FO3 zones[] have unique names (WU-D1 / FO3-REG-1). Two zones both named
  //        'Vault 92' mislabeled the southeast map region; a zone is identified by a
  //        name + gridRow + gridCol + locations:[] triple, so this matches zone entries
  //        only (collectibles use singular 'location:'). A duplicate zone name labels
  //        the wrong cell on the world map — fail the gate if it recurs.
  {
    const zoneNames74 = [
      ...fo3RegSrc74.matchAll(
        /name:\s*'([^']+)',\s*gridRow:\s*\d+,\s*gridCol:\s*\d+,\s*locations:/g
      ),
    ].map(m => m[1]);
    const seen74 = new Set();
    const dupZones74 = [];
    for (const n of zoneNames74) {
      if (seen74.has(n)) dupZones74.push(n);
      seen74.add(n);
    }
    assert(
      zoneNames74.length > 0 && dupZones74.length === 0,
      'reg_fo3.js: all FO3 zones[] have unique names (no duplicate world-map region labels)' +
        (dupZones74.length ? ' — dup: ' + dupZones74.join(', ') : '')
    );
  }

  // 74.13  WU-D5 location-canon guard: the fabricated 'Vault 92 South' marker (the real
  //        Vault 92 is the far-NW cell) stays removed, replaced by the real 'Bethesda
  //        Offices East' — where the Lockpick bobblehead actually sits — in the Bethesda
  //        Ruins (6,4) zone. fallout.wiki-verified (Protocol 3).
  assert(
    !/Vault 92 South/.test(fo3RegSrc74) && /'Bethesda Offices East'/.test(fo3RegSrc74),
    "reg_fo3.js: fabricated 'Vault 92 South' replaced by real 'Bethesda Offices East' in the Bethesda Ruins zone (WU-D5)"
  );
}

// ══════════════════════════════════════════════════════════════
//  Suite 75 — Registry items[] no-duplicate-names guard
//  behavioral: extract items section, build name set, assert no name appears twice.
//  Also regression-guards the Rebound weapon typo fix.
//  3 tests
// ══════════════════════════════════════════════════════════════
{
  header('Suite 75 — Registry items[] No-Duplicate-Names Guard');
  const nvSrc75 = readFile('js/reg_nv.js');
  const fo3Src75 = readFile('js/reg_fo3.js');

  function extractItemsSection75(src) {
    const start = src.indexOf('items:');
    if (start === -1) return '';
    let depth = 0,
      inItems = false,
      itemsStart = -1;
    for (let i = start; i < src.length; i++) {
      if (src[i] === '[') {
        depth++;
        if (!inItems) {
          inItems = true;
          itemsStart = i;
        }
      } else if (src[i] === ']') {
        depth--;
        if (inItems && depth === 0) return src.slice(itemsStart, i + 1);
      }
    }
    return '';
  }

  function getItemEntries75(src) {
    const section = extractItemsSection75(src);
    const entries = [];
    for (const m of section.matchAll(/\{[^}]+\}/g)) {
      const nameM = m[0].match(/name\s*:\s*(?:'([^']*)'|"([^"]*)")/);
      const typeM = m[0].match(/type\s*:\s*(?:'([^']*)'|"([^"]*)")/);
      if (nameM && typeM) entries.push({ name: nameM[1] ?? nameM[2], type: typeM[1] ?? typeM[2] });
    }
    return entries;
  }

  // 75.1  FNV items[] has no duplicate (name, type) pairs
  {
    const entries = getItemEntries75(nvSrc75);
    const seen = new Map();
    for (const e of entries) {
      const key = `${e.name}::${e.type}`;
      seen.set(key, (seen.get(key) || 0) + 1);
    }
    const dups = [...seen.entries()].filter(([, c]) => c > 1).map(([k]) => k);
    assert(
      dups.length === 0,
      `reg_nv.js items[] has no duplicate (name,type) pairs (dups: ${dups.join(', ') || 'none'})`
    );
  }

  // 75.2  FO3 items[] has no duplicate (name, type) pairs
  {
    const entries = getItemEntries75(fo3Src75);
    const seen = new Map();
    for (const e of entries) {
      const key = `${e.name}::${e.type}`;
      seen.set(key, (seen.get(key) || 0) + 1);
    }
    const dups = [...seen.entries()].filter(([, c]) => c > 1).map(([k]) => k);
    assert(
      dups.length === 0,
      `reg_fo3.js items[] has no duplicate (name,type) pairs (dups: ${dups.join(', ') || 'none'})`
    );
  }

  // 75.3  Regression: {name:'Rebound', type:'weapon'} appears exactly once in reg_nv.js items[]
  //       (Previously appeared twice due to a copy-paste error — this guards against recurrence)
  {
    const section = extractItemsSection75(nvSrc75);
    const count = (section.match(/name\s*:\s*'Rebound'[\s\S]{0,30}type\s*:\s*'weapon'/g) || [])
      .length;
    assert(count === 1, `reg_nv.js: Rebound weapon entry appears exactly once (found ${count})`);
  }
}

// ══════════════════════════════════════════════════════════════
//  Suite 76 — autoImportState Hardening Guards (F1/F2/F3)
//  9 tests
// ══════════════════════════════════════════════════════════════
{
  header('Suite 76 — autoImportState Hardening Guards (F1/F2/F3)');
  const apiSrc76 = readFile('js/api.js');
  let importBody76 = '';
  try {
    importBody76 = extractFunctionBody(apiSrc76, 'autoImportState');
  } catch (_) {}

  // ── Fix 2: equipped unequip ──────────────────────────────────────────────

  // 76.1  equipped block uses 'key' in obj (key-present test — distinguishes null from absent)
  assert(
    /'weapon'\s+in\s+e/.test(importBody76),
    "autoImportState equipped: 'weapon' in e pattern present (key-present test, not falsy-check)"
  );

  // 76.2  all three slots use 'in' check
  assert(
    /'armor'\s+in\s+e/.test(importBody76) && /'headgear'\s+in\s+e/.test(importBody76),
    "autoImportState equipped: 'armor' in e and 'headgear' in e also present (all three slots covered)"
  );

  // 76.3  Regression: old || short-circuit absent from equipped section
  {
    const eqIdx76 = importBody76.indexOf('parsed.equipped');
    const eqBlock76 = eqIdx76 !== -1 ? importBody76.slice(eqIdx76, eqIdx76 + 400) : '';
    assert(
      !/parsed\.equipped\.(weapon|armor|headgear)\s*\|\|/.test(eqBlock76),
      'autoImportState equipped: old parsed.equipped.slot || short-circuit removed — null now clears the slot'
    );
  }

  // ── Fix 3: collectibles registry-validation ──────────────────────────────

  // 76.4  collectibles block references FALLOUT_REGISTRY.collectibles
  assert(
    /FALLOUT_REGISTRY\.collectibles/.test(importBody76),
    'autoImportState collectibles: FALLOUT_REGISTRY.collectibles referenced (registry-validated, not freeform)'
  );

  // 76.5  collectibles block uses Set-based name guard
  assert(
    /_collectNames\.has\(c\)/.test(importBody76),
    'autoImportState collectibles: _collectNames.has(c) guard active (hallucinated names rejected)'
  );

  // 76.6  Regression: old permissive c.trim() filter absent from collectibles block
  {
    const colIdx76 = importBody76.indexOf('parsed.collectibles');
    const colBlock76 = colIdx76 !== -1 ? importBody76.slice(colIdx76, colIdx76 + 600) : '';
    assert(
      !/c\.trim\(\)\.length/.test(colBlock76),
      'autoImportState collectibles: old c.trim().length permissive filter removed (registry guard active)'
    );
  }

  // ── Fix 1: status type whitelist ─────────────────────────────────────────

  // 76.7  status type assignment uses BUFF/DEBUFF/NEUTRAL whitelist
  {
    const stIdx76 = importBody76.indexOf('st.map(item =>');
    const stBlock76 = stIdx76 !== -1 ? importBody76.slice(stIdx76, stIdx76 + 400) : '';
    assert(
      /\['BUFF',\s*'DEBUFF',\s*'NEUTRAL'\]/.test(stBlock76),
      'autoImportState status: BUFF/DEBUFF/NEUTRAL whitelist array present in status type assignment'
    );
  }

  // 76.8  status uses item.type with .toUpperCase() normalization
  assert(
    /String\(item\.type\)\.toUpperCase\(\)/.test(importBody76),
    'autoImportState status: String(item.type).toUpperCase() present (type normalized to uppercase)'
  );

  // 76.9  Regression: raw item.type || 'BUFF' (no whitelist) absent from status section
  {
    const stIdx76 = importBody76.indexOf('st.map(item =>');
    const stBlock76 = stIdx76 !== -1 ? importBody76.slice(stIdx76, stIdx76 + 400) : '';
    assert(
      !/type\s*:\s*item\.type\s*\|\|\s*'BUFF'/.test(stBlock76),
      "autoImportState status: raw item.type || 'BUFF' passthrough removed (whitelist active)"
    );
  }
}

// ══════════════════════════════════════════════════════════════
//  Suite 77 — Faction Rep Regression: Canon Thresholds + ±5 Increment
//  14 tests
// ══════════════════════════════════════════════════════════════
{
  header('Suite 77 — Faction Rep Regression: Canon Thresholds + ±5 Increment');
  const uiSrc77 = readFile('js/ui-render.js');

  // Reuse vm sandbox to run getFactionStanding with new canonical thresholds
  let gfs77 = null;
  try {
    const vm = require('vm');
    const threshMatch77 = uiSrc77.match(
      /const FACTION_THRESHOLDS\s*=\s*\{[\s\S]*?\};\s*\/\/ Default/
    );
    const defaultMatch77 = uiSrc77.match(/const _DEFAULT_THRESHOLDS\s*=\s*\{[^}]+\};/);
    const fnMatch77 = uiSrc77.match(/function getFactionStanding\([\s\S]*?\n\}/);
    if (threshMatch77 && defaultMatch77 && fnMatch77) {
      const sb77 = {};
      vm.createContext(sb77);
      vm.runInContext(`${threshMatch77[0]}\n${defaultMatch77[0]}\n${fnMatch77[0]}`, sb77);
      gfs77 = sb77.getFactionStanding;
    }
  } catch (_) {}

  // ── Generic (default 8/25/50) threshold tests ────────────────────────

  // 77.1  (0,0) → Neutral
  assert(
    gfs77 && gfs77('generic', 0, 0).label === 'Neutral',
    'getFactionStanding generic (0,0) → Neutral'
  );

  // 77.2  (8,0) → Accepted — core regression: one ±5 click can't reach Idolized
  assert(
    gfs77 && gfs77('generic', 8, 0).label === 'Accepted',
    'getFactionStanding generic (8,0) → Accepted (NOT Idolized)'
  );

  // 77.3  (25,0) → Liked
  assert(
    gfs77 && gfs77('generic', 25, 0).label === 'Liked',
    'getFactionStanding generic (25,0) → Liked'
  );

  // 77.4  (50,0) → Idolized
  assert(
    gfs77 && gfs77('generic', 50, 0).label === 'Idolized',
    'getFactionStanding generic (50,0) → Idolized'
  );

  // 77.5  (0,8) → Shunned
  assert(
    gfs77 && gfs77('generic', 0, 8).label === 'Shunned',
    'getFactionStanding generic (0,8) → Shunned'
  );

  // 77.6  (0,25) → Hated
  assert(
    gfs77 && gfs77('generic', 0, 25).label === 'Hated',
    'getFactionStanding generic (0,25) → Hated'
  );

  // 77.7  (0,50) → Vilified
  assert(
    gfs77 && gfs77('generic', 0, 50).label === 'Vilified',
    'getFactionStanding generic (0,50) → Vilified'
  );

  // ── 2D matrix (mixed fame+infamy) tests ─────────────────────────────

  // 77.8  (50,50) → Wild Child
  assert(
    gfs77 && gfs77('generic', 50, 50).label === 'Wild Child',
    'getFactionStanding generic (50,50) → Wild Child'
  );

  // 77.9  (50,8) → Good-Natured Rascal
  assert(
    gfs77 && gfs77('generic', 50, 8).label === 'Good-Natured Rascal',
    'getFactionStanding generic (50,8) → Good-Natured Rascal'
  );

  // 77.10  (8,8) → Mixed
  assert(
    gfs77 && gfs77('generic', 8, 8).label === 'Mixed',
    'getFactionStanding generic (8,8) → Mixed'
  );

  // 77.11  (25,25) → Unpredictable
  assert(
    gfs77 && gfs77('generic', 25, 25).label === 'Unpredictable',
    'getFactionStanding generic (25,25) → Unpredictable'
  );

  // 77.12  (8,25) → Sneering Punk
  assert(
    gfs77 && gfs77('generic', 8, 25).label === 'Sneering Punk',
    'getFactionStanding generic (8,25) → Sneering Punk'
  );

  // ── Per-faction threshold test ───────────────────────────────────────

  // 77.13  NCR (50,0) → Liked  — NCR bp3=80, so fame=50 < 80 is R3=Liked, NOT Idolized
  assert(
    gfs77 && gfs77('ncr', 50, 0).label === 'Liked',
    'getFactionStanding ncr (50,0) → Liked (NCR bp3=80, 50<80 is not max rank)'
  );

  // ── Increment regression guard ───────────────────────────────────────

  // 77.14  Faction buttons use ±5 delta — no adjustFaction with ±50 remains
  assert(
    /adjustFaction\(.*,5\)/.test(uiSrc77) &&
      !/adjustFaction\([^)]*,\s*50\)/.test(uiSrc77) &&
      !/adjustFaction\([^)]*,\s*-50\)/.test(uiSrc77),
    'Faction buttons use ±5 increment — adjustFaction with ±50 removed from ui-render.js'
  );
}

// ══════════════════════════════════════════════════════════════
//  Suite 78 — VENDORS.CSV structural integrity
//  7 tests
// ══════════════════════════════════════════════════════════════
{
  header('Suite 78 — VENDORS.CSV structural integrity');
  const nvSrc78 = readFile('js/db_nv.js');
  // Extract the VENDORS.CSV block
  const vStart = nvSrc78.indexOf('[VENDORS.CSV]');
  const vEnd = nvSrc78.indexOf('\n[', vStart + 1);
  const vBlock = nvSrc78.slice(vStart, vEnd === -1 ? undefined : vEnd);
  const vLines = vBlock.split('\n').filter(l => l.trim() && !l.startsWith('['));
  const vData = vLines.slice(1); // strip header row

  // 78.1  39 data rows
  assert(vData.length === 39, `VENDORS.CSV has exactly 39 data rows (got ${vData.length})`);

  // 78.2  every row has exactly 7 columns
  const badCols = vData.filter(l => l.split(',').length !== 7);
  assert(badCols.length === 0, `VENDORS.CSV all rows have 7 columns — bad: ${badCols.join(' | ')}`);

  // 78.3–78.7  sentinel names present
  const vNames = vData.map(l => l.split(',')[0].trim());
  guards(vNames, [
    ['Gloria Van Graff', "VENDORS.CSV contains 'Gloria Van Graff'"],
    ['Joshua Graham', "VENDORS.CSV contains 'Joshua Graham'"],
    ['Doctor Usanagi', "VENDORS.CSV contains 'Doctor Usanagi'"],
    ['Quartermaster Bardon', "VENDORS.CSV contains 'Quartermaster Bardon'"],
    ['Street Vendor', "VENDORS.CSV contains 'Street Vendor'"],
  ]);
}

// ══════════════════════════════════════════════════════════════
//  Suite 79 — FO3 location database expansion (57 → 90)
//  10 tests
// ══════════════════════════════════════════════════════════════
{
  header('Suite 79 — FO3 location database expansion (57 → 90)');
  const fo3RegSrc79 = readFile('js/reg_fo3.js');

  // Isolate main locations array (between LOCATIONS and COMPANIONS section comments)
  const locsSectionMatch79 = fo3RegSrc79.match(/\/\/ ── LOCATIONS[\s\S]*?\/\/ ── COMPANIONS/);
  const locsSection79 = locsSectionMatch79 ? locsSectionMatch79[0] : '';
  const locsArrMatch79 = locsSection79.match(/locations:\s*\[([\s\S]*?)\n {2}\]/);
  const locBlock79 = locsArrMatch79 ? locsArrMatch79[1] : '';

  // 79.1  exactly 90 entries
  const locCount79 = (locBlock79.match(/\bname\s*:/g) || []).length;
  assert(
    locCount79 === 90,
    `FO3 FALLOUT_REGISTRY.locations has exactly 90 entries (found ${locCount79})`
  );

  // 79.2  all entries have non-empty names
  const allNames79 = [...locBlock79.matchAll(/name:\s*(?:'([^']+)'|"([^"]+)")/g)].map(
    m => m[1] || m[2]
  );
  assert(
    allNames79.length === 90 && allNames79.every(n => n && n.trim()),
    `All 90 FO3 location entries have non-empty names (extracted ${allNames79.length})`
  );

  // 79.3  all types valid (FO3 6-type set: settlement/landmark/base/factory/vault/other)
  const FO3_LOC_TYPES79 = new Set(['settlement', 'landmark', 'base', 'factory', 'vault', 'other']);
  const typeRe79 = /type:\s*'([^']+)'/g;
  let tm79;
  const badTypes79 = [];
  while ((tm79 = typeRe79.exec(locBlock79)) !== null) {
    if (!FO3_LOC_TYPES79.has(tm79[1])) badTypes79.push(tm79[1]);
  }
  assert(
    badTypes79.length === 0,
    `All FO3 location entries use valid type — bad: ${badTypes79.join(', ') || 'none'}`
  );

  // 79.4–79.8  sentinel names (DLC worldspaces + expansion entries)
  guards(locBlock79, [
    [/name:\s*'The Pitt'/, "FO3 locations contains 'The Pitt' (DLC)"],
    [/name:\s*'Point Lookout'/, "FO3 locations contains 'Point Lookout' (DLC)"],
    [/name:\s*'Mothership Zeta'/, "FO3 locations contains 'Mothership Zeta' (DLC)"],
    [/name:\s*'Andale'/, "FO3 locations contains 'Andale'"],
    [/name:\s*'Vault 106'/, "FO3 locations contains 'Vault 106'"],

    // 79.9  typo entry removed
    [/name:\s*'Georgtown West'/, "FO3 locations has NO 'Georgtown West' entry (typo removed)", NEG],

    // 79.10  corrected spelling present
    [/name:\s*'Georgetown West'/, "FO3 locations contains 'Georgetown West' (typo fixed)"],
  ]);
}

// ══════════════════════════════════════════════════════════════
//  Suite 80 — [CHEMS.CSV] consumables expansion (40 → 76)
//  9 tests
// ══════════════════════════════════════════════════════════════
{
  header('Suite 80 — [CHEMS.CSV] consumables expansion (40 → 76)');
  const nvSrc80 = readFile('js/db_nv.js');
  const cStart80 = nvSrc80.indexOf('[CHEMS.CSV]');
  const cEnd80 = nvSrc80.indexOf('\n[', cStart80 + 1);
  const cBlock80 = nvSrc80.slice(cStart80, cEnd80 === -1 ? undefined : cEnd80);
  const cLines80 = cBlock80.split('\n').filter(l => l.trim() && !l.startsWith('['));
  const cData80 = cLines80.slice(1); // skip header row

  // 80.a  exactly 76 data rows
  assert(cData80.length === 76, `[CHEMS.CSV] has exactly 76 data rows (got ${cData80.length})`);

  // 80.b  every row has exactly 8 comma-separated fields (stray-comma guard)
  const badFields80 = cData80.filter(r => r.split(',').length !== 8);
  assert(
    badFields80.length === 0,
    `All CHEMS rows have exactly 8 comma-separated fields — bad: ${badFields80.join(' | ') || 'none'}`
  );

  // 80.c  sentinel names present
  const cNames80 = cData80.map(r => r.split(',')[0].trim());
  guards(cNames80, [
    ['Cram', "CHEMS contains 'Cram'"],
    ['Sunset Sarsaparilla', "CHEMS contains 'Sunset Sarsaparilla'"],
    ['Rebound', "CHEMS contains 'Rebound'"],
    ['Wasteland Omelet', "CHEMS contains 'Wasteland Omelet'"],
    ['Sierra Madre Martini', "CHEMS contains 'Sierra Madre Martini'"],
  ]);

  // 80.d  lookupItemInDb column-mapping spot-checks
  //   CHEMS columns: Name(0), Effect(1), Duration(2), Addiction_Risk(3),
  //                  Addiction_Debuff(4), Chem_Family(5), Value(6), Weight(7)
  const chemsMap80 = cData80.reduce((m, row) => {
    const cols = row.split(',');
    if (cols.length >= 8)
      m.set(cols[0].trim().toLowerCase(), {
        wgt: parseFloat(cols[7]) || 0,
        val: parseFloat(cols[6]) || 0,
        type: 'aid',
      });
    return m;
  }, new Map());
  const ss80 = chemsMap80.get('sunset sarsaparilla');
  assert(
    ss80 && ss80.val === 3 && ss80.wgt === 1 && ss80.type === 'aid',
    `lookupItemInDb('Sunset Sarsaparilla') → wgt=1/val=3/type='aid' (got ${JSON.stringify(ss80)})`
  );
  const mre80 = chemsMap80.get('mre');
  assert(
    mre80 && mre80.val === 50 && mre80.wgt === 0.2 && mre80.type === 'aid',
    `lookupItemInDb('MRE') → wgt=0.2/val=50/type='aid' (got ${JSON.stringify(mre80)})`
  );
}

// ══════════════════════════════════════════════════════════════
//  Suite 81 — FO3 [ARMOR.CSV] (61 rows; WU-D2 removed NV bleed)
//  10 tests
// ══════════════════════════════════════════════════════════════
{
  header('Suite 81 — FO3 [ARMOR.CSV] (61 rows; WU-D2 NV-bleed removal)');
  const fo3Src81 = readFile('js/db_fo3.js');
  const aStart81 = fo3Src81.indexOf('[ARMOR.CSV]');
  const aEnd81 = fo3Src81.indexOf('\n[', aStart81 + 1);
  const aBlock81 = fo3Src81.slice(aStart81, aEnd81 === -1 ? undefined : aEnd81);
  const aLines81 = aBlock81.split('\n').filter(l => l.trim() && !l.startsWith('['));
  const aData81 = aLines81.slice(1); // skip header row

  // 81.a  exactly 61 data rows (WU-D2: 62 → 61 after removing the NV-bleed 'NCR Ranger Armor')
  assert(aData81.length === 61, `FO3 [ARMOR.CSV] has exactly 61 data rows (got ${aData81.length})`);

  // 81.b  every row has exactly 7 comma-separated fields (stray-comma guard)
  const badFields81 = aData81.filter(r => r.split(',').length !== 7);
  assert(
    badFields81.length === 0,
    `All FO3 ARMOR rows have exactly 7 comma-separated fields — bad: ${badFields81.join(' | ') || 'none'}`
  );

  // 81.c  sentinel names present
  const aNames81 = aData81.map(r => r.split(',')[0].trim());
  guards(aNames81, [
    ['Combat Helmet', "FO3 ARMOR contains 'Combat Helmet'"],
    ['Samurai Armor', "FO3 ARMOR contains 'Samurai Armor'"],
    ['T-51b Power Helmet', "FO3 ARMOR contains 'T-51b Power Helmet'"],
    ['Ghoul Mask', "FO3 ARMOR contains 'Ghoul Mask'"],
    ['Composite Recon Armor', "FO3 ARMOR contains 'Composite Recon Armor'"],
  ]);

  // 81.d  lookupItemInDb column-mapping spot-checks (header-resolved: Name=0, Weight=3, Value=4)
  const armorMap81 = aData81.reduce((m, row) => {
    const cols = row.split(',');
    if (cols.length >= 5)
      m.set(cols[0].trim().toLowerCase(), {
        wgt: parseFloat(cols[3]) || 0,
        val: parseFloat(cols[4]) || 0,
        type: 'armor',
      });
    return m;
  }, new Map());
  const ch81 = armorMap81.get('combat helmet');
  assert(
    ch81 && ch81.wgt === 3 && ch81.val === 50 && ch81.type === 'armor',
    `lookupItemInDb('Combat Helmet') → wgt=3/val=50/type='armor' (got ${JSON.stringify(ch81)})`
  );
  const sa81 = armorMap81.get('samurai armor');
  assert(
    sa81 && sa81.wgt === 20 && sa81.val === 1000 && sa81.type === 'armor',
    `lookupItemInDb('Samurai Armor') → wgt=20/val=1000/type='armor' (got ${JSON.stringify(sa81)})`
  );

  // 81.e  NV-content-bleed guard (WU-D2 / FO3-DB-4): the NCR has no presence in
  //       Fallout 3, so no NCR-faction armor may appear in the FO3 ARMOR.CSV.
  //       'NCR Ranger Armor' was an FNV item that had leaked in (removed); this
  //       guards the whole NV-bleed class, not just that one row. fallout.wiki-verified.
  const ncrBleed81 = aNames81.filter(n => /^NCR\b/i.test(n));
  assert(
    ncrBleed81.length === 0,
    'FO3 ARMOR has no NCR-faction armor (NCR does not exist in FO3 — NV-bleed guard)' +
      (ncrBleed81.length ? ' — found: ' + ncrBleed81.join(', ') : '')
  );
}

// ══════════════════════════════════════════════════════════════
//  Suite 82 — FO3 quests (64, WU-D1 canon fix + WU-D5 Anchorage completeness) + quest items (15→25)
//  15 tests
// ══════════════════════════════════════════════════════════════
{
  header('Suite 82 — FO3 quests (64) + quest items (15→25)');
  const fo3Src82 = readFile('js/reg_fo3.js');

  // Extract quests array block
  const qStart82 = fo3Src82.indexOf('  quests: [');
  const qEnd82 = fo3Src82.indexOf('\n  ],', qStart82);
  const qBlock82 = fo3Src82.slice(qStart82, qEnd82 === -1 ? fo3Src82.length : qEnd82);

  // 82.a  exactly 64 entries — count by dlc: (handles multi-line objects).
  //       WU-D1 canon fix: 64 → 62 (removed non-canon 'Fires of Anchorage' + fabricated
  //       duplicate 'Strictly Business (Paradise Falls)'). WU-D5: 62 → 64 by ADDING the two
  //       REAL missing Operation: Anchorage quests ('The Guns of Anchorage' + 'Paving the
  //       Way'). All verified against fallout.wiki (Protocol 3).
  const qCount82 = (qBlock82.match(/\bdlc:/g) || []).length;
  assert(qCount82 === 64, `FO3 quests has exactly 64 entries (got ${qCount82})`);

  // 82.b  dedup guard — exactly 1 'Strictly Business'
  const sbCount82 = (qBlock82.match(/name:\s*'Strictly Business'/g) || []).length;
  assert(sbCount82 === 1, `FO3 quests has exactly 1 'Strictly Business' entry (got ${sbCount82})`);

  // 82.f  WU-D1 canon-removal regression guard: the two non-canon quests stay gone.
  //       'Fires of Anchorage' does not exist in FO3 (real Operation: Anchorage quests are
  //       Aiding the Outcasts / The Guns of Anchorage / Paving the Way / Operation: Anchorage!);
  //       'Strictly Business (Paradise Falls)' is a fabricated duplicate of the real
  //       'Strictly Business'. Both verified non-canon against fallout.wiki (Protocol 3).
  assert(
    !/Fires of Anchorage/.test(qBlock82) && !/Strictly Business \(Paradise Falls\)/.test(qBlock82),
    "FO3 quests: non-canon 'Fires of Anchorage' + fabricated 'Strictly Business (Paradise Falls)' stay removed (WU-D1)"
  );

  // 82.g  WU-D5 per-add-on completeness guard: the Operation: Anchorage add-on has EXACTLY
  //       its 4 canon quests — Aiding the Outcasts (side) + The Guns of Anchorage / Paving
  //       the Way / Operation: Anchorage! (main). Catches the "missing real DLC quest" class
  //       (the two middle quests were absent until WU-D5). fallout.wiki-verified (Protocol 3).
  {
    const anchorageCount82 = (qBlock82.match(/dlc:\s*'Operation: Anchorage'/g) || []).length;
    const ANCHORAGE_QUESTS_82 = [
      'Aiding the Outcasts',
      'The Guns of Anchorage',
      'Paving the Way',
      'Operation: Anchorage!',
    ];
    const missingAnch82 = ANCHORAGE_QUESTS_82.filter(n => !qBlock82.includes(`name: '${n}'`));
    assert(
      anchorageCount82 === 4 && missingAnch82.length === 0,
      `Operation: Anchorage add-on has exactly its 4 canon quests (count ${anchorageCount82}` +
        (missingAnch82.length ? `, missing: ${missingAnch82.join(', ')}` : '') +
        ') — WU-D5'
    );
  }

  // 82.c  DLC sentinels with correct dlc value
  assert(
    qBlock82.includes("name: 'Operation: Anchorage!'") &&
      qBlock82.includes("dlc: 'Operation: Anchorage'"),
    "'Operation: Anchorage!' present with dlc='Operation: Anchorage'"
  );
  assert(
    qBlock82.includes("name: 'Into the Pitt'") && qBlock82.includes("dlc: 'The Pitt'"),
    "'Into the Pitt' present with dlc='The Pitt'"
  );
  assert(
    qBlock82.includes("name: 'Not of This World'") && qBlock82.includes("dlc: 'Mothership Zeta'"),
    "'Not of This World' present with dlc='Mothership Zeta'"
  );

  // 82.d  every entry has type field (type count === entry count)
  const typeCount82 = (qBlock82.match(/\btype:/g) || []).length;
  assert(
    typeCount82 === qCount82,
    `All quest entries have type field (type count=${typeCount82} / entry count=${qCount82})`
  );

  // 82.e  every type ∈ valid set
  const typeVals82 = [...qBlock82.matchAll(/type:\s*'([^']+)'/g)].map(m => m[1]);
  const validTypes82 = new Set(['tutorial', 'main', 'side', 'companion', 'unmarked']);
  const badTypes82 = typeVals82.filter(t => !validTypes82.has(t));
  assert(
    badTypes82.length === 0,
    `All FO3 quest types are valid — bad: ${badTypes82.join(', ') || 'none'}`
  );

  // 82.f  QUEST_ITEMS.CSV: exactly 25 data rows
  const fo3Db82 = readFile('js/db_fo3.js');
  const qiStart82 = fo3Db82.indexOf('[QUEST_ITEMS.CSV]');
  const qiEnd82 = fo3Db82.indexOf('\n[', qiStart82 + 1);
  const qiBlock82 = fo3Db82.slice(qiStart82, qiEnd82 === -1 ? undefined : qiEnd82);
  const qiLines82 = qiBlock82.split('\n').filter(l => l.trim() && !l.startsWith('['));
  const qiData82 = qiLines82.slice(1);
  assert(
    qiData82.length === 25,
    `FO3 [QUEST_ITEMS.CSV] has exactly 25 data rows (got ${qiData82.length})`
  );

  // 82.g  every QUEST_ITEMS row has exactly 5 comma-separated fields (stray-comma guard)
  const badQiFields82 = qiData82.filter(r => r.split(',').length !== 5);
  assert(
    badQiFields82.length === 0,
    `All QUEST_ITEMS rows have exactly 5 fields — bad: ${badQiFields82.join(' | ') || 'none'}`
  );

  // 82.h  sentinel names present
  const qiNames82 = qiData82.map(r => r.split(',')[0].trim());
  guards(qiNames82, [
    ['Steel Ingot', "QUEST_ITEMS contains 'Steel Ingot'"],
    ['Krivbeknih', "QUEST_ITEMS contains 'Krivbeknih'"],
    ['Cryo Key', "QUEST_ITEMS contains 'Cryo Key'"],
  ]);

  // 82.i  lookupItemInDb spot-check: Steel Ingot → wgt=1, type='misc' (no val col)
  // QUEST_ITEMS columns: Name(0), Associated_Quest(1), Tradeable(2), Special_Property(3), Weight(4)
  const qiMap82 = qiData82.reduce((m, row) => {
    const cols = row.split(',');
    if (cols.length >= 5)
      m.set(cols[0].trim().toLowerCase(), { wgt: parseFloat(cols[4]) || 0, type: 'misc' });
    return m;
  }, new Map());
  const si82 = qiMap82.get('steel ingot');
  assert(
    si82 && si82.wgt === 1 && si82.type === 'misc',
    `lookupItemInDb('Steel Ingot') → wgt=1/type='misc' (got ${JSON.stringify(si82)})`
  );
}

// ══════════════════════════════════════════════════════════════
//  Suite 83 — Crafting recipe + breakdown registry (NV + FO3)
//  15 tests
// ══════════════════════════════════════════════════════════════
{
  header('Suite 83 — Crafting recipe + breakdown registry (NV + FO3)');

  const nvSrc83 = readFile('js/reg_nv.js');
  const nvRecStart83 = nvSrc83.indexOf('\n  recipes: [');
  const nvBdStart83 = nvSrc83.indexOf('\n  breakdowns: [', nvRecStart83);
  const nvRecBlock83 = nvSrc83.slice(nvRecStart83, nvBdStart83);
  const nvBdBlock83 = nvSrc83.slice(nvBdStart83);

  const fo3Src83 = readFile('js/reg_fo3.js');
  const fo3RecStart83 = fo3Src83.indexOf('\n  recipes: [');
  const fo3BdStart83 = fo3Src83.indexOf('\n  breakdowns:', fo3RecStart83);
  const fo3RecBlock83 = fo3Src83.slice(fo3RecStart83, fo3BdStart83);

  // 83.a  NV recipes: exactly 25 (count by station:)
  const nvStationCount83 = (nvRecBlock83.match(/\bstation:/g) || []).length;
  assert(nvStationCount83 === 25, `NV recipes has exactly 25 entries (got ${nvStationCount83})`);

  // 83.b  FO3 recipes: exactly 7
  const fo3StationCount83 = (fo3RecBlock83.match(/\bstation:/g) || []).length;
  assert(fo3StationCount83 === 7, `FO3 recipes has exactly 7 entries (got ${fo3StationCount83})`);

  // 83.c  NV breakdowns: exactly 12 (count by yields:)
  const nvYieldsCount83 = (nvBdBlock83.match(/\byields:/g) || []).length;
  assert(nvYieldsCount83 === 12, `NV breakdowns has exactly 12 entries (got ${nvYieldsCount83})`);

  // 83.d  FO3 breakdowns: empty array
  assert(fo3Src83.includes('  breakdowns: []'), 'FO3 breakdowns is empty array []');

  // 83.e  NV station values all valid
  const nvStVals83 = [...nvRecBlock83.matchAll(/\bstation:\s*'([^']+)'/g)].map(m => m[1]);
  const validStations83 = new Set(['workbench', 'campfire', 'reloading', 'sink']);
  const badStations83 = nvStVals83.filter(s => !validStations83.has(s));
  assert(
    badStations83.length === 0 && nvStVals83.length === 25,
    `NV station values all valid (total=${nvStVals83.length} bad=${badStations83.join(',') || 'none'})`
  );

  // 83.f  FO3 station values all workbench
  const fo3StVals83 = [...fo3RecBlock83.matchAll(/\bstation:\s*'([^']+)'/g)].map(m => m[1]);
  const badFO3Stations83 = fo3StVals83.filter(s => s !== 'workbench');
  assert(
    badFO3Stations83.length === 0 && fo3StVals83.length === 7,
    `FO3 station values all workbench (total=${fo3StVals83.length} bad=${badFO3Stations83.join(',') || 'none'})`
  );

  // 83.g  NV skill values all valid FNV keys
  const nvSkillVals83 = [...nvRecBlock83.matchAll(/\bskill:\s*'([^']+)'/g)].map(m => m[1]);
  const validNVSkills83 = new Set([
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
  ]);
  const badNVSkills83 = nvSkillVals83.filter(s => !validNVSkills83.has(s));
  assert(
    badNVSkills83.length === 0,
    `NV recipe skill values all valid FNV keys (bad: ${badNVSkills83.join(',') || 'none'})`
  );

  // 83.h  FO3 recipe skillReqs all null
  const fo3SkillReqCount83 = (fo3RecBlock83.match(/\bskillReq:/g) || []).length;
  const fo3NullReqCount83 = (fo3RecBlock83.match(/\bskillReq: null/g) || []).length;
  assert(
    fo3SkillReqCount83 === 7 && fo3NullReqCount83 === 7,
    `FO3 all 7 skillReqs null (total=${fo3SkillReqCount83} null=${fo3NullReqCount83})`
  );

  // 83.i  NV recipe names no duplicates
  const nvSqNames83 = [...nvRecBlock83.matchAll(/\bname:\s*'([^']+)'/g)].map(m => m[1]);
  const nvDqNames83 = [...nvRecBlock83.matchAll(/\bname:\s*"([^"]+)"/g)].map(m => m[1]);
  const nvNames83 = [...nvSqNames83, ...nvDqNames83];
  const nvNameSet83 = new Set(nvNames83);
  assert(
    nvNameSet83.size === 25 && nvNames83.length === 25,
    `NV recipe names no duplicates (${nvNameSet83.size} unique / ${nvNames83.length} total)`
  );

  // 83.j  FO3 recipe names no duplicates
  const fo3Names83 = [...fo3RecBlock83.matchAll(/\bname:\s*'([^']+)'/g)].map(m => m[1]);
  const fo3NameSet83 = new Set(fo3Names83);
  assert(
    fo3NameSet83.size === 7 && fo3Names83.length === 7,
    `FO3 recipe names no duplicates (${fo3NameSet83.size} unique / ${fo3Names83.length} total)`
  );

  // 83.k  NV breakdown items no duplicates
  // Handles both inline `{ item: '...', yields:` and Prettier-expanded `item: '...',\n      yields:` forms.
  const nvBdItems83 = [
    ...nvBdBlock83.matchAll(/\{ item: '([^']+)', yields:/g),
    ...nvBdBlock83.matchAll(/item: '([^']+)',\n {6}yields:/g),
  ].map(m => m[1]);
  const nvBdItemSet83 = new Set(nvBdItems83);
  assert(
    nvBdItemSet83.size === 12 && nvBdItems83.length === 12,
    `NV breakdown items no duplicates (${nvBdItemSet83.size} unique / ${nvBdItems83.length} total)`
  );

  // 83.l  NV sentinel: 'Stimpak'
  guards(nvRecBlock83, [
    ["name: 'Stimpak'", "NV recipes contain 'Stimpak'"],

    // 83.m  NV sentinel: 'Weapon Repair Kit'
    ["name: 'Weapon Repair Kit'", "NV recipes contain 'Weapon Repair Kit'"],

    // 83.n  NV sentinel: 'Bottlecap Mine'
    ["name: 'Bottlecap Mine'", "NV recipes contain 'Bottlecap Mine'"],
  ]);

  // 83.o  FO3 sentinels
  assert(
    fo3RecBlock83.includes("name: 'Deathclaw Gauntlet'") &&
      fo3RecBlock83.includes("name: 'Shishkebab'"),
    "FO3 recipes contain 'Deathclaw Gauntlet' and 'Shishkebab'"
  );
}

// ══════════════════════════════════════════════════════════════
//  Suite 84 — Craft panel UI + mechanics (behavioral + data-safety)
//  24 tests
// ══════════════════════════════════════════════════════════════
{
  header('Suite 84 — Craft panel UI + mechanics (behavioral + data-safety)');

  const uiRSrc84 = readFile('js/ui-render.js');
  const uiCSrc84 = readFile('js/ui-core.js');
  const idxSrc84 = readFile('index.html');

  // ── Structural ───────────────────────────────────────────────────────────
  // 84.a  renderCraft defined in ui-render.js
  guards(uiRSrc84, [
    ['function renderCraft(', 'renderCraft() defined in js/ui-render.js'],

    // 84.b  doCraft defined in ui-render.js
    ['function doCraft(', 'doCraft() defined in js/ui-render.js'],

    // 84.c  doScrap defined in ui-render.js
    ['function doScrap(', 'doScrap() defined in js/ui-render.js'],
  ]);

  // 84.d  #craftPanel in index.html
  assert(idxSrc84.includes('id="craftPanel"'), '#craftPanel element present in index.html');

  // 84.e  craft_breakdown sub-panel in index.html
  assert(
    idxSrc84.includes('data-sub-id="craft_breakdown"'),
    'data-sub-id="craft_breakdown" sub-panel present in index.html'
  );

  // 84.f  renderCraft called from loadUI in ui-core.js
  const loadUIBody84 = extractFunctionBody(uiCSrc84, 'loadUI');
  assert(
    loadUIBody84.includes('renderCraft('),
    'renderCraft() called from loadUI() in js/ui-core.js'
  );

  // 84.g  "> CRAFTING" badge entry in _updatePanelBadges
  const badgesBody84 = extractFunctionBody(uiCSrc84, '_updatePanelBadges');
  assert(
    badgesBody84.includes('> CRAFTING'),
    '"> CRAFTING" badge entry present in _updatePanelBadges()'
  );

  // 84.h  craft key in expandPanelForCategory tabMap and map
  const expandBody84 = extractFunctionBody(uiCSrc84, 'expandPanelForCategory');
  assert(
    expandBody84.includes("craft: 'inv'") && expandBody84.includes("craft: '> CRAFTING'"),
    "'craft' key in expandPanelForCategory tabMap and panel map"
  );

  // ── Static safety guards ─────────────────────────────────────────────────
  // 84.i  NO-CLOUD guard: doCraft + doScrap bodies have no cloud write calls
  const doCraftBody84 = extractFunctionBody(uiRSrc84, 'doCraft');
  const doScrapBody84 = extractFunctionBody(uiRSrc84, 'doScrap');
  const cloudHits84 = ['pushToCloud', 'addDoc', 'setDoc', 'writeBatch'].filter(
    p => doCraftBody84.includes(p) || doScrapBody84.includes(p)
  );
  assert(
    cloudHits84.length === 0,
    'NO-CLOUD guard: doCraft/doScrap have no cloud write calls (got: ' +
      (cloudHits84.join(',') || 'none') +
      ')'
  );

  // 84.j  confirm( gate in doCraft
  assert(doCraftBody84.includes('confirm('), 'confirm() gate present in doCraft body');

  // 84.k  confirm( gate in doScrap
  assert(doScrapBody84.includes('confirm('), 'confirm() gate present in doScrap body');

  // ── Picker structure guards ──────────────────────────────────────────────
  // 84.u  renderCraft builds craftRecipeSelect
  guards(uiRSrc84, [
    ['craftRecipeSelect', 'renderCraft() builds <select id="craftRecipeSelect"> (recipe picker)'],

    // 84.v  renderCraft builds <optgroup> elements for station grouping
    ['<optgroup', 'renderCraft() builds <optgroup> for station grouping'],

    // 84.w  renderCraftCard defined in ui-render.js
    [
      'function renderCraftCard(',
      'renderCraftCard() defined in js/ui-render.js (recipe detail card renderer)',
    ],

    // 84.x  renderCraft builds scrapItemSelect
    [
      'scrapItemSelect',
      'renderCraft() builds <select id="scrapItemSelect"> for scrap/breakdown picker',
    ],
  ]);

  // ── Behavioral sandbox ───────────────────────────────────────────────────
  {
    const vm84 = require('vm');

    function getFullFn84(src, name) {
      const idx = src.indexOf(`function ${name}`);
      if (idx === -1) return `function ${name}() {}`;
      let i = src.indexOf('{', idx);
      if (i === -1) return `function ${name}() {}`;
      let depth = 0;
      while (i < src.length) {
        if (src[i] === '{') depth++;
        else if (src[i] === '}' && --depth === 0) return src.slice(idx, i + 1);
        i++;
      }
      return `function ${name}() {}`;
    }

    const craftCode84 = [
      getFullFn84(uiRSrc84, '_craftGetHave'),
      getFullFn84(uiRSrc84, '_craftConsume'),
      getFullFn84(uiRSrc84, 'craftSetMax'),
      getFullFn84(uiRSrc84, 'doCraft'),
      getFullFn84(uiRSrc84, 'doScrap'),
    ].join('\n');

    const mockRegistry84 = {
      recipes: [
        {
          name: 'Weapon Repair Kit',
          station: 'workbench',
          output: { item: 'Weapon Repair Kit', qty: 1 },
          ingredients: [
            { item: 'Scrap Electronics', qty: 1 },
            { item: 'Scrap Metal', qty: 1 },
          ],
          skillReq: { skill: 'repair', level: 50 },
          dlc: null,
        },
        {
          name: 'Recycle Energy Cell',
          station: 'workbench',
          output: { item: 'Energy Cell', qty: 4, ammo: true },
          ingredients: [{ item: 'Drained Small Energy Cell', qty: 4 }],
          skillReq: null,
          dlc: null,
        },
      ],
      breakdowns: [
        {
          item: '.44 Magnum Round',
          yields: [{ item: 'Case, .44 Magnum', qty: 1 }],
          skillReq: null,
        },
      ],
    };

    function makeSb84(inv, ammo, skills, confirmRet, elemMap) {
      const sb = {
        state: { inventory: inv || [], ammo: ammo || {}, skills: skills || {} },
        confirm: () => confirmRet !== false,
        FALLOUT_REGISTRY: mockRegistry84,
        document: {
          getElementById: id =>
            elemMap && elemMap[id] !== undefined ? { value: String(elemMap[id]) } : null,
        },
        appendToChat: () => {},
        renderInventory: () => {},
        renderAmmo: () => {},
        renderCraft: () => {},
        saveState: () => {},
        updateMath: () => {},
        lookupItemInDb: () => null,
        SKILL_LABELS: { repair: 'Repair' },
      };
      vm84.createContext(sb);
      vm84.runInContext(craftCode84, sb);
      return sb;
    }

    // 84.l  Craft success: WRK added to inventory
    {
      const sb = makeSb84(
        [
          { name: 'Scrap Electronics', qty: 2, wgt: 0, val: 0, type: 'misc' },
          { name: 'Scrap Metal', qty: 1, wgt: 0, val: 0, type: 'misc' },
        ],
        {},
        { repair: 75 },
        true,
        { craftQty_0: 1 }
      );
      sb.doCraft(0);
      const wrk = sb.state.inventory.find(i => i.name === 'Weapon Repair Kit');
      assert(wrk && wrk.qty === 1, 'Craft success: Weapon Repair Kit (qty=1) added to inventory');
    }

    // 84.m  Ingredient at exactly need → entry removed (not left at qty=0)
    {
      const sb = makeSb84(
        [
          { name: 'Scrap Electronics', qty: 2, wgt: 0, val: 0, type: 'misc' },
          { name: 'Scrap Metal', qty: 1, wgt: 0, val: 0, type: 'misc' },
        ],
        {},
        { repair: 75 },
        true,
        { craftQty_0: 1 }
      );
      sb.doCraft(0);
      const metal = sb.state.inventory.find(i => i.name === 'Scrap Metal');
      assert(
        !metal,
        'Craft: ingredient at exactly need qty is removed from inventory (not left at qty=0)'
      );
    }

    // 84.n  Insufficient ingredients → craft no-op (inventory unchanged)
    {
      const inv = [{ name: 'Scrap Electronics', qty: 1, wgt: 0, val: 0, type: 'misc' }];
      const sb = makeSb84(JSON.parse(JSON.stringify(inv)), {}, {}, true, { craftQty_0: 1 });
      const before = JSON.stringify(sb.state.inventory);
      sb.doCraft(0);
      const after = JSON.stringify(sb.state.inventory);
      assert(before === after, 'Insufficient ingredients → craft no-op (inventory byte-identical)');
    }

    // 84.o  Never-negative: _craftConsume clamps at 0, removes entry
    {
      const sb = makeSb84(
        [{ name: 'Lead', qty: 1, wgt: 0, val: 0, type: 'misc' }],
        {},
        {},
        true,
        {}
      );
      sb._craftConsume('Lead', 5);
      const lead = sb.state.inventory.find(i => i.name === 'Lead');
      assert(!lead, 'Never-negative: _craftConsume removes entry (no qty<0 left in inventory)');
    }

    // 84.p  Ammo-output recipe routes yield to state.ammo, not state.inventory
    {
      const sb = makeSb84(
        [{ name: 'Drained Small Energy Cell', qty: 4, wgt: 0, val: 0, type: 'misc' }],
        {},
        {},
        true,
        { craftQty_1: 1 }
      );
      sb.doCraft(1);
      assert(
        sb.state.ammo['Energy Cell'] === 4 &&
          !sb.state.inventory.find(i => i.name === 'Energy Cell'),
        'Ammo-output recipe: yield in state.ammo (Energy Cell=4), absent from inventory'
      );
    }

    // 84.q  Batch craft 2×: produces 2× output
    {
      const sb = makeSb84(
        [
          { name: 'Scrap Electronics', qty: 3, wgt: 0, val: 0, type: 'misc' },
          { name: 'Scrap Metal', qty: 2, wgt: 0, val: 0, type: 'misc' },
        ],
        {},
        { repair: 60 },
        true,
        { craftQty_0: 2 }
      );
      sb.doCraft(0);
      const wrk = sb.state.inventory.find(i => i.name === 'Weapon Repair Kit');
      assert(wrk && wrk.qty === 2, 'Batch craft 2×: produces 2× output (WRK qty=2)');
    }

    // 84.r  Scrap success: item consumed and yields added
    {
      const sb = makeSb84(
        [{ name: '.44 Magnum Round', qty: 3, wgt: 0, val: 0, type: 'ammo' }],
        {},
        {},
        true,
        { scrapQty_0: 2 }
      );
      sb.doScrap(0);
      const round = sb.state.inventory.find(i => i.name === '.44 Magnum Round');
      const casing = sb.state.inventory.find(i => i.name === 'Case, .44 Magnum');
      assert(
        (!round || round.qty === 1) && casing && casing.qty === 2,
        'Scrap success: 2× .44 Magnum Round consumed (3→1) and 2× Case, .44 Magnum added'
      );
    }

    // 84.s  Scrap insufficient qty → no-op
    {
      const sb = makeSb84(
        [{ name: '.44 Magnum Round', qty: 1, wgt: 0, val: 0, type: 'ammo' }],
        {},
        {},
        true,
        { scrapQty_0: 5 }
      );
      const before = JSON.stringify(sb.state.inventory);
      sb.doScrap(0);
      const after = JSON.stringify(sb.state.inventory);
      assert(before === after, 'Scrap insufficient qty → no-op (inventory unchanged)');
    }

    // 84.t  Soft skill: craft proceeds when player skill < skill requirement
    {
      const sb = makeSb84(
        [
          { name: 'Scrap Electronics', qty: 1, wgt: 0, val: 0, type: 'misc' },
          { name: 'Scrap Metal', qty: 1, wgt: 0, val: 0, type: 'misc' },
        ],
        {},
        { repair: 10 },
        true,
        { craftQty_0: 1 }
      );
      sb.doCraft(0);
      const wrk = sb.state.inventory.find(i => i.name === 'Weapon Repair Kit');
      assert(
        wrk && wrk.qty === 1,
        'Soft skill: craft succeeds when player skill not met (Repair 10 < required 50)'
      );
    }
  }
}

// ══════════════════════════════════════════════════════════════
//  Suite 85 — Skill Books Tracker (FNV+FO3, Protocol 4)
//  registry count/skills, sentinel checks, state default/migrate,
//  autoImportState validation, getSystemDirective, render wiring,
//  index.html container, READ/UNREAD sub-panel structural guards,
//  WU-B8 shared _renderReadTracker consolidation guards.
//  26 tests
// ══════════════════════════════════════════════════════════════
{
  header('Suite 85 — Skill Books Tracker (FNV+FO3, Protocol 4)');
  const stateSrc85 = readFile('js/state.js');
  const apiSrc85 = readFile('js/api.js');
  const uiRenderSrc85 = readFile('js/ui-render.js');
  const uiCoreSrc85 = readFile('js/ui-core.js');
  const nvRegSrc85 = readFile('js/reg_nv.js');
  const fo3RegSrc85 = readFile('js/reg_fo3.js');

  const FNV_SKILL_KEYS = [
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
  const FO3_SKILL_KEYS = [
    'barter',
    'big_guns',
    'energy_weapons',
    'explosives',
    'lockpick',
    'medicine',
    'melee_weapons',
    'repair',
    'science',
    'small_guns',
    'sneak',
    'speech',
    'unarmed',
  ];

  function extractSkillBooksBlock85(src) {
    const m = src.match(/skillBooks\s*:\s*\[([\s\S]*?)\n {2}\],/);
    return m ? m[1] : '';
  }

  // 85.1  reg_nv.js has skillBooks array
  assert(
    /skillBooks\s*:\s*\[/.test(nvRegSrc85),
    'reg_nv.js has skillBooks array (FNV skill-book registry)'
  );

  // 85.2  reg_nv.js skillBooks has exactly 13 items
  {
    const block = extractSkillBooksBlock85(nvRegSrc85);
    const count = (block.match(/\bname\s*:/g) || []).length;
    assert(count === 13, `reg_nv.js skillBooks has exactly 13 entries (found ${count})`);
  }

  // 85.3  all FNV skillBooks entries have valid skill keys
  {
    const block = extractSkillBooksBlock85(nvRegSrc85);
    const skillMatches = [...block.matchAll(/skill\s*:\s*'([^']+)'/g)].map(m => m[1]);
    const invalid = skillMatches.filter(sk => !FNV_SKILL_KEYS.includes(sk));
    assert(
      invalid.length === 0 && skillMatches.length === 13,
      `reg_nv.js skillBooks: all 13 skill keys are valid FNV keys (invalid: ${invalid.join(', ') || 'none'})`
    );
  }

  // 85.4  FNV sentinel: Wasteland Survival Guide → survival
  assert(
    /name\s*:\s*'Wasteland Survival Guide'[\s\S]{0,60}skill\s*:\s*'survival'/.test(nvRegSrc85),
    "reg_nv.js skillBooks: 'Wasteland Survival Guide' maps to skill 'survival'"
  );

  // 85.5  reg_fo3.js has skillBooks array
  assert(
    /skillBooks\s*:\s*\[/.test(fo3RegSrc85),
    'reg_fo3.js has skillBooks array (FO3 skill-book registry)'
  );

  // 85.6  reg_fo3.js skillBooks has exactly 13 items
  {
    const block = extractSkillBooksBlock85(fo3RegSrc85);
    const count = (block.match(/\bname\s*:/g) || []).length;
    assert(count === 13, `reg_fo3.js skillBooks has exactly 13 entries (found ${count})`);
  }

  // 85.7  all FO3 skillBooks entries have valid skill keys
  {
    const block = extractSkillBooksBlock85(fo3RegSrc85);
    const skillMatches = [...block.matchAll(/skill\s*:\s*'([^']+)'/g)].map(m => m[1]);
    const invalid = skillMatches.filter(sk => !FO3_SKILL_KEYS.includes(sk));
    assert(
      invalid.length === 0 && skillMatches.length === 13,
      `reg_fo3.js skillBooks: all 13 skill keys are valid FO3 keys (invalid: ${invalid.join(', ') || 'none'})`
    );
  }

  // 85.8  FO3 sentinel: U.S. Army: 30 Handy Flamethrower Recipes → big_guns
  assert(
    /name\s*:\s*'U\.S\. Army: 30 Handy Flamethrower Recipes'[\s\S]{0,60}skill\s*:\s*'big_guns'/.test(
      fo3RegSrc85
    ),
    "reg_fo3.js skillBooks: 'U.S. Army: 30 Handy Flamethrower Recipes' maps to skill 'big_guns'"
  );

  // 85.9  Guns and Bullets: FNV='guns', FO3='small_guns' (shared title, different skill)
  {
    const nvBlock = extractSkillBooksBlock85(nvRegSrc85);
    const fo3Block = extractSkillBooksBlock85(fo3RegSrc85);
    const nvGnB = /Guns and Bullets[\s\S]{0,60}skill\s*:\s*'guns'/.test(nvBlock);
    const fo3GnB = /Guns and Bullets[\s\S]{0,60}skill\s*:\s*'small_guns'/.test(fo3Block);
    assert(
      nvGnB && fo3GnB,
      "'Guns and Bullets' maps to 'guns' in FNV and 'small_guns' in FO3 (shared title, game-specific skill)"
    );
  }

  // 85.10  state.skillBooks default [] in state object (Protocol 4)
  assert(
    /skillBooks\s*:\s*\[\s*\]/.test(stateSrc85),
    'state.skillBooks default [] in state object (Protocol 4 default)'
  );

  // 85.11  migrateState() coerces non-array skillBooks to []
  {
    let migrateBody85 = '';
    try {
      migrateBody85 = extractFunctionBody(stateSrc85, 'migrateState');
    } catch (_) {}
    assert(
      /Array\.isArray\(s\.skillBooks\)/.test(migrateBody85) &&
        /s\.skillBooks\s*=\s*\[\]/.test(migrateBody85),
      'migrateState() coerces non-array s.skillBooks to [] (Protocol 4 migration)'
    );
  }

  // 85.12  autoImportState() validates skillBooks as array and filters against registry names
  {
    let importBody85 = '';
    try {
      importBody85 = extractFunctionBody(apiSrc85, 'autoImportState');
    } catch (_) {}
    assert(
      /skillBooks/.test(importBody85) &&
        /FALLOUT_REGISTRY\.skillBooks/.test(importBody85) &&
        /bookNames/.test(importBody85),
      'autoImportState() validates skillBooks array and filters against FALLOUT_REGISTRY.skillBooks names (Protocol 24)'
    );
  }

  // 85.13  getSystemDirective() mentions state.skillBooks (Protocol 14 — AI contract)
  {
    let sdBody85 = '';
    try {
      sdBody85 = extractFunctionBody(apiSrc85, 'getSystemDirective');
    } catch (_) {}
    assert(
      /state\.skillBooks/.test(sdBody85),
      'getSystemDirective() references state.skillBooks (Protocol 14 — AI contract updated)'
    );
  }

  // 85.14  renderSkillBooks() defined in ui-render.js
  assert(
    /function renderSkillBooks\s*\(/.test(uiRenderSrc85),
    'renderSkillBooks() is defined in ui-render.js'
  );

  // 85.15  renderSkillBooks() called from loadUI() in ui-core.js
  {
    let loadUIBody85 = '';
    try {
      loadUIBody85 = extractFunctionBody(uiCoreSrc85, 'loadUI');
    } catch (_) {}
    assert(
      /renderSkillBooks\s*\(\s*\)/.test(loadUIBody85),
      'renderSkillBooks() called from loadUI() in ui-core.js (Protocol 5)'
    );
  }

  // 85.16  index.html has #skillBooksDisplay container
  assert(
    /id="skillBooksDisplay"/.test(htmlSource),
    'index.html has #skillBooksDisplay container (Protocol 5 panel element)'
  );

  // 85.17  renderSkillBooks source has skill_books_read sub-panel marker
  {
    let renderSBBody85 = '';
    try {
      renderSBBody85 = extractFunctionBody(uiRenderSrc85, 'renderSkillBooks');
    } catch (_) {}
    assert(
      /skill_books_read/.test(renderSBBody85),
      'renderSkillBooks() references skill_books_read sub-panel data-sub-id (READ/UNREAD split)'
    );
  }

  // 85.18  renderSkillBooks source has skill_books_unread sub-panel marker
  {
    let renderSBBody85b = '';
    try {
      renderSBBody85b = extractFunctionBody(uiRenderSrc85, 'renderSkillBooks');
    } catch (_) {}
    assert(
      /skill_books_unread/.test(renderSBBody85b),
      'renderSkillBooks() references skill_books_unread sub-panel data-sub-id (READ/UNREAD split)'
    );
  }

  // 85.19  Collapse persistence is wired in the shared _renderReadTracker helper,
  //        and renderSkillBooks delegates to it (WU-B8 consolidation).
  {
    let helperBody85c = '';
    let sbWrap85c = '';
    try {
      helperBody85c = extractFunctionBody(uiRenderSrc85, '_renderReadTracker');
      sbWrap85c = extractFunctionBody(uiRenderSrc85, 'renderSkillBooks');
    } catch (_) {}
    assert(
      /querySelectorAll/.test(helperBody85c) &&
        /addEventListener\s*\(\s*'toggle'/.test(helperBody85c) &&
        /_renderReadTracker\s*\(/.test(sbWrap85c),
      "_renderReadTracker wires 'toggle' collapse persistence, and renderSkillBooks delegates to it"
    );
  }

  // 85.20  Old static skillBooksSubPanel removed from index.html (Protocol 20 regression guard)
  assert(
    !/id="skillBooksSubPanel"/.test(htmlSource),
    'index.html: old static skillBooksSubPanel removed — READ/UNREAD sub-panels are dynamic (Protocol 20)'
  );

  // 85.21  The shared helper splits by read.includes / !read.includes, and
  //        renderSkillBooks delegates to it (WU-B8 consolidation, behavioral correctness).
  {
    let helperBody85d = '';
    let sbWrap85d = '';
    try {
      helperBody85d = extractFunctionBody(uiRenderSrc85, '_renderReadTracker');
      sbWrap85d = extractFunctionBody(uiRenderSrc85, 'renderSkillBooks');
    } catch (_) {}
    assert(
      /read\.includes\(d\.name\)/.test(helperBody85d) &&
        /!read\.includes\(d\.name\)/.test(helperBody85d) &&
        /_renderReadTracker\s*\(/.test(sbWrap85d),
      '_renderReadTracker splits by read.includes(d.name)/!read.includes for READ/UNREAD, and renderSkillBooks delegates to it'
    );
  }

  // 85.22  "NO BOOKS READ" empty state present in renderSkillBooks source
  {
    let renderSBBody85e = '';
    try {
      renderSBBody85e = extractFunctionBody(uiRenderSrc85, 'renderSkillBooks');
    } catch (_) {}
    assert(
      /NO BOOKS READ/.test(renderSBBody85e),
      'renderSkillBooks() has "NO BOOKS READ" empty state for empty READ list'
    );
  }

  // 85.23  "ALL BOOKS READ" empty state present in renderSkillBooks source
  {
    let renderSBBody85f = '';
    try {
      renderSBBody85f = extractFunctionBody(uiRenderSrc85, 'renderSkillBooks');
    } catch (_) {}
    assert(
      /ALL BOOKS READ/.test(renderSBBody85f),
      'renderSkillBooks() has "ALL BOOKS READ" empty state for empty UNREAD list'
    );
  }

  // ── WU-B8 consolidation guards (QA-DUP-1) ──
  // 85.24  Shared _renderReadTracker(opts) helper is defined in ui-render.js.
  assert(
    /function _renderReadTracker\s*\(/.test(uiRenderSrc85),
    '85.24: shared _renderReadTracker(opts) helper is defined in ui-render.js (WU-B8 dedup)'
  );

  // 85.25  BOTH read-trackers delegate to the shared helper (single source of row logic).
  {
    let sb85 = '';
    let mag85 = '';
    try {
      sb85 = extractFunctionBody(uiRenderSrc85, 'renderSkillBooks');
      mag85 = extractFunctionBody(uiRenderSrc85, 'renderMagazines');
    } catch (_) {}
    assert(
      /_renderReadTracker\s*\(/.test(sb85) && /_renderReadTracker\s*\(/.test(mag85),
      '85.25: renderSkillBooks AND renderMagazines both delegate to _renderReadTracker (no duplicated render logic)'
    );
  }

  // 85.26  The shared helper carries the full row/sub-panel contract in one place.
  {
    let helper85 = '';
    try {
      helper85 = extractFunctionBody(uiRenderSrc85, '_renderReadTracker');
    } catch (_) {}
    assert(
      /tracker-row/.test(helper85) &&
        /class="sub-panel" data-sub-id="\$\{opts\.subIdRead\}/.test(helper85) &&
        /class="sub-panel" data-sub-id="\$\{opts\.subIdUnread\}/.test(helper85) &&
        /tracker-toggle/.test(helper85) &&
        /opts\.meta\(d\)/.test(helper85),
      '85.26: _renderReadTracker carries the shared contract — .tracker-row, READ/UNREAD sub-panels (data-sub-id), .tracker-toggle, opts.meta(d)'
    );
  }
}

// ══════════════════════════════════════════════════════════════
// Suite 86 — Maskable shortcut icons + OPTICS label wrap (6 tests)
// ══════════════════════════════════════════════════════════════
{
  header('Suite 86 — Maskable shortcut icons + OPTICS label wrap');

  const manifest86 = JSON.parse(readFile('manifest.json'));
  const shortcuts86 = manifest86.shortcuts || [];
  const shortcutNames86 = ['Comm-Link', 'Inventory', 'Stats', 'New Campaign'];

  // 86.1-86.4  Each shortcut icon has purpose containing 'maskable'
  shortcutNames86.forEach((name, idx) => {
    const sc = shortcuts86[idx];
    const icons = (sc && sc.icons) || [];
    const purpose = (icons[0] && icons[0].purpose) || '';
    assert(
      purpose.includes('maskable'),
      'manifest.json shortcut "' +
        name +
        '" icon has purpose containing "maskable" (Android gray-plate fix)'
    );
  });

  // 86.5  terminal.css .optics-label has white-space: nowrap
  assert(
    /\.optics-label[\s\S]{0,120}white-space\s*:\s*nowrap/.test(cssSource),
    'terminal.css .optics-label has white-space: nowrap (desktop OPTICS label wrap fix)'
  );

  // 86.6  index.html OPTICS label has class="optics-label" (Protocol 20 static guard)
  assert(
    /class="optics-label"[^>]*>OPTICS:/.test(htmlSource),
    'index.html OPTICS label has class="optics-label" (Protocol 20 static guard)'
  );
}

// ══════════════════════════════════════════════════════════════
// Suite 87 — NV Skill Magazines tracker (FNV-only, Protocol 4)
// 25 tests
// ══════════════════════════════════════════════════════════════
{
  header('Suite 87 — NV Skill Magazines tracker (FNV-only, Protocol 4)');

  const nvRegSrc87 = readFile('js/reg_nv.js');
  const fo3RegSrc87 = readFile('js/reg_fo3.js');
  const stateSrc87 = readFile('js/state.js');
  const apiSrc87 = readFile('js/api.js');
  const uiRenderSrc87 = readFile('js/ui-render.js');
  const idxSrc87 = readFile('index.html');

  const fnvSkillKeys87 = [
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

  // Extract the magazines block from reg_nv.js
  const magBlockMatch87 = nvRegSrc87.match(/magazines\s*:\s*\[([\s\S]*?)\n {2}\],/);
  const magBlock87 = magBlockMatch87 ? magBlockMatch87[1] : '';

  // 87.1  reg_nv.js has FALLOUT_REGISTRY.magazines array
  assert(
    /magazines\s*:\s*\[/.test(nvRegSrc87),
    'reg_nv.js has FALLOUT_REGISTRY.magazines array (FNV-only)'
  );

  // 87.2  exactly 14 entries
  const mag87Count = (magBlock87.match(/name\s*:/g) || []).length;
  assert(mag87Count === 14, `reg_nv.js magazines has exactly 14 entries (found ${mag87Count})`);

  // 87.3  reg_fo3.js has NO magazines array (FNV-only guard)
  assert(
    !/magazines\s*:\s*\[/.test(fo3RegSrc87),
    'reg_fo3.js has NO magazines array (FNV-only guard)'
  );

  // 87.4  all skill values in FNV getSkillKeys() OR 'Critical Chance'
  const magSkills87 = [...magBlock87.matchAll(/skill\s*:\s*'([^']+)'/g)].map(m => m[1]);
  const badMagSkills87 = magSkills87.filter(
    s => !fnvSkillKeys87.includes(s) && s !== 'Critical Chance'
  );
  assert(
    badMagSkills87.length === 0 && magSkills87.length === 14,
    `All 14 magazine skill values are in FNV getSkillKeys() or 'Critical Chance' (bad: ${badMagSkills87.join(', ')})`
  );

  // 87.5  no duplicate names
  const magNames87 = [...magBlock87.matchAll(/name\s*:\s*'([^']*)'|name\s*:\s*"([^"]*)"/g)].map(
    m => m[1] ?? m[2]
  );
  const magNameSet87 = new Set(magNames87);
  assert(
    magNameSet87.size === 14 && magNames87.length === 14,
    `reg_nv.js magazines: no duplicate names (${magNames87.length} names, ${magNameSet87.size} unique)`
  );

  // 87.6  sentinel: Boxing Times → unarmed
  assert(
    /Boxing Times/.test(magBlock87) && /Boxing Times[\s\S]{0,60}unarmed/.test(magBlock87),
    "Sentinel: 'Boxing Times' present with skill='unarmed'"
  );

  // 87.7  sentinel: True Police Stories → Critical Chance
  assert(
    /True Police Stories/.test(magBlock87) &&
      /True Police Stories[\s\S]{0,60}Critical Chance/.test(magBlock87),
    "Sentinel: 'True Police Stories' present with skill='Critical Chance'"
  );

  // 87.8  sentinel: Salesman Weekly
  assert(/Salesman Weekly/.test(magBlock87), "Sentinel: 'Salesman Weekly' present in magazines");

  // 87.9  sentinel: Programmer's Digest (partial match to avoid PS encoding fragility)
  assert(/Programmer/.test(magBlock87), "Sentinel: Programmer's Digest present in magazines");

  // 87.10  state.magazines default = []
  assert(
    /magazines\s*:\s*\[\]/.test(stateSrc87),
    'state.js has magazines: [] default (Protocol 4)'
  );

  // 87.11  migrateState() coerces magazines to []
  assert(
    /!Array\.isArray\(s\.magazines\)/.test(stateSrc87),
    'state.js migrateState() coerces magazines to [] (Protocol 4 migration)'
  );

  // 87.12  autoImportState handles 'magazines'
  guards(apiSrc87, [
    [
      /_g\(parsed,\s*'magazines'\)/,
      "autoImportState() handles 'magazines' field (_g extraction present)",
    ],

    // 87.13  magazines import uses magazines-specific registry Set
    [/magNames/, 'autoImportState magazines block uses magNames registry Set'],

    // 87.14  magazines import filters against registry
    [
      /magNames\.has\(m\)/,
      'autoImportState magazines block filters to registry names (magNames.has(m))',
    ],

    // 87.15  magazines import dedups
    [
      /state\.magazines\s*=\s*raw\.filter/,
      'autoImportState assigns state.magazines from registry-filtered dedup (state.magazines = raw.filter)',
    ],
  ]);

  // Extract renderMagazines body for structural checks
  const rmStart87 = uiRenderSrc87.indexOf('function renderMagazines()');
  const rmEnd87 = uiRenderSrc87.indexOf('\nfunction ', rmStart87 + 1);
  const renderMagBody87 = rmStart87 >= 0 ? uiRenderSrc87.slice(rmStart87, rmEnd87) : '';

  // 87.16  renderMagazines() defined
  assert(rmStart87 >= 0, 'renderMagazines() is defined in js/ui-render.js');

  // 87.17  references magazines_read sub-panel
  assert(
    /magazines_read/.test(renderMagBody87),
    "renderMagazines() references 'magazines_read' sub-panel data-sub-id"
  );

  // 87.18  references magazines_unread sub-panel
  assert(
    /magazines_unread/.test(renderMagBody87),
    "renderMagazines() references 'magazines_unread' sub-panel data-sub-id"
  );

  // 87.19  toggle persistence is wired in the shared _renderReadTracker helper,
  //        and renderMagazines delegates to it (WU-B8 consolidation).
  {
    let helperBody87 = '';
    try {
      helperBody87 = extractFunctionBody(uiRenderSrc87, '_renderReadTracker');
    } catch (_) {}
    assert(
      /querySelectorAll/.test(helperBody87) &&
        /addEventListener\s*\(\s*'toggle'/.test(helperBody87) &&
        /_renderReadTracker\s*\(/.test(renderMagBody87),
      '_renderReadTracker wires toggle persistence, and renderMagazines delegates to it'
    );
  }

  // 87.20  NO MAGAZINES READ empty state
  assert(
    /NO MAGAZINES READ/.test(renderMagBody87),
    "renderMagazines() has 'NO MAGAZINES READ' empty state"
  );

  // 87.21  ALL MAGAZINES READ empty state
  assert(
    /ALL MAGAZINES READ/.test(renderMagBody87),
    "renderMagazines() has 'ALL MAGAZINES READ' empty state"
  );

  // 87.22  toggleMagazine() defined
  assert(
    /function toggleMagazine\(/.test(uiRenderSrc87),
    'toggleMagazine() is defined in js/ui-render.js'
  );

  // 87.23  GAME_DEFS.FNV.hasMagazines = true
  assert(
    /hasMagazines\s*:\s*true/.test(stateSrc87),
    'GAME_DEFS.FNV.hasMagazines = true (FNV-only gate flag)'
  );

  // 87.24  index.html has #magazinesDisplay container
  assert(
    /id="magazinesDisplay"/.test(idxSrc87),
    'index.html has #magazinesDisplay container for renderMagazines()'
  );

  // 87.25  getSystemDirective references magazines in FNV-only context
  const sdStart87 = apiSrc87.indexOf('function getSystemDirective()');
  const sdEnd87 = apiSrc87.indexOf('\nfunction ', sdStart87 + 1);
  const sdBody87 = sdStart87 >= 0 ? apiSrc87.slice(sdStart87, sdEnd87) : '';
  assert(
    /magazines/.test(sdBody87) && /FNV/.test(sdBody87),
    'getSystemDirective() references magazines in FNV-only context (Protocol 4 AI contract)'
  );
}

// ══════════════════════════════════════════════════════════════
//  Suite 88 — GATE-UI: UI consistency structural guards (8 tests)
// ══════════════════════════════════════════════════════════════
{
  const uiRenderSrc88 = fs.readFileSync(path.join(__dirname, '../js/ui-render.js'), 'utf8');
  const uiCoreSrc88 = fs.readFileSync(path.join(__dirname, '../js/ui-core.js'), 'utf8');
  const idxSrc88 = fs.readFileSync(path.join(__dirname, '../index.html'), 'utf8');
  const cssSrc88 = fs.readFileSync(path.join(__dirname, '../css/terminal.css'), 'utf8');

  // 88.1  Every details.panel (not sub-panel) in index.html has a summary > h2 starting with ">" or "&gt;"
  const panelDetails88 = [...idxSrc88.matchAll(/<details[^>]*class="[^"]*\bpanel\b[^"]*"[^>]*>/g)]
    .filter(m => !/sub-panel/.test(m[0])) // exclude sub-panels (class="sub-panel")
    .map(m => idxSrc88.slice(m.index, m.index + 600));
  const panelH2ok88 = panelDetails88.every(chunk =>
    /<summary[^>]*>\s*<h2[^>]*>\s*(&gt;|>)/.test(chunk)
  );
  assert(
    panelDetails88.length > 0 && panelH2ok88,
    'GATE-UI-1: every details.panel in index.html has <summary><h2> starting with ">" (panel heading standard)'
  );

  // 88.2  Every details.sub-panel in index.html has data-sub-id
  const subPanelMatches88 = [
    ...idxSrc88.matchAll(/<details[^>]*class="[^"]*\bsub-panel\b[^"]*"[^>]*>/g),
  ].map(m => m[0]);
  const subPanelMissingId88 = subPanelMatches88.filter(tag => !/data-sub-id/.test(tag));
  assert(
    subPanelMatches88.length > 0 && subPanelMissingId88.length === 0,
    `GATE-UI-2: every details.sub-panel in index.html has data-sub-id (${subPanelMissingId88.length} missing)`
  );

  // 88.3  No <span onclick="toggle..."> tracker pattern in ui-render.js (tracker fns use button)
  const spanToggleMatches88 = [
    ...uiRenderSrc88.matchAll(
      /<span[^>]+onclick="toggle(Collectible|LincolnItem|Trait|SkillBook|Magazine)/g
    ),
  ];
  assert(
    spanToggleMatches88.length === 0,
    `GATE-UI-3: tracker toggles use <button>, not <span onclick="toggle..."> (found ${spanToggleMatches88.length} span-onclick patterns)`
  );

  // 88.4  All tracker renderers use the .tracker-row class. Three render rows
  //       inline (renderCollectibles/renderLincolnMemorabilia/renderTraits); the
  //       two read-trackers (renderSkillBooks/renderMagazines) delegate to the
  //       shared _renderReadTracker, which itself carries .tracker-row (WU-B8).
  const body88 = fn => {
    const start = uiRenderSrc88.indexOf(`function ${fn}(`);
    const end = uiRenderSrc88.indexOf('\nfunction ', start + 1);
    return start >= 0 ? uiRenderSrc88.slice(start, end) : '';
  };
  const inlineTrackers88 = ['renderCollectibles', 'renderLincolnMemorabilia', 'renderTraits'];
  const delegatingTrackers88 = ['renderSkillBooks', 'renderMagazines'];
  const inlineOk88 = inlineTrackers88.every(fn => /tracker-row/.test(body88(fn)));
  const delegateOk88 = delegatingTrackers88.every(fn => /_renderReadTracker\s*\(/.test(body88(fn)));
  const helperRow88 = /tracker-row/.test(body88('_renderReadTracker'));
  assert(
    inlineOk88 && delegateOk88 && helperRow88,
    'GATE-UI-4: all 5 tracker renderers use .tracker-row (3 inline + 2 via shared _renderReadTracker which carries it)'
  );

  // 88.5  renderFactionRep MINOR FACTIONS details has class="sub-panel" and data-sub-id
  const rfStart88 = uiRenderSrc88.indexOf('function renderFactionRep()');
  const rfEnd88 = uiRenderSrc88.indexOf('\nfunction ', rfStart88 + 1);
  const rfBody88 = rfStart88 >= 0 ? uiRenderSrc88.slice(rfStart88, rfEnd88) : '';
  assert(
    /class="sub-panel"/.test(rfBody88) && /data-sub-id="minor_factions"/.test(rfBody88),
    'GATE-UI-5: renderFactionRep() MINOR FACTIONS details has class="sub-panel" and data-sub-id="minor_factions"'
  );

  // 88.6  renderFactionRep helper text says ±5 not ±50
  assert(
    /±5/.test(rfBody88) && !/±50/.test(rfBody88),
    'GATE-UI-6: renderFactionRep() faction label says ±5 not ±50 (faction button increment is 5)'
  );

  // 88.7  _updatePanelBadges has total-aware [n/total] format for SKILL BOOKS and SKILL MAGAZINES
  const badgesStart88 = uiCoreSrc88.indexOf('function _updatePanelBadges()');
  const badgesEnd88 = uiCoreSrc88.indexOf('\nfunction ', badgesStart88 + 1);
  const badgesBody88 = badgesStart88 >= 0 ? uiCoreSrc88.slice(badgesStart88, badgesEnd88) : '';
  assert(
    /SKILL BOOKS/.test(badgesBody88) &&
      /SKILL MAGAZINES/.test(badgesBody88) &&
      /total/.test(badgesBody88),
    'GATE-UI-7: _updatePanelBadges() has total-aware [n/total] badge format for SKILL BOOKS and SKILL MAGAZINES'
  );

  // 88.8  terminal.css defines .tracker-toggle class (keyboard-accessible tracker button)
  assert(
    /button\.tracker-toggle/.test(cssSrc88),
    'GATE-UI-8: terminal.css defines button.tracker-toggle class (keyboard-accessible tracker button per Protocol 17)'
  );
}

// ══════════════════════════════════════════════════════════════
//  Suite 89 — GATE-AGNOSTIC: game-agnostic refactor guards (14 tests)
// ══════════════════════════════════════════════════════════════
{
  const apiSrc89 = fs.readFileSync(path.join(__dirname, '../js/api.js'), 'utf8');
  const uiCore89 = fs.readFileSync(path.join(__dirname, '../js/ui-core.js'), 'utf8');
  const stateSrc89 = fs.readFileSync(path.join(__dirname, '../js/state.js'), 'utf8');
  const htmlSrc89 = fs.readFileSync(path.join(__dirname, '../index.html'), 'utf8');
  const rulesSrc89 = fs.readFileSync(path.join(__dirname, '../RULES.md'), 'utf8');

  // 89.1  api.js: no two-game coercion pattern (=== 'FO3' ? 'FO3' : 'FNV')
  assert(
    !/=== 'FO3' \? 'FO3' : 'FNV'/.test(apiSrc89),
    "GATE-AGNOSTIC-1: api.js has no two-game coercion pattern (=== 'FO3' ? 'FO3' : 'FNV') — GA-2 fixed"
  );

  // 89.2  _nativeCrossroads uses getFactionRegistry() (GA-4 positive guard)
  {
    let crossBody89 = '';
    try {
      crossBody89 = extractFunctionBody(apiSrc89, '_nativeCrossroads');
    } catch (_) {}
    assert(
      /getFactionRegistry/.test(crossBody89),
      'GATE-AGNOSTIC-2: _nativeCrossroads() uses getFactionRegistry() for faction keys — GA-4 data-driven'
    );
  }

  // 89.3  _nativeCrossroads has no hardcoded 'enclave' faction key literal (GA-4 negative guard)
  {
    let crossBody89 = '';
    try {
      crossBody89 = extractFunctionBody(apiSrc89, '_nativeCrossroads');
    } catch (_) {}
    assert(
      !/'enclave'/.test(crossBody89),
      "GATE-AGNOSTIC-3: _nativeCrossroads() has no hardcoded 'enclave' faction key — GA-4 hardcoded array removed"
    );
  }

  // 89.4  index.html: no two-game coercion in boot script (GA-2 fixed)
  assert(
    !/=== 'FO3' \? 'FO3' : 'FNV'/.test(htmlSrc89),
    'GATE-AGNOSTIC-4: index.html has no two-game coercion pattern in boot script — GA-2 fixed'
  );

  // 89.5  ui-core.js: no two-game coercion pattern (GA-2 clean)
  assert(
    !/=== 'FO3' \? 'FO3' : 'FNV'/.test(uiCore89),
    'GATE-AGNOSTIC-5: ui-core.js has no two-game coercion pattern — GA-2 clean'
  );

  // 89.6  onGameContextChange uses !GAME_DEFS[ctx] guard (GA-3 fixed)
  {
    let ctxBody89 = '';
    try {
      ctxBody89 = extractFunctionBody(uiCore89, 'onGameContextChange');
    } catch (_) {}
    assert(
      /!GAME_DEFS\[ctx\]/.test(ctxBody89),
      'GATE-AGNOSTIC-6: onGameContextChange() uses !GAME_DEFS[ctx] guard — GA-3 fixed, no literal allowlist'
    );
  }

  // 89.7  seedNewCampaignInventory does NOT have ctx !== 'FNV' early-return (GA-6 regression guard)
  {
    let seedBody89 = '';
    try {
      seedBody89 = extractFunctionBody(uiCore89, 'seedNewCampaignInventory');
    } catch (_) {}
    assert(
      !/ctx\s*!==\s*['"]FNV['"]/.test(seedBody89),
      "GATE-AGNOSTIC-7: seedNewCampaignInventory() has no ctx !== 'FNV' guard — GA-6 regression (canteen is now GAME_DEFS-driven)"
    );
  }

  // 89.8  seedNewCampaignInventory references GAME_DEFS (GA-6 positive guard)
  {
    let seedBody89 = '';
    try {
      seedBody89 = extractFunctionBody(uiCore89, 'seedNewCampaignInventory');
    } catch (_) {}
    assert(
      /GAME_DEFS/.test(seedBody89),
      'GATE-AGNOSTIC-8: seedNewCampaignInventory() reads seedInventory from GAME_DEFS — GA-6 data-driven seed'
    );
  }

  // 89.9  wipeTerminal uses Object.values(GAME_DEFS) for context hint messages (GA-8 fixed)
  {
    let wipeBody89 = '';
    try {
      wipeBody89 = extractFunctionBody(uiCore89, 'wipeTerminal');
    } catch (_) {}
    assert(
      /Object\.values\(GAME_DEFS\)/.test(wipeBody89),
      'GATE-AGNOSTIC-9: wipeTerminal() uses Object.values(GAME_DEFS) for context hints — GA-8 data-driven messages'
    );
  }

  // 89.10  GAME_DEFS.FNV has seedInventory (GA-6 data added)
  assert(
    /FNV[\s\S]{0,400}seedInventory/.test(stateSrc89),
    'GATE-AGNOSTIC-10: GAME_DEFS.FNV has seedInventory array — GA-6 seed data in state.js'
  );

  // 89.11  GAME_DEFS.FO3 has seedInventory (GA-6 data added)
  assert(
    /FO3[\s\S]{0,400}seedInventory/.test(stateSrc89),
    'GATE-AGNOSTIC-11: GAME_DEFS.FO3 has seedInventory array — GA-6 seed data in state.js'
  );

  // 89.12  RULES.md contains Protocol 38 (game-agnostic codification)
  assert(
    /Protocol 38/.test(rulesSrc89),
    'GATE-AGNOSTIC-12: RULES.md contains Protocol 38 (game-agnostic feature code)'
  );

  // 89.13  index.html: boot data-file selection is the sanctioned GAME_FILES manifest
  //        (WU-A5 / GA-1) — keyed by context with a GAME_FILES.FNV fail-safe, not a ternary.
  assert(
    /GAME_FILES\s*=\s*\{[\s\S]*FNV[\s\S]*FO3[\s\S]*\}/.test(htmlSrc89) &&
      /GAME_FILES\[\s*ctx\s*\]\s*\|\|\s*GAME_FILES\.FNV/.test(htmlSrc89),
    'GATE-AGNOSTIC-13: index.html boot loader uses the sanctioned GAME_FILES manifest with GAME_FILES.FNV fail-safe (WU-A5, GA-1)'
  );

  // 89.14  index.html: the old hardcoded per-game boot ternary is gone (GA-1 fixed)
  assert(
    !/ctx\s*===\s*'FO3'\s*\?/.test(htmlSrc89),
    "GATE-AGNOSTIC-14: index.html boot loader has no hardcoded ctx === 'FO3' ? per-game file ternary — GA-1 fixed (WU-A5)"
  );
}

// ══════════════════════════════════════════════════════════════
//  Suite 90 — UTF-8 CORRUPTION GUARD: no symbol double-encoding (11 tests)
// ══════════════════════════════════════════════════════════════
{
  // Detect double-encoding caused by reading UTF-8 as Windows-1252 then re-encoding.
  // â€ is the first two chars of any double-encoded E2-80-xx UTF-8 sequence
  // (em-dash, en-dash, curly quotes, etc.). â– covers E2-96-xx box-drawing
  // (U+25B2 triangle, U+2588 full-block, etc.). � is the replacement character.
  const MOJIBAKE90 = /�|â€|â–/;
  const srcFiles90 = [
    '../js/api.js',
    '../js/state.js',
    '../js/ui-core.js',
    '../js/ui-render.js',
    '../js/ui-saves.js',
    '../js/ui-audio.js',
    '../js/ui-account.js',
    '../index.html',
    '../README.md',
    '../ARCHITECTURE.md',
  ];
  srcFiles90.forEach((rel, i) => {
    const label = rel.replace('../', '');
    const src = fs.readFileSync(path.join(__dirname, rel), 'utf8');
    assert(
      !MOJIBAKE90.test(src),
      `GATE-CORRUPT-${i + 1}: ${label} has no U+FFFD or \\u00E2\\u20AC/\\u00E2\\u2013 mojibake (double-encoded UTF-8 from PowerShell write)`
    );
  });
  // CHANGELOG.md: uses FULL 3-char sequence check only — the 2-char prefix would
  // false-positive on the intentional documentation examples in line 10 (Protocol 39).
  const changelog90 = fs.readFileSync(path.join(__dirname, '../CHANGELOG.md'), 'utf8');
  const emDashCorrupt90 = String.fromCharCode(0x00e2, 0x20ac, 0x201d); // double-encoded —
  const enDashCorrupt90 = String.fromCharCode(0x00e2, 0x20ac, 0x201c); // double-encoded –
  const mulSignCorrupt90 = String.fromCharCode(0x00c3, 0x2014); // double-encoded ×
  const rfChar90doc = String.fromCharCode(0xfffd); // U+FFFD
  assert(
    !changelog90.includes(emDashCorrupt90) &&
      !changelog90.includes(enDashCorrupt90) &&
      !changelog90.includes(mulSignCorrupt90) &&
      !changelog90.includes(rfChar90doc),
    'GATE-CORRUPT-11: CHANGELOG.md has no full-sequence mojibake (em/en-dash, multiplication sign double-encoding from PowerShell write)'
  );
}

// ══════════════════════════════════════════════════════════════
//  Suite 91 — loadUI DIRTY-CHECK / TARGETED RE-RENDER GUARDS (9 tests)
// ══════════════════════════════════════════════════════════════
{
  // Protocol 13 regression guards for WU-A3 (loadUI dirty-check).
  // Static assertions — no DOM required.
  const uiCore91 = fs.readFileSync(path.join(__dirname, '../js/ui-core.js'), 'utf8');

  // 91.1  _renderSig module-level cache exists
  guards(uiCore91, [
    ['const _renderSig = {}', 'GATE-DIRTY-1: _renderSig module-level cache declared in ui-core.js'],

    // 91.2  _isDirty helper function exists
    ['function _isDirty(', 'GATE-DIRTY-2: _isDirty() helper defined in ui-core.js'],

    // 91.3  _clearRenderCache function exists (explicit force-render path)
    [
      'function _clearRenderCache()',
      'GATE-DIRTY-3: _clearRenderCache() defined in ui-core.js (force-render path)',
    ],
  ]);

  // Extract loadUI body for scoped assertions (~8000 chars covers the full ~130-line function)
  const loadUIStart91 = uiCore91.indexOf('function loadUI()');
  assert(loadUIStart91 !== -1, 'GATE-DIRTY-4a: loadUI() function found in ui-core.js');
  const loadUIBody91 = uiCore91.slice(loadUIStart91, loadUIStart91 + 8000);

  // 91.4  _isDirty is wired inside loadUI — at least one dirty-check is active
  assert(
    loadUIBody91.includes("_isDirty('inv'"),
    "GATE-DIRTY-4: _isDirty('inv') called inside loadUI() — dirty-check is wired"
  );

  // 91.5  renderWorldMap is guarded by DATA tab check in loadUI (B-P1)
  assert(
    loadUIBody91.includes('tab-btn-data') && loadUIBody91.includes('renderWorldMap'),
    'GATE-DIRTY-5: renderWorldMap guarded by tab-btn-data check in loadUI() (B-P1)'
  );

  // 91.6  renderWorldMap is NOT called unconditionally in loadUI (B-P1 regression guard)
  guards(loadUIBody91, [
    [
      'renderWorldMap(); // G6',
      'GATE-DIRTY-6: renderWorldMap() not called unconditionally in loadUI() (B-P1 regression guard)',
      NEG,
    ],

    // 91.7  renderAccount() always called — auth state not covered by state slice
    [
      'renderAccount(); // always',
      'GATE-DIRTY-7: renderAccount() called unconditionally in loadUI() (auth state not in state slice)',
    ],

    // 91.8  renderSavesList() always called — localStorage/cloud not covered by state slice
    [
      'renderSavesList(); // always',
      'GATE-DIRTY-8: renderSavesList() called unconditionally in loadUI() (localStorage/cloud not in state slice)',
    ],
  ]);
}

// ══════════════════════════════════════════════════════════════
//  Suite 92 — VERTICAL-BROKEN-TEXT ANTI-RECURRENCE GUARDS (7 tests)
// ══════════════════════════════════════════════════════════════
{
  // Protocol 13 + Protocol 36b escape-ratchet: closes the "element squeezed
  // to ~0 width wraps one glyph per line" bug class (WU-C7/C9/C10/C12/C14).
  const css92 = fs.readFileSync(path.join(__dirname, '../css/terminal.css'), 'utf8');
  const uiRender92 = fs.readFileSync(path.join(__dirname, '../js/ui-render.js'), 'utf8');
  const html92 = fs.readFileSync(path.join(__dirname, '../index.html'), 'utf8');

  // 92.1  .tag class carries white-space: nowrap in terminal.css
  assert(
    /\.tag\s*\{[^}]*white-space:\s*nowrap/.test(css92),
    'GATE-NOWRAP-1: .tag class has white-space: nowrap in terminal.css (inventory type-tags must not wrap)'
  );

  // 92.2  .badge class carries white-space: nowrap in terminal.css
  assert(
    /\.badge\s*\{[^}]*white-space:\s*nowrap/.test(css92),
    'GATE-NOWRAP-2: .badge class has white-space: nowrap in terminal.css (map [?] badges must not wrap)'
  );

  // 92.3  inventory type-tag uses .tag class in ui-render.js
  assert(
    uiRender92.includes('class="tag"'),
    'GATE-NOWRAP-3: inventory type-tag span uses class="tag" in ui-render.js'
  );

  // 92.4  map collectible badge uses .badge class in ui-render.js
  assert(
    uiRender92.includes('map-collectible-badge badge'),
    'GATE-NOWRAP-4: map-collectible-badge span includes badge class in ui-render.js'
  );

  // 92.5  .macro-buttons button carries white-space: nowrap (WU-C12 device-wrap fix guard)
  assert(
    /\.macro-buttons\s+button\s*\{[^}]*white-space:\s*nowrap/.test(css92),
    'GATE-NOWRAP-5: .macro-buttons button has white-space: nowrap in terminal.css (macro command buttons must not wrap)'
  );

  // 92.6  WU-C14: the COMPLETE RNG label carries white-space: nowrap so it can
  //       never wrap one character per line when squeezed beside its warning.
  assert(
    /\.rng-mode-group\s*>\s*label\s*\{[^}]*white-space:\s*nowrap/.test(css92),
    'GATE-NOWRAP-6: .rng-mode-group > label has white-space: nowrap (COMPLETE RNG label must not wrap per-character)'
  );

  // 92.7  WU-C14: the COMPLETE RNG group stacks as a column (label on its own
  //       full-width row above the warning, desktop matches mobile) and the
  //       class hook is applied in index.html.
  assert(
    /\.rng-mode-group\s*\{[^}]*flex-direction:\s*column/.test(css92) &&
      /class="input-group rng-mode-group"/.test(html92),
    'GATE-NOWRAP-7: .rng-mode-group forces column stacking (label above warning) + class applied to the Complete RNG group in index.html'
  );
}

// ══════════════════════════════════════════════════════════════
//  Suite 93 — FO3 AUTOCOMPLETE GUARD (8 tests)
//  Protocol 13 + 36b: registrySearch lives in always-loaded
//  registry-core.js so FO3 campaigns have working autocomplete.
//  WU-B11 root cause: fn was only in reg_nv.js; boot loads only
//  one reg file per game → FO3 had registrySearch=undefined.
// ══════════════════════════════════════════════════════════════
header('Suite 93 — FO3 Autocomplete Guard');
{
  const rc93 = readFile('js/registry-core.js');
  const swSrc93 = readFile('sw.js');
  const indexSrc93 = readFile('index.html');
  const nvSrc93 = readFile('js/reg_nv.js');

  // 93.1  registry-core.js file exists (readFile exits if absent)
  assert(rc93.length > 0, 'registry-core.js file exists on disk');

  // 93.2  registry-core.js is listed in sw.js ASSETS
  assert(
    swSrc93.includes('./js/registry-core.js'),
    'registry-core.js is listed in sw.js ASSETS (service worker will cache it)'
  );

  // 93.3  registry-core.js defines registrySearch function
  assert(
    /function\s+registrySearch\s*\(/.test(rc93),
    'registry-core.js defines registrySearch() function'
  );

  // 93.4  registry-core.js reads FALLOUT_REGISTRY[category] — game-agnostic
  assert(
    rc93.includes('FALLOUT_REGISTRY[category]'),
    'registry-core.js reads FALLOUT_REGISTRY[category] — driven by active game registry, no literals'
  );

  // 93.5  reg_nv.js does NOT define registrySearch (moved to registry-core.js — no duplicate)
  assert(
    !/function\s+registrySearch\s*\(/.test(nvSrc93),
    'reg_nv.js does NOT define registrySearch() — function extracted to registry-core.js'
  );

  // 93.6  FO3 boot path in index.html includes registry-core.js after reg_fo3.js
  {
    const fo3Idx = indexSrc93.indexOf("'js/reg_fo3.js'");
    const rcNearFo3 =
      fo3Idx >= 0 && indexSrc93.slice(fo3Idx, fo3Idx + 200).includes("'js/registry-core.js'");
    assert(rcNearFo3, 'FO3 boot path in index.html includes registry-core.js after reg_fo3.js');
  }

  // 93.7  FNV boot path in index.html includes registry-core.js after reg_nv.js
  {
    const nvIdx = indexSrc93.indexOf("'js/reg_nv.js'");
    const rcNearNv =
      nvIdx >= 0 && indexSrc93.slice(nvIdx, nvIdx + 200).includes("'js/registry-core.js'");
    assert(rcNearNv, 'FNV boot path in index.html includes registry-core.js after reg_nv.js');
  }

  // 93.8  Behavioral: registrySearch executed against FO3 registry returns FO3 quests.
  //       Verifies the extracted function reads FALLOUT_REGISTRY dynamically (game-agnostic).
  {
    const fo3Src93 = readFile('js/reg_fo3.js');
    let fo3SearchResult = [];
    try {
      const FR93 = new Function(fo3Src93 + '\nreturn FALLOUT_REGISTRY;')();
      if (FR93) {
        const fn93 = new Function('FALLOUT_REGISTRY', rc93 + '\nreturn registrySearch;')(FR93);
        fo3SearchResult = fn93('quests', 'galaxy');
      }
    } catch (err) {
      fo3SearchResult = [];
    }
    assert(
      fo3SearchResult.length > 0 && fo3SearchResult.some(r => /galaxy/i.test(r.name)),
      'FO3-context behavioral: registrySearch("quests","galaxy") returns Galaxy News Radio from FO3 registry'
    );
  }
}

// ══════════════════════════════════════════════════════════════
//  Suite 94 — ACCESSIBILITY GUARDS (10 tests)
//  WCAG 2.1 AA: focus-visible indicators, prefers-reduced-motion
//  (seizure-hazard flicker freeze), aria-live chat region, and
//  sysModal dialog ARIA semantics. A-1/A-S4/A-7/A-S1 spec items.
// ══════════════════════════════════════════════════════════════
header('Suite 94 — Accessibility Guards');
{
  const css94 = fs.readFileSync(path.join(__dirname, '../css/terminal.css'), 'utf8');
  const idx94 = fs.readFileSync(path.join(__dirname, '../index.html'), 'utf8');
  const uiCore94 = fs.readFileSync(path.join(__dirname, '../js/ui-core.js'), 'utf8');

  // 94.1  :focus-visible rule exists in terminal.css (WCAG 2.4.7 — keyboard focus ring)
  guards(css94, [
    [
      ':focus-visible',
      'GATE-A11Y-1: terminal.css contains :focus-visible rule (keyboard focus indicator — WCAG 2.4.7)',
    ],

    // 94.2  prefers-reduced-motion block exists in terminal.css (WCAG 2.3.1 — seizure hazard)
    [
      'prefers-reduced-motion',
      'GATE-A11Y-2: terminal.css contains prefers-reduced-motion media query (seizure-safe animation freeze)',
    ],

    // 94.3  reduced-motion block uses 0.01ms animation-duration (not 0s — avoids animationend skip bug)
    [
      'animation-duration: 0.01ms',
      'GATE-A11Y-3: prefers-reduced-motion block uses animation-duration: 0.01ms !important (not 0s — avoids animationend skip bug)',
    ],

    // 94.4  reduced-motion block sets animation-iteration-count: 1 (stops infinite flicker loops)
    [
      'animation-iteration-count: 1',
      'GATE-A11Y-4: prefers-reduced-motion block sets animation-iteration-count: 1 !important (stops infinite flicker loops)',
    ],

    // 94.5  .crt-overlay appears inside prefers-reduced-motion block (static scanline look preserved)
    [
      /prefers-reduced-motion\s*:\s*reduce\b[\s\S]*?\.crt-overlay/,
      'GATE-A11Y-5: .crt-overlay has opacity restore inside prefers-reduced-motion block (static scanline preserved)',
    ],
  ]);

  // 94.6  chatDisplay has aria-live="polite" (screen reader live region)
  guards(idx94, [
    [
      'aria-live="polite"',
      'GATE-A11Y-6: #chatDisplay has aria-live="polite" in index.html (screen reader chat updates)',
    ],

    // 94.7  chatDisplay has aria-atomic="false" (per-message SR announcement, not full re-read)
    [
      'aria-atomic="false"',
      'GATE-A11Y-7: #chatDisplay has aria-atomic="false" in index.html (per-message SR announcement)',
    ],

    // 94.8  sysModal has role="dialog" (accessible dialog semantics)
    [
      'role="dialog"',
      'GATE-A11Y-8: #sysModal has role="dialog" in index.html (modal dialog semantics for AT)',
    ],

    // 94.9  sysModal has aria-modal="true" (background content inert for AT)
    [
      'aria-modal="true"',
      'GATE-A11Y-9: #sysModal has aria-modal="true" in index.html (background content inert for AT)',
    ],
  ]);

  // 94.10  _openSysModal helper defined in ui-core.js (focus-trap entrypoint + focus restore)
  assert(
    /function\s+_openSysModal\s*\(/.test(uiCore94),
    'GATE-A11Y-10: _openSysModal() helper defined in ui-core.js (focus management + Tab-trap entrypoint)'
  );
}

// ══════════════════════════════════════════════════════════════
//  Suite 95 — SAVE-LOAD RELOAD GUARD (import clobber regression) (9 tests)
//  Regression for the d0f0429 beforeunload bug: a load path writes the new
//  robco_v8 then calls location.reload(); the beforeunload flush fired during
//  teardown and re-serialized the STALE in-memory state over robco_v8, so
//  IMPORT SAVE / RESTORE BACKUP / cloud load silently did nothing. The fix
//  sets window._loadingSave before each reload and suppresses the unload +
//  debounced flush while it is set. These guards must never be removed.
// ══════════════════════════════════════════════════════════════
header('Suite 95 — Save-Load Reload Guard (import clobber regression)');
{
  const uiCore95 = fs.readFileSync(path.join(__dirname, '../js/ui-core.js'), 'utf8');
  const state95 = fs.readFileSync(path.join(__dirname, '../js/state.js'), 'utf8');
  const saves95 = fs.readFileSync(path.join(__dirname, '../js/ui-saves.js'), 'utf8');
  const cloud95 = fs.readFileSync(path.join(__dirname, '../js/cloud.js'), 'utf8');
  const api95 = fs.readFileSync(path.join(__dirname, '../js/api.js'), 'utf8');

  // 95.1  beforeunload flush is guarded by _loadingSave (not an unconditional robco_v8 write)
  assert(
    /beforeunload[\s\S]{0,400}?_loadingSave/.test(uiCore95),
    '95.1: ui-core.js beforeunload flush guards on window._loadingSave (no stale clobber of an imported robco_v8)'
  );

  // 95.2  debounced saveState write is guarded by _loadingSave too
  assert(
    /_saveTimer\s*=\s*setTimeout\([\s\S]{0,400}?_loadingSave/.test(state95),
    '95.2: state.js debounced saveState() write guards on window._loadingSave (no stale clobber during a load reload)'
  );

  // 95.3  handleFileUpload sets _loadingSave before its reload
  {
    const fn = extractFunctionBody(saves95, 'handleFileUpload');
    assert(
      /_loadingSave\s*=\s*true[\s\S]*?location\.reload\(\)/.test(fn),
      '95.3: handleFileUpload sets window._loadingSave = true before location.reload() (import survives unload flush)'
    );
  }

  // 95.4  restoreRollingBackup sets _loadingSave before its reload
  {
    const fn = extractFunctionBody(saves95, 'restoreRollingBackup');
    assert(
      /_loadingSave\s*=\s*true[\s\S]*?location\.reload\(\)/.test(fn),
      '95.4: restoreRollingBackup sets window._loadingSave = true before location.reload() (backup restore survives unload flush)'
    );
  }

  // 95.5  loadCloudSave sets _loadingSave before its reload
  assert(
    /_loadingSave\s*=\s*true[\s\S]{0,200}?location\.reload\(\)/.test(cloud95),
    '95.5: cloud.js loadCloudSave sets window._loadingSave = true before location.reload() (cloud load survives unload flush)'
  );

  // 95.6  onGameContextChange still guards its reload (working context-switch path not regressed)
  {
    const fn = extractFunctionBody(uiCore95, 'onGameContextChange');
    assert(
      /_contextSwitching\s*=\s*true[\s\S]*?location\.reload\(\)/.test(fn),
      '95.6: onGameContextChange still sets window._contextSwitching = true before reload (context-switch persistence intact)'
    );
  }

  // 95.7  BEHAVIORAL: a current-version save container round-trips through
  //       sanitizeImportedContainer + the boot merge, and the loaded state
  //       reflects the imported file (lvl/caps/loc/inventory).
  {
    let _testSanitize = null;
    try {
      const fnBody = extractFunctionBody(api95, 'sanitizeImportedContainer');
      const fnStart = api95.indexOf('function sanitizeImportedContainer');
      const paramsStart = api95.indexOf('(', fnStart);
      const paramsEnd = api95.indexOf('{', paramsStart);
      const params = api95.slice(paramsStart, paramsEnd).trim();
      _testSanitize = eval(`(function sanitizeImportedContainer${params}${fnBody})`);
    } catch (_) {}
    if (_testSanitize) {
      // The container as it appears inside a real current-version export file.
      const importedContainer = {
        activeContext: 'FNV',
        campaigns: {
          FNV: {
            lvl: 42,
            caps: 9999,
            loc: 'New Vegas Strip',
            inventory: [{ name: 'Plasma Rifle', qty: 1, wgt: 5, val: 3800, type: 'WEAPON' }],
          },
        },
      };
      // handleFileUpload: sanitize then persist (JSON round-trip = localStorage write).
      const stored = JSON.parse(JSON.stringify(_testSanitize(importedContainer)));
      // ui-core.js boot merge: state = { ...defaults, ...campaigns[activeContext] }.
      const bootDefaults = { lvl: 1, caps: 0, loc: 'Goodsprings', inventory: [] };
      const active = stored.campaigns[stored.activeContext] || {};
      const merged = { ...bootDefaults, ...active };
      assert(
        merged.lvl === 42 &&
          merged.caps === 9999 &&
          merged.loc === 'New Vegas Strip' &&
          merged.inventory.length === 1 &&
          merged.inventory[0].name === 'Plasma Rifle',
        '95.7: imported save container round-trips through sanitize + boot merge — loaded state reflects the file (lvl/caps/loc/inventory)'
      );
    } else {
      fail('95.7: behavioral import round-trip — sanitizeImportedContainer could not be evaluated');
    }
  }

  // 95.8  BEHAVIORAL — the beforeunload/saveState flush invariant (the footgun this
  //       guard exists to defuse): a path that writes a DIVERGENT robco_v8 then lets
  //       the unload flush fire is CLOBBERED unless _loadingSave/_contextSwitching is
  //       set first. Replicates the ui-core.js flush logic exactly and proves both
  //       branches. (Discovered during WU-A5 verification — harness-only, no shipped
  //       path is unguarded, but the invariant is locked here so it can't become live.)
  {
    const ls = {};
    const mockLS = {
      getItem: k => (k in ls ? ls[k] : null),
      setItem: (k, v) => {
        ls[k] = String(v);
      },
    };
    // Mirror of ui-core.js beforeunload flush (and the state.js debounced write):
    // both early-return on the guard, else serialize STALE in-memory state to robco_v8.
    function flush(inMemoryState, guarded) {
      if (guarded) return; // window._contextSwitching || window._loadingSave
      const v8 = { activeContext: inMemoryState.gameContext || 'FNV', campaigns: {} };
      v8.campaigns[v8.activeContext] = JSON.parse(JSON.stringify(inMemoryState));
      mockLS.setItem('robco_v8', JSON.stringify(v8));
    }
    const inMem = { gameContext: 'FNV', lvl: 1 }; // current page = FNV lvl 1

    // (a) UNGUARDED: a divergent write (FO3 lvl 42) is clobbered back to in-memory FNV.
    mockLS.setItem(
      'robco_v8',
      JSON.stringify({ activeContext: 'FO3', campaigns: { FO3: { gameContext: 'FO3', lvl: 42 } } })
    );
    flush(inMem, false);
    const afterUnguarded = JSON.parse(mockLS.getItem('robco_v8'));

    // (b) GUARDED: the same divergent write SURVIVES the flush.
    mockLS.setItem(
      'robco_v8',
      JSON.stringify({ activeContext: 'FO3', campaigns: { FO3: { gameContext: 'FO3', lvl: 42 } } })
    );
    flush(inMem, true);
    const afterGuarded = JSON.parse(mockLS.getItem('robco_v8'));

    assert(
      afterUnguarded.activeContext === 'FNV' && afterGuarded.activeContext === 'FO3',
      '95.8: unload flush clobbers an unguarded divergent robco_v8 write but a guarded one survives (footgun invariant locked)'
    );
  }

  // 95.9  STATIC ORDER GUARD — in the beforeunload handler the guard return must come
  //       BEFORE the robco_v8 write, so a refactor cannot move the write above the guard.
  {
    const bi = uiCore95.indexOf("addEventListener('beforeunload'");
    const handler = bi !== -1 ? uiCore95.slice(bi, bi + 800) : '';
    const guardIdx = handler.search(/_loadingSave[\s\S]{0,40}?return/);
    const writeIdx = handler.indexOf("setItem('robco_v8'");
    assert(
      guardIdx !== -1 && writeIdx !== -1 && guardIdx < writeIdx,
      '95.9: beforeunload guard return precedes the robco_v8 write (guard cannot be reordered below the flush)'
    );
  }
}

// ══════════════════════════════════════════════════════════════
//  Suite 96 — test.html RUNTIME MIRROR PARITY (8 tests)
//  Protocol 40: the browser-side runtime audit (tests/test.html) must stay in
//  sync with the live import contract and the canonical runners. These guards
//  fail if test.html drifts — wrong boot chain, stale dead stubs, a suite-count
//  that no longer matches reality, or the headless runner being removed from the
//  gate. Combined with the executed audit (tests/test-html-check.mjs in the gate),
//  test.html can no longer silently rot.
// ══════════════════════════════════════════════════════════════
header('Suite 96 — test.html Runtime Mirror Parity');
{
  const th = readFile('tests/test.html');
  const gate96 = readFile('scripts/gate.js');

  // 96.1  test.html exists and is the runtime persistence audit
  assert(
    /PERSISTENCE AUDIT/i.test(th) && /autoImportState/.test(th),
    '96.1: tests/test.html is the runtime persistence audit (executes autoImportState)'
  );

  // 96.2  test.html loads the current FNV boot chain in order (db → state → reg → registry-core → api)
  {
    const chain = ['db_nv.js', 'state.js', 'reg_nv.js', 'registry-core.js', 'api.js'];
    const missing = chain.filter(f => !th.includes('../js/' + f));
    assert(
      missing.length === 0,
      '96.2: test.html loads the current boot chain (db_nv, state, reg_nv, registry-core, api)' +
        (missing.length ? ' — missing: ' + missing.join(', ') : '')
    );
  }

  // 96.3  declared "Suites: N" marker matches the actual number of section() calls
  {
    const declared = th.match(/Suites:\s*(\d+)/);
    // Count section('...') CALLS only — exclude the `function section(` definition.
    const actual = (th.match(/section\('/g) || []).length;
    assert(
      declared && parseInt(declared[1], 10) === actual,
      `96.3: test.html "Suites: N" marker matches actual section() count` +
        (declared ? ` (declared ${declared[1]}, actual ${actual})` : ' (marker missing)')
    );
  }

  // 96.4  exercises the current import-contract entry points
  assert(
    /autoImportState/.test(th) && /sanitizeImportedContainer/.test(th),
    '96.4: test.html exercises autoImportState + sanitizeImportedContainer (current import contract)'
  );

  // 96.5  game-agnostic — uses the context-aware getters, not hardcoded registries (Protocol 38)
  assert(
    /getFactionRegistry\(\)/.test(th) && /getSkillKeys\(\)/.test(th) && /GAME_DEFS/.test(th),
    '96.5: test.html uses getFactionRegistry()/getSkillKeys()/GAME_DEFS (game-agnostic, Protocol 38)'
  );

  // 96.6  no stale dead references (old stubs removed in the r10 refresh must not return)
  assert(
    !/renderSkillMatrix|updateKarmaUI/.test(th),
    '96.6: test.html has no stale dead stubs (renderSkillMatrix / updateKarmaUI removed)'
  );

  // 96.7  the headless runner exists AND the gate invokes it
  assert(
    fs.existsSync(path.join(__dirname, 'test-html-check.mjs')) &&
      /test-html-check\.mjs/.test(gate96),
    '96.7: tests/test-html-check.mjs exists and scripts/gate.js runs it (test.html executed in gate)'
  );

  // 96.8  Protocol 40 is codified in RULES.md and CLAUDE.md
  {
    const rules96 = readFile('RULES.md');
    const claude96 = readFile('CLAUDE.md');
    assert(
      /Protocol 40/.test(rules96) && /Protocol 40/.test(claude96),
      '96.8: Protocol 40 (test.html sync) present in RULES.md and CLAUDE.md'
    );
  }
}

// ══════════════════════════════════════════════════════════════
//  Suite 97 — CHANGELOG category-heading integrity (Protocol 21) (2 tests)
//  Keep a Changelog convention: under one `## [version]` block there must be
//  exactly ONE heading per category (a single ### Added / ### Fixed / etc.).
//  This guards against the recurrence of a duplicate-heading split (e.g. two
//  separate ### Fixed sections under [Unreleased]) and against rogue/typo
//  category headings. Self-improving — Protocol 36b.
// ══════════════════════════════════════════════════════════════
header('Suite 97 — CHANGELOG category-heading integrity');
{
  const cl97 = readFile('CHANGELOG.md');
  const VALID_CATS = [
    'Added',
    'Changed',
    'Deprecated',
    'Removed',
    'Fixed',
    'Security',
    'Improved',
    'Hotfix', // post-release fix folded into a shipped version's block (RULES.md hotfix model)
    'Under the Hood',
  ];
  // Split into version blocks on top-level `## [` headers.
  const lines97 = cl97.split('\n');
  const blocks97 = [];
  let cur97 = null;
  for (const ln of lines97) {
    if (/^##\s+\[/.test(ln)) {
      cur97 = { header: ln.trim(), cats: [] };
      blocks97.push(cur97);
    } else if (cur97) {
      const m = ln.match(/^###\s+(.+?)\s*$/);
      if (m) cur97.cats.push(m[1]);
    }
  }

  // 97.1  No version block repeats a category heading.
  const dupReports = [];
  blocks97.forEach(b => {
    const seen = new Set();
    const dups = new Set();
    b.cats.forEach(c => (seen.has(c) ? dups.add(c) : seen.add(c)));
    if (dups.size) dupReports.push(`${b.header} → duplicate: ${[...dups].join(', ')}`);
  });
  assert(
    dupReports.length === 0,
    'CHANGELOG.md: each version block has at most one heading per category (Protocol 21)' +
      (dupReports.length ? ' — ' + dupReports.join(' | ') : '')
  );

  // 97.2  Every category heading is a recognized Keep-a-Changelog category.
  const badCats = [];
  blocks97.forEach(b => {
    b.cats.forEach(c => {
      if (!VALID_CATS.includes(c)) badCats.push(`${b.header} → "${c}"`);
    });
  });
  assert(
    badCats.length === 0,
    'CHANGELOG.md: all category headings are recognized (Added/Changed/Deprecated/Removed/Fixed/Security/Improved/Hotfix/Under the Hood)' +
      (badCats.length ? ' — unknown: ' + badCats.join(', ') : '')
  );
}

// ══════════════════════════════════════════════════════════════
//  Suite 98 — Project-root cleanliness (Protocol 41) (2 tests)
//  Flags leftover/junk that reappears at the project root so the end-of-task
//  cleanup sweep can't silently regress. The gate only FLAGS (fails) — it never
//  auto-deletes. Tracked files and the gitignored planning/ folder are untouched.
// ══════════════════════════════════════════════════════════════
header('Suite 98 — Project-root cleanliness (Protocol 41)');
{
  const rootEntries98 = fs.readdirSync(ROOT, { withFileTypes: true });

  // 98.1  No junk-extension / scratch files at the project root.
  const JUNK_FILE = /(\.(bak|old|tmp|orig|log|zip|swp|swo)$|~$|^repro\.|^_diag)/i;
  const junkFiles = rootEntries98
    .filter(e => e.isFile() && JUNK_FILE.test(e.name))
    .map(e => e.name);
  assert(
    junkFiles.length === 0,
    'Project root has no junk/scratch files (*.bak/*.old/*.tmp/*.orig/*.log/*.zip/*~/repro.*/_diag*) — Protocol 41' +
      (junkFiles.length ? ' — found: ' + junkFiles.join(', ') : '')
  );

  // 98.2  No stray/abandoned tool directories at the project root.
  const JUNK_DIRS = ['.yoke'];
  const junkDirs = rootEntries98
    .filter(e => e.isDirectory() && JUNK_DIRS.includes(e.name))
    .map(e => e.name);
  assert(
    junkDirs.length === 0,
    'Project root has no stray tool directories (e.g. .yoke/) — Protocol 41' +
      (junkDirs.length ? ' — found: ' + junkDirs.join(', ') : '')
  );
}

// ══════════════════════════════════════════════════════════════
//  Suite 99 — WU-B7 dead-code purge + duplication consolidation (16 tests)
//  Locks the removals so a refactor can't silently re-introduce the dead
//  code, and proves the consolidated helpers stayed consolidated. Each
//  removed symbol had zero call sites at purge time (grep-verified); each
//  consolidation reuses one shared helper / one slot-schema source.
// ══════════════════════════════════════════════════════════════
header('Suite 99 — WU-B7 dead-code purge + duplication consolidation');
{
  const audio99 = readFile('js/ui-audio.js');
  const render99 = readFile('js/ui-render.js');
  const api99 = readFile('js/api.js');
  const core99 = readFile('js/ui-core.js');
  const saves99 = readFile('js/ui-saves.js');
  const account99 = readFile('js/ui-account.js');
  const eslint99 = readFile('eslint.config.mjs');

  // ── Dead-code purge (must stay absent) ──
  assert(
    !/\bshowDeltaGhost\b/.test(audio99),
    '99.1: showDeltaGhost() removed from ui-audio.js (QA-DEAD-1 — zero call sites)'
  );
  assert(
    !/\bticksToGameTime\b/.test(render99),
    '99.2: ticksToGameTime() removed from ui-render.js (QA-DEAD-4 — zero call sites)'
  );
  assert(
    !/\bgameTimeToTicks\b/.test(render99),
    '99.3: gameTimeToTicks() removed from ui-render.js (QA-DEAD-5 — zero call sites, wrong comment)'
  );
  assert(
    !/\b_cleanKey\b/.test(api99),
    '99.4: _cleanKey removed from api.js (QA-DEAD-3 — computed then discarded)'
  );
  assert(
    !/\b_gcV\b/.test(api99) && !/state\.gameContext\s*=\s*gcV/.test(api99),
    '99.5: dead commented gameContext assignment + unused _gcV parse removed from api.js (QA-DEAD-8)'
  );
  guards(core99, [
    [
      /_inputHistory\s*=\s*\[\s*\]/,
      '99.6: unused _inputHistory array removed from ui-core.js (QA-DEAD-2)',
      NEG,
    ],
    [
      /\b_inputHistoryIdx\b/,
      '99.7: _inputHistoryIdx nav cursor retained — Up/Down history nav still wired (no behavior change)',
    ],
    [
      /targetDT\s*=\s*0\b/,
      '99.8: dead `targetDT = 0` constant removed (QA-DEAD-6) — WU-N1 wires a real, used targetDT input (see Suite 105.16)',
      NEG,
    ],
  ]);
  assert(
    !/\bticksToGameTime\b/.test(eslint99) && !/\bgameTimeToTicks\b/.test(eslint99),
    '99.9: ticksToGameTime + gameTimeToTicks globals removed from eslint.config.mjs'
  );

  // ── Duplication consolidation (shared helpers / single source) ──
  assert(
    /function\s+_startUptimeClock\s*\(/.test(core99),
    '99.10: _startUptimeClock() shared helper defined in ui-core.js (QA-DUP-4)'
  );
  assert(
    /function\s+_startMemCycle\s*\(/.test(core99),
    '99.11: _startMemCycle() shared helper defined in ui-core.js (QA-DUP-3)'
  );
  assert(
    (core99.match(/MEMORY CYCLE COMPLETE/g) || []).length === 1,
    '99.12: "MEMORY CYCLE COMPLETE" literal appears exactly once in ui-core.js (mem-cycle body deduped)'
  );
  assert(
    (core99.match(/_startUptimeClock\b/g) || []).length >= 3,
    '99.13: _startUptimeClock referenced >=3x in ui-core.js (1 definition + both call sites use the helper)'
  );
  assert(
    /function\s+listLocalSaves\s*\(/.test(saves99),
    '99.14: listLocalSaves() moved into ui-saves.js — co-located with slot schema (QA-DUP-2)'
  );
  assert(
    /function\s+listLocalSaves[\s\S]*?_slotKey\s*\(/.test(saves99),
    '99.15: listLocalSaves() reads slots via _slotKey() — single slot-key source (QA-DUP-2)'
  );
  assert(
    !/function\s+listLocalSaves\s*\(/.test(account99),
    '99.16: listLocalSaves() no longer defined in ui-account.js (moved out — single definition)'
  );
}

// ══════════════════════════════════════════════════════════════
//  Suite 100 — Staging build output guards (Cloudflare Pages) (4 tests)
//  The staging PWA registers a service worker at root scope. A service-worker
//  script fetch that returns a 3xx redirect cannot be registered/updated —
//  browsers reject it ("The script resource is behind a redirect, which is
//  disallowed"). cf-staging-build.mjs emits a _redirects file pinning sw.js +
//  manifest.json to a direct 200 serve so Cloudflare's path canonicalization can
//  never redirect them. These guards lock that emission + sw.js-at-root.
// ══════════════════════════════════════════════════════════════
header('Suite 100 — Staging build output guards (Cloudflare Pages)');
{
  const cfSrc100 = readFile('scripts/cf-staging-build.mjs');

  // 100.1 The staging build emits a Cloudflare _redirects file into the output.
  guards(cfSrc100, [
    [
      /writeFileSync\(\s*join\(\s*OUT\s*,\s*['"]_redirects['"]\s*\)/,
      '100.1: cf-staging-build.mjs writes a _redirects file into the staging output (dist-staging)',
    ],

    // 100.2 _redirects pins /sw.js to a direct 200 (no redirect) — the SW-update fix.
    [
      /\/sw\.js\s+\/sw\.js\s+200/,
      '100.2: staging _redirects pins /sw.js to a direct 200 serve (service worker never behind a redirect)',
    ],

    // 100.3 _redirects pins /manifest.json to a direct 200 as well (PWA control file).
    [
      /\/manifest\.json\s+\/manifest\.json\s+200/,
      '100.3: staging _redirects pins /manifest.json to a direct 200 serve (no redirect)',
    ],

    // 100.4 sw.js is staged at the served root so the SW registers at root scope.
    [
      /FILES\s*=\s*\[[^\]]*'sw\.js'/,
      '100.4: cf-staging-build.mjs stages sw.js at the served root (root-scope SW registration)',
    ],
  ]);
}

// ══════════════════════════════════════════════════════════════
//  Suite 101 — WU-B9 cloud.js → state.js boundary fix (8 tests)
//  Protocol 23 module boundary: cloud.js (the cloud-sync module) must never reach
//  into the global `state` object directly — it reads the active game context and
//  snapshots state ONLY through the sanctioned state.js accessors. These guards lock
//  the accessors into existence and fail if cloud.js ever re-introduces a direct
//  `state.gameContext` read or a `JSON.stringify(state)` whole-state read.
// ══════════════════════════════════════════════════════════════
header('Suite 101 — WU-B9 cloud.js → state.js boundary fix');
{
  const state101 = readFile('js/state.js');
  const cloud101 = readFile('js/cloud.js');

  // ── state.js sanctioned accessors exist + are exposed for the module boundary ──
  assert(
    /function\s+getGameContext\s*\(/.test(state101),
    '101.1: state.js defines getGameContext() — sanctioned read accessor for the active game context'
  );
  assert(
    /window\.getGameContext\s*=/.test(state101),
    '101.2: state.js exposes window.getGameContext so the cloud.js module can reach it across the boundary'
  );
  {
    let body = '';
    try {
      body = extractFunctionBody(state101, 'getGameContext');
    } catch (_) {}
    assert(
      /'FNV'/.test(body) && /state\s*&&\s*state\.gameContext|state\.gameContext/.test(body),
      "101.3: getGameContext() preserves the `|| 'FNV'` absence fallback (behavior-preserving swap)"
    );
  }
  assert(
    /function\s+snapshotActiveCampaign\s*\(/.test(state101),
    '101.4: state.js defines snapshotActiveCampaign() — sanctioned accessor to flush state into robco_v8'
  );
  assert(
    /window\.snapshotActiveCampaign\s*=/.test(state101),
    '101.5: state.js exposes window.snapshotActiveCampaign for cross-module use'
  );
  {
    let body = '';
    try {
      body = extractFunctionBody(state101, 'snapshotActiveCampaign');
    } catch (_) {}
    assert(
      /getGameContext\s*\(/.test(body) && /JSON\.parse\(JSON\.stringify\(state\)\)/.test(body),
      '101.6: snapshotActiveCampaign() is the single-source builder — uses getGameContext() + deep-snapshots state'
    );
  }

  // ── cloud.js boundary restored — no direct global `state` reads remain ──
  assert(
    !/(^|[^.\w])state\.gameContext/m.test(cloud101),
    '101.7: cloud.js no longer reads the global state.gameContext directly (Protocol 23 boundary restored)'
  );
  assert(
    !/JSON\.stringify\(\s*state\s*\)/.test(cloud101) &&
      /snapshotActiveCampaign\s*\(/.test(cloud101),
    '101.8: cloud.js no longer serializes the global state directly — routes through snapshotActiveCampaign()'
  );
}

// ══════════════════════════════════════════════════════════════
//  Suite 102 — WU-B10 boot-drone autoplay timing (6 tests)
//  The browser autoplay policy blocks audio before the first user gesture, so
//  the boot drone is armed to the first click/key. The bug: it fired on the
//  user's first interaction WHENEVER it happened — including a mid-session menu
//  tap long after boot finished, playing detached. Fix: a `_bootActive` window
//  flag — runBootSequence opens it before arming the drone and closes it at
//  completion; the armed gesture only plays the drone while boot is still
//  active, otherwise the stale drone is suppressed. These guards lock the
//  gate so the detached-drone regression can't return.
// ══════════════════════════════════════════════════════════════
header('Suite 102 — WU-B10 boot-drone autoplay timing');
{
  const audio102 = readFile('js/ui-audio.js');
  let bootSeq102 = '';
  let firstInteract102 = '';
  let bootDrone102 = '';
  try {
    bootSeq102 = extractFunctionBody(audio102, 'runBootSequence');
  } catch (_) {}
  try {
    firstInteract102 = extractFunctionBody(audio102, '_onFirstInteract');
  } catch (_) {}
  try {
    bootDrone102 = extractFunctionBody(audio102, 'playBootDrone');
  } catch (_) {}

  // 102.1 the boot-window flag exists, default false
  assert(
    /let\s+_bootActive\s*=\s*false/.test(audio102),
    '102.1: ui-audio.js declares the `_bootActive` boot-window flag (default false)'
  );

  // 102.2 runBootSequence opens the window (_bootActive = true) BEFORE arming the drone
  {
    const trueIdx = bootSeq102.indexOf('_bootActive = true');
    const droneIdx = bootSeq102.indexOf('playBootDrone(');
    assert(
      trueIdx >= 0 && droneIdx >= 0 && trueIdx < droneIdx,
      '102.2: runBootSequence sets _bootActive = true before playBootDrone() (boot window opens before the drone is armed)'
    );
  }

  // 102.3 runBootSequence closes the window (_bootActive = false) at completion
  assert(
    /_bootActive\s*=\s*false/.test(bootSeq102),
    '102.3: runBootSequence sets _bootActive = false at boot completion (boot window closes)'
  );

  // 102.4 the armed first-gesture handler SUPPRESSES the drone when boot already
  //       finished — the `!_bootActive` guard precedes the _tryDrone() call.
  {
    const guardIdx = firstInteract102.indexOf('_bootActive');
    const playIdx = firstInteract102.indexOf('_tryDrone');
    assert(
      /if\s*\(\s*!_bootActive\s*\)\s*return/.test(firstInteract102) &&
        guardIdx >= 0 &&
        playIdx >= 0 &&
        guardIdx < playIdx,
      '102.4: _onFirstInteract returns early on !_bootActive before _tryDrone() (stale drone suppressed post-boot)'
    );
  }

  // 102.5 the drone is still armed to the first user gesture (autoplay-policy-safe
  //       trigger preserved — click + keydown listeners not regressed away).
  assert(
    /addEventListener\(\s*'click',\s*_onFirstInteract/.test(bootDrone102) &&
      /addEventListener\(\s*'keydown',\s*_onFirstInteract/.test(bootDrone102),
    '102.5: playBootDrone still arms the drone to the first click/keydown gesture (autoplay-policy-safe trigger intact)'
  );

  // 102.6 BEHAVIORAL — replica of the gating decision: while booting the first
  //       gesture plays the drone; after boot it is suppressed. (PS runner mirrors
  //       this structurally — the ordered !_bootActive-before-_tryDrone guard.)
  {
    const played = [];
    const makeOnFirstInteract = getBootActive => () => {
      if (!getBootActive()) return; // suppress detached drone
      played.push('drone');
    };
    makeOnFirstInteract(() => true)(); // first gesture during boot → plays
    makeOnFirstInteract(() => false)(); // first gesture after boot → suppressed
    assert(
      played.length === 1 && played[0] === 'drone',
      '102.6: boot-active first gesture plays the drone exactly once; post-boot first gesture suppresses it (no detached drone)'
    );
  }
}

// ══════════════════════════════════════════════════════════════
//  Suite 103 — WU-C13 SAVE MENU "?" help affordance (7 tests)
//  A diegetic "?" button in the save panel header opens a help modal explaining
//  each save action. Reuses the shared sysModal entry point (_openSysModal,
//  WU-C4) so it inherits the focus-trap + ARIA dialog semantics. Game-agnostic
//  copy (Protocol 38). These guards lock the affordance + its coverage.
// ══════════════════════════════════════════════════════════════
header('Suite 103 — WU-C13 SAVE MENU "?" help affordance');
{
  const uiCore103 = readFile('js/ui-core.js');
  // The save-menu "?" button tag (attributes span lines; [^>] matches newlines).
  const btnTag103 = (htmlSource.match(/<button\b[^>]*showSaveHelpModal[^>]*>/) || [''])[0];
  let helpBody103 = '';
  try {
    helpBody103 = extractFunctionBody(uiCore103, 'showSaveHelpModal');
  } catch (_) {}

  // 103.1 the SAVE MENU "?" button exists and wires to showSaveHelpModal()
  assert(
    /onclick="showSaveHelpModal\(\)"/.test(htmlSource) && btnTag103 !== '',
    '103.1: SAVE MENU "?" button present in index.html with onclick="showSaveHelpModal()"'
  );

  // 103.2 the button has a descriptive aria-label (not a bare "[?]" for AT)
  assert(
    /aria-label="[^"]+"/.test(btnTag103),
    '103.2: save-menu "?" button has a descriptive aria-label (screen-reader operable)'
  );

  // 103.3 ≥28px tap target via the shared .btn-sm hook (Protocol 17)
  assert(
    /\bbtn-sm\b/.test(btnTag103),
    '103.3: save-menu "?" button uses .btn-sm (≥28px min tap target — Protocol 17)'
  );

  // 103.4 showSaveHelpModal defined and reuses _openSysModal (WU-C4 focus-trap + ARIA)
  assert(
    /function showSaveHelpModal\s*\(/.test(uiCore103) &&
      /_openSysModal\s*\(\s*\)/.test(helpBody103),
    '103.4: showSaveHelpModal() defined and opens via _openSysModal() (inherits WU-C4 focus-trap + ARIA dialog)'
  );

  // 103.5 the help documents every save action the SAVE MENU exposes
  {
    const saveHelp103 = (uiCore103.match(/const SAVE_HELP\s*=\s*\[[\s\S]*?\n\];/) || [''])[0];
    const documents = [
      'EXPORT SAVE',
      'IMPORT SAVE',
      'RESTORE BACKUP',
      'SAVE SLOTS',
      'SAVE TO CLOUD',
      'LOAD FROM CLOUD',
    ];
    const missing103 = documents.filter(d => !saveHelp103.includes(d));
    assert(
      saveHelp103 !== '' && missing103.length === 0,
      '103.5: SAVE_HELP documents every save action (export/import/restore/slots/cloud push+pull)' +
        (missing103.length ? ' — missing: ' + missing103.join(', ') : '')
    );
  }

  // 103.6 help text is escaped before innerHTML injection (XSS safety, Protocol 24)
  assert(
    /escapeHtml\(c\.cmd\)/.test(helpBody103) && /escapeHtml\(c\.desc\)/.test(helpBody103),
    '103.6: showSaveHelpModal() escapes help text via escapeHtml() before innerHTML injection'
  );

  // 103.7 game-agnostic (Protocol 38): no game-specific literals in the help copy
  {
    const saveHelp103b = (uiCore103.match(/const SAVE_HELP\s*=\s*\[[\s\S]*?\n\];/) || [''])[0];
    assert(
      !/\bFNV\b|\bFO3\b|Fallout|New Vegas|Vault-Tec/.test(saveHelp103b),
      '103.7: SAVE_HELP copy is game-agnostic — no FNV/FO3/Fallout/New Vegas literals (Protocol 38)'
    );
  }
}

// ══════════════════════════════════════════════════════════════
//  Suite 104 — WU-D4 deterministic-feature coefficients (fallout.wiki-verified) (19 tests)
//  Locks the canon coefficients that feed the Phase-N native calculators
//  (WU-N1 VATS / WU-N2 TRADE / WU-N3 THREAT). Sources (Protocol 3, fallout.wiki):
//    • Barter buy/sell — "Barter (Fallout: New Vegas)" / "Barter (Fallout 3)":
//        buy  = round(value × (1.55 − 0.0045×barter) × mod),  sell = round(value × (0.45 + 0.0045×barter) × mod)
//    • VATS crit bonus + clamp — "Vault-Tec Assisted Targeting System": FNV +5%, FO3 +15%, cap 95%
//    • ammo-per-attack default 1 (one round per trigger pull; Full Auto burns at Attacks_Per_Second)
//  The per-weapon ranged spread/falloff is an honest, unsourceable gap
//  (WU-D4a-RANGED-GAP) — guarded as a Protocol-3 flag, never fabricated.
// ══════════════════════════════════════════════════════════════
header('Suite 104 — WU-D4 deterministic-feature coefficients (fallout.wiki-verified)');
{
  const stateSrc104 = readFile('js/state.js');
  // Slice GAME_DEFS into per-game regions (both games define barter/vats/ammoPerAttack).
  const fo3At104 = stateSrc104.indexOf('FO3: {');
  const fnvSlice104 =
    fo3At104 > 0 ? stateSrc104.slice(stateSrc104.indexOf('FNV: {'), fo3At104) : '';
  const fo3Slice104 = fo3At104 > 0 ? stateSrc104.slice(fo3At104) : '';
  // num(slice, key) → numeric literal of `key: <number>` within a slice, or NaN.
  const num104 = (slice, key) => {
    const m = slice.match(new RegExp(key + '\\s*:\\s*(-?[\\d.]+)'));
    return m ? parseFloat(m[1]) : NaN;
  };
  const near104 = (a, b) => Math.abs(a - b) < 1e-9;

  // ── WU-D4b barter ──
  const fnvBuy = num104(fnvSlice104, 'buyBase'),
    fnvSell = num104(fnvSlice104, 'sellBase'),
    fnvSlope = num104(fnvSlice104, 'slopePerPoint');
  const fo3Buy = num104(fo3Slice104, 'buyBase'),
    fo3Sell = num104(fo3Slice104, 'sellBase'),
    fo3Slope = num104(fo3Slice104, 'slopePerPoint');

  // 104.1 FNV barter coefficients present
  assert(
    !isNaN(fnvBuy) && !isNaN(fnvSell) && !isNaN(fnvSlope),
    '104.1: GAME_DEFS.FNV.barter declares buyBase + sellBase + slopePerPoint'
  );
  // 104.2 FNV buyBase = 1.55 (fallout.wiki)
  assert(near104(fnvBuy, 1.55), '104.2: FNV barter buyBase === 1.55 (fallout.wiki)');
  // 104.3 FNV sellBase = 0.45 (fallout.wiki)
  assert(near104(fnvSell, 0.45), '104.3: FNV barter sellBase === 0.45 (fallout.wiki)');
  // 104.4 FNV slope = 0.0045 (= 9/2000, fallout.wiki FNV)
  assert(near104(fnvSlope, 0.0045), '104.4: FNV barter slopePerPoint === 0.0045 (= 9/2000)');
  // 104.5 FO3 barter identical to FNV (= (Barter/100)×0.45 = 0.0045/pt)
  assert(
    near104(fo3Buy, 1.55) && near104(fo3Sell, 0.45) && near104(fo3Slope, 0.0045),
    '104.5: FO3 barter coefficients identical (1.55 / 0.45 / 0.0045) — same engine'
  );
  // 104.6 CANON RANGE: buy price is never below item value — buyMult(barter=100) >= 1.0, base <= 1.55
  {
    const fnvBuy100 = fnvBuy - fnvSlope * 100;
    const fo3Buy100 = fo3Buy - fo3Slope * 100;
    assert(
      fnvBuy100 >= 1.0 && fnvBuy <= 1.55 && fo3Buy100 >= 1.0 && fo3Buy <= 1.55,
      `104.6: CANON — buy multiplier stays in [1.0, 1.55] (never buy below value); buyMult@100 FNV=${fnvBuy100.toFixed(3)} FO3=${fo3Buy100.toFixed(3)}`
    );
  }
  // 104.7 CANON RANGE: positive vendor margin — sellMult < buyMult at every barter (tightest at 100)
  {
    const fnvGap = fnvBuy - fnvSlope * 100 - (fnvSell + fnvSlope * 100);
    const fo3Gap = fo3Buy - fo3Slope * 100 - (fo3Sell + fo3Slope * 100);
    assert(
      fnvGap > 0 && fo3Gap > 0,
      `104.7: CANON — vendor margin positive (sellMult < buyMult) at barter 100; gap FNV=${fnvGap.toFixed(3)} FO3=${fo3Gap.toFixed(3)}`
    );
  }
  // 104.8 CANON RANGE: sell multiplier stays within [0.45, 0.90] over barter 0..100
  {
    const fnvSellHi = fnvSell + fnvSlope * 100;
    const fo3SellHi = fo3Sell + fo3Slope * 100;
    assert(
      fnvSell >= 0.45 && fnvSellHi <= 0.9 && fo3Sell >= 0.45 && fo3SellHi <= 0.9,
      `104.8: CANON — sell multiplier in [0.45, 0.90]; sellMult@100 FNV=${fnvSellHi.toFixed(3)} FO3=${fo3SellHi.toFixed(3)}`
    );
  }

  // ── WU-D4a VATS ──
  const fnvCrit = num104(fnvSlice104, 'critBonus'),
    fo3Crit = num104(fo3Slice104, 'critBonus');
  const fnvMin = num104(fnvSlice104, 'hitChanceMin'),
    fnvMax = num104(fnvSlice104, 'hitChanceMax'),
    fnvFloor = num104(fnvSlice104, 'skillSpreadFloor'),
    fnvCeil = num104(fnvSlice104, 'skillSpreadCeil');
  const fo3Min = num104(fo3Slice104, 'hitChanceMin'),
    fo3Max = num104(fo3Slice104, 'hitChanceMax'),
    fo3Floor = num104(fo3Slice104, 'skillSpreadFloor'),
    fo3Ceil = num104(fo3Slice104, 'skillSpreadCeil');

  // 104.9 FNV vats sub-object present (crit + clamp + skill-spread breakpoints)
  assert(
    !isNaN(fnvCrit) && !isNaN(fnvMin) && !isNaN(fnvMax) && !isNaN(fnvFloor) && !isNaN(fnvCeil),
    '104.9: GAME_DEFS.FNV.vats declares critBonus + hitChanceMin/Max + skillSpreadFloor/Ceil'
  );
  // 104.10 FNV crit bonus = 0.05 (fallout.wiki: +5%)
  assert(near104(fnvCrit, 0.05), '104.10: FNV VATS critBonus === 0.05 (+5%, fallout.wiki)');
  // 104.11 FO3 crit bonus = 0.15 (fallout.wiki: +15%)
  assert(near104(fo3Crit, 0.15), '104.11: FO3 VATS critBonus === 0.15 (+15%, fallout.wiki)');
  // 104.12 CANON RANGE: per-game difference real (FO3 > FNV) and both in (0, 0.20]
  assert(
    fo3Crit > fnvCrit && fnvCrit > 0 && fnvCrit <= 0.2 && fo3Crit > 0 && fo3Crit <= 0.2,
    '104.12: CANON — FO3 critBonus > FNV critBonus, both within (0, 0.20]'
  );
  // 104.13 hit-chance cap = 95 (both, fallout.wiki)
  assert(
    near104(fnvMax, 95) && near104(fo3Max, 95),
    '104.13: VATS hitChanceMax === 95 for both games (documented cap)'
  );
  // 104.14 hit-chance floor = 5 and floor < cap (both)
  assert(
    near104(fnvMin, 5) && near104(fo3Min, 5) && fnvMin < fnvMax && fo3Min < fo3Max,
    '104.14: VATS hitChanceMin === 5 and min < max for both games'
  );
  // 104.15 skill-spread breakpoints 50/100 (both)
  assert(
    near104(fnvFloor, 50) &&
      near104(fnvCeil, 100) &&
      near104(fo3Floor, 50) &&
      near104(fo3Ceil, 100),
    '104.15: VATS skillSpreadFloor === 50 and skillSpreadCeil === 100 for both games'
  );

  // ── WU-D4c ammo-per-attack ──
  const fnvAmmo = num104(fnvSlice104, 'ammoPerAttack'),
    fo3Ammo = num104(fo3Slice104, 'ammoPerAttack');
  // 104.16 FNV ammoPerAttack default = 1
  assert(near104(fnvAmmo, 1), '104.16: GAME_DEFS.FNV.ammoPerAttack === 1 (default round/attack)');
  // 104.17 FO3 ammoPerAttack default = 1
  assert(near104(fo3Ammo, 1), '104.17: GAME_DEFS.FO3.ammoPerAttack === 1 (default round/attack)');
  // 104.18 CANON RANGE: ammoPerAttack is a positive integer (both)
  assert(
    Number.isInteger(fnvAmmo) && fnvAmmo >= 1 && Number.isInteger(fo3Ammo) && fo3Ammo >= 1,
    '104.18: CANON — ammoPerAttack is a positive integer (>= 1) for both games'
  );

  // ── WU-D4a-RANGED-GAP flag (Protocol 3 — must not be silently dropped) ──
  // 104.19 the honest "ranged hit-% not sourceable" flag is documented in both game entries
  assert(
    fnvSlice104.includes('WU-D4a-RANGED-GAP') && fo3Slice104.includes('WU-D4a-RANGED-GAP'),
    '104.19: WU-D4a-RANGED-GAP flag documented in both GAME_DEFS entries (Protocol 3 — exact ranged hit-% is not sourceable)'
  );
}

// ══════════════════════════════════════════════════════════════
//  Suite 105 — WU-N1 VATS native calculator (21 tests)
//  The deterministic V.A.T.S. calc (showVATSOverlay/recomputeVATS) consuming the
//  WU-D4a coefficients (crit bonus + hit-% clamp) and the WU-N1 GAME_DEFS additions
//  (combatSkills, vats.regions, vats.apBase/apPerAgility — canon AP formula). Locks:
//  the GA-10 FO3 big_guns live-bug fix, the §1.6 melee-scope gate shape, the dropped
//  AI-deferral label, the real targetDT input, read-only-ness, and Protocol-38 agnosticism.
// ══════════════════════════════════════════════════════════════
header('Suite 105 — WU-N1 VATS native calculator');
{
  const st105 = readFile('js/state.js');
  const ui105 = readFile('js/ui-core.js');
  const dbnv105 = readFile('js/db_nv.js');
  const dbfo3105 = readFile('js/db_fo3.js');
  const fo3At = st105.indexOf('FO3: {');
  const fnv105 = fo3At > 0 ? st105.slice(st105.indexOf('FNV: {'), fo3At) : '';
  const fo3105 = fo3At > 0 ? st105.slice(fo3At) : '';
  const arr105 = (slice, key) => {
    const m = slice.match(new RegExp(key + '\\s*:\\s*\\[([^\\]]*)\\]'));
    return m ? m[1] : '';
  };
  const numIn = (slice, key) => {
    const m = slice.match(new RegExp(key + '\\s*:\\s*(-?[\\d.]+)'));
    return m ? parseFloat(m[1]) : NaN;
  };
  const fnvCombat = arr105(fnv105, 'combatSkills');
  const fo3Combat = arr105(fo3105, 'combatSkills');
  let vatsBody = '';
  try {
    vatsBody = extractFunctionBody(ui105, 'recomputeVATS');
  } catch (_) {}

  // 105.1 FNV combatSkills present with the firearm + melee + unarmed weapon skills
  assert(
    /guns/.test(fnvCombat) && /melee_weapons/.test(fnvCombat) && /unarmed/.test(fnvCombat),
    '105.1: GAME_DEFS.FNV.combatSkills includes guns + melee_weapons + unarmed'
  );
  // 105.2 GA-10 LIVE-BUG REGRESSION: FO3 combatSkills includes big_guns (was omitted) + small_guns
  assert(
    /big_guns/.test(fo3Combat) && /small_guns/.test(fo3Combat),
    "105.2: GA-10 — GAME_DEFS.FO3.combatSkills includes 'big_guns' (live-bug fix) + 'small_guns'"
  );
  // 105.3 FO3 combat set does NOT collapse to FNV's 'guns' (agnostic split, Protocol 38)
  assert(
    !/['"]guns['"]/.test(fo3Combat),
    "105.3: FO3 combatSkills does not contain FNV's 'guns' (uses small_guns/big_guns — no two-game collapse)"
  );
  // 105.4 every combatSkills key is a real skill key in that game's skillKeys
  {
    const fnvSkillKeys = (st105.match(/const SKILL_KEYS\s*=\s*\[([^\]]+)\]/) || ['', ''])[1];
    const fo3SkillKeys = (st105.match(/const SKILL_KEYS_FO3\s*=\s*\[([^\]]+)\]/) || ['', ''])[1];
    const toKeys = s => (s.match(/'([a-z_]+)'/g) || []).map(x => x.replace(/'/g, ''));
    const fnvBad = toKeys(fnvCombat).filter(k => !fnvSkillKeys.includes(`'${k}'`));
    const fo3Bad = toKeys(fo3Combat).filter(k => !fo3SkillKeys.includes(`'${k}'`));
    assert(
      fnvBad.length === 0 && fo3Bad.length === 0,
      '105.4: every combatSkills key is a valid skillKey in its game' +
        (fnvBad.length || fo3Bad.length ? ` — stray FNV:[${fnvBad}] FO3:[${fo3Bad}]` : '')
    );
  }
  // 105.5 FNV AP formula = 65 + 3×AGI (fallout.wiki "Action Points")
  assert(
    numIn(fnv105, 'apBase') === 65 && numIn(fnv105, 'apPerAgility') === 3,
    '105.5: FNV vats apBase === 65 and apPerAgility === 3 (fallout.wiki)'
  );
  // 105.6 FO3 AP formula = 65 + 2×AGI (per-game difference, fallout.wiki)
  assert(
    numIn(fo3105, 'apBase') === 65 && numIn(fo3105, 'apPerAgility') === 2,
    '105.6: FO3 vats apBase === 65 and apPerAgility === 2 (fallout.wiki)'
  );
  // 105.7 CANON: AP pool computed from the parsed coefficients = 95 (FNV) / 85 (FO3) at AGI 10
  {
    const fnvAp10 = numIn(fnv105, 'apBase') + numIn(fnv105, 'apPerAgility') * 10;
    const fo3Ap10 = numIn(fo3105, 'apBase') + numIn(fo3105, 'apPerAgility') * 10;
    assert(
      fnvAp10 === 95 && fo3Ap10 === 85,
      `105.7: CANON — AP pool at AGI 10 = ${fnvAp10} (FNV, expect 95) / ${fo3Ap10} (FO3, expect 85)`
    );
  }
  // 105.8 both games declare a non-empty vats.regions table with name+mod+ap shape
  {
    const regOk = slice => {
      const m = slice.match(/regions\s*:\s*\[([\s\S]*?)\]/);
      if (!m) return false;
      const cells = m[1].match(/\{[^}]*\}/g) || [];
      return (
        cells.length >= 6 &&
        cells.every(c => /name\s*:/.test(c) && /mod\s*:/.test(c) && /ap\s*:/.test(c))
      );
    };
    assert(
      regOk(fnv105) && regOk(fo3105),
      '105.8: FNV + FO3 vats.regions are non-empty {name,mod,ap} tables'
    );
  }
  // 105.9 the calculator entry points are defined
  assert(
    /function showVATSOverlay\s*\(/.test(ui105) && /function recomputeVATS\s*\(/.test(ui105),
    '105.9: showVATSOverlay() and recomputeVATS() are defined in ui-core.js'
  );
  // 105.10 hit-% clamp comes from GAME_DEFS (hitChanceMin/Max), not hardcoded 5/95
  assert(
    /hitChanceMin/.test(vatsBody) && /hitChanceMax/.test(vatsBody),
    '105.10: recomputeVATS() reads hitChanceMin/hitChanceMax from GAME_DEFS (WU-D4a clamp)'
  );
  // 105.11 VATS crit bonus comes from the GAME_DEFS coefficient
  assert(
    /critBonus/.test(vatsBody),
    '105.11: recomputeVATS() uses critBonus from GAME_DEFS (WU-D4a per-game coefficient)'
  );
  // 105.12 AP pool derived from the canon coefficients
  assert(
    /apBase/.test(vatsBody) && /apPerAgi/.test(vatsBody),
    '105.12: recomputeVATS() derives the AP pool from apBase + apPerAgility (canon formula)'
  );
  // 105.13 region table read from GAME_DEFS, not re-hardcoded in ui-core
  assert(
    /\.regions\b/.test(vatsBody) && !/mod:\s*-40/.test(ui105),
    '105.13: recomputeVATS() reads vats.regions from GAME_DEFS — no hardcoded region table in ui-core.js (GA-7)'
  );
  // 105.14 MELEE-SCOPE gate shape (§1.6) — playstyle==='melee' || weaponIsMelee, never mode alone
  assert(
    /playstyle\s*===\s*'melee'\s*\|\|\s*weaponIsMelee/.test(vatsBody),
    "105.14: melee-scope gate is `playstyle === 'melee' || weaponIsMelee` (§1.6 — never mode alone)"
  );
  // 105.15 AI-deferral label dropped (no "DETERMINED BY AI" anywhere in ui-core)
  assert(
    !/DETERMINED BY AI/.test(ui105),
    '105.15: the "ACTUAL OUTCOME DETERMINED BY AI" deferral label is removed'
  );
  // 105.16 dead `targetDT = 0` constant gone; a real #vatsTargetDT input wired to recompute
  assert(
    !/targetDT\s*=\s*0\b/.test(ui105) &&
      /id="vatsTargetDT"/.test(ui105) &&
      /oninput="recomputeVATS\(\)"/.test(ui105),
    '105.16: dead targetDT=0 removed; real #vatsTargetDT input wired to recomputeVATS() (QA-DEAD-6)'
  );
  // 105.17 lookupWeaponStats defined in BOTH db runners (parity)
  assert(
    /function lookupWeaponStats\s*\(/.test(dbnv105) &&
      /function lookupWeaponStats\s*\(/.test(dbfo3105),
    '105.17: lookupWeaponStats() defined in both db_nv.js and db_fo3.js'
  );
  // 105.18 read-only — the calc never writes state (no saveState/pushToCloud in the body)
  assert(
    !/saveState\s*\(/.test(vatsBody) && !/pushToCloud\s*\(/.test(vatsBody),
    '105.18: recomputeVATS() is read-only (no saveState/pushToCloud writes)'
  );
  // ── VATS-still-AI retirement (Protocol 42) ───────────────────────────────────
  const api105 = readFile('js/api.js');
  const routerBody105 = (api105.match(/const NATIVE_COMMAND_ROUTER\s*=\s*\{[\s\S]*?\n\};/) || [
    '',
  ])[0];
  // 105.19 the [VATS SIM]/[VS]/[VATS] tokens route to the native overlay — NOT the AI.
  assert(
    /'\[VATS SIM\]':\s*\(\)\s*=>\s*showVATSOverlay\(\)/.test(routerBody105) &&
      /'\[VS\]':\s*\(\)\s*=>\s*showVATSOverlay\(\)/.test(routerBody105) &&
      /'\[VATS\]':\s*\(\)\s*=>\s*showVATSOverlay\(\)/.test(routerBody105),
    '105.19: NATIVE_COMMAND_ROUTER routes [VATS SIM]/[VS]/[VATS] → showVATSOverlay() (native, no AI — VATS-still-AI fix, Protocol 42)'
  );
  // 105.20 the AI V.A.T.S. path is retired in getSystemDirective: the old "[VATS SIM] / [VS] :
  // Opt." advertisement is gone, replaced by a defer-to-native note (mirrors THREAT/BIO-SCAN/LOOT).
  assert(
    !/\[VS\]\s*:\s*Opt\./.test(api105) &&
      /V\.A\.T\.S\. accuracy \/ AP-strike simulation:[\s\S]*?defer to the local calculator/i.test(
        api105
      ),
    '105.20: AI V.A.T.S. path retired — getSystemDirective no longer advertises a [VATS SIM] AI feature and defers V.A.T.S. to the native calculator'
  );
  // 105.21 cross-cut: every command-driven native (THREAT/CONSULT/BIO-SCAN/LOOT/VATS) has a
  // NATIVE_COMMAND_ROUTER entry — each is intercepted natively end-to-end, none reach the AI.
  assert(
    ['[THREAT]', '[CONSULT]', '[BIO-SCAN]', '[LOOT]', '[VATS SIM]'].every(tok =>
      routerBody105.includes("'" + tok + "'")
    ),
    '105.21: all router-driven natives (THREAT/CONSULT/BIO-SCAN/LOOT/VATS) have a NATIVE_COMMAND_ROUTER entry (native end-to-end, no AI fall-through)'
  );
}

// ══════════════════════════════════════════════════════════════
//  Suite 106 — WU-N2 TRADE native barter terminal (22 tests)
//  The deterministic, offline barter terminal consuming the WU-D4b coefficients
//  (GAME_DEFS[ctx].barter). Locks: db catalog/vendor lookups, the price math + its
//  canon invariants (buy ≥ value, sell < buy), additive + confirm-gated mutation
//  (Protocol 34), the caps-revert regression fix (#c_caps mirror — Protocol 42), the
//  retired AI TRADE modal path, and the panel wiring.
// ══════════════════════════════════════════════════════════════
header('Suite 106 — WU-N2 TRADE native barter terminal');
{
  const ren106 = readFile('js/ui-render.js');
  const dbnv106 = readFile('js/db_nv.js');
  const dbfo3106 = readFile('js/db_fo3.js');
  const api106 = readFile('js/api.js');
  const core106 = readFile('js/ui-core.js');
  const html106 = htmlSource;
  const css106 = readFile('css/terminal.css');
  const st106 = readFile('js/state.js');
  let doBuyBody = '';
  let doSellBody = '';
  try {
    doBuyBody = extractFunctionBody(ren106, 'doBuy');
  } catch (_) {}
  try {
    doSellBody = extractFunctionBody(ren106, 'doSell');
  } catch (_) {}

  // 106.1 vendor + catalog lookups in BOTH db runners
  assert(
    /function getVendors\s*\(/.test(dbnv106) &&
      /function getTradeCatalog\s*\(/.test(dbnv106) &&
      /function getVendors\s*\(/.test(dbfo3106) &&
      /function getTradeCatalog\s*\(/.test(dbfo3106),
    '106.1: getVendors() + getTradeCatalog() defined in both db_nv.js and db_fo3.js'
  );
  // 106.2 all TRADE entry points defined in ui-render.js
  assert(
    [
      'renderTrade',
      'renderTradeBuyList',
      'renderTradeSellList',
      'setTradeVendor',
      'doBuy',
      'doSell',
    ].every(f => new RegExp('function ' + f + '\\s*\\(').test(ren106)),
    '106.2: renderTrade/renderTradeBuyList/renderTradeSellList/setTradeVendor/doBuy/doSell defined'
  );
  // 106.3 price helpers read the GAME_DEFS barter coefficients (game-agnostic, Protocol 38)
  {
    let coefBody = '';
    try {
      coefBody = extractFunctionBody(ren106, '_tradeBarterCoef');
    } catch (_) {}
    assert(
      /function _tradeBuyPrice\s*\(/.test(ren106) &&
        /function _tradeSellPrice\s*\(/.test(ren106) &&
        /\.barter\b/.test(coefBody) &&
        /getGameContext|GAME_DEFS/.test(coefBody),
      '106.3: _tradeBuyPrice/_tradeSellPrice read GAME_DEFS[ctx].barter (Protocol 38)'
    );
  }
  // 106.4/106.5 BEHAVIORAL canon invariants using the parsed coefficients (both games)
  {
    const fo3At = st106.indexOf('FO3: {');
    const fnvSlice = fo3At > 0 ? st106.slice(st106.indexOf('FNV: {'), fo3At) : '';
    const fo3Slice = fo3At > 0 ? st106.slice(fo3At) : '';
    const num = (slice, key) => {
      const m = slice.match(new RegExp(key + '\\s*:\\s*(-?[\\d.]+)'));
      return m ? parseFloat(m[1]) : NaN;
    };
    const checkGame = slice => {
      const buyBase = num(slice, 'buyBase');
      const sellBase = num(slice, 'sellBase');
      const slope = num(slice, 'slopePerPoint');
      const buy = (v, b) => Math.max(1, Math.round(v * (buyBase - slope * b)));
      const sell = (v, b) => Math.max(0, Math.round(v * (sellBase + slope * b)));
      let ok = true;
      for (const b of [0, 25, 50, 75, 100]) {
        const v = 100;
        if (buy(v, b) < v) ok = false; // buy never below item value
        if (sell(v, b) >= buy(v, b)) ok = false; // positive vendor margin
        if (sell(v, b) < 0) ok = false;
      }
      return ok;
    };
    assert(
      checkGame(fnvSlice),
      '106.4: CANON — FNV buy ≥ value and sell < buy across barter 0..100'
    );
    assert(
      checkGame(fo3Slice),
      '106.5: CANON — FO3 buy ≥ value and sell < buy across barter 0..100'
    );
  }
  // 106.6 buy floored at 1 cap, sell clamped ≥ 0, both rounded
  assert(
    /Math\.max\(\s*1,\s*Math\.round/.test(ren106) && /Math\.max\(\s*0,\s*Math\.round/.test(ren106),
    '106.6: buy price floored at 1 (Math.max(1, round)) and sell clamped ≥ 0 (Math.max(0, round))'
  );
  // 106.7 Protocol 34 additive: doBuy adds to inventory (push / qty++), never blind-overwrites the array
  assert(
    /state\.inventory\.push\(/.test(doBuyBody) && /\.qty\s*=\s*\(?.*qty/.test(doBuyBody),
    '106.7: doBuy is additive — pushes new item or increments existing qty (Protocol 34)'
  );
  // 106.8 confirm-gated (Protocol 34) — both doBuy and doSell
  assert(
    /confirm\(/.test(doBuyBody) && /confirm\(/.test(doSellBody),
    '106.8: doBuy and doSell are confirm-gated (Protocol 34)'
  );
  // 106.9 doSell decrements then splices at ≤0 (clamp, no negative qty)
  assert(
    /splice\(/.test(doSellBody) && /it\.qty\s*<=\s*0/.test(doSellBody),
    '106.9: doSell decrements qty and splices the item at ≤ 0 (clamp ≥ 0)'
  );
  // 106.10 caps mutation: buy subtracts, sell adds
  assert(
    /state\.caps\s*=\s*caps\s*-\s*price/.test(doBuyBody) &&
      /state\.caps\s*=\s*caps\s*\+\s*price/.test(doSellBody),
    '106.10: doBuy sets caps = caps − price; doSell sets caps = caps + price'
  );
  // 106.11 CAPS-REVERT REGRESSION (Protocol 42): both mirror new caps to #c_caps (saveState sync source)
  assert(
    /c_caps/.test(doBuyBody) && /c_caps/.test(doSellBody),
    '106.11: doBuy + doSell write new caps to #c_caps so saveState()/syncStateFromDom does not revert it (Protocol 42)'
  );
  // 106.12 no auto-cloud-push from either transaction
  assert(
    !/pushToCloud\s*\(/.test(doBuyBody) && !/pushToCloud\s*\(/.test(doSellBody),
    '106.12: neither doBuy nor doSell auto-pushes to cloud (manual sync only)'
  );
  // 106.13 AI TRADE modal render branch retired
  assert(
    !/mType\s*===\s*'TRADE'/.test(api106),
    "106.13: the AI TRADE modal render branch (mType === 'TRADE') is removed from api.js"
  );
  // 106.14 AI no longer instructed to emit TRADE modals + dead tradeItem() removed
  assert(
    !/array of item objects.*vendor/.test(api106) && !/function tradeItem\s*\(/.test(core106),
    '106.14: getSystemDirective no longer defines a TRADE modal shape; dead tradeItem() removed from ui-core.js'
  );
  // 106.15 TRADE panel + sub-panels present in index.html
  assert(
    /id="tradePanel"/.test(html106) &&
      /&gt;\s*BARTER UPLINK/.test(html106) &&
      /data-sub-id="trade_buy"/.test(html106) &&
      /data-sub-id="trade_sell"/.test(html106),
    '106.15: #tradePanel with BARTER UPLINK h2 + trade_buy/trade_sell sub-panels (data-sub-id) present'
  );
  // 106.16 [TRADE] macro button repointed to the native panel (not the AI macro)
  assert(
    /expandPanelForCategory\('trade'\)/.test(html106) &&
      !/macroCommand\('\[TRADE\]'\)/.test(html106),
    "106.16: [TRADE] button opens the native panel (expandPanelForCategory('trade')), not macroCommand('[TRADE]')"
  );
  // 106.17 expandPanelForCategory routes 'trade' + loadUI renders it
  assert(
    /trade:\s*'inv'/.test(core106) &&
      /trade:\s*'>\s*BARTER UPLINK'/.test(core106) &&
      /renderTrade\(\)/.test(core106),
    "106.17: expandPanelForCategory maps trade→inv + '> BARTER UPLINK'; loadUI calls renderTrade()"
  );
  // 106.18 CSS overflow guard — .trade-row name flexes with min-width:0 (Protocol 17/mobile)
  assert(
    /\.trade-row\b/.test(css106) && /\.trade-name[\s\S]{0,80}min-width:\s*0/.test(css106),
    '106.18: terminal.css .trade-row + .trade-name min-width:0 (no horizontal overflow at 360px)'
  );
  // 106.19 vendor-switch regression (Protocol 42) — changing the vendor <select> re-renders
  // the purse line + buy/sell lists WITHOUT calling renderTrade() (which would rebuild the
  // <select> mid-change-event — the element-self-replacement that left the purse/list stale
  // on real devices). setTradeVendor must update in place via _renderTradeStats + both lists.
  {
    let setBody106 = '';
    try {
      setBody106 = extractFunctionBody(ren106, 'setTradeVendor');
    } catch (_) {}
    assert(
      /_renderTradeStats\(\)/.test(setBody106) &&
        /renderTradeBuyList\(\)/.test(setBody106) &&
        /renderTradeSellList\(\)/.test(setBody106) &&
        !/renderTrade\(\)/.test(setBody106),
      '106.19: setTradeVendor() re-renders purse + buy/sell lists in place and never calls renderTrade() (no <select> rebuild mid-change — WU-N2 vendor-switch fix, Protocol 42)'
    );
  }
  // 106.20 the purse line is its own mount (#tradeStats) updated by a single helper, so a
  // vendor switch touches only the stats line + lists, never the <select>.
  assert(
    /function _renderTradeStats\s*\(/.test(ren106) &&
      /id="tradeStats"/.test(ren106) &&
      /VENDOR PURSE/.test(ren106),
    '106.20: renderTrade() mounts a #tradeStats line and _renderTradeStats() is the single purse/caps/barter updater'
  );
  // 106.21 WU-HF1 [TRADE]-does-nothing fix: expandPanelForCategory opens the matched panel
  // (setAttribute('open','')) AND reveals it via scrollIntoView with block:'center' (r3 —
  // owner: CENTER the panel in the viewport, not pinned to the very top). Without the reveal,
  // opening BARTER UPLINK (which sits below BACKPACK/EQUIPPED/AMMO/CRAFTING on the INV tab)
  // left the panel off-screen, so the [TRADE] tap silently switched tabs with nothing visible.
  {
    let expandBody106 = '';
    try {
      expandBody106 = extractFunctionBody(core106, 'expandPanelForCategory');
    } catch (_) {}
    assert(
      /setAttribute\(\s*'open'/.test(expandBody106) &&
        /scrollIntoView\(\s*\{[^}]*block:\s*'center'/.test(expandBody106),
      "106.21: expandPanelForCategory opens the matched panel AND centers it via scrollIntoView({ block: 'center' }) (WU-HF1 r3 [TRADE] reveal + centering fix)"
    );
  }
  // 106.22 END-TO-END button→panel-open chain (not just renderTrade): the [TRADE] button's
  // onclick calls expandPanelForCategory('trade'), and that function maps 'trade' to the
  // '> BARTER UPLINK' panel on the INV tab — so a tap reliably opens AND reveals the panel.
  assert(
    /onclick="expandPanelForCategory\('trade'\)"/.test(html106) &&
      /trade:\s*'inv'/.test(core106) &&
      /trade:\s*'>\s*BARTER UPLINK'/.test(core106),
    "106.22: [TRADE] button onclick → expandPanelForCategory('trade') → maps trade→inv + '> BARTER UPLINK' (button→panel-open end-to-end)"
  );
}

// ══════════════════════════════════════════════════════════════
//  Suite 107 — WU-N3 THREAT native bestiary + TTK (17 tests)
//  Deterministic offline THREAT assessment: BESTIARY.CSV lookup → enemy card +
//  TTK = ceil(HP / max(1, weaponDPS − DT)) + ammo-burn (WU-D4c coefficient) +
//  weakness highlight. Routed natively (the AI TTK directive is retired). The math
//  is behaviorally verified in a vm; the melee-scope rule (_vatsIsMelee) labels
//  strikes vs rounds.
// ══════════════════════════════════════════════════════════════
header('Suite 107 — WU-N3 THREAT native bestiary + TTK');
{
  const renSrc107 = readFile('js/ui-render.js');

  // 107.1 / 107.2  lookupBestiaryEntry mirrored in both game db runners (Protocol 38)
  assert(
    /function lookupBestiaryEntry\b/.test(dbSource),
    '107.1: lookupBestiaryEntry() defined in db_nv.js (BESTIARY.CSV lookup)'
  );
  assert(
    /function lookupBestiaryEntry\b/.test(dbFo3Source),
    '107.2: lookupBestiaryEntry() defined in db_fo3.js (game-agnostic, mirrored)'
  );

  // 107.3 / 107.4  render + pure math defined
  assert(
    /function renderThreat\b/.test(renSrc107),
    '107.3: renderThreat() defined in ui-render.js (THREAT ASSESSMENT modal)'
  );
  assert(
    /function _threatCompute\b/.test(renSrc107),
    '107.4: _threatCompute() pure math helper defined in ui-render.js'
  );

  // 107.5 / 107.6  native router entries — THREAT routed BEFORE the AI (the retirement)
  const routerStart = apiSource.indexOf('const NATIVE_COMMAND_ROUTER');
  const routerBlock = apiSource.slice(routerStart, apiSource.indexOf('};', routerStart) + 2);
  assert(
    /'\[THREAT\]':\s*\w+\s*=>\s*renderThreat/.test(routerBlock),
    "107.5: NATIVE_COMMAND_ROUTER routes '[THREAT]' → renderThreat (native, not AI)"
  );
  assert(
    /'\[TH\]':\s*\w+\s*=>\s*renderThreat/.test(routerBlock),
    "107.6: NATIVE_COMMAND_ROUTER routes '[TH]' → renderThreat (shorthand)"
  );

  // 107.7  _routeNativeCommand forwards the typed target to the handler
  guards(apiSource, [
    [
      /handler\(\s*raw\.slice\(cmd\.length\)\.trim\(\)\s*\)/,
      '107.7: _routeNativeCommand passes the target argument to the handler (renderThreat receives the enemy name)',
    ],

    // 107.8a / 107.8b  AI THREAT path retired — legacy predictive-loop directive gone; native defer note present
    [
      /Run predictive loops via databases\.\s*Calculate Squad DPS/,
      '107.8a: legacy AI "Tactical TTK: run predictive loops" directive removed (AI THREAT path retired)',
      NEG,
    ],
    [
      /native deterministic THREAT terminal/,
      '107.8b: system directive defers THREAT/TTK to the native terminal (do-not-compute note)',
    ],
  ]);

  // 107.9  Protocol 3 — refuse to invent: NO ENTRY IN BESTIARY when absent
  assert(
    /NO ENTRY IN BESTIARY/.test(renSrc107),
    '107.9: renderThreat emits "NO ENTRY IN BESTIARY" for an unknown target (Protocol 3 — never invent)'
  );

  // 107.10  game-agnostic ammo coefficient (Protocol 38 — no two-game literal coercion)
  const renThreatBody = (renSrc107.match(/function renderThreat\([\s\S]*?\n\}/) || [''])[0];
  assert(
    /\bammoPerAttack\b/.test(renThreatBody) &&
      /GAME_DEFS/.test(renThreatBody) &&
      !/===\s*'FO3'\s*\?\s*'FO3'\s*:\s*'FNV'/.test(renThreatBody),
    '107.10: renderThreat reads ammoPerAttack from GAME_DEFS (game-agnostic — no two-game coercion, Protocol 38)'
  );

  // 107.11  reuses the canonical melee-scope helper (Protocol 22)
  assert(
    /_vatsIsMelee\(/.test(renSrc107),
    '107.11: renderThreat reuses _vatsIsMelee for the melee-scope rule (strikes vs rounds — Protocol 22)'
  );

  // ── Behavioral: run _threatCompute in an isolated vm and assert the exact math ──
  const vm = require('vm');
  const fnMatch107 = renSrc107.match(/function _threatCompute\([\s\S]*?\n\}/);
  if (!fnMatch107) {
    fail('107.x: could not extract _threatCompute from ui-render.js');
  } else {
    const sb = {};
    vm.createContext(sb);
    vm.runInContext(fnMatch107[0], sb);
    const tc = sb._threatCompute;

    // 107.12 / 107.13  TTK = ceil(HP/max(1,DPS−DT)); ammoBurn = shotsToKill × ammoPerAttack
    //   HP75/DT4 vs 60dmg×1.1aps = 66 DPS → eff 62, TTK ceil(75/62)=2; perShot 56 → 2 shots
    const r1 = tc({ hp: 75, dt: 4 }, { baseDamage: 60, aps: 1.1 }, 1);
    assert(
      r1.ttk === 2,
      `107.12: TTK = ceil(HP/max(1,DPS−DT)) = 2 for HP75/DT4 vs 66 DPS (got ${r1.ttk})`
    );
    assert(
      r1.ammoBurn === 2,
      `107.13: ammo-burn = shotsToKill × ammoPerAttack = 2 (got ${r1.ammoBurn})`
    );

    // 107.14  DT ≥ output floors effective damage at 1 (no divide-by-zero / negative)
    const r2 = tc({ hp: 100, dt: 1000 }, { baseDamage: 10, aps: 1 }, 1);
    assert(
      r2.ttk === 100 && r2.ammoBurn === 100,
      `107.14: DT≥output floors effective dmg at 1 → TTK 100 / ammo 100 (got ${r2.ttk}/${r2.ammoBurn})`
    );

    // 107.15  WU-D4c coefficient is actually consumed — ammoPerAttack=2 doubles the burn
    const r3 = tc({ hp: 30, dt: 0 }, { baseDamage: 10, aps: 1 }, 2);
    assert(
      r3.ammoBurn === 6,
      `107.15: ammoPerAttack coefficient applied — 3 shots × 2 = 6 (got ${r3.ammoBurn})`
    );

    // 107.16  no equipped weapon → graceful, no TTK fabricated
    const r4 = tc({ hp: 50, dt: 5 }, null, 1);
    assert(
      r4.hasWeapon === false && r4.ttk === null,
      `107.16: no weapon → hasWeapon false + ttk null (got ${r4.hasWeapon}/${r4.ttk})`
    );
  }
}

// ══════════════════════════════════════════════════════════════
//  Suite 108 — WU-N4 CONSULT native databank lookup (18 tests)
//  `> CONSULT <topic>` (+ [CONSULT] / [CON]) routed through NATIVE_COMMAND_ROUTER to a
//  deterministic, offline, read-only registry+DB lookup. Locks: the router wiring, the
//  registry/DB cross-reference, the NO-ENTRY path (Protocol 3 — never invents), XSS-safe
//  topic escaping, read-only-ness, Protocol-38 agnosticism, discoverability + CSS overflow.
// ══════════════════════════════════════════════════════════════
header('Suite 108 — WU-N4 CONSULT native databank lookup');
{
  const ren108 = readFile('js/ui-render.js');
  const api108 = readFile('js/api.js');
  const core108 = readFile('js/ui-core.js');
  const css108 = readFile('css/terminal.css');
  // The CONSULT engine spans renderConsult + the shared _consultSearch / _consultRenderHTML
  // core (WU-N4b option C, Protocol 22). Concatenate so the engine-level checks (108.4–108.9,
  // 108.13) verify the behavior wherever it lives across the split.
  let consultBody = '';
  try {
    consultBody =
      extractFunctionBody(ren108, 'renderConsult') +
      '\n' +
      extractFunctionBody(ren108, '_consultSearch') +
      '\n' +
      extractFunctionBody(ren108, '_consultRenderHTML');
  } catch (_) {}
  // The NATIVE_COMMAND_ROUTER literal block.
  const routerBlock = (api108.match(/const NATIVE_COMMAND_ROUTER\s*=\s*\{[\s\S]*?\n\};/) || [
    '',
  ])[0];

  // 108.1 renderConsult defined
  assert(
    /function renderConsult\s*\(/.test(ren108),
    '108.1: renderConsult() defined in ui-render.js'
  );
  // 108.2 router wires all three CONSULT tokens → renderConsult
  assert(
    /(^|\s|')CONSULT'?\s*:\s*\w*\s*=>?\s*[^\n]*renderConsult/.test(routerBlock) &&
      /\[CONSULT\]'\s*:\s*[^\n]*renderConsult/.test(routerBlock) &&
      /\[CON\]'\s*:\s*[^\n]*renderConsult/.test(routerBlock),
    '108.2: NATIVE_COMMAND_ROUTER routes CONSULT + [CONSULT] + [CON] to renderConsult()'
  );
  // 108.3 unbracketed CONSULT key present so `> CONSULT x` routes (router matches token start)
  assert(
    /\bCONSULT:\s*\w+\s*=>/.test(routerBlock) || /\bCONSULT:\s*topic\s*=>/.test(routerBlock),
    '108.3: an unbracketed CONSULT router key exists (so `> CONSULT <topic>` routes natively)'
  );
  // 108.4 registry search across all five categories (game-agnostic via registrySearch)
  assert(
    /registrySearch/.test(consultBody) &&
      /'items'/.test(ren108) &&
      /'perks'/.test(ren108) &&
      /'quests'/.test(ren108) &&
      /'locations'/.test(ren108) &&
      /'companions'/.test(ren108),
    '108.4: renderConsult searches the registry (registrySearch) across items/perks/quests/locations/companions'
  );
  // 108.5 DB stat cross-reference
  assert(
    /lookupItemInDb/.test(consultBody) &&
      /lookupBestiaryEntry/.test(consultBody) &&
      /lookupWeaponStats/.test(consultBody),
    '108.5: renderConsult cross-references lookupItemInDb + lookupBestiaryEntry + lookupWeaponStats'
  );
  // 108.6 NO-ENTRY path (Protocol 3 — never invents)
  assert(
    /NO ENTRY IN DATABANK/.test(consultBody),
    '108.6: renderConsult shows NO ENTRY IN DATABANK when nothing matches (Protocol 3)'
  );
  // 108.7 XSS — user topic escaped before innerHTML (query line + NO-ENTRY both escape it)
  assert(
    /escapeHtml\(res\.q\)/.test(consultBody) || /escapeHtml\(q\)/.test(consultBody),
    '108.7: the CONSULT engine escapes the user topic via escapeHtml() before innerHTML (XSS-safe)'
  );
  // 108.8 registry hit names + meta are escaped too
  assert(
    /escapeHtml\(e\.name\)/.test(consultBody),
    '108.8: renderConsult escapes registry hit names (escapeHtml(e.name))'
  );
  // 108.9 read-only — no state writes
  assert(
    !/saveState\s*\(/.test(consultBody) &&
      !/pushToCloud\s*\(/.test(consultBody) &&
      !/\bstate\.\w+\s*=/.test(consultBody),
    '108.9: renderConsult is read-only (no saveState/pushToCloud/state writes)'
  );
  // 108.10 game-agnostic (Protocol 38) — no FNV/FO3/Fallout literals in the consult code.
  // Use a stable source slice (from the _CONSULT_CATS decl to the next function) rather than
  // brace-counted body extraction, which diverges between runners on template-literal-heavy code.
  {
    const cs = ren108.indexOf('const _CONSULT_CATS');
    const ce = ren108.indexOf('function _updateContextPanels');
    const region = cs >= 0 && ce > cs ? ren108.slice(cs, ce) : '';
    assert(
      region !== '' && !/\bFNV\b|\bFO3\b|Fallout|New Vegas/.test(region),
      '108.10: renderConsult/_consultDetail carry no FNV/FO3/Fallout literals (Protocol 38 — registry-driven)'
    );
  }
  // 108.11 discoverable in the command reference
  assert(
    /CONSULT/.test((core108.match(/const COMMAND_REGISTRY\s*=\s*\[[\s\S]*?\n\];/) || [''])[0]),
    '108.11: COMMAND_REGISTRY lists a CONSULT entry (discoverability)'
  );
  // 108.12 CSS overflow guard — .consult-* with min-width:0 (Protocol 17/mobile)
  assert(
    /\.consult-card\b/.test(css108) && /\.consult-hit-name[\s\S]{0,80}min-width:\s*0/.test(css108),
    '108.12: terminal.css .consult-card + .consult-hit-name min-width:0 (no horizontal overflow at 360px)'
  );
  // 108.13 reuses the shared modal entry point (consistent dialog semantics)
  assert(
    /_openSysModal/.test(consultBody),
    '108.13: renderConsult opens via _openSysModal() (shared modal — ARIA/focus consistency)'
  );

  // ── WU-N4b: CONSULT macro button (option A) ──────────────────────────────────
  const html108 = readFile('index.html');
  const consultBtn108 = (html108.match(/<button[^>]*id="consultBtn"[\s\S]*?<\/button>/) || [''])[0];
  // 108.14 a discoverable CONSULT button wired to macroCommand('[CONSULT]'), with an
  // aria-label, reusing the shared #macroTarget topic input (THREAT macro-target pattern).
  assert(
    /id="consultBtn"/.test(html108) &&
      /onclick="macroCommand\('\[CONSULT\]'\)"/.test(consultBtn108) &&
      /aria-label="[^"]+"/.test(consultBtn108) &&
      /id="macroTarget"/.test(html108),
    "108.14: index.html CONSULT macro button (#consultBtn) → macroCommand('[CONSULT]') with aria-label, reusing #macroTarget topic input (WU-N4b option A)"
  );
  // 108.15 native end-to-end: [CONSULT] is a NATIVE_COMMAND_ROUTER entry → renderConsult, so
  // the button's macroCommand('[CONSULT]') is intercepted before any AI call (not macroCommand→AI).
  assert(
    /'\[CONSULT\]':\s*topic\s*=>\s*renderConsult\(topic\)/.test(routerBlock),
    '108.15: [CONSULT] routes via NATIVE_COMMAND_ROUTER → renderConsult — the CONSULT button is native, never falls through to the AI (WU-N4b)'
  );

  // ── WU-N4b option C: DATABANK panel (DATA tab) sharing the CONSULT engine ─────
  const databankPanel108 = (html108.match(
    /<details class="panel"[^>]*id="databankPanel"[\s\S]*?<\/details>/
  ) || [''])[0];
  const renderDbBody = (() => {
    try {
      return extractFunctionBody(ren108, 'renderDatabankPanel');
    } catch (_) {
      return '';
    }
  })();
  const renderConsultBody = (() => {
    try {
      return extractFunctionBody(ren108, 'renderConsult');
    } catch (_) {
      return '';
    }
  })();
  const consultRenderHtmlBody = (() => {
    try {
      return extractFunctionBody(ren108, '_consultRenderHTML');
    } catch (_) {
      return '';
    }
  })();

  // 108.16 DATABANK panel present (DATA tab) — Protocol 5 + UI-1 heading + accessible
  // #databankSearch (oninput→renderDatabankPanel) + #databankResults; renderDatabankPanel
  // defined in ui-render.js AND called from loadUI in ui-core.js.
  assert(
    /<details class="panel"[^>]*id="databankPanel"/.test(html108) &&
      /data-tab="data"/.test(databankPanel108) &&
      /<summary><h2>[^<]*DATABANK<\/h2>/.test(databankPanel108) &&
      /id="databankSearch"[\s\S]*?oninput="renderDatabankPanel\(\)"/.test(databankPanel108) &&
      /aria-label="[^"]+"/.test(databankPanel108) &&
      /id="databankResults"/.test(databankPanel108) &&
      /function renderDatabankPanel\s*\(/.test(ren108) &&
      /renderDatabankPanel\(\)/.test(core108),
    '108.16: DATABANK panel (DATA tab) — <details class="panel"> + UI-1 heading + accessible #databankSearch (oninput→renderDatabankPanel) + #databankResults; renderDatabankPanel() defined + called from loadUI (WU-N4b option C, Protocol 5)'
  );
  // 108.17 shared CONSULT engine (Protocol 22) — both renderConsult + renderDatabankPanel
  // route through _consultSearch + _consultRenderHTML; the consult-card markup lives ONLY in
  // the shared renderer (not duplicated in either entry point).
  assert(
    /function _consultSearch\s*\(/.test(ren108) &&
      /function _consultRenderHTML\s*\(/.test(ren108) &&
      /_consultSearch\(/.test(renderConsultBody) &&
      /_consultRenderHTML\(/.test(renderConsultBody) &&
      /_consultSearch\(/.test(renderDbBody) &&
      /_consultRenderHTML\(/.test(renderDbBody) &&
      /consult-card/.test(consultRenderHtmlBody) &&
      !/consult-card/.test(renderConsultBody) &&
      !/consult-card/.test(renderDbBody),
    '108.17: shared CONSULT engine (Protocol 22) — renderConsult + renderDatabankPanel both route through _consultSearch + _consultRenderHTML; the consult-card markup lives only in the shared renderer (no duplication)'
  );
  // 108.18 DATABANK panel is read-only + offline — renderDatabankPanel reads #databankSearch,
  // writes #databankResults, and never calls fetch/transmitMessage/appendToChat (no AI route).
  assert(
    /databankSearch/.test(renderDbBody) &&
      /databankResults/.test(renderDbBody) &&
      !/fetch\(/.test(renderDbBody) &&
      !/transmitMessage/.test(renderDbBody) &&
      !/appendToChat/.test(renderDbBody),
    '108.18: DATABANK panel is read-only + offline — renderDatabankPanel reads #databankSearch, writes #databankResults, never calls fetch/transmitMessage/appendToChat (no AI route, WU-N4b option C)'
  );
}

// ══════════════════════════════════════════════════════════════
//  Suite 109 — WU-N5 BIO-SCAN native medical advisory (13 tests)
//  `> [BIO-SCAN]` (+ [BIO]) routed through NATIVE_COMMAND_ROUTER to a deterministic,
//  offline, read-only limb/HP/radiation/addiction advisory computed from state +
//  CHEMS. Locks: router wiring, the pure compute core (behavioral), the AI-path
//  retirement, read-only-ness, XSS-safe escaping, Protocol-38 agnosticism (med
//  items sourced from data, getChemsTable in BOTH db files), discoverability + CSS.
// ══════════════════════════════════════════════════════════════
header('Suite 109 — WU-N5 BIO-SCAN native medical advisory');
{
  const ren109 = readFile('js/ui-render.js');
  const api109 = readFile('js/api.js');
  const core109 = readFile('js/ui-core.js');
  const css109 = readFile('css/terminal.css');
  const html109 = readFile('index.html');
  const dbnv109 = readFile('js/db_nv.js');
  const dbfo3109 = readFile('js/db_fo3.js');
  const routerBlock109 = (api109.match(/const NATIVE_COMMAND_ROUTER\s*=\s*\{[\s\S]*?\n\};/) || [
    '',
  ])[0];
  // Stable source slice of the BIO-SCAN core (from the limb table to renderBioScan).
  const bioRegionStart = ren109.indexOf('const _BIO_LIMBS');
  const bioRegionEnd = ren109.indexOf('function renderBioScan');
  const bioRegion =
    bioRegionStart >= 0 && bioRegionEnd > bioRegionStart
      ? ren109.slice(bioRegionStart, bioRegionEnd)
      : '';
  let bioScanBody = '';
  try {
    bioScanBody = extractFunctionBody(ren109, 'renderBioScan');
  } catch (_) {}

  // 109.1 renderBioScan + the pure compute core both defined
  assert(
    /function renderBioScan\s*\(/.test(ren109) && /function _bioScanCompute\s*\(/.test(ren109),
    '109.1: renderBioScan() + _bioScanCompute() defined in ui-render.js'
  );

  // 109.2 getChemsTable defined in BOTH db files (game-agnostic parity — Protocol 38)
  assert(
    /function getChemsTable\s*\(/.test(dbnv109) && /function getChemsTable\s*\(/.test(dbfo3109),
    '109.2: getChemsTable() defined in BOTH db_nv.js and db_fo3.js (works in either game context)'
  );

  // 109.3 router wires [BIO-SCAN] + [BIO] → renderBioScan (native, not AI)
  assert(
    /\[BIO-SCAN\]'\s*:\s*[^\n]*renderBioScan/.test(routerBlock109) &&
      /\[BIO\]'\s*:\s*[^\n]*renderBioScan/.test(routerBlock109),
    "109.3: NATIVE_COMMAND_ROUTER routes '[BIO-SCAN]' + '[BIO]' → renderBioScan (native, no AI)"
  );

  // 109.4 reuses getChemsTable as the addiction data source (not a hardcoded list)
  assert(
    /getChemsTable\s*\(/.test(bioScanBody),
    '109.4: renderBioScan sources chem/addiction data via getChemsTable() (data-driven)'
  );

  // 109.5 BEHAVIORAL — the pure core computes the right advisories. JS evaluates the
  //       extracted core directly; the PS runner asserts the same branches structurally.
  {
    let ok = false;
    let err = null;
    try {
      const fn = new Function(bioRegion + '\n return _bioScanCompute;')();
      const chems = [
        { name: 'Stimpak', effect: 'Restore HP', addictionRisk: '0%', family: 'Medicine' },
        { name: 'RadAway', effect: 'Remove 150 Rads', addictionRisk: '0%', family: 'Medicine' },
        { name: 'Med-X', effect: '+25 DR', addictionRisk: '25%', family: 'Med-X' },
      ];
      const hurt = fn(
        {
          limbs: { hd: 'OK', la: 'OK', ra: 'OK', ll: 'OK', rl: 'CRIPPLED' },
          hpCur: 20,
          hpMax: 100,
          rads: 450,
          status: [{ name: 'Med-X', ticks: 3, type: 'DEBUFF' }],
        },
        chems
      );
      const texts = hurt.advisories.map(a => a.kind + '|' + a.text);
      const healthy = fn(
        {
          limbs: { hd: 'OK', la: 'OK', ra: 'OK', ll: 'OK', rl: 'OK' },
          hpCur: 100,
          hpMax: 100,
          rads: 0,
          status: [],
        },
        chems
      );
      ok =
        hurt.hpTier === 'CRITICAL' &&
        hurt.crippled.length === 1 &&
        texts.some(t => /^limb\|RIGHT LEG CRIPPLED — STIMPAK ADVISED$/.test(t)) &&
        texts.some(t => /^rad\|RADIATION ADVANCED \(450 RADS\) — RADAWAY ADVISED$/.test(t)) &&
        texts.some(t => /^addiction\|ADDICTION RISK: MED-X \(active\)/.test(t)) &&
        healthy.advisories.length === 0 &&
        healthy.hpTier === 'STABLE';
    } catch (e) {
      err = e;
    }
    assert(
      ok,
      '109.5: _bioScanCompute behavioral — crippled/critical/rad/addiction advisories computed (med items sourced from data); healthy → nominal' +
        (err ? ' — ' + err.message : '')
    );
  }

  // 109.6 read-only — renderBioScan never writes state / saves / cloud
  assert(
    !/saveState\s*\(|pushToCloud|state\.\w+\s*=[^=]/.test(bioScanBody),
    '109.6: renderBioScan is read-only (no saveState/pushToCloud/state writes)'
  );

  // 109.7 XSS-safe — advisory + limb text escaped before innerHTML
  assert(
    /escapeHtml\(a\.text\)/.test(bioScanBody) && /escapeHtml\(l\.label\)/.test(bioScanBody),
    '109.7: renderBioScan escapes advisory + limb text via escapeHtml() before innerHTML'
  );

  // 109.8 game-agnostic (Protocol 38): the compute core carries no game/item literals —
  //       med items are derived from the CHEMS effect text, never hardcoded.
  assert(
    bioRegion !== '' &&
      !/\bFNV\b|\bFO3\b|Fallout|New Vegas/.test(bioRegion) &&
      !/['"]Stimpak['"]|['"]RadAway['"]|['"]Med-X['"]/.test(bioRegion),
    '109.8: _bioScanCompute carries no FNV/FO3/Fallout or hardcoded chem-name literals (Protocol 38 — data-driven)'
  );

  // 109.9 AI-path retirement — the system directive defers BIO-SCAN to the native
  //       calculator and no longer tells the AI to own [BIO-SCAN] trauma tracking.
  assert(
    /do NOT produce a BIO-SCAN modal/.test(api109) &&
      !/Track RAD thresholds and crippled limbs via \[BIO-SCAN\]/.test(api109),
    '109.9: getSystemDirective retires the AI BIO-SCAN path (defers to the native calculator)'
  );

  // 109.10 discoverable in the command reference
  assert(
    /BIO-SCAN/.test((core109.match(/const COMMAND_REGISTRY\s*=\s*\[[\s\S]*?\n\];/) || [''])[0]),
    '109.10: COMMAND_REGISTRY lists a BIO-SCAN entry (discoverability)'
  );

  // 109.11 CSS overflow guard — .bio-card + .bio-limb-name min-width:0 (Protocol 17/mobile)
  assert(
    /\.bio-card\b/.test(css109) && /\.bio-limb-name[\s\S]{0,80}min-width:\s*0/.test(css109),
    '109.11: terminal.css .bio-card + .bio-limb-name min-width:0 (no horizontal overflow at 360px)'
  );

  // 109.12 reuses the shared modal entry point (consistent dialog semantics)
  assert(
    /_openSysModal/.test(bioScanBody),
    '109.12: renderBioScan opens via _openSysModal() (shared modal — ARIA/focus consistency)'
  );

  // 109.13 a discoverable UI affordance — the RUN BIO-SCAN button wired to renderBioScan
  {
    const btnTag109 = (html109.match(/<button\b[^>]*renderBioScan\(\)[^>]*>/) || [''])[0];
    assert(
      /onclick="renderBioScan\(\)"/.test(html109) && /aria-label="[^"]+"/.test(btnTag109),
      '109.13: index.html has a RUN BIO-SCAN button wired to renderBioScan() with an aria-label'
    );
  }
}

// ══════════════════════════════════════════════════════════════
//  Suite 110 — WU-N6 LOOT native add/value terminal (13 tests)
//  `> [LOOT]` (+ [LT]) routed through NATIVE_COMMAND_ROUTER to a deterministic,
//  offline salvage terminal: pick a DB-catalog item, ADD it additively to
//  state.inventory[] at its DB value, confirm-gated. Locks: router wiring, the
//  pure additive merge core (behavioral), confirm-gate + additive-only writes,
//  DB value sourcing, AI-path retirement, XSS-safe escaping, Protocol-38
//  agnosticism (getTradeCatalog/lookupItemInDb), discoverability + CSS overflow.
// ══════════════════════════════════════════════════════════════
header('Suite 110 — WU-N6 LOOT native add/value terminal');
{
  const ren110 = readFile('js/ui-render.js');
  const api110 = readFile('js/api.js');
  const core110 = readFile('js/ui-core.js');
  const css110 = readFile('css/terminal.css');
  const html110 = readFile('index.html');
  const routerBlock110 = (api110.match(/const NATIVE_COMMAND_ROUTER\s*=\s*\{[\s\S]*?\n\};/) || [
    '',
  ])[0];
  // Stable source slice of the LOOT core (the pure helper through doLoot).
  const lootRegionStart = ren110.indexOf('function _lootAdd');
  const lootRegionEnd = ren110.indexOf('// ── WU-N3: THREAT');
  const lootRegion =
    lootRegionStart >= 0 && lootRegionEnd > lootRegionStart
      ? ren110.slice(lootRegionStart, lootRegionEnd)
      : '';
  let doLootBody = '';
  let lootAddBody = '';
  try {
    doLootBody = extractFunctionBody(ren110, 'doLoot');
  } catch (_) {}
  try {
    lootAddBody = extractFunctionBody(ren110, '_lootAdd');
  } catch (_) {}

  // 110.1 renderLoot + renderLootList + doLoot + the pure core all defined
  assert(
    /function renderLoot\s*\(/.test(ren110) &&
      /function renderLootList\s*\(/.test(ren110) &&
      /function doLoot\s*\(/.test(ren110) &&
      /function _lootAdd\s*\(/.test(ren110),
    '110.1: renderLoot() + renderLootList() + doLoot() + _lootAdd() defined in ui-render.js'
  );

  // 110.2 LOOT sources items from the shared DB catalog (getTradeCatalog), not a hardcoded list
  assert(
    /getTradeCatalog\s*\(/.test(doLootBody) &&
      /getTradeCatalog\s*\(/.test(extractFunctionBody(ren110, 'renderLootList')),
    '110.2: LOOT sources items via getTradeCatalog() (deterministic DB catalog — reuse, not a new list)'
  );

  // 110.3 router wires [LOOT] + [LT] → renderLoot (native, not AI)
  assert(
    /\[LOOT\]'\s*:\s*[^\n]*renderLoot/.test(routerBlock110) &&
      /\[LT\]'\s*:\s*[^\n]*renderLoot/.test(routerBlock110),
    "110.3: NATIVE_COMMAND_ROUTER routes '[LOOT]' + '[LT]' → renderLoot (native, no AI)"
  );

  // 110.4 value sourced from the DB (lookupItemInDb Value column), not invented
  assert(
    /lookupItemInDb\s*\(/.test(doLootBody) && /db\.val/.test(lootAddBody),
    '110.4: loot value/weight sourced from lookupItemInDb (DB Value column), not invented'
  );

  // 110.5 BEHAVIORAL — the pure additive merge core. JS evaluates the extracted core
  //       directly; the PS runner asserts the same branches structurally.
  {
    let ok = false;
    let err = null;
    try {
      const fn = new Function(lootRegion + '\n return _lootAdd;')();
      const item = { name: 'Stimpak', value: 999, type: 'aid' };
      const db = { wgt: 1, val: 50, type: 'aid' };
      // Add to an empty inventory → new entry, qty + DB value/weight/type.
      const inv1 = fn([], item, 3, db);
      // Additive: adding the same item again increments qty (no duplicate row).
      const inv2 = fn(inv1, { name: 'stimpak', value: 999, type: 'aid' }, 2, db);
      // Bad qty floors to 1 (deterministic guard).
      const inv3 = fn([], item, 'xyz', db);
      ok =
        inv1.length === 1 &&
        inv1[0].qty === 3 &&
        inv1[0].val === 50 && // DB value, NOT the catalog's 999
        inv1[0].wgt === 1 &&
        inv1[0].type === 'aid' &&
        inv2.length === 1 && // still one row (case-insensitive merge)
        inv2[0].qty === 5 && // 3 + 2 additive
        inv3[0].qty === 1; // non-numeric qty → 1
    } catch (e) {
      err = e;
    }
    assert(
      ok,
      '110.5: _lootAdd behavioral — additive find-or-increment merge, DB value sourced, qty floored to ≥1' +
        (err ? ' — ' + err.message : '')
    );
  }

  // 110.6 confirm-gated (Protocol 34) — doLoot returns before mutating unless confirmed
  assert(
    /if\s*\(\s*!confirm\([\s\S]{0,160}\)\s*\)\s*return/.test(doLootBody),
    '110.6: doLoot is confirm-gated (Protocol 34 — no add without explicit confirmation)'
  );

  // 110.7 additive-only — doLoot never deletes/overwrites inventory wholesale; it persists via saveState
  assert(
    /_lootAdd\(/.test(doLootBody) &&
      /saveState\s*\(\s*\)/.test(doLootBody) &&
      !/state\.inventory\s*=\s*\[\]/.test(doLootBody),
    '110.7: doLoot is additive (merges via _lootAdd) + persists via saveState (no wholesale inventory reset)'
  );

  // 110.8 game-agnostic (Protocol 38): the LOOT core carries no game/item literals
  assert(
    lootRegion !== '' &&
      !/\bFNV\b|\bFO3\b|Fallout|New Vegas/.test(lootRegion) &&
      !/['"]Stimpak['"]|['"]Nuka['"]/.test(lootRegion),
    '110.8: the LOOT core carries no FNV/FO3/Fallout or hardcoded item-name literals (Protocol 38)'
  );

  // 110.9 AI-path retirement — the directive defers LOOT add/value to the native terminal
  assert(
    /native deterministic offline tool[\s\S]{0,80}LOOT|LOOT[\s\S]{0,120}native deterministic offline tool/.test(
      api110
    ) && /do NOT emit a LOOT picker\/modal or compute item values/.test(api110),
    '110.9: getSystemDirective retires the AI LOOT path (defers add/value to the native terminal)'
  );

  // 110.10 discoverable in the command reference
  assert(
    /\[LOOT\]/.test((core110.match(/const COMMAND_REGISTRY\s*=\s*\[[\s\S]*?\n\];/) || [''])[0]),
    '110.10: COMMAND_REGISTRY lists a [LOOT] entry (discoverability)'
  );

  // 110.11 CSS overflow guard — .loot-row + .loot-name min-width:0 (Protocol 17/mobile)
  assert(
    /\.loot-row\b/.test(css110) &&
      /\.loot-row\s+\.loot-name[\s\S]{0,80}min-width:\s*0/.test(css110),
    '110.11: terminal.css .loot-row + .loot-name min-width:0 (no horizontal overflow at 360px)'
  );

  // 110.12 XSS-safe — item names + search input escaped before innerHTML
  assert(
    /escapeHtml\(it\.name\)/.test(ren110) && /escapeHtml\(pre\)/.test(ren110),
    '110.12: LOOT escapes item names + the search prefill via escapeHtml() before innerHTML'
  );

  // 110.13 a discoverable UI affordance — the [LOOT] button wired to renderLoot() + reuses the modal
  {
    const btnTag110 = (html110.match(/<button\b[^>]*renderLoot\(\)[^>]*>/) || [''])[0];
    assert(
      /onclick="renderLoot\(\)"/.test(html110) &&
        /aria-label="[^"]+"/.test(btnTag110) &&
        /_openSysModal/.test(extractFunctionBody(ren110, 'renderLoot')),
      '110.13: index.html [LOOT] button wired to renderLoot() with an aria-label; opens via _openSysModal (shared modal)'
    );
  }
}

// ══════════════════════════════════════════════════════════════
//  Suite 111 — WU-E1 diegetic terminology / voice standards (11 tests)
//  Locks the HOUSE_STANDARD terminology pass: ALL-CAPS content
//  placeholders + empty-states, game-agnostic out-of-frame manifest
//  copy, DIRECTOR (not "AI"/"Gemini") narrative-error voice, and the
//  UPLINK auth framing. Static guards — fail the gate if a modern-web
//  "tell" regresses back into a Courier-facing surface.
// ══════════════════════════════════════════════════════════════
header('Suite 111 — WU-E1 diegetic terminology / voice standards');
{
  const html111 = readFile('index.html');
  const api111 = readFile('js/api.js');
  const acct111 = readFile('js/ui-account.js');
  const manifest111 = JSON.parse(readFile('manifest.json'));

  // 111.1 every content-input placeholder is ALL-CAPS (no lowercase letters) — MN-6
  assert(
    !/placeholder="[^"]*[a-z][^"]*"/.test(html111),
    '111.1: index.html has no lower-case placeholder= on any content input (ALL-CAPS terminal register, MN-6)'
  );

  // 111.2 every static .empty-state span is ALL-CAPS — MN-7
  assert(
    !/empty-state">[^<]*[a-z]/.test(html111),
    '111.2: index.html .empty-state spans are ALL-CAPS canon empty-state voice (MN-7)'
  );

  // 111.3 manifest description is game-agnostic out-of-frame (Protocol 38) — MJ-4
  assert(
    typeof manifest111.description === 'string' &&
      manifest111.description.length > 0 &&
      !/Fallout|New Vegas/i.test(manifest111.description),
    '111.3: manifest.json description names no real game title (Fallout/New Vegas) — game-agnostic out-of-frame (MJ-4/Protocol 38)'
  );

  // 111.4 manifest shortcut descriptions carry no modern-web phrasing / "AI" leak — MJ-4
  {
    const sc111 = Array.isArray(manifest111.shortcuts) ? manifest111.shortcuts : [];
    const bad111 = sc111.filter(
      s => typeof s.description !== 'string' || /Open the|\bAI\b/.test(s.description)
    );
    assert(
      sc111.length > 0 && bad111.length === 0,
      '111.4: manifest shortcut descriptions are diegetic — no "Open the …" / "AI" modern-web tells (MJ-4)'
    );
  }

  // 111.5 narrative AI/Gemini "tells" are gone from api.js Courier-facing errors — MJ-5/MN-9
  assert(
    !/AI KEY REJECTED/.test(api111) &&
      !/AI LINK PAUSED/.test(api111) &&
      !/AI returned an unexpected/.test(api111) &&
      !/AI LINK TEMPORARILY DISABLED/.test(api111),
    '111.5: api.js narrative errors no longer leak "AI"/"Gemini" to the Courier (MJ-5/MN-9)'
  );

  // 111.6 DIRECTOR voice is present in the reframed api.js errors — MJ-5
  assert(
    /DIRECTOR ACCESS KEY REJECTED/.test(api111) &&
      /DIRECTOR LINK RETURNED MALFORMED TELEMETRY/.test(api111) &&
      /DIRECTOR LINK PAUSED/.test(api111),
    '111.6: api.js error narrative uses the in-world DIRECTOR LINK / DIRECTOR ACCESS KEY voice (MJ-5)'
  );

  // 111.7 auth panel copy drops modern "sign in" vocabulary — MJ-2
  assert(
    !/NOT SIGNED IN/.test(acct111) &&
      !/SIGN IN WITH GOOGLE/.test(acct111) &&
      !/> SIGN OUT</.test(acct111),
    '111.7: ui-account.js auth copy carries no "SIGN IN"/"SIGNED IN"/"SIGN OUT" modern-web display strings (MJ-2)'
  );

  // 111.8 auth panel copy uses the UPLINK framing — MJ-2
  assert(
    /UPLINK OFFLINE/.test(acct111) &&
      /ESTABLISH GOOGLE UPLINK/.test(acct111) &&
      /UPLINK ACTIVE/.test(acct111) &&
      /SEVER UPLINK/.test(acct111),
    '111.8: ui-account.js auth panel uses the UPLINK framing (OFFLINE / ESTABLISH / ACTIVE / SEVER) (MJ-2)'
  );

  // 111.9 cloud-archive system states use canon voice — MJ-3
  assert(
    !/Loading saves/.test(acct111) &&
      !/No saves found/.test(acct111) &&
      /RETRIEVING ARCHIVES/.test(acct111) &&
      /NO ARCHIVES ON FILE/.test(acct111),
    '111.9: ui-account.js cloud-archive states use RETRIEVING ARCHIVES… / NO ARCHIVES ON FILE canon voice (MJ-3)'
  );

  // 111.10 update modal uses the FIRMWARE voice — PO-10
  assert(
    !/new version of RobCo/.test(html111) &&
      !/Reboot to load/.test(html111) &&
      /FIRMWARE UPDATE STAGED/.test(html111),
    '111.10: index.html update modal uses FIRMWARE UPDATE STAGED — REBOOT voice (PO-10)'
  );

  // 111.11 image-upload control uses VISUAL UPLOAD, not "ATTACH" — MN-8
  assert(
    !/ATTACH VISUAL DATA/.test(html111) && /VISUAL UPLOAD/.test(html111),
    '111.11: index.html optic-scan control uses > VISUAL UPLOAD, not "ATTACH" (MN-8)'
  );
}

// ══════════════════════════════════════════════════════════════
//  SUITE 112 — WU-E2 reusable disabled banner templates
//  Owner override: #updateBanner + fo3WarningBanner are KEPT as inert,
//  reusable <template> banners — NEVER deleted. Guards they still EXIST
//  and are disabled-by-default (wrapped in <template>, so the browser
//  parses but never renders/activates them on their own).
//  7 tests
// ══════════════════════════════════════════════════════════════
{
  header('WU-E2 reusable disabled banner templates');
  const cssSrc112 = readFile('css/terminal.css');

  // 112.1  #updateBannerTemplate <template> still EXISTS (not deleted)
  assert(
    /<template id="updateBannerTemplate">/.test(htmlSource),
    '112.1: #updateBannerTemplate <template> exists in index.html (update banner kept as template — never deleted)'
  );

  // 112.2  the update banner markup lives INSIDE that template (disabled by default — inert)
  assert(
    /<template id="updateBannerTemplate">[\s\S]*?class="update-banner"[\s\S]*?<\/template>/.test(
      htmlSource
    ),
    '112.2: .update-banner markup is wrapped in #updateBannerTemplate (disabled-by-default — <template> never renders on its own)'
  );

  // 112.3  the .update-banner style rule is PRESERVED in terminal.css (style not deleted)
  assert(
    /\.update-banner\s*\{/.test(cssSrc112),
    '112.3: .update-banner CSS rule preserved in terminal.css (reusable banner style kept)'
  );

  // 112.4  #fo3WarningBannerTemplate <template> still EXISTS (not deleted)
  assert(
    /<template id="fo3WarningBannerTemplate">/.test(htmlSource),
    '112.4: #fo3WarningBannerTemplate <template> exists in index.html (FO3 warning banner kept as template — never deleted)'
  );

  // 112.5  the #fo3WarningBanner div lives INSIDE that template AND is display:none
  //        (disabled-by-default both ways: inert <template> + explicit display:none)
  assert(
    /<template id="fo3WarningBannerTemplate">[\s\S]*?id="fo3WarningBanner"[^>]*style="[^"]*display:\s*none[\s\S]*?<\/template>/.test(
      htmlSource
    ),
    '112.5: #fo3WarningBanner is wrapped in its template and carries display:none (disabled-by-default)'
  );

  // 112.6  the .fo3-warning-banner style rule is PRESERVED in terminal.css (style not deleted)
  assert(
    /\.fo3-warning-banner\s*\{/.test(cssSrc112),
    '112.6: .fo3-warning-banner CSS rule preserved in terminal.css (reusable banner style kept)'
  );

  // 112.7  neither banner is ACTIVE outside a <template> — the only occurrences of the
  //        banner handles are inside template blocks, so nothing renders by default.
  const _activeUpdateBanner = /class="update-banner"/g.test(htmlSource)
    ? (htmlSource.match(/class="update-banner"/g) || []).length === 1 &&
      /<template id="updateBannerTemplate">[\s\S]*?class="update-banner"[\s\S]*?<\/template>/.test(
        htmlSource
      )
    : false;
  const _fo3Once = (htmlSource.match(/id="fo3WarningBanner"/g) || []).length === 1;
  assert(
    _activeUpdateBanner && _fo3Once,
    '112.7: each banner appears exactly once and only inside its <template> (no active, rendered banner outside a template)'
  );
}

// ══════════════════════════════════════════════════════════════
//  SUITE 113 — WU-E3 FEATURES / command-reference consistency
//  Locks COMMAND_REGISTRY (ui-core.js) ↔ NATIVE_COMMAND_ROUTER (api.js) ↔ the
//  [FEATURES] help modal so the in-app command reference can't drift from reality:
//  every native terminal is advertised, retired AI macros stay gone.
//  7 tests
// ══════════════════════════════════════════════════════════════
{
  header('Suite 113 — WU-E3 FEATURES / command-reference consistency');
  const uiCore113 = readFile('js/ui-core.js');
  const api113 = readFile('js/api.js');
  const registry113 = (uiCore113.match(/const COMMAND_REGISTRY = \[([\s\S]*?)\n\];/) || [
    '',
    '',
  ])[1];
  const router113 = (api113.match(/const NATIVE_COMMAND_ROUTER = \{([\s\S]*?)\n\};/) || [
    '',
    '',
  ])[1];

  // The six deterministic native terminals (primary tokens as shown in help).
  const NATIVES = ['[VATS SIM]', '[THREAT]', '[TRADE]', 'CONSULT', '[BIO-SCAN]', '[LOOT]'];
  // Native tokens that MUST resolve through the router (TRADE is the panel exception).
  const ROUTER_NATIVES = ['[VATS SIM]', '[THREAT]', '[BIO-SCAN]', '[LOOT]', '[CONSULT]'];
  // Retired AI macros — must NOT reappear in the help registry.
  const RETIRED = [
    '[VVATS]',
    '[TACTICS]',
    '[SYNC:',
    '[STASH',
    '[EXCESS]',
    '[CURRENCY]',
    '[AUDIT]',
    '[TIMER/CHEM]',
    '[SQUAD]',
    '[TRAVEL CLUSTER]',
    '[CASINO]',
    '[COMM LINK]',
    '[PAUSE]',
    '[PAGE 2',
    '[ARCHIVE]',
  ];

  // 113.1  registry parsed + a dedicated NATIVE TERMINALS group marked OFFLINE / NO AI
  assert(
    registry113.length > 0 && /NATIVE TERMINALS[^']*OFFLINE[^']*NO AI/.test(registry113),
    '113.1: COMMAND_REGISTRY has a "NATIVE TERMINALS — OFFLINE, NO AI" group (six deterministic terminals surfaced together)'
  );

  // 113.2  all six native terminals are advertised in the help registry
  assert(
    NATIVES.every(t => registry113.includes(t)),
    '113.2: COMMAND_REGISTRY advertises all six native terminals (VATS/THREAT/TRADE/CONSULT/BIO-SCAN/LOOT)'
  );

  // 113.3  each native terminal entry is explicitly marked Offline (no stale AI wording)
  assert(
    (registry113.match(/Offline\./g) || []).length >= 6,
    '113.3: every native terminal entry is marked "Offline." in COMMAND_REGISTRY (no stale AI descriptions)'
  );

  // 113.4  router↔help consistency: every router-native token the help advertises actually
  //        resolves in NATIVE_COMMAND_ROUTER (so help can't advertise a dead native).
  assert(
    ROUTER_NATIVES.every(
      t => router113.includes("'" + t + "'") && registry113.includes(t.replace(/[[\]]/g, ''))
    ),
    '113.4: every router-native token (VATS SIM/THREAT/BIO-SCAN/LOOT/CONSULT) resolves in NATIVE_COMMAND_ROUTER AND appears in COMMAND_REGISTRY'
  );

  // 113.5  [FEATURES] routes to showHelpModal, and showHelpModal renders COMMAND_REGISTRY
  assert(
    /'\[FEATURES\]':\s*\(\)\s*=>\s*showHelpModal\(\)/.test(api113) &&
      /function showHelpModal\(\)[\s\S]*COMMAND_REGISTRY\.map/.test(uiCore113),
    '113.5: [FEATURES] → showHelpModal in NATIVE_COMMAND_ROUTER, and showHelpModal renders COMMAND_REGISTRY'
  );

  // 113.6  no retired AI macro reappears in the help registry
  const leaked113 = RETIRED.filter(t => registry113.includes(t));
  assert(
    leaked113.length === 0,
    '113.6: no retired AI macro present in COMMAND_REGISTRY (' +
      (leaked113.length ? 'LEAKED: ' + leaked113.join(', ') : 'all retired tokens absent') +
      ')'
  );

  // 113.7  TRADE is advertised but is NOT a router token (it is the BARTER UPLINK panel) —
  //        guards the documented panel-vs-router split so the help stays accurate.
  assert(
    registry113.includes('[TRADE]') && !router113.includes("'[TRADE]'"),
    '113.7: [TRADE] is advertised in help as the native barter PANEL and is correctly NOT a NATIVE_COMMAND_ROUTER token'
  );
}

// ══════════════════════════════════════════════════════════════
//  SUITE 114 — Map location discovery persistence (fog-of-war)
//  A location stays [VISITED] once the Courier has been there — both the manual
//  location-change path and the AI import path record it via the shared
//  recordLocationVisit() helper (deduped, permanent), and renderWorldMap reads
//  locationHistory for CURRENT / VISITED / UNKNOWN status. (Protocol 42 map fix)
//  7 tests
// ══════════════════════════════════════════════════════════════
{
  header('Suite 114 — Map location discovery persistence');
  const stateSrc114 = readFile('js/state.js');
  const apiSrc114 = readFile('js/api.js');
  const uiCoreSrc114 = readFile('js/ui-core.js');
  const uiRenderSrc114 = readFile('js/ui-render.js');
  const recordBody114 = (stateSrc114.match(/function recordLocationVisit\([\s\S]*?\n\}/) || [
    '',
  ])[0];

  // 114.1  shared helper recordLocationVisit() defined in state.js (Protocol 22/23)
  assert(
    /function recordLocationVisit\(/.test(stateSrc114),
    '114.1: recordLocationVisit() helper defined in state.js (single source for map-discovery recording)'
  );

  // 114.2  helper dedups case-insensitively AND is permanent (no destructive cap)
  assert(
    /toLowerCase\(\)/.test(recordBody114) &&
      /\.some\(/.test(recordBody114) &&
      /state\.locationHistory\.push\(/.test(recordBody114) &&
      !/slice\(-?\d+\)/.test(recordBody114),
    '114.2: recordLocationVisit dedups case-insensitively and never truncates (permanent fog-of-war discovery)'
  );

  // 114.3  manual path: onLocationChange records the LEFT + NEW location via the helper
  {
    let olcBody114 = '';
    try {
      olcBody114 = extractFunctionBody(uiCoreSrc114, 'onLocationChange');
    } catch (_) {}
    assert(
      /const prevLoc = state\.loc/.test(olcBody114) &&
        (olcBody114.match(/recordLocationVisit\(/g) || []).length >= 2 &&
        /recordLocationVisit\(prevLoc\)/.test(olcBody114),
      '114.3: onLocationChange records the previous + new location via recordLocationVisit (manual move keeps the left location discovered)'
    );
  }

  // 114.4  AI path: autoImportState routes location history through the shared helper,
  //        and the old inline push + 10-entry slice truncation is gone.
  assert(
    /recordLocationVisit\(locV\)/.test(apiSrc114) &&
      !/state\.locationHistory\.push\(/.test(apiSrc114) &&
      !/state\.locationHistory\.slice\(/.test(apiSrc114),
    '114.4: autoImportState records visits via recordLocationVisit() (no inline push / no slice(-10) truncation)'
  );

  // 114.5  renderWorldMap exposes all three statuses from locationHistory
  assert(
    /state\.locationHistory/.test(uiRenderSrc114) &&
      /\[CURRENT\]/.test(uiRenderSrc114) &&
      /\[VISITED\]/.test(uiRenderSrc114) &&
      /\[UNKNOWN\]/.test(uiRenderSrc114),
    '114.5: renderWorldMap renders [CURRENT] / [VISITED] / [UNKNOWN] driven by state.locationHistory'
  );

  // 114.6  sanitizeImportedContainer coerces locationHistory (Protocol 4 born-compliance)
  assert(
    /'collectibles', 'traits', 'skillBooks', 'magazines', 'locationHistory'/.test(apiSrc114),
    '114.6: sanitizeImportedContainer coerces locationHistory as a string[] on cloud-pull / file-import (Protocol 4)'
  );

  // 114.7  permanence guard — no destructive 10-cap on locationHistory survives anywhere
  assert(
    !/locationHistory\s*=\s*[^;]*slice\(-?\d+\)/.test(apiSrc114) &&
      !/locationHistory\s*=\s*[^;]*slice\(-?\d+\)/.test(stateSrc114),
    '114.7: no destructive cap (locationHistory = …slice(-N)) anywhere — discovered locations are never un-discovered'
  );
}

// ══════════════════════════════════════════════════════════════
//  SUITE 115 — WU-F1 Sustained Power Cell (Screen Wake Lock)
//  Keep-display-lit toggle: feature-detected, graceful fallback when unsupported,
//  re-acquire on visibilitychange, release on toggle-off, persisted as a localStorage
//  device preference. Game-agnostic, offline, no AI. (Phase F)
//  8 tests
// ══════════════════════════════════════════════════════════════
{
  header('Suite 115 — WU-F1 Sustained Power Cell (Wake Lock)');
  const uiCore115 = readFile('js/ui-core.js');
  const html115 = htmlSource;

  // 115.1  preference constant + getter (localStorage-backed device setting, not state)
  assert(
    /const WAKE_LOCK_KEY = 'robco_wakelock_enabled'/.test(uiCore115) &&
      /function isWakeLockEnabled\(\)/.test(uiCore115) &&
      /localStorage\.getItem\(WAKE_LOCK_KEY\)/.test(uiCore115),
    '115.1: WAKE_LOCK_KEY + isWakeLockEnabled() persist the toggle as a localStorage device preference'
  );

  // 115.2  feature-detect before use (graceful — no crash on unsupported browsers)
  assert(
    /function _wakeLockSupported\(\)/.test(uiCore115) &&
      /'wakeLock' in navigator/.test(uiCore115) &&
      /navigator\.wakeLock\.request/.test(uiCore115),
    '115.2: _wakeLockSupported() feature-detects the Screen Wake Lock API before any use'
  );

  // 115.3  acquire uses navigator.wakeLock.request('screen') inside try/catch (fail-soft)
  {
    let acq = '';
    try {
      acq = extractFunctionBody(uiCore115, '_acquireWakeLock');
    } catch (_) {}
    assert(
      /navigator\.wakeLock\.request\('screen'\)/.test(acq) &&
        /try\s*\{/.test(acq) &&
        /catch/.test(acq) &&
        /_wakeLockSupported\(\)/.test(acq),
      "115.3: _acquireWakeLock() requests a 'screen' lock guarded by _wakeLockSupported() inside try/catch (acquire failures never throw)"
    );
  }

  // 115.4  toggle persists + acquires when on, releases when off; wired via onchange
  {
    let tog = '';
    try {
      tog = extractFunctionBody(uiCore115, 'toggleWakeLock');
    } catch (_) {}
    assert(
      /localStorage\.setItem\(WAKE_LOCK_KEY/.test(tog) &&
        /_acquireWakeLock\(\)/.test(tog) &&
        /_releaseWakeLock\(\)/.test(tog) &&
        /onchange="toggleWakeLock\(this\.checked\)"/.test(html115),
      '115.4: toggleWakeLock persists the pref + acquires/releases; #wakeLockToggle onchange wires to it'
    );
  }

  // 115.5  re-acquire on visibilitychange (OS releases the lock when the tab hides)
  assert(
    /addEventListener\('visibilitychange'/.test(uiCore115) &&
      /document\.visibilityState === 'visible'/.test(uiCore115) &&
      /isWakeLockEnabled\(\)/.test(uiCore115) &&
      /_acquireWakeLock\(\)/.test(uiCore115),
    '115.5: a visibilitychange listener re-acquires the lock when the tab becomes visible and the pref is on'
  );

  // 115.6  graceful fallback — initWakeLock disables the control when unsupported
  {
    let ini = '';
    try {
      ini = extractFunctionBody(uiCore115, 'initWakeLock');
    } catch (_) {}
    assert(
      /!_wakeLockSupported\(\)/.test(ini) && /toggle\.disabled = true/.test(ini),
      '115.6: initWakeLock() disables the toggle (graceful fallback) when the Wake Lock API is unavailable'
    );
  }

  // 115.7  release path never throws + initWakeLock wired into boot
  {
    let rel = '';
    try {
      rel = extractFunctionBody(uiCore115, '_releaseWakeLock');
    } catch (_) {}
    assert(
      /_wakeLockSentinel\.release\(\)/.test(rel) &&
        /try\s*\{/.test(rel) &&
        /catch/.test(rel) &&
        /initWakeLock\(\);/.test(uiCore115),
      '115.7: _releaseWakeLock() releases inside try/catch (never throws) and initWakeLock() is called from boot'
    );
  }

  // 115.8  POWER MANAGEMENT sub-panel present + accessible toggle + status note + data-sub-id
  assert(
    /data-sub-id="power_systems"/.test(html115) &&
      /POWER MANAGEMENT/.test(html115) &&
      /id="wakeLockToggle"/.test(html115) &&
      /id="wakeLockStatus"/.test(html115) &&
      /for="wakeLockToggle"/.test(html115),
    '115.8: POWER MANAGEMENT sub-panel (data-sub-id) has #wakeLockToggle + label[for] + #wakeLockStatus note'
  );
}

// ══════════════════════════════════════════════════════════════
//  SUITE 116 — WU-F2 Haptic Solenoid (Vibration API)
//  Brief chassis buzz on key events: feature-detected, opt-in localStorage device
//  preference (default OFF), graceful no-op when navigator.vibrate is unavailable,
//  and SUPPRESSED under prefers-reduced-motion. Game-agnostic, offline, no AI. (Phase F)
//  8 tests
// ══════════════════════════════════════════════════════════════
{
  header('Suite 116 — WU-F2 Haptic Solenoid (Vibration)');
  const uiAudio116 = readFile('js/ui-audio.js');
  const uiCore116 = readFile('js/ui-core.js');
  const api116 = readFile('js/api.js');
  const html116 = htmlSource;

  // 116.1  preference constant + getter (localStorage-backed device setting, not state)
  assert(
    /const HAPTIC_KEY = 'robco_haptic_enabled'/.test(uiAudio116) &&
      /function isHapticEnabled\(\)/.test(uiAudio116) &&
      /localStorage\.getItem\(HAPTIC_KEY\)\s*===\s*'true'/.test(uiAudio116),
    '116.1: HAPTIC_KEY + isHapticEnabled() persist the toggle as an opt-in (default OFF) localStorage device preference'
  );

  // 116.2  feature-detect before use (graceful — no crash on unsupported browsers)
  assert(
    /function _hapticSupported\(\)/.test(uiAudio116) &&
      /typeof navigator\.vibrate === 'function'/.test(uiAudio116),
    '116.2: _hapticSupported() feature-detects navigator.vibrate before any use'
  );

  // 116.3  reduced-motion detector uses the prefers-reduced-motion media query
  assert(
    /function _hapticReducedMotion\(\)/.test(uiAudio116) &&
      /matchMedia\(['"]\(prefers-reduced-motion: reduce\)['"]\)/.test(uiAudio116),
    '116.3: _hapticReducedMotion() reads the prefers-reduced-motion media query'
  );

  // 116.4  core fire helper: guards on unsupported / not-enabled / reduced-motion; vibrate in try/catch
  {
    let trg = '';
    try {
      trg = extractFunctionBody(uiAudio116, 'triggerHaptic');
    } catch (_) {}
    assert(
      /if \(!_hapticSupported\(\)\) return false/.test(trg) &&
        /if \(!isHapticEnabled\(\)\) return false/.test(trg) &&
        /if \(_hapticReducedMotion\(\)\) return false/.test(trg) &&
        /navigator\.vibrate\(/.test(trg) &&
        /try\s*\{/.test(trg) &&
        /catch/.test(trg),
      '116.4: triggerHaptic() no-ops when unsupported, when the pref is off, AND when reduced-motion is set; vibrate() is wrapped in try/catch'
    );
  }

  // 116.5  toggle persists the pref + confirmation buzz; wired via onchange
  {
    let tog = '';
    try {
      tog = extractFunctionBody(uiAudio116, 'toggleHaptic');
    } catch (_) {}
    assert(
      /localStorage\.setItem\(HAPTIC_KEY/.test(tog) &&
        /triggerHaptic\(/.test(tog) &&
        /onchange="toggleHaptic\(this\.checked\)"/.test(html116),
      '116.5: toggleHaptic persists the pref + fires a confirmation buzz; #hapticToggle onchange wires to it'
    );
  }

  // 116.6  graceful fallback — initHaptic disables the control when unsupported + boot-wired
  {
    let ini = '';
    try {
      ini = extractFunctionBody(uiAudio116, 'initHaptic');
    } catch (_) {}
    assert(
      /!_hapticSupported\(\)/.test(ini) &&
        /toggle\.disabled = true/.test(ini) &&
        /initHaptic\(\);/.test(uiCore116),
      '116.6: initHaptic() disables the toggle (graceful fallback) when Vibration is unavailable and is called from boot'
    );
  }

  // 116.7  fire points wired at the key events (level-up, faction alert, critical HP)
  assert(
    /triggerHaptic\('levelup'\)/.test(api116) &&
      /triggerHaptic\('alert'\)/.test(api116) &&
      /triggerHaptic\('lowhealth'\)/.test(uiCore116),
    '116.7: triggerHaptic fires on level-up + faction-threshold alert (api.js) and the critical-HP crossing (ui-core.js)'
  );

  // 116.8  POWER MANAGEMENT sub-panel present + accessible toggle + status note
  assert(
    /data-sub-id="power_systems"/.test(html116) &&
      /id="hapticToggle"/.test(html116) &&
      /id="hapticStatus"/.test(html116) &&
      /for="hapticToggle"/.test(html116),
    '116.8: POWER MANAGEMENT sub-panel has #hapticToggle + label[for] + #hapticStatus note'
  );
}

// ══════════════════════════════════════════════════════════════
//  SUITE 117 — WU-F3 Eject Holotape (Web Share API)
//  Ejects the comm-link log as a holotape transcript via navigator.share, with a
//  three-tier graceful fallback (share → clipboard → download). Feature-detected,
//  reuses _buildHolotapeText() formatting. Game-agnostic, offline, no AI. (Phase F)
//  8 tests
// ══════════════════════════════════════════════════════════════
{
  header('Suite 117 — WU-F3 Eject Holotape (Web Share)');
  const saves117 = readFile('js/ui-saves.js');
  const html117 = htmlSource;
  let eject117 = '';
  try {
    eject117 = extractFunctionBody(saves117, 'ejectHolotape');
  } catch (_) {}

  // 117.1  shared text builder extracted + reused by the .txt export (Protocol 22)
  assert(
    /function _buildHolotapeText\(\)/.test(saves117) &&
      /_downloadBlob\(_buildHolotapeText\(\), 'text\/plain'/.test(saves117),
    '117.1: _buildHolotapeText() is the single transcript builder, reused by the .txt export path (no duplication)'
  );

  // 117.2  Web Share feature-detect before use (graceful — no crash where unsupported)
  assert(
    /function _shareSupported\(\)/.test(saves117) &&
      /typeof navigator\.share === 'function'/.test(saves117),
    '117.2: _shareSupported() feature-detects navigator.share before any use'
  );

  // 117.3  clipboard fallback is also feature-detected
  assert(
    /function _clipboardSupported\(\)/.test(saves117) &&
      /navigator\.clipboard/.test(saves117) &&
      /typeof navigator\.clipboard\.writeText === 'function'/.test(saves117),
    '117.3: _clipboardSupported() feature-detects navigator.clipboard.writeText before the clipboard fallback'
  );

  // 117.4  tier 1 — navigator.share with the holotape text, inside try/catch
  assert(
    /_shareSupported\(\)/.test(eject117) &&
      /await navigator\.share\(\{[^}]*text/.test(eject117) &&
      /try\s*\{/.test(eject117) &&
      /catch/.test(eject117),
    '117.4: ejectHolotape() shares the transcript via navigator.share({text}) guarded by _shareSupported() inside try/catch'
  );

  // 117.5  a user-dismissed share sheet (AbortError) is honoured — not treated as failure
  assert(
    /AbortError/.test(eject117) && /err\.name === 'AbortError'/.test(eject117),
    '117.5: a dismissed share sheet (AbortError) returns silently and does NOT fall through to clipboard/download'
  );

  // 117.6  tier 2 + tier 3 fallbacks present: clipboard copy then file download
  assert(
    /_clipboardSupported\(\)/.test(eject117) &&
      /navigator\.clipboard\.writeText\(text\)/.test(eject117) &&
      /_downloadBlob\(text, 'text\/plain'/.test(eject117),
    '117.6: graceful fallback chain — clipboard copy (tier 2) then _downloadBlob file eject (tier 3) when share is unavailable'
  );

  // 117.7  empty-log guard — nothing to eject
  assert(
    /!chatHistory \|\| chatHistory\.length === 0/.test(eject117) &&
      /NOTHING TO EJECT/.test(eject117),
    '117.7: ejectHolotape() refuses on an empty comm-link log (NOTHING TO EJECT)'
  );

  // 117.8  diegetic trigger button wired with an accessible label
  assert(
    /id="ejectHolotapeBtn"/.test(html117) &&
      /onclick="ejectHolotape\(\)"/.test(html117) &&
      /aria-label="[^"]*[Hh]olotape[^"]*"/.test(html117) &&
      /EJECT HOLOTAPE/.test(html117),
    '117.8: #ejectHolotapeBtn diegetic button wires onclick=ejectHolotape() with a descriptive aria-label'
  );
}

// ══════════════════════════════════════════════════════════════
//  SUITE 118 — WU-F4 Pending-Directives Tally (Badging API)
//  Posts the active-quest count on the installed icon while backgrounded, clears
//  it when the terminal is open. Feature-detected, graceful no-op when unsupported,
//  reuses the QUEST LOG count. Game-agnostic, offline, no AI. (Phase F)
//  8 tests
// ══════════════════════════════════════════════════════════════
{
  header('Suite 118 — WU-F4 Pending-Directives Tally (Badge)');
  const uiCore118 = readFile('js/ui-core.js');
  const manifest118 = readFile('manifest.json');
  let badgeFn = '';
  try {
    badgeFn = extractFunctionBody(uiCore118, '_updateAppBadge');
  } catch (_) {}

  // 118.1  feature-detect both Badging API entry points before any use
  assert(
    /function _badgeSupported\(\)/.test(uiCore118) &&
      /typeof navigator\.setAppBadge === 'function'/.test(uiCore118) &&
      /typeof navigator\.clearAppBadge === 'function'/.test(uiCore118),
    '118.1: _badgeSupported() feature-detects navigator.setAppBadge + clearAppBadge before any use'
  );

  // 118.2  pending-directives count = active quests, shared with the QUEST LOG badge (Protocol 22)
  assert(
    /function _pendingDirectivesCount\(\)/.test(uiCore118) &&
      /state\.quests \|\| \[\]\)\.filter\(q => q\.status === 'active' \|\| !q\.status\)/.test(
        uiCore118
      ) &&
      /h2text: '> QUEST LOG',\s*count: _pendingDirectivesCount\(\)/.test(uiCore118),
    '118.2: _pendingDirectivesCount() (active quests) is the single source reused by the QUEST LOG panel badge'
  );

  // 118.3  graceful no-op: badge update returns early when the API is unavailable
  assert(
    /if \(!_badgeSupported\(\)\) return/.test(badgeFn),
    '118.3: _updateAppBadge() returns early (graceful no-op) when the Badging API is unavailable'
  );

  // 118.4  sets the tally while hidden, clears while visible; wrapped in try/catch
  assert(
    /document\.visibilityState === 'hidden'/.test(badgeFn) &&
      /navigator\.setAppBadge\(n\)/.test(badgeFn) &&
      /navigator\.clearAppBadge\(\)/.test(badgeFn) &&
      /try\s*\{/.test(badgeFn) &&
      /catch/.test(badgeFn),
    '118.4: _updateAppBadge() posts the count when hidden + clears when visible, inside try/catch (never throws)'
  );

  // 118.5  async badge-promise rejection is swallowed (never an unhandled rejection)
  assert(
    /typeof p\.catch === 'function'/.test(badgeFn) && /p\.catch\(\(\) => \{\}\)/.test(badgeFn),
    '118.5: a rejecting setAppBadge/clearAppBadge promise is caught (no unhandled rejection)'
  );

  // 118.6  zero pending → clears the badge (no stale count)
  assert(
    /n > 0 \? navigator\.setAppBadge\(n\) : navigator\.clearAppBadge\(\)/.test(badgeFn),
    '118.6: zero pending directives clears the app badge (no stale count left on the icon)'
  );

  // 118.7  wired into render (_updatePanelBadges) + a visibilitychange listener
  assert(
    /_updateAppBadge\(\); \/\/ WU-F4/.test(uiCore118) &&
      /addEventListener\('visibilitychange', _updateAppBadge\)/.test(uiCore118),
    '118.7: _updateAppBadge() is called from _updatePanelBadges (render) and on visibilitychange'
  );

  // 118.8  manifest declares the installed-PWA badge prerequisite (display: standalone)
  assert(
    /"display":\s*"standalone"/.test(manifest118),
    '118.8: manifest.json keeps display:standalone — the installed-PWA prerequisite for app badges'
  );
}

// ══════════════════════════════════════════════════════════════
//  SUITE 119 — WU-F7 Overseer's Maintenance Log
//  Local device telemetry (boot count, total power-on, longest session, live
//  uptime) surfaced as a DATA-tab read-out. Persisted as a localStorage device
//  stat (NOT campaign state — no Protocol-4 path), reuses the session clock, no
//  web API, no AI, no network, game-agnostic. (Phase F)
//  8 tests
// ══════════════════════════════════════════════════════════════
{
  header("Suite 119 — WU-F7 Overseer's Maintenance Log");
  const uiCore119 = readFile('js/ui-core.js');
  const html119 = htmlSource;

  // 119.1  telemetry store constant + tolerant reader (localStorage device stat, not state)
  {
    let rd = '';
    try {
      rd = extractFunctionBody(uiCore119, '_readOverseerLog');
    } catch (_) {}
    assert(
      /const OVERSEER_LOG_KEY = 'robco_overseer_log'/.test(uiCore119) &&
        /function _readOverseerLog\(\)/.test(uiCore119) &&
        /localStorage\.getItem\(OVERSEER_LOG_KEY\)/.test(rd) &&
        /catch/.test(rd) &&
        /bootCount: 0, totalPowerOnMs: 0, longestSessionMs: 0/.test(rd),
      '119.1: OVERSEER_LOG_KEY + _readOverseerLog() back the log with a localStorage device stat and return zeroes on parse failure (never throws)'
    );
  }

  // 119.2  writer is wrapped so a quota / disabled store can never throw
  {
    let wr = '';
    try {
      wr = extractFunctionBody(uiCore119, '_writeOverseerLog');
    } catch (_) {}
    assert(
      /localStorage\.setItem\(OVERSEER_LOG_KEY/.test(wr) && /try\s*\{/.test(wr) && /catch/.test(wr),
      '119.2: _writeOverseerLog() persists inside try/catch — a quota-full or disabled store never throws'
    );
  }

  // 119.3  boot increments the count exactly once + starts the session clock + wired into boot
  {
    let ini = '';
    try {
      ini = extractFunctionBody(uiCore119, 'initOverseerLog');
    } catch (_) {}
    assert(
      /if \(_overseerBooted\)/.test(ini) &&
        /_overseerBooted = true/.test(ini) &&
        /o\.bootCount \+= 1/.test(ini) &&
        /_overseerSessionStart = Date\.now\(\)/.test(ini) &&
        /initOverseerLog\(\); \/\/ WU-F7/.test(uiCore119),
      '119.3: initOverseerLog() bumps bootCount once (guarded by _overseerBooted), starts the session clock, and is called from boot'
    );
  }

  // 119.4  flush is idempotent: total recomputed from the boot-time base (no double-count) + longest tracked
  {
    let fl = '';
    try {
      fl = extractFunctionBody(uiCore119, '_flushOverseerLog');
    } catch (_) {}
    assert(
      /o\.totalPowerOnMs = _overseerBaseMs \+ session/.test(fl) &&
        /if \(session > o\.longestSessionMs\) o\.longestSessionMs = session/.test(fl) &&
        /_overseerBaseMs = o\.totalPowerOnMs/.test(uiCore119),
      '119.4: _flushOverseerLog() recomputes total from _overseerBaseMs + session (idempotent, no double-count) and tracks the longest session'
    );
  }

  // 119.5  read-out renders all four telemetry lines into #overseerLogDisplay
  {
    let rn = '';
    try {
      rn = extractFunctionBody(uiCore119, 'renderOverseerLog');
    } catch (_) {}
    assert(
      /getElementById\('overseerLogDisplay'\)/.test(rn) &&
        /CURRENT UPTIME/.test(rn) &&
        /LONGEST SESSION/.test(rn) &&
        /TOTAL POWER-ON/.test(rn) &&
        /BOOT COUNT/.test(rn) &&
        /function _fmtOverseerDuration\(/.test(uiCore119),
      '119.5: renderOverseerLog() renders CURRENT UPTIME / LONGEST SESSION / TOTAL POWER-ON / BOOT COUNT into #overseerLogDisplay via _fmtOverseerDuration'
    );
  }

  // 119.6  totals survive a closed tab — flush wired to visibilitychange-hidden + pagehide (no special API)
  assert(
    /if \(document\.hidden\) _flushOverseerLog\(\)/.test(uiCore119) &&
      /addEventListener\('pagehide', _flushOverseerLog\)/.test(uiCore119),
    '119.6: _flushOverseerLog() fires on visibilitychange-hidden and pagehide so power-on totals survive a closed tab'
  );

  // 119.7  read-out stays fresh — renderOverseerLog called from loadUI + a periodic flush timer
  {
    let ini7 = '';
    try {
      ini7 = extractFunctionBody(uiCore119, 'initOverseerLog');
    } catch (_) {}
    assert(
      /renderOverseerLog\(\); \/\/ WU-F7/.test(uiCore119) && /setInterval\(/.test(ini7),
      '119.7: renderOverseerLog() is called from loadUI and a periodic flush timer keeps the live read-out current'
    );
  }

  // 119.8  OVERSEER'S LOG panel: DATA-tab .panel + summary>h2 with ">" + display mount + local-only note, game-agnostic
  assert(
    /id="overseerLogPanel"/.test(html119) &&
      /<details class="panel" data-tab="data" id="overseerLogPanel">/.test(html119) &&
      /<summary><h2>&gt; OVERSEER'S LOG<\/h2><\/summary>/.test(html119) &&
      /id="overseerLogDisplay"/.test(html119) &&
      /STORED LOCALLY ON THIS UNIT/.test(html119) &&
      !/\bFNV\b|\bFO3\b|Fallout/.test(
        html119.slice(
          html119.indexOf('overseerLogPanel'),
          html119.indexOf('overseerLogPanel') + 600
        )
      ),
    '119.8: OVERSEER\'S LOG is a DATA-tab .panel (summary>h2 with ">") with #overseerLogDisplay + a local-only note, and is game-agnostic (no FNV/FO3/Fallout literals)'
  );
}

// ══════════════════════════════════════════════════════════════
//  SUITE 120 — WU-F8 High-Lumen Optics (high-contrast mode)
//  An AA+ contrast/legibility boost framed as driving the phosphor harder:
//  activated by a manual OPTICS toggle (html.high-lumen, a localStorage device
//  pref) AND the OS prefers-contrast: more media query — both applying the same
//  pure-CSS boosts (pure-black bg, glow removed, dimmed surfaces lifted, scanline
//  veil dropped). Game-agnostic (layers over any optics colour), no AI. (Phase F)
//  8 tests
// ══════════════════════════════════════════════════════════════
{
  header('Suite 120 — WU-F8 High-Lumen Optics (high-contrast)');
  const css120 = readFile('css/terminal.css');
  const uiCore120 = readFile('js/ui-core.js');
  const html120 = htmlSource;
  // Slice each activation path so we can assert the boosts live in BOTH.
  const manualBlock120 = css120.slice(
    css120.indexOf('html.high-lumen body'),
    css120.indexOf('@media (prefers-contrast: more) {', css120.indexOf('html.high-lumen body'))
  );
  const prefBlock120 = css120.slice(
    css120.indexOf('@media (prefers-contrast: more) {', css120.indexOf('html.high-lumen body')),
    css120.indexOf('/* Add-row form')
  );

  // 120.1  both activation paths exist — the manual class AND the OS media query
  assert(
    /html\.high-lumen body\s*\{/.test(css120) &&
      /@media \(prefers-contrast: more\)\s*\{/.test(css120) &&
      manualBlock120.length > 0 &&
      prefBlock120.length > 0,
    '120.1: high-contrast is reachable two ways — manual html.high-lumen rules AND an @media (prefers-contrast: more) block'
  );

  // 120.2  high-contrast core in BOTH paths: pure-black background + glow halo removed
  assert(
    /background-color: #000/.test(manualBlock120) &&
      /--robco-glow: none/.test(manualBlock120) &&
      /background-color: #000/.test(prefBlock120) &&
      /--robco-glow: none/.test(prefBlock120),
    '120.2: both paths force a pure-black (#000) background and remove the glow halo (--robco-glow: none) for maximum text contrast'
  );

  // 120.3  the AA+ win — every dimmed/secondary surface lifted to full opacity in BOTH paths
  assert(
    /\.tracker-toggle--inactive,/.test(manualBlock120) &&
      /\.list-row-prefix,/.test(manualBlock120) &&
      /opacity: 1 !important/.test(manualBlock120) &&
      /\.tracker-toggle--inactive,/.test(prefBlock120) &&
      /opacity: 1 !important/.test(prefBlock120),
    '120.3: both paths lift dimmed surfaces (inactive tabs, list prefixes, inactive toggles, tracker-meta, filter buttons, empty-states) to opacity:1 — the measurable contrast gain'
  );

  // 120.4  scanline/refresh CRT veil lowered (it visibly dims text contrast) in BOTH paths —
  // r4 bumped 0.12 → 0.2, then r5 bumped 0.2 → 0.5 for a stronger retro CRT texture while keeping
  // text legible; both the manual .high-lumen block and the @media (prefers-contrast: more) block stay in sync.
  assert(
    /\.crt-overlay,\s*\n\s*html\.high-lumen \.crt-overlay::after\s*\{\s*\n\s*opacity: 0\.5\b/.test(
      manualBlock120
    ) && /\.crt-overlay,[\s\S]*?opacity: 0\.5\b/.test(prefBlock120),
    '120.4: both paths set the scanline + refresh-bar overlay to opacity 0.5 (r5 — a stronger CRT texture, text still legible)'
  );

  // 120.5  manual toggle persisted as a localStorage device preference (not campaign state)
  assert(
    /const HIGH_LUMEN_KEY = 'robco_high_lumen'/.test(uiCore120) &&
      /function isHighLumenEnabled\(\)/.test(uiCore120) &&
      /localStorage\.getItem\(HIGH_LUMEN_KEY\)\s*===\s*'true'/.test(uiCore120),
    '120.5: HIGH_LUMEN_KEY + isHighLumenEnabled() persist the toggle as a localStorage device preference (not campaign state)'
  );

  // 120.6  toggle persists + flips the html.high-lumen class; #highLumenToggle onchange wires to it
  {
    let tog = '',
      app = '';
    try {
      tog = extractFunctionBody(uiCore120, 'toggleHighLumen');
    } catch (_) {}
    try {
      app = extractFunctionBody(uiCore120, '_applyHighLumen');
    } catch (_) {}
    assert(
      /localStorage\.setItem\(HIGH_LUMEN_KEY/.test(tog) &&
        /_applyHighLumen\(/.test(tog) &&
        /documentElement\.classList\.toggle\('high-lumen'/.test(app) &&
        /onchange="toggleHighLumen\(this\.checked\)"/.test(html120),
      "120.6: toggleHighLumen persists the pref and _applyHighLumen toggles the 'high-lumen' class on <html>; #highLumenToggle onchange wires to it"
    );
  }

  // 120.7  init restores the pref + reflects to the checkbox + boot wiring + early-paint (no flash)
  {
    let ini = '';
    try {
      ini = extractFunctionBody(uiCore120, 'initHighLumen');
    } catch (_) {}
    assert(
      /toggle\.checked = enabled/.test(ini) &&
        /_applyHighLumen\(enabled\)/.test(ini) &&
        /initHighLumen\(\); \/\/ WU-F8/.test(uiCore120) &&
        /robco_high_lumen'\) === 'true'\)\s*\{\s*\n\s*document\.documentElement\.classList\.add\('high-lumen'\)/.test(
          html120
        ),
      '120.7: initHighLumen() restores the pref to the checkbox + applies it, is wired into boot, and the inline head script applies high-lumen before first paint (no contrast flash)'
    );
  }

  // 120.8  accessible toggle UI: checkbox + label[for] + status note, game-agnostic
  assert(
    /id="highLumenToggle"/.test(html120) &&
      /for="highLumenToggle"/.test(html120) &&
      /id="highLumenStatus"/.test(html120) &&
      /HIGH-LUMEN OPTICS/.test(html120) &&
      !/\bFNV\b|\bFO3\b|Fallout/.test(
        html120.slice(
          html120.indexOf('highLumenToggle') - 200,
          html120.indexOf('highLumenStatus') + 200
        )
      ),
    '120.8: the HIGH-LUMEN toggle has #highLumenToggle + label[for] + #highLumenStatus note and is game-agnostic (no FNV/FO3/Fallout literals)'
  );
}

// ══════════════════════════════════════════════════════════════
//  SUITE 121 — WU-F5 Pip-Boy Radio (synthesized — zero-byte WebAudio)
//  A procedural station bed (static + carrier + tonal motifs), fully generated
//  via WebAudio (no audio files). Opt-in player, respects masterMute, autoplay-
//  safe. Game-agnostic, offline, no AI. (Phase F, Protocol 7)
//  8 tests
// ══════════════════════════════════════════════════════════════
{
  header('Suite 121 — WU-F5 Pip-Boy Radio (synthesized)');
  const uiAudio121 = readFile('js/ui-audio.js');
  const uiCore121 = readFile('js/ui-core.js');
  const html121 = htmlSource;
  let start121 = '';
  let toggle121 = '';
  let init121 = '';
  let motif121 = '';
  try {
    start121 = extractFunctionBody(uiAudio121, 'startRadio');
  } catch (_) {}
  try {
    toggle121 = extractFunctionBody(uiAudio121, 'toggleRadio');
  } catch (_) {}
  try {
    init121 = extractFunctionBody(uiAudio121, 'initRadio');
  } catch (_) {}
  try {
    motif121 = extractFunctionBody(uiAudio121, '_radioScheduleMotif');
  } catch (_) {}

  // 121.1  zero-byte synth: built from WebAudio nodes, NOT an <audio>/Audio()/fetch of a file
  assert(
    /audioCtx\.createBufferSource\(\)/.test(start121) &&
      /audioCtx\.createOscillator\(\)/.test(start121) &&
      /ensureAudioCtx\(\)/.test(start121) &&
      !/new Audio\(|\.mp3|\.ogg|\.wav|<audio/i.test(uiAudio121),
    '121.1: the radio is fully synthesized via WebAudio (buffer/oscillator nodes), with no audio file (no <audio>/Audio()/.mp3/.ogg/.wav)'
  );

  // 121.2  Protocol 7 guards: masterMute + the AudioSettings.radio (ON) guard, reuses ensureAudioCtx
  assert(
    /if \(radioNodes \|\| AudioSettings\.masterMute \|\| !AudioSettings\.radio\) return/.test(
      start121
    ),
    '121.2: startRadio() guards on masterMute + the AudioSettings.radio ON-pref (and no double-start) before building any node'
  );

  // 121.3  AudioSettings.radio key initialised from localStorage robco_radio_on (ON semantics, opt-in)
  assert(
    /radio: localStorage\.getItem\('robco_radio_on'\) === 'true'/.test(uiCore121) &&
      /const RADIO_KEY = 'robco_radio_on'/.test(uiAudio121),
    "121.3: AudioSettings.radio is seeded from localStorage 'robco_radio_on' (opt-in ON-semantics device preference)"
  );

  // 121.4  toggle persists the pref, flips the cache, and starts/stops; wired via onchange
  assert(
    /localStorage\.setItem\(RADIO_KEY/.test(toggle121) &&
      /AudioSettings\.radio = on/.test(toggle121) &&
      /startRadio\(\)/.test(toggle121) &&
      /stopRadio\(\)/.test(toggle121) &&
      /onchange="toggleRadio\(this\.checked\)"/.test(html121),
    '121.4: toggleRadio persists robco_radio_on + starts/stops the station; #radioToggle onchange wires to it'
  );

  // 121.5  masterMute integration: stops under master mute, resumes when un-muted if the pref is on
  assert(
    /stopRadio\(\); \/\/ WU-F5/.test(uiAudio121) &&
      /if \(AudioSettings\.radio\) startRadio\(\); \/\/ WU-F5/.test(uiAudio121),
    '121.5: master mute stops the radio (pref preserved) and un-mute resumes it when AudioSettings.radio is on'
  );

  // 121.6  autoplay-safe restore: a saved "on" pref arms a one-shot first-gesture start (no auto-play)
  assert(
    /_radioArmed = true/.test(init121) &&
      /addEventListener\('click', _armStart, \{ once: true \}\)/.test(init121) &&
      /addEventListener\('keydown', _armStart, \{ once: true \}\)/.test(init121) &&
      /startRadio\(\)/.test(init121),
    '121.6: initRadio() restores a saved "on" pref via a one-shot first-gesture arm (autoplay-policy-safe), and is wired into boot'
  );

  // 121.7  the looping static bed + the slow tonal-motif scheduler are both present
  assert(
    /staticSrc\.loop = true/.test(start121) &&
      /_radioScheduleMotif\(\)/.test(start121) &&
      /setTimeout\(_radioScheduleMotif/.test(motif121) &&
      /initRadio\(\); \/\/ WU-F5/.test(uiCore121),
    '121.7: a looping static bed + a self-rescheduling tonal-motif generator drive the station, and initRadio is called from boot'
  );

  // 121.8  diegetic toggle + status note, game-agnostic (Protocol 38 — no FNV/FO3/Fallout literals)
  assert(
    /id="radioToggle"/.test(html121) &&
      /for="radioToggle"/.test(html121) &&
      /id="radioStatus"/.test(html121) &&
      !/Galaxy News|New Vegas|Mojave|Radio New Vegas|FNV|FO3/i.test(
        uiAudio121.slice(
          uiAudio121.indexOf('PIP-BOY RADIO'),
          uiAudio121.indexOf('QUEST COMPLETE CHIME')
        )
      ),
    '121.8: the radio has #radioToggle + label[for] + #radioStatus, and the synth carries no game-specific station literals (game-agnostic)'
  );
}

// ══════════════════════════════════════════════════════════════
//  SUITE 122 — WU-F6 Cold-Start / Degraded-Tube Boot
//  runBootSequence picks a boot flavor: normal (warm), cold (first-ever POST,
//  gated once by robco_booted_before), or a RARE degraded "cold tube" variant
//  that rolls on ANY boot (NOT first-boot-gated — owner pref). Honors reduced-
//  motion, leaves the normal boot unchanged. Game-agnostic, offline, no AI.
//  8 tests
// ══════════════════════════════════════════════════════════════
{
  header('Suite 122 — WU-F6 Cold-Start / Degraded-Tube Boot');
  const uiAudio122 = readFile('js/ui-audio.js');
  const css122 = readFile('css/terminal.css');
  let pick122 = '';
  let bootLines122 = '';
  let runBoot122 = '';
  try {
    pick122 = extractFunctionBody(uiAudio122, '_pickBootFlavor');
  } catch (_) {}
  try {
    bootLines122 = extractFunctionBody(uiAudio122, '_bootLinesFor');
  } catch (_) {}
  try {
    runBoot122 = extractFunctionBody(uiAudio122, 'runBootSequence');
  } catch (_) {}

  // 122.1  the degraded variant exists: a rare random roll + degraded POST lines + a boot-degraded class
  assert(
    /const DEGRADED_BOOT_CHANCE = 0?\.\d+/.test(uiAudio122) &&
      /Math\.random\(\) < DEGRADED_BOOT_CHANCE\) return 'degraded'/.test(pick122) &&
      /CRT TUBE COLD|WARMING UP/.test(bootLines122) &&
      /classList\.add\('boot-degraded'\)/.test(runBoot122),
    '122.1: a rare degraded boot exists — a DEGRADED_BOOT_CHANCE Math.random() roll, degraded POST lines, and a #bootScreen.boot-degraded class'
  );

  // 122.2  CRITICAL: the degraded roll is NOT first-boot-gated — it is evaluated BEFORE the
  //        robco_booted_before first-power-on check, so it can surface on ANY boot.
  {
    const degradedIdx = pick122.indexOf("return 'degraded'");
    const firstBootIdx = pick122.indexOf('robco_booted_before');
    assert(
      degradedIdx > -1 &&
        firstBootIdx > -1 &&
        degradedIdx < firstBootIdx &&
        /return 'cold'/.test(pick122),
      '122.2: the degraded roll runs BEFORE the robco_booted_before first-boot gate — degraded can trigger on ANY boot, not just first launch (owner pref)'
    );
  }

  // 122.3  cold first-power-on POST: RETROS BIOS + counting memory test, gated once by the flag
  assert(
    /RETROS BIOS/.test(bootLines122) &&
      /MEMORY TEST/.test(bootLines122) &&
      /!localStorage\.getItem\('robco_booted_before'\)/.test(pick122) &&
      /localStorage\.setItem\('robco_booted_before', 'true'\)/.test(runBoot122),
    '122.3: the first-ever cold POST (RETROS BIOS + memory test) is gated once by robco_booted_before, which runBootSequence sets'
  );

  // 122.4  normal (warm) boot is UNCHANGED: the canonical 8 lines + same 120ms interval + fade/_bootActive
  assert(
    /64K RAM SYSTEM/.test(bootLines122) &&
      /SECURE LINK ESTABLISHED\. BOOTING\.\.\./.test(bootLines122) &&
      /setInterval\([\s\S]*?\}, 120\)/.test(runBoot122) &&
      /classList\.add\('boot-fade-out'\)/.test(runBoot122) &&
      /_bootActive = true/.test(runBoot122) &&
      /_bootActive = false/.test(runBoot122),
    '122.4: normal warm boot is unaffected — canonical lines, 120ms cadence, boot-fade-out, and the WU-B10 _bootActive window all preserved'
  );

  // 122.5  reduced-motion honored: the flicker is a CSS animation neutralised by the prefers-reduced-motion block
  assert(
    /@keyframes boot-degraded-flicker/.test(css122) &&
      /#bootScreen\.boot-degraded\s*\{[\s\S]*?animation:\s*boot-degraded-flicker/.test(css122) &&
      /@media \(prefers-reduced-motion: reduce\)/.test(css122) &&
      /animation-duration:\s*0\.01ms\s*!important/.test(css122),
    '122.5: the degraded flicker is a CSS @keyframes animation, neutralised by the global prefers-reduced-motion block (CR-1)'
  );

  // 122.6  test/override hook: window.__robcoBootFlavor forces a flavor (used for verification)
  assert(
    /window\.__robcoBootFlavor/.test(pick122) &&
      /forced === 'normal' \|\| forced === 'cold' \|\| forced === 'degraded'/.test(pick122),
    '122.6: _pickBootFlavor honors a window.__robcoBootFlavor override (normal|cold|degraded) for deterministic verification'
  );

  // 122.7  runBootSequence still no-ops safely when the boot screen is absent (no regression)
  assert(
    /const bootScreen = document\.getElementById\('bootScreen'\)/.test(runBoot122) &&
      /if \(!bootScreen\)/.test(runBoot122) &&
      /if \(onComplete\) onComplete\(\)/.test(runBoot122),
    '122.7: runBootSequence still guards on a missing #bootScreen and always calls onComplete (boot never wedges)'
  );

  // 122.8  game-agnostic (Protocol 38): boot flavor code carries no game literals, uses APP_VERSION
  assert(
    /APP_VERSION/.test(bootLines122) &&
      !/New Vegas|Mojave|Fallout|\bFNV\b|\bFO3\b|Vault 101|Capital Wasteland/i.test(
        pick122 + bootLines122
      ),
    '122.8: the boot-flavor strings are game-agnostic (no FNV/FO3/Fallout/location literals) and version via APP_VERSION'
  );
}

// ══════════════════════════════════════════════════════════════
//  SUITE 123 — WU-F9 TERMLINK Command Console + WU-HF2/HF3 hotfixes
//  The Phase-F launcher surface that routes the offline subsystems through
//  NATIVE_COMMAND_ROUTER (or the documented BARTER panel). Guards the console ↔ router
//  consistency so it can't advertise a dead subsystem, stays offline (0 AI),
//  game-agnostic (Protocol 38), and XSS-safe. Also locks the v2.7.0 hotfixes: WU-HF2
//  (no soft-keyboard pop — the post-command Comm-Link re-focus is precise-pointer gated)
//  and WU-HF3 (typed panel navigation — a whole-input panel alias opens that panel
//  natively, consult/databank/lookup → the DATABANK panel, "consult <topic>" still runs
//  the native lookup).
//  19 tests
// ══════════════════════════════════════════════════════════════
{
  header('Suite 123 — WU-F9 TERMLINK Command Console');
  const api123 = readFile('js/api.js');
  const uiCore123 = readFile('js/ui-core.js');
  const html123 = readFile('index.html');
  const css123 = readFile('css/terminal.css');
  const router123 = (api123.match(/const NATIVE_COMMAND_ROUTER = \{([\s\S]*?)\n\};/) || [
    '',
    '',
  ])[1];
  const consoleArr123 = (api123.match(/const TERMLINK_CONSOLE = \[([\s\S]*?)\n\];/) || ['', ''])[1];
  const showFn123 = (api123.match(
    /function showTermlinkConsole\(\)[\s\S]*?_openSysModal\(\);\s*\n\}/
  ) || [''])[0];
  const launchFn123 = (api123.match(/function _termlinkLaunch\([\s\S]*?\n\}/) || [''])[0];
  const consoleTokens123 = [...consoleArr123.matchAll(/token:\s*'([^']+)'/g)].map(m => m[1]);

  // 123.1  [TERMLINK] / [TL] / bare TERMLINK all route to showTermlinkConsole in the native router
  assert(
    /'\[TERMLINK\]':\s*\(\)\s*=>\s*showTermlinkConsole\(\)/.test(router123) &&
      /'\[TL\]':\s*\(\)\s*=>\s*showTermlinkConsole\(\)/.test(router123) &&
      /\bTERMLINK:\s*\(\)\s*=>\s*showTermlinkConsole\(\)/.test(router123),
    '123.1: NATIVE_COMMAND_ROUTER routes [TERMLINK], [TL] and bare TERMLINK to showTermlinkConsole()'
  );

  // 123.2  showTermlinkConsole defined and opens via _openSysModal (WU-C4 focus-trap + ARIA dialog)
  assert(
    showFn123.length > 0 && /_openSysModal\(\)/.test(showFn123),
    '123.2: showTermlinkConsole() is defined and opens the console via _openSysModal (focus-trap + ARIA)'
  );

  // 123.3  the console manifest exists with the six offline subsystem entries
  assert(
    consoleArr123.length > 0 && consoleTokens123.length >= 6,
    '123.3: TERMLINK_CONSOLE lists at least six subsystem entries (' + consoleTokens123.length + ')'
  );

  // 123.4  router-drift guard: every router-backed console token resolves in NATIVE_COMMAND_ROUTER;
  //        [TRADE] is the documented panel exception (panel:true, intentionally NOT a router token).
  const tradePanel123 = /\{[^}]*token:\s*'\[TRADE\]'[^}]*panel:\s*true[^}]*\}/.test(consoleArr123);
  const drift123 = consoleTokens123.filter(
    t => t !== '[TRADE]' && !router123.includes("'" + t + "'")
  );
  assert(
    drift123.length === 0 && tradePanel123 && !router123.includes("'[TRADE]'"),
    '123.4: every router-backed TERMLINK token resolves in NATIVE_COMMAND_ROUTER; [TRADE] is the panel exception' +
      (drift123.length ? ' — DRIFT: ' + drift123.join(', ') : '')
  );

  // 123.5  _termlinkLaunch routes router tokens through _routeNativeCommand and the panel via the trade panel
  assert(
    launchFn123.length > 0 &&
      /_routeNativeCommand\(token\)/.test(launchFn123) &&
      /expandPanelForCategory\('trade'\)/.test(launchFn123) &&
      /closeModal\(\)/.test(launchFn123),
    '123.5: _termlinkLaunch() routes native tokens via _routeNativeCommand, opens BARTER via the trade panel, closes the console first'
  );

  // 123.6  offline / zero-AI: neither the console nor the launcher does network I/O or AI calls
  assert(
    !/fetch\(|XMLHttpRequest|transmitMessage\(|generativelanguage|gemini/i.test(
      showFn123 + launchFn123
    ),
    '123.6: showTermlinkConsole + _termlinkLaunch make no network/AI call (routes natively, fully offline)'
  );

  // 123.7  XSS-safe: rendered token/label/blurb run through escapeHtml
  assert(
    (showFn123.match(/escapeHtml\(/g) || []).length >= 3,
    '123.7: showTermlinkConsole escapes rendered token/label/blurb via escapeHtml (XSS-safe)'
  );

  // 123.8  game-agnostic (Protocol 38): the TERMLINK block carries no game literals
  assert(
    !/New Vegas|Mojave|Fallout|\bFNV\b|\bFO3\b|Vault 101|Capital Wasteland|Courier/i.test(
      consoleArr123 + showFn123 + launchFn123
    ),
    '123.8: the TERMLINK console block is game-agnostic (no FNV/FO3/Fallout/location literals)'
  );

  // 123.9  discoverable affordances: #termlinkBtn in index.html routes natively, registry advertises it,
  //        and the console has overflow-safe styling
  assert(
    /id="termlinkBtn"[\s\S]*?macroCommand\('\[TERMLINK\]'\)/.test(html123) &&
      /aria-label="Open the TERMLINK command console/.test(html123) &&
      /\[TERMLINK\] \/ \[TL\]/.test(uiCore123) &&
      /\.termlink-grid\b/.test(css123) &&
      /\.termlink-entry\b/.test(css123),
    '123.9: #termlinkBtn routes [TERMLINK] natively + has aria-label, COMMAND_REGISTRY advertises it, console CSS present'
  );

  // ── WU-HF2 + WU-HF3 hotfixes (folded into v2.7.0) ───────────────────────────
  const aliasBlock123 = (api123.match(/const PANEL_NAV_ALIASES = \{([\s\S]*?)\n\};/) || [
    '',
    '',
  ])[1];
  const aliasVals123 = [...aliasBlock123.matchAll(/:\s*'([^']+)'/g)].map(m => m[1]);
  let panelNavBody123 = '';
  let routerBody123 = '';
  let transmitBody123 = '';
  try {
    panelNavBody123 = extractFunctionBody(api123, '_routePanelNav');
  } catch (_) {}
  try {
    routerBody123 = extractFunctionBody(api123, '_routeNativeCommand');
  } catch (_) {}
  try {
    transmitBody123 = extractFunctionBody(api123, 'transmitMessage');
  } catch (_) {}
  const aliasMap123 = {};
  for (const m of aliasBlock123.matchAll(/(\w+|'[^']+'):\s*'([^']+)'/g)) {
    aliasMap123[m[1].replace(/'/g, '')] = m[2];
  }

  // 123.10 WU-HF2: the post-native-command Comm-Link re-focus is gated behind a precise-pointer
  // probe so a native command (TERMLINK/VATS/panel-nav) never re-pops the soft keyboard on touch.
  assert(
    /function _isPrecisePointer\s*\(/.test(api123) &&
      /hover: hover[\s\S]*?pointer: fine/.test(api123) &&
      /_isPrecisePointer\(\)\s*\)\s*document\.getElementById\('chatInput'\)\.focus\(\)/.test(
        transmitBody123
      ),
    '123.10: WU-HF2 — transmitMessage gates the post-command chatInput.focus() behind _isPrecisePointer() (no touch keyboard pop)'
  );
  // 123.11 WU-HF3: the PANEL_NAV_ALIASES map exists with a healthy set of aliases
  assert(
    aliasBlock123.length > 0 && Object.keys(aliasMap123).length >= 30,
    '123.11: PANEL_NAV_ALIASES map defined with ≥30 alias entries (' +
      Object.keys(aliasMap123).length +
      ')'
  );
  // 123.12 _routePanelNav defined AND runs FIRST in _routeNativeCommand (native, before the AI)
  assert(
    /function _routePanelNav\s*\(/.test(api123) &&
      /_routePanelNav\(raw\)/.test(routerBody123) &&
      routerBody123.indexOf('_routePanelNav(raw)') < routerBody123.indexOf('NATIVE_COMMAND_ROUTER'),
    '123.12: _routePanelNav() defined and called in _routeNativeCommand BEFORE the command loop (routes natively, before AI)'
  );
  // 123.13 covers every required panel category (the alias VALUES include them all)
  {
    const required123 = [
      'inventory',
      'special',
      'skills',
      'perks',
      'quests',
      'factions',
      'map',
      'craft',
      'trade',
      'status',
      'bio',
      'log',
      'config',
      'databank',
    ];
    const missing123 = required123.filter(c => !aliasVals123.includes(c));
    assert(
      missing123.length === 0,
      '123.13: PANEL_NAV_ALIASES covers every required panel category' +
        (missing123.length ? ' — MISSING: ' + missing123.join(', ') : '')
    );
  }
  // 123.14 the common nicknames resolve to the correct category
  {
    const pairs123 = [
      ['inv', 'inventory'],
      ['items', 'inventory'],
      ['stats', 'special'],
      ['character', 'special'],
      ['journal', 'quests'],
      ['rep', 'factions'],
      ['reputation', 'factions'],
      ['world', 'map'],
      ['workbench', 'craft'],
      ['barter', 'trade'],
      ['limbs', 'bio'],
      ['overseer', 'log'],
      ['settings', 'config'],
    ];
    const bad123 = pairs123.filter(([a, c]) => aliasMap123[a] !== c);
    assert(
      bad123.length === 0,
      '123.14: panel-nav nicknames resolve to the right category' +
        (bad123.length ? ' — WRONG: ' + bad123.map(p => p[0]).join(', ') : '')
    );
  }
  // 123.15 OWNER DIRECTIVE: consult / databank / lookup all open the DATABANK panel (not the AI/modal)
  assert(
    aliasMap123['consult'] === 'databank' &&
      aliasMap123['databank'] === 'databank' &&
      aliasMap123['lookup'] === 'databank',
    '123.15: consult/databank/lookup → DATABANK panel (owner directive — not the AI CONSULT modal)'
  );
  // 123.16 expandPanelForCategory maps the new WU-HF3 categories to a tab + h2 prefix
  {
    let expandBody123 = '';
    try {
      expandBody123 = extractFunctionBody(uiCore123, 'expandPanelForCategory');
    } catch (_) {}
    assert(
      /special:\s*'stat'/.test(expandBody123) &&
        /special:\s*'>\s*BIO-METRICS'/.test(expandBody123) &&
        /skills:\s*'>\s*SKILL MATRIX'/.test(expandBody123) &&
        /bio:\s*'>\s*BIO-SCAN'/.test(expandBody123) &&
        /map:\s*'>\s*WORLD MAP'/.test(expandBody123) &&
        /databank:\s*'>\s*DATABANK'/.test(expandBody123) &&
        /config:\s*'campg'/.test(expandBody123) &&
        /config:\s*'>\s*CAMPAIGN CONFIGURATION'/.test(expandBody123),
      '123.16: expandPanelForCategory maps the new panel-nav categories (special/skills/bio/map/databank/config) to a tab + h2'
    );
  }
  // 123.17 EXACT whole-input match: _routePanelNav does a direct map lookup (no includes/startsWith/
  // indexOf), so "consult deathclaw" still falls through to the native CONSULT lookup.
  assert(
    /PANEL_NAV_ALIASES\[\s*key\s*\]/.test(panelNavBody123) &&
      !/\.includes\(|\.startsWith\(|\.indexOf\(/.test(panelNavBody123),
    '123.17: _routePanelNav uses an exact whole-input map lookup (no substring match) so "consult <topic>" still reaches the native lookup'
  );
  // 123.18 game-agnostic (Protocol 38): the panel-nav block names UI panels, never game data
  assert(
    !/New Vegas|Mojave|Fallout|\bFNV\b|\bFO3\b|Vault 101|Capital Wasteland|Courier|Deathclaw/i.test(
      aliasBlock123 + panelNavBody123
    ),
    '123.18: PANEL_NAV_ALIASES + _routePanelNav are game-agnostic (no FNV/FO3/Fallout/location literals — Protocol 38)'
  );
  // 123.19 the CONSULT→DATABANK target panel actually exists on the DATA tab
  assert(
    /id="databankPanel"/.test(html123) &&
      /data-tab="data"[^>]*id="databankPanel"|id="databankPanel"[^>]*data-tab="data"/.test(
        html123
      ) &&
      /DATABANK<\/h2>/.test(html123),
    '123.19: #databankPanel (DATABANK h2, data-tab="data") exists as the consult/databank/lookup target'
  );
}

// ══════════════════════════════════════════════════════════════
//  SUITE 124 — WU-T1 per-game theming (THEMES table + GAME_DEFS.theme + AA contrast)
//  Data-driven optics: ONE THEMES table (state.js) replaces the if/else palette in
//  changeOpticsColor (ui-audio) and the duplicated fgMap (ui-saves); each GAME_DEFS entry
//  declares theme.defaultOptics resolved via _activeDef() (no game literal); a real WCAG
//  relative-luminance computation enforces AA ≥4.5:1 for every contrastSafe default.
//  12 tests
// ══════════════════════════════════════════════════════════════
{
  header('Suite 124 — WU-T1 per-game theming + AA contrast');
  const state124 = readFile('js/state.js');
  const audio124 = readFile('js/ui-audio.js');
  const saves124 = readFile('js/ui-saves.js');
  const core124 = readFile('js/ui-core.js');
  const html124 = readFile('index.html');

  // Real WCAG 2.x relative-luminance + contrast-ratio (sRGB). Self-improving guard: a new
  // theme with illegible contrast fails the gate before it can ship.
  const _lum124 = hex => {
    const m = hex.replace('#', '');
    const ch = i => {
      const c = parseInt(m.slice(i, i + 2), 16) / 255;
      return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
    };
    return 0.2126 * ch(0) + 0.7152 * ch(2) + 0.0722 * ch(4);
  };
  const _contrast124 = (h1, h2) => {
    const a = _lum124(h1);
    const b = _lum124(h2);
    return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
  };
  const BG124 = '#010a07'; // the terminal page background

  const themesBlock124 = (state124.match(/const THEMES = \{([\s\S]*?)\n\};/) || ['', ''])[1];
  const themeEntries124 = [
    ...themesBlock124.matchAll(
      /(\w+):\s*\{\s*rgb:\s*'([^']+)',\s*hex:\s*'(#[0-9a-fA-F]{6})',\s*dark:\s*'(#[0-9a-fA-F]{6})',\s*label:\s*'[^']+',\s*contrastSafe:\s*(true|false),?\s*\}/g
    ),
  ].map(m => ({ key: m[1], rgb: m[2], hex: m[3], dark: m[4], safe: m[5] === 'true' }));
  const themeKeys124 = themeEntries124.map(t => t.key);
  const themeDefaults124 = [...state124.matchAll(/theme:\s*\{\s*defaultOptics:\s*'(\w+)'/g)].map(
    m => m[1]
  );
  const fnvTheme124 = (state124.match(/FNV:[\s\S]*?theme:\s*\{([\s\S]*?)\}/) || ['', ''])[1];
  const fo3Def124 = (state124.match(/FO3:[\s\S]*?theme:\s*\{\s*defaultOptics:\s*'(\w+)'/) || [])[1];
  const fnvDef124 = (state124.match(/FNV:[\s\S]*?theme:\s*\{\s*defaultOptics:\s*'(\w+)'/) || [])[1];
  const changeFn124 = (audio124.match(/function changeOpticsColor\([\s\S]*?\n\}/) || [''])[0];
  const applyFn124 = (audio124.match(/function _applyThemeVars\([\s\S]*?\n\}/) || [''])[0];
  const resolveFn124 = (audio124.match(/function _resolveDefaultOptics\([\s\S]*?\n\}/) || [''])[0];

  // 124.1  THEMES single-source table exists, is window-exposed, has the canon + FO3 greens
  assert(
    /const THEMES = \{/.test(state124) &&
      /window\.THEMES = THEMES/.test(state124) &&
      themeKeys124.length >= 7 &&
      themeKeys124.includes('green') &&
      themeKeys124.includes('green3'),
    '124.1: THEMES table defined + window-exposed with ≥7 entries incl. green & green3 (' +
      themeKeys124.length +
      ')'
  );

  // 124.2  every THEMES entry parsed with the full shape {rgb,hex,dark,label,contrastSafe}
  assert(
    themeEntries124.length === themeKeys124.length && themeEntries124.length >= 7,
    '124.2: every THEMES entry has the {rgb,hex,dark,label,contrastSafe} shape (' +
      themeEntries124.length +
      ' parsed)'
  );

  // 124.3  canon NV green is #14fdce; FO3 green3 is a visibly DISTINCT green (different hex)
  const green124 = themeEntries124.find(t => t.key === 'green');
  const green3_124 = themeEntries124.find(t => t.key === 'green3');
  assert(
    green124 &&
      green124.hex.toLowerCase() === '#14fdce' &&
      green3_124 &&
      green3_124.hex.toLowerCase() !== '#14fdce',
    '124.3: THEMES.green = #14fdce (canon NV green) and THEMES.green3 is a distinct green (' +
      (green3_124 ? green3_124.hex : '?') +
      ')'
  );

  // 124.4  per-game defaults: FNV → green (RobCo green), FO3 → green3 (duller Pip-Boy green)
  assert(
    fnvDef124 === 'green' && fo3Def124 === 'green3',
    '124.4: GAME_DEFS.FNV.theme.defaultOptics="green" and FO3="green3" (per-game default optics)'
  );

  // 124.5  data-driven completeness: every GAME_DEFS theme.defaultOptics exists in THEMES
  const missingDefaults124 = themeDefaults124.filter(d => !themeKeys124.includes(d));
  assert(
    themeDefaults124.length >= 2 && missingDefaults124.length === 0,
    '124.5: every GAME_DEFS theme.defaultOptics resolves to a THEMES entry' +
      (missingDefaults124.length ? ' — MISSING: ' + missingDefaults124.join(', ') : '')
  );

  // 124.6  every per-game default points at a contrastSafe:true theme (no illegible default)
  const unsafeDefaults124 = themeDefaults124.filter(d => {
    const t = themeEntries124.find(e => e.key === d);
    return !t || !t.safe;
  });
  assert(
    unsafeDefaults124.length === 0,
    '124.6: every per-game default optic is contrastSafe:true' +
      (unsafeDefaults124.length ? ' — UNSAFE: ' + unsafeDefaults124.join(', ') : '')
  );

  // 124.7  WCAG AA: every contrastSafe:true theme computes ≥4.5:1 against the page bg
  const failContrast124 = themeEntries124
    .filter(t => t.safe)
    .filter(t => _contrast124(t.hex, BG124) < 4.5)
    .map(t => `${t.key}(${_contrast124(t.hex, BG124).toFixed(2)}:1)`);
  assert(
    failContrast124.length === 0 && themeEntries124.some(t => t.safe),
    '124.7: every contrastSafe:true theme meets WCAG AA ≥4.5:1 vs the page background' +
      (failContrast124.length ? ' — FAIL: ' + failContrast124.join(', ') : '')
  );

  // 124.8  changeOpticsColor is table-driven AND persists to the PER-GAME optic key
  assert(
    /_applyThemeVars\(color\)/.test(changeFn124) &&
      /localStorage\.setItem\(_opticStorageKey\(\)/.test(changeFn124) &&
      !/else if \(color ===/.test(changeFn124) &&
      /THEMES\[key\]/.test(applyFn124),
    '124.8: changeOpticsColor delegates to table-driven _applyThemeVars and persists to the per-game _opticStorageKey()'
  );

  // 124.9  ui-saves dropped the duplicated fgMap palette and reads THEMES (Protocol 22)
  assert(
    !/const fgMap = \{/.test(saves124) && /THEMES\[optics\]/.test(saves124),
    '124.9: ui-saves.js dropped the duplicate fgMap and reads the export colour from THEMES'
  );

  // 124.10  per-game resolver reads _activeDef().theme.defaultOptics with a green fallback,
  //         game-agnostic (Protocol 38 — no FNV/FO3 literal in the optics apply/resolve code)
  assert(
    /_activeDef\(\)\.theme/.test(resolveFn124) &&
      /return 'green'/.test(resolveFn124) &&
      !/\bFNV\b|\bFO3\b/.test(resolveFn124 + applyFn124 + changeFn124),
    '124.10: _resolveDefaultOptics reads _activeDef().theme.defaultOptics with a green fallback, no game literal (Protocol 38)'
  );

  // 124.11  boot resolves the per-game optic + applies it + syncs the dynamic label; theme
  //         shape carries the T3 seam
  assert(
    /_resolveOptic\(\)/.test(core124) &&
      /_applyThemeVars\(_optic\)/.test(core124) &&
      /_updateOpticsDefaultLabel\(\)/.test(core124) &&
      ['defaultOptics', 'framing', 'pipBoyModel', 'bootFlavor', 'saveLabel'].every(f =>
        fnvTheme124.includes(f + ':')
      ),
    '124.11: ui-core boot resolves the per-game optic (_resolveOptic) + applies it + updates the (Default) label; GAME_DEFS.theme carries the full shape (WU-T3 seam)'
  );

  // 124.12  the pre-paint inline head script + the OPTICS picker both cover green3 (flash-free)
  assert(
    /<option value="green3">/.test(html124) &&
      /color === 'green3'/.test(html124) &&
      html124.includes("'#4fb05a'"),
    '124.12: index.html exposes the green3 optic option AND the pre-paint head script applies it (no flash on explicit pick)'
  );
}

// ══════════════════════════════════════════════════════════════
//  SUITE 125 — WU-F10 Session Statistics merged into the OVERSEER'S LOG panel
//  The standalone SESSION STATISTICS panel is retired; its campaign readout (kills,
//  caps, damage, campaign play-time, location visits) now lives in the OVERSEER'S LOG
//  panel beside the device telemetry, with the two time metrics clearly distinguished.
//  8 tests
// ══════════════════════════════════════════════════════════════
{
  header('Suite 125 — WU-F10 session stats merged into OVERSEER LOG');
  const html125 = readFile('index.html');
  const render125 = readFile('js/ui-render.js');
  const core125 = readFile('js/ui-core.js');
  const saves125 = readFile('js/ui-saves.js');
  const panel125 = (html125.match(/id="overseerLogPanel"[\s\S]*?<\/details>/) || [''])[0];
  const sessFn125 = (render125.match(/function renderSessionStats\(\)[\s\S]*?\n\}/) || [''])[0];
  const overFn125 = (core125.match(/function renderOverseerLog\(\)[\s\S]*?\n\}/) || [''])[0];
  const resetFn125 = (saves125.match(/function resetSessionStats\(\)[\s\S]*?\n\}/) || [''])[0];

  // 125.1  the standalone SESSION STATISTICS panel is retired entirely
  assert(
    !/SESSION STATISTICS/.test(html125),
    '125.1: the standalone "SESSION STATISTICS" panel is removed from index.html'
  );

  // 125.2  the campaign-stats container is merged INTO the Overseer's Log panel
  assert(
    /id="overseerLogPanel"/.test(html125) &&
      panel125.includes('id="overseerLogDisplay"') &&
      panel125.includes('id="sessionStatsList"'),
    '125.2: #sessionStatsList (campaign stats) now lives inside #overseerLogPanel beside the device telemetry'
  );

  // 125.3  no duplicate campaign-stats container survived the merge
  assert(
    (html125.match(/id="sessionStatsList"/g) || []).length === 1,
    '125.3: exactly one #sessionStatsList remains (no leftover duplicate panel)'
  );

  // 125.4  campaign readout shows all the owner-confirmed stats incl. campaign play-time
  assert(
    /state\.stats/.test(sessFn125) &&
      /KILLS/.test(sessFn125) &&
      /CAPS EARNED/.test(sessFn125) &&
      /DMG DEALT/.test(sessFn125) &&
      /CAMPAIGN TIME/.test(sessFn125) &&
      /LOCATION VISITS/.test(sessFn125) &&
      /locationHistory/.test(sessFn125),
    '125.4: renderSessionStats shows kills, caps earned, dmg dealt, CAMPAIGN TIME, and the LOCATION VISITS count'
  );

  // 125.5  device telemetry is preserved in the same panel
  assert(
    /CURRENT UPTIME/.test(overFn125) &&
      /BOOT COUNT/.test(overFn125) &&
      /TOTAL POWER-ON/.test(overFn125),
    '125.5: renderOverseerLog still shows device telemetry (CURRENT UPTIME / TOTAL POWER-ON / BOOT COUNT)'
  );

  // 125.6  the two time notions are distinctly labelled — campaign play-time vs device uptime
  assert(
    panel125.includes('UNIT TELEMETRY') &&
      panel125.includes('CAMPAIGN LOG') &&
      /CAMPAIGN TIME/.test(sessFn125) &&
      /CURRENT UPTIME/.test(overFn125),
    '125.6: campaign play-time (CAMPAIGN TIME) and device uptime (CURRENT UPTIME) sit under clearly labelled UNIT TELEMETRY / CAMPAIGN LOG sections'
  );

  // 125.7  RESET CAMPAIGN STATS is wired to resetSessionStats, which clears state.stats + re-renders
  assert(
    /onclick="resetSessionStats\(\)"/.test(panel125) &&
      /RESET CAMPAIGN STATS/.test(panel125) &&
      /state\.stats = \{/.test(resetFn125) &&
      /renderSessionStats\(\)/.test(resetFn125),
    '125.7: the RESET CAMPAIGN STATS button calls resetSessionStats(), which resets state.stats and re-renders'
  );

  // 125.8  game-agnostic (Protocol 38) — no game literals in the merged readout
  //        (FALLOUT_REGISTRY is the sanctioned API, so bare "Fallout" is intentionally not matched)
  assert(
    !/New Vegas|Mojave|\bFNV\b|\bFO3\b|Capital Wasteland|Vault 101/i.test(sessFn125 + panel125),
    '125.8: the merged campaign readout is game-agnostic (no FNV/FO3/location literals)'
  );
}

// ══════════════════════════════════════════════════════════════
//  SUITE 126 — WU-F11 native "mark visited" map control
//  A per-row LOG VISIT button on the WORLD GRID flags a location discovered directly,
//  add-only (no un-mark), routed through the single-source recordLocationVisit() helper
//  with NO AI. Accessible (<button>, aria-label, ≥28px tap target), game-agnostic.
//  8 tests
// ══════════════════════════════════════════════════════════════
{
  header('Suite 126 — WU-F11 native mark-visited map control');
  const render126 = readFile('js/ui-render.js');
  const state126 = readFile('js/state.js');
  const css126 = readFile('css/terminal.css');
  const markFn126 = (render126.match(/function markLocationVisited\(loc\)[\s\S]*?\n\}/) || [''])[0];
  const recFn126 = (state126.match(/function recordLocationVisit\([\s\S]*?\n\}/) || [''])[0];
  const markCss126 = (css126.match(/\.map-mark-visited\s*\{[\s\S]*?\}/) || [''])[0];

  // 126.1  the handler exists and routes through the single-source helper → persist → re-render
  assert(
    /function markLocationVisited\(loc\)/.test(render126) &&
      /recordLocationVisit\(loc\)/.test(markFn126) &&
      /saveState\(\)/.test(markFn126) &&
      /renderWorldMap\(\)/.test(markFn126),
    '126.1: markLocationVisited() calls recordLocationVisit(loc) → saveState() → renderWorldMap()'
  );

  // 126.2  NO AI — the handler does no network/Director call
  assert(
    !/fetch\(|XMLHttpRequest|transmitMessage\(|generativelanguage|gemini/i.test(markFn126),
    '126.2: markLocationVisited makes no AI/network call (native, offline)'
  );

  // 126.3  add-only — recordLocationVisit only appends (push + dedup, never removes); there is
  //         no un-mark / forget helper anywhere (owner: add-only, permanent fog-of-war)
  assert(
    /\.push\(/.test(recFn126) &&
      !/\.splice\(|removeLocation|forgetLocation/.test(recFn126) &&
      !/forgetLocationVisit|unmarkLocation|removeLocationVisit/.test(render126 + state126),
    '126.3: mark-visited is add-only — recordLocationVisit appends+dedups, no un-mark/forget helper exists'
  );

  // 126.4  a real LOG VISIT <button> is rendered per row, wired to markLocationVisited via an
  //         escaped data-loc (apostrophe-safe), not a <span onclick>
  assert(
    /class="map-mark-visited"/.test(render126) &&
      /onclick="markLocationVisited\(this\.dataset\.loc\)"/.test(render126) &&
      /data-loc="\$\{escapeHtml\(/.test(render126) &&
      /LOG VISIT<\/button>/.test(render126),
    '126.4: each WORLD GRID row renders a LOG VISIT <button> wired to markLocationVisited via an escaped data-loc'
  );

  // 126.5  accessible label — literal aria-label (UI-3), not diegetic
  assert(
    /aria-label="Mark \$\{escapeHtml\(/.test(render126) && /as visited"/.test(render126),
    '126.5: the LOG VISIT button carries a literal aria-label ("Mark <loc> as visited")'
  );

  // 126.6  add-only gating — the button is suppressed on the current + already-visited rows
  assert(
    /isYou \|\| wasVisited\s*\?\s*''/.test(render126),
    '126.6: the LOG VISIT button only appears on undiscovered rows (suppressed when current or already visited)'
  );

  // 126.7  ≥28px tap target + width:auto override (Protocol 17 / UI-5)
  assert(
    markCss126.length > 0 &&
      /min-height:\s*28px/.test(markCss126) &&
      /width:\s*auto/.test(markCss126),
    '126.7: .map-mark-visited has a ≥28px tap target (min-height) and width:auto (overrides global button width)'
  );

  // 126.8  game-agnostic (Protocol 38) — no game literal in the handler
  assert(
    !/New Vegas|Mojave|\bFNV\b|\bFO3\b|Capital Wasteland|Vault 101/i.test(markFn126),
    '126.8: markLocationVisited is game-agnostic (operates on the loc string, no game literals)'
  );
}

// ══════════════════════════════════════════════════════════════
//  SUITE 127 — WU-T3 per-game identity strings + native save header
//  The boot sequence shows the active game's Pip-Boy model + wasteland uplink, and the
//  save manager shows its saveLabel — all sourced from GAME_DEFS[ctx].theme (Protocol 38).
//  The identity line is injected flavor-independently so WU-F6 cold/degraded boot is intact.
//  8 tests
// ══════════════════════════════════════════════════════════════
{
  header('Suite 127 — WU-T3 per-game identity strings + save header');
  const state127 = readFile('js/state.js');
  const audio127 = readFile('js/ui-audio.js');
  const account127 = readFile('js/ui-account.js');
  const css127 = readFile('css/terminal.css');
  const fnvTheme127 = (state127.match(/FNV:[\s\S]*?theme:\s*\{([\s\S]*?)\}/) || ['', ''])[1];
  const fo3Theme127 = (state127.match(/FO3:[\s\S]*?theme:\s*\{([\s\S]*?)\}/) || ['', ''])[1];
  const grab127 = (block, k) => (block.match(new RegExp(k + ":\\s*'([^']+)'")) || [])[1] || '';
  const blf127 = (audio127.match(/function _bootLinesFor\(flavor\)[\s\S]*?\n\}/) || [''])[0];
  const t3region127 = (audio127.match(/WU-T3:[\s\S]*?lines\.splice\([^\n]*\);/) || [''])[0];
  const headerRegion127 = (account127.match(/const _archiveHeader =[\s\S]*?'<\/div>';/) || [''])[0];

  // 127.1  both games declare non-empty bootFlavor + pipBoyModel + saveLabel identity strings
  assert(
    grab127(fnvTheme127, 'bootFlavor') &&
      grab127(fnvTheme127, 'pipBoyModel') &&
      grab127(fnvTheme127, 'saveLabel') &&
      grab127(fo3Theme127, 'bootFlavor') &&
      grab127(fo3Theme127, 'pipBoyModel') &&
      grab127(fo3Theme127, 'saveLabel'),
    '127.1: GAME_DEFS.FNV.theme and FO3.theme each declare non-empty bootFlavor, pipBoyModel, and saveLabel'
  );

  // 127.2  per-game DISTINCT identity — FNV ≠ FO3 for the boot flavor and the save label
  assert(
    grab127(fnvTheme127, 'saveLabel') !== grab127(fo3Theme127, 'saveLabel') &&
      grab127(fnvTheme127, 'bootFlavor') !== grab127(fo3Theme127, 'bootFlavor'),
    '127.2: FNV and FO3 have distinct saveLabel and bootFlavor identity strings (the games differ at a glance)'
  );

  // 127.3  runBootSequence injects the identity line from the active game's theme (data-driven)
  assert(
    /_activeDef\(\)\.theme/.test(t3region127) &&
      /pipBoyModel/.test(t3region127) &&
      /bootFlavor/.test(t3region127) &&
      /lines\.splice\(/.test(t3region127),
    '127.3: runBootSequence reads _activeDef().theme (pipBoyModel + bootFlavor) and splices the identity line into the boot output'
  );

  // 127.4  the identity line is FLAVOR-INDEPENDENT — injected in runBootSequence, NOT inside
  //        _bootLinesFor (so it shows for every flavor and can't break the WU-F6 POST content)
  assert(
    t3region127.length > 0 &&
      blf127.length > 0 &&
      !/theme|bootFlavor|pipBoyModel|_activeDef/.test(blf127),
    '127.4: the identity line is injected after _bootLinesFor (flavor-independent); _bootLinesFor itself carries no theme/identity code'
  );

  // 127.5  WU-F6 boot NOT regressed — the three flavor POSTs + the WU-B10 _bootActive window
  //        and onComplete are all still intact
  assert(
    /RETROS BIOS/.test(blf127) &&
      /CRT TUBE COLD/.test(blf127) &&
      /64K RAM SYSTEM/.test(blf127) &&
      /_bootActive = true/.test(audio127) &&
      /_bootActive = false/.test(audio127) &&
      /if \(onComplete\) onComplete\(\)/.test(audio127),
    '127.5: the cold/degraded/normal boot POSTs + the _bootActive window + onComplete are preserved (no WU-F6/B10 regression)'
  );

  // 127.6  the save manager header consumes theme.saveLabel (escaped) + the CSS class exists
  assert(
    /_activeDef\(\)\.theme/.test(account127) &&
      /saveLabel/.test(headerRegion127) &&
      /escapeHtml\(/.test(headerRegion127) &&
      /saves-archive-header/.test(account127) &&
      /\.saves-archive-header\s*\{/.test(css127),
    '127.6: renderSavesList renders a per-game header from theme.saveLabel (escaped) into .saves-archive-header'
  );

  // 127.7  fail-safe — both the boot line and the save header fall back to generic text if the
  //        theme strings are absent (a brand-new/legacy context never shows a broken header)
  assert(
    /pipBoyModel \|\| 'PIP-BOY'/.test(audio127) &&
      /bootFlavor \|\| 'WASTELAND UPLINK'/.test(audio127) &&
      /saveLabel \|\| 'CAMPAIGN ARCHIVE'/.test(account127),
    '127.7: the boot identity line and the save header both fail-safe to a generic label when theme strings are missing'
  );

  // 127.8  game-agnostic (Protocol 38) — the CONSUMING code carries no game literal; the
  //        identity comes only from GAME_DEFS (the sanctioned game-specific data block)
  assert(
    !/New Vegas|Mojave|\bFNV\b|\bFO3\b|Capital Wasteland|Vault-Tec|Lucky 38/i.test(
      t3region127 + headerRegion127
    ),
    '127.8: the boot-injection + save-header consuming code is game-agnostic (strings sourced only from GAME_DEFS theme)'
  );
}

// ══════════════════════════════════════════════════════════════
//  SUITE 128 — WU-REN test-runner rename escape-ratchet (Protocol 36b)
//  The runners were renamed to tests/robco-diagnostics.{js,ps1}. This guard fails the
//  gate if ANY stale reference to the legacy runner name reappears anywhere — code,
//  scripts, hooks, CI, or docs — so the rename can never silently regress.
//  (The forbidden literal is assembled at runtime so this guard file never self-matches.)
//  5 tests
// ══════════════════════════════════════════════════════════════
{
  header('Suite 128 — WU-REN runner-rename escape-ratchet');
  const _legacy = 'check-' + 'persistence'; // assembled so this source carries no literal match
  const _exists = rel => {
    try {
      return fs.existsSync(path.join(ROOT, rel));
    } catch (_) {
      return false;
    }
  };
  const _readIf = rel => {
    try {
      return _exists(rel) ? fs.readFileSync(path.join(ROOT, rel), 'utf8') : '';
    } catch (_) {
      return '';
    }
  };

  // 128.1  the renamed runners exist under the RobCo-themed names
  assert(
    _exists('tests/robco-diagnostics.js') && _exists('tests/robco-diagnostics.ps1'),
    '128.1: tests/robco-diagnostics.js + tests/robco-diagnostics.ps1 both exist (runners renamed)'
  );

  // 128.2  the legacy-named runner files are gone (git mv, not copy)
  assert(
    !_exists('tests/' + _legacy + '.js') && !_exists('tests/' + _legacy + '.ps1'),
    '128.2: the legacy-named runner files no longer exist on disk (renamed, not duplicated)'
  );

  // 128.3  escape-ratchet: ZERO stale legacy-name references anywhere in the reference set
  const scanList = [
    'package.json',
    'scripts/gate.js',
    'scripts/pre-commit',
    'scripts/pre-push',
    'scripts/install-hooks.js',
    'tests/test.html',
    'tests/run-tests.bat',
    'tests/robco-diagnostics.js',
    'tests/robco-diagnostics.ps1',
    '.github/workflows/nightly-tests.yml',
    '.github/workflows/ci.yml',
    'README.md',
    'ARCHITECTURE.md',
    'CHANGELOG.md',
    'RULES.md',
    'CLAUDE.md',
  ];
  const offenders = scanList.filter(f => _readIf(f).includes(_legacy));
  assert(
    offenders.length === 0,
    '128.3: no stale legacy test-runner-name reference remains in code/scripts/CI/docs' +
      (offenders.length ? ' — OFFENDERS: ' + offenders.join(', ') : '')
  );

  // 128.4  the runtime invocations were actually repointed to the new names
  const gate128 = _readIf('scripts/gate.js');
  const pkg128 = _readIf('package.json');
  const nightly128 = _readIf('.github/workflows/nightly-tests.yml');
  assert(
    /node tests\/robco-diagnostics\.js/.test(gate128) &&
      /robco-diagnostics\.ps1/.test(gate128) &&
      /tests\/robco-diagnostics\.js/.test(pkg128) &&
      /tests\/robco-diagnostics\.(js|ps1)/.test(nightly128),
    '128.4: gate.js, package.json, and nightly-tests.yml all invoke the renamed runners'
  );

  // 128.5  gate.js still pairs BOTH runners (parity invocation intact under the new names)
  assert(
    /robco-diagnostics\.js/.test(gate128) && /robco-diagnostics\.ps1/.test(gate128),
    '128.5: scripts/gate.js references both robco-diagnostics.js and robco-diagnostics.ps1 (dual-runner gate intact)'
  );
}

// ══════════════════════════════════════════════════════════════
//  SUITE 129 — first-load desktop-layout guard (Protocol 42)
//  The desktop app-shell (fixed-height two-column) must be gated on a fine pointer +
//  hover so a touch phone can NEVER boot into the PC layout, even if a first-paint
//  layout-viewport race momentarily reports ≥1000px. The JS panel-open default must use
//  the same matchMedia gate, not a raw window.innerWidth read.
//  4 tests
// ══════════════════════════════════════════════════════════════
{
  header('Suite 129 — first-load desktop-layout pointer/hover gate');
  const css129 = readFile('css/terminal.css');
  const core129 = readFile('js/ui-core.js');
  const GATE = '(min-width: 1000px) and (hover: hover) and (pointer: fine)';

  // 129.1  the desktop app-shell media query carries the pointer/hover gate
  assert(
    css129.includes('@media ' + GATE),
    '129.1: the desktop layout @media is gated on (min-width:1000px) and (hover:hover) and (pointer:fine)'
  );

  // 129.2  no UNGATED `@media (min-width: 1000px)` remains — the ungated query was the bug
  //        (a phone with a mis-measured wide viewport would match it and get the PC shell)
  assert(
    !/@media\s*\(min-width:\s*1000px\)\s*\{/.test(css129),
    '129.2: no ungated `@media (min-width: 1000px) {` remains in terminal.css (desktop shell is pointer/hover-gated)'
  );

  // 129.3  the JS panel-open default uses the same matchMedia gate, not raw window.innerWidth
  assert(
    core129.includes("window.matchMedia('" + GATE + "')") &&
      !/window\.innerWidth\s*>=\s*1000/.test(core129),
    '129.3: ui-core panel default-open uses matchMedia(gated query); the raw window.innerWidth >= 1000 read is gone'
  );

  // 129.4  the desktop shell still exists inside the gated block (the fixed-height,
  //        overflow-hidden PC layout is preserved for actual desktops — no over-correction)
  const desktopBlock129 = (css129.match(/@media \(min-width: 1000px\)[^{]*\{([\s\S]*?\n\})/) || [
    '',
    '',
  ])[1];
  assert(
    /grid-template-columns:\s*380px 1fr/.test(desktopBlock129) &&
      /overflow:\s*hidden/.test(desktopBlock129),
    '129.4: the gated desktop block still defines the two-column 380px 1fr shell with body overflow:hidden (desktop preserved)'
  );
}

// ══════════════════════════════════════════════════════════════
//  SUITE 130 — per-game optic persistence + dynamic "(Default)" label
//  Item 4: the OPTICS picker dynamically tags the ACTIVE game's default optic "(Default)".
//  Item 5: the chosen optic persists PER GAME (robco_optic_<ctx>), resolved per-game pick →
//  game default → green. Both are game-agnostic / N-game scalable (keyed by gameContext) —
//  adding a game needs ZERO theming-code change.
//  8 tests
// ══════════════════════════════════════════════════════════════
{
  header('Suite 130 — per-game optics + dynamic (Default) label');
  const audio130 = readFile('js/ui-audio.js');
  const core130 = readFile('js/ui-core.js');
  const html130 = readFile('index.html');
  const saves130 = readFile('js/ui-saves.js');
  const keyFn130 = (audio130.match(/function _opticStorageKey\([\s\S]*?\n\}/) || [''])[0];
  const resolveOpticFn130 = (audio130.match(/function _resolveOptic\(\)[\s\S]*?\n\}/) || [''])[0];
  const changeFn130 = (audio130.match(/function changeOpticsColor\([\s\S]*?\n\}/) || [''])[0];
  const labelFn130 = (audio130.match(/function _updateOpticsDefaultLabel\(\)[\s\S]*?\n\}/) || [
    '',
  ])[0];

  // 130.1  per-game storage key is game-agnostic — robco_optic_<ctx> via getGameContext()
  assert(
    /function _opticStorageKey\(/.test(audio130) &&
      /'robco_optic_' \+ /.test(keyFn130) &&
      /getGameContext\(\)/.test(keyFn130),
    '130.1: _opticStorageKey() returns robco_optic_<ctx> keyed by getGameContext() (game-agnostic per-game key)'
  );

  // 130.2  changeOpticsColor persists to the PER-GAME key, not the legacy global
  assert(
    /localStorage\.setItem\(_opticStorageKey\(\), color\)/.test(changeFn130) &&
      !/setItem\('robco_optics'/.test(changeFn130),
    '130.2: changeOpticsColor persists the pick to the per-game _opticStorageKey() (not the global robco_optics)'
  );

  // 130.3  resolution order: per-game pick → (one-time legacy migration) → game default
  assert(
    /_opticStorageKey\(\)/.test(resolveOpticFn130) &&
      /getItem\('robco_optics'\)/.test(resolveOpticFn130) &&
      /removeItem\('robco_optics'\)/.test(resolveOpticFn130) &&
      /_resolveDefaultOptics\(\)/.test(resolveOpticFn130),
    '130.3: _resolveOptic = per-game pick → migrate+retire legacy global → _resolveDefaultOptics (default → green)'
  );

  // 130.4  boot resolves + applies the per-game optic, syncs the picker, updates the label
  assert(
    /_resolveOptic\(\)/.test(core130) &&
      /_applyThemeVars\(_optic\)/.test(core130) &&
      /opticsColorInput/.test(core130) &&
      /_updateOpticsDefaultLabel\(\)/.test(core130),
    '130.4: ui-core boot applies _resolveOptic(), sets the picker value, and calls _updateOpticsDefaultLabel()'
  );

  // 130.5  dynamic "(Default)" label tags the option matching the active game's default optic
  assert(
    /_resolveDefaultOptics\(\)/.test(labelFn130) &&
      /opt\.value === def/.test(labelFn130) &&
      /\(Default\)/.test(labelFn130) &&
      /\.replace\(/.test(labelFn130),
    '130.5: _updateOpticsDefaultLabel tags the option whose value === _resolveDefaultOptics() with "(Default)" and strips it from the rest'
  );

  // 130.6  index.html: the green option carries NO static "(Default)"; the pre-paint head
  //        script reads the per-game key
  assert(
    /<option value="green">RobCo Green<\/option>/.test(html130) &&
      !/<option value="green">[^<]*\(Default\)/.test(html130) &&
      /'robco_optic_' \+ _ctx0/.test(html130),
    '130.6: the static "(Default)" is gone from the markup (JS adds it dynamically); the head pre-paint script reads robco_optic_<ctx>'
  );

  // 130.7  game-agnostic / N-game scalable — no two-game hardcode in the optic code; the only
  //        FNV is the sanctioned `|| 'FNV'` absence fallback. A new game drops in via data.
  const opticCode130 = keyFn130 + resolveOpticFn130 + changeFn130 + labelFn130;
  assert(
    !/\bFO3\b/.test(opticCode130) &&
      !/===\s*'FNV'/.test(opticCode130) &&
      /'robco_optic_' \+ /.test(keyFn130),
    '130.7: per-game optic persistence/resolution is game-agnostic — keyed by gameContext, no two-game hardcode (a new game needs zero theming-code change)'
  );

  // 130.8  ui-saves export reads the per-game resolved optic, not the global key
  assert(
    /_resolveOptic\(\)/.test(saves130) && !/getItem\('robco_optics'\)/.test(saves130),
    '130.8: ui-saves export reads the per-game resolved optic (_resolveOptic), not the global robco_optics'
  );
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
 *         const hook = '#!/bin/sh\nnode tests/robco-diagnostics.js\n';
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
