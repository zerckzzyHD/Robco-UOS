// ── APP VERSION ───────────────────────────────────────────────
const APP_VERSION = '2.0.1';
window.APP_VERSION = APP_VERSION;

// ── FACTION REGISTRY ─────────────────────────────────────────────
const FACTION_REGISTRY = [
  { key: 'ncr', name: 'NCR', tier: 'major' },
  { key: 'legion', name: "Caesar's Legion", tier: 'major' },
  { key: 'house', name: 'Mr. House', tier: 'major' },
  { key: 'bos', name: 'B.O.S.', tier: 'minor' },
  { key: 'boomers', name: 'Boomers', tier: 'minor' },
  { key: 'khans', name: 'Great Khans', tier: 'minor' },
  { key: 'followers', name: 'Followers of the Apocalypse', tier: 'minor' },
  { key: 'powder', name: 'Powder Gangers', tier: 'minor' },
  { key: 'kings', name: 'The Kings', tier: 'minor' },
  { key: 'strip', name: 'The Strip', tier: 'minor' },
  { key: 'freeside', name: 'Freeside', tier: 'minor' },
];

// FO3 faction registry — Capital Wasteland factions
const FACTION_REGISTRY_FO3 = [
  { key: 'enclave', name: 'Enclave', tier: 'major' },
  { key: 'bos', name: 'Brotherhood of Steel', tier: 'major' },
  { key: 'lyons', name: "Lyons' Brotherhood", tier: 'major' },
  { key: 'outcast', name: 'Outcasts', tier: 'major' },
  { key: 'talon', name: 'Talon Company', tier: 'minor' },
  { key: 'regulators', name: 'Regulators', tier: 'minor' },
  { key: 'slavers', name: 'Slavers (Paradise Falls)', tier: 'minor' },
  { key: 'reillys', name: "Reilly's Rangers", tier: 'minor' },
  { key: 'tunnelsnakes', name: 'Tunnel Snakes', tier: 'minor' },
  { key: 'supermutants', name: 'Super Mutants', tier: 'major' },
  { key: 'underworld', name: 'Underworld Ghouls', tier: 'minor' },
  { key: 'rivetcity', name: 'Rivet City', tier: 'minor' },
];

// ── SKILL KEYS (shared constant used by state, ui, and api) ─────
// FNV skills
const SKILL_KEYS = [
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

// FO3 skills — Big Guns and Small Guns instead of Guns and Survival
const SKILL_KEYS_FO3 = [
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

// ── GAME_DEFS — per-game configuration aggregation layer ─────────
// Aggregates faction lists, skill keys, calendar epochs, labels,
// and AI directive text into one entry per game. Adding a 3rd game
// requires only a new entry here + two data files (db_XX.js / reg_XX.js).
const GAME_DEFS = {
  FNV: {
    id: 'FNV',
    label: 'Fallout: New Vegas',
    factions: FACTION_REGISTRY,
    skillKeys: SKILL_KEYS,
    usesKarmaCenter: false,
    collectibleLabel: 'SNOW GLOBES',
    calendar: { startMonth: 9, startDay: 19, startYear: 2281, epochWeekday: 0 },
    ai: {
      skillSystemText:
        'state.skills tracks 13 skills (0-100 each): barter, energy_weapons, explosives, guns, lockpick, medicine, melee_weapons, repair, science, sneak, speech, survival, unarmed.',
      factionSystemText:
        'state.factions tracks reputation with 11 factions as { fame: 0, infamy: 0 } objects.\nMajor keys: ncr, legion, house. Minor keys: bos, boomers, khans, followers, powder, kings, strip, freeside.\nNote: Casino-family interactions (Chairmen, Omertas, White Glove Society) MUST affect "strip" reputation instead.\nFame and infamy are INDEPENDENT non-negative integers. Both axes use per-faction thresholds sourced from the GECK.\nThe 11 canonical standing titles are: Neutral, Sneering Punk, Accepted, Shunned, Liked, Hated, Vilified, Idolized, Soft-Hearted Devil, Mixed, Unpredictable, Dark Hero, Merciful Thug, Wild Child.',
      irreversibleTriggers: `**FNV Irreversible Triggers** — warn before:
- Allying with Caesar's Legion (permanent NCR/Brotherhood lockout)
- Siding with Mr. House or Yes Man (faction collapse endgame)
- Killing Boone's wife (companion lockout)
- Detonating Nipton bombs (NCR infamy spike — permanent reputation floor)
- Completing "Ring-a-Ding-Ding!" (Benny becomes inaccessible after)
- Any quest that permanently closes another quest branch (Lonesome Road choices, etc.)`,
    },
  },
  FO3: {
    id: 'FO3',
    label: 'Fallout 3',
    factions: FACTION_REGISTRY_FO3,
    skillKeys: SKILL_KEYS_FO3,
    usesKarmaCenter: true,
    collectibleLabel: 'BOBBLEHEADS',
    calendar: { startMonth: 7, startDay: 17, startYear: 2277, epochWeekday: 3 },
    ai: {
      skillSystemText:
        'state.skills tracks 13 skills (0-100 each): barter, big_guns, energy_weapons, explosives, lockpick, medicine, melee_weapons, repair, science, small_guns, sneak, speech, unarmed.',
      factionSystemText:
        'state.factions tracks reputation with 12 factions as { fame: 0, infamy: 0 } objects.\nMajor keys: enclave, bos, lyons, outcast, supermutants. Minor keys: talon, regulators, slavers, reillys, tunnelsnakes, underworld, rivetcity.\nFame and infamy are INDEPENDENT non-negative integers. Both axes use per-faction thresholds.',
      irreversibleTriggers: `**FO3 Irreversible Triggers** — warn before:
- Karma dropping below -750 (Enclave hit squads become persistent)
- Karma rising above +750 (Brotherhood Outcasts become hostile)
- Destroying Megaton (permanent loss of town and Moira's full quest line)
- Turning on the Purifier prematurely (activates endgame sequence)
- Killing neutral/friendly NPCs with karma impacts above 50`,
    },
  },
};
window.GAME_DEFS = GAME_DEFS;

// _activeDef() — TDZ-safe: returns the active game's config object.
// Falls back to FNV if state is not yet initialized (during let state init).
function _activeDef() {
  try {
    return GAME_DEFS[state.gameContext] || GAME_DEFS.FNV;
  } catch (_) {
    return GAME_DEFS.FNV;
  }
}

// ── CONTEXT-AWARE GETTERS ────────────────────────────────────────
// These return the correct registry for the current gameContext.
// Always use these instead of referencing FACTION_REGISTRY or SKILL_KEYS directly
// in code that may run for either FNV or FO3.
function getFactionRegistry() {
  return _activeDef().factions;
}

function getSkillKeys() {
  return _activeDef().skillKeys;
}

function _buildFactions() {
  const f = {};
  getFactionRegistry().forEach(r => {
    f[r.key] = { fame: 0, infamy: 0 };
  });
  return f;
}

let state = {
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
  caps: 0,
  loc: 'Goodsprings',
  rads: 0,
  karma: 0,
  ticks: 0,
  la: 'OK',
  ra: 'OK',
  ll: 'OK',
  rl: 'OK',
  hd: 'OK',
  factions: _buildFactions(),
  skills: {
    barter: 15,
    energy_weapons: 15,
    explosives: 15,
    guns: 15,
    lockpick: 15,
    medicine: 15,
    melee_weapons: 15,
    repair: 15,
    science: 15,
    sneak: 15,
    speech: 15,
    survival: 15,
    unarmed: 15,
  },
  status: [],
  inventory: [],
  squad: [],
  campaign_notes: [],
  perks: [],
  quests: [],
  equipped: { weapon: null, armor: null, headgear: null },
  ammo: {},
  stats: { kills: 0, capsEarned: 0, damageDealt: 0, sessionStart: Date.now() },
  locationHistory: [],
  // v2.0 fields
  gameContext: 'FNV', // 'FNV' | 'FO3' — set at boot, governs registry/AI context
  collectibles: [], // flat string[] of collected item names (game-context-aware)
  campaignMode: 'standard', // 'standard' | 'rng' (armed) | 'rng-locked' (permanently active after wipe)
  playthroughType: 'standard', // 'standard' | 'minmaxed' | 'completionist' | 'casual' | 'speedrun'
  mapView: 'auto', // 'auto' | 'full' | 'core' — persisted map size preference; 'auto' and 'core' → 4×4 grid
  // DLC expansion adds entries to the registry only; no state schema change required
};

// Snapshot pristine defaults for wipeTerminal(). Must be set immediately after state
// definition and before any migration or load overwrites the live state object.
window._defaultState = JSON.parse(JSON.stringify(state));

let chatHistory = [];

// ── STATE PERSISTENCE ───────────────────────────────────────────
// Decoupled into two steps:
//   syncStateFromDom() — immediate DOM → state sync (no I/O)
//   saveState()        — syncs then debounces the localStorage write
let _saveTimer = null;

function syncStateFromDom() {
  state.lvl = parseInt(document.getElementById('stat_lvl').value) || 1;
  state.xp = parseInt(document.getElementById('stat_xp').value) || 0;
  state.hpCur = parseInt(document.getElementById('stat_hp_cur').value) || 0;
  state.hpMax = parseInt(document.getElementById('stat_hp_max').value) || 100;
  ['s', 'p', 'e', 'c', 'i', 'a', 'l'].forEach(
    k => (state[k] = parseInt(document.getElementById('s_' + k).value) || 5)
  );
  state.caps = parseInt(document.getElementById('c_caps').value) || 0;
  state.loc = document.getElementById('stat_loc').value;
  state.rads = parseInt(document.getElementById('stat_rads').value) || 0;
  state.karma = parseInt(document.getElementById('stat_karma').value) || 0;
  // TIME: read calendar Date (M/D/Y) + H/M inputs → convert to ticks via calendarToTicks()
  // Backward-compat: if new inputs missing, fall back to hidden stat_ticks field
  let calMonthEl = document.getElementById('cal_month');
  let calDayEl = document.getElementById('cal_day');
  let calYearEl = document.getElementById('cal_year');
  let hrEl = document.getElementById('time_hour');
  let minEl = document.getElementById('time_min');
  if (calMonthEl && calDayEl && calYearEl && hrEl && minEl) {
    let mo = Math.min(12, Math.max(1, parseInt(calMonthEl.value) || 1));
    let dy = Math.min(31, Math.max(1, parseInt(calDayEl.value) || 1));
    let yr = Math.max(2200, parseInt(calYearEl.value) || 2281);
    let h = Math.min(23, Math.max(0, parseInt(hrEl.value) || 0));
    let m = Math.min(59, Math.max(0, parseInt(minEl.value) || 0));
    state.ticks = calendarToTicks(mo, dy, yr, h, m);
    // Keep hidden fields in sync (backward compat for any direct readers)
    let hiddenTicks = document.getElementById('stat_ticks');
    if (hiddenTicks) hiddenTicks.value = state.ticks;
    let hiddenDay = document.getElementById('time_day');
    if (hiddenDay) hiddenDay.value = Math.floor(state.ticks / 240) + 1;
  } else {
    // Fallback: if new inputs aren't in DOM yet, read hidden field
    let ticksEl = document.getElementById('stat_ticks');
    if (ticksEl) state.ticks = parseInt(ticksEl.value) || 0;
  }
  // Skills — use getSkillKeys() so FO3 skill keys also sync
  if (!state.skills) state.skills = {};
  getSkillKeys().forEach(sk => {
    let el = document.getElementById('sk_' + sk);
    if (el) state.skills[sk] = Math.min(100, Math.max(0, parseInt(el.value) || 0));
  });
}

let _lastSaveStr = null;
function saveState() {
  syncStateFromDom();
  // Debounce the disk write — at most once per 500ms
  // A beforeunload handler in ui.js flushes immediately on tab close
  clearTimeout(_saveTimer);
  _saveTimer = setTimeout(() => {
    try {
      if (!window.robco_v8) {
        window.robco_v8 = { activeContext: state.gameContext || 'FNV', campaigns: {} };
      }
      window.robco_v8.activeContext = state.gameContext || 'FNV';
      window.robco_v8.campaigns[window.robco_v8.activeContext] = JSON.parse(JSON.stringify(state));
      const _saveStr = JSON.stringify(window.robco_v8);
      if (_saveStr === _lastSaveStr) return;
      // Proactive warning at ~4MB (2M chars × 2 bytes UTF-16) of the ~5MB localStorage ceiling.
      // Fires once per session so the Courier can export before a real QuotaExceededError hits.
      if (_saveStr.length > 2097152 && !window._quotaWarnShown) {
        window._quotaWarnShown = true;
        if (typeof appendToChat === 'function') {
          appendToChat(
            '> ⚠ [SYS-WARNING] SAVE SIZE NEARING LIMIT (~4MB). Export a save file now to prevent data loss.',
            'sys',
            true
          );
        }
      }
      localStorage.setItem('robco_v8', _saveStr);
      _lastSaveStr = _saveStr;
    } catch (e) {
      // #18 localStorage Quota Detection — warn Courier on storage full
      if (e.name === 'QuotaExceededError' || e.name === 'NS_ERROR_DOM_QUOTA_REACHED') {
        if (typeof appendToChat === 'function') {
          appendToChat(
            '> ⚠ [SYS-ALERT] STORAGE QUOTA EXCEEDED. Export a save file to free space.',
            'sys',
            true
          );
        } else {
          alert('> STORAGE QUOTA EXCEEDED: Export save file to free space.');
        }
      }
    }
  }, 500);
}

function generateSyncPayload() {
  syncStateFromDom(); // Immediate sync — must be current before building API payload
  return JSON.parse(JSON.stringify(state));
}

function exportSaveFile(slotName = null) {
  syncStateFromDom();
  if (!window.robco_v8) {
    window.robco_v8 = { activeContext: state.gameContext || 'FNV', campaigns: {} };
  }
  window.robco_v8.activeContext = state.gameContext || 'FNV';
  window.robco_v8.campaigns[window.robco_v8.activeContext] = JSON.parse(JSON.stringify(state));

  const exportPayload = {
    version: APP_VERSION,
    robco_v8: window.robco_v8,
    chat: chatHistory,
    playstyle: localStorage.getItem('robco_playstyle') || 'any',
  };
  const dataStr =
    'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(exportPayload, null, 2));
  const dl = document.createElement('a');
  dl.setAttribute('href', dataStr);
  const suffix = slotName ? '_' + slotName.replace(/[^a-z0-9]/gi, '_') : '';
  dl.setAttribute(
    'download',
    'robco_save_' + new Date().toISOString().split('T')[0] + suffix + '.json'
  );
  dl.click();
}

// ── SAVE VERSION MIGRATION (#16) ─────────────────────────────────
// Chain of migrations applied whenever a save from an older version is loaded.
// Add a new entry for each version that changes state structure.
function migrateState(version, s) {
  // v1.x → v1.6.x: flat faction keys to structured factions object
  if (!s.factions) {
    s.factions = _buildFactions();
    if (s.nf !== undefined) {
      s.factions.ncr.fame = s.nf || 0;
      s.factions.ncr.infamy = s.ni || 0;
    }
    if (s.lf !== undefined) {
      s.factions.legion.fame = s.lf || 0;
      s.factions.legion.infamy = s.li || 0;
    }
    if (s.sf !== undefined) {
      s.factions.house.fame = s.sf || 0;
      s.factions.house.infamy = s.si || 0;
    }
    ['nf', 'ni', 'lf', 'li', 'sf', 'si', 'ncr', 'leg'].forEach(k => delete s[k]);
  }
  // v1.6.3 → v1.6.4+: add perks array
  if (!s.perks) s.perks = [];
  // v1.6.4+: add quest log, equipped, ammo, stats, macros
  if (!s.quests) s.quests = [];
  if (!s.equipped) s.equipped = { weapon: null, armor: null, headgear: null };
  if (!s.ammo) s.ammo = {};
  if (!s.stats) s.stats = { kills: 0, capsEarned: 0, damageDealt: 0, sessionStart: Date.now() };
  if (!s.locationHistory) s.locationHistory = []; // v1.6.8
  // v2.0: dual-game context and collectibles tracker
  if (!s.gameContext) s.gameContext = 'FNV';
  if (!GAME_DEFS[s.gameContext]) s.gameContext = 'FNV'; // defensive: unknown game → FNV
  if (!s.collectibles) s.collectibles = [];
  // C4-fix / C11: campaignMode has 3 states: 'standard' | 'rng' (armed) | 'rng-locked' (activated by wipe).
  if (s.campaignMode !== 'rng' && s.campaignMode !== 'rng-locked') s.campaignMode = 'standard';
  // C5: playthroughType — migrate from legacy localStorage key if not yet in state.
  // Transfer preserves the player's existing campaign intent on upgrade.
  if (!s.playthroughType) {
    const _validPT = ['standard', 'minmaxed', 'completionist', 'casual', 'speedrun'];
    const _lsPT =
      typeof localStorage !== 'undefined'
        ? localStorage.getItem('robco_playstyle_type') || 'standard'
        : 'standard';
    s.playthroughType = _validPT.includes(_lsPT) ? _lsPT : 'standard';
  }
  if (s.mapView !== 'full' && s.mapView !== 'core') s.mapView = 'auto';
  // C6: Faction Pruning & Archival Migration
  // Archive wgs, chairmen, omertas, vangraff, crimson to campaign notes
  if (s.factions) {
    const legacyKeys = ['wgs', 'chairmen', 'omertas', 'vangraff', 'crimson'];
    let removedData = [];
    legacyKeys.forEach(k => {
      if (s.factions[k] && (s.factions[k].fame > 0 || s.factions[k].infamy > 0)) {
        removedData.push(
          `${k.toUpperCase()} (Fame: ${s.factions[k].fame}, Infamy: ${s.factions[k].infamy})`
        );
      }
      delete s.factions[k];
    });
    if (removedData.length > 0) {
      if (!s.campaign_notes) s.campaign_notes = [];
      s.campaign_notes.push(`[LEGACY FACTION ARCHIVE] ${removedData.join(' | ')}`);
    }
    // Ensure new factions exist
    if (!s.factions.strip) s.factions.strip = { fame: 0, infamy: 0 };
    if (!s.factions.freeside) s.factions.freeside = { fame: 0, infamy: 0 };
  }

  delete s.macros; // v1.6.7: macros removed — D-Pad handles this natively
  return s;
}
