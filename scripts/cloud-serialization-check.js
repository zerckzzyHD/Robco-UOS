#!/usr/bin/env node
// ── cloud-serialization-check.js — QUEUE.md item A3, INTERIM modeled guard ──
//
// WHAT THIS IS (and, just as importantly, what it is NOT).
// A3 wanted a save→sync→load round-trip against the real Firebase emulator,
// proving every state field survives with field-level fidelity. That test
// CANNOT be built in this environment: the Firestore/Auth emulators are Java
// processes and there is no JVM here (see QUEUE.md item A3, 2026-07-21). This
// script is the honest interim the owner approved instead — a MODELED guard
// that needs no emulator, no JVM, and no network.
//
// It answers exactly one question, self-derived from the live state shape:
//   "Does the state, as it would be written to Firestore, contain any value
//    that Firestore silently drops or outright rejects?"
//
// It MODELS Firestore's documented serialization rules rather than verifying
// against a real Firestore. That is the whole caveat: a modeling error here is
// a blind spot, so the rules modeled are kept few, exact, and reachable from
// this app's actual data (which is always JSON — it round-trips through
// localStorage before any cloud write, so Date/Map/class instances can never
// appear and are deliberately NOT modeled). The rules modeled:
//
//   • undefined field value        → Firestore silently STRIPS it (silent loss)
//   • directly-nested array [[…]]   → Firestore REJECTS the whole write (throws)
//   • function / symbol / bigint    → not serializable (belt-and-suspenders;
//                                      unreachable from JSON state, but free to check)
//   • document > ~1 MB              → Firestore rejects the write (soft size warning)
//
// WHY IT IS SELF-DERIVING (the property A3 demanded, and the anti-pattern it
// forbids). The field set is NOT a hand-typed list — it is extracted from the
// REAL `let state = { … }` initializer in js/core/state.js and evaluated. Add a
// field to that literal tomorrow and this guard scans it automatically. If it
// holds a Firestore-hostile default (e.g. someone defaults a field to a 2-D
// array, or leaves it undefined), the guard fails. Suite 46.17 asserts a
// hardcoded field list and cannot do this; that is precisely the rot A3 named.
//
// WHAT IT DOES NOT COVER (state it, so no one over-trusts it):
//   • real Firebase, App Check, deployed security rules, real network behaviour
//   • runtime-only hostile values — a field that is SAFE by default but gets
//     populated with a nested array at play time. Catching that needs the real
//     emulator + real data. This guard sees the shape, not every runtime value.
//   • Firestore's exact type coercions (timestamp precision, number ranges) —
//     only the real emulator observes those. That is why A3 stays open for the
//     JDK-backed emulator test; this reduces the risk, it does not close A3.
//
// PLACEMENT. Opt-in / un-gated for now (owner's call, 2026-07-21): run it with
//   npm run cloud-check
// It has ZERO external dependency (pure Node `vm`, exactly like Suite 46.17),
// so it is safe to promote into the normal gate whenever wanted — a modeled
// guard that runs catches things; an opt-in one nobody runs does not. See the
// promotion recommendation in QUEUE.md item A3.
//
// A positive control is built in: every run also scans a KNOWN-hostile fixture
// and fails if the scanner does not flag it — so this guard can never silently
// degrade into a green-that-lies no-op (the exact failure A3 exists to prevent).

'use strict';

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.resolve(__dirname, '..');
const STATE_SRC = path.join(ROOT, 'js', 'core', 'state.js');

// ── Firestore-hostility scanner (the model) ─────────────────────────────────
// Walks the whole object graph and returns every value that Firestore would
// silently drop or reject. Matches Firestore's real rule that a document array
// may CONTAIN a map that contains an array, but may not DIRECTLY contain
// another array — so only array-directly-inside-array is flagged, not
// array→object→array.
function findFirestoreHostileValues(root) {
  const hits = [];
  function walk(val, p) {
    if (val === undefined) {
      hits.push({
        path: p || '(root)',
        reason: 'undefined — Firestore silently strips this field',
      });
      return;
    }
    const t = typeof val;
    if (t === 'function' || t === 'symbol' || t === 'bigint') {
      hits.push({ path: p || '(root)', reason: t + ' — not Firestore-serializable' });
      return;
    }
    if (Array.isArray(val)) {
      val.forEach((el, i) => {
        const ep = p + '[' + i + ']';
        if (Array.isArray(el)) {
          hits.push({ path: ep, reason: 'directly-nested array — Firestore REJECTS the write' });
        } else {
          walk(el, ep);
        }
      });
      return;
    }
    if (val && t === 'object') {
      Object.keys(val).forEach(k => walk(val[k], p ? p + '.' + k : k));
    }
  }
  walk(root, '');
  return hits;
}

// Firestore's ~1 MB single-document ceiling. The cloud save nests the whole
// robco_v8 container in one doc, so an unbounded field could approach it.
const FIRESTORE_DOC_LIMIT_BYTES = 1048576;

// ── Balanced-brace extraction of the `let state = { … }` object literal ─────
// Deliberately NOT a regex — the literal spans ~50 lines with nested braces and
// inline comments. Mirrors the brace-matching extractFunctionBody() the Node
// runner already uses for Suite 46.17.
function extractStateLiteral(source) {
  const anchor = source.indexOf('let state = {');
  if (anchor === -1) throw new Error('could not find `let state = {` in state.js');
  const open = source.indexOf('{', anchor);
  let depth = 0;
  for (let i = open; i < source.length; i++) {
    const c = source[i];
    if (c === '{') depth++;
    else if (c === '}' && --depth === 0) return source.slice(open, i + 1);
  }
  throw new Error('unbalanced braces while extracting the state literal');
}

function extractFunctionDecl(source, fnName) {
  const idx = source.indexOf('function ' + fnName);
  if (idx === -1) throw new Error('could not find function ' + fnName);
  const open = source.indexOf('{', idx);
  let depth = 0;
  for (let i = open; i < source.length; i++) {
    const c = source[i];
    if (c === '{') depth++;
    else if (c === '}' && --depth === 0) return source.slice(idx, i + 1);
  }
  throw new Error('unbalanced braces while extracting ' + fnName);
}

// Build the fully-populated default campaign state from the REAL source literal.
// The literal references _buildFactions() (real, extracted) and Date.now() — both
// supplied in a vm sandbox, exactly as Suite 46.17 extracts-and-runs real functions.
// getFactionRegistry() is stubbed: its exact faction keys are irrelevant to a
// hostility scan; only the { fame, infamy } value SHAPE matters, and that comes
// from the real _buildFactions body.
function deriveDefaultState(source) {
  const stateLiteral = extractStateLiteral(source);
  const buildFactionsDecl = extractFunctionDecl(source, '_buildFactions');
  const sandbox = { Date };
  vm.createContext(sandbox);
  return vm.runInContext(
    'var getFactionRegistry = function () {\n' +
      "  return [{ key: 'ncr' }, { key: 'legion' }, { key: 'house' }];\n" +
      '};\n' +
      buildFactionsDecl +
      '\n;(function () { return ' +
      stateLiteral +
      '; })()',
    sandbox
  );
}

// The write payload is the robco_v8 container: the live campaign nested under
// campaigns[activeContext]. That is exactly what cloud.js writes to Firestore.
function buildWritePayload(defaultState) {
  return {
    activeContext: 'FNV',
    campaigns: { FNV: defaultState },
  };
}

function main() {
  const problems = [];
  let ok = true;

  const source = fs.readFileSync(STATE_SRC, 'utf8');
  const defaultState = deriveDefaultState(source);

  // ── Anti-vacuous check: extraction must have produced a REAL state, never {} ─
  // (an empty object would make the hostility scan pass vacuously — a green lie).
  const topKeys = Object.keys(defaultState);
  if (
    topKeys.length < 30 ||
    !defaultState.factions ||
    !defaultState.skills ||
    !defaultState.equipped
  ) {
    ok = false;
    problems.push(
      'EXTRACTION FAILED: derived state has only ' +
        topKeys.length +
        ' top-level keys (or is missing structural anchors) — the state literal was not parsed correctly, so the scan below would be meaningless.'
    );
  }

  // ── The actual guard: the write payload must be Firestore-clean ──────────────
  const payload = buildWritePayload(defaultState);
  const hostile = findFirestoreHostileValues(payload);
  if (hostile.length > 0) {
    ok = false;
    problems.push(
      'FIRESTORE-HOSTILE VALUES in the cloud write payload (derived from the live state shape):'
    );
    hostile.forEach(h =>
      problems.push(
        '    • campaigns.FNV.' + h.path.replace(/^campaigns\.FNV\./, '') + '  →  ' + h.reason
      )
    );
  }

  const sizeBytes = Buffer.byteLength(JSON.stringify(payload), 'utf8');
  if (sizeBytes > FIRESTORE_DOC_LIMIT_BYTES) {
    ok = false;
    problems.push(
      'DOC-SIZE: default write payload is ' +
        sizeBytes +
        ' bytes, over the ~1 MB Firestore document limit.'
    );
  }

  // ── Positive control: prove the scanner actually flags hostility ─────────────
  // If this ever comes back empty, the scanner is broken and every "clean" result
  // above is untrustworthy — so a broken detector fails the run, loudly.
  const controlFixture = {
    okString: 'fine',
    okArray: ['a', 'b'],
    okNestedViaMap: [{ inner: [1, 2] }], // array→map→array is LEGAL in Firestore
    stripped: undefined, // must be flagged
    rejected: [[1, 2]], // must be flagged (directly-nested array)
  };
  const controlHits = findFirestoreHostileValues(controlFixture);
  const flaggedStripped = controlHits.some(h => h.path === 'stripped');
  const flaggedRejected = controlHits.some(h => h.path === 'rejected[0]');
  const flaggedFalsePositive = controlHits.some(h => h.path.startsWith('okNestedViaMap'));
  const controlOk = flaggedStripped && flaggedRejected && !flaggedFalsePositive;
  if (!controlOk) {
    ok = false;
    problems.push(
      'POSITIVE CONTROL FAILED: the hostility scanner did not behave as specified' +
        ' (undefined flagged=' +
        flaggedStripped +
        ', nested-array flagged=' +
        flaggedRejected +
        ', legal array→map→array false-positive=' +
        flaggedFalsePositive +
        ') — the detector is broken, so no result from this run can be trusted.'
    );
  }

  // ── Report ───────────────────────────────────────────────────────────────────
  console.log('── A3 interim cloud-serialization guard (modeled — no emulator) ──');
  console.log('   Source of field set : js/core/state.js  `let state = { … }`  (self-derived)');
  console.log('   Top-level fields     : ' + topKeys.length);
  console.log('   Write payload size   : ' + sizeBytes + ' bytes');
  console.log(
    '   Positive control     : ' +
      (controlOk ? 'OK — scanner flags known-hostile values' : 'FAILED — see below')
  );
  console.log('');
  if (ok) {
    console.log('  ✓ PASS — every field in the derived write payload is Firestore-serializable.');
    console.log(
      '    (Models Firestore write rules only; does NOT cover real Firebase / App Check /'
    );
    console.log('     security rules / network / runtime-only values. A3 stays open for the');
    console.log('     JDK-backed emulator test — see QUEUE.md item A3.)');
    process.exit(0);
  } else {
    console.log('  ✗ FAIL:');
    problems.forEach(p => console.log('    ' + p));
    process.exit(1);
  }
}

main();
