// ── APP VERSION ───────────────────────────────────────────────
const APP_VERSION = '2.7.0';
window.APP_VERSION = APP_VERSION;

// ── METASTORE — device-preference key/value store (Protocol 23 boundary) ────
// A single choke point for every localStorage key that describes THIS DEVICE's
// preferences (audio mutes, optics, power, haptics, UI layout, telemetry) —
// as distinct from campaign/save data (robco_v8, robco_v7, chat, playstyle,
// save slots, rolling backups, cloud-push bookkeeping), which is CAMPAIGN
// STATE and is never registered here or written through this accessor (the
// U6 boundary-gate suite guards the separation). Registering a key in
// META_MANIFEST is what makes it a "device preference" — the manifest is the
// boundary, not a convention. Behavior-preserving: same keys, same string
// values, same defaults as the direct localStorage calls it replaces — a
// call-site consolidation, not a storage-format change. This is the one choke
// point a future IndexedDB swap (or Hardware Life) needs to only touch once.
const META_MANIFEST = {
  robco_gemini_key: { type: 'string', default: '', owner: 'api.js' },
  robco_gemini_key_sync: { type: 'bool', default: false, owner: 'cloud.js' },
  robco_gemini_model: { type: 'string', default: '', owner: 'api.js' },
  // Owner report fix: the SLOT 05 AI Uplink status must reflect a REAL validated
  // handshake, not merely "a key string is present" (saveApiKeySilent() mirrors
  // robco_gemini_key on every keystroke, before any network round-trip). This holds
  // the exact key string that LAST passed a live fetchAuthorizedModels() 200 response —
  // if it no longer matches robco_gemini_key (the key was edited since), the uplink
  // status falls back to NO CARRIER with no separate invalidation wiring needed.
  robco_gemini_validated_key: { type: 'string', default: '', owner: 'api.js' },
  robco_sfx_muted: { type: 'bool', default: false, owner: 'ui-audio.js' },
  robco_hum_muted: { type: 'bool', default: false, owner: 'ui-audio.js' },
  robco_geiger_muted: { type: 'bool', default: false, owner: 'ui-audio.js' },
  robco_tinnitus_muted: { type: 'bool', default: false, owner: 'ui-audio.js' },
  robco_ambient_muted: { type: 'bool', default: false, owner: 'ui-audio.js' },
  robco_wake_muted: { type: 'bool', default: false, owner: 'ui-audio.js' },
  robco_panelclick_muted: { type: 'bool', default: false, owner: 'ui-audio.js' },
  robco_bootdrone_muted: { type: 'bool', default: false, owner: 'ui-audio.js' },
  robco_levelup_muted: { type: 'bool', default: false, owner: 'ui-audio.js' },
  robco_heartbeat_muted: { type: 'bool', default: false, owner: 'ui-audio.js' },
  robco_questcomplete_muted: { type: 'bool', default: false, owner: 'ui-audio.js' },
  robco_questfail_muted: { type: 'bool', default: false, owner: 'ui-audio.js' },
  robco_factionthreshold_muted: { type: 'bool', default: false, owner: 'ui-audio.js' },
  robco_hardwaresfx_muted: { type: 'bool', default: false, owner: 'ui-audio.js' },
  robco_reactorhum_muted: { type: 'bool', default: false, owner: 'ui-audio.js' }, // LIVING CORE #6
  robco_master_muted: { type: 'bool', default: false, owner: 'ui-audio.js' },
  robco_radio_on: { type: 'bool', default: false, owner: 'ui-audio.js' },
  robco_wakelock_enabled: { type: 'bool', default: false, owner: 'ui-core.js' },
  robco_haptic_enabled: { type: 'bool', default: false, owner: 'ui-audio.js' },
  robco_high_lumen: { type: 'bool', default: false, owner: 'ui-core.js' },
  robco_immersion: { type: 'string', default: 'full', owner: 'state.js' },
  robco_input_mode: { type: 'string', default: 'overseer', owner: 'state.js' },
  robco_overseer_log: { type: 'json', default: '{}', owner: 'ui-core.js' },
  robco_error_log: { type: 'json', default: '[]', owner: 'ui-core.js' },
  robco_panel_state: { type: 'json', default: '{}', owner: 'ui-core.js' },
  robco_active_tab: { type: 'string', default: 'stat', owner: 'ui-core.js' },
  robco_typer_speed: { type: 'float', default: '1', owner: 'ui-core.js' },
  robco_version: { type: 'string', default: '', owner: 'ui-core.js' },
  robco_optics: {
    type: 'string',
    default: null,
    owner: 'ui-audio.js',
    deprecated: 'legacy site-wide pick, migrated into robco_optic_<ctx> then retired',
  },
  robco_optic_: {
    type: 'string',
    default: null,
    owner: 'ui-audio.js',
    family: true, // dynamic per-game key: robco_optic_<ctx>, e.g. robco_optic_FNV
  },
  robco_booted_before: { type: 'bool', default: false, owner: 'ui-audio.js' },
  robco_feature_flags: { type: 'json', default: '{}', owner: 'cloud.js' },
  robco_sw_installed: { type: 'bool', default: false, owner: 'index.html' },
  robco_bay_opened: { type: 'bool', default: false, owner: 'ui-core.js' },
  robco_bay_view: { type: 'string', default: 'bay', owner: 'ui-core.js' },
  robco_bezel_subsystem: { type: 'string', default: 'operator', owner: 'ui-core.js' },
  robco_scroll_positions: { type: 'json', default: '{}', owner: 'ui-core.js' },
  // Phase 3 · Piece 2 — OPERATIONS CARGO MANIFEST: which pull-drawer was last
  // open (Protocol UI-6, "everything remembers on reload").
  robco_cargo_drawer: { type: 'string', default: 'weapon', owner: 'ui-render.js' },
  // Phase 3 OPERATOR batch 2 — BUS-08 REPUTATION CONSOLE: which faction
  // channel the shared meter/selector was last showing (Protocol UI-6).
  robco_faction_channel: { type: 'string', default: '', owner: 'ui-render.js' },
  // Phase 3 · Piece 3 — DATABANK BUS-17 DIRECTIVE REGISTRY: which status
  // drawer (all/active/complete/failed) was last open (Protocol UI-6).
  robco_databank_qdrawer: { type: 'string', default: 'all', owner: 'ui-render.js' },
};
// Fire-and-forget write-through of a device-pref op to IndexedDB's 'meta' store
// (Step 2 · Phase 1 · P1). The ONLY seam through which MetaStore touches IdbStore
// — campaign keys never route here (two-store boundary). Swallows a synchronous
// throw AND a rejected promise so a failing/absent shadow can never surface to a
// device-pref write (localStorage stays authoritative). No-ops when idb.js has
// not loaded. Always targets 'meta'; never 'campaign'.
function _idbShadow(op, key, val) {
  try {
    if (typeof window === 'undefined' || !window.IdbStore) return;
    const p =
      op === 'set' ? window.IdbStore.set('meta', key, val) : window.IdbStore.remove('meta', key);
    if (p && typeof p.catch === 'function') p.catch(() => {});
  } catch (_) {
    /* the durability shadow must never break a device-preference write */
  }
}

const MetaStore = {
  // True for a registered device-preference key — an exact manifest entry, or
  // (for the one dynamic family, the per-game optic key) a prefix match
  // against a manifest entry flagged `family: true`.
  has(key) {
    if (Object.prototype.hasOwnProperty.call(META_MANIFEST, key)) return true;
    return Object.keys(META_MANIFEST).some(k => META_MANIFEST[k].family && key.indexOf(k) === 0);
  },
  get(key) {
    try {
      return localStorage.getItem(key);
    } catch (_) {
      return null;
    }
  },
  set(key, val) {
    try {
      localStorage.setItem(key, val);
    } catch (_) {
      /* quota / private-mode — a device-preference write must never throw */
    }
    // P1 durability shadow (Step 2 · Phase 1): fire-and-forget mirror of this
    // device-pref write to IndexedDB's 'meta' store. localStorage above stays
    // the sole authority — this is never awaited and its result is never read
    // in P1. If IdbStore is absent or the write fails it silently no-ops, so the
    // app is byte-identical to a build without idb.js (migration-safety).
    _idbShadow('set', key, val);
  },
  remove(key) {
    try {
      localStorage.removeItem(key);
    } catch (_) {}
    _idbShadow('remove', key);
  },
  keys() {
    return Object.keys(META_MANIFEST);
  },
};
window.MetaStore = MetaStore;

// ── GLOBAL IMMERSION DIAL (Full / Balanced / Minimal) — Step 2 · Phase 1 · P8 ──
// One device-level control governing HOW MUCH of the atmosphere/immersion layer is
// switched on. It is a DEVICE PREFERENCE (MetaStore key robco_immersion), NOT
// campaign state — it never rides the campaign save/cloud, exactly like the audio
// mutes and optics (two-store boundary, Protocol 23). This is a BORN-COMPLIANT SEAM:
// the gate helpers below are what the ~10 ambient/atmosphere consumers (Ambient
// Runtime, radio, weather, idle behaviors, …) will read in Phase 2 to decide whether
// to run. Those consumers do NOT exist yet — this unit ONLY establishes the control +
// pref + helper cleanly. Game-agnostic (Protocol 38): a pure level, no game data.
//
// GATE-HELPER API (the seam Phase 2 subscribes to):
//   window.getImmersionTier()        → 'full' | 'balanced' | 'minimal' (fail-safe to 'full')
//   window.immersionAllows(required) → does a feature that requires `required` run now?
//                                      true iff rank(current) >= rank(required)
//   window.setImmersionTier(tier)    → persist the chosen level (validated; MetaStore only)
//
// Tiers ascend: minimal(0) < balanced(1) < full(2). A feature declares the MINIMUM
// level at which it runs. At 'full' everything runs (today's behavior — the DEFAULT);
// 'balanced' drops full-only features; 'minimal' keeps only baseline (minimal-tier)
// atmosphere. Default 'full' preserves current behavior exactly.
const IMMERSION_KEY = 'robco_immersion';
const IMMERSION_TIERS = ['minimal', 'balanced', 'full']; // index = rank (ascending)

function getImmersionTier() {
  const v = MetaStore.get(IMMERSION_KEY);
  return IMMERSION_TIERS.indexOf(v) !== -1 ? v : 'full';
}
window.getImmersionTier = getImmersionTier;

// A feature requiring `requiredTier` runs when the current level's rank is at least
// that tier's rank. An unrecognised requirement fails OPEN (returns true) so a typo in
// a future consumer can never silently suppress it. Never throws.
function immersionAllows(requiredTier) {
  const req = IMMERSION_TIERS.indexOf(requiredTier);
  if (req === -1) return true;
  return IMMERSION_TIERS.indexOf(getImmersionTier()) >= req;
}
window.immersionAllows = immersionAllows;

// Persist the chosen level (device pref only — MetaStore, never campaign state). An
// unknown value is coerced to the safe default 'full'. Returns the stored level.
function setImmersionTier(tier) {
  const t = IMMERSION_TIERS.indexOf(tier) !== -1 ? tier : 'full';
  MetaStore.set(IMMERSION_KEY, t);
  return t;
}
window.setImmersionTier = setImmersionTier;

// ── COMMAND-LINE MODE — device pref (Step 2 · Phase 2 · B1) ─────────────────
// Which of the two Comm-Link input modes is currently selected: 'terminal'
// (native commands + quick-log routing, no AI) or 'overseer' (today's AI
// narrator behavior, unchanged). A DEVICE PREFERENCE (MetaStore key
// robco_input_mode) — never campaign state, exactly like the Immersion dial
// above (two-store boundary, Protocol 23). Default 'overseer' preserves
// today's only-existing behavior for anyone who has never touched the pill.
const INPUT_MODE_KEY = 'robco_input_mode';
const INPUT_MODES = ['overseer', 'terminal'];

function getInputMode() {
  const v = MetaStore.get(INPUT_MODE_KEY);
  return INPUT_MODES.indexOf(v) !== -1 ? v : 'overseer';
}
window.getInputMode = getInputMode;

// Persist the chosen mode (device pref only — MetaStore, never campaign state).
// An unknown value is coerced to the safe default 'overseer'. Returns the stored mode.
function setInputMode(mode) {
  const m = INPUT_MODES.indexOf(mode) !== -1 ? mode : 'overseer';
  MetaStore.set(INPUT_MODE_KEY, m);
  return m;
}
window.setInputMode = setInputMode;

// The other of the two modes — the target of a one-off `/` or `@` override
// and of the pill tap. Only two modes exist today, so this is a simple flip;
// an unrecognised input still resolves to a valid mode (fails toward 'overseer').
function otherInputMode(mode) {
  return mode === 'terminal' ? 'overseer' : 'terminal';
}
window.otherInputMode = otherInputMode;

// ── ROBCO EVENTS — OS event bus for terminal/game state crossings ───────────
// A tiny synchronous pub/sub: emit(event, payload) calls every handler
// registered via on(event, fn), in registration order. This decouples STATE
// CROSSING DETECTION (faction threshold, HP critical, level-up, and the
// U8 notable-action points — collectible/craft/trade/sleep) from the code
// that REACTS to them (sound, haptic, chat message, auto-log) — a detector
// emits a fact once; any number of consumers subscribe instead of each
// re-implementing the same crossing check inline (Protocol 22). A handler
// that throws is caught and swallowed so one bad listener can never break
// the emitter or any other listener (the emitter itself must never throw).
const RobcoEvents = (() => {
  const handlers = {};
  function on(event, fn) {
    if (!handlers[event]) handlers[event] = [];
    handlers[event].push(fn);
  }
  function emit(event, payload) {
    (handlers[event] || []).forEach(fn => {
      try {
        fn(payload);
      } catch (_) {
        /* a listener failure must never break the emitter or other listeners */
      }
    });
  }
  return { on, emit };
})();
window.RobcoEvents = RobcoEvents;

// ── TERMINAL RECORD — structured event log (Step 2 · Phase 1 · P4) ───────────
// eventLog is the ONE canonical campaign history: an append-only array of
// structured events { t: ticks, rt: wallclock ms, type, text }. It REPLACES the
// old [T#]-prefixed strings that used to be pushed into campaign_notes — so
// campaign_notes returns to being a PURELY MANUAL, user-authored notebook.
// _logEvent is the single writer (Protocol 22), used by the RobcoEvents auto-log
// subscribers below and by the faction/quest loggers in api.js. Player-authority:
// these are factual event RECORDINGS emitted by code on detected state changes,
// never AI authority over state. Views (Crossroads, Incident) are cheap filters
// over this log. Rides the campaign container (robco_v8) → cloud/export/backup
// via the serialized-whole path (Protocol 34); no dedicated Firestore doc.
const EVENTLOG_CAP = 1000;
function _logEvent(type, text) {
  if (!Array.isArray(state.eventLog)) state.eventLog = [];
  state.eventLog.push({
    t: state.ticks || 0,
    rt: Date.now(),
    type: String(type),
    text: String(text),
  });
  if (state.eventLog.length > EVENTLOG_CAP) state.eventLog = state.eventLog.slice(-EVENTLOG_CAP);
  // Live-render fix (owner report): _logEvent is the ONE writer for eventLog, so this is
  // the single choke point (Protocol 22) to re-paint the CROSSROADS RECORD + INCIDENT LOG
  // panels the instant any caller (quick-log kill/caps, faction/quest AI-delta logging,
  // level-up/collectible/craft/scrap/trade/sleep auto-log subscribers) logs an event —
  // previously those panels only caught up on the next incidental loadUI() (tab switch,
  // sleep/wait, AI sync). Guarded because state.js loads before ui-render.js defines it.
  if (typeof renderCampaignStatus === 'function') renderCampaignStatus();
}
window._logEvent = _logEvent;

// Infer an event type from a legacy [T#] auto-log string's text — used only by
// the [T#]→eventLog migration to tag migrated records (defaults to 'log').
function _inferEventType(text) {
  const t = String(text || '');
  if (/^Level Up/.test(t)) return 'level';
  if (/^Collectible/.test(t)) return 'collectible';
  if (/^Crafted/.test(t)) return 'craft';
  if (/^Scrapped/.test(t)) return 'scrap';
  if (/^Bought |^Sold /.test(t)) return 'trade';
  if (/^Rested/.test(t)) return 'sleep';
  if (/^Quest:/.test(t)) return 'quest';
  if (/:\s*(fame|infamy)/.test(t)) return 'faction';
  return 'log';
}

// The [T#] MIGRATION — the one risky move of P4. campaign_notes historically held
// a MIX of code auto-log events ([T#]-prefixed) and genuinely MANUAL user notes.
// This SEPARATES them non-lossily: every [T#]-prefixed entry is MOVED into the
// structured eventLog (parsing its tick + inferring its type); every non-[T#]
// entry (a manual note, or the [LEGACY FACTION ARCHIVE] line) STAYS in
// campaign_notes. Idempotent: after the split campaign_notes has no [T#] entries,
// so a re-run moves nothing. A manual note is NEVER lost — non-[T#] entries are
// never touched, and a [T#]-shaped entry (only ever produced by code) is moved,
// not deleted (still visible in the Record). Runs from migrateState AND the v8
// boot fast-path (which skips migrateState) so existing v8 saves migrate too.
function _migrateEventLog(s) {
  if (!s || typeof s !== 'object') return;
  if (!Array.isArray(s.eventLog)) s.eventLog = [];
  if (!Array.isArray(s.campaign_notes)) return;
  const manual = [];
  s.campaign_notes.forEach(n => {
    const str = String(n == null ? '' : n);
    const m = /^\[T(\d+)\]\s*(.*)$/.exec(str);
    if (m) {
      s.eventLog.push({
        t: parseInt(m[1]) || 0,
        rt: 0, // wall-clock unknown for a migrated legacy string
        type: _inferEventType(m[2]),
        text: m[2],
      });
    } else {
      manual.push(n);
    }
  });
  s.campaign_notes = manual;
  if (s.eventLog.length > EVENTLOG_CAP) s.eventLog = s.eventLog.slice(-EVENTLOG_CAP);
}
window._migrateEventLog = _migrateEventLog;

// ── AUTO-LOG SUBSCRIBERS — each emits a STRUCTURED event into the Terminal
// Record (P4). The emit points (api.js, ui-render.js, ui-core.js) own the
// sound/haptic/chat side effects for the events they also use for those purposes
// (level.up, faction.threshold).
RobcoEvents.on('level.up', p => {
  _logEvent('level', `Level Up: ${p.oldLvl} → ${p.newLvl}`);
});
RobcoEvents.on('collectible.acquired', p => {
  _logEvent('collectible', `Collectible found: ${p.name}`);
});
RobcoEvents.on('craft.completed', p => {
  _logEvent('craft', `Crafted ${p.qty}× ${p.name}`);
});
RobcoEvents.on('craft.scrapped', p => {
  _logEvent('scrap', `Scrapped ${p.qty}× ${p.name}`);
});
RobcoEvents.on('trade.bought', p => {
  _logEvent('trade', `Bought ${p.name} for ${p.price}c`);
});
RobcoEvents.on('trade.sold', p => {
  _logEvent('trade', `Sold ${p.name} for ${p.price}c`);
});
RobcoEvents.on('sleep.completed', p => {
  _logEvent('sleep', `Rested 8 hours (+${p.ticksAdded} ticks)`);
});

// ── SAVE INTEGRITY + ROLLING BACKUP HELPERS ──────────────────────
// FNV-1a 32-bit hash over a string (same algorithm as cloud.js _contentHash)
function _fnv1a32(str) {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h.toString(16).padStart(8, '0');
}
function _sortedForHash(o) {
  if (Array.isArray(o)) return o.map(_sortedForHash);
  if (o && typeof o === 'object') {
    const out = {};
    Object.keys(o)
      .sort()
      .forEach(k => (out[k] = _sortedForHash(o[k])));
    return out;
  }
  return o;
}
// Compute a deterministic FNV-1a checksum for a save's payload fields.
// contentObj: robco_v8 (file/cloud saves) or state (slot saves)
// chat: chat history array; playstyle: string
// The checksum field itself must NOT be included in contentObj before calling this.
window.computeSaveChecksum = function (contentObj, chat, playstyle) {
  return _fnv1a32(
    JSON.stringify({
      v: _sortedForHash(contentObj || null),
      c: _sortedForHash(chat || []),
      p: String(playstyle || ''),
    })
  );
};

// Semver comparison helper: returns true if version string a is strictly newer than b.
function _semverGt(a, b) {
  const pa = String(a || '0')
    .split('.')
    .map(n => parseInt(n) || 0);
  const pb = String(b || '0')
    .split('.')
    .map(n => parseInt(n) || 0);
  for (let i = 0; i < 3; i++) {
    if ((pa[i] || 0) > (pb[i] || 0)) return true;
    if ((pa[i] || 0) < (pb[i] || 0)) return false;
  }
  return false;
}

// Verify a save envelope before loading.
// Returns { status: 'ok' | 'legacy' | 'checksum_mismatch' | 'future_version', version? }
// 'legacy'           — no checksum field (old save); load normally, no warning
// 'ok'               — checksum present and matches; load normally
// 'checksum_mismatch'— checksum present but wrong; warn + require confirm
// 'future_version'   — envelope was saved on a newer app version; warn + require confirm
window.verifySaveEnvelope = function (envelope) {
  if (!envelope || typeof envelope !== 'object') return { status: 'ok' };
  // Forward-compat: use schemaVersion if present, fall back to version
  const sv = envelope.schemaVersion || envelope.version || null;
  if (sv && _semverGt(String(sv), APP_VERSION)) {
    return { status: 'future_version', version: sv };
  }
  // Integrity: only fires when checksum field is present
  if (!envelope.checksum) return { status: 'legacy' };
  // Content can be robco_v8 (file/cloud saves) or state (slot saves)
  const contentObj =
    envelope.robco_v8 != null ? envelope.robco_v8 : envelope.state != null ? envelope.state : null;
  const expected = window.computeSaveChecksum(
    contentObj,
    envelope.chat || [],
    envelope.playstyle || ''
  );
  if (envelope.checksum !== expected) return { status: 'checksum_mismatch' };
  return { status: 'ok' };
};

// ── COLD-STORE ACCESSORS (save slots + rolling backups) — Step 2 · Phase 1 · P3 ──
// Cold-store entries (save slots, rolling backups) live IDB-PRIMARY in the
// 'campaign' object store (keys slot_<n> / backup_<n>), with localStorage
// (robco_slot_<n> / robco_backup_<n>) kept as a synchronous MIRROR + FALLBACK.
// IDB relieves the ~5MB localStorage ceiling: a save too large for localStorage
// still persists to IDB, and a localStorage quota failure is no longer fatal.
// P3 NEVER removes a localStorage copy (conservative — it stays a fallback); the
// two stores diverge only under quota pressure (oversized → IDB-only). Reads take
// the NEWER of {IDB, localStorage} by _coldStamp (IDB wins ties) so a partial
// write can never surface a stale save. Two-store boundary (Protocol 23): cold
// store uses the 'campaign' object store ONLY; device prefs stay in 'meta'.

// Comparable recency stamp for a cold-store envelope (slots use savedAt,
// rolling backups use timestamp).
function _coldStamp(o) {
  if (!o || typeof o !== 'object') return 0;
  return Number(o.savedAt || o.timestamp || 0) || 0;
}

// Async: read the freshest parsed envelope for a cold-store entry across both
// stores. IDB 'campaign' is primary; localStorage is the fallback/mirror; the
// newer by _coldStamp wins (IDB wins ties). Returns the parsed object or null.
// Never throws — a broken/absent IDB simply yields the localStorage copy.
async function _coldReadObj(lsKey, idbKey) {
  let lsObj = null;
  try {
    const raw = localStorage.getItem(lsKey);
    if (raw) lsObj = JSON.parse(raw);
  } catch (_) {}
  let idbObj = null;
  try {
    if (window.IdbStore) idbObj = await window.IdbStore.get('campaign', idbKey);
  } catch (_) {}
  if (idbObj && lsObj) return _coldStamp(idbObj) >= _coldStamp(lsObj) ? idbObj : lsObj;
  return idbObj || lsObj || null;
}
window._coldReadObj = _coldReadObj;

// Async: durably write a cold-store envelope. IDB 'campaign' is the primary
// (no ~5MB ceiling); localStorage is a best-effort mirror — a QuotaExceededError
// there is NON-FATAL because the IDB copy is the durable home (this is the
// ceiling relief). Returns true if at least one store accepted the write; the
// caller reports success on that basis. Never throws.
async function _coldWriteObj(lsKey, idbKey, obj) {
  let idbOk = false;
  try {
    if (window.IdbStore) idbOk = (await window.IdbStore.set('campaign', idbKey, obj)) === true;
  } catch (_) {}
  let lsOk = false;
  try {
    localStorage.setItem(lsKey, JSON.stringify(obj));
    lsOk = true;
  } catch (_) {
    /* quota / private-mode — non-fatal; the IDB copy is the durable home */
  }
  return idbOk || lsOk;
}
window._coldWriteObj = _coldWriteObj;

// Fire-and-forget, idempotent migration of existing localStorage cold-store
// entries into the IDB 'campaign' store. ADDITIVE ONLY — never removes the
// localStorage copy (it stays a fallback) and never clobbers a NEWER IDB entry
// (copies only when IDB lacks the key or localStorage is strictly newer by
// _coldStamp). Idempotent + interruption-safe: re-running at every boot copies
// only what is missing/older, so it never duplicates or drops a save, and union
// reads (_coldReadObj) find every save regardless of how far it got. Never throws.
async function _migrateColdStoreToIdb() {
  if (!window.IdbStore) return;
  const jobs = [];
  for (let n = 1; n <= 3; n++) jobs.push(['robco_slot_' + n, 'slot_' + n]);
  for (let n = 1; n <= 3; n++) jobs.push(['robco_backup_' + n, 'backup_' + n]);
  for (const [lsKey, idbKey] of jobs) {
    let lsObj = null;
    try {
      const raw = localStorage.getItem(lsKey);
      if (raw) lsObj = JSON.parse(raw);
    } catch (_) {}
    if (!lsObj) continue;
    let idbObj = null;
    try {
      idbObj = await window.IdbStore.get('campaign', idbKey);
    } catch (_) {}
    if (!idbObj || _coldStamp(lsObj) > _coldStamp(idbObj)) {
      try {
        await window.IdbStore.set('campaign', idbKey, lsObj);
      } catch (_) {}
    }
  }
}
window._migrateColdStoreToIdb = _migrateColdStoreToIdb;

// ── ROLLING BACKUPS ──────────────────────────────────────────────
// Snapshot the current localStorage state into a ring of 3 backup slots
// (robco_backup_1/2/3), MIRRORED into the IDB 'campaign' store (backup_<n>) for
// durability + ceiling relief (P3). Call before every user-initiated
// state-replacing load. The ring pointer (robco_backup_ptr) tracks the next slot
// to overwrite. Stays synchronous — the IDB mirror is fire-and-forget.
window.snapRollingBackup = function () {
  let ptr = 0;
  try {
    ptr = ((parseInt(localStorage.getItem('robco_backup_ptr') || '0') % 3) + 3) % 3;
  } catch (_) {}
  // Dedup: skip if robco_v8 is unchanged since the most-recent backup (prevents boot-reload dilution)
  const _curV8 = localStorage.getItem('robco_v8');
  try {
    const _prevKey = 'robco_backup_' + (ptr === 0 ? 3 : ptr);
    const _prevRaw = localStorage.getItem(_prevKey);
    if (_prevRaw) {
      const _prevSnap = JSON.parse(_prevRaw);
      if (JSON.stringify(_prevSnap.robco_v8) === _curV8) return;
    }
  } catch (_) {}
  let snapObj, snap;
  try {
    snapObj = {
      timestamp: Date.now(),
      robco_v8: JSON.parse(_curV8 || '{}'),
      chat: JSON.parse(localStorage.getItem('robco_chat') || '[]'),
      playstyle: localStorage.getItem('robco_playstyle') || 'any',
    };
    snap = JSON.stringify(snapObj);
  } catch (_) {
    return;
  }
  const nextPtr = (ptr + 1) % 3;
  // P3: mirror this ring slot into the IDB 'campaign' store — durable + ceiling-
  // relieved (survives a localStorage quota drop). Fire-and-forget; the localStorage
  // ring below stays the synchronous working store. IDB key mirrors the ls slot.
  if (window.IdbStore) {
    const _p = window.IdbStore.set('campaign', 'backup_' + (ptr + 1), snapObj);
    if (_p && typeof _p.catch === 'function') _p.catch(() => {});
  }
  const writeKey = 'robco_backup_' + (ptr + 1);
  function _tryWrite() {
    localStorage.setItem(writeKey, snap);
    localStorage.setItem('robco_backup_ptr', String(nextPtr));
  }
  try {
    _tryWrite();
  } catch (e) {
    if (e.name === 'QuotaExceededError' || e.name === 'NS_ERROR_DOM_QUOTA_REACHED') {
      // Drop the oldest remaining localStorage slot to free space, then retry.
      // Non-fatal even if this still fails: the IDB mirror above holds the backup.
      try {
        localStorage.removeItem('robco_backup_' + (nextPtr + 1));
        _tryWrite();
      } catch (_) {
        console.warn('[RobCo] snapRollingBackup: localStorage quota exceeded (IDB copy retained)');
      }
    }
  }
};

// Returns an array of backup entries sorted newest-first, read from the
// localStorage ring (synchronous — used by UI gate checks that can't await).
// Each entry: { key, timestamp, label, data }.
window.getRollingBackups = function () {
  const results = [];
  for (let i = 1; i <= 3; i++) {
    const raw = localStorage.getItem('robco_backup_' + i);
    if (!raw) continue;
    try {
      const b = JSON.parse(raw);
      if (b && b.timestamp) {
        results.push({
          key: 'robco_backup_' + i,
          timestamp: b.timestamp,
          label: new Date(b.timestamp).toLocaleString(),
          data: b,
        });
      }
    } catch (_) {}
  }
  return results.sort((a, b) => b.timestamp - a.timestamp);
};

// Async: the IDB-PRIMARY union of the rolling-backup ring across the 'campaign'
// store + localStorage (newest per slot wins, via _coldReadObj). Used by the
// RESTORE path so an oversized backup that localStorage dropped under quota is
// still restorable from IDB. The synchronous getRollingBackups() above remains
// the localStorage-only quick check for UI gate/affordance visibility.
window.getRollingBackupsAsync = async function () {
  const results = [];
  for (let i = 1; i <= 3; i++) {
    const b = await _coldReadObj('robco_backup_' + i, 'backup_' + i);
    if (b && b.timestamp) {
      results.push({
        key: 'robco_backup_' + i,
        timestamp: b.timestamp,
        label: new Date(b.timestamp).toLocaleString(),
        data: b,
      });
    }
  }
  return results.sort((a, b) => b.timestamp - a.timestamp);
};

// ── SAVE VERSION HISTORY (per-slot revision ring) — Step 2 · Phase 1 · P5 ──
// Each save slot retains up to SLOT_VERSION_CAP prior revisions so a user can view
// and restore an earlier save of that slot. The ring lives IDB-ONLY, in the
// 'campaign' object store under key `slot_<n>_versions` (an array, newest-first) —
// it deliberately rides the IndexedDB headroom the cold-store now has (P3) and is
// NEVER mirrored to localStorage, so version history can never consume the ~5MB
// localStorage ceiling. FAIL-SAFE: if IndexedDB is unavailable the ring is simply
// never written or offered, and normal save/load is byte-identical to today — no
// version history is worse than the pre-P5 behavior in any way. Two-store boundary
// (Protocol 23): version data is campaign data → 'campaign' store only, never
// 'meta'. Game-agnostic (Protocol 38): a plain envelope array, no game literals.
const SLOT_VERSION_CAP = 5;
function _slotVersionsIdbKey(n) {
  return 'slot_' + n + '_versions';
}

// Async: the retained prior-revision array for a slot, newest-first. Returns []
// when IndexedDB is unavailable, the key is empty, or anything throws — a caller
// that gets [] simply offers no version history. Never throws.
async function readSlotVersions(n) {
  try {
    if (!window.IdbStore) return [];
    const arr = await window.IdbStore.get('campaign', _slotVersionsIdbKey(n));
    return Array.isArray(arr) ? arr : [];
  } catch (_) {
    return [];
  }
}
window.readSlotVersions = readSlotVersions;

// Async: push a slot's PRIOR envelope onto its revision ring (newest-first),
// capped at SLOT_VERSION_CAP. IDB-only + additive: it never touches the live slot
// (slot_<n>) — only the separate versions key. No-op when IndexedDB is
// unavailable or the prior envelope is falsy (first save into an empty slot keeps
// no version). Never throws.
async function pushSlotVersion(n, priorEnv) {
  try {
    if (!window.IdbStore || !priorEnv) return;
    const arr = await readSlotVersions(n);
    arr.unshift(priorEnv);
    await window.IdbStore.set('campaign', _slotVersionsIdbKey(n), arr.slice(0, SLOT_VERSION_CAP));
  } catch (_) {}
}
window.pushSlotVersion = pushSlotVersion;

// ── OFFLINE CLOUD-PUSH QUEUE (per-device) — Step 2 · Phase 1 · P7 (data layer) ──
// A bounded, device-local queue of USER-INITIATED cloud pushes that could not be
// sent because the device was offline / the network failed. It exists ONLY to
// retry a push the user ALREADY chose (the manual SAVE TO CLOUD button) once
// connectivity returns — it NEVER enqueues on a state/stat change, so cloud sync
// stays manual-only (Prohibited Patterns). Lives IDB-ONLY in the 'campaign' object
// store (key cloud_queue) because each item carries a campaign save payload
// (robco_v8 + chat) — boundary-correct (Protocol 23), never the 'meta' device
// store. Bounded (CLOUD_QUEUE_CAP) + deduped by contentHash so the same push queued
// twice can't multiply. Survives reload. FAIL-SAFE: no IndexedDB → the queue can't
// persist, so enqueue no-ops and a manual push degrades to exactly today's behavior.
// Game-agnostic (Protocol 38). Never throws. The FLUSH orchestration (auth/online
// guards, the additive re-push) lives in cloud.js; this is only the storage layer.
const CLOUD_QUEUE_CAP = 20;
const CLOUD_QUEUE_IDB_KEY = 'cloud_queue';

// Async: the pending-push queue (oldest first), or [] when IndexedDB is
// unavailable / empty / on any error. Never throws.
async function readCloudQueue() {
  try {
    if (!window.IdbStore) return [];
    const q = await window.IdbStore.get('campaign', CLOUD_QUEUE_IDB_KEY);
    return Array.isArray(q) ? q : [];
  } catch (_) {
    return [];
  }
}
window.readCloudQueue = readCloudQueue;

// Async: append a user-initiated push (oldest-first), DEDUPED by contentHash (the
// same push queued twice is a no-op) and bounded to CLOUD_QUEUE_CAP (drops the
// oldest when full). No-op when IndexedDB is unavailable or the item is falsy.
// Returns true if the item is now queued (or was already present), false if it
// could not be persisted. Never throws.
async function enqueueCloudPush(item) {
  try {
    if (!window.IdbStore || !item) return false;
    const q = await readCloudQueue();
    if (item.contentHash && q.some(x => x && x.contentHash === item.contentHash)) return true;
    q.push(item);
    return (
      (await window.IdbStore.set('campaign', CLOUD_QUEUE_IDB_KEY, q.slice(-CLOUD_QUEUE_CAP))) ===
      true
    );
  } catch (_) {
    return false;
  }
}
window.enqueueCloudPush = enqueueCloudPush;

// Async: replace the queue with `arr` (bounded to CLOUD_QUEUE_CAP) — used by the
// flush to persist the remaining (failed / other-user) items in one write. No-op /
// never throws when IndexedDB is unavailable.
async function writeCloudQueue(arr) {
  try {
    if (!window.IdbStore) return false;
    const next = Array.isArray(arr) ? arr.slice(-CLOUD_QUEUE_CAP) : [];
    return (await window.IdbStore.set('campaign', CLOUD_QUEUE_IDB_KEY, next)) === true;
  } catch (_) {
    return false;
  }
}
window.writeCloudQueue = writeCloudQueue;

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
// ── WU-T1: data-driven optics palette (single source of truth) ─────────────────
// ONE read-only table replacing the old hardcoded if/else chain in changeOpticsColor
// (ui-audio.js) and the duplicated fgMap (ui-saves.js) — Protocol 22. Each entry holds
// the raw RGB triplet + display hex + the dark companion (for text-on-accent) + a
// diegetic label + a contrastSafe flag. `glow`/`refresh` are DERIVED from `rgb` at apply
// time (single source — never stored, never drifts). `robco` green (#14fdce) is the canon
// New Vegas terminal colour and the fallback default; `green3` is Fallout 3's classic,
// duller Capital-Wasteland green. Game-agnostic (Protocol 38): these are colour keys, not
// game data — a new game just points its theme.defaultOptics at one of these (or adds a
// row). contrastSafe:false entries (legion/neon) are manual-only and never a per-game
// default — Suite 124 enforces AA ≥4.5:1 for every contrastSafe:true colour.
// `family` (WU-optics-picker) tags the 3 green hues as one grouped phosphor cartridge in the
// SLOT 01 picker UI — pure presentation metadata (Protocol 38: the picker code reads this tag
// rather than hardcoding which colour keys are "green"). A future family only needs the same
// tag on its rows; OPTIC_FAMILY_LABELS below supplies the family's diegetic display name.
const THEMES = {
  green: {
    rgb: '20, 253, 206',
    hex: '#14fdce',
    dark: '#021c14',
    label: 'ROBCO GREEN',
    contrastSafe: true,
    family: 'green',
  },
  green3: {
    rgb: '79, 176, 90',
    hex: '#4fb05a',
    dark: '#07210b',
    label: 'PIP-BOY GREEN',
    contrastSafe: true,
    family: 'green',
  },
  ghoul: {
    rgb: '125, 255, 95',
    hex: '#7dff5f',
    dark: '#0a1e03',
    label: 'GHOUL GREEN',
    contrastSafe: true,
    family: 'green',
  },
  amber: {
    rgb: '255, 182, 66',
    hex: '#ffb642',
    dark: '#2e1d03',
    label: 'NEW VEGAS AMBER',
    contrastSafe: true,
  },
  blue: {
    rgb: '66, 203, 245',
    hex: '#42cbf5',
    dark: '#03202e',
    label: 'VAULT-TEC BLUE',
    contrastSafe: true,
  },
  legion: {
    rgb: '255, 64, 64',
    hex: '#ff4040',
    dark: '#2a0000',
    label: 'LEGION RED',
    contrastSafe: false,
  },
  neon: {
    rgb: '192, 132, 252',
    hex: '#c084fc',
    dark: '#1a0329',
    label: 'NEON VIOLET',
    contrastSafe: false,
  },
};
window.THEMES = THEMES;

// Diegetic display name for each family key referenced by THEMES[k].family — kept separate
// from THEMES so the picker's family label text is data too, never a hardcoded string.
const OPTIC_FAMILY_LABELS = {
  green: 'GREEN PHOSPHOR',
};
window.OPTIC_FAMILY_LABELS = OPTIC_FAMILY_LABELS;

const GAME_DEFS = {
  FNV: {
    id: 'FNV',
    label: 'Fallout: New Vegas',
    // WU-T1: per-game theme — defaultOptics resolves the boot/context optic colour when the
    // user has made no explicit pick (FNV = the canon RobCo green). The identity strings
    // (framing/pipBoyModel/bootFlavor/saveLabel) are the data seam consumed by WU-T3.
    theme: {
      defaultOptics: 'green',
      framing: 'vegas',
      pipBoyModel: 'Pip-Boy 3000',
      bootFlavor: 'MOJAVE WASTELAND UPLINK',
      saveLabel: 'LUCKY 38 TELEMETRY — MOJAVE ARCHIVE',
      // Program-cartridge stack subtitle (CAMPAIGN PROFILE board) — data-driven so
      // renderCartDeck() (ui-core.js) never hardcodes a per-game tape name (Protocol 38).
      cartridgeTape: 'MOJAVE PROGRAM TAPE · RBX-2281',
    },
    // ── DO-K: identity keystone — the single per-machine design-data block every later
    // overhaul unit (bezel nav, Overseer, ceremony, motion, audio, cursor, voice, ambient)
    // reads from (Protocol 38 extension — see CLAUDE.md). `identity.theme` is NOT written
    // here as a literal — it is aliased to the SAME `theme` object above, right after
    // GAME_DEFS finishes constructing (see the loop just before `window.GAME_DEFS =
    // GAME_DEFS` below), so there is exactly one theme object per game, never a duplicated/
    // forked copy (Protocol 22). NV is populated richly and accurately from the
    // owner-approved mockup (planning/mockups/nv-machine-mockup.html +
    // nv-machine-rationale.md) — the salvaged desk terminal, green-local/amber-remote split,
    // Mojave-uplink boot, oscilloscope-Overseer persona. Nothing reads `identity` yet
    // (DO-N/DO-O/DO-C/DO-M/DO-Q2-6 are the future consumers) — this unit is pure data, zero
    // behavior change (Protocol 26).
    identity: {
      machine: 'salvaged-terminal',
      material: 'scavenged-steel',
      structuralMode: 'bay',
      persona: {
        texture: 'uplink-scratchy',
        cadence:
          'field-grade, intermittent, static-bursted — a scratchy signal off the Lucky 38 relay, not a clean broadcast',
        blipBank: [
          '▸ CARRIER DRIFT +0.02 MHz — COMPENSATED',
          '▸ LUCKY 38 RELAY: SIGNAL NOMINAL',
          '▸ STATIC BURST — RESUMING CARRIER',
          '▸ UPLINK JITTER — RECALIBRATING',
          '▸ 0.417 MHz HOLDING STEADY',
        ],
      },
      ceremony: {
        coldStart: 'mojave-uplink-handshake',
        switchLabel: 'MOJAVE UPLINK — EJECTING CARTRIDGE',
      },
      motionTexture: {
        seat: 'thunk-and-spin',
        sweep: 'phosphor-smear',
        wake: 'carrier-acquire',
        fault: 'static-scratch-burst',
        breathe: 'slow-warm-sine',
      },
      cursor: 'amber-block',
      audio: {
        humFreq: 82,
        humGrit: 'scratchy-carrier',
        bootDrone: 'mojave-uplink-dial',
        wakeTone: 'carrier-acquired-chime',
        radioBed: 'wasteland-static-bed',
      },
      voice: {
        emptyStates: {
          inventory: 'NO CARGO LOGGED',
          quests: 'NO ACTIVE DIRECTIVES',
          notes: 'LOGBOOK EMPTY',
          generic: 'NOTHING ON RECORD',
        },
        loading: ['ESTABLISHING DIRECTOR LINK…', 'DECRYPTING TELEMETRY…', 'CARRIER SYNC…'],
      },
      ambient: {
        broadcasts: ['> [WASTELAND UPLINK] SIGNAL FROM THE MOJAVE — CARRIER HOLDING.'],
        news: ['> RADIO NEW VEGAS: A COURIER WAS SEEN LEAVING GOODSPRINGS…'],
        weatherLabel: 'MOJAVE RAD-STORM',
      },
      // ── DO-O: the Director Uplink presence — panel heading/relay/status-strip/
      // per-state tags read by OverseerScope (ui-core.js) via getIdentity().overseer.
      // Populated richly from the approved mockup (nv-machine-mockup.html §3 +
      // nv-machine-rationale.md). Colour is deliberately NOT here — the trace reads
      // the existing --bezel-wire token (Protocol UI-7), never a JS colour branch.
      overseer: {
        title: 'DIRECTOR UPLINK',
        relay: 'LUCKY 38 RELAY · 0.417 MHz',
        signalStrip: 'SIGNAL ▂▄▆_ 72% · ENCRYPTION: TRI-NODE · VOX MODULE: NOT INSTALLED (OPT-IN)',
        states: {
          listening: '[ LISTENING ]',
          thinking: '[ ESTABLISHING DIRECTOR LINK ]',
          speaking: '[ TRANSMITTING ]',
          disabled: '[ NO CARRIER ]',
          offline: '[ OFFLINE ]',
        },
        greeting: '▸ EVENING, COURIER. The Director is on the wire. Transmit when ready.',
      },
      // ── Phase 3 · Piece 3 — DATABANK "Records Bay" per-game flavor (owner-
      // approved, databank-notes.md Q6): the map region caption + records
      // framing read by BUS-16 CARTOGRAPHY TABLE / BUS-18 CAMPAIGN CHRONICLE.
      // Never a JS ctx branch — data only (Protocol 38).
      databank: {
        mapCaption: 'MOJAVE WASTELAND',
        mapCaptionSub: 'SURVEY GRID',
        recordsLabel: "COURIER'S RECORDS BAY",
      },
    },
    factions: FACTION_REGISTRY,
    skillKeys: SKILL_KEYS,
    // WU-N1 GA-10: the combat-skill set VATS draws from (weapon-damage skills only).
    // Game-agnostic (Protocol 38) — VATS filters getSkillKeys() by this list instead of a
    // hardcoded `{guns,…}` object. FNV folds heavy weapons into `guns` (no big_guns).
    combatSkills: ['guns', 'energy_weapons', 'explosives', 'melee_weapons', 'unarmed'],
    usesKarmaCenter: false,
    collectibleLabel: 'SNOW GLOBES',
    // Curio Archive object-class token (Protocol 38): drives which themed CSS
    // object _curioObjectIconHtml() builds for every collectible — never a JS
    // ctx branch. A game's collectibles are ALWAYS one uniform object type, so
    // this lives at the game level (like collectibleLabel), not per-item.
    collectibleCategory: 'snowglobe',
    hasTraits: true,
    hasMagazines: true,
    // U9-5: FNV has a [WEAPON_MODS.CSV] table (db_nv.js) and weapon-mod items are
    // craftable/lootable; FO3 has no weapon-mod system or data at all — gates the
    // inventory "Mods" filter button so it doesn't advertise a category that can
    // never have entries in FO3 (reverse Protocol-38 leak).
    hasWeaponMods: true,
    seedInventory: [{ name: 'Vault 13 Canteen', qty: 1, wgt: 1, val: 2, type: 'aid' }],
    calendar: { startMonth: 9, startDay: 19, startYear: 2281, epochWeekday: 0 },
    // ── WU-D4 deterministic-feature coefficients (fallout.wiki-verified, Protocol 3) ──
    // Feed the Phase-N native calculators (WU-N1 VATS / WU-N2 TRADE / WU-N3 THREAT);
    // they are NOT used yet. Guarded by Suite 104. See planning/DETERMINISTIC_FEATURES.md §3.
    barter: {
      // Buy  = round(value × (buyBase  − slopePerPoint×barter) × mod) → mult 1.55→1.10 as barter 0→100
      // Sell = round(value × (sellBase + slopePerPoint×barter) × mod) → mult 0.45→0.90 as barter 0→100
      // Source: fallout.wiki "Barter (Fallout: New Vegas)" — slope 9/2000 = 0.0045.
      // (Modifier defaults to 1.0; reputation/vendor discounts apply it at the feature layer.)
      buyBase: 1.55,
      sellBase: 0.45,
      slopePerPoint: 0.0045,
    },
    // Owner interactivity fold-in (Phase 3 OPERATOR follow-up): the RAD EXPOSURE field had
    // no upper bound. 1000 rads is the documented fatal radiation-poisoning threshold in
    // both FNV and FO3 (crossing 1001 kills the player character on exiting the Pip-Boy).
    // Source: fallout.wiki "Radiated (Fallout: New Vegas)" / "Radiated (Fallout 3)".
    // Never hardcode 1000 in the clamp logic -- read this field so a future game can differ.
    maxRads: 1000,
    vats: {
      // VATS critical-hit-chance bonus: FNV +5%. Source: fallout.wiki "Vault-Tec Assisted
      // Targeting System" ("...in Fallout: New Vegas this was reduced to a +5% boost").
      critBonus: 0.05,
      // Hit-% clamp. 95 is the documented practical VATS cap (hit = ChanceToHit − rand(1..100));
      // 5 is the engine/UX floor. Source: fallout.wiki VATS.
      hitChanceMin: 5,
      hitChanceMax: 95,
      // Weapon skill governs ranged spread only between skill 50 and 100 (below 50 = max
      // spread, at 100 = min spread). Source: fallout.wiki "Weapons spread" / VATS.
      skillSpreadFloor: 50,
      skillSpreadCeil: 100,
      // WU-N1: base Action-Point pool = apBase + apPerAgility × Agility. FNV uses ×3
      // (cap 95 at AGI 10). Source: fallout.wiki "Action Points". Perk/chem/item AP not
      // modeled — the AP-strike optimizer labels this the BASE pool.
      apBase: 65,
      apPerAgility: 3,
      // WU-N1 GA-7: per-region hit modifier + VATS queue AP cost. Moved verbatim from the
      // old hardcoded showVATSOverlay table so VATS is game-agnostic (Protocol 38); a new
      // game supplies its own. `mod` feeds the ESTIMATED hit-% (see RANGED-GAP); `ap` is the
      // per-region queue cost used by the AP-strike optimizer.
      regions: [
        { name: 'HEAD', mod: -40, ap: 5 },
        { name: 'TORSO', mod: 0, ap: 4 },
        { name: 'L. ARM', mod: -20, ap: 3 },
        { name: 'R. ARM', mod: -20, ap: 3 },
        { name: 'L. LEG', mod: -25, ap: 4 },
        { name: 'R. LEG', mod: -25, ap: 4 },
        { name: 'EYES', mod: -60, ap: 6 },
        { name: 'GROIN', mod: -30, ap: 4 },
      ],
      // WU-D4a-RANGED-GAP (Protocol 3 FLAG — do not silently drop): per-weapon BASE SPREAD
      // (degrees) and RANGE/DAM-falloff are NOT columns in WEAPONS.CSV and fallout.wiki does
      // not tabulate them as a per-weapon coefficient set, so an EXACT ranged hit-% is not
      // sourceable. The Phase-N ranged overlay must stay an ESTIMATE built from
      // skillSpreadFloor/Ceil + this clamp; the melee/unarmed AP-strike path is already exact
      // from the existing schema. Tracked under WU-D4a / WU-N1 in planning/MASTER_PLAN.md.
    },
    // WU-D4c: ammo consumed per single attack. Default 1 — exact for single-projectile
    // weapons; "Full Auto" weapons burn at the schema's Attacks_Per_Second, so no per-weapon
    // ammo column is needed. Source: fallout.wiki weapon mechanics (1 round per trigger pull).
    ammoPerAttack: 1,
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
      // U1 (Step 2 Phase 0) GA-5 retirement: the AI-directive text for FNV's two
      // trackers (Traits + Skill Magazines), consumed by _directiveTrackers() in
      // api.js. The leading/trailing blank lines are intentional — they reproduce
      // the exact whitespace the old FNV-conditional ternary chain produced (verified
      // byte-identical by the Suite 131 golden-master test); do not "clean up".
      trackerDirectives: `

### **Traits Tracker (FNV only)**
state.traits is a string[] of the Courier's chosen traits (normally max 2 at character creation; Old World Blues allows re-selection via the Sink).
Update state.traits when the Courier gains, re-selects, or removes a trait. Include only names exactly as defined in the trait registry. Omit this field entirely for FO3.

### **Skill Magazines Tracker (FNV only)**
state.magazines is a string[] of skill magazine titles the Courier has read (each gives a temporary +10 skill boost, or Critical Chance for True Police Stories).
Update state.magazines when the Courier reads a skill magazine. Include only names exactly as defined in the FNV magazine registry. Omit this field entirely for FO3.`,
    },
  },
  FO3: {
    id: 'FO3',
    label: 'Fallout 3',
    // WU-T1: per-game theme — FO3 defaults to the classic, duller Capital-Wasteland green
    // (green3), visibly distinct from FNV's brighter RobCo green. Identity strings = WU-T3 seam.
    theme: {
      defaultOptics: 'green3',
      framing: 'capital',
      pipBoyModel: 'Pip-Boy 3000',
      bootFlavor: 'CAPITAL WASTELAND UPLINK',
      saveLabel: 'VAULT-TEC ARCHIVE — CAPITAL WASTELAND',
      cartridgeTape: 'CAPITAL WASTELAND TAPE · RBX-2277',
    },
    // ── DO-K: FO3 identity — sensible STUBS/defaults (§ build plan: "FO3 and FO4 get
    // sensible stubs for now — their machines aren't designed yet"). FO3's real
    // Vault-Tec-molded bezel/persona/motion facets are authored from an approved mockup at
    // DO-M; these placeholder values only need to validate + be visibly distinct from NV's
    // so the N-game abstraction (Protocol 38) is proven. `identity.theme` is aliased to the
    // SAME `theme` object above (see the loop before `window.GAME_DEFS = GAME_DEFS` below) —
    // never a duplicated copy (Protocol 22).
    identity: {
      machine: 'pipboy-3000',
      material: 'vaulttec-molded',
      structuralMode: 'bay',
      persona: {
        texture: 'vault-institutional',
        cadence:
          'clipped, procedural, Vault-Tec formal — a standard-issue Overseer, not a scavenged signal',
        blipBank: [
          '▸ VAULT-TEC DIAGNOSTIC: NOMINAL',
          '▸ RADIATION SENSOR: NOMINAL',
          '▸ CAPITAL WASTELAND UPLINK: HOLDING',
        ],
      },
      ceremony: {
        coldStart: 'vaulttec-post',
        switchLabel: 'VAULT-TEC UPLINK — EJECTING CARTRIDGE',
      },
      motionTexture: {
        seat: 'mechanical-clunk',
        sweep: 'scanline-sweep',
        wake: 'post-check-chime',
        fault: 'buzzer-fault',
        breathe: 'steady-hum',
      },
      cursor: 'pipboy-reticle',
      audio: {
        humFreq: 55,
        humGrit: 'steady-hum',
        bootDrone: 'vaulttec-post-drone',
        wakeTone: 'post-check-chime',
        radioBed: 'capital-wasteland-static',
      },
      voice: {
        emptyStates: {
          inventory: 'NO ITEMS LOGGED',
          quests: 'NO ACTIVE DIRECTIVES',
          notes: 'LOGBOOK EMPTY',
          generic: 'NOTHING ON RECORD',
        },
        loading: ['RUNNING DIAGNOSTIC…', 'QUERYING VAULT-TEC ARCHIVE…'],
      },
      ambient: {
        broadcasts: ['> [CAPITAL WASTELAND UPLINK] SIGNAL FROM THE RUINS — CARRIER HOLDING.'],
        news: ['> GALAXY NEWS RADIO: A WANDERER WAS SEEN LEAVING MEGATON…'],
        weatherLabel: 'CAPITAL WASTELAND RAD-STORM',
      },
      // ── DO-O: sensible Vault-Tec/GNR stub (FO3's real bezel/persona facets are
      // authored from an approved mockup at DO-M) — validates + is visibly
      // distinct from NV's so the N-game abstraction (Protocol 38) is proven.
      overseer: {
        title: 'OVERSEER UPLINK',
        relay: 'GNR RELAY · 98.3 MHz',
        signalStrip: 'SIGNAL — · ENCRYPTION: TRI-NODE · VOX MODULE: NOT INSTALLED (OPT-IN)',
        states: {
          listening: '[ LISTENING ]',
          thinking: '[ QUERYING OVERSEER LINK ]',
          speaking: '[ TRANSMITTING ]',
          disabled: '[ NO CARRIER ]',
          offline: '[ OFFLINE ]',
        },
        greeting: '▸ VAULT DWELLER, THE OVERSEER IS MONITORING. Transmit when ready.',
      },
      // ── sensible stub (FO3's real records-bay flavor is authored from an
      // approved mockup later) — validates + is visibly distinct from NV's.
      databank: {
        mapCaption: 'CAPITAL WASTELAND',
        mapCaptionSub: 'SURVEY GRID',
        recordsLabel: "WANDERER'S RECORDS BAY",
      },
    },
    factions: FACTION_REGISTRY_FO3,
    skillKeys: SKILL_KEYS_FO3,
    // WU-N1 GA-10 (LIVE BUG FIX): FO3 splits firearms into small_guns + big_guns. The old
    // hardcoded VATS skill object used FNV's `guns` and patched `small_guns` but OMITTED
    // `big_guns` entirely — making FO3 Big Guns invisible to VATS. Driving the set from this
    // list (Protocol 38) restores big_guns. Guarded by Suite 105.
    combatSkills: [
      'small_guns',
      'big_guns',
      'energy_weapons',
      'explosives',
      'melee_weapons',
      'unarmed',
    ],
    usesKarmaCenter: true,
    collectibleLabel: 'BOBBLEHEADS',
    collectibleCategory: 'bobblehead',
    tracksLincoln: true,
    hasWeaponMods: false,
    seedInventory: [],
    calendar: { startMonth: 7, startDay: 17, startYear: 2277, epochWeekday: 3 },
    // ── WU-D4 deterministic-feature coefficients (fallout.wiki-verified, Protocol 3) ──
    // Feed the Phase-N native calculators; not used yet. Guarded by Suite 104.
    barter: {
      // Same engine as FNV. Source: fallout.wiki "Barter (Fallout 3)" expresses the slope as
      // (Barter/100)×0.45 = 0.0045/pt — numerically identical to FNV's 9/2000. Buy 1.55→1.10,
      // sell 0.45→0.90 across barter 0→100. (Modifier defaults to 1.0.)
      buyBase: 1.55,
      sellBase: 0.45,
      slopePerPoint: 0.0045,
    },
    // Owner interactivity fold-in (Phase 3 OPERATOR follow-up): same 1000-rad fatal
    // threshold as FNV. Source: fallout.wiki "Radiated (Fallout 3)".
    maxRads: 1000,
    vats: {
      // VATS critical-hit-chance bonus: FO3 +15% (the per-game difference vs FNV's +5%).
      // Source: fallout.wiki VATS ("In Fallout 3, when using V.A.T.S., a +15% critical hit
      // chance is added").
      critBonus: 0.15,
      hitChanceMin: 5,
      hitChanceMax: 95,
      skillSpreadFloor: 50,
      skillSpreadCeil: 100,
      // WU-N1: base AP pool = apBase + apPerAgility × Agility. FO3 uses ×2 (vs FNV ×3).
      // Source: fallout.wiki "Action Points". Perk/chem/item AP not modeled (BASE pool).
      apBase: 65,
      apPerAgility: 2,
      // WU-N1 GA-7: per-region hit modifier + queue AP cost (game-agnostic, Protocol 38).
      regions: [
        { name: 'HEAD', mod: -40, ap: 5 },
        { name: 'TORSO', mod: 0, ap: 4 },
        { name: 'L. ARM', mod: -20, ap: 3 },
        { name: 'R. ARM', mod: -20, ap: 3 },
        { name: 'L. LEG', mod: -25, ap: 4 },
        { name: 'R. LEG', mod: -25, ap: 4 },
        { name: 'EYES', mod: -60, ap: 6 },
        { name: 'GROIN', mod: -30, ap: 4 },
      ],
      // WU-D4a-RANGED-GAP (Protocol 3 FLAG): exact ranged hit-% not sourceable — per-weapon
      // base spread / range falloff absent from schema and fallout.wiki. Ranged overlay stays
      // an ESTIMATE; melee/AP-strike is exact. See WU-D4a / WU-N1 in planning/MASTER_PLAN.md.
    },
    // WU-D4c: ammo per single attack — default 1 (Full Auto burns at Attacks_Per_Second).
    ammoPerAttack: 1,
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
      // U1 (Step 2 Phase 0) GA-5 retirement: the AI-directive text for FO3's one
      // tracker (Lincoln Memorabilia). The trailing blank lines are intentional —
      // they reproduce the exact whitespace the old FO3-conditional ternary chain
      // produced (verified byte-identical by the Suite 131 golden-master test);
      // do not "clean up".
      trackerDirectives: `### **Lincoln Memorabilia Tracker (FO3 only)**
state.lincolnItems maps each collected Lincoln artifact name to its disposition: found (have it, undecided) | hannibal (gave/sold to Hannibal Hamlin, Temple of the Union) | leroy (sold to Leroy Walker, Lincoln Memorial) | washington (sold to Abraham Washington, Rivet City) | other (kept/dropped/sold to generic trader).
Update state.lincolnItems when the Courier acquires or sells any Lincoln artifact. Omit this field entirely for FNV.



`,
    },
  },
  // ── DO-K: FO4 — DESIGN-ONLY this cycle (§0.2 build-plan reconciliation). FO4 = the
  // Pip-Boy 3000 Mark IV, a refined evolution of the FO3 Pip-Boy — NOT an Institute
  // holo-terminal (the slate's original framing is dropped). This entry exists to PROVE the
  // N-game abstraction (Protocol 38) and force the `identity` contract to be right; it is
  // UNREACHABLE in the live UI: `designOnly: true` is checked by onGameContextChange()'s
  // guard (ui-core.js) and #gameContextSelect (index.html) offers no FO4 <option>. No
  // db_fo4.js / reg_fo4.js exist this cycle — no FO4 game-data files are required (DO-K spec).
  FO4: {
    id: 'FO4',
    label: 'Fallout 4',
    designOnly: true,
    theme: {
      defaultOptics: 'green3',
      framing: 'commonwealth',
      pipBoyModel: 'Pip-Boy 3000 Mark IV',
      bootFlavor: 'COMMONWEALTH UPLINK',
      saveLabel: 'VAULT-TEC ARCHIVE — COMMONWEALTH',
      cartridgeTape: 'COMMONWEALTH PROGRAM TAPE · RBX-2287',
    },
    // Skill-less (FO4-class) degradation contract, locked by the Step 2 Phase 0 U11 audit
    // (ARCHITECTURE.md "Skill-less (FO4-class) degradation audit"): FO4 replaced the SPECIAL
    // skill system with perks, so skillKeys/combatSkills/factions MUST be declared as empty
    // arrays here — never omitted — so getSkillKeys()/getFactionRegistry() return `[]`
    // (which every consumer already degrades to safely) instead of `undefined` (which every
    // .forEach()/.map()/.includes() call site would throw on). Real FO4 faction/perk data is
    // authored when FO4 actually builds at 3.0.
    factions: [],
    skillKeys: [],
    combatSkills: [],
    usesKarmaCenter: false,
    collectibleLabel: 'BOBBLEHEADS', // FO4 keeps bobbleheads — placeholder pending 3.0 design
    collectibleCategory: 'bobblehead',
    hasWeaponMods: true, // FO4's deep weapon-crafting system — placeholder pending 3.0 design
    seedInventory: [],
    // Placeholder — Fallout 4 begins 2287-10-23 (fallout.wiki); epochWeekday is UNVERIFIED
    // and unused (FO4 has no live calendar consumer this cycle) — verify before this becomes
    // load-bearing at the 3.0 build (Protocol 3).
    calendar: { startMonth: 10, startDay: 23, startYear: 2287, epochWeekday: 0 },
    ammoPerAttack: 1,
    // FO4 also uses the 1000-rad fatal threshold (unverified for 3.0, kept consistent with
    // FNV/FO3 pending real fallout.wiki confirmation when FO4 actually builds — Protocol 3).
    maxRads: 1000,
    // Minimal defensive stub — never read today (gameContext cannot reach FO4), kept only so
    // getSystemDirective() can't crash if this guard is ever bypassed by a future regression.
    ai: {
      skillSystemText: 'FO4 has no traditional skill system this cycle (design-only stub).',
      factionSystemText: 'FO4 faction data is not yet authored (design-only stub).',
      irreversibleTriggers: '**FO4 Irreversible Triggers** — not yet authored (design-only stub).',
      trackerDirectives: '',
    },
    // DO-K identity — the Mark IV design brief (spec-only; built at 3.0 per DO-M).
    identity: {
      machine: 'pipboy-3000-mk4',
      material: 'vaulttec-mk4',
      structuralMode: 'bay',
      persona: {
        texture: 'mk4-clean',
        cadence:
          'refined, quieter Vault-Tec cadence — a cleaner evolution of the FO3 Overseer, less clunk, more precision',
        blipBank: ['▸ MARK IV DIAGNOSTIC: NOMINAL', '▸ COMMONWEALTH UPLINK: HOLDING'],
      },
      ceremony: {
        coldStart: 'mk4-post',
        switchLabel: 'MARK IV UPLINK — EJECTING CARTRIDGE',
      },
      motionTexture: {
        seat: 'refined-clunk',
        sweep: 'crisp-scanline-sweep',
        wake: 'mk4-chime',
        fault: 'soft-buzzer-fault',
        breathe: 'quiet-steady-hum',
      },
      cursor: 'mk4-pointer',
      audio: {
        humFreq: 60,
        humGrit: 'quiet-steady-hum',
        bootDrone: 'mk4-post-drone',
        wakeTone: 'mk4-chime',
        radioBed: 'commonwealth-static',
      },
      voice: {
        emptyStates: {
          inventory: 'NO ITEMS LOGGED',
          quests: 'NO ACTIVE DIRECTIVES',
          notes: 'LOGBOOK EMPTY',
          generic: 'NOTHING ON RECORD',
        },
        loading: ['RUNNING DIAGNOSTIC…', 'QUERYING VAULT-TEC ARCHIVE…'],
      },
      ambient: {
        broadcasts: ['> [COMMONWEALTH UPLINK] SIGNAL FROM THE COMMONWEALTH — CARRIER HOLDING.'],
        news: ['> DIAMOND CITY RADIO: A SOLE SURVIVOR WAS SEEN LEAVING SANCTUARY…'],
        weatherLabel: 'COMMONWEALTH RAD-STORM',
      },
      // ── DO-O: design-only stub — validates the contract; unreachable at
      // runtime (designOnly: true), same as the rest of FO4's identity block.
      overseer: {
        title: 'DIRECTOR UPLINK',
        relay: 'MARK IV RELAY · COMMONWEALTH BAND',
        signalStrip: 'SIGNAL — · ENCRYPTION: TRI-NODE · VOX MODULE: NOT INSTALLED (OPT-IN)',
        states: {
          listening: '[ LISTENING ]',
          thinking: '[ ESTABLISHING LINK ]',
          speaking: '[ TRANSMITTING ]',
          disabled: '[ NO CARRIER ]',
          offline: '[ OFFLINE ]',
        },
        greeting: '▸ GENERAL, THE UPLINK IS READY. Transmit when ready.',
      },
      // ── design-only stub — validates the contract; unreachable at runtime
      // (designOnly: true), same as the rest of FO4's identity block.
      databank: {
        mapCaption: 'THE COMMONWEALTH',
        mapCaptionSub: 'SURVEY GRID',
        recordsLabel: "SURVIVOR'S RECORDS BAY",
      },
    },
  },
};
// DO-K: alias identity.theme → the SAME theme object each game already declares above, so
// changeOpticsColor()/_resolveOptic()/_resolveDefaultOptics()/_opticStorageKey() (ui-audio.js)
// and the WU-T3 save-header consumer (ui-account.js) keep reading identical values — one
// theme object per game, never a duplicated/forked copy (Protocol 22). Zero behavior change:
// the `theme` key itself is untouched; this only adds a second reference to it.
Object.keys(GAME_DEFS).forEach(k => {
  if (GAME_DEFS[k].identity) GAME_DEFS[k].identity.theme = GAME_DEFS[k].theme;
});
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

// getIdentity(ctx) — DO-K read-only accessor for the per-game identity keystone block.
// Mirrors getFactionRegistry()/getSkillKeys(): omit ctx to resolve the ACTIVE game via
// _activeDef(); pass an explicit ctx to inspect any game's identity (e.g. FO4's design-only
// entry) without switching context. Fails safe to FNV's identity — never returns undefined.
function getIdentity(ctx) {
  const def = (ctx && GAME_DEFS[ctx]) || _activeDef();
  return (def && def.identity) || GAME_DEFS.FNV.identity;
}
window.getIdentity = getIdentity;

// getGameContext() — the sanctioned read accessor for the active game context.
// External modules (cloud.js, the cloud-sync boundary) MUST call this instead of
// reading the global `state.gameContext` directly, so state ownership stays inside
// state.js (Protocol 23). TDZ-safe and absence-guarded: returns 'FNV' before state
// is initialized or if gameContext is unset — identical to the old `state.gameContext
// || 'FNV'` reads it replaces, so the swap is behavior-preserving.
function getGameContext() {
  try {
    return (state && state.gameContext) || 'FNV';
  } catch (_) {
    return 'FNV';
  }
}
window.getGameContext = getGameContext;

// snapshotActiveCampaign() — the sanctioned accessor that flushes the live `state`
// object into the window.robco_v8 container (creating it if absent) under the active
// game context, and returns the container. This is the SINGLE source for the
// "build-if-absent → set activeContext → deep-snapshot state into campaigns[ctx]"
// idiom; saveState(), exportSaveFile(), and the cloud-sync push all route through it
// (Protocol 22) so an external module never reaches into the global `state` directly
// (Protocol 23). Behavior-preserving: the body is the exact 3-step block it replaces.
function snapshotActiveCampaign() {
  const ctx = getGameContext();
  if (!window.robco_v8) {
    window.robco_v8 = { activeContext: ctx, campaigns: {} };
  }
  window.robco_v8.activeContext = ctx;
  window.robco_v8.campaigns[ctx] = JSON.parse(JSON.stringify(state));
  return window.robco_v8;
}
window.snapshotActiveCampaign = snapshotActiveCampaign;

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
  campaign_notes: [], // P4 purely-MANUAL user-authored notebook (auto-log moved to eventLog)
  eventLog: [], // P4 Terminal Record structured campaign history (code-authored events)
  perks: [],
  quests: [],
  equipped: { weapon: null, armor: null, headgear: null },
  ammo: {},
  stats: { kills: 0, capsEarned: 0, damageDealt: 0, sessionStart: Date.now() },
  locationHistory: [],
  // v2.0 fields
  gameContext: 'FNV', // 'FNV' | 'FO3' — set at boot, governs registry/AI context
  collectibles: [], // flat string[] of collected item names (game-context-aware)
  lincolnItems: {}, // FO3 only — map of artifact name → disposition (found|hannibal|leroy|washington)
  traits: [], // FNV only — string[] of selected trait names (soft cap 2; OWB allows re-selection)
  skillBooks: [], // string[] of skill-book titles read (both games)
  magazines: [], // FNV only — string[] of skill magazine titles read (temporary boosts)
  campaignMode: 'standard', // 'standard' | 'rng' (armed) | 'rng-locked' (permanently active after wipe)
  playthroughType: 'standard', // 'standard' | 'minmaxed' | 'completionist' | 'casual' | 'speedrun'
  mapView: 'auto', // 'auto' | 'full' | 'core' — persisted map size preference; 'auto' and 'core' → 4×4 grid
  // Quick-Draw Holster (Tool Deck unit) — native, player-authored gear quick-slots.
  // Direction (lowercase) -> bound gear name (trimmed string) or null when empty.
  // Player-authority (Protocol 24): never in getSystemDirective(), never mapped in
  // autoImportState() — the AI cannot read or write a binding.
  padBindings: { up: null, down: null, left: null, right: null },
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
  ['s', 'p', 'e', 'c', 'i', 'a', 'l'].forEach(k => {
    const _n = parseInt(document.getElementById('s_' + k).value, 10);
    state[k] = isNaN(_n) ? 5 : Math.max(1, Math.min(10, _n));
  });
  state.caps = parseInt(document.getElementById('c_caps').value) || 0;
  state.loc = document.getElementById('stat_loc').value;
  {
    // Owner interactivity fold-in: RAD EXPOSURE clamped to [0, GAME_DEFS[ctx].maxRads]
    // here too (defense in depth alongside capRadsMax()'s oninput clamp) — mirrors the
    // SPECIAL-stat clamp just above. Never hardcode 1000 (Protocol 38).
    const _radsN = parseInt(document.getElementById('stat_rads').value) || 0;
    const _ctx = typeof getGameContext === 'function' ? getGameContext() : 'FNV';
    const _def = (GAME_DEFS && GAME_DEFS[_ctx]) || (GAME_DEFS && GAME_DEFS.FNV) || {};
    const _maxRads = typeof _def.maxRads === 'number' ? _def.maxRads : 1000;
    state.rads = Math.max(0, Math.min(_maxRads, _radsN));
  }
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

// Fog-of-war map discovery: record a location as discovered the moment it is (or was)
// the Courier's current location. Deduplicated (case-insensitive) and PERMANENT — once
// a place is discovered it stays discovered, so the world map shows [VISITED] for it
// forever after, never reverting to [UNKNOWN]. Both the manual location-change path
// (onLocationChange) and the AI import path (autoImportState) route through this single
// helper so the map's CURRENT / VISITED / UNKNOWN status can never desync from reality.
// Game-agnostic (Protocol 38): operates on the location string only — no game literals.
// Does NOT save or push to cloud; the caller persists via saveState (cloud stays manual).
// _pendingSurveyPing (FEEDBACK ANIMATION WAVE 1, §5): a transient module var —
// never state.* — read/cleared by renderWorldMap() in ui-render.js (same
// global lexical scope; classic <script> tags share one realm, no window.
// prefix needed, matching the existing _mapActiveZone/_lastRadThreshold
// pattern elsewhere in this codebase).
let _pendingSurveyPing = null;
// The three siblings below (#14/#22/#23-24) are set at their emit site in
// api.js (which tests/test.html's reduced boot chain DOES load) and consumed
// by ui-render.js's render functions (which that reduced chain deliberately
// does NOT load) — declared here in state.js, like _pendingSurveyPing above,
// so every environment that loads api.js also has them defined (Protocol 27
// fix: a ReferenceError surfaced in the test.html harness because these were
// originally declared in ui-render.js only).
let _pendingRepStamp = null; // #14 REPUTATION STAMP
let _pendingQuestStamp = null; // #23 CASE-CLOSED STAMP / #24 FILAMENT DIE
let _pendingExhibitLight = []; // #22 EXHIBIT LIGHT-UP
function recordLocationVisit(locName) {
  const loc = (locName == null ? '' : String(locName)).trim();
  if (!loc) return;
  if (!Array.isArray(state.locationHistory)) state.locationHistory = [];
  const lower = loc.toLowerCase();
  if (!state.locationHistory.some(l => String(l || '').toLowerCase() === lower)) {
    state.locationHistory.push(loc);
    // FEEDBACK ANIMATION WAVE 1: the single choke point for every discovery
    // path (manual mark-visited, arrival, AI autoImport) — one emit covers
    // all of them (Protocol 22). SURVEY PING (#26) is deferred: it sets a
    // transient pending var (never state.*) that renderWorldMap() consumes
    // only when it next paints the WORLD GRID view, so the ping is always
    // actually seen instead of playing off-screen or under a zoomed sheet.
    RobcoEvents.emit('location.visited', { loc });
    _pendingSurveyPing = loc;
  }
}

let _lastSaveStr = null;
function saveState() {
  syncStateFromDom();
  // Debounce the disk write — at most once per 500ms
  // A beforeunload handler in ui.js flushes immediately on tab close
  clearTimeout(_saveTimer);
  _saveTimer = setTimeout(() => {
    // Same suppression as the unload flush: never let a debounced write of stale
    // in-memory state land on top of a robco_v8 that a load path just wrote.
    if (window._contextSwitching || window._loadingSave) return;
    try {
      snapshotActiveCampaign();
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
        } else if (typeof openModal === 'function') {
          openModal({
            title: '> SYS-ALERT',
            body: 'STORAGE QUOTA EXCEEDED: Export save file to free space.',
          });
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
  snapshotActiveCampaign();

  const _exportPlaystyle = localStorage.getItem('robco_playstyle') || 'any';
  const exportPayload = {
    version: APP_VERSION,
    schemaVersion: APP_VERSION,
    robco_v8: window.robco_v8,
    chat: chatHistory,
    playstyle: _exportPlaystyle,
  };
  if (typeof window.computeSaveChecksum === 'function') {
    exportPayload.checksum = window.computeSaveChecksum(
      exportPayload.robco_v8,
      exportPayload.chat,
      _exportPlaystyle
    );
  }
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

// ── FULL BACKUP BUNDLE (Step 2 · Phase 1 · P6) — data layer ──────────────────
// One portable file holding the user's ENTIRE local history: the live campaign
// container (robco_v8) + every save slot (each with its P5 version ring) + the
// rolling-backup ring + chat + playstyle. Deliberately EXCLUDES device prefs (the
// 'meta' store / MetaStore keys) — the bundle is campaign/save data ONLY, so the
// two-store boundary (Protocol 23) holds. The envelope is version-stamped and
// checksummed with the SAME helper every other save uses (computeSaveChecksum,
// Protocol 22 — no forked hash). These functions are the DATA layer (gather /
// verify / restore); the ui-saves.js wrappers own the download button, the confirm
// gate, and the reload. Game-agnostic (Protocol 38): plain campaign/save data, no
// game literals. Fail-safe: reads go through the IDB-primary cold-store accessors,
// so with no IndexedDB the bundle simply carries whatever localStorage holds
// (version rings empty), and restore degrades to localStorage.

// Async: gather the full-backup bundle object (no download / no UI). The checksum
// covers the container + slots + backups + chat + playstyle. Never throws.
async function buildFullBundle() {
  // Best-effort capture of the latest live state before snapshotting — guarded so
  // an export can never crash if the DOM/form fields aren't present (falls back to
  // the already-built window.robco_v8). Never throws.
  try {
    if (typeof syncStateFromDom === 'function') syncStateFromDom();
    if (typeof snapshotActiveCampaign === 'function') snapshotActiveCampaign();
  } catch (_) {}
  const _v8 = window.robco_v8 || null;
  const _playstyle = localStorage.getItem('robco_playstyle') || 'any';
  const _chat = Array.isArray(chatHistory) ? chatHistory : [];

  const slots = [];
  for (let n = 1; n <= 3; n++) {
    let env = null;
    try {
      env = await _coldReadObj('robco_slot_' + n, 'slot_' + n);
    } catch (_) {}
    if (!env) continue;
    let versions = [];
    try {
      versions = await readSlotVersions(n);
    } catch (_) {}
    slots.push({ n, envelope: env, versions: Array.isArray(versions) ? versions : [] });
  }

  let backups = [];
  try {
    backups = (await window.getRollingBackupsAsync()).map(b => ({
      key: b.key,
      timestamp: b.timestamp,
      data: b.data,
    }));
  } catch (_) {}

  const bundle = {
    bundle: true,
    bundleVersion: 1,
    version: APP_VERSION,
    schemaVersion: APP_VERSION,
    exportedAt: Date.now(),
    robco_v8: _v8,
    chat: _chat,
    playstyle: _playstyle,
    slots,
    backups,
  };
  if (typeof window.computeSaveChecksum === 'function') {
    bundle.checksum = window.computeSaveChecksum(
      { robco_v8: _v8, slots, backups },
      _chat,
      _playstyle
    );
  }
  return bundle;
}
window.buildFullBundle = buildFullBundle;

// Recompute the bundle checksum over the SAME fields buildFullBundle hashed and
// compare (reuse computeSaveChecksum — Protocol 22). Returns true ONLY if a seal
// is present and matches; a missing or mismatched seal → false → reject the import.
function verifyBundleChecksum(parsed) {
  if (typeof window.computeSaveChecksum !== 'function') return false;
  if (!parsed || !parsed.checksum) return false;
  const expected = window.computeSaveChecksum(
    { robco_v8: parsed.robco_v8, slots: parsed.slots, backups: parsed.backups },
    parsed.chat || [],
    parsed.playstyle || ''
  );
  return expected === parsed.checksum;
}
window.verifyBundleChecksum = verifyBundleChecksum;

// Shape guard: a well-formed bundle carries the discriminator + a container + the
// two arrays. Anything else is rejected before any write (no partial apply).
function isValidBundleShape(parsed) {
  return !!(
    parsed &&
    parsed.bundle === true &&
    parsed.robco_v8 &&
    Array.isArray(parsed.slots) &&
    Array.isArray(parsed.backups)
  );
}
window.isValidBundleShape = isValidBundleShape;

// Shared container-write core (sanitize → persist robco_v8/chat/playstyle). Boot
// re-migrates on the following reload, exactly as the single-save import path does.
// Reused by ui-saves.js handleFileUpload (single-save import) AND applyBundleData
// (full-backup import) — Protocol 22, ONE container-apply path, no parallel copy.
function _writeImportedContainer(parsed) {
  const _sanitized =
    typeof sanitizeImportedContainer === 'function'
      ? sanitizeImportedContainer(parsed.robco_v8)
      : parsed.robco_v8;
  localStorage.setItem('robco_v8', JSON.stringify(_sanitized));
  if (parsed.chat && Array.isArray(parsed.chat))
    localStorage.setItem('robco_chat', JSON.stringify(parsed.chat));
  if (parsed.playstyle) localStorage.setItem('robco_playstyle', parsed.playstyle);
}
window._writeImportedContainer = _writeImportedContainer;

// Async: restore ALL storage from an ALREADY-VERIFIED bundle — the live container
// (via the shared _writeImportedContainer core) + every save slot VERBATIM (so each
// envelope keeps its own checksum and still verifies on a later normal load) with
// its P5 version ring. The pre-apply snapRollingBackup (undo point) is the CALLER's
// responsibility. The bundle's rolling-backup ring is intentionally NOT re-injected
// into the live 3-slot ring — that ring must hold the caller's fresh undo snapshot,
// and it is a device-local ephemeral safety net, not primary portable data (it is
// still preserved inside the exported file). Never throws.
async function applyBundleData(parsed) {
  window._writeImportedContainer(parsed);
  for (const s of parsed.slots) {
    if (!s || typeof s.n !== 'number' || s.n < 1 || s.n > 3 || !s.envelope) continue;
    try {
      await _coldWriteObj('robco_slot_' + s.n, 'slot_' + s.n, s.envelope);
    } catch (_) {
      try {
        localStorage.setItem('robco_slot_' + s.n, JSON.stringify(s.envelope));
      } catch (_) {}
    }
    if (window.IdbStore && Array.isArray(s.versions) && s.versions.length) {
      try {
        await window.IdbStore.set('campaign', 'slot_' + s.n + '_versions', s.versions);
      } catch (_) {}
    }
  }
}
window.applyBundleData = applyBundleData;

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
  if (!s.lincolnItems || typeof s.lincolnItems !== 'object' || Array.isArray(s.lincolnItems))
    s.lincolnItems = {};
  Object.keys(s.lincolnItems).forEach(k => {
    if (s.lincolnItems[k] === 'other') s.lincolnItems[k] = 'found';
  });
  if (!Array.isArray(s.traits)) s.traits = [];
  if (!Array.isArray(s.skillBooks)) s.skillBooks = [];
  if (!Array.isArray(s.magazines)) s.magazines = [];
  // P4 Terminal Record: ensure s.eventLog exists, then migrate legacy [T#]
  // auto-log strings out of campaign_notes into it (manual notes stay put;
  // idempotent, non-lossy — the split lives in _migrateEventLog).
  if (!Array.isArray(s.eventLog)) s.eventLog = [];
  _migrateEventLog(s);
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

  // Quick-Draw Holster: normalize padBindings to the fixed 4-key {up,down,left,right}
  // shape, each a trimmed string or null. Drops any stray non-direction keys and
  // rebuilds a missing/malformed (array/non-object) field to the all-empty default.
  if (!s.padBindings || typeof s.padBindings !== 'object' || Array.isArray(s.padBindings)) {
    s.padBindings = { up: null, down: null, left: null, right: null };
  } else {
    const _dirs = ['up', 'down', 'left', 'right'];
    const pb = {};
    _dirs.forEach(d => {
      const v = s.padBindings[d];
      pb[d] = typeof v === 'string' && v.trim() ? v.trim() : null;
    });
    s.padBindings = pb;
  }

  return s;
}
