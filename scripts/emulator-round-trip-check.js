#!/usr/bin/env node
// ── emulator-round-trip-check.js — QUEUE.md item A4, the VERIFIED upgrade of
// A3's modeled cloud-serialization guard (scripts/cloud-serialization-check.js) ──
//
// WHAT THIS IS. A save → sync → load round-trip run against the REAL Firebase
// local emulator suite (Firestore + Auth), using the SAME client SDK the app
// itself uses (`firebase` npm package, pinned to 12.15.0 — the exact version
// js/services/cloud.js imports from the gstatic CDN). It writes the live
// `robco_v8` save payload with `addDoc()` (the same additive call
// `_uploadSaveDoc()` makes, Protocol 34), reads it back, and asserts
// field-level fidelity. Where A3's `cloud-check` MODELS Firestore's documented
// write constraints in our own code, this OBSERVES the real emulator's actual
// behaviour — real undefined/nested-array handling, real type coercion, real
// doc-size rejection.
//
// SELF-DERIVED FIELD SET (the property A3 demanded, reused rather than
// reforked — Protocol 22). The clean payload is NOT hand-typed: it comes from
// `deriveDefaultState()` / `buildWritePayload()` in cloud-serialization-check.js,
// which extract and evaluate the REAL `let state = { … }` literal from
// js/core/state.js. Add a field to that literal tomorrow and this script's
// clean-payload round-trip picks it up automatically.
//
// WHY THERE IS NO "field dropped from the sync mapping" RED CASE. A3's own
// 2026-07-21 premise correction (QUEUE.md item A3) established from the code
// that no such mapping exists — cloud.js writes `robco_v8` WHOLESALE and the
// load path (`sanitizeImportedContainer` + `migrateState`) passes unknown
// fields through untouched. So "a field silently missing from the mapping"
// cannot occur by design; testing for it here would be testing a failure mode
// that does not exist. The residual risk — and the ONLY thing this script
// exists to catch — is the Firestore SERIALIZATION BOUNDARY: a value that
// writes losslessly through this app's own JS but gets silently stripped or
// outright rejected by Firestore itself. That is exactly what the two RED
// cases below plant.
//
// HOW TO RUN. Needs a JDK/JRE 11+ (the Firestore/Auth emulators are Java
// processes) and the `firebase-tools` + `firebase` dev dependencies (both
// already in package.json). Never run this file directly with plain `node` —
// it requires FIRESTORE_EMULATOR_HOST / FIREBASE_AUTH_EMULATOR_HOST, which
// only `firebase emulators:exec` sets. Use the wired npm script:
//
//   npm run test:emulator
//
// which runs `firebase emulators:exec --project demo-robco-uos-test
// --only firestore,auth "node scripts/emulator-round-trip-check.js"` — the
// `demo-` project prefix is a Firebase CLI convention that guarantees the
// emulator never touches the real `nv-overlord` project or any network beyond
// localhost, regardless of what `.firebaserc` declares as the default.
//
// STANDALONE, NOT GATED (owner decision carried over from A3 → A4, QUEUE.md).
// The normal commit/push gate (scripts/gate.js) cannot assume a JDK or
// firebase-tools are present on every machine that runs it, and A4 is
// explicitly optional — never a release blocker. `npm run cloud-check` (A3)
// remains the standing gated guard; this is the on-demand confidence upgrade.

'use strict';

const fs = require('fs');
const path = require('path');

const { deriveDefaultState, buildWritePayload } = require('./cloud-serialization-check.js');

const ROOT = path.resolve(__dirname, '..');
const STATE_SRC = path.join(ROOT, 'js', 'core', 'state.js');
const PROJECT_ID = process.env.GCLOUD_PROJECT || 'demo-robco-uos-test';

// ── Deep clone that PRESERVES `undefined`-valued own keys AND re-realms every
// object/array into THIS process's realm ───────────────────────────────────
// Two things this must do that JSON.parse(JSON.stringify(x)) cannot:
//   1. Preserve undefined-valued own keys (JSON drops them — and planting an
//      undefined value is the whole point of one of the RED cases below).
//   2. Re-realm every plain object/array. deriveDefaultState() runs the real
//      state.js literal inside a `vm` sandbox (its own separate V8 context/
//      realm — the same technique Suite 46.17 and cloud-serialization-check.js
//      use). The Firestore Web SDK validates "is this a plain object/array"
//      via same-realm identity checks, so an object literal built INSIDE the
//      vm context reads to it as a foreign class instance ("a custom Object
//      object"), not a plain object — a real addDoc() rejection that has
//      NOTHING to do with the app (the browser runs everything in one realm;
//      only this vm-based derivation technique creates the mismatch).
//   Building fresh `{}`/`[]` literals here (outside the vm) for every level —
//   rather than `Array.prototype.map`, whose species-construction reuses the
//   SOURCE array's realm — guarantees the clone is 100% this-realm, so the
//   SDK sees exactly what the browser's own single-realm code would produce.
function deepClone(v) {
  if (Array.isArray(v)) {
    const out = [];
    for (let i = 0; i < v.length; i++) out.push(deepClone(v[i]));
    return out;
  }
  if (v && typeof v === 'object') {
    const out = {};
    for (const k of Object.keys(v)) out[k] = deepClone(v[k]);
    return out;
  }
  return v;
}

// ── Field-level fidelity diff ────────────────────────────────────────────────
// Walks both sides of the round-trip and reports every path where the value
// written and the value read back disagree, in either presence or content.
function diffFields(a, b, p, hits) {
  hits = hits || [];
  p = p || '';
  if (a === b) return hits;
  const ta = a === null ? 'null' : typeof a;
  const tb = b === null ? 'null' : typeof b;
  if (ta !== tb) {
    hits.push({
      path: p || '(root)',
      reason: `type differs — wrote ${ta} (${JSON.stringify(a)}), read back ${tb} (${JSON.stringify(b)})`,
    });
    return hits;
  }
  if (Array.isArray(a)) {
    const len = Math.max(a.length, b.length);
    for (let i = 0; i < len; i++) diffFields(a[i], b[i], `${p}[${i}]`, hits);
    return hits;
  }
  if (a && ta === 'object') {
    const keys = new Set([...Object.keys(a), ...Object.keys(b || {})]);
    keys.forEach(k => diffFields(a[k], b ? b[k] : undefined, p ? `${p}.${k}` : k, hits));
    return hits;
  }
  hits.push({
    path: p || '(root)',
    reason: `value differs — wrote ${JSON.stringify(a)}, read back ${JSON.stringify(b)}`,
  });
  return hits;
}

// Build the save envelope EXACTLY as _uploadSaveDoc() does in js/services/cloud.js
// (schema/version/label/etc are fixed test constants; robco_v8/chat/playstyle are
// the fields under test).
function buildSaveEnvelope(robco_v8) {
  const now = Date.now();
  return {
    schema: 2,
    version: 'A4-round-trip-probe',
    savedAt: now,
    updatedAt: now,
    label: 'A4 emulator round-trip probe',
    gameContext: robco_v8.activeContext,
    contentHash: 'a4-probe-hash',
    robco_v8,
    chat: [],
    playstyle: 'any',
  };
}

async function connectEmulator() {
  // main() already asserted FIRESTORE_EMULATOR_HOST is set before calling this.
  const { initializeApp } = require('firebase/app');
  const {
    getFirestore,
    connectFirestoreEmulator,
    collection,
    addDoc,
    getDoc,
  } = require('firebase/firestore');
  const { getAuth, connectAuthEmulator, signInAnonymously } = require('firebase/auth');

  const app = initializeApp({ projectId: PROJECT_ID, apiKey: 'demo-api-key' });
  const db = getFirestore(app);
  const auth = getAuth(app);

  const [fsHost, fsPort] = process.env.FIRESTORE_EMULATOR_HOST.split(':');
  connectFirestoreEmulator(db, fsHost, Number(fsPort));

  const authHostEnv = process.env.FIREBASE_AUTH_EMULATOR_HOST || '127.0.0.1:9099';
  connectAuthEmulator(auth, 'http://' + authHostEnv, { disableWarnings: true });

  const cred = await signInAnonymously(auth);
  return { db, uid: cred.user.uid, collection, addDoc, getDoc };
}

// Write `robco_v8` inside a full save envelope via the real SDK's addDoc() (the
// same additive call cloud.js makes — Protocol 34), read it back, and diff.
// Returns { ok, stage, writeError, diffs, envelope, readBack }.
async function roundTrip(ctx, robco_v8) {
  const envelope = buildSaveEnvelope(robco_v8);
  const col = ctx.collection(ctx.db, 'users', ctx.uid, 'saves');
  let docRef;
  try {
    docRef = await ctx.addDoc(col, envelope);
  } catch (writeError) {
    return { ok: false, stage: 'write', writeError, envelope };
  }
  const snap = await ctx.getDoc(docRef);
  const readBack = snap.data();
  const diffs = diffFields(envelope, readBack, '');
  return { ok: diffs.length === 0, stage: 'read', diffs, envelope, readBack };
}

async function main() {
  if (!process.env.FIRESTORE_EMULATOR_HOST) {
    console.error(
      '\n[A4] FIRESTORE_EMULATOR_HOST is not set. This script must run inside the Firebase\n' +
        '     emulator (it needs the emulator env vars wired automatically). Run it via:\n\n' +
        '       npm run test:emulator\n'
    );
    process.exit(1);
  }

  const source = fs.readFileSync(STATE_SRC, 'utf8');
  const defaultState = deriveDefaultState(source);
  // Re-realm immediately (see deepClone's header comment) — every payload used
  // below, clean or hostile, must be built from this same-realm base.
  const cleanPayload = deepClone(buildWritePayload(defaultState)); // { activeContext, campaigns: { FNV: defaultState } }

  console.log('── A4 real-emulator round-trip (QUEUE.md item A4) ──');
  console.log('   Project (emulator-local only) : ' + PROJECT_ID);
  console.log(
    '   Field set source               : js/core/state.js  `let state = { … }`  (self-derived)'
  );

  const ctx = await connectEmulator();
  console.log('   Signed in (emulator, anonymous): uid ' + ctx.uid);
  console.log('');

  let ok = true;
  const report = [];

  // ── GREEN: the clean, self-derived payload must round-trip losslessly ──────
  const clean = await roundTrip(ctx, cleanPayload);
  if (clean.ok) {
    report.push(
      '  ✓ PASS — clean payload: every field survived the real emulator round-trip equal.'
    );
  } else {
    ok = false;
    report.push('  ✗ FAIL — clean payload should have round-tripped losslessly but did not:');
    if (clean.stage === 'write') {
      report.push('      write threw: ' + (clean.writeError && clean.writeError.message));
    } else {
      clean.diffs.forEach(d => report.push('      • ' + d.path + '  →  ' + d.reason));
    }
  }

  // ── RED #1: a directly-nested array — Firestore must reject it ─────────────
  const nestedArrayPayload = deepClone(cleanPayload);
  nestedArrayPayload.campaigns.FNV._a4Probe = [[1, 2]];
  const redNested = await roundTrip(ctx, nestedArrayPayload);
  if (!redNested.ok) {
    report.push(
      '  ✓ PASS (expected FAIL) — directly-nested array correctly rejected by the real emulator' +
        (redNested.stage === 'write'
          ? ' (write threw: ' + (redNested.writeError && redNested.writeError.message) + ')'
          : ' (field-level diff caught it).')
    );
  } else {
    ok = false;
    report.push(
      '  ✗ FAIL — a directly-nested array round-tripped successfully; the real emulator did NOT ' +
        'reject it as A3 modeled. This is exactly the kind of drift A4 exists to catch — the model ' +
        'in cloud-serialization-check.js needs to be corrected.'
    );
  }

  // ── RED #2: an undefined field value — Firestore must not silently pass it ─
  const undefinedPayload = deepClone(cleanPayload);
  undefinedPayload.campaigns.FNV._a4Probe = undefined;
  const redUndefined = await roundTrip(ctx, undefinedPayload);
  if (!redUndefined.ok) {
    report.push(
      '  ✓ PASS (expected FAIL) — undefined field correctly caught by the real emulator/SDK' +
        (redUndefined.stage === 'write'
          ? ' (write threw: ' + (redUndefined.writeError && redUndefined.writeError.message) + ')'
          : ' (field-level diff caught it: the value was silently stripped, not equal).')
    );
  } else {
    ok = false;
    report.push(
      '  ✗ FAIL — a field with an undefined value round-tripped as if nothing happened; the real ' +
        'emulator did NOT catch it. This is exactly the kind of drift A4 exists to catch.'
    );
  }

  console.log(report.join('\n'));
  console.log('');
  if (ok) {
    console.log('  ✓ A4 red-then-green PROVEN against the real Firebase local emulator.');
    process.exit(0);
  } else {
    console.log('  ✗ A4 FAILED — see above.');
    process.exit(1);
  }
}

main().catch(e => {
  console.error('\n[A4] Unexpected error: ' + (e && e.stack ? e.stack : e));
  process.exit(1);
});
