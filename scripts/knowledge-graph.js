#!/usr/bin/env node
/**
 * scripts/knowledge-graph.js — R11 knowledge-graph / retrieval-topology extractor (minimum version).
 *
 * Reads CLAUDE.md's retrieval-map table, each `rules/*.md` note's own scope header,
 * CLAUDE.md's two reference tables, and `library/MANIFEST.txt`, and emits ONE JSON
 * document: typed nodes (each with an `observation` state), typed edges (`routes_to`,
 * `claims_scope_over`, `references`, `manifests`, `contains`), a diagnostics block, and
 * a per-extractor status block. Design of record: planning/2.8.5/plans/KNOWLEDGE_GRAPH_PLAN.md
 * and KNOWLEDGE_GRAPH_SPEC.md. Queue home: QUEUE.md item R11.
 *
 * Load-bearing ideas this script must not violate:
 *   (a) `routes_to` (CLAUDE.md's map) and `claims_scope_over` (each note's own header) are
 *       derived from DIFFERENT source text with NO cross-read. Their disagreement is a
 *       diff step's output, never hunted for by either extractor directly.
 *   (b) Every extractor reports records_seen / records_emitted / records_unparsed /
 *       parser_status. A source that is present but unmatched is `empty_parse`, NEVER an
 *       empty-but-healthy result — graph_status can only be `healthy` if every extractor
 *       is `ok`.
 *   (c) The six known drift gaps (plan §2b) are the acceptance floor: a run reporting
 *       zero gaps means the parser is lying, not that the project is clean.
 *
 * Un-gated by owner decision (Protocol 50 / plan §7 Q5) — this script is run manually,
 * wired into no Suite and no git hook, until it demonstrably catches real drift.
 *
 * Output is GENERATED-class: gitignored, never committed, regenerated fresh every run.
 */
'use strict';

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const REPO_ROOT = path.resolve(__dirname, '..');
const OUTPUT_PATH =
  process.env.ROBCO_GRAPH_OUTPUT || path.join(REPO_ROOT, 'library', 'knowledge-graph.json');

const RULE_NOTES = [
  'state-and-save',
  'deploy-and-cache',
  'auth-and-cloud',
  'ui-and-mobile',
  'audio',
  'game-data',
  'ai-contract',
  'file-layout',
  'testing-and-gates',
  'docs-and-library',
];

// ---------------------------------------------------------------------------
// File access helpers
// ---------------------------------------------------------------------------

function readRepoFile(relPath) {
  try {
    return fs.readFileSync(path.join(REPO_ROOT, relPath), 'utf8');
  } catch {
    return null;
  }
}

function repoFileExists(relPath) {
  try {
    return fs.existsSync(path.join(REPO_ROOT, relPath));
  } catch {
    return false;
  }
}

// Single-snapshot tracked-tree read (spec §9: no cross-commit diffing, no git
// rename-similarity heuristic — this is just "what does the current tree contain").
function getTrackedFiles() {
  const res = spawnSync('git', ['ls-files'], {
    cwd: REPO_ROOT,
    encoding: 'utf8',
  });
  if (res.status !== 0 || typeof res.stdout !== 'string') return null;
  return new Set(
    res.stdout
      .split('\n')
      .map(s => s.trim())
      .filter(Boolean)
  );
}

// ---------------------------------------------------------------------------
// §2c — the backtick-token classifier (shared by every path-bearing extractor)
// ---------------------------------------------------------------------------

function classifyToken(rawToken) {
  const t = rawToken.trim();
  if (t.endsWith('/')) return 'directory';
  if (t.endsWith('()')) return 'symbol';
  if (/^<[A-Za-z][A-Za-z0-9]*>$/.test(t)) return 'symbol'; // e.g. `<script>`
  if (/\.[A-Za-z0-9]+$/.test(t)) return 'file'; // ends in a dotted extension
  if (/^[A-Za-z_][A-Za-z0-9_]*$/.test(t)) return 'symbol'; // bare identifier, e.g. `state`
  return 'prose'; // shouldn't normally occur — a backtick token that fits no known shape
}

// Splits a `·`-joined (U+00B7 MIDDLE DOT) run of text into trimmed segments.
function splitSegments(rawText) {
  return rawText
    .split('·')
    .map(s => s.trim())
    .filter(Boolean);
}

// Every backtick span in a segment, in order, as raw (unquoted) token text.
function extractBacktickTokens(segment) {
  const tokens = [];
  const re = /`([^`]+)`/g;
  let m;
  while ((m = re.exec(segment))) tokens.push(m[1]);
  return tokens;
}

function slugSelector(text) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);
}

// ---------------------------------------------------------------------------
// §1 — node registry
// ---------------------------------------------------------------------------

function buildNodeRegistry(manifestStubs) {
  const nodes = new Map(); // key -> node
  const add = (key, kind, observation, extra) => {
    nodes.set(key, { key, kind, observation, ...extra });
  };

  add('skill:SKILL.md', 'skill', repoFileExists('skill/SKILL.md') ? 'observed' : 'unavailable');
  add('doc:CLAUDE.md', 'doc', repoFileExists('CLAUDE.md') ? 'observed' : 'unavailable');

  for (const name of RULE_NOTES) {
    add(`rule:${name}`, 'rule', repoFileExists(`rules/${name}.md`) ? 'observed' : 'unavailable', {
      file: `rules/${name}.md`,
    });
  }

  add('doc:ARCHITECTURE.md', 'doc', repoFileExists('ARCHITECTURE.md') ? 'observed' : 'unavailable');
  add('doc:QUEUE.md', 'doc', repoFileExists('QUEUE.md') ? 'observed' : 'unavailable');
  add('doc:QUEUE_LOG.md', 'doc', repoFileExists('QUEUE_LOG.md') ? 'observed' : 'unavailable');

  add('group:library', 'group', 'observed');
  for (const stub of manifestStubs) {
    add(`lib:${stub}`, 'lib', repoFileExists(`library/${stub}`) ? 'observed' : 'manifested', {
      file: `library/${stub}`,
    });
  }
  add(
    'doc:library/MANIFEST.txt',
    'doc',
    repoFileExists('library/MANIFEST.txt') ? 'observed' : 'unavailable'
  );

  add('ext:private-archive', 'ext', 'declared');
  add('ext:memory', 'ext', 'declared');
  add('ext:museum', 'ext', 'declared');
  add('ext:atlas', 'ext', 'declared');

  return nodes;
}

// ---------------------------------------------------------------------------
// `manifests` / `contains` — library/MANIFEST.txt (the cleanest parse; build first)
// ---------------------------------------------------------------------------

function extractManifest() {
  const status = {
    source: 'library/MANIFEST.txt',
    records_seen: 0,
    records_emitted: 0,
    records_unparsed: 0,
    parser_status: 'ok',
  };
  const text = readRepoFile('library/MANIFEST.txt');
  if (text == null) {
    status.parser_status = 'source_missing';
    return { stubs: [], edges: [], status };
  }
  const dataLines = text.split('\n').filter(l => l.trim() && !l.trim().startsWith('#'));
  status.records_seen = dataLines.length;
  const stubs = dataLines.map(l => l.trim());
  const edges = [];
  for (const stub of stubs) {
    edges.push({ type: 'manifests', source: 'group:library', target: `lib:${stub}` });
    edges.push({ type: 'contains', source: 'group:library', target: `lib:${stub}` });
  }
  status.records_emitted = edges.length;
  if (dataLines.length === 0) status.parser_status = 'empty_parse';
  return { stubs, edges, status };
}

// Shared by every `·`-segment path-bearing extractor (routes_to today;
// claims_scope_over reuses this exact helper — the independence load-bearing
// idea is about which SOURCE TEXT feeds it, not about having two classifiers).
function edgesFromSegments(segments, type, note) {
  const edges = [];
  for (const seg of segments) {
    const tokens = extractBacktickTokens(seg);
    if (tokens.length === 0) {
      edges.push({
        type,
        note,
        kind: 'selector',
        raw: seg,
        target: `selector:${slugSelector(seg)}`,
      });
    } else {
      for (const tok of tokens) {
        edges.push({ type, note, kind: classifyToken(tok), raw: tok, target: tok });
      }
    }
  }
  return edges;
}

function isTableSeparatorRow(line) {
  return /^\|?[\s:-]+\|[\s:|-]*$/.test(line.trim());
}

// GFM row splitter. Adequate for this project's tables — none of the rows
// scanned by this script contain an escaped `\|` inside a cell (verified
// against the real files); a row that doesn't split into >=2 cells is
// reported as unparsed rather than silently dropped.
function splitTableRow(line) {
  const inner = line.trim().replace(/^\|/, '').replace(/\|$/, '');
  return inner.split('|').map(c => c.trim());
}

// ---------------------------------------------------------------------------
// `routes_to` — CLAUDE.md's retrieval-map table (plan §2a, lines 27-38)
// ---------------------------------------------------------------------------

function extractRoutesTo(claudeMdText) {
  const status = {
    source: 'CLAUDE.md#retrieval-map',
    records_seen: 0,
    records_emitted: 0,
    records_unparsed: 0,
    parser_status: 'ok',
  };
  if (claudeMdText == null) {
    status.parser_status = 'source_missing';
    return { edges: [], status, unparsedRaw: [] };
  }
  const lines = claudeMdText.split('\n');
  // Anchor on the column-header text, NOT the "Retrieval map" heading above it
  // (that heading carries a non-ASCII ellipsis — a fragile anchor per plan §2a).
  const headerIdx = lines.findIndex(
    l => l.includes('If you are touching') && l.includes('Also read')
  );
  if (headerIdx === -1) {
    status.parser_status = 'empty_parse';
    return { edges: [], status, unparsedRaw: [] };
  }
  let i = headerIdx + 1;
  if (lines[i] && isTableSeparatorRow(lines[i])) i++;
  const rows = [];
  while (i < lines.length && lines[i].trim().startsWith('|')) {
    rows.push(lines[i]);
    i++;
  }
  status.records_seen = rows.length;

  const edges = [];
  const unparsedRaw = [];
  for (const row of rows) {
    const cells = splitTableRow(row);
    if (cells.length < 2) {
      unparsedRaw.push(row);
      continue;
    }
    const [leftCell, rightCell] = cells;
    const noteMatch = rightCell.match(/`rules\/([a-z0-9-]+)\.md`/);
    if (!noteMatch) {
      unparsedRaw.push(row);
      continue;
    }
    const note = noteMatch[1];
    edges.push(...edgesFromSegments(splitSegments(leftCell), 'routes_to', note));
  }
  status.records_emitted = edges.length;
  status.records_unparsed = unparsedRaw.length;
  if (rows.length === 0) status.parser_status = 'empty_parse';
  else if (unparsedRaw.length > 0) status.parser_status = 'degraded';
  return { edges, status, unparsedRaw };
}

module.exports = {
  REPO_ROOT,
  OUTPUT_PATH,
  RULE_NOTES,
  readRepoFile,
  repoFileExists,
  getTrackedFiles,
  classifyToken,
  splitSegments,
  extractBacktickTokens,
  slugSelector,
  buildNodeRegistry,
  extractManifest,
  edgesFromSegments,
  isTableSeparatorRow,
  splitTableRow,
  extractRoutesTo,
};

// Step-1/2 self-check: run directly (not required-as-module) to prove the
// classifier, the node/manifest parse, and the routes_to extractor before any
// further extractor is built.
if (require.main === module) {
  const { stubs, edges, status } = extractManifest();
  const nodes = buildNodeRegistry(stubs);
  console.log('MANIFEST status:', status);
  console.log('MANIFEST stubs:', stubs);
  console.log('manifests/contains edges emitted:', edges.length);
  console.log('node count:', nodes.size);
  console.log(
    'classifier probe:',
    ['api.js', 'css/', 'getSystemDirective()', 'any new sound', '<script>', 'state'].map(t => [
      t,
      classifyToken(t),
    ])
  );

  const claudeMd = readRepoFile('CLAUDE.md');
  const routesTo = extractRoutesTo(claudeMd);
  console.log('\nrouts_to status:', routesTo.status);
  const byNote = {};
  for (const e of routesTo.edges) {
    (byNote[e.note] = byNote[e.note] || []).push(`${e.kind}:${e.raw}`);
  }
  console.log('routes_to edges by note:', JSON.stringify(byNote, null, 2));

  // Protocol 42 red->green self-test: a renamed table header must yield
  // empty_parse, NEVER an empty-but-ok edge set (load-bearing idea b).
  const renamed = claudeMd.replace('If you are touching', 'If you touch');
  const brokenRoutesTo = extractRoutesTo(renamed);
  console.log(
    '\n[self-test] renamed-header probe parser_status (expect empty_parse):',
    brokenRoutesTo.status.parser_status
  );
}
