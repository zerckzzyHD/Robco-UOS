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

// ---------------------------------------------------------------------------
// `claims_scope_over` — each rules/*.md note's OWN header (plan §2a/§8).
// Independently derived: this function never reads CLAUDE.md, and
// extractRoutesTo() above never reads a note file. Neither may consult the
// other's output — the diff step below is the only place they meet.
// ---------------------------------------------------------------------------

const SENTINEL = 'Universal rules live in `CLAUDE.md`';

function extractClaimsScopeOver(noteName, overrideText) {
  const source = `rules/${noteName}.md#header`;
  const status = {
    source,
    records_seen: 0,
    records_emitted: 0,
    records_unparsed: 0,
    parser_status: 'ok',
  };
  const text = overrideText !== undefined ? overrideText : readRepoFile(`rules/${noteName}.md`);
  if (text == null) {
    status.parser_status = 'source_missing';
    return { edges: [], status };
  }
  const lines = text.split('\n');
  const startIdx = lines.findIndex(l => l.includes('**Load this when touching:**'));
  if (startIdx === -1) {
    status.parser_status = 'empty_parse';
    return { edges: [], status };
  }
  // The scope block is multi-line and variable-length — the sentinel line is
  // the only reliable terminator (plan §8.1). Search a bounded window so a
  // missing/reworded sentinel fails loud instead of scanning the whole file.
  let sentinelIdx = -1;
  for (let i = startIdx; i < Math.min(lines.length, startIdx + 30); i++) {
    if (lines[i].includes(SENTINEL)) {
      sentinelIdx = i;
      break;
    }
  }
  if (sentinelIdx === -1) {
    status.parser_status = 'empty_parse';
    return { edges: [], status };
  }
  const joined = lines
    .slice(startIdx, sentinelIdx)
    .map(l => l.replace(/^\s*>\s?/, ''))
    .join(' ')
    .replace('**Load this when touching:**', '')
    .replace(/\s+/g, ' ')
    .trim();
  const segments = splitSegments(joined);
  status.records_seen = segments.length;
  const edges = edgesFromSegments(segments, 'claims_scope_over', noteName);
  status.records_emitted = edges.length;
  if (edges.length === 0) status.parser_status = 'empty_parse';
  return { edges, status };
}

function extractAllClaimsScopeOver() {
  const edges = [];
  const statuses = [];
  for (const name of RULE_NOTES) {
    const result = extractClaimsScopeOver(name);
    edges.push(...result.edges);
    statuses.push(result.status);
  }
  return { edges, statuses };
}

// ---------------------------------------------------------------------------
// The diff step (plan §2a "the independence is the design") — the ONLY place
// routes_to and claims_scope_over are compared. Restricted to file/directory
// kind tokens: symbols and prose are code/scope concepts, not routable paths.
// ---------------------------------------------------------------------------

function isPathKind(kind) {
  return kind === 'file' || kind === 'directory';
}

function diffRoutesAndClaims(routesToEdges, claimsEdges) {
  const claimants = new Map(); // token -> Set<note>
  const routers = new Map(); // token -> Set<note>

  for (const e of claimsEdges) {
    if (!isPathKind(e.kind)) continue;
    if (!claimants.has(e.target)) claimants.set(e.target, new Set());
    claimants.get(e.target).add(e.note);
  }
  for (const e of routesToEdges) {
    if (!isPathKind(e.kind)) continue;
    if (!routers.has(e.target)) routers.set(e.target, new Set());
    routers.get(e.target).add(e.note);
  }

  // A path claimed by >=2 notes is a legitimate multi-claim (plan §3), not a
  // per-note routing defect — so it is reported separately and skipped below.
  const multiClaim = [];
  const claimedButNotRouted = [];
  for (const [token, notes] of claimants) {
    if (notes.size >= 2) {
      multiClaim.push({ token, notes: [...notes].sort() });
      continue;
    }
    const [note] = notes;
    if (!(routers.get(token) || new Set()).has(note)) {
      claimedButNotRouted.push({ token, note });
    }
  }

  const routedButNotClaimed = [];
  for (const [token, notes] of routers) {
    for (const note of notes) {
      if (!(claimants.get(token) || new Set()).has(note)) {
        routedButNotClaimed.push({ token, note });
      }
    }
  }

  return { claimedButNotRouted, routedButNotClaimed, multiClaim };
}

// ---------------------------------------------------------------------------
// `references` — CLAUDE.md's two reference tables (plan §2a). Closed-world:
// a backtick token only becomes an edge if it resolves to an ALREADY-DECLARED
// node key (§1's fixed node set) — an arbitrary identifier in prose never
// manufactures a node or a dangling edge.
//
// Correction to plan §2a (recorded per the brief): the plan describes both
// source tables as having the target path in the RIGHT cell. That holds for
// the Reference Pointer Index (lines 49-72), but the Protocol 2 "Documentation
// Updates" table (CLAUDE.md lines ~226-230) actually carries the path in the
// LEFT cell (`File` | `What to update`). Rather than hardcode a cell side
// per table, this extractor scans every cell of a matched row for backtick
// tokens — robust to either layout, and to a future column reorder.
// ---------------------------------------------------------------------------

function findTableRows(lines, headerMatches) {
  const headerIdx = lines.findIndex(headerMatches);
  if (headerIdx === -1) return null;
  let i = headerIdx + 1;
  if (lines[i] && isTableSeparatorRow(lines[i])) i++;
  const rows = [];
  while (i < lines.length && lines[i].trim().startsWith('|')) {
    rows.push(lines[i]);
    i++;
  }
  return rows;
}

// Resolves a raw file-classified token to a node key ONLY if it names one of
// the §1 fixed nodes — the closed-world guard against inventing phantom nodes
// from arbitrary prose (e.g. `js/services/api-directive.js` is a real file
// but has no node in this minimum graph, so it resolves to null, not an edge).
function resolveDeclaredNode(token, manifestStubs) {
  if (token === 'CLAUDE.md') return 'doc:CLAUDE.md';
  if (token === 'ARCHITECTURE.md') return 'doc:ARCHITECTURE.md';
  if (token === 'QUEUE.md') return 'doc:QUEUE.md';
  if (token === 'QUEUE_LOG.md') return 'doc:QUEUE_LOG.md';
  if (token === 'skill/SKILL.md') return 'skill:SKILL.md';
  if (token === 'library/MANIFEST.txt') return 'doc:library/MANIFEST.txt';
  const ruleMatch = token.match(/^rules\/([a-z0-9-]+)\.md$/);
  if (ruleMatch && RULE_NOTES.includes(ruleMatch[1])) return `rule:${ruleMatch[1]}`;
  if (token.startsWith('library/')) {
    const rel = token.slice('library/'.length);
    if (manifestStubs.includes(rel)) return `lib:${rel}`;
  } else if (manifestStubs.includes(token)) {
    return `lib:${token}`;
  } else {
    // A nested stub (e.g. `PROMPT_LIBRARY/RobCo_Engineering_Playbook.md`) is
    // often named by bare basename in prose (row 68's "the engineering
    // playbook … (`RobCo_Engineering_Playbook.md`)") — found via testing
    // (Protocol 42): without this, the reference silently resolves to
    // nothing instead of the real nested stub.
    const basenameMatch = manifestStubs.find(s => s.split('/').pop() === token);
    if (basenameMatch) return `lib:${basenameMatch}`;
  }
  return null;
}

function extractReferences(claudeMdText, manifestStubs) {
  const status = {
    source: 'CLAUDE.md#reference-tables',
    records_seen: 0,
    records_emitted: 0,
    records_unparsed: 0,
    parser_status: 'ok',
  };
  if (claudeMdText == null) {
    status.parser_status = 'source_missing';
    return { edges: [], status };
  }
  const lines = claudeMdText.split('\n');
  const pointerRows = findTableRows(lines, l => l.includes('Need') && l.includes('Where to look'));
  const docsRows = findTableRows(lines, l => l.includes('| File') && l.includes('What to update'));

  if (pointerRows === null && docsRows === null) {
    status.parser_status = 'empty_parse';
    return { edges: [], status };
  }

  const allRows = [...(pointerRows || []), ...(docsRows || [])];
  status.records_seen = allRows.length;

  const edges = [];
  const unparsed = [];
  for (const row of allRows) {
    const cells = splitTableRow(row);
    if (cells.length < 2) {
      unparsed.push(row);
      continue;
    }
    const tokens = extractBacktickTokens(cells.join(' '));
    for (const tok of tokens) {
      if (classifyToken(tok) !== 'file') continue;
      const nodeKey = resolveDeclaredNode(tok, manifestStubs);
      if (!nodeKey) continue; // closed-world: not a declared node, not an edge
      edges.push({ type: 'references', source: 'doc:CLAUDE.md', target: nodeKey, raw: tok });
    }
  }
  status.records_emitted = edges.length;
  status.records_unparsed = unparsed.length;
  if (allRows.length === 0) status.parser_status = 'empty_parse';
  else if (unparsed.length > 0) status.parser_status = 'degraded';
  return { edges, status };
}

// ---------------------------------------------------------------------------
// Dangling-reference diagnostic (plan §3) — checked across every file/
// directory token any extractor emitted, not just `references`. A file token
// is FINE if it's a real tracked file, or a manifested-but-gitignored library
// stub; otherwise it is `unavailable` — a genuine dangling target. A
// directory token is FINE if at least one tracked file lives under it.
// ---------------------------------------------------------------------------

// Many header segments name a file by BARE BASENAME with no directory (e.g.
// audio.md's "the `AudioSettings` cache in `ui-core.js`" for the real
// js/ui/ui-core.js, or game-data.md's parenthesized `db_nv.js` for the real
// js/data/db_nv.js) — the surrounding prose supplies the location, the
// backtick token doesn't repeat it. A tracked-tree membership test on the
// literal token alone would falsely flag every one of these as dangling
// (found via testing — Protocol 42), so a basename-only token additionally
// resolves against every tracked file's basename before being flagged.
function checkDanglingFiles(fileTokens, trackedFiles, manifestStubs) {
  const dangling = [];
  const manifestFine = [];
  const seen = new Set();
  let basenameIndex = null;
  const buildBasenameIndex = () => {
    if (basenameIndex) return basenameIndex;
    basenameIndex = new Set();
    if (trackedFiles) for (const f of trackedFiles) basenameIndex.add(path.posix.basename(f));
    return basenameIndex;
  };
  for (const tok of fileTokens) {
    if (seen.has(tok)) continue;
    seen.add(tok);
    if (trackedFiles && trackedFiles.has(tok)) continue;
    if (!tok.includes('/') && trackedFiles && buildBasenameIndex().has(tok)) continue;
    const rel = tok.startsWith('library/') ? tok.slice('library/'.length) : tok;
    const nestedStubMatch = manifestStubs.find(s => s === rel || s.split('/').pop() === rel);
    if (nestedStubMatch) {
      manifestFine.push(tok);
      continue;
    }
    if (!trackedFiles) continue; // git unavailable — can't determine, don't false-flag
    dangling.push(tok);
  }
  return { dangling, manifestFine };
}

// A directory prefix that is ENTIRELY gitignored (e.g. `planning/`, which has
// no MANIFEST.txt-style committed exception) will always show zero tracked
// files under it, regardless of whether it exists and holds content locally
// — the exact same "expected absence" shape library/'s stubs get via the
// manifest, just with no manifest to consult. Found via testing (Protocol
// 42): without this check, `planning/` false-flags as dangling on every run,
// on every machine, forever. A directory ignored only in PART (i.e. it holds
// no tracked files today but isn't itself an ignore rule) still counts as a
// genuine gap.
function isDirectoryFullyIgnored(dir) {
  const res = spawnSync('git', ['check-ignore', '-q', dir], { cwd: REPO_ROOT });
  return res.status === 0;
}

function checkDanglingDirectories(dirTokens, trackedFiles) {
  const dangling = [];
  const ignoredFine = [];
  if (!trackedFiles) return { dangling, ignoredFine };
  for (const dir of new Set(dirTokens)) {
    const hasAny = [...trackedFiles].some(f => f.startsWith(dir));
    if (hasAny) continue;
    if (isDirectoryFullyIgnored(dir)) {
      ignoredFine.push(dir);
    } else {
      dangling.push(dir);
    }
  }
  return { dangling, ignoredFine };
}

// ---------------------------------------------------------------------------
// Orphan check (plan §3 `unrouted_graph_bearing_artifact`) — a node has NO
// inbound edge of ANY kind. Keys on "no inbound edge", not "no route", so a
// references-reached node (QUEUE_LOG.md, ARCHITECTURE.md) is never a false
// orphan. `ext`/`selector`/`group` kinds are structural/deferred and exempt —
// they are reserved keys for a later graph layer, not artifacts this minimum
// extractor's source text is expected to point at.
// ---------------------------------------------------------------------------

function findOrphans(
  nodes,
  routesToEdges,
  claimsScopeEdges,
  referenceEdges,
  manifestEdges,
  manifestStubs
) {
  const targeted = new Set();
  for (const e of routesToEdges) targeted.add(`rule:${e.note}`);
  for (const e of claimsScopeEdges) {
    if (e.kind !== 'file') continue;
    const key = resolveDeclaredNode(e.target, manifestStubs);
    if (key) targeted.add(key);
  }
  for (const e of referenceEdges) targeted.add(e.target);
  for (const e of manifestEdges) targeted.add(e.target);

  const orphans = [];
  for (const node of nodes.values()) {
    if (!['skill', 'doc', 'rule', 'lib'].includes(node.kind)) continue;
    if (!targeted.has(node.key)) orphans.push(node.key);
  }
  return orphans;
}

// ---------------------------------------------------------------------------
// Full graph assembly — ties every extractor together, computes graph_status,
// and renders the three-band diagnostics report (DEFECTS / EXPECTED / PARSER
// STATUS — plan §3, a rendering contract, not cosmetic).
// ---------------------------------------------------------------------------

function buildGraph() {
  const claudeMd = readRepoFile('CLAUDE.md');
  const trackedFiles = getTrackedFiles();

  const manifestResult = extractManifest();
  const nodes = buildNodeRegistry(manifestResult.stubs);
  const routesTo = extractRoutesTo(claudeMd);
  const claimsScope = extractAllClaimsScopeOver();
  const references = extractReferences(claudeMd, manifestResult.stubs);
  const diff = diffRoutesAndClaims(routesTo.edges, claimsScope.edges);

  const allFileTokens = [
    ...routesTo.edges.filter(e => e.kind === 'file').map(e => e.raw),
    ...claimsScope.edges.filter(e => e.kind === 'file').map(e => e.raw),
    ...references.edges.map(e => e.raw),
  ];
  const allDirTokens = [
    ...routesTo.edges.filter(e => e.kind === 'directory').map(e => e.raw),
    ...claimsScope.edges.filter(e => e.kind === 'directory').map(e => e.raw),
  ];
  const { dangling: danglingFiles, manifestFine } = checkDanglingFiles(
    allFileTokens,
    trackedFiles,
    manifestResult.stubs
  );
  const { dangling: danglingDirs, ignoredFine: ignoredDirsFine } = checkDanglingDirectories(
    allDirTokens,
    trackedFiles
  );

  const orphans = findOrphans(
    nodes,
    routesTo.edges,
    claimsScope.edges,
    references.edges,
    manifestResult.edges,
    manifestResult.stubs
  );

  const extractorStatuses = [
    manifestResult.status,
    routesTo.status,
    ...claimsScope.statuses,
    references.status,
  ];
  const anyFailure = extractorStatuses.some(s => s.parser_status !== 'ok');

  const defects = [
    ...diff.claimedButNotRouted.map(d => ({
      diagnostic: 'claimed_but_not_routed',
      token: d.token,
      note: d.note,
    })),
    ...diff.routedButNotClaimed.map(d => ({
      diagnostic: 'routed_but_not_claimed',
      token: d.token,
      note: d.note,
    })),
    ...orphans.map(key => ({ diagnostic: 'unrouted_graph_bearing_artifact', node: key })),
    ...danglingFiles.map(tok => ({ diagnostic: 'dangling_explicit_reference', token: tok })),
    ...danglingDirs.map(tok => ({ diagnostic: 'dangling_directory_prefix', token: tok })),
  ];
  const expected = [
    ...diff.multiClaim.map(d => ({ diagnostic: 'multi_claim', token: d.token, notes: d.notes })),
    ...manifestFine.map(tok => ({ diagnostic: 'manifested', token: tok })),
    ...ignoredDirsFine.map(tok => ({ diagnostic: 'gitignored_directory', token: tok })),
  ];

  const edges = [
    ...manifestResult.edges,
    ...routesTo.edges.map(e => ({ ...e, source: 'doc:CLAUDE.md', target: `rule:${e.note}` })),
    ...claimsScope.edges.map(e => ({ ...e, source: `rule:${e.note}` })),
    ...references.edges,
  ];

  return {
    // No generated_at wall-clock timestamp: the output must be byte-identical
    // across runs against an unchanged tree (verified — determinism is this
    // project's standard), and a timestamp is the one thing that would break it.
    graph_status: anyFailure ? 'broken' : 'healthy',
    nodes: [...nodes.values()],
    edges,
    diagnostics: { defects, expected },
    extractor_status: extractorStatuses,
  };
}

function printReport(graph) {
  const line = '='.repeat(72);
  const out = [];
  out.push(line);
  out.push('RobCo Knowledge Graph — R11 retrieval topology (un-gated, manual run)');
  out.push(line);
  out.push(`graph_status: ${graph.graph_status}`);
  out.push('');
  out.push('-- PARSER STATUS --');
  for (const s of graph.extractor_status) {
    out.push(
      `  [${s.parser_status.toUpperCase()}] ${s.source} (seen=${s.records_seen} emitted=${s.records_emitted} unparsed=${s.records_unparsed})`
    );
  }
  out.push('');
  out.push(`-- DEFECTS (${graph.diagnostics.defects.length}) --`);
  if (graph.diagnostics.defects.length === 0) out.push('  (none)');
  for (const d of graph.diagnostics.defects) {
    out.push(`  ${d.diagnostic}: ${JSON.stringify(d)}`);
  }
  out.push('');
  out.push(`-- EXPECTED (${graph.diagnostics.expected.length}) --`);
  if (graph.diagnostics.expected.length === 0) out.push('  (none)');
  for (const d of graph.diagnostics.expected) {
    out.push(`  ${d.diagnostic}: ${JSON.stringify(d)}`);
  }
  out.push(line);
  console.log(out.join('\n'));
}

function main() {
  const graph = buildGraph();
  printReport(graph);
  fs.mkdirSync(path.dirname(OUTPUT_PATH), { recursive: true });
  fs.writeFileSync(OUTPUT_PATH, JSON.stringify(graph, null, 2) + '\n', 'utf8');
  console.log(`\nWrote ${OUTPUT_PATH}`);
  if (graph.graph_status !== 'healthy') {
    process.exitCode = 1;
  }
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
  extractClaimsScopeOver,
  extractAllClaimsScopeOver,
  isPathKind,
  diffRoutesAndClaims,
  findTableRows,
  resolveDeclaredNode,
  extractReferences,
  checkDanglingFiles,
  checkDanglingDirectories,
  findOrphans,
  buildGraph,
};

// Protocol 42 red->green proofs: a source that is present but reworded/
// renamed must yield parser_status "empty_parse", NEVER a silently-empty-but-
// ok result (load-bearing idea b). Run via `--self-test`; not part of the
// normal run so a healthy report stays uncluttered.
function selfTest() {
  const claudeMd = readRepoFile('CLAUDE.md');
  const renamedHeader = extractRoutesTo(claudeMd.replace('If you are touching', 'If you touch'));
  console.log(
    '[self-test] renamed retrieval-map header -> parser_status (expect empty_parse):',
    renamedHeader.status.parser_status
  );

  const gameDataText = readRepoFile('rules/game-data.md');
  const rewordedSentinel = extractClaimsScopeOver(
    'game-data',
    gameDataText.replace(SENTINEL, 'Universal rules apply too.')
  );
  console.log(
    '[self-test] reworded game-data.md sentinel -> parser_status (expect empty_parse):',
    rewordedSentinel.status.parser_status
  );

  const ok =
    renamedHeader.status.parser_status === 'empty_parse' &&
    rewordedSentinel.status.parser_status === 'empty_parse';
  if (!ok) process.exitCode = 1;
}

if (require.main === module) {
  if (process.argv.includes('--self-test')) selfTest();
  else main();
}
