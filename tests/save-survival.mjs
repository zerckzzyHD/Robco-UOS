/**
 * tests/save-survival.mjs — Save-integrity behavioural gate (SAVE_INTEGRITY_PASS, Protocol 8)
 *
 * The sacred-data guard: boots REAL fixtures through the REAL boot path
 * (_hydrateStateFromStorage / handleFileUpload) in a real Chromium page and
 * compares the parsed, live post-boot state against a precisely-computed
 * expected shape. This is deliberately NOT a source grep and NOT a call
 * into migrateState()/sanitizeImportedContainer() in isolation (Suites 12 and
 * 46.20-46.22 already do that, in a stubbed vm sandbox) — it is the one place
 * that proves a real save survives the real app.
 *
 * Field-list sourcing (anti-brittleness): the durable-field key set used for
 * the completeness check is read from the live page's window._defaultState
 * (state.js) on every run, never hand-copied, so a newly-added state field is
 * automatically covered by the "no field silently disappears" assertion the
 * day it lands.
 *
 * Read mechanism: window.snapshotActiveCampaign() (state.js) deep-clones the
 * live `state` into window.robco_v8.campaigns[activeContext] with no DOM
 * round-trip and no debounce — exactly what a save would persist.
 *
 * Comparison is on PARSED fields via a real recursive deepEqual, never on
 * serialized text (immune to key-ordering / transient-field churn).
 *
 * NOT part of the fast pre-commit gate — too slow. Wired into the full push
 * gate (scripts/gate.js) alongside boot-smoke/render-check/a11y/test-html.
 * Standalone: node tests/save-survival.mjs
 */

import { acquireBrowser } from './browser-shared.mjs';
import { fileURLToPath } from 'url';
import path from 'path';
import fs from 'fs';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const INDEX = path.join(ROOT, 'index.html');
const INDEX_URL = `file://${INDEX.replace(/\\/g, '/')}`;

if (!fs.existsSync(INDEX)) {
  console.error('save-survival: index.html not found at', INDEX);
  process.exit(1);
}

let failed = 0;
function pass(msg) {
  console.log('  [PASS]', msg);
}
function fail(msg) {
  failed++;
  console.error('  [FAIL]', msg);
}
function note(msg) {
  console.log('  [NOTE]', msg);
}

// ── Shared helpers ────────────────────────────────────────────────────────

// After a file-import/cloud-load that schedules a reload, the app sets
// window._loadingSave = true SYNCHRONOUSLY right before its setTimeout(reload).
// Poll for that signal first so we never race a slow FileReader/CDP file
// attach against a bare waitForNavigation (observed flaky under headless
// file:// — the write can lag past when navigation-watching starts).
async function waitForImportReload(page, timeoutMs = 10000) {
  await page
    .waitForFunction(() => window._loadingSave === true, { timeout: timeoutMs })
    .catch(() => {});
  await page.waitForNavigation({ timeout: timeoutMs }).catch(() => {});
}

async function waitBooted(page) {
  await page
    .waitForFunction(
      () => {
        const bs = document.getElementById('bootScreen');
        return !bs || bs.style.display === 'none' || getComputedStyle(bs).display === 'none';
      },
      { timeout: 8000 }
    )
    .catch(() => {});
  await page.waitForTimeout(500);
}

// True recursive structural equality — order-independent on object keys
// (immune to key-ordering churn across JSON round-trips, per plan directive).
function deepEqual(a, b) {
  if (a === b) return true;
  if (typeof a !== typeof b) return false;
  if (a === null || b === null) return a === b;
  if (typeof a !== 'object') return false;
  if (Array.isArray(a) !== Array.isArray(b)) return false;
  if (Array.isArray(a)) {
    if (a.length !== b.length) return false;
    for (let i = 0; i < a.length; i++) if (!deepEqual(a[i], b[i])) return false;
    return true;
  }
  const ak = Object.keys(a);
  const bk = Object.keys(b);
  if (ak.length !== bk.length) return false;
  for (const k of ak) {
    if (!Object.prototype.hasOwnProperty.call(b, k)) return false;
    if (!deepEqual(a[k], b[k])) return false;
  }
  return true;
}

// The core field-survival assertion (plan §2.1/§3.2): every key in the live
// window._defaultState must be PRESENT on the actual snapshot (no drop), and
// every key we explicitly probed (expected) must deep-equal what we injected
// (no silent default-reset, no duplication, no type corruption).
function assertFieldsSurvive(page, allKeys, actual, expected, label) {
  let ok = true;
  allKeys.forEach(k => {
    if (!(k in actual)) {
      fail(`${label} — field "${k}" is MISSING from post-boot state (silently dropped)`);
      ok = false;
    }
  });
  Object.keys(expected).forEach(k => {
    if (!deepEqual(actual[k], expected[k])) {
      fail(
        `${label} — field "${k}" mismatch. expected=${JSON.stringify(expected[k])} actual=${JSON.stringify(actual[k])}`
      );
      ok = false;
    }
  });
  if (ok) {
    pass(
      `${label} — all ${allKeys.length} durable field-keys present, all ${Object.keys(expected).length} probed values intact`
    );
  }
  return ok;
}

async function readSnapshot(page) {
  return page.evaluate(() => {
    const snap = window.snapshotActiveCampaign();
    const ctx = snap.activeContext;
    return {
      state: snap.campaigns[ctx],
      activeContext: ctx,
      chat: JSON.parse(localStorage.getItem('robco_chat') || '[]'),
      playstyle: localStorage.getItem('robco_playstyle') || '',
      defaultStateKeys: Object.keys(window._defaultState || {}),
    };
  });
}

// Compute a checksum for a fixture using the REAL in-page algorithm (Protocol
// 22 — never reimplement the hash in Node; drift risk). Requires a page that
// has already loaded index.html (computeSaveChecksum is a global).
async function computeChecksum(page, v8, chat, playstyle) {
  return page.evaluate(
    ({ v8, chat, playstyle }) => window.computeSaveChecksum(v8, chat, playstyle),
    { v8, chat, playstyle }
  );
}

// ── FNV faction key set (test fixture data — concrete example saves, not
// feature code, so hardcoding real keys here is the same precedent already
// used by tests/render-check.mjs's WORST_CASE_SAVE fixture) ────────────────
const FNV_FACTIONS = [
  'ncr',
  'legion',
  'house',
  'bos',
  'boomers',
  'khans',
  'followers',
  'powder',
  'kings',
  'strip',
  'freeside',
];
const FO3_FACTIONS = [
  'enclave',
  'bos',
  'lyons',
  'outcast',
  'talon',
  'regulators',
  'slavers',
  'reillys',
  'tunnelsnakes',
  'supermutants',
  'underworld',
  'rivetcity',
];

function buildFactions(keys, base) {
  const f = {};
  keys.forEach((k, i) => {
    f[k] = { fame: base + i * 3, infamy: base + i * 5 };
  });
  return f;
}

// ── Fixture builders ─────────────────────────────────────────────────────

function buildCurrentCampaign(ctx, seed) {
  const factionKeys = ctx === 'FO3' ? FO3_FACTIONS : FNV_FACTIONS;
  const skillKeys =
    ctx === 'FO3'
      ? [
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
        ]
      : [
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
  const skills = {};
  skillKeys.forEach((k, i) => (skills[k] = 15 + i + seed));
  return {
    lvl: 10 + seed,
    xp: 5000 + seed,
    hpCur: 90,
    hpMax: 130 + seed,
    s: 6,
    p: 7,
    e: 5,
    c: 4,
    i: 8,
    a: 9,
    l: 6,
    caps: 4200 + seed,
    loc: ctx === 'FO3' ? 'Megaton' : 'Novac',
    rads: 40 + seed,
    karma: 200 - seed,
    ticks: 555000 + seed,
    la: 'OK',
    ra: seed % 2 === 0 ? 'CRIPPLED' : 'OK',
    ll: 'OK',
    rl: 'OK',
    hd: 'OK',
    factions: buildFactions(factionKeys, seed),
    skills,
    status: [{ name: 'Well Rested', ticks: 100 + seed, type: 'BUFF' }],
    inventory: [
      { name: 'Test Rifle ' + seed, qty: 1, wgt: 8, val: 900, type: 'weapon' },
      { name: 'Stimpak', qty: 6, wgt: 0.5, val: 75, type: 'aid' },
    ],
    squad: [{ name: 'Companion ' + seed, hp: 140, hpMax: 150 }],
    campaign_notes: ['A manually-authored field note #' + seed + '.'],
    eventLog: [
      { t: 10, rt: 1700000000000, type: 'level', text: 'Level Up! Reached level 10.' },
      { t: 22, rt: 1700000100000, type: 'quest', text: 'Quest: Started a directive.' },
    ],
    perks: [{ name: 'Test Perk ' + seed, rank: 1 }],
    quests: [{ name: 'Test Directive ' + seed, status: 'active', objective: 'Do the thing.' }],
    equipped: { weapon: 'Test Rifle ' + seed, armor: null, headgear: null },
    ammo: { '10mm': 80 + seed },
    stats: { kills: 12 + seed, capsEarned: 5000, damageDealt: 9000, sessionStart: 1700000000000 },
    locationHistory: ['Goodsprings', 'Novac'],
    gameContext: ctx,
    collectibles: ['Collectible ' + seed],
    lincolnItems: ctx === 'FO3' ? { liberty_bell: 'hannibal' } : {},
    traits: ctx === 'FNV' ? ['Built to Destroy'] : [],
    skillBooks: ['Guns and Bullets'],
    magazines: ctx === 'FNV' ? ['Tumblers Today'] : [],
    campaignMode: 'standard',
    playthroughType: 'completionist',
    mapView: 'auto',
    padBindings: { up: 'Stimpak', down: null, left: null, right: 'Test Rifle ' + seed },
  };
}

// ── MATURE fixture: dense, dual-campaign (FNV active + FO3 present) ────────
function buildMatureCampaign(ctx, seed) {
  const base = buildCurrentCampaign(ctx, seed);
  // Densify: push arrays well past a single-entry sanity check.
  base.inventory = Array.from({ length: 25 }, (_, i) => ({
    name: `${ctx} Item ${i}`,
    qty: i + 1,
    wgt: (i % 5) + 0.5,
    val: 10 * (i + 1),
    type: i % 3 === 0 ? 'weapon' : i % 3 === 1 ? 'aid' : 'misc',
  }));
  base.quests = Array.from({ length: 15 }, (_, i) => ({
    name: `${ctx} Directive ${i}`,
    status: i % 3 === 0 ? 'complete' : i % 3 === 1 ? 'failed' : 'active',
    objective: `Objective text ${i}`,
  }));
  base.eventLog = Array.from({ length: 40 }, (_, i) => ({
    t: i * 10,
    rt: 1700000000000 + i * 1000,
    type: 'log',
    text: `${ctx} auto-logged event ${i}`,
  }));
  base.campaign_notes = Array.from({ length: 10 }, (_, i) => `${ctx} manual note ${i}`);
  base.perks = Array.from({ length: 12 }, (_, i) => ({ name: `${ctx} Perk ${i}`, rank: 1 }));
  base.squad = Array.from({ length: 6 }, (_, i) => ({
    name: `${ctx} Companion ${i}`,
    hp: 100,
    hpMax: 100,
  }));
  base.collectibles = Array.from({ length: 20 }, (_, i) => `${ctx} Collectible ${i}`);
  base.locationHistory = Array.from({ length: 10 }, (_, i) => `${ctx} Location ${i}`);
  // reconcileEquipped() (state.js) clears any equipped weapon/armor whose name
  // is not present in the (now-densified) inventory — point equipped at a real
  // item from the new list instead of the stale name buildCurrentCampaign set.
  base.equipped = { weapon: `${ctx} Item 0`, armor: null, headgear: null };
  return base;
}

// ── OLDEST_V7 fixture: flat, pre-2.0, v1.x-shaped single campaign ──────────
// version deliberately old; migrateState() ignores its `version` argument
// (confirmed by reading the function body — every migration is unconditional
// / idempotent), so no version-number gating to model here.
const OLDEST_V7_RAW = {
  version: '1.0.0',
  lvl: 12,
  xp: 4200,
  hpCur: 80,
  hpMax: 120,
  s: 7,
  p: 6,
  e: 5,
  c: 8,
  i: 9,
  a: 4,
  l: 6,
  caps: 3500,
  loc: 'Novac',
  rads: 250,
  karma: -150,
  ticks: 98765,
  la: 'CRIPPLED',
  ra: 'OK',
  ll: 'OK',
  rl: 'CRIPPLED',
  hd: 'OK',
  // no `factions` key — flat legacy keys instead:
  nf: 300,
  ni: 20,
  lf: 10,
  li: 400,
  sf: 150,
  si: 5,
  skills: {
    barter: 40,
    energy_weapons: 30,
    explosives: 20,
    guns: 55,
    lockpick: 35,
    medicine: 25,
    melee_weapons: 45,
    repair: 60,
    science: 50,
    sneak: 70,
    speech: 65,
    survival: 80,
    unarmed: 15,
  },
  status: [{ name: 'Well Rested', ticks: 100, type: 'BUFF' }],
  inventory: [
    { name: '10mm Pistol', qty: 1, wgt: 3.5, val: 120, type: 'weapon' },
    { name: 'Stimpak', qty: 5, wgt: 0.5, val: 75, type: 'aid' },
  ],
  squad: [{ name: 'Boone', hp: 150, hpMax: 150 }],
  // Mix of legacy [T#] auto-log lines (must MOVE to eventLog) and a genuine
  // manual note (must STAY in campaign_notes) — the P4 split under test.
  campaign_notes: [
    '[T5] Level Up! Reached level 5.',
    'Met a trader in Primm.',
    '[T12] Collectible: Found a Star Bottle Cap.',
  ],
  // no eventLog key — must be created by migrateState
  perks: [{ name: 'Toughness', rank: 1 }],
  quests: [{ name: 'Ring a Ding Ding!', status: 'active', objective: 'Retake the Tops' }],
  equipped: { weapon: '10mm Pistol', armor: null, headgear: null },
  ammo: { '10mm': 120 },
  stats: { kills: 42, capsEarned: 9000, damageDealt: 15000, sessionStart: 1700000000000 },
  locationHistory: ['Goodsprings', 'Primm', 'Novac'],
  // v2.0 fields entirely ABSENT: gameContext, collectibles, traits,
  // skillBooks, magazines, campaignMode, playthroughType, mapView, padBindings
  // Legacy per-item disposition vocabulary being migrated ('other' -> 'found'):
  lincolnItems: { liberty_bell: 'other', star_spangled_banner: 'hannibal' },
};

// Hand-derived expected shape after migrateState() runs on OLDEST_V7_RAW —
// every value below was computed by reading migrateState()/_migrateEventLog()/
// reconcileEquipped() line-by-line against this exact fixture (see the plan
// review notes); NOT guessed. Fields omitted here are expected UNCHANGED from
// the raw fixture (migrateState never touches them).
const OLDEST_V7_EXPECTED = {
  factions: {
    ncr: { fame: 300, infamy: 20 },
    legion: { fame: 10, infamy: 400 },
    house: { fame: 150, infamy: 5 },
    bos: { fame: 0, infamy: 0 },
    boomers: { fame: 0, infamy: 0 },
    khans: { fame: 0, infamy: 0 },
    followers: { fame: 0, infamy: 0 },
    powder: { fame: 0, infamy: 0 },
    kings: { fame: 0, infamy: 0 },
    strip: { fame: 0, infamy: 0 },
    freeside: { fame: 0, infamy: 0 },
  },
  eventLog: [
    { t: 5, rt: 0, type: 'level', text: 'Level Up! Reached level 5.' },
    { t: 12, rt: 0, type: 'collectible', text: 'Collectible: Found a Star Bottle Cap.' },
  ],
  campaign_notes: ['Met a trader in Primm.'],
  gameContext: 'FNV',
  collectibles: [],
  traits: [],
  skillBooks: [],
  magazines: [],
  campaignMode: 'standard',
  playthroughType: 'standard',
  mapView: 'auto',
  padBindings: { up: null, down: null, left: null, right: null },
  lincolnItems: { liberty_bell: 'found', star_spangled_banner: 'hannibal' },
  equipped: { weapon: '10mm Pistol', armor: null, headgear: null },
  // Unchanged pass-through fields (asserted too, for completeness):
  lvl: 12,
  xp: 4200,
  caps: 3500,
  loc: 'Novac',
  rads: 250,
  karma: -150,
  skills: OLDEST_V7_RAW.skills,
  inventory: OLDEST_V7_RAW.inventory,
  squad: OLDEST_V7_RAW.squad,
  perks: OLDEST_V7_RAW.perks,
  quests: OLDEST_V7_RAW.quests,
  ammo: OLDEST_V7_RAW.ammo,
  stats: OLDEST_V7_RAW.stats,
  locationHistory: OLDEST_V7_RAW.locationHistory,
};

// ── MALFORMED fixture: v8 container with real good data ALONGSIDE garbage ──
function buildMalformedCampaign() {
  return {
    lvl: 8,
    xp: 900,
    hpCur: 40,
    hpMax: 100,
    s: 5,
    p: 5,
    e: 5,
    c: 5,
    i: 5,
    a: 5,
    l: 5,
    caps: 200,
    loc: 'Freeside',
    rads: 99999, // out of range (maxRads 1000)
    karma: 0,
    ticks: 100,
    la: 'OK',
    ra: 'OK',
    ll: 'OK',
    rl: 'OK',
    hd: 'OK',
    factions: 'GARBAGE-NOT-AN-OBJECT', // garbage
    skills: { barter: 15 },
    status: [],
    inventory: [{ name: 'Real Good Item', qty: 1, wgt: 1, val: 50, type: 'misc' }],
    squad: [],
    campaign_notes: ['A genuine manual note that must survive.'],
    eventLog: [],
    perks: [],
    quests: [],
    equipped: { weapon: null }, // missing armor/headgear keys
    ammo: {},
    stats: { kills: 0, capsEarned: 0, damageDealt: 0, sessionStart: 1700000000000 },
    locationHistory: [],
    gameContext: 'FNV',
    collectibles: [],
    lincolnItems: {},
    traits: [],
    skillBooks: [],
    magazines: [],
    campaignMode: 'elite-bogus-mode', // garbage enum
    playthroughType: 'standard',
    mapView: 'giant-bogus-view', // garbage enum
    padBindings: ['up', 'down'], // array instead of object — garbage
  };
}

// ── IMPORT_ASYMMETRY fixture: a realistic OLD-but-structurally-valid v8
// campaign (not garbage) carrying exactly the three values only migrateState()
// normalizes and sanitizeImportedContainer()/the v8 fast-path do NOT: a bogus
// campaignMode, a bogus mapView, and a legacy-archived faction key (wgs) with
// real fame — the precise residual gap the plan (§1B/§2.2) flagged between
// cloud/slot/backup (which run migrateState) and file-import (which doesn't).
function buildImportAsymmetryCampaign() {
  const c = buildCurrentCampaign('FNV', 3);
  c.campaignMode = 'ironman-bogus'; // migrateState would normalize -> 'standard'
  c.mapView = 'bogus-huge'; // migrateState would normalize -> 'auto'
  c.factions.wgs = { fame: 75, infamy: 0 }; // migrateState archives + prunes this
  return c;
}

// ── Test run ─────────────────────────────────────────────────────────────

const browser = await acquireBrowser();

// ═══════════════════════════════════════════════════════════════════════
// PATH 1a — save -> reload (CURRENT fixture, single FNV campaign)
// ═══════════════════════════════════════════════════════════════════════
{
  const ctx1 = await browser.newContext({ viewport: { width: 1024, height: 768 } });
  const current = buildCurrentCampaign('FNV', 1);
  const container = { activeContext: 'FNV', campaigns: { FNV: current } };
  await ctx1.addInitScript(v8 => {
    localStorage.setItem('robco_v8', v8);
  }, JSON.stringify(container));
  const page = await ctx1.newPage();
  await page.goto(INDEX_URL);
  await waitBooted(page);

  const snap = await readSnapshot(page);
  assertFieldsSurvive(
    page,
    snap.defaultStateKeys,
    snap.state,
    current,
    'PATH1a save->reload (CURRENT)'
  );
  await ctx1.close();
}

// ═══════════════════════════════════════════════════════════════════════
// PATH 1b — save -> reload (MATURE fixture, DUAL campaign FNV active + FO3)
// ═══════════════════════════════════════════════════════════════════════
{
  const ctx2 = await browser.newContext({ viewport: { width: 1024, height: 768 } });
  const matureFnv = buildMatureCampaign('FNV', 2);
  const matureFo3 = buildMatureCampaign('FO3', 7);
  const container = { activeContext: 'FNV', campaigns: { FNV: matureFnv, FO3: matureFo3 } };
  await ctx2.addInitScript(v8 => {
    localStorage.setItem('robco_v8', v8);
  }, JSON.stringify(container));
  const page = await ctx2.newPage();
  await page.goto(INDEX_URL);
  await waitBooted(page);

  const snap = await readSnapshot(page);
  assertFieldsSurvive(
    page,
    snap.defaultStateKeys,
    snap.state,
    matureFnv,
    'PATH1b save->reload (MATURE active FNV)'
  );

  // The INACTIVE FO3 campaign must sit byte-for-byte untouched in
  // window.robco_v8.campaigns.FO3 — nothing at boot should touch it.
  const inactive = await page.evaluate(() => window.robco_v8.campaigns.FO3);
  if (deepEqual(inactive, matureFo3)) {
    pass(
      'PATH1b save->reload (MATURE) — inactive FO3 campaign untouched, dual-campaign coexistence intact'
    );
  } else {
    fail(
      'PATH1b save->reload (MATURE) — inactive FO3 campaign was mutated at boot! Dual-campaign data at risk.'
    );
  }
  await ctx2.close();
}

// ═══════════════════════════════════════════════════════════════════════
// PATH 3 — legacy (v7) -> migrate -> reload -> ready
// ═══════════════════════════════════════════════════════════════════════
{
  const ctx3 = await browser.newContext({ viewport: { width: 1024, height: 768 } });
  await ctx3.addInitScript(v7 => {
    localStorage.setItem('robco_v7', v7);
  }, JSON.stringify(OLDEST_V7_RAW));
  const page = await ctx3.newPage();
  await page.goto(INDEX_URL);
  await waitBooted(page);

  const snap = await readSnapshot(page);
  assertFieldsSurvive(
    page,
    snap.defaultStateKeys,
    snap.state,
    OLDEST_V7_EXPECTED,
    'PATH3 legacy(v7)->migrate->reload->ready'
  );

  // robco_v7 must be cleared/superseded by robco_v8 after the upgrade.
  const v8Present = await page.evaluate(() => !!localStorage.getItem('robco_v8'));
  if (v8Present) {
    pass('PATH3 — robco_v8 container created from the v7 upgrade');
  } else {
    fail('PATH3 — no robco_v8 container was written after the v7 upgrade');
  }
  await ctx3.close();
}

// ═══════════════════════════════════════════════════════════════════════
// PATH 1c — MALFORMED through the v8 fast path (plain reload): no crash,
// GOOD data intact, garbage documented (not asserted as "must be coerced" —
// see the written report for the honest classification of what does/doesn't
// self-heal on this path today).
// ═══════════════════════════════════════════════════════════════════════
{
  const ctx4 = await browser.newContext({ viewport: { width: 1024, height: 768 } });
  const malformed = buildMalformedCampaign();
  const container = { activeContext: 'FNV', campaigns: { FNV: malformed } };
  await ctx4.addInitScript(v8 => {
    localStorage.setItem('robco_v8', v8);
  }, JSON.stringify(container));
  const page = await ctx4.newPage();
  const consoleErrors = [];
  // The ServiceWorker registration rejection is a known, harmless artifact of
  // testing at file:// origin (registerServiceWorker() rejects because file://
  // has no valid SW scope) — it fires on EVERY file:// boot regardless of
  // fixture content, so it is filtered here rather than treated as a crash.
  page.on('pageerror', e => {
    const s = String(e);
    if (!/Failed to register a ServiceWorker/.test(s)) consoleErrors.push(s);
  });
  await page.goto(INDEX_URL);
  await waitBooted(page);

  const bootOk = await page.evaluate(() => {
    const bs = document.getElementById('bootScreen');
    return !bs || getComputedStyle(bs).display === 'none';
  });
  if (bootOk && consoleErrors.length === 0) {
    pass('PATH1c MALFORMED fast-path — app boots to ready with no uncaught page error');
  } else {
    fail(
      `PATH1c MALFORMED fast-path — boot problem. bootOk=${bootOk} errors=${JSON.stringify(consoleErrors)}`
    );
  }

  const snap = await readSnapshot(page);
  // GOOD data (real inventory item + manual note) must survive untouched.
  const inv = snap.state.inventory;
  const notes = snap.state.campaign_notes;
  if (
    Array.isArray(inv) &&
    inv.some(it => it.name === 'Real Good Item') &&
    Array.isArray(notes) &&
    notes.includes('A genuine manual note that must survive.')
  ) {
    pass(
      'PATH1c MALFORMED fast-path — genuine GOOD data (inventory item, manual note) survives intact'
    );
  } else {
    fail(
      `PATH1c MALFORMED fast-path — GOOD data lost! inventory=${JSON.stringify(inv)} notes=${JSON.stringify(notes)}`
    );
  }
  // Completeness: no _defaultState key is literally undefined post-boot.
  let allPresent = true;
  snap.defaultStateKeys.forEach(k => {
    if (!(k in snap.state)) {
      allPresent = false;
      fail(`PATH1c MALFORMED fast-path — field "${k}" MISSING post-boot (silent drop)`);
    }
  });
  if (allPresent)
    pass('PATH1c MALFORMED fast-path — every durable field-key still present post-boot');

  // Documentation probes (NOT hard failures — these record the honest,
  // evidence-based classification of what the fast path does/doesn't
  // self-heal today; see the written report).
  note(
    `PATH1c MALFORMED fast-path — factions post-boot: ${JSON.stringify(snap.state.factions)} (garbage-string coercion: ${typeof snap.state.factions === 'object' ? 'YES, coerced to object' : 'NO, stayed uncoerced'})`
  );
  note(
    `PATH1c MALFORMED fast-path — campaignMode post-boot: ${JSON.stringify(snap.state.campaignMode)}`
  );
  note(`PATH1c MALFORMED fast-path — mapView post-boot: ${JSON.stringify(snap.state.mapView)}`);
  note(
    `PATH1c MALFORMED fast-path — rads post-boot: ${JSON.stringify(snap.state.rads)} (maxRads is 1000)`
  );
  note(`PATH1c MALFORMED fast-path — equipped post-boot: ${JSON.stringify(snap.state.equipped)}`);
  note(
    `PATH1c MALFORMED fast-path — padBindings post-boot: ${JSON.stringify(snap.state.padBindings)}`
  );

  await ctx4.close();
}

// ═══════════════════════════════════════════════════════════════════════
// PATH 2 — export -> import (real #fileInput) -> reload, using the
// IMPORT_ASYMMETRY fixture (the plan's explicit instruction: run a
// legacy-flavored fixture through the REAL import path to surface the
// migrate-skip asymmetry between file-import and cloud/slot/backup).
// ═══════════════════════════════════════════════════════════════════════
let importAsymmetryResult = null;
{
  const ctx5 = await browser.newContext({ viewport: { width: 1024, height: 768 } });
  const page = await ctx5.newPage();
  await page.goto(INDEX_URL); // boot once with defaults so window.computeSaveChecksum exists
  await waitBooted(page);

  const asym = buildImportAsymmetryCampaign();
  const v8 = { activeContext: 'FNV', campaigns: { FNV: asym } };
  const chat = [{ sender: 'user', text: 'hello' }];
  const playstyle = 'completionist';
  const checksum = await computeChecksum(page, v8, chat, playstyle);
  const envelope = {
    version: '2.6.0',
    schemaVersion: '2.6.0',
    robco_v8: v8,
    chat,
    playstyle,
    checksum,
  };

  await page.setInputFiles('#fileInput', {
    name: 'asymmetry-save.json',
    mimeType: 'application/json',
    buffer: Buffer.from(JSON.stringify(envelope)),
  });
  await waitForImportReload(page);
  await waitBooted(page);

  const snap = await readSnapshot(page);
  // Completeness must hold regardless of the asymmetry verdict.
  let allPresent = true;
  snap.defaultStateKeys.forEach(k => {
    if (!(k in snap.state)) {
      allPresent = false;
      fail(`PATH2 import(asymmetry) — field "${k}" MISSING post-import (silent drop)`);
    }
  });
  if (allPresent) pass('PATH2 import(asymmetry) — every durable field-key present post-import');

  // Real user data must be intact regardless of the asymmetry verdict.
  if (
    deepEqual(snap.state.inventory, asym.inventory) &&
    deepEqual(snap.state.quests, asym.quests)
  ) {
    pass('PATH2 import(asymmetry) — real campaign data (inventory, quests) survives the import');
  } else {
    fail('PATH2 import(asymmetry) — real campaign data was altered/lost by the import!');
  }

  // THE MIGRATE-PARITY REGRESSION LOCK — _writeImportedContainer() now runs
  // migrateState() per campaign (state.js), mirroring cloud.js's loadCloudSave.
  // This asserts the fix, not just documents it: a bogus campaignMode/mapView
  // normalizes and a legacy-archived faction key (wgs) prunes on file-import
  // exactly as it already did on cloud/slot/backup.
  const campaignModeNormalized = snap.state.campaignMode === 'standard';
  const mapViewNormalized = snap.state.mapView === 'auto';
  const wgsPruned = !snap.state.factions || snap.state.factions.wgs === undefined;
  importAsymmetryResult = { campaignModeNormalized, mapViewNormalized, wgsPruned, snap };
  if (campaignModeNormalized) {
    pass(
      'PATH2 import(asymmetry) — migrate-parity: bogus campaignMode normalized to "standard" on file-import'
    );
  } else {
    fail(
      `PATH2 import(asymmetry) — campaignMode NOT normalized on file-import (got "${snap.state.campaignMode}")`
    );
  }
  if (mapViewNormalized) {
    pass(
      'PATH2 import(asymmetry) — migrate-parity: bogus mapView normalized to "auto" on file-import'
    );
  } else {
    fail(
      `PATH2 import(asymmetry) — mapView NOT normalized on file-import (got "${snap.state.mapView}")`
    );
  }
  if (wgsPruned) {
    pass(
      'PATH2 import(asymmetry) — migrate-parity: legacy-archived faction key (wgs) pruned on file-import'
    );
  } else {
    fail(
      `PATH2 import(asymmetry) — legacy faction key NOT pruned on file-import (factions.wgs=${JSON.stringify(snap.state.factions && snap.state.factions.wgs)})`
    );
  }
  await ctx5.close();
}

// ═══════════════════════════════════════════════════════════════════════
// PATH 5 — failed-import-leaves-original-intact
// ═══════════════════════════════════════════════════════════════════════
{
  const ctx6 = await browser.newContext({ viewport: { width: 1024, height: 768 } });
  const good = buildCurrentCampaign('FNV', 9);
  const container = { activeContext: 'FNV', campaigns: { FNV: good } };
  await ctx6.addInitScript(v8 => {
    localStorage.setItem('robco_v8', v8);
  }, JSON.stringify(container));
  const page = await ctx6.newPage();
  await page.goto(INDEX_URL);
  await waitBooted(page);

  const before = await page.evaluate(() => localStorage.getItem('robco_v8'));

  // Sub-case A: genuinely unparseable JSON — must be rejected before any write.
  await page.setInputFiles('#fileInput', {
    name: 'corrupt.json',
    mimeType: 'application/json',
    buffer: Buffer.from('{ this is not valid json !!'),
  });
  await page.waitForTimeout(500);
  const afterCorrupt = await page.evaluate(() => localStorage.getItem('robco_v8'));
  if (afterCorrupt === before) {
    pass(
      'PATH5a failed-import (corrupt JSON) — original robco_v8 byte-for-byte unchanged, no partial apply'
    );
  } else {
    fail(
      'PATH5a failed-import (corrupt JSON) — original robco_v8 was ALTERED by a rejected import!'
    );
  }
  const alertShown = await page.evaluate(() => {
    const chat = document.getElementById('chatDisplay');
    return chat ? chat.textContent.includes('SAVE FILE CORRUPTED') : false;
  });
  if (alertShown) {
    pass(
      'PATH5a failed-import (corrupt JSON) — failure surfaced loudly in chat (not silently swallowed)'
    );
  } else {
    fail('PATH5a failed-import (corrupt JSON) — no visible failure notice (silent swallow)');
  }

  // Sub-case B: well-formed but checksum-mismatched envelope, user DECLINES
  // the "LOAD ANYWAY" confirm — must also leave the original untouched.
  await page.evaluate(() => {
    window.confirmAction = () => Promise.resolve(false);
  });
  const badEnvelope = {
    version: '2.8.0',
    schemaVersion: '2.8.0',
    robco_v8: { activeContext: 'FNV', campaigns: { FNV: { lvl: 999, xp: 999 } } },
    chat: [],
    playstyle: 'any',
    checksum: 'deadbeef',
  };
  await page.setInputFiles('#fileInput', {
    name: 'mismatched.json',
    mimeType: 'application/json',
    buffer: Buffer.from(JSON.stringify(badEnvelope)),
  });
  await page.waitForTimeout(500);
  const afterDeclined = await page.evaluate(() => localStorage.getItem('robco_v8'));
  if (afterDeclined === before) {
    pass(
      'PATH5b failed-import (checksum mismatch, user declines) — original robco_v8 unchanged, decline path holds'
    );
  } else {
    fail(
      'PATH5b failed-import (checksum mismatch, user declines) — original robco_v8 was ALTERED after decline!'
    );
  }
  await ctx6.close();
}

// ═══════════════════════════════════════════════════════════════════════
// PATH 6 — conflict-without-silent-loss. Live Firestore is not reachable
// from an offline file:// Playwright context (no project credentials, no
// network) — so this proves the SHARED conflict-detection + confirm-gate
// mechanism (verifySaveEnvelope + confirmAction) that cloud.js's loadCloudSave
// reuses verbatim (Protocol 22, same functions, same gate shape), via the
// one entry point that IS locally testable: file import. This is an honest,
// narrower proof than a live cloud round-trip — documented as such, not
// claimed as full cloud E2E coverage.
// ═══════════════════════════════════════════════════════════════════════
{
  const ctx7 = await browser.newContext({ viewport: { width: 1024, height: 768 } });
  const page = await ctx7.newPage();
  await page.goto(INDEX_URL);
  await waitBooted(page);

  // Seed the "local" baseline via page.evaluate + a GUARDED reload — never
  // addInitScript here: addInitScript re-fires on EVERY navigation in this
  // context, including the app's OWN reload after the import below, which
  // would silently re-clobber the just-imported data with this seed right
  // back (the exact gotcha tests/render-check.mjs's seedAndBoot() helper
  // documents and works around for the identical reason).
  const local = buildCurrentCampaign('FNV', 4);
  local.caps = 99999; // a distinctive "local" value the divergent import must not silently clobber
  await page.evaluate(
    v8 => {
      localStorage.setItem('robco_v8', v8);
      window._loadingSave = true; // guard our own reload's beforeunload flush
    },
    JSON.stringify({ activeContext: 'FNV', campaigns: { FNV: local } })
  );
  await page.reload({ waitUntil: 'load' });
  await waitBooted(page);

  // A DIVERGENT envelope with a real checksum but different field values —
  // simulates "this file/cloud copy diverges from what's live." The app's
  // only gate on a v8-container import is the checksum verifier; a
  // structurally-valid-but-different save is accepted as a deliberate user
  // action (importing IS an intentional overwrite), so the correct proof
  // here is that a genuinely CORRUPT/mismatched divergent copy is gated and
  // that the user's decision (decline) is honored with zero silent loss —
  // already proven in PATH5b. This block proves the complementary half:
  // ACCEPTING a divergent-but-VALID import does not silently drop the new
  // data either (both directions of "no silent loss").
  const divergent = buildCurrentCampaign('FNV', 5);
  divergent.caps = 1; // distinctive "incoming" value
  const v8b = { activeContext: 'FNV', campaigns: { FNV: divergent } };
  const checksum = await computeChecksum(page, v8b, [], 'any');
  const envelope = {
    version: '2.8.0',
    schemaVersion: '2.8.0',
    robco_v8: v8b,
    chat: [],
    playstyle: 'any',
    checksum,
  };

  await page.setInputFiles('#fileInput', {
    name: 'divergent.json',
    mimeType: 'application/json',
    buffer: Buffer.from(JSON.stringify(envelope)),
  });
  await waitForImportReload(page);
  await waitBooted(page);
  const snap = await readSnapshot(page);
  if (snap.state.caps === 1) {
    pass(
      'PATH6 conflict (accept divergent) — the incoming copy is fully applied, not silently merged/dropped'
    );
  } else {
    fail(
      `PATH6 conflict (accept divergent) — expected caps=1 from the incoming copy, got ${snap.state.caps}`
    );
  }
  await ctx7.close();
}

// ═══════════════════════════════════════════════════════════════════════
// PATH 4 — installed -> update -> OFFLINE reload. An old-shaped v8 save
// (missing 2.0-era fields is impossible for a v8 container that was ever
// through boot once, so this models the realistic case: a v8 save authored
// on an older APP_VERSION, carrying an un-split [T#] event line, booted
// OFFLINE on the current version) — proves migration/hydration has NO
// network dependency and no field is lost.
// ═══════════════════════════════════════════════════════════════════════
{
  const ctx8 = await browser.newContext({ viewport: { width: 1024, height: 768 } });
  const stale = buildCurrentCampaign('FNV', 6);
  stale.campaign_notes = ['[T3] Level Up! Reached level 3.', 'A real manual note.'];
  stale.eventLog = [];
  const container = {
    activeContext: 'FNV',
    campaigns: { FNV: stale },
  };
  await ctx8.addInitScript(v8 => {
    localStorage.setItem('robco_v8', v8);
  }, JSON.stringify(container));
  await ctx8.setOffline(true);
  const page = await ctx8.newPage();
  await page.goto(INDEX_URL);
  await waitBooted(page);

  const snap = await readSnapshot(page);
  let allPresent = true;
  snap.defaultStateKeys.forEach(k => {
    if (!(k in snap.state)) {
      allPresent = false;
      fail(`PATH4 offline-update-reload — field "${k}" MISSING post-boot (silent drop)`);
    }
  });
  if (allPresent)
    pass('PATH4 offline-update-reload — every durable field-key present, fully offline');

  const notes = snap.state.campaign_notes;
  const log = snap.state.eventLog;
  const splitOk =
    Array.isArray(notes) &&
    notes.includes('A real manual note.') &&
    !notes.some(n => /^\[T\d+\]/.test(n)) &&
    Array.isArray(log) &&
    log.some(e => e.text === 'Level Up! Reached level 3.');
  if (splitOk) {
    pass(
      'PATH4 offline-update-reload — [T#] auto-log split into eventLog ran fully offline, manual note preserved'
    );
  } else {
    fail(
      `PATH4 offline-update-reload — [T#] split did not run correctly offline. notes=${JSON.stringify(notes)} log=${JSON.stringify(log)}`
    );
  }
  await ctx8.close();
}

// ═══════════════════════════════════════════════════════════════════════
// TWO-STORE BOUNDARY (Protocol 23) — a device pref must never leak into the
// campaign save; a campaign field must never land under a meta key.
// ═══════════════════════════════════════════════════════════════════════
{
  const ctx9 = await browser.newContext({ viewport: { width: 1024, height: 768 } });
  const c = buildCurrentCampaign('FNV', 8);
  const container = { activeContext: 'FNV', campaigns: { FNV: c } };
  await ctx9.addInitScript(v8 => {
    localStorage.setItem('robco_v8', v8);
    localStorage.setItem('robco_sfx_muted', 'true'); // a real MetaStore/device-pref key
  }, JSON.stringify(container));
  const page = await ctx9.newPage();
  await page.goto(INDEX_URL);
  await waitBooted(page);

  // Force a fresh live write of the campaign save.
  await page.evaluate(() => {
    if (typeof window.snapshotActiveCampaign === 'function') window.snapshotActiveCampaign();
  });

  const result = await page.evaluate(() => ({
    v8Str: localStorage.getItem('robco_v8') || '',
    sfxVal: localStorage.getItem('robco_sfx_muted'),
    metaKeys: typeof MetaStore !== 'undefined' ? MetaStore.keys() : [],
  }));
  if (!result.v8Str.includes('robco_sfx_muted') && !result.v8Str.includes('"sfx')) {
    pass(
      'Two-store boundary — device pref (robco_sfx_muted) does not leak into the robco_v8 campaign save'
    );
  } else {
    fail('Two-store boundary — device pref leaked into the campaign save JSON!');
  }
  if (result.sfxVal === 'true') {
    pass('Two-store boundary — the device pref itself is untouched by the campaign save path');
  } else {
    fail(
      `Two-store boundary — device pref value corrupted by a campaign write! got "${result.sfxVal}"`
    );
  }
  await ctx9.close();
}

// ═══════════════════════════════════════════════════════════════════════
// FAIL-LOUD AUDIT — quota-exceeded on the debounced live save must warn AND
// leave the prior save intact (never silently swallowed).
// ═══════════════════════════════════════════════════════════════════════
{
  const ctx10 = await browser.newContext({ viewport: { width: 1024, height: 768 } });
  const c = buildCurrentCampaign('FNV', 11);
  const container = { activeContext: 'FNV', campaigns: { FNV: c } };
  await ctx10.addInitScript(v8 => {
    localStorage.setItem('robco_v8', v8);
  }, JSON.stringify(container));
  const page = await ctx10.newPage();
  await page.goto(INDEX_URL);
  await waitBooted(page);

  const before = await page.evaluate(() => localStorage.getItem('robco_v8'));
  const result = await page.evaluate(() => {
    return new Promise(resolve => {
      const realSetItem = Storage.prototype.setItem;
      Storage.prototype.setItem = function (key, val) {
        if (key === 'robco_v8') {
          const err = new Error('Simulated quota');
          err.name = 'QuotaExceededError';
          throw err;
        }
        return realSetItem.call(this, key, val);
      };
      // Mutate the REAL DOM field, not `state` directly — saveState() calls
      // syncStateFromDom() first, which would otherwise clobber a direct
      // `state.caps` write back to the DOM's stale value before the dirty-check,
      // making the save a no-op and never reaching localStorage.setItem at all.
      const capsEl = document.getElementById('c_caps');
      capsEl.value = 424242;
      saveState();
      setTimeout(() => {
        Storage.prototype.setItem = realSetItem;
        const chat = document.getElementById('chatDisplay');
        resolve({
          warned: chat ? chat.textContent.includes('STORAGE QUOTA EXCEEDED') : false,
          v8After: localStorage.getItem('robco_v8'),
        });
      }, 700);
    });
  });
  if (result.warned) {
    pass(
      'Fail-loud audit — saveState() quota failure warns loudly in chat (not silently swallowed)'
    );
  } else {
    fail('Fail-loud audit — saveState() quota failure did NOT surface a warning');
  }
  if (result.v8After === before) {
    pass(
      'Fail-loud audit — saveState() quota failure leaves the prior robco_v8 intact (no partial write)'
    );
  } else {
    fail(
      'Fail-loud audit — saveState() quota failure ALTERED robco_v8 (partial write / data loss)!'
    );
  }
  await ctx10.close();
}

// ═══════════════════════════════════════════════════════════════════════
// FAIL-LOUD AUDIT — cold-store slot write: when BOTH IDB and localStorage
// reject, _coldWriteObj() (state.js) returns false and saveToSlot() (ui-
// saves.js) must surface that as a loud error, never report success on a
// silent double-failure (plan §2.4). Verifies existing behavior rather than
// assuming it — this is a lock, not a fix (the code already does this
// correctly; confirmed by reading saveToSlot()'s `if (ok) {...} else {...}`
// branch before writing this test).
// ═══════════════════════════════════════════════════════════════════════
{
  const ctx11 = await browser.newContext({ viewport: { width: 1024, height: 768 } });
  const c = buildCurrentCampaign('FNV', 12);
  const container = { activeContext: 'FNV', campaigns: { FNV: c } };
  await ctx11.addInitScript(v8 => {
    localStorage.setItem('robco_v8', v8);
  }, JSON.stringify(container));
  const page = await ctx11.newPage();
  await page.goto(INDEX_URL);
  await waitBooted(page);

  const beforeSlot = await page.evaluate(() => localStorage.getItem('robco_slot_1'));
  const result = await page.evaluate(async () => {
    const realSetItem = Storage.prototype.setItem;
    const realIdbSet = window.IdbStore && window.IdbStore.set;
    Storage.prototype.setItem = function (key, val) {
      if (key === 'robco_slot_1') throw new Error('Simulated total storage failure');
      return realSetItem.call(this, key, val);
    };
    if (window.IdbStore) window.IdbStore.set = () => Promise.resolve(false);
    await window.saveToSlot(1);
    Storage.prototype.setItem = realSetItem;
    if (window.IdbStore) window.IdbStore.set = realIdbSet;
    const chat = document.getElementById('chatDisplay');
    return {
      warned: chat ? chat.textContent.includes('Save slot write failed') : false,
      slotAfter: localStorage.getItem('robco_slot_1'),
    };
  });
  if (result.warned) {
    pass(
      'Fail-loud audit — saveToSlot() total write failure (IDB+LS both reject) warns loudly, not swallowed'
    );
  } else {
    fail('Fail-loud audit — saveToSlot() total write failure did NOT surface a warning');
  }
  if (result.slotAfter === beforeSlot) {
    pass(
      'Fail-loud audit — saveToSlot() total write failure leaves the prior slot contents intact'
    );
  } else {
    fail('Fail-loud audit — saveToSlot() total write failure ALTERED the slot (partial write)!');
  }
  await ctx11.close();
}

// ═══════════════════════════════════════════════════════════════════════
// PERSISTENT STORAGE — persist() fires, records state, and the DENIED path
// renders the diegetic warning banner (only on denied, never on granted).
// ═══════════════════════════════════════════════════════════════════════
{
  // Sub-case: DENIED
  const ctxD = await browser.newContext({ viewport: { width: 412, height: 900 } });
  const page = await ctxD.newPage();
  await page.addInitScript(() => {
    if (navigator.storage) {
      navigator.storage.persist = () => Promise.resolve(false);
      navigator.storage.persisted = () => Promise.resolve(false);
    }
  });
  await page.goto(INDEX_URL);
  await waitBooted(page);
  await page.waitForTimeout(300); // let the fire-and-forget boot phase settle
  const denied = await page.evaluate(() => ({
    metaVal: typeof MetaStore !== 'undefined' ? MetaStore.get('robco_storage_persisted') : null,
    bannerVisible: (() => {
      const b = document.getElementById('storageWarningBanner');
      return !!b && getComputedStyle(b).display !== 'none';
    })(),
  }));
  if (denied.metaVal === 'denied') {
    pass('Storage persist — DENIED result recorded to robco_storage_persisted');
  } else {
    fail(`Storage persist — DENIED result not recorded (got "${denied.metaVal}")`);
  }
  if (denied.bannerVisible) {
    pass('Storage persist — DENIED shows the diegetic MEMORY CORE UNSTABLE warning banner');
  } else {
    fail('Storage persist — DENIED did NOT show the warning banner');
  }
  await ctxD.close();

  // Sub-case: GRANTED — banner must NOT render.
  const ctxG = await browser.newContext({ viewport: { width: 412, height: 900 } });
  const pageG = await ctxG.newPage();
  await pageG.addInitScript(() => {
    if (navigator.storage) {
      navigator.storage.persist = () => Promise.resolve(true);
      navigator.storage.persisted = () => Promise.resolve(true);
    }
  });
  await pageG.goto(INDEX_URL);
  await waitBooted(pageG);
  await pageG.waitForTimeout(300);
  const granted = await pageG.evaluate(() => ({
    metaVal: typeof MetaStore !== 'undefined' ? MetaStore.get('robco_storage_persisted') : null,
    bannerVisible: (() => {
      const b = document.getElementById('storageWarningBanner');
      return !!b && getComputedStyle(b).display !== 'none';
    })(),
  }));
  if (granted.metaVal === 'granted') {
    pass('Storage persist — GRANTED result recorded to robco_storage_persisted');
  } else {
    fail(`Storage persist — GRANTED result not recorded (got "${granted.metaVal}")`);
  }
  if (!granted.bannerVisible) {
    pass('Storage persist — GRANTED does NOT show the warning banner');
  } else {
    fail('Storage persist — GRANTED incorrectly showed the warning banner');
  }
  await ctxG.close();

  // Sub-case: feature-detect absent — must never throw into boot.
  const ctxU = await browser.newContext({ viewport: { width: 412, height: 900 } });
  const pageU = await ctxU.newPage();
  const pageErrors = [];
  pageU.on('pageerror', e => {
    const s = String(e);
    if (!/Failed to register a ServiceWorker/.test(s)) pageErrors.push(s);
  });
  await pageU.addInitScript(() => {
    try {
      delete navigator.__proto__.storage;
    } catch (_) {
      /* some engines can't delete the getter — best-effort */
    }
    Object.defineProperty(navigator, 'storage', { value: undefined, configurable: true });
  });
  await pageU.goto(INDEX_URL);
  await waitBooted(pageU);
  if (pageErrors.length === 0) {
    pass('Storage persist — absent navigator.storage never throws into boot (feature-detected)');
  } else {
    fail(
      `Storage persist — absent navigator.storage threw into boot! ${JSON.stringify(pageErrors)}`
    );
  }
  await ctxU.close();
}

await browser.close();

// ── Verdict summary ────────────────────────────────────────────────────
console.log('\n  -- migrate-parity verdict (evidence from PATH2) --');
if (importAsymmetryResult) {
  console.log(
    `  campaignMode normalized on import: ${importAsymmetryResult.campaignModeNormalized}\n` +
      `  mapView normalized on import: ${importAsymmetryResult.mapViewNormalized}\n` +
      `  legacy faction (wgs) pruned on import: ${importAsymmetryResult.wgsPruned}`
  );
}

if (failed === 0) {
  console.log('\n  All save-survival checks passed.\n');
  process.exit(0);
} else {
  console.error(`\n  ${failed} save-survival check(s) FAILED.\n`);
  process.exit(1);
}
