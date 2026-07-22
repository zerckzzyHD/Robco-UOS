// ── api-router.js — NATIVE / OFFLINE COMMAND ROUTING (split from api.js, 2.8.5 U-A3) ──
// NATIVE_COMMAND_ROUTER + _routeNativeCommand (deterministic [TOKEN] commands
// intercepted before any AI call), panel-nav aliases, quick-log routing
// (kill/caps/location/faction/stat-edit one-liners), transmitTerminal (the
// TERMINAL-mode entry point — never calls the AI), submitCommandInput's
// mode resolver, command-line autocomplete suggestions, and the
// CROSSROADS/SLEEP/WAIT native offline terminals. Global scope, static
// <script> tag — api*.js family, loads late in the boot chain, immediately
// before cloud.js (the last static <script> tag — see index.html load
// order).
// EXPOSES: transmitTerminal() / window.transmitTerminal,
// submitCommandInput() / window.submitCommandInput, _routeNativeCommand(),
// _resolveCommandInput() / window._resolveCommandInput,
// _commandSuggestions() / window._commandSuggestions,
// NATIVE_COMMAND_ROUTER, QUICK_LOG_PATTERNS / window.QUICK_LOG_PATTERNS.
// GOTCHA: this file NEVER calls the AI — no fetch, no Director Link. That is
// its entire reason to exist as a separate module from api.js/transmitMessage
// (the AI-calling path). A newcomer adding a new [TOKEN] or quick-log verb
// here could easily reach for a network call out of habit; don't — anything
// that needs the AI belongs in transmitMessage() (api.js) instead.

// ── Native Command Router (Phase 5a) ─────────────────────────────
// Deterministic commands intercepted BEFORE the Gemini fetch.
// Unknown or creative input falls through to the AI unchanged.
const NATIVE_COMMAND_ROUTER = {
  '[FEATURES]': () => showHelpModal(),
  '[LOGS]': () => showErrorLog(),
  // Owner cleanup batch: [CROSSROADS] retired as a native command — the Crossroads
  // record is now a standing UI panel (CROSSROADS RECORD), so the point-in-time modal
  // analysis this command produced is redundant. _nativeCrossroads() itself is left
  // in place (Suite 89.2/89.3 exercise its body directly) but is no longer reachable
  // from the command line — see the Suite 113 RETIRED-macro list.
  '[SLEEP]': () => _nativeSleep(),
  // WU-N3: THREAT is a fully-deterministic native bestiary/TTK terminal — the AI
  // never computes time-to-kill. The argument is the target enemy name.
  '[THREAT]': target => renderThreat(target),
  '[TH]': target => renderThreat(target),
  // WU-N4: CONSULT is a fully-deterministic native databank lookup (registry +
  // databaseCSVs). The argument is the topic. Supports `> CONSULT x`, `> [CONSULT] x`,
  // and the short `> [CON] x`. No AI in the default path.
  CONSULT: topic => renderConsult(topic),
  '[CONSULT]': topic => renderConsult(topic),
  '[CON]': topic => renderConsult(topic),
  // WU-N5: BIO-SCAN is a fully-deterministic native medical advisory (limb states +
  // HP% + radiation + addiction risk, computed offline from state + CHEMS). No AI.
  '[BIO-SCAN]': () => renderBioScan(),
  '[BIO]': () => renderBioScan(),
  // WU-N6: LOOT is a native deterministic add/value terminal — pick an item from the
  // DB catalog and additively add it to inventory at its DB value (confirm-gated). The
  // AI never computes loot values or draws a loot UI. The optional arg pre-fills search.
  '[LOOT]': arg => renderLoot(arg),
  '[LT]': arg => renderLoot(arg),
  // WU-N1: V.A.T.S. is a fully-deterministic native calculator (equipped weapon skill/AP
  // from WEAPONS.CSV + SPECIAL + GAME_DEFS[ctx].vats coefficients + melee/unarmed AP-strike
  // optimizer, computed offline). The AI never computes hit-% or an outcome. The [VATS] macro
  // button (→ macroCommand('[VATS SIM]')) and the [VATS SIM]/[VS] tokens route to the native
  // overlay here instead of falling through to the AI (VATS-still-AI retirement). Any typed
  // target arg is ignored — V.A.T.S. operates on the equipped weapon + body regions.
  '[VATS SIM]': () => showVATSOverlay(),
  '[VS]': () => showVATSOverlay(),
  '[VATS]': () => showVATSOverlay(),
  // AI→native survey Part C.1: [GPS]/[MAP] used to round-trip to the Director
  // for an AI-drawn ASCII compass grid; now opens the existing native
  // CARTOGRAPHY TABLE directly (_nativeOpenMap(), ui-core.js). No AI.
  '[GPS]': () => _nativeOpenMap(),
  '[MAP]': () => _nativeOpenMap(),
  // AI→native survey Part C.1: a fully-deterministic offline lookup of the
  // perks the Courier is eligible for at their current level (registry data,
  // never AI-computed). Never grants a perk — read-only, like CONSULT.
  '[PERKS]': () => renderEligiblePerks(),
  '[PK]': () => renderEligiblePerks(),
};

// WU-HF2: precise-pointer probe (mouse/trackpad, not touch). Used to decide whether to
// re-focus the Comm-Link after a native command — a touch device must not be re-focused
// or the soft keyboard re-pops over the result. Fail-safe: if matchMedia is unavailable,
// assume a precise pointer so desktop behavior is never lost (only touch needs the gate).
function _isPrecisePointer() {
  try {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return true;
    return window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  } catch (_) {
    return true;
  }
}

// ── WU-HF3: native panel navigation ──────────────────────────────
// Typing a panel's name or a common alias in the Comm-Link opens that panel NATIVELY
// (zero AI) via expandPanelForCategory, before any Director-Link (Gemini) call. The
// values are expandPanelForCategory category keys. Matching is EXACT on the whole
// trimmed input, so "consult deathclaw" still falls through to the native CONSULT
// databank lookup while a bare "consult" / "databank" / "lookup" opens the DATABANK
// panel on the DATA tab (owner directive). Game-agnostic (Protocol 38): aliases name UI
// panels, never game data — a new game needs no change here. Guarded by Suite 123.
const PANEL_NAV_ALIASES = {
  inv: 'inventory',
  inventory: 'inventory',
  items: 'inventory',
  item: 'inventory',
  backpack: 'inventory',
  pack: 'inventory',
  stats: 'special',
  stat: 'special',
  special: 'special',
  character: 'special',
  char: 'special',
  biometrics: 'special',
  skills: 'skills',
  skill: 'skills',
  perks: 'perks',
  perk: 'perks',
  quests: 'quests',
  quest: 'quests',
  journal: 'quests',
  faction: 'factions',
  factions: 'factions',
  rep: 'factions',
  reputation: 'factions',
  standing: 'factions',
  map: 'map',
  world: 'map',
  locations: 'map',
  location: 'map',
  craft: 'craft',
  crafting: 'craft',
  workbench: 'craft',
  trade: 'trade',
  barter: 'trade',
  shop: 'trade',
  vendor: 'trade',
  store: 'trade',
  status: 'status',
  effects: 'status',
  effect: 'status',
  bio: 'bio',
  health: 'bio',
  limbs: 'bio',
  limb: 'bio',
  hp: 'bio',
  log: 'log',
  overseer: 'log',
  uptime: 'log',
  config: 'config',
  settings: 'config',
  setup: 'config',
  databank: 'databank',
  lookup: 'databank',
  consult: 'databank',
  codex: 'databank',
  encyclopedia: 'databank',
};

// Resolve a whole-input panel alias and open it natively. Returns true if it handled the
// input (so the router stops before the AI). Exact whole-input match only — a trailing
// argument (e.g. "consult deathclaw") is intentionally NOT matched so the command router
// can still run the native lookup. Closes any open modal first so the panel owns focus.
function _routePanelNav(raw) {
  if (typeof expandPanelForCategory !== 'function') return false;
  const key = String(raw || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ');
  const cat = PANEL_NAV_ALIASES[key];
  if (!cat) return false;
  if (typeof closeModal === 'function') closeModal();
  expandPanelForCategory(cat);
  return true;
}

function _routeNativeCommand(userText) {
  const raw = userText.trim().replace(/^>\s*/, '');
  const upper = raw.toUpperCase();
  // WU-HF3: native panel navigation runs FIRST — a whole-input panel alias opens the
  // panel offline. Exact-match only, so "consult deathclaw" still reaches the CONSULT
  // databank lookup below while a bare "consult" opens the DATABANK panel (owner directive).
  if (_routePanelNav(raw)) return true;
  for (const [cmd, handler] of Object.entries(NATIVE_COMMAND_ROUTER)) {
    if (upper === cmd || upper.startsWith(cmd + ' ') || upper.startsWith(cmd + '\t')) {
      // Pass the original-case argument (text after the command token) to the
      // handler; arg-less native commands simply ignore the extra parameter.
      handler(raw.slice(cmd.length).trim());
      return true;
    }
  }
  // Quick-Draw Holster — [BIND: gear, DIR] / [PAD: DIR] are native, deterministic
  // intercepts (mirroring [WAIT:] below): the only writer/reader of state.padBindings
  // is _nativePadBind/_nativePadFire (ui-core.js). Neither ever reaches Gemini.
  // BIND is checked first so a typed bind command can't be mistaken for a fire.
  const bindMatch = userText.match(/\[BIND:\s*(.+?)\s*,\s*(UP|DOWN|LEFT|RIGHT)\s*\]/i);
  if (bindMatch) {
    _nativePadBind(bindMatch[1], bindMatch[2]);
    return true;
  }
  const padMatch = userText.match(/\[PAD:\s*(UP|DOWN|LEFT|RIGHT)\s*\]/i);
  if (padMatch) {
    _nativePadFire(padMatch[1]);
    return true;
  }
  const waitMatch = userText.match(/\[WAIT[:\s]+(\d+)\s*(?:HRS?|HOURS?)?\]/i);
  if (waitMatch) {
    _nativeWait(parseInt(waitMatch[1], 10));
    return true;
  }
  return false;
}

// ── COMMAND-LINE MODE — quick-log routing (Step 2 · Phase 2 · B1) ───────────
// Natural one-liners typed in TERMINAL mode that route straight to an existing
// native tracker/logger — no menus, no AI. Each handler REUSES the established
// setter (adjustFaction / markLocationVisited / _logEvent / the #c_caps mirror
// idiom) — none of it is forked (Protocol 22). Game-agnostic (Protocol 38): the
// faction pattern validates the key against getFactionRegistry(), never a
// hardcoded faction list, so a new game needs no change here. A handler returns
// false (rather than true) when the SHAPE matched but the content didn't resolve
// to anything real (e.g. an unknown faction key) — that falls through to the
// TERMINAL "unrecognized" hint instead of silently doing nothing.
function _quickLogKill(count, target) {
  const label = String(target || '')
    .replace(/\s+/g, ' ')
    .trim();
  if (!label) return false;
  const text = count > 1 ? `Killed ${count} ${label}` : `Killed ${label}`;
  _logEvent('kill', text);
  saveState();
  appendToChat(`> [TERM] Logged: ${text}`, 'sys');
  return true;
}

function _quickLogCaps(delta) {
  if (!delta) return false;
  const cur = state.caps || 0;
  state.caps = Math.max(0, cur + delta);
  // Mirror to #c_caps — the sync source-of-truth saveState() reads back via
  // syncStateFromDom(); without this the change is reverted on the next save
  // (the same WU-N2 fix doBuy/doSell rely on).
  const capsEl = document.getElementById('c_caps');
  if (capsEl) capsEl.value = state.caps;
  _logEvent('caps', `Caps ${delta >= 0 ? '+' : ''}${delta} → ${state.caps}`);
  if (typeof updateMath === 'function') updateMath();
  saveState();
  appendToChat(`> [TERM] Caps ${delta >= 0 ? '+' : ''}${delta}. Caps: ${state.caps}.`, 'sys');
  return true;
}

function _quickLogLocation(name) {
  const loc = String(name || '')
    .replace(/\s+/g, ' ')
    .trim();
  if (!loc) return false;
  // Owner-reported live-update fix: "arrived <location>" means the Courier is now THERE —
  // it must set loc as the CURRENT location (moving [CURRENT] on the WORLD MAP), not just
  // flag it as discovered. onLocationChange(loc) is the shared setter (ui-core.js) that
  // also the #stat_loc onchange path uses — records prev+new via recordLocationVisit(),
  // saveState(), renderWorldMap() (Protocol 22, no forked logic).
  if (typeof onLocationChange === 'function') onLocationChange(loc);
  appendToChat(`> [TERM] Location recorded: ${loc}`, 'sys');
  return true;
}

function _quickLogFaction(key, dir) {
  const reg = typeof getFactionRegistry === 'function' ? getFactionRegistry() : [];
  const match = reg.find(f => f.key.toLowerCase() === String(key || '').toLowerCase());
  if (!match) return false; // unknown faction key — fall through to the unrecognized hint
  const field = dir === 'up' ? 'fame' : 'infamy';
  adjustFaction(match.key, field, 5); // ±5 — matches the F+/F-/I+/I- card buttons (Suite 88)
  appendToChat(`> [TERM] ${match.name} ${field} +5 (rep ${dir}).`, 'sys');
  return true;
}

// ── TERMINAL STAT EDITS (deterministic, no AI) ──────────────────────────────
// Universal Fallout mechanics — the scalar stats and the 7 SPECIAL attributes —
// are static alias maps here, NOT game-specific data (Protocol 38 targets
// per-game literals like faction keys/file paths, not universal mechanics).
// Only skill resolution below is registry-driven via getSkillKeys(), since the
// skill SET differs by game (FNV "guns" vs FO3 "small_guns"/"big_guns").
const _SCALAR_STAT_ALIASES = {
  hp: 'hp',
  rads: 'rads',
  rad: 'rads',
  xp: 'xp',
  level: 'level',
  lvl: 'level',
  karma: 'karma',
  caps: 'caps',
};
const _SPECIAL_STAT_ALIASES = {
  str: 's',
  strength: 's',
  per: 'p',
  perception: 'p',
  end: 'e',
  endurance: 'e',
  cha: 'c',
  chr: 'c',
  charisma: 'c',
  int: 'i',
  intelligence: 'i',
  agi: 'a',
  agl: 'a',
  agility: 'a',
  lck: 'l',
  luck: 'l',
};

// Resolves a normalized TERMINAL token to which native setter (ui-core.js A.2)
// owns it. Returns null when the token isn't a recognized stat/SPECIAL/skill —
// callers then return false so the line falls through to the UNRECOGNIZED hint
// (the established "shape matched, content didn't" convention — _quickLogFaction
// above is the precedent).
function _resolveStatToken(token) {
  const norm = String(token || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '_');
  if (!norm) return null;
  if (_SCALAR_STAT_ALIASES[norm]) return { kind: 'scalar', key: _SCALAR_STAT_ALIASES[norm] };
  if (_SPECIAL_STAT_ALIASES[norm]) return { kind: 'special', key: _SPECIAL_STAT_ALIASES[norm] };
  const skillKeys = typeof getSkillKeys === 'function' ? getSkillKeys() : [];
  const labelNorm = k =>
    typeof SKILL_LABELS !== 'undefined' && SKILL_LABELS[k]
      ? SKILL_LABELS[k].toLowerCase().replace(/\s+/g, '_')
      : '';
  const skillMatch = skillKeys.find(k => k === norm || labelNorm(k) === norm);
  if (skillMatch) return { kind: 'skill', key: skillMatch };
  return null;
}

// Reads the CURRENT value for a resolved token straight from state — the
// authoritative source a delta is applied on top of.
function _readStatCurrent(resolved) {
  if (resolved.kind === 'scalar') {
    if (resolved.key === 'hp') return state.hpCur || 0;
    if (resolved.key === 'rads') return state.rads || 0;
    if (resolved.key === 'xp') return state.xp || 0;
    if (resolved.key === 'level') return state.lvl || 1;
    if (resolved.key === 'karma') return state.karma || 0;
    if (resolved.key === 'caps') return state.caps || 0;
    return 0;
  }
  if (resolved.kind === 'special') return state[resolved.key] || 5;
  if (resolved.kind === 'skill') return (state.skills && state.skills[resolved.key]) || 0;
  return 0;
}

// Applies a resolved token to its owning native setter (Protocol 22 — one
// choke point per stat, shared with Native USE and the SPECIAL DOM onchange
// path). Returns the actual clamped value the setter applied.
function _applyStatToken(resolved, value) {
  if (resolved.kind === 'scalar') {
    if (resolved.key === 'hp') return _nativeSetHp(value);
    if (resolved.key === 'rads') return _nativeSetRads(value);
    if (resolved.key === 'xp') return _nativeSetXp(value);
    if (resolved.key === 'level') return _nativeSetLevel(value);
    if (resolved.key === 'karma') return _nativeSetKarma(value);
    if (resolved.key === 'caps') return _nativeSetCaps(value);
    return value;
  }
  if (resolved.kind === 'special') return _nativeSetSpecial(resolved.key, value);
  if (resolved.kind === 'skill') return _nativeSetSkill(resolved.key, value);
  return value;
}

function _statTokenLabel(resolved) {
  if (resolved.kind === 'skill') {
    return (typeof SKILL_LABELS !== 'undefined' && SKILL_LABELS[resolved.key]) || resolved.key;
  }
  return resolved.key.toUpperCase();
}

function _quickLogStatSet(token, valueStr) {
  const resolved = _resolveStatToken(token);
  if (!resolved) return false;
  const v = parseInt(valueStr, 10);
  if (isNaN(v)) return false;
  const applied = _applyStatToken(resolved, v);
  appendToChat(`> [TERM] ${_statTokenLabel(resolved)} set to ${applied}.`, 'sys');
  return true;
}

function _quickLogStatDelta(token, deltaStr) {
  const resolved = _resolveStatToken(token);
  if (!resolved) return false;
  const delta = parseInt(deltaStr, 10);
  if (isNaN(delta)) return false;
  const cur = _readStatCurrent(resolved);
  const applied = _applyStatToken(resolved, cur + delta);
  appendToChat(
    `> [TERM] ${_statTokenLabel(resolved)} ${delta >= 0 ? '+' : ''}${delta} → ${applied}.`,
    'sys'
  );
  return true;
}

const QUICK_LOG_PATTERNS = [
  {
    id: 'kill',
    re: /^killed?\s+(?:(\d+)\s+)?(.+)$/i,
    stub: 'killed ',
    hint: 'killed <target>',
    tag: 'Quick-log: record a kill',
    handler: m => _quickLogKill(m[1] ? parseInt(m[1], 10) : 1, m[2]),
  },
  {
    id: 'caps',
    re: /^([+-])\s*(\d+)\s*caps?$/i,
    stub: '+50 caps',
    hint: '+/-N caps',
    tag: 'Quick-log: gain/spend caps',
    handler: m => _quickLogCaps(m[1] === '-' ? -parseInt(m[2], 10) : parseInt(m[2], 10)),
  },
  {
    id: 'location',
    re: /^(?:arrived(?:\s+at)?|at)\s+(.+)$/i,
    stub: 'arrived ',
    hint: 'arrived <location>',
    tag: 'Quick-log: record a location',
    handler: m => _quickLogLocation(m[1]),
  },
  {
    id: 'faction',
    re: /^rep\s+(\S+)\s+(up|down)$/i,
    stub: 'rep ',
    hint: 'rep <faction> up/down',
    tag: 'Quick-log: adjust faction reputation',
    handler: m => _quickLogFaction(m[1], m[2].toLowerCase()),
  },
  // ── Stat edits (Part B) — placed after the four patterns above (zero
  // regression: "+50 caps" still hits the specific caps pattern first) and
  // before the generic set/delta patterns (a bare numeric arg never gets
  // mistaken for a stat name — the level-up PHRASE has no numeric arg at all).
  {
    id: 'levelup',
    re: /^level(?:ed)?\s*up$/i,
    stub: 'level up',
    hint: 'level up',
    tag: 'Stat edit: gain one level (deterministic)',
    handler: () => (typeof nativeLevelUp === 'function' ? (nativeLevelUp(), true) : false),
  },
  {
    id: 'stat_set',
    re: /^([a-z][a-z _]*?)\s+(\d+)$/i,
    stub: 'hp 80',
    hint: '<stat> <N>',
    tag: 'Stat edit: set a stat, SPECIAL, or skill to an exact value',
    handler: m => _quickLogStatSet(m[1], m[2]),
  },
  {
    id: 'stat_delta_lead',
    re: /^([+-]\d+)\s+([a-z][a-z _]*?)$/i,
    stub: '+2 str',
    hint: '+/-N <stat>',
    tag: 'Stat edit: nudge a stat, SPECIAL, or skill up/down',
    handler: m => _quickLogStatDelta(m[2], m[1]),
  },
  {
    id: 'stat_delta_trail',
    re: /^([a-z][a-z _]*?)\s+([+-]\d+)$/i,
    stub: 'str +2',
    hint: '<stat> +/-N',
    tag: 'Stat edit: nudge a stat, SPECIAL, or skill up/down',
    handler: m => _quickLogStatDelta(m[1], m[2]),
  },
];
window.QUICK_LOG_PATTERNS = QUICK_LOG_PATTERNS;

// Strip the same optional "> " prompt convention the native router tolerates
// (kept as its own helper rather than touching _routeNativeCommand's existing
// line, so that function's tested behavior stays byte-identical).
function _stripPrompt(text) {
  return String(text || '')
    .trim()
    .replace(/^>\s*/, '');
}

function _routeQuickLog(userText) {
  const raw = _stripPrompt(userText);
  for (const p of QUICK_LOG_PATTERNS) {
    const m = raw.match(p.re);
    if (m) return p.handler(m) !== false;
  }
  return false;
}

// Comma-separated multi-action quick-log routing (Step 2 Phase 2 B1 upgrade):
// splits on commas and routes EACH segment through _routeQuickLog()
// independently, so one line — "killed 3 raiders, +50 caps, arrived Novac,
// rep ncr up" — applies ALL of them, not just the first. A message with no
// comma is just one segment, so single-action input behaves exactly as
// before. Returns { anyMatched, anyUnmatched } so the caller can show ONE
// collated hint instead of spamming one per unrecognized segment.
function _routeQuickLogMulti(userText) {
  const segments = userText
    .split(',')
    .map(s => s.trim())
    .filter(Boolean);
  let anyMatched = false;
  let anyUnmatched = false;
  segments.forEach(seg => {
    if (_routeQuickLog(seg)) anyMatched = true;
    else anyUnmatched = true;
  });
  return { anyMatched, anyUnmatched };
}

// ── TERMINAL MODE ENTRY POINTS ───────────────────────────────────────────────
// The ONE choke point for a message submitted while TERMINAL mode is in effect
// (persisted mode, or a one-off `/`/`@` override targeting it). Runs every
// existing native command first, on the WHOLE, unsplit line (so `[TOKEN]`
// commands keep working exactly as today — a token's own arguments are never
// comma-split), then comma-separated quick-log patterns, then — if nothing
// matched at all — shows a gentle hint instead of silently doing nothing.
// NEVER calls the AI (no fetch, no Director Link) — TERMINAL mode is offline
// by design.
async function transmitTerminal(overrideText) {
  const inputEl = document.getElementById('chatInput');
  const userText = (typeof overrideText === 'string' ? overrideText : inputEl.value).trim();
  if (!userText) return;

  if (userText.length > 4000) {
    appendToChat(
      '> [SYS] INPUT TOO LONG — maximum 4,000 characters per message. Please shorten and try again.',
      'sys'
    );
    return;
  }

  appendToChat(`> ${userText}`, 'user');
  inputEl.value = '';
  if (typeof _autoGrowComposer === 'function') _autoGrowComposer();

  if (_routeNativeCommand(userText)) {
    if (_isPrecisePointer()) document.getElementById('chatInput').focus();
    return;
  }
  const { anyMatched, anyUnmatched } = _routeQuickLogMulti(userText);
  if (anyMatched) {
    if (_isPrecisePointer()) document.getElementById('chatInput').focus();
    if (anyUnmatched) {
      appendToChat(
        "> [TERM] Part of that line wasn't recognized — see [FEATURES] for the full command list.",
        'sys'
      );
    }
    return;
  }
  appendToChat(
    '> [TERM] UNRECOGNIZED — did you mean a native command (see [FEATURES]), a quick-log entry like "killed <target>", "+50 caps", "arrived <location>", "rep <faction> up/down", or a stat edit like "hp 80", "+2 str", "rads 50", "level up", "guns 45"?',
    'sys'
  );
}
window.transmitTerminal = transmitTerminal;

// Resolve which mode THIS message submits through: the persisted device pref,
// or a one-off override. Precedence (owner-locked spec):
//   1. A leading `/` (first character only, untrimmed) sends the WHOLE rest
//      of the message to TERMINAL/native — unchanged from before. A `@`
//      appearing anywhere after a leading `/` is literal terminal text (the
//      `/` branch returns before the `@` scan below ever runs).
//   2. Otherwise, a `@` ANYWHERE in the message is an inline "ping the AI":
//      everything AFTER the FIRST `@` is sent to OVERSEER/AI; everything
//      BEFORE it is dropped (not sent). This supersedes the earlier
//      first-character-only `@` — it now works mid-line, not just as a prefix.
//   3. Otherwise, the persisted pill mode is used as-is.
// Both `/` and `@` tolerate one optional space right after the symbol
// ("/msg"/"/ msg", "@msg"/"@ msg"). Never mutates the persisted mode.
function _resolveCommandInput(raw) {
  const persisted = typeof getInputMode === 'function' ? getInputMode() : 'overseer';
  if (raw.charAt(0) === '/') {
    let rest = raw.slice(1);
    if (rest.charAt(0) === ' ') rest = rest.slice(1);
    return { mode: 'terminal', text: rest, override: true };
  }
  const atIdx = raw.indexOf('@');
  if (atIdx !== -1) {
    let text = raw.slice(atIdx + 1);
    if (text.charAt(0) === ' ') text = text.slice(1);
    return { mode: 'overseer', text, override: true };
  }
  return { mode: persisted, text: raw, override: false };
}
window._resolveCommandInput = _resolveCommandInput;

// The ONE entry point index.html calls (the [ > TRANSMIT PROTOCOL ] button and
// the textarea's Ctrl+Enter handler) — replaces the former direct
// transmitMessage() call. A visual upload has no TERMINAL/native equivalent
// (image analysis needs the AI), so an attached image always goes through
// OVERSEER regardless of the resolved mode — identical to today's behavior.
function submitCommandInput() {
  const inputEl = document.getElementById('chatInput');
  if (!inputEl) return;
  const raw = inputEl.value;
  if (!raw.trim() && !attachedImageData) return;
  if (typeof _hideModeHint === 'function') _hideModeHint();
  if (attachedImageData) {
    transmitMessage();
    return;
  }
  const resolved = _resolveCommandInput(raw);
  if (resolved.mode === 'terminal') {
    transmitTerminal(resolved.text);
  } else {
    transmitMessage(resolved.text);
  }
}
window.submitCommandInput = submitCommandInput;

// ── COMMAND-LINE AUTOCOMPLETE ────────────────────────────────────────────────
// Autocomplete source for #chatInput in TERMINAL mode (extends the shared
// registry-autocomplete singleton in ui-saves.js, Protocol 22 — see wireInput()
// there). Suppressed entirely when the message would resolve to OVERSEER, so
// free-text AI narration is never cluttered with command suggestions. Surfaces
// matching NATIVE_COMMAND_ROUTER tokens plus the quick-log verb stubs above.
// Content-aware quick-log autocomplete (Step 2 Phase 2 B1 upgrade): once the
// (post-prefix) input matches a known quick-log verb's lead-in, suggest
// registry/DB CONTENT for the next token instead of re-suggesting verbs —
// "killed de" -> creature names starting with "de"; "arrived "/"at " ->
// location names; "rep " -> faction keys, then "rep <key> " -> up/down.
// Game-agnostic (Protocol 38): every name list comes from the ACTIVE game's
// registries/DB (getBestiaryNames/FALLOUT_REGISTRY.locations/
// getFactionRegistry), never a hardcoded name. `lead` is whatever of `text`
// precedes the partial content token, so the caller can splice a full
// replacement value; returns null when no verb lead-in matches (the caller
// then falls back to the plain verb/token suggestions).
function _quickLogContentSuggestions(text) {
  let m = text.match(/^rep\s+(\S+)\s+(\S*)$/i);
  if (m) {
    const reg = typeof getFactionRegistry === 'function' ? getFactionRegistry() : [];
    const match = reg.find(f => f.key.toLowerCase() === m[1].toLowerCase());
    if (match) {
      const partial = m[2].toLowerCase();
      const lead = text.slice(0, text.length - m[2].length);
      return ['up', 'down']
        .filter(d => d.startsWith(partial))
        .map(d => ({ name: lead + d, type: 'Quick-log: adjust faction reputation' }));
    }
  }
  m = text.match(/^rep\s+(\S*)$/i);
  if (m) {
    const partial = m[1].toLowerCase();
    const reg = typeof getFactionRegistry === 'function' ? getFactionRegistry() : [];
    const lead = text.slice(0, text.length - m[1].length);
    return reg
      .filter(f => f.key.toLowerCase().startsWith(partial))
      .slice(0, 8)
      .map(f => ({ name: lead + f.key + ' ', type: f.name }));
  }
  m = text.match(/^(?:arrived(?:\s+at)?|at)\s+(.*)$/i);
  if (m) {
    const partial = m[1].toLowerCase();
    const names =
      typeof FALLOUT_REGISTRY !== 'undefined' && Array.isArray(FALLOUT_REGISTRY.locations)
        ? FALLOUT_REGISTRY.locations.map(l => l.name)
        : [];
    const lead = text.slice(0, text.length - m[1].length);
    return names
      .filter(n => n.toLowerCase().startsWith(partial))
      .slice(0, 8)
      .map(n => ({ name: lead + n, type: 'location' }));
  }
  m = text.match(/^killed?\s+(?:\d+\s+)?(.*)$/i);
  if (m) {
    const partial = m[1].toLowerCase();
    const names = typeof getBestiaryNames === 'function' ? getBestiaryNames() : [];
    const lead = text.slice(0, text.length - m[1].length);
    return names
      .filter(n => n.toLowerCase().startsWith(partial))
      .slice(0, 8)
      .map(n => ({ name: lead + n, type: 'creature' }));
  }
  return _statTokenSuggestions(text);
}

// Stat-edit token completion (Part B, owner spec #3): a bare partial word (no
// verb lead-in matched above) that prefix-matches a scalar-stat alias, a
// SPECIAL alias, or a getSkillKeys() skill suggests "<token> " so the Courier
// can then type the value/delta. Game-agnostic — skill names are read from
// getSkillKeys()/SKILL_LABELS, never a hardcoded list (Protocol 38).
function _statTokenSuggestions(text) {
  const m = text.match(/^([a-z][a-z _]*)$/i);
  if (!m) return null;
  const partial = m[1].toLowerCase();
  if (!partial) return null;
  const candidates = new Set();
  Object.keys(_SCALAR_STAT_ALIASES).forEach(k => candidates.add(k));
  Object.keys(_SPECIAL_STAT_ALIASES).forEach(k => candidates.add(k));
  const skillKeys = typeof getSkillKeys === 'function' ? getSkillKeys() : [];
  skillKeys.forEach(k => {
    candidates.add(k);
    candidates.add(k.replace(/_/g, ' '));
  });
  const lead = text.slice(0, text.length - m[1].length);
  const matches = Array.from(candidates)
    .filter(c => c.startsWith(partial))
    .slice(0, 8);
  if (!matches.length) return null;
  return matches.map(c => ({ name: lead + c + ' ', type: 'Stat edit: set/nudge this stat' }));
}

// Autocomplete source for #chatInput in TERMINAL mode (extends the shared
// registry-autocomplete singleton in ui-saves.js, Protocol 22 — see wireInput()
// there). Suppressed entirely when the message would resolve to OVERSEER, so
// free-text AI narration is never cluttered with command suggestions. Once a
// quick-log verb lead-in is recognized, surfaces registry/DB CONTENT for the
// next token (_quickLogContentSuggestions); otherwise surfaces matching
// NATIVE_COMMAND_ROUTER tokens plus the quick-log verb stubs. Every suggestion
// preserves whatever `/` override prefix was stripped by the resolver, so
// selecting one never silently drops the user's explicit one-off override.
function _commandSuggestions(rawQuery) {
  if (typeof _resolveCommandInput !== 'function') return [];
  const rawStr = String(rawQuery || '');
  const resolved = _resolveCommandInput(rawStr);
  if (resolved.mode !== 'terminal') return [];
  const prefix = rawStr.slice(0, rawStr.length - resolved.text.length);
  const text = resolved.text;
  const q = text.trim().toLowerCase();
  if (q.length < 2) return [];

  const contentSuggestions = _quickLogContentSuggestions(text);
  if (contentSuggestions) {
    return contentSuggestions.map(s => ({ name: prefix + s.name, type: s.type }));
  }

  const plain = s =>
    String(s)
      .replace(/[^a-z0-9 ]/gi, '')
      .toLowerCase();
  const out = [];
  Object.keys(NATIVE_COMMAND_ROUTER).forEach(cmd => {
    if (plain(cmd).indexOf(q) !== -1)
      out.push({ name: prefix + cmd + ' ', type: 'native command' });
  });
  QUICK_LOG_PATTERNS.forEach(p => {
    if (plain(p.hint).indexOf(q) !== -1 || p.tag.toLowerCase().indexOf(q) !== -1) {
      out.push({ name: prefix + p.stub, type: p.tag });
    }
  });
  return out.slice(0, 8);
}
window._commandSuggestions = _commandSuggestions;

// ── NATIVE OFFLINE TERMINALS (CROSSROADS / SLEEP / WAIT) ─────────────────────
function _nativeCrossroads() {
  const factions = (state && state.factions) || {};
  const quests = (state && state.quests) || [];
  const loc = (state && state.loc) || 'Unknown';
  const lines = [];

  lines.push(`Location: ${String(loc).slice(0, 44)}`);
  lines.push('');

  lines.push('--- FACTION LOCKOUT STATUS ---');
  const factionKeys = getFactionRegistry().map(f => f.key);
  factionKeys.forEach(key => {
    const f = factions[key] || { fame: 0, infamy: 0 };
    const net = (f.fame || 0) - (f.infamy || 0);
    const sign = net >= 0 ? '+' : '';
    lines.push(`${key.toUpperCase().slice(0, 13).padEnd(13)} net ${sign}${net}`);
  });

  lines.push('');
  lines.push('--- QUEST BRANCH CLOSURES ---');
  const closed = quests.filter(
    q => q.status === 'failed' || q.status === 'complete' || q.status === 'completed'
  );
  if (closed.length === 0) {
    lines.push('None on record.');
  } else {
    closed.forEach(q => {
      const tag = q.status === 'failed' ? '[FAILED]' : '[DONE]  ';
      lines.push(`${tag} ${String(q.name).slice(0, 44)}`);
    });
  }

  lines.push('');
  lines.push('--- UPCOMING DECISIONS ---');
  const active = quests.filter(q => q.status === 'active' || q.status === 'in progress');
  if (active.length === 0) {
    lines.push('No active quests on record.');
  } else {
    active.slice(0, 3).forEach(q => {
      lines.push(`> ${String(q.name).slice(0, 52)}`);
      if (q.objective) lines.push(`  ${String(q.objective).slice(0, 52)}`);
    });
  }

  lines.push('');
  lines.push('--- CROSSROADS LOG ---');
  // P4: read the structured Terminal Record (eventLog), not campaign_notes.
  const events = ((state && state.eventLog) || []).slice(-5);
  if (events.length === 0) {
    lines.push('No events recorded.');
  } else {
    events.forEach(e => lines.push(String((e && e.text) || '').slice(0, 55)));
  }

  const mTitle = document.getElementById('modalTitle');
  const mContent = document.getElementById('modalContent');
  const modal = document.getElementById('sysModal');
  if (!mTitle || !mContent || !modal) return;
  mTitle.innerText = '> CROSSROADS ANALYSIS';
  mContent.innerText = lines.join('\n');
  modal.style.display = 'flex';
  appendToChat('> [CROSSROADS] Analysis computed from current state.', 'sys');
}

// WHY 80 (below): 8 hours * 10 ticks/hour, matching the "[WAIT: X Hrs] = X * 10
// Ticks" formula the AI directive itself uses (api-directive.js Core Tracking
// section) — keeps native SLEEP's tick math consistent with what the AI assumes.
function _nativeSleep() {
  const oldTicks = (state && state.ticks) || 0;
  const newTicks = oldTicks + 80;
  if (state) {
    state.ticks = newTicks;
    state.hpCur = state.hpMax || state.hpCur || 0;
    state.la = 'OK';
    state.ra = 'OK';
    state.ll = 'OK';
    state.rl = 'OK';
    state.hd = 'OK';
  }
  appendToChat(
    `> [SLEEP] Courier rested 8 hours.\n> Ticks: ${oldTicks} → ${newTicks} (+80)\n> HP restored. All limbs healed.`,
    'sys'
  );
  RobcoEvents.emit('sleep.completed', { ticksAdded: newTicks - oldTicks }); // U8 auto-log
  // loadUI() pushes state→DOM (ticks, hpCur, limbs) before saveState() reads DOM back
  if (typeof loadUI === 'function') loadUI();
  if (typeof saveState === 'function') saveState();
}

function _nativeWait(hours) {
  const ticks = hours * 10;
  const oldTicks = (state && state.ticks) || 0;
  const newTicks = oldTicks + ticks;
  if (state) state.ticks = newTicks;
  appendToChat(
    `> [WAIT: ${hours} Hrs] Time advanced ${hours} hour${hours === 1 ? '' : 's'}.\n> Ticks: ${oldTicks} → ${newTicks} (+${ticks})`,
    'sys'
  );
  // loadUI() pushes state→DOM (ticks) before saveState() reads DOM back
  if (typeof loadUI === 'function') loadUI();
  if (typeof saveState === 'function') saveState();
}
