#!/usr/bin/env node
/**
 * scripts/generate-code-map.js — Protocol 53 (rules/docs-and-library.md).
 *
 * library/CODE_MAP.md is a HYBRID doc (Protocol 53) — most of it is hand-written conceptual
 * invariants (the Two-Store Boundary, the Registry, the panel-wiring checklist, the Audio
 * categorization, the Boot Lifecycle "why" notes) that no script should touch. But three of
 * its sub-sections are pure mechanical transforms of a live source array/grep, and this script
 * regenerates ONLY those three, between committed marker pairs — everything else in the file
 * is left byte-identical (QUEUE.md item U, GENERATE_VS_MAINTAIN_AUDIT.md candidates #6/#7/#8):
 *
 *   1. DIAGNOSTIC_SHELL_TABLE  — every `DIAGNOSTIC_SHELL_TOOLS` entry (js/dev/test-console.js),
 *      live vm-evaluated (the same technique Suite 212's `_evalRealTools()` already
 *      established), grouped by category, id/label/tier/destructive/triggers per row.
 *   2. RENDER_PIPELINE_FILES   — every top-level `function` in each `js/ui/ui-render-*.js`
 *      sibling, via `^function `, joined onto its panel name. The panel-NAME mapping is a
 *      curated fact (judgment, not derivable — RENDER_FILE_PANELS below); only the per-file
 *      FUNCTION LIST is generated.
 *   3. EVENT_BUS_NAMES         — every `RobcoEvents.emit('<name>', …)` string literal across
 *      `js/**\/*.js`, excluding `js/dev/test-console.js` (a replay surface that re-fires every
 *      event on demand for the Diagnostic Shell — not a canonical emitter; CODE_MAP's own
 *      surrounding prose already documents why it's excluded).
 *
 * Like Protocol 47's library/TEST_CATALOG.md, `library/` is gitignored — the gate-diff shape
 * matches exactly: --check treats an ABSENT file as success (a clean CI checkout, or any
 * machine without the local-only library/ tree, has nothing to diff against) and
 * PRESENT-AND-DRIFTED as a real failure. Regeneration is a deliberate step, never automatic.
 *
 * Usage:
 *   node scripts/generate-code-map.js         — rewrite the three marked blocks in place
 *   node scripts/generate-code-map.js --check — verify current; exit 1 if stale
 */
'use strict';

const fs = require('fs');
const path = require('path');
const { writeFileAtomic } = require('./atomic-write.js');

const ROOT = path.join(__dirname, '..');
const TEST_CONSOLE_PATH = path.join(ROOT, 'js', 'dev', 'test-console.js');
const RENDER_DIR = path.join(ROOT, 'js', 'ui');
const JS_ROOT = path.join(ROOT, 'js');
// Overridable so a regression suite can exercise the real CLI against a throwaway copy
// instead of mutating the developer's own library/CODE_MAP.md (same technique as
// Protocol 47's ROBCO_TEST_CATALOG_OUTPUT / Protocol 52's ROBCO_ARCHITECTURE_MD_PATH).
const OUTPUT_PATH = process.env.ROBCO_CODE_MAP_OUTPUT || path.join(ROOT, 'library', 'CODE_MAP.md');

// Below these, the parser is almost certainly broken (a source convention changed
// elsewhere) — refuse to write/compare a suspiciously-truncated block rather than
// silently shipping a half-empty one (anti-vacuous, same spirit as Protocol 47/52).
const MIN_EXPECTED_TOOLS = 100;
const MIN_EXPECTED_RENDER_FILES = 9;
const MIN_EXPECTED_EVENTS = 15;

// Curated panel-name mapping (judgment, not derivable from source — kept here rather than
// re-typed by hand at every regenerate). Order matches the file's own historical listing.
const RENDER_FILE_PANELS = [
  ['ui-render-inventory.js', 'Cargo Manifest & Ammo'],
  ['ui-render-character.js', 'Character & Field Status'],
  ['ui-render-record.js', 'Personal Record'],
  ['ui-render-ledger.js', 'Field Ledger'],
  ['ui-render-map.js', 'Cartography Table'],
  ['ui-render-factions.js', 'Faction Reputation & Karma'],
  ['ui-render-economy.js', 'Resource Economy'],
  ['ui-render-loot.js', 'Item Acquisition'],
  ['ui-render-databank.js', 'Native Databank Tools'],
];

const MARKERS = {
  diagnosticShell: ['<!-- DIAGNOSTIC_SHELL_TABLE:BEGIN -->', '<!-- DIAGNOSTIC_SHELL_TABLE:END -->'],
  renderPipeline: ['<!-- RENDER_PIPELINE_FILES:BEGIN -->', '<!-- RENDER_PIPELINE_FILES:END -->'],
  eventBus: ['<!-- EVENT_BUS_NAMES:BEGIN -->', '<!-- EVENT_BUS_NAMES:END -->'],
};

// ── 1. DIAGNOSTIC_SHELL_TABLE ────────────────────────────────────────────────
// Live vm-eval of the REAL array — the same extraction shape Suite 212's
// `_evalRealTools()` established. Only one entry in the whole array is a bare
// (non-arrow) `action:` reference (`_replayHatch`), and DATA extraction never
// calls any `action`, so a no-op stub is enough — we're reading the literal's
// shape, not executing it.
function extractDiagnosticShellTools(testConsoleSrc) {
  const startTok = 'var DIAGNOSTIC_SHELL_TOOLS = [';
  const start = testConsoleSrc.indexOf(startTok);
  if (start === -1) return null;
  const endTok = '\n  ];';
  const endIdx = testConsoleSrc.indexOf(endTok, start);
  if (endIdx === -1) return null;
  const arraySrc = testConsoleSrc.slice(start, endIdx + endTok.length);
  const wrapped = `(function () {
    function _replayHatch() {}
    ${arraySrc}
    return DIAGNOSTIC_SHELL_TOOLS;
  })()`;
  return eval(wrapped);
}

function buildDiagnosticShellBlock(tools) {
  const order = [];
  const byCategory = new Map();
  for (const t of tools) {
    if (!byCategory.has(t.category)) {
      byCategory.set(t.category, []);
      order.push(t.category);
    }
    byCategory.get(t.category).push(t);
  }
  const lines = [];
  lines.push(
    `_${tools.length} tools across ${order.length} categories — live vm-evaluated from the real ` +
      '`DIAGNOSTIC_SHELL_TOOLS` array (`js/dev/test-console.js`) by `scripts/generate-code-map.js` ' +
      '(`npm run code-map`). Never hand-edit; regenerate instead._'
  );
  lines.push('');
  for (const cat of order) {
    const rows = byCategory.get(cat);
    lines.push(`**\`${cat}\`** (${rows.length})`);
    lines.push('');
    lines.push('| id | label | tier | destructive | triggers |');
    lines.push('| --- | --- | --- | --- | --- |');
    for (const t of rows) {
      const triggers = (t.triggers || []).length
        ? t.triggers.map(x => `\`${x}\``).join(', ')
        : '_none_';
      lines.push(
        `| \`${t.id}\` | ${t.label} | ${t.tier} | ${t.destructive ? 'yes' : 'no'} | ${triggers} |`
      );
    }
    lines.push('');
  }
  return lines.join('\n').trimEnd();
}

// ── 2. RENDER_PIPELINE_FILES ─────────────────────────────────────────────────
function extractRenderFileFunctions() {
  return RENDER_FILE_PANELS.map(([file, panel]) => {
    const src = fs.readFileSync(path.join(RENDER_DIR, file), 'utf8');
    const fns = [...src.matchAll(/^function\s+([A-Za-z0-9_$]+)\s*\(/gm)].map(m => m[1]);
    return { file, panel, fns };
  });
}

function buildRenderPipelineBlock(entries) {
  return entries
    .map(e => ` - \`js/ui/${e.file}\` — ${e.panel}: ${e.fns.map(f => `\`${f}\``).join(', ')}`)
    .join('\n');
}

// ── 3. EVENT_BUS_NAMES ───────────────────────────────────────────────────────
function extractEmittedEventNames() {
  const names = new Set();
  function walk(dir) {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const abs = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        walk(abs);
        continue;
      }
      if (!entry.name.endsWith('.js')) continue;
      // A replay surface, not a canonical emitter (CODE_MAP's own § Event Bus prose) —
      // it re-fires every real event on demand for the Diagnostic Shell, so counting its
      // emit() call sites here would just echo the real list back, not add to it.
      if (entry.name === 'test-console.js') continue;
      const src = fs.readFileSync(abs, 'utf8');
      for (const m of src.matchAll(/RobcoEvents\.emit\(\s*'([^']+)'/g)) names.add(m[1]);
    }
  }
  walk(JS_ROOT);
  return [...names].sort();
}

function buildEventBusBlock(names) {
  return (
    `- **Emitted event names** (${names.length}, generated by \`scripts/generate-code-map.js\` — ` +
    '`npm run code-map`, Protocol 53 — grep `RobcoEvents\\.emit(` across `js/**/*.js`, excluding ' +
    "`js/dev/test-console.js`'s replay surface): " +
    names.map(n => `\`${n}\``).join(', ')
  );
}

// ── Marker-block replace helper (shared shape, applied 3x) ───────────────────
function applyBetweenMarkers(src, [beginTok, endTok], body) {
  const beginIdx = src.indexOf(beginTok);
  const endIdx = src.indexOf(endTok);
  if (beginIdx === -1 || endIdx === -1 || endIdx < beginIdx) return null;
  const beginLineEnd = src.indexOf('\n', beginIdx);
  if (beginLineEnd === -1) return null;
  const before = src.slice(0, beginLineEnd + 1);
  const after = src.slice(endIdx);
  return before + body + '\n' + after;
}

function buildUpdatedDoc(src, blocks) {
  let updated = src;
  for (const key of Object.keys(MARKERS)) {
    const next = applyBetweenMarkers(updated, MARKERS[key], blocks[key]);
    if (next === null) return { updated: null, missing: key };
    updated = next;
  }
  return { updated, missing: null };
}

function generateAll() {
  const testConsoleSrc = fs.readFileSync(TEST_CONSOLE_PATH, 'utf8');
  const tools = extractDiagnosticShellTools(testConsoleSrc);
  if (!tools || tools.length < MIN_EXPECTED_TOOLS) {
    console.error(
      `[code-map] Parser self-check failed: DIAGNOSTIC_SHELL_TOOLS extraction found only ` +
        `${tools ? tools.length : 0} tools (expected >= ${MIN_EXPECTED_TOOLS}). Refusing to ` +
        'write/compare — the extraction likely needs updating for a new array shape.'
    );
    process.exit(1);
  }

  const renderEntries = extractRenderFileFunctions();
  if (
    renderEntries.length < MIN_EXPECTED_RENDER_FILES ||
    renderEntries.some(e => e.fns.length === 0)
  ) {
    console.error(
      '[code-map] Parser self-check failed: one or more ui-render-*.js siblings parsed to zero ' +
        'top-level functions. Refusing to write/compare — check RENDER_FILE_PANELS against disk.'
    );
    process.exit(1);
  }

  const eventNames = extractEmittedEventNames();
  if (eventNames.length < MIN_EXPECTED_EVENTS) {
    console.error(
      `[code-map] Parser self-check failed: only ${eventNames.length} RobcoEvents.emit(...) names ` +
        `found (expected >= ${MIN_EXPECTED_EVENTS}). Refusing to write/compare.`
    );
    process.exit(1);
  }

  return {
    diagnosticShell: buildDiagnosticShellBlock(tools),
    renderPipeline: buildRenderPipelineBlock(renderEntries),
    eventBus: buildEventBusBlock(eventNames),
    stats: { tools: tools.length, renderFiles: renderEntries.length, events: eventNames.length },
  };
}

function main() {
  const checkMode = process.argv.includes('--check');

  if (checkMode && !fs.existsSync(OUTPUT_PATH)) {
    console.log(
      '[code-map:check] library/CODE_MAP.md is absent (gitignored, local-only) — skipping.'
    );
    process.exit(0);
  }

  const blocks = generateAll();

  if (!fs.existsSync(OUTPUT_PATH)) {
    console.error(
      `[code-map] ${OUTPUT_PATH} does not exist — cannot regenerate a hybrid doc ` +
        'that was never authored. Create it with its marker pairs first.'
    );
    process.exit(1);
  }

  const onDisk = fs.readFileSync(OUTPUT_PATH, 'utf8');
  const { updated, missing } = buildUpdatedDoc(onDisk, blocks);
  if (updated === null) {
    console.error(
      `[code-map] Could not find the ${MARKERS[missing][0]} marker pair in ${OUTPUT_PATH} — ` +
        'has the file structure changed? Expected marker comments: ' +
        MARKERS[missing].join(' / ')
    );
    process.exit(1);
  }

  if (checkMode) {
    if (updated === onDisk) {
      console.log(
        `[code-map:check] library/CODE_MAP.md's generated sections are current ` +
          `(${blocks.stats.tools} tools, ${blocks.stats.renderFiles} render files, ` +
          `${blocks.stats.events} events).`
      );
      process.exit(0);
    }
    console.error(
      "[code-map:check] library/CODE_MAP.md's GENERATED sections are STALE relative to source."
    );
    console.error('  Regenerate with: npm run code-map');
    console.error(
      '  (library/ is gitignored — nothing to commit, just keep the local file current.)'
    );
    process.exit(1);
  }

  // WF12 — atomic, never truncating. READ-MODIFY-WRITE of a hybrid doc that is its own
  // input, and library/ is gitignored: a truncation here is NOT recoverable by
  // `git checkout`, only from the private archive's last sync (Protocol 48).
  writeFileAtomic(OUTPUT_PATH, updated, { encoding: 'utf8' });
  console.log(
    `[code-map] Wrote library/CODE_MAP.md's generated sections ` +
      `(${blocks.stats.tools} tools, ${blocks.stats.renderFiles} render files, ` +
      `${blocks.stats.events} events).`
  );
}

if (require.main === module) main();

module.exports = {
  extractDiagnosticShellTools,
  buildDiagnosticShellBlock,
  extractRenderFileFunctions,
  buildRenderPipelineBlock,
  extractEmittedEventNames,
  buildEventBusBlock,
  applyBetweenMarkers,
  buildUpdatedDoc,
  MARKERS,
  RENDER_FILE_PANELS,
};
