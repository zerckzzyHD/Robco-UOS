// ── ui-core.js — HUB: BOOT ORCHESTRATOR + MASTER RENDER (2.8.5 U-A1 split remainder) ──
// This is what stayed in the hub after 2.8.5 U-A1 carved five siblings out of
// the former monolithic ui-core.js: bezel nav → ui-core-nav.js, the Director
// Uplink presence → ui-core-overseer.js, the Living Core + casing lamps →
// ui-core-chassis.js, the Module Bay → ui-core-modulebay.js, and the command
// layer (native stat setters, COMMAND_REGISTRY, event-bus subscriber wiring)
// → ui-core-cmd.js. Exposes: the AudioSettings mute-pref cache, the client
// error ring-buffer, window.onload + its ~20 boot-phase functions, loadUI()
// (the master per-tick render pass) and updateMath() (derived-stat repaint +
// audio/visual threshold gates, ends by calling saveState()), appendToChat()'s
// typewriter, the shared #sysModal driver (openModal/closeModal/
// confirmAction), the changelog viewer, and wipeTerminal(). Global scope,
// static <script> tag — loads alongside the rest of the ui-core-*.js family,
// immediately before window.onload fires (see index.html load order).

// Phase 3 · Piece 2 (CARGO MANIFEST drawer bank): default drawer before the
// robco_cargo_drawer MetaStore pref is restored at boot (_restoreDevicePrefs).
// No 'all' drawer exists in the physical pull-drawer design (each item type
// is exactly one drawer away) — 'weapon' mirrors the approved mockup default.
let _invFilter = 'weapon';

// ── RENDER SIGNATURE CACHE (WU-A3) ────────────────────────────
// Tracks the last-rendered state slice per panel. Module scope means the
// object is empty on every page load, so the first loadUI() always does a
// full render. Context switches call window.location.reload(), which clears
// it naturally. _isDirty() returns true (and updates the sig) when a panel's
// slice changed; false when it's unchanged (skip the DOM rebuild).
const _renderSig = {};
function _clearRenderCache() {
  Object.keys(_renderSig).forEach(k => delete _renderSig[k]);
}
function _isDirty(key, slice) {
  const sig = JSON.stringify(slice);
  if (_renderSig[key] === sig) return false;
  _renderSig[key] = sig;
  return true;
}

// ── AUDIO SETTINGS CACHE ──────────────────────────────────────
// Read mute prefs once at startup — avoids localStorage reads on every audio tick
const AudioSettings = {
  typing: MetaStore.get('robco_sfx_muted') === 'true',
  hum: MetaStore.get('robco_hum_muted') === 'true',
  geiger: MetaStore.get('robco_geiger_muted') === 'true',
  tinnitus: MetaStore.get('robco_tinnitus_muted') === 'true',
  ambient: MetaStore.get('robco_ambient_muted') === 'true',
  wake: MetaStore.get('robco_wake_muted') === 'true',
  panelClick: MetaStore.get('robco_panelclick_muted') === 'true', // H1: rotary dial clicks
  bootDrone: MetaStore.get('robco_bootdrone_muted') === 'true', // H4-bonus: boot drone
  levelUp: MetaStore.get('robco_levelup_muted') === 'true', // H3: level up jingle
  heartbeat: MetaStore.get('robco_heartbeat_muted') === 'true', // H4: low health heartbeat
  questComplete: MetaStore.get('robco_questcomplete_muted') === 'true', // quest complete chime
  questFail: MetaStore.get('robco_questfail_muted') === 'true', // quest fail tone
  factionThreshold: MetaStore.get('robco_factionthreshold_muted') === 'true', // faction standing alert
  hardwareSfx: MetaStore.get('robco_hardwaresfx_muted') === 'true', // B2c: chip/board install-eject click
  reactorHum: MetaStore.get('robco_reactorhum_muted') === 'true', // LIVING CORE #6: reactor hum
  // WU-F5 Pip-Boy Radio: ON semantics (true = playing), NOT a mute flag. Default
  // OFF (opt-in). initRadio() does the autoplay-safe first-gesture restore at boot;
  // this initialiser just reflects the saved preference into the cache.
  radio: MetaStore.get('robco_radio_on') === 'true',
  masterMute: MetaStore.get('robco_master_muted') === 'true',
};

// ── CLIENT ERROR RING-BUFFER ──────────────────────────────────
// Local-only diagnostic log — never transmitted. Cap 50 entries × 300 chars ≈ 15 KB max.
const ERROR_LOG_KEY = 'robco_error_log';
const ERROR_LOG_CAP = 50;
let _sysModalTrigger = null;
// Step 2 Phase 0 U12 (FP-SYS-8): callback fired the next time the shared #sysModal
// closes (any path — CLOSE button, Escape, or a confirmAction() Yes/No click). Set
// by openModal({onClose}) / confirmAction(); consumed once by closeModal().
let _modalCloseCallback = null;
function _recordError(type, msg) {
  try {
    const log = JSON.parse(MetaStore.get(ERROR_LOG_KEY) || '[]');
    log.push({ t: Date.now(), type, msg: String(msg).slice(0, 300) });
    while (log.length > ERROR_LOG_CAP) log.shift();
    MetaStore.set(ERROR_LOG_KEY, JSON.stringify(log));
  } catch (_) {} // never let logging throw
  _updateFaultLamp();
}

// Shared reader (Protocol 22) — the casing FAULT lamp, the BUS-24 fault
// annunciator, and the LIVING CORE's fault-strain signal (#6) all read the
// SAME client error ring-buffer through this one function, so they can never
// disagree on the buffered-fault count.
function _readErrorLog() {
  try {
    return JSON.parse(MetaStore.get(ERROR_LOG_KEY) || '[]');
  } catch (_) {
    return [];
  }
}

// ── GLOBAL ERROR NET ──────────────────────────────────────────
// Catches uncaught JS errors and unhandled promise rejections and surfaces a
// recoverable on-screen diagnostic instead of leaving the user with a blank screen.
window.addEventListener('error', ev => {
  const msg =
    (ev.message || 'Unknown error') + (ev.filename ? ` [${ev.filename}:${ev.lineno}]` : '');
  console.error('[RobCo] Uncaught error:', msg, ev.error);
  _recordError('error', msg);
  const diag = document.getElementById('chatDisplay');
  if (diag) {
    const el = document.createElement('div');
    el.className = 'msg-sys';
    el.textContent = `> ⚠ SYSTEM FAULT — ${msg} — save your data and reload.`;
    diag.appendChild(el);
  }
});
window.addEventListener('unhandledrejection', ev => {
  const reason =
    ev.reason instanceof Error ? ev.reason.message : String(ev.reason || 'Unhandled rejection');
  console.error('[RobCo] Unhandled rejection:', reason, ev.reason);
  _recordError('rejection', reason);
  const diag = document.getElementById('chatDisplay');
  if (diag) {
    const el = document.createElement('div');
    el.className = 'msg-sys';
    el.textContent = `> ⚠ ASYNC FAULT — ${reason} — save your data and reload.`;
    diag.appendChild(el);
  }
});

// ── CHANGE GUARDS (skip audio calls when nothing changed) ──────
let _lastRads = -1,
  _lastCrippled = false;

// ── CHAT HISTORY PERSISTENCE ───────────────────────────────────
let _chatSaveTimer = null;
const CHAT_MAX = 200; // max messages kept in memory; last 50 written to localStorage

// ── BOOT SEQUENCE (window.onload) ──────────────────────────────
// Decomposed into named, order-preserving phases (Step 2 Phase 0 U2). Each
// function below is a straight extraction of one contiguous section of the
// former monolithic window.onload body — no logic was added, removed, or
// reordered. window.onload (bottom of this section) calls them in the exact
// original source order; do not reorder without re-auditing every boot/
// lifecycle entry path in planning/STEP2_PHASE0_PLAN.md.

// ── STANDBY MODE + AMBIENT-TIMER STATE ─────────────────────────
// Module-scope because the standby coordinator (enterStandby/exitStandby) and the
// ambient observers share `sessionStart`. Phase 2 A2 migrated the uptime clock and
// memory-cycle flash off their own setIntervals onto the Ambient Runtime: they are
// now runtime observers (registered in _startAmbientTimers) that tick only in the
// awake states (['ACTIVE','IDLE']) — so the runtime pauses them on STANDBY and
// restarts their cadence on wake automatically (byte-identical to the old
// enterStandby-clears / exitStandby-restarts behavior), and their dial gate is the
// runtime's tier check. enterStandby/exitStandby no longer manage those intervals.
let _standbyActive = false;
let sessionStart = 0;

// Uptime-clock observer tick: refresh the HH:MM:SS since-boot readout. tier 'minimal'
// (baseline telemetry — never dial-quieted), cadence 1000ms, awake states only.
function _tickUptimeClock() {
  let elapsed = Math.floor((Date.now() - sessionStart) / 1000);
  let h = Math.floor(elapsed / 3600),
    m = Math.floor((elapsed % 3600) / 60),
    s = elapsed % 60;
  let el = document.getElementById('uptimeClock');
  if (el)
    el.innerText = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  // LIVING CORE #8 uptime-milestone pulse — a one-shot celebratory flourish
  // each time this session's uptime crosses a whole hour. h > 0 skips the
  // (uninteresting) 0-hour mark; the in-memory _lastCoreUptimeMilestone guard
  // (declared alongside the other LIVING CORE transient signals above) means
  // this fires exactly once per crossed hour, never once per second.
  if (h > _lastCoreUptimeMilestone) {
    _lastCoreUptimeMilestone = h;
    if (typeof _coreMilestonePulse === 'function') _coreMilestonePulse();
  }
}

// Memory-cycle observer tick: the periodic ambient "memory cycle" flash. Registered
// at tier 'balanced', so the RUNTIME enforces the Immersion dial (runs at Full/
// Balanced, silent at Minimal) — the single enforcement point, no internal re-check.
function _tickMemCycle() {
  appendToChat('> MEMORY CYCLE COMPLETE. 64K STABLE.', 'sys', true);
  document.body.style.filter = 'brightness(0.35)';
  setTimeout(() => {
    document.body.style.filter = '';
  }, 150);
}

function enterStandby() {
  if (_standbyActive) return;
  _standbyActive = true;
  document.body.classList.add('standby');
  geigerRunning = false;
  if (geigerTimeout) {
    clearTimeout(geigerTimeout);
    geigerTimeout = null;
  }
  _geigerCurrentRate = -1;
  if (crtHumGain) {
    crtHumGain.gain.cancelScheduledValues(audioCtx.currentTime);
    crtHumGain.gain.linearRampToValueAtTime(0, audioCtx.currentTime + 0.5);
  }
  // The uptime + memory-cycle observers pause automatically (STANDBY ∉ their states);
  // no manual interval clearing needed. Only the self-scheduling audio heartbeat has
  // to be stopped explicitly here.
  stopHeartbeat();
}

// A3 (Protocol 42): the standby "wake" sequence (tone + audio ramp + the
// "COURIER RETURNED" chat line) is a return-to-active-use behavior — it must
// fire ONLY when the terminal is genuinely coming back, never on a power-down.
// STANDBY→SHUTDOWN is a legal runtime edge (forced via the Test Console
// today), but a shutdown could also land AFTER a normal wake has already
// started (mid-way through the 650ms window below). Rather than checking
// once up front — which only catches the direct STANDBY→SHUTDOWN edge and
// misses a shutdown landing during the delay — each half of the wake
// sequence re-checks the runtime state at that HALF's own fire time: once,
// synchronously, right before the tone (its fire time is now); again inside
// the setTimeout, right before the ramp/chat/geiger-resync (its fire time is
// 650ms later). Either check no-oping is enough on its own to stop the whole
// sequence from completing — this is deliberately more robust than trying to
// cancel the pending timer from elsewhere.
function _isShuttingDown() {
  return (
    typeof AmbientRuntime !== 'undefined' &&
    (AmbientRuntime.getState() === 'SHUTDOWN' || AmbientRuntime.getState() === 'OFF')
  );
}

function exitStandby() {
  if (!_standbyActive) return;
  _standbyActive = false;
  if (_isShuttingDown()) return; // fire time for the tone is now — skip it too
  playWakeTone();
  setTimeout(() => {
    // Re-check AT THIS ACTION'S OWN FIRE TIME: a shutdown that landed sometime
    // during the 650ms window (after the tone already played above) still
    // must not surface the ramp/chat/geiger-resync — the shutdown-crt
    // observer's own onEnter already force-clears the standby class, so
    // nothing is left stuck either way.
    if (_isShuttingDown()) return;
    document.body.classList.remove('standby');
    if (crtHumGain) {
      crtHumGain.gain.cancelScheduledValues(audioCtx.currentTime);
      crtHumGain.gain.linearRampToValueAtTime(0.007, audioCtx.currentTime + 0.5);
    }
    appendToChat('> COURIER RETURNED. SYNCHRONIZING TELEMETRY...', 'sys', true);
    let _rads = parseInt(document.getElementById('stat_rads').value) || 0;
    setGeigerRate(_rads >= 1000 ? 25 : _rads >= 600 ? 12 : _rads >= 200 ? 0.33 : 0);
    // The uptime + memory-cycle observers resume automatically on the ACTIVE re-entry
    // (the runtime restarts their cadence clock), so no manual restart here.
    updateMath();
  }, 650);
}

// ── BOOT PHASE FUNCTIONS (called in order from window.onload) ───

// ── P2: DEVICE-PREF BOOT HYDRATION / RECONCILIATION (Step 2 · Phase 1) ───────
// The first read path to consult IndexedDB. On boot, reconcile the device-pref
// ('meta') store against localStorage BEFORE the rest of boot reads any pref.
//
// AUTHORITY RULE — localStorage is the source of record. When localStorage HAS a
// device key, it wins; IndexedDB never overwrites a present localStorage value.
// The one exception (the durability payoff) is RECOVERY: a device key IndexedDB
// has but localStorage is MISSING is restored to localStorage, so a preference
// survives a localStorage clear/eviction that IndexedDB outlived — and only if
// the record's stored checksum still verifies (a corrupt IDB record is skipped,
// never restored). In the other direction, BACKFILL mirrors any device key
// localStorage has but IDB lacks (e.g. a pre-P1 preference) into IDB so the
// shadow becomes complete — IDB-only, never touching localStorage. Campaign data
// is untouched: P2 reconciles only the 'meta' store (the 'campaign' store stays
// for a later unit). Game-agnostic (Protocol 38) — operates on keys/values only.
async function _reconcileMetaFromIdb() {
  if (typeof window === 'undefined' || !window.IdbStore) return { recovered: 0, backfilled: 0 };
  let idbKeys;
  try {
    idbKeys = await window.IdbStore.keys('meta');
  } catch (_) {
    return { recovered: 0, backfilled: 0 };
  }
  if (!Array.isArray(idbKeys)) idbKeys = [];
  const idbSet = new Set(idbKeys);
  let recovered = 0;
  let backfilled = 0;

  // Direction 1 — RECOVERY (IDB → localStorage, only when localStorage is missing).
  // Gated on MetaStore.has so ONLY registered device keys are ever restored —
  // symmetric with backfill, so a stray non-device key in the 'meta' store could
  // never be resurrected into localStorage (defense-in-depth two-store boundary).
  for (const key of idbKeys) {
    if (!MetaStore.has(key)) continue; // registered device keys only
    let lsV = null;
    try {
      lsV = localStorage.getItem(key);
    } catch (_) {}
    if (lsV !== null) continue; // localStorage present → localStorage wins
    let rec = null;
    try {
      rec = await window.IdbStore.getRaw('meta', key);
    } catch (_) {}
    if (!rec || typeof rec.value !== 'string') continue;
    // Integrity gate: never restore a corrupt IDB record.
    if (
      rec.checksum &&
      typeof window.computeSaveChecksum === 'function' &&
      window.computeSaveChecksum(rec.value, [], '') !== rec.checksum
    ) {
      continue;
    }
    // MetaStore.set restores localStorage AND re-shadows to IDB (idempotent).
    MetaStore.set(key, rec.value);
    recovered++;
    // SAVE_LAYER3: stash the ONE recovery fact the eviction signature needs —
    // the boot marker was ABSENT from localStorage this boot (this loop runs
    // solely for keys localStorage lacked) and came back from IDB. Set here,
    // at the recovery moment itself (never a later re-read), so a slow-IDB
    // budget expiry simply leaves it unset and the eviction check stays
    // silent this boot — false negatives are the accepted direction (never a
    // late banner popping mid-session).
    if (key === 'robco_booted_before') window._bootMarkerRecovered = true;
  }

  // Direction 2 — BACKFILL (localStorage → IDB, only when IDB lacks the key).
  // Restricted to REGISTERED device keys (MetaStore.has) so a campaign key can
  // never leak into the 'meta' store (two-store boundary).
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (!key || idbSet.has(key) || !MetaStore.has(key)) continue;
      let v = null;
      try {
        v = localStorage.getItem(key);
      } catch (_) {}
      if (v === null) continue;
      const p = window.IdbStore.set('meta', key, v); // IDB-only; never writes localStorage
      if (p && typeof p.catch === 'function') p.catch(() => {});
      backfilled++;
    }
  } catch (_) {}

  return { recovered, backfilled };
}

// Awaited boot phase. BOUNDED so a slow/hung IndexedDB can never delay boot:
// normal boots resolve in ~0ms (idb.js opened the connection at page-parse time,
// long before onload), and a pathological hang is capped at _META_HYDRATE_BUDGET_MS,
// after which boot proceeds on localStorage exactly as today (fail-safe default —
// a still-pending reconciliation may finish harmlessly in the background). Never
// rejects; if IdbStore is absent it resolves immediately (byte-identical boot).
const _META_HYDRATE_BUDGET_MS = 1000;
function _hydrateMetaFromIdb() {
  try {
    if (typeof window === 'undefined' || !window.IdbStore) return Promise.resolve();
    return Promise.race([
      _reconcileMetaFromIdb().catch(() => {}),
      new Promise(resolve => setTimeout(resolve, _META_HYDRATE_BUDGET_MS)),
    ]);
  } catch (_) {
    return Promise.resolve();
  }
}

function _hydrateStateFromStorage() {
  // Snapshot current state as rolling backup before any boot migration (Protocol: Rolling Backups)
  if (typeof window.snapRollingBackup === 'function') window.snapRollingBackup();
  let v8Str = localStorage.getItem('robco_v8');
  let v7Str = localStorage.getItem('robco_v7');

  let loadedOk = false;
  if (v8Str) {
    // SAVE_LAYER3 split-try: the OUTER try holds ONLY what genuinely means
    // "the stored bytes are unreadable" — parse, container-shape access, the
    // state merge. The post-load migration helpers run OUTSIDE it in their own
    // fail-soft catches below, so a helper bug on a perfectly VALID save
    // degrades one nicety instead of quarantining (formerly: DELETING) the
    // whole campaign — the latent Layer-3 defect this structure fixes.
    let v8Parsed = false;
    try {
      window.robco_v8 = JSON.parse(v8Str);
      let activeCampaign = window.robco_v8.campaigns[window.robco_v8.activeContext] || {};
      state = { ...state, ...activeCampaign };
      state.gameContext = window.robco_v8.activeContext;
      v8Parsed = true;
    } catch (e) {
      // Capture-then-remove — the corrupt bytes are preserved whole in the
      // quarantine envelope, never silently destroyed (SAVE_LAYER3).
      _quarantineCorruptContainer('robco_v8', v8Str, e);
    }
    if (v8Parsed) {
      // P4: the v8 fast-path skips migrateState, so run the Terminal Record
      // [T#]→eventLog migration here too — existing v8 saves migrate on load
      // (idempotent + non-lossy; leaves manual notes in campaign_notes).
      // Fail-soft (SAVE_LAYER3): a throw here is a helper bug, NOT a corrupt
      // save — log loudly, boot with the un-helped state, never quarantine.
      try {
        if (typeof window._migrateEventLog === 'function') window._migrateEventLog(state);
      } catch (e) {
        console.error('[RobCo] _migrateEventLog failed on a valid save (fail-soft):', e);
        try {
          _recordError('error', 'BOOT MIGRATION FAULT (eventLog): ' + String(e).slice(0, 200));
        } catch (_) {}
      }
      // Same reason: a stale state.equipped reference would otherwise never
      // heal on a plain reload — this fast-path skips migrateState() (where
      // reconcileEquipped() normally runs). loadUI() repaints after boot.
      try {
        if (typeof reconcileEquipped === 'function') reconcileEquipped(state);
      } catch (e) {
        console.error('[RobCo] reconcileEquipped failed on a valid save (fail-soft):', e);
        try {
          _recordError('error', 'BOOT MIGRATION FAULT (equipped): ' + String(e).slice(0, 200));
        } catch (_) {}
      }
      loadedOk = true;
    }
  }
  if (!loadedOk && v7Str) {
    // SAVE_LAYER3 F1 — separate a READ/PARSE failure from a WRITE-side failure
    // on the legacy migration path. ONLY the JSON.parse sits in the
    // quarantine-triggering catch: a v7 whose BYTES are unreadable is genuinely
    // corrupt → quarantine is correct. But if the v7 PARSES FINE and then
    // migrateState throws, or the migrated v8 container cannot be PERSISTED
    // (quota), the original robco_v7 bytes are HEALTHY — they are left exactly
    // where they are, never quarantined, still loadable next boot — and the
    // failure is surfaced LOUDLY instead of swallowed. "couldn't read it"
    // (quarantine) is a different failure from "couldn't save it" (fail loud).
    let v7Parsed = null;
    let v7Unreadable = false;
    try {
      v7Parsed = JSON.parse(v7Str);
    } catch (e) {
      // Genuinely unreadable bytes → quarantine (preserved whole, not erased).
      v7Unreadable = true;
      _quarantineCorruptContainer('robco_v7', v7Str, e);
    }
    if (!v7Unreadable) {
      try {
        let savedState =
          typeof migrateState === 'function'
            ? migrateState(v7Parsed.version || '1.0', v7Parsed)
            : v7Parsed;

        window.robco_v8 = {
          activeContext: savedState.gameContext || 'FNV',
          campaigns: {},
        };
        window.robco_v8.campaigns[window.robco_v8.activeContext] = savedState;

        // WRITE-side: a quota/persist failure here must NOT quarantine — the
        // original robco_v7 is untouched and still loadable next boot. Fail
        // LOUD (fault + banner), then still boot with the in-memory migrated
        // campaign so the user sees their data THIS session; the untouched v7
        // is retried (idempotently) on the next boot.
        try {
          localStorage.setItem('robco_v8', JSON.stringify(window.robco_v8));
        } catch (writeErr) {
          _reportMigrationWriteFault('robco_v7', writeErr);
        }

        state = { ...state, ...savedState };
        state.gameContext = window.robco_v8.activeContext;
        loadedOk = true;
      } catch (migErr) {
        // migrateState (or the container build) threw on a save that PARSED
        // FINE — a migration bug, NOT unreadable bytes. Do NOT quarantine;
        // leave robco_v7 intact for recovery once the bug is fixed. Fail LOUD
        // and fall through to a fresh boot (state was not mutated above, so the
        // fresh branch wraps pristine defaults, never partial data).
        _reportMigrationWriteFault('robco_v7', migErr);
      }
    }
  }
  if (!loadedOk) {
    window.robco_v8 = {
      activeContext: 'FNV',
      campaigns: { FNV: state },
    };
    if (typeof migrateState === 'function') {
      window.robco_v8.campaigns['FNV'] = migrateState(
        APP_VERSION,
        window.robco_v8.campaigns['FNV']
      );
      state = { ...window.robco_v8.campaigns['FNV'] };
    }
  }
  // ── FACTION MIGRATION: old flat keys (nf/ni/lf/li/sf/si) → state.factions ──
  if (state.nf !== undefined) {
    if (!state.factions) state.factions = {};
    getFactionRegistry().forEach(f => {
      if (!state.factions[f.key]) state.factions[f.key] = { fame: 0, infamy: 0 };
    });
    state.factions.ncr.fame = state.nf || 0;
    state.factions.ncr.infamy = state.ni || 0;
    state.factions.legion.fame = state.lf || 0;
    state.factions.legion.infamy = state.li || 0;
    state.factions.house.fame = state.sf || 0; // sf/si → house (Mr. House)
    state.factions.house.infamy = state.si || 0;
    ['nf', 'ni', 'lf', 'li', 'sf', 'si', 'ncr', 'leg'].forEach(k => delete state[k]);
    // SAVE_LAYER3 F1 hardening (Protocol 42): the in-memory faction migration
    // above already applied — this setItem only PERSISTS it. Wrapped so a quota
    // failure here can never throw out of boot (the F1 write-fault path now
    // reaches this line with a healthy campaign under storage pressure, where
    // an unwrapped throw would black-screen; next boot re-runs this idempotent
    // migration). The migrated state is fully usable this session regardless.
    try {
      localStorage.setItem('robco_v7', JSON.stringify(state));
    } catch (_) {}
  }
  // Ensure all 14 faction keys exist (handles older saves missing new factions)
  if (!state.factions) state.factions = _buildFactions();
  getFactionRegistry().forEach(f => {
    if (!state.factions[f.key]) state.factions[f.key] = { fame: 0, infamy: 0 };
  });

  // ── SAVE_LAYER3 read-side fail-loud (banner triggers) ─────────────────────
  // The valid-save (L2) cost here is ONE localStorage existence check.
  // Trigger 1 (READ FAULT) re-shows every boot while an unresolved quarantine
  // exists — an unrecovered campaign-loss artifact is a live condition, the
  // same rationale as the Layer-2 banner re-showing while persistence is
  // denied. PURGE (saves list) retires it.
  // Trigger 2 (EVICTION) requires the affirmative three-part signature: the
  // boot marker was ABSENT from localStorage pre-reconcile AND recovered from
  // IDB THIS boot (both collapsed into window._bootMarkerRecovered — set only
  // inside _reconcileMetaFromIdb's recovery loop, which runs solely for keys
  // localStorage lacked) AND no campaign container of either vintage exists.
  // First-ever boots (no marker anywhere), swipe-away no-save boots (marker
  // present in localStorage), post-quarantine boots (marker present) and
  // slow-IDB boots (stash unset at budget expiry) all fail the signature and
  // stay SILENT — false negatives are the accepted, conservative direction.
  try {
    let hasQuarantine = false;
    try {
      hasQuarantine = localStorage.getItem('robco_v8_quarantine') !== null;
    } catch (_) {}
    if (hasQuarantine || window._quarantinedEnvelope) {
      _showReadFaultBanner('corrupt');
    } else if (!v8Str && !v7Str && window._bootMarkerRecovered === true) {
      _showReadFaultBanner('evicted');
      try {
        MetaStore.set('robco_eviction_detected', String(Date.now()));
      } catch (_) {}
      try {
        _recordError(
          'error',
          'EVICTION DETECTED: host reclaimed localStorage (boot marker recovered from cold storage; no campaign container found)'
        );
      } catch (_) {}
    }
  } catch (_) {
    /* the fail-loud layer must never itself break boot (Protocol 33) */
  }
}

// ── SAVE_INTEGRITY_PASS Layer 2 — STORAGE PERSISTENCE REQUEST (boot phase) ──
// Clone #storageWarningBannerTemplate (index.html, WU-E2 inert-template
// pattern) into the DOM — the same clone-a-<template> idiom the Diagnostic
// Shell panel already uses (js/dev/test-console.js). Shown ONLY on a denied
// result; never on granted/unknown. Idempotent (a second call while the
// banner is already up is a no-op) and dismissible for the session (tap to
// hide) — the MetaStore record is what stops it from re-prompting every boot.
function _showStorageWarningBanner(coldStoreOffline) {
  try {
    if (document.getElementById('storageWarningBanner')) return; // already shown
    const tpl = document.getElementById('storageWarningBannerTemplate');
    if (!tpl) return;
    const frag = tpl.content.cloneNode(true);
    const banner = frag.querySelector('#storageWarningBanner');
    if (banner) {
      // SAVE_LAYER3 tail rider: persistence denied AND IndexedDB wholly
      // absent = NO durability net at all — compound the copy so the user
      // knows the cold-storage fallback is offline too (the template's base
      // copy is untouched for the ordinary denied path).
      if (coldStoreOffline) banner.textContent = _STORAGE_BANNER_NOIDB_MSG;
      banner.style.display = 'flex';
      banner.addEventListener('click', () => banner.remove());
    }
    document.body.prepend(frag);
  } catch (_) {
    /* a warning banner must never break boot */
  }
}

// ── SAVE_LAYER3 — READ-SIDE FAIL-LOUD (quarantine + banner) ─────────────────
// Layer 3 of the SAVE_INTEGRITY_PASS: a save that cannot be READ is set aside
// whole (quarantined) and announced — never silently deleted. The recovery
// affordance (EXPORT / confirm-gated PURGE) lives in the saves list
// (ui-account.js / ui-saves.js); this file owns the boot-read capture and the
// banner. Wording is game-agnostic (Protocol 38) with no code identifiers in
// user-facing copy (Protocol 21 spirit).
const _READ_FAULT_BANNER_MSG =
  '> MEMORY CORE READ FAULT — PRIOR CAMPAIGN DATA COULD NOT BE READ AND HAS BEEN QUARANTINED, NOT ERASED. RECOVER OR EXPORT IT FROM THE SAVES LIST. (TAP TO DISMISS)';
const _EVICTION_BANNER_MSG =
  '> MEMORY CORE EVICTION DETECTED — THE HOST RECLAIMED LOCAL DATA. PRIOR SLOTS AND BACKUPS MAY SURVIVE IN COLD STORAGE — CHECK THE SAVES LIST OR IMPORT A SAVE FILE. (TAP TO DISMISS)';
const _STORAGE_BANNER_NOIDB_MSG =
  '> MEMORY CORE UNSTABLE — HOST WILL NOT GUARANTEE PERSISTENCE, AND COLD STORAGE IS OFFLINE. EXPORT A SAVE FILE REGULARLY. (TAP TO DISMISS)';

// Byte-for-byte the Layer-2 shower idiom above (Protocol 22): clone the inert
// template, fill the message node, display, tap-to-dismiss, prepend — the
// whole body wrapped so a warning banner can never break boot. Idempotent (a
// second call while the banner is up is a no-op). kind: 'corrupt' | 'evicted'.
function _showReadFaultBanner(kind) {
  try {
    if (document.getElementById('readFaultBanner')) return; // already shown
    const tpl = document.getElementById('readFaultBannerTemplate');
    if (!tpl) return;
    const frag = tpl.content.cloneNode(true);
    const banner = frag.querySelector('#readFaultBanner');
    if (banner) {
      const msg = banner.querySelector('#readFaultBannerMsg');
      if (msg) msg.textContent = kind === 'evicted' ? _EVICTION_BANNER_MSG : _READ_FAULT_BANNER_MSG;
      banner.style.display = 'flex';
      banner.addEventListener('click', () => banner.remove());
    }
    document.body.prepend(frag);
  } catch (_) {
    /* a warning banner must never break boot */
  }
}
// Diagnostic Shell trigger entry point (Protocol 44) — display-only.
window._showReadFaultBanner = _showReadFaultBanner;

// Capture-then-remove — NEVER delete-only (SAVE_LAYER3 hard invariant: no
// corrupt bytes are destroyed without a preserved copy). The envelope is
// built from the in-memory string FIRST; the corrupt key is removed BEFORE
// the quarantine setItem so the copy fits in roughly the freed localStorage
// footprint (writing first would double the blob's footprint and likely
// quota-fail). Every step is individually wrapped — the quarantine itself
// must never become a new boot failure mode (Protocol 33).
function _quarantineCorruptContainer(sourceKey, rawStr, err) {
  const envelope = {
    quarantinedAt: Date.now(),
    sourceKey: sourceKey,
    reason: String(err).slice(0, 300),
    // The exact corrupt bytes, whole — NEVER truncated (a truncated
    // quarantine is destroyed data with extra steps).
    raw: String(rawStr),
  };
  console.error(
    '[RobCo] Corrupt ' + sourceKey + ' — quarantined (bytes preserved), booting fresh:',
    err
  );
  try {
    localStorage.removeItem(sourceKey);
  } catch (_) {}
  // localStorage leg — best-effort, and NEVER overwrites an earlier
  // unresolved quarantine (the first corruption is almost certainly the
  // long-lived campaign; a later one is at most a short-lived fresh one).
  let lsHeld = false;
  try {
    if (localStorage.getItem('robco_v8_quarantine') === null) {
      localStorage.setItem('robco_v8_quarantine', JSON.stringify(envelope));
      lsHeld = true;
    }
  } catch (_) {}
  // IDB leg — the durable, ceiling-free home. Campaign-side data goes to the
  // 'campaign' store, never 'meta' (Protocol 23 two-store boundary).
  // Fire-and-forget: no new awaits in boot. A quarantine that couldn't take
  // the primary localStorage slot goes under a stamped key instead; stamped
  // extras are swept to the newest 3.
  try {
    if (window.IdbStore) {
      const idbKey = lsHeld ? 'quarantine' : 'quarantine_' + envelope.quarantinedAt;
      const p = window.IdbStore.set('campaign', idbKey, envelope);
      if (p && typeof p.catch === 'function') p.catch(() => {});
      if (!lsHeld) {
        const sweep = window.IdbStore.keys('campaign').then(keys => {
          const stamped = (keys || [])
            .filter(k => /^quarantine_\d+$/.test(String(k)))
            .sort((a, b) => Number(String(b).slice(11)) - Number(String(a).slice(11)));
          return Promise.all(stamped.slice(3).map(k => window.IdbStore.remove('campaign', k)));
        });
        if (sweep && typeof sweep.catch === 'function') sweep.catch(() => {});
      }
    }
  } catch (_) {}
  // In-memory fallback: if the primary localStorage slot didn't take THIS
  // envelope, keep it reachable for the saves-list export affordance this
  // session regardless of how the fire-and-forget IDB write fares.
  if (!lsHeld) window._quarantinedEnvelope = envelope;
  try {
    MetaStore.set('robco_read_fault', String(envelope.quarantinedAt));
  } catch (_) {}
  try {
    _recordError(
      'error',
      'READ FAULT: ' + sourceKey + ' unreadable — quarantined, not erased. ' + envelope.reason
    );
  } catch (_) {}
}

// SAVE_LAYER3 F1 — a WRITE-side failure on a save that READ FINE. The original
// bytes are HEALTHY and are NEVER quarantined; but the migrated result could
// not be persisted (quota), or a migrateState bug threw, so the failure is
// surfaced LOUDLY rather than swallowed — the Layer-1 fail-loud bar. This is
// deliberately NOT the quarantine path: "couldn't read it" quarantines the
// unreadable bytes; "couldn't save it" leaves the healthy save alone and just
// tells the user. Reuses the Layer-2 storage-warning banner (a persistence
// failure is exactly what it announces — Protocol 22, no new banner) plus the
// FAULT-lamp error ring. Wholly wrapped: the fail-loud layer must never itself
// break boot (Protocol 33).
function _reportMigrationWriteFault(sourceKey, err) {
  try {
    console.error(
      '[RobCo] ' +
        sourceKey +
        ' migration WRITE failed — original bytes left intact (NOT quarantined):',
      err
    );
  } catch (_) {}
  try {
    _recordError(
      'error',
      'MIGRATION WRITE FAULT: ' +
        sourceKey +
        ' read fine but the upgraded save could not be persisted — original left intact, not quarantined. ' +
        String(err).slice(0, 200)
    );
  } catch (_) {}
  try {
    _showStorageWarningBanner();
  } catch (_) {}
}

// Fire-and-forget: ask the browser to make this origin's storage persistent
// (survive eviction under storage pressure) so the sacred live campaign
// container — localStorage-only, no IndexedDB durability shadow — is less
// likely to be silently reclaimed (e.g. iOS Safari's ~2-week/low-storage
// eviction). Feature-detected and fully wrapped: this must NEVER throw into
// boot or block it (Protocol 33 fail-safe spirit) — called un-awaited from
// window.onload, after _hydrateStateFromStorage() so a campaign already
// exists. Records 'granted'|'denied' to the robco_storage_persisted device
// pref (Protocol 23 — a browser/device property, never campaign state) and
// shows the diegetic warning banner only when denied.
function _requestPersistentStorage() {
  try {
    if (!navigator.storage || typeof navigator.storage.persist !== 'function') return;
    Promise.resolve()
      .then(async () => {
        let granted = false;
        if (typeof navigator.storage.persisted === 'function') {
          granted = await navigator.storage.persisted();
        }
        if (!granted) {
          granted = await navigator.storage.persist();
        }
        let result = granted ? 'granted' : 'denied';
        // SAVE_LAYER3 tail rider: denied persistence with IndexedDB wholly
        // absent means the campaign has NO durability net at all — record the
        // sharper detail and compound the banner copy. Grep-confirmed
        // (Protocol 8 stage 2): nothing in js/ consumes the exact 'denied'
        // string, and the behavioral gate's denied-assert runs with
        // IndexedDB present, where the value stays plain 'denied'.
        if (result === 'denied' && !window.IdbStore) result = 'denied-noidb';
        MetaStore.set('robco_storage_persisted', result);
        if (result !== 'granted') _showStorageWarningBanner(result === 'denied-noidb');
      })
      .catch(() => {
        /* a rejected persist()/persisted() call must never surface to boot */
      });
  } catch (_) {
    /* never throw into boot — absent/misbehaving navigator.storage is fine */
  }
}

// ── API KEY / CHAT-HISTORY RESTORE + STANDBY WIRING (boot phases) ──
function _restoreApiKeyAndChatHistory() {
  if (MetaStore.get('robco_gemini_key')) {
    document.getElementById('apiKeyInput').value = MetaStore.get('robco_gemini_key');
  }
  if (MetaStore.get('robco_gemini_key_sync') === 'true') {
    const syncEl = document.getElementById('geminiKeySyncToggle');
    if (syncEl) syncEl.checked = true;
  }
  if (MetaStore.get('robco_gemini_model')) {
    let savedModel = MetaStore.get('robco_gemini_model');
    const safeModel = escapeHtml(savedModel);
    document.getElementById('apiModelInput').innerHTML =
      `<option value="${safeModel}">${safeModel} (Secured)</option>`;
  }
  try {
    if (localStorage.getItem('robco_chat')) {
      chatHistory = JSON.parse(localStorage.getItem('robco_chat'));
      document.getElementById('chatDisplay').innerHTML = '';
      chatHistory.forEach(msg => appendToChat(msg.text, msg.sender, true));
    } else {
      appendToChat('> SYSTEM INITIALIZED. DIAGNOSTIC CORE ACTIVE...', 'sys', true);
    }
  } catch (e) {
    chatHistory = [];
    localStorage.removeItem('robco_chat');
    appendToChat('> SYSTEM INITIALIZED. DIAGNOSTIC CORE ACTIVE...', 'sys', true);
  }
}

function _wireRotaryDialClick() {
  // H1: Rotary Dial Click — fire on any <details> panel toggle inside uiPanel
  const _uiPanel = document.getElementById('uiPanel');
  if (_uiPanel) {
    _uiPanel.addEventListener('toggle', () => playPanelClick(), true);
  }
}

function _wireStandby() {
  // ── TAB STANDBY MODE — driven by the Ambient Runtime (Phase 2 A2) ──────────
  // A1 made the runtime own the blur / focus / visibilitychange → STANDBY / ACTIVE
  // transitions. A2 folds the standby dim + audio ducking (formerly wired to those
  // events directly) into the runtime's STANDBY on-enter / on-exit as a single
  // coordinator observer — so the runtime is the ONE lifecycle driver and the old
  // direct blur/focus/visibilitychange listeners are retired (no double-wiring, no
  // double-dim). enterStandby / exitStandby are unchanged and keep their own
  // idempotency guard (belt-and-suspenders; the runtime already single-fires
  // onEnter/onExit per STANDBY crossing).
  //
  // tier 'minimal': standby response is ESSENTIAL feedback — the terminal must
  // visibly/audibly react to tab-out/in at every immersion level — so it never
  // quiets. (onEnter/onExit are lifecycle hooks and are not tier-gated regardless;
  // 'minimal' documents the intent.)
  AmbientRuntime.register({
    id: 'standby',
    states: ['STANDBY'],
    tier: 'minimal',
    onEnter: enterStandby,
    onExit: exitStandby,
  });
}

// ── A3: IDLE / STANDBY / SHUTDOWN AMBIENT EXPERIENCES ──────────────────────
// The showcase consumers of the runtime states, layered on top of the A2
// standby machine + timers (unchanged). Pure CSS-class toggles driven by
// onEnter/onExit — the runtime does NOT tier-gate onEnter/onExit itself
// (only onTick, re-checked every beat — see runtime.js's _beat()), so each
// one-shot lifecycle hook below checks immersionAllows() itself, the same
// convention _wireStandby documents for its own 'minimal' tier. Writes
// NOTHING durable to the campaign anywhere here (Phase-2 invariant #1) —
// body classList toggles only, never state/saveState/eventLog.
function _wireAmbientExperiences() {
  // IDLE — phosphor-preservation screensaver flourish (a gentle dim + a small
  // diegetic corner note). tier 'balanced': quiet at Minimal, on at Balanced/
  // Full. Reverts the instant any interaction fires (noteActivity() already
  // transitions IDLE→ACTIVE, crossing this observer's onExit).
  AmbientRuntime.register({
    id: 'idle-phosphor',
    states: ['IDLE'],
    tier: 'balanced',
    onEnter: () => {
      if (typeof immersionAllows === 'function' && !immersionAllows('balanced')) return;
      document.body.classList.add('rt-idle');
    },
    onExit: () => document.body.classList.remove('rt-idle'),
  });

  // STANDBY (deepen) — an ADDITIONAL flourish layered over the A2 essential
  // dim (which stays tier 'minimal', unchanged, in _wireStandby above). tier
  // 'balanced': the essential .standby dim/text never quiets; this extra
  // vignette pulse does, at Minimal.
  AmbientRuntime.register({
    id: 'standby-deepen',
    states: ['STANDBY'],
    tier: 'balanced',
    onEnter: () => {
      if (typeof immersionAllows === 'function' && !immersionAllows('balanced')) return;
      document.body.classList.add('standby-deep');
    },
    onExit: () => document.body.classList.remove('standby-deep'),
  });

  // SHUTDOWN — a proper CRT power-down. tier 'full': the dramatic collapse-
  // to-a-dot flourish only at Full; Balanced/Minimal degrade to a plain
  // instant cut (rt-shutdown-plain) — the terminal is never left in a broken
  // half-state at any tier.
  //
  // states includes OFF so the visual PERSISTS across the internal
  // SHUTDOWN→OFF cascade (AmbientRuntime.shutdown() fires both transitions
  // back-to-back, synchronously): onEnter only fires crossing INTO this
  // observer's state set (not on the internal SHUTDOWN→OFF hop, since both
  // states are members), so the animation triggers exactly once and holds
  // until the terminal is cold-booted again (onExit fires only on leaving
  // this set, e.g. OFF→COLD_BOOT).
  //
  // Any lingering standby/idle flourish loses to a genuine shutdown — cleared
  // unconditionally here (including the A2 essential 'standby' class itself,
  // bypassing its own delayed wake-fade so the power-down reads cleanly; see
  // exitStandby()'s _shuttingDown guard for the matching audio/chat suppression).
  AmbientRuntime.register({
    id: 'shutdown-crt',
    states: ['SHUTDOWN', 'OFF'],
    tier: 'full',
    onEnter: () => {
      document.body.classList.remove('rt-idle', 'standby-deep', 'standby');
      const full = typeof immersionAllows === 'function' ? immersionAllows('full') : true;
      document.body.classList.add(full ? 'rt-shutdown' : 'rt-shutdown-plain');
      // FIX 1 (owner report): the PWR lamp reflects real power state — never
      // tier-gated (unlike the CRT flourish above), a genuine power-down always
      // unlights it.
      _updatePwrLamp(false);
    },
    onExit: () => {
      document.body.classList.remove('rt-shutdown', 'rt-shutdown-plain');
      _updatePwrLamp(true);
    },
  });

  // Owner report: the CRT hum kept playing while the terminal was powered
  // off. Reuses the exact SHUTDOWN/OFF state set the PWR lamp/shutdown-crt
  // flourish above already key off (Protocol 22) — not tier-gated (mirrors
  // 'overseer-scope' below: a functional power link, not a decorative
  // ambient flourish), so it stops/resumes at every Immersion level. Volume
  // (masterMute + the hum's own mute key) is still the only other gate,
  // enforced inside startCrtHum()/setCrtHumIntensity() themselves.
  AmbientRuntime.register({
    id: 'crt-hum-power',
    states: ['SHUTDOWN', 'OFF'],
    onEnter: () => {
      if (typeof stopCrtHum === 'function') stopCrtHum();
    },
    onExit: () => {
      if (typeof startCrtHum !== 'function') return;
      // Deferred to first gesture — this exit fires at boot too.
      _armAmbientAudio(() => {
        startCrtHum();
        if (typeof setCrtHumIntensity !== 'function') return;
        const rads = parseInt((document.getElementById('stat_rads') || {}).value) || 0;
        const hasCrippled = ['la', 'ra', 'll', 'rl', 'hd'].some(l => state[l] !== 'OK');
        setCrtHumIntensity(rads, hasCrippled);
      });
    },
  });
}

// ── POWER-ON RECOVERY + PANEL/SUB-PANEL PERSISTENCE (boot phases) ──
// Power-on affordance (Protocol 42 fix): the #powerOnBtn click handler. Owner
// bug — forcing SHUTDOWN/OFF left a fully black screen with no visible way
// back on. Recovers using ONLY legal transition() edges (never forceState(),
// which is a documented TEST-ONLY escape hatch reserved for the staging
// Developer Console — Suite 146.15 guards that no production path forces a
// state): SHUTDOWN's only legal edge is OFF, and OFF's legal edges include
// COLD_BOOT, so a SHUTDOWN-only force (e.g. the Test Console's individual
// "SHUTDOWN" button) is walked through OFF first, then to COLD_BOOT — the
// exact same sequence AmbientRuntime.shutdown() used to get IN, run in
// reverse. Once COLD_BOOT is reached the shutdown-crt observer's onExit fires
// (clearing rt-shutdown/rt-shutdown-plain, which — via the CSS rule above —
// also hides this very button) and the runtime's own _beat() auto-advances
// COLD_BOOT -> READY -> ACTIVE on the next heartbeat, exactly as it does on a
// real page load, since the boot screen is already long gone.
function _powerOnFromShutdown() {
  if (typeof AmbientRuntime === 'undefined' || !AmbientRuntime) return;
  if (AmbientRuntime.getState() === 'SHUTDOWN') AmbientRuntime.transition('OFF');
  AmbientRuntime.transition('COLD_BOOT');
}
window._powerOnFromShutdown = _powerOnFromShutdown;

// Owner batch item 6: wires ONE dynamically-rendered <details data-sub-id>
// element for open/closed persistence — for sub-panels that get replaced by
// an innerHTML re-render (e.g. renderFactionRep()'s MINOR FACTIONS section),
// since _wirePanelPersistence()'s boot-time querySelectorAll only ever sees
// the DOM as it existed at boot and a later re-render would otherwise drop
// both the restored state and the toggle listener. Mirrors the exact same
// restore + toggle-persist logic as that boot-time loop (Protocol 22 — one
// persistence mechanism, not a second one) — call this once, right after the
// innerHTML assignment that (re)creates the element.
function _wireDynamicSubPanel(details) {
  if (!details) return;
  const id = details.dataset.subId;
  if (!id) return;
  const saved = JSON.parse(MetaStore.get('robco_panel_state') || 'null');
  if (saved && saved[id] !== undefined) {
    if (saved[id]) details.setAttribute('open', '');
    else details.removeAttribute('open');
  }
  details.addEventListener('toggle', () => {
    try {
      const ps = JSON.parse(MetaStore.get('robco_panel_state') || '{}');
      ps[id] = details.open;
      MetaStore.set('robco_panel_state', JSON.stringify(ps));
    } catch (_) {}
  });
}

function _wirePanelPersistence() {
  // #35 Panel Memory — restore previously open/closed panel states
  // On desktop, default-open still applies if no saved state exists
  const savedPanelState = JSON.parse(MetaStore.get('robco_panel_state') || 'null');
  const panelEls = Array.from(document.querySelectorAll('details.panel'));
  // FIX (owner report): a boot-time RESTORE of a persisted panel-open state
  // must never be treated as a genuine user click. Without this, reloading
  // with Security & Configuration left open from a prior session (hatch never
  // released) silently re-fires the first-visit hatch ceremony at boot — and
  // .bay-hatch is a position:fixed;inset:0 overlay that swallows every click
  // on the page (not just the casing UPLINK lamp) until the user finds and
  // releases it. `toggle` fires as a queued task (not synchronously), so this
  // flag stays true through every restore-triggered toggle queued by the loop
  // below and is cleared right after, before any real user click can occur.
  let _restoringPanels = true;
  panelEls.forEach((d, idx) => {
    const id =
      d.id ||
      d
        .querySelector('h2')
        ?.innerText.trim()
        .replace(/[^a-z0-9]/gi, '_')
        .toLowerCase();
    if (!id) return;
    d.dataset.panelId = id;
    d.dataset.panelIdx = idx; // numeric index for keyboard shortcuts
    // .fo3-flat boards have their <summary> hidden under the active game's
    // landscape skin when that game's identity carries a `rails` map (FO3
    // today — Protocol 38: gated on the DATA, never a hardcoded game name,
    // so a game with no rails/fo3-flat convention, e.g. NV, is completely
    // unaffected) — the Pip-Boy screen has no collapsible board chrome, so
    // there is no way for a user to ever re-open one; it must always render
    // open regardless of a stale persisted "closed" choice from a prior
    // session (Protocol 42 — found while verifying the Batch 1 panel
    // relayout: most of these boards default closed on touch viewports, per
    // the no-open-attribute + non-desktop branch below, which would
    // otherwise hide their content entirely once the summary is hidden).
    //
    // U6 Strand 1 (Protocol 42 — found while tracing the owner's CURIO
    // scroll report): the SAME "no way to ever re-open it" problem also
    // applies to every OTHER rail-grouped board that ISN'T `.fo3-flat` yet
    // (CURIO/CRAFT/BARTER/SQUAD — the operations sub-tabs Batch 1 never
    // touched). Landing on a sub-tab that's a collapsed native <details>
    // shows only its summary line, not the board — the second nav axis
    // (sub-tab selection, css/60-fo3-pipboy.css Section C) is already the
    // ONE gate deciding what's visible; the accordion collapse under it is
    // pure redundant chrome with no way to escape once the summary's own
    // toggle click is competing with the tap-to-select-subtab flow. `
    // d.dataset.subtab` is stamped by _applyRailGrouping() (runs earlier in
    // window.onload, before this function) for every board named in
    // identity.rails, fo3-flat or not — so this is the SAME data-driven
    // condition, just no longer scoped to the Batch 1 class list.
    if (
      d.classList &&
      typeof getIdentity === 'function' &&
      getIdentity().rails &&
      (d.classList.contains('fo3-flat') || d.dataset.subtab)
    ) {
      d.setAttribute('open', '');
      return;
    }
    if (savedPanelState && savedPanelState[id] !== undefined) {
      if (savedPanelState[id]) d.setAttribute('open', '');
      else d.removeAttribute('open');
    } else if (
      id !== 'securityConfigPanel' &&
      window.matchMedia('(min-width: 1000px) and (hover: hover) and (pointer: fine)').matches
    ) {
      // Default-open panels only on a real mouse-driven desktop — same gate as the desktop
      // CSS shell. matchMedia (not raw innerWidth) is viewport-aware + robust to a first-paint
      // width race, so a touch phone never boots into the desktop "all panels open" state
      // even if window.innerWidth momentarily mis-reports >=1000 (Protocol 42).
      // securityConfigPanel is excluded (owner report): the Module Bay's service-hatch
      // ceremony must only fire on a genuine first user-initiated open, never at boot —
      // this panel stays closed by default on every viewport absent a saved user choice.
      d.setAttribute('open', '');
    }
    d.addEventListener('toggle', () => {
      const ps = JSON.parse(MetaStore.get('robco_panel_state') || '{}');
      ps[id] = d.open;
      MetaStore.set('robco_panel_state', JSON.stringify(ps));
      if (d.id === 'worldMapPanel' && d.open && typeof renderWorldMap === 'function')
        renderWorldMap();
      // Module Bay hatch ceremony (owner report): fires only on a genuine
      // user-initiated toggle — never on the boot-time state restore above.
      // A panel restored already-open has, by definition, been opened before
      // in an earlier session, so the ceremony's purpose is already served —
      // mark it released and just sync the bay content, rather than popping
      // the full-viewport hatch overlay unprompted at boot (FIX).
      if (d.id === 'securityConfigPanel' && d.open) {
        if (_restoringPanels) {
          if (MetaStore.get('robco_bay_opened') !== 'true')
            MetaStore.set('robco_bay_opened', 'true');
          if (typeof renderModuleBay === 'function') renderModuleBay();
        } else if (typeof initModuleBay === 'function') {
          initModuleBay();
        }
      }
    });
  });
  // The 'toggle' events queued by the setAttribute/removeAttribute calls above
  // fire as tasks, not synchronously — deferring this reset ensures the flag
  // is still true for every one of those before any real user click can land.
  setTimeout(() => {
    _restoringPanels = false;
  }, 0);

  // Sub-panel persistence — traits, collectibles sub-trackers (default: collapsed)
  // Reuses robco_panel_state; new sub-trackers default to closed on first ever load.
  document.querySelectorAll('details[data-sub-id]').forEach(d => {
    const id = d.dataset.subId;
    if (!id) return;
    if (savedPanelState && savedPanelState[id] !== undefined) {
      if (savedPanelState[id]) d.setAttribute('open', '');
      else d.removeAttribute('open');
    }
    // Default: no 'open' (collapsed) — new sub-trackers start closed until user expands
    d.addEventListener('toggle', () => {
      try {
        const ps = JSON.parse(MetaStore.get('robco_panel_state') || '{}');
        ps[id] = d.open;
        MetaStore.set('robco_panel_state', JSON.stringify(ps));
      } catch (_) {}
    });
  });

  // Owner batch item 4 (Protocol 42 fix, found while verifying full-reload restore):
  // initTabs() (called earlier in window.onload) already restored the active
  // subsystem's saved scroll offset, but that ran BEFORE this function applied
  // every panel/sub-panel's saved open/closed state above — a panel opening or
  // closing changes page height, which can silently invalidate the scroll offset
  // initTabs() already set. Re-apply it now that every panel's final open/closed
  // state is in place, so "exact scroll position" survives a full reload even
  // when panel-state and scroll-state interact.
  if (_lastScrollSubsystem) _restoreScrollFor(_lastScrollSubsystem, false);
}

// ── OPTICS + DEVICE-PREF BOOT RESTORE (boot phases) ──
function _restoreOpticsPreference() {
  // DO-K: keep the pre-paint data-game attribute in sync with the resolved game context. The
  // index.html head script already sets it (best-effort) from raw localStorage before state.js
  // loads (flash-free, same pattern as the optics/high-lumen pre-paint reads); this re-applies
  // the authoritative value once state is live. No visible consumer yet — DO-N's bezel chrome
  // is the first `[data-game]` CSS reader.
  document.documentElement.dataset.game = getGameContext();
  // Per-game optics resolution — resolve THIS game's optic (its own remembered pick
  // robco_optic_<ctx> → the game's default optic → green) and apply it. A game switch reloads
  // (onGameContextChange), so each game re-resolves to its own remembered optic / default here.
  // Then sync the picker's selected value + the dynamic "(Default)" tag (which marks the active
  // game's default optic) to the active game.
  const _optic = _resolveOptic();
  _applyThemeVars(_optic);
  const _rack = document.getElementById('opticsColorInput');
  if (_rack) {
    // WU-optics-picker: keep the green family cartridge collapsed and its representative
    // repainted BEFORE the generic seated-class sync below, so the cartridge lights up
    // correctly whenever the resolved optic is one of its members.
    const _famSocket = document.getElementById('opticsFamilySocket');
    const _famTube = document.getElementById('opticsFamilyTube');
    if (_famSocket) _famSocket.classList.remove('expanded');
    if (_famTube && typeof _resolveOpticsFamilyRepresentative === 'function') {
      const _rep = _resolveOpticsFamilyRepresentative(_famTube.dataset.family);
      if (_rep && typeof _updateOpticsFamilyRepresentative === 'function')
        _updateOpticsFamilyRepresentative(_rep);
    }
    Array.from(_rack.querySelectorAll('.tube')).forEach(t => {
      t.classList.toggle('seated', t.dataset.optic === _optic);
    });
  }
  _updateOpticsDefaultLabel();
}

function _restoreDevicePrefs() {
  if (MetaStore.get('robco_sfx_muted') === 'true') {
    let el = document.getElementById('muteTypingToggle');
    if (el) el.checked = true;
  }
  if (MetaStore.get('robco_hum_muted') === 'true') {
    let el = document.getElementById('muteHumToggle');
    if (el) el.checked = true;
  }
  if (MetaStore.get('robco_geiger_muted') === 'true') {
    let el = document.getElementById('muteGeigerToggle');
    if (el) el.checked = true;
  }
  if (MetaStore.get('robco_tinnitus_muted') === 'true') {
    let el = document.getElementById('muteTinnitusToggle');
    if (el) el.checked = true;
  }
  if (MetaStore.get('robco_ambient_muted') === 'true') {
    let el = document.getElementById('muteLimbToggle');
    if (el) el.checked = true;
  }
  if (MetaStore.get('robco_wake_muted') === 'true') {
    let el = document.getElementById('muteWakeToggle');
    if (el) el.checked = true;
  }
  if (MetaStore.get('robco_questcomplete_muted') === 'true') {
    let el = document.getElementById('muteQuestCompleteToggle');
    if (el) el.checked = true;
  }
  if (MetaStore.get('robco_questfail_muted') === 'true') {
    let el = document.getElementById('muteQuestFailToggle');
    if (el) el.checked = true;
  }
  if (MetaStore.get('robco_factionthreshold_muted') === 'true') {
    let el = document.getElementById('muteFactionThresholdToggle');
    if (el) el.checked = true;
  }
  if (MetaStore.get('robco_reactorhum_muted') === 'true') {
    let el = document.getElementById('muteReactorHumToggle');
    if (el) el.checked = true;
  }
  // Master mute restore
  if (MetaStore.get('robco_master_muted') === 'true') {
    let el = document.getElementById('masterMuteToggle');
    if (el) el.checked = true;
  }
  // B2c: SERVO CLICK RELAY — INVERTED checkbox semantics (checked = installed
  // = audible), same as the master-mute board. Default checked in the HTML;
  // only uncheck it when explicitly muted.
  if (MetaStore.get('robco_hardwaresfx_muted') === 'true') {
    let el = document.getElementById('hardwareSfxToggle');
    if (el) el.checked = false;
  }
  // Phase 3 · Piece 2 (CARGO MANIFEST): restore the last-open drawer (UI-6).
  // Only the button/tray visibility is synced here — renderInventory()/
  // renderAmmo() (called later from loadUI()) do the actual data render, and
  // _updateContextPanels() self-heals a stale 'mod' pick on a no-mods game.
  {
    const savedDrawer = MetaStore.get('robco_cargo_drawer');
    if (savedDrawer && typeof _DRAWER_LABELS !== 'undefined' && _DRAWER_LABELS[savedDrawer]) {
      _invFilter = savedDrawer;
    }
    if (typeof _syncDrawerButtons === 'function') _syncDrawerButtons(_invFilter);
  }
  // Silently refresh model list 2s after boot if key is present
  if (MetaStore.get('robco_gemini_key')) {
    setTimeout(() => {
      try {
        fetchAuthorizedModels(true);
      } catch (e) {
        /* silent */
      }
    }, 2000);
  }

  if (localStorage.getItem('robco_playstyle')) {
    let savedStyle = localStorage.getItem('robco_playstyle');
    if (document.getElementById('playstyleInput')) {
      document.getElementById('playstyleInput').value = savedStyle;
    }
  }

  // Restore game context selector
  {
    const ctx = (state && state.gameContext) || 'FNV';
    const sel = document.getElementById('gameContextSelect');
    if (sel) sel.value = ctx;
    // fo3WarningBanner removed in C11 — banner element no longer in DOM
  }

  // C5: Restore playthrough type select from state (was localStorage in C4-fix)
  {
    const type = (state && state.playthroughType) || 'standard';
    const sel = document.getElementById('playthroughTypeSelect');
    if (sel) sel.value = type;
  }
  {
    const mode = (state && state.campaignMode) || 'standard';
    const locked = mode === 'rng-locked';
    const armed = mode === 'rng';
    const cb = document.getElementById('completeRngToggle');
    if (cb) {
      cb.checked = locked || armed;
      cb.disabled = locked;
    }
    // The armed/locked banners are painted by _syncInterlockUI() below (Protocol
    // 22 — one repaint function owns the whole board, not a duplicate here too).
  }
  // SU-3: paint the CAMPAIGN PROFILE / RANDOMIZER INTERLOCK custom controls from
  // the state just restored above — cartridges/rocker/detents/dial/breaker/seq
  // strip/summary lines/banners all start in sync with the hidden real controls.
  if (typeof _syncCampaignProfileUI === 'function') _syncCampaignProfileUI();
  if (typeof _syncInterlockUI === 'function') _syncInterlockUI();
  if (typeof _wireTempoDialDrag === 'function') _wireTempoDialDrag(); // one-time listener attach, boot only

  // #34 Typewriter Speed — restore slider + label on load
  {
    const savedSpeed = parseFloat(MetaStore.get('robco_typer_speed') || '1');
    const slider = document.getElementById('typerSpeedSlider');
    const label = document.getElementById('typerSpeedVal');
    if (slider) slider.value = savedSpeed;
    if (label) label.textContent = savedSpeed.toFixed(2) + '\u00d7';
  }

  // Command-Line MODE (Step 2 Phase 2 B1): restore the pill/placeholder from
  // the persisted device pref and wire the `/`/`@` hint reveal.
  _renderModePill();
  _wireModeHint();
  _wireComposerAutoGrow();

  // Owner batch item 5: populate every Module Bay SLOT board's (and the bay's
  // own) collapsed summary line at boot regardless of whether the panel is
  // open — without this, the summaries stayed blank until the user's first
  // manual open, since renderModuleBay() otherwise only fires from a control
  // change or from _wirePanelPersistence()'s restored-open branch. Already
  // documented as safe to call anytime (idempotent, cheap).
  if (typeof renderModuleBay === 'function') renderModuleBay();
}

// ── BOOT BRIEFING, AMBIENT TIMERS, UNLOAD FLUSH (boot phases) ──
function _runBootSequenceAndBriefing() {
  // Defer changelog display until after boot sequence completes
  let needsChangelog = false;
  if (MetaStore.get('robco_version') !== APP_VERSION) {
    MetaStore.set('robco_version', APP_VERSION);
    needsChangelog = true;
  }

  runBootSequence(() => {
    if (needsChangelog) {
      fetch('CHANGELOG.md')
        .then(r => r.text())
        .then(text => {
          // Env-aware: production sees only released versions (latest first);
          // staging/dev sees [Unreleased] at the top (WU-C11). The structured
          // viewer defaults to the most-recent visible version (the first block).
          const visible = _visibleChangelog(text, _isStagingEnv());
          _showChangelogModal(visible, `> PATCH NOTES: ${APP_VERSION}`);
        })
        .catch(e => console.error('Could not load changelog'));
    }

    // Session resume briefing (only if a save exists)
    if (localStorage.getItem('robco_v7')) {
      const lastNote =
        state.campaign_notes && state.campaign_notes.length > 0
          ? state.campaign_notes[state.campaign_notes.length - 1]
          : null;
      const companionNames =
        state.squad && state.squad.length > 0 ? state.squad.map(m => m.name).join(', ') : 'None';
      const limbStatus = ['la', 'ra', 'll', 'rl', 'hd'].filter(l => state[l] === 'CRIPPLED');

      // Active quests (in-progress only, max 3 shown)
      const activeQuests = (state.quests || [])
        .filter(q => q.status === 'IN PROGRESS' || q.status === 'ACTIVE')
        .slice(0, 3)
        .map(q => `    [ACTIVE] ${q.name}`);

      // Faction standings at extremes (Idolized / Vilified)
      const extremeFactions = Object.entries(state.factions || {})
        .filter(([, f]) => {
          const rep = typeof f === 'object' ? f.rep || 0 : 0;
          return Math.abs(rep) >= 75;
        })
        .map(([name, f]) => {
          const rep = typeof f === 'object' ? f.rep || 0 : 0;
          return `    ${name.toUpperCase()}: ${rep >= 75 ? 'IDOLIZED' : 'VILIFIED'}`;
        })
        .slice(0, 3);

      // Expiring chems (ticks 1–2)
      const expiringChems = (state.status || [])
        .filter(eff => eff.type === 'BUFF' && (eff.ticks || 0) > 0 && (eff.ticks || 0) <= 2)
        .map(eff => `    ⚠ ${eff.name.toUpperCase()} EXPIRING [${eff.ticks}T]`);

      const briefingLines = [
        '> ── SESSION RESUMED ─────────────────────────────────────────',
        `> LOC: ${state.loc || 'UNKNOWN'} | ${formatGameTime(state.ticks)} | HP: ${state.hpCur}/${state.hpMax}`,
        `> CAPS: ${state.caps} | RADS: ${state.rads} | SQUAD: ${companionNames}`,
        limbStatus.length > 0 ? `> CRIPPLED LIMBS: ${limbStatus.join(', ').toUpperCase()}` : null,
        activeQuests.length > 0 ? `> ACTIVE OBJECTIVES:\n${activeQuests.join('\n')}` : null,
        extremeFactions.length > 0 ? `> FACTION ALERTS:\n${extremeFactions.join('\n')}` : null,
        expiringChems.length > 0 ? `> CHEM WARNINGS:\n${expiringChems.join('\n')}` : null,
        lastNote ? `> LAST LOG: ${lastNote}` : null,
        '> ─────────────────────────────────────────────────────────────',
      ]
        .filter(Boolean)
        .join('\n');
      appendToChat(briefingLines, 'sys', true);
    }

    if (
      window._lastStateBeforeSync ||
      (typeof window.getRollingBackups === 'function' && window.getRollingBackups().length > 0)
    ) {
      let undoBtn = document.getElementById('undoSyncBtn');
      if (undoBtn) undoBtn.style.display = 'block';
    }

    // Owner batch item 4 (Protocol 42 fix, found while verifying full-reload restore):
    // this callback's own appendToChat() briefing line above can grow the mobile
    // carrier-strip (the persistent Overseer presence shown on every non-UPLINK
    // subsystem, DO-O) — which changes page height AFTER window.onload's own
    // post-_wirePanelPersistence() scroll re-restore already ran. Since this
    // callback is the actual last deterministic point boot-time content gets
    // added, re-apply the saved scroll offset once more here so it isn't left
    // stale by a briefing line's effect on the carrier-strip's height.
    if (_lastScrollSubsystem) _restoreScrollFor(_lastScrollSubsystem, false);
  });
}

function _startAmbientTimers() {
  // Session Uptime Clock + Memory Cycle Event — now Ambient Runtime observers (A2).
  // Both tick only in the awake states (['ACTIVE','IDLE']), so the runtime pauses them
  // on STANDBY and restarts their cadence on wake (replacing the old enterStandby /
  // exitStandby interval management). The dial is enforced by each observer's tier:
  // the uptime clock is baseline telemetry (tier 'minimal', never quiets); the
  // memory-cycle flash is an ambient flourish (tier 'balanced', silent at Minimal —
  // exactly matching its former immersionAllows('balanced') gate).
  sessionStart = Date.now();
  AmbientRuntime.register({
    id: 'uptime-clock',
    states: ['ACTIVE', 'IDLE'],
    tier: 'minimal',
    cadenceMs: 1000,
    onTick: _tickUptimeClock,
  });
  AmbientRuntime.register({
    id: 'mem-cycle',
    states: ['ACTIVE', 'IDLE'],
    tier: 'balanced',
    cadenceMs: 900000,
    onTick: _tickMemCycle,
  });
}

function _wireUnloadFlush() {
  // Flush any pending debounced save immediately on tab close.
  // GOTCHA (Protocol 42 precedent — same guard saveState()'s own debounced
  // write applies in state.js): suppress the unload flush when a context
  // switch OR a save-load reload is in flight — otherwise the stale
  // in-memory state would clobber the robco_v8 a load path just wrote,
  // making IMPORT SAVE / RESTORE BACKUP / cloud load no-ops. A WU-A5
  // verification pass once hit this exact clobber with the guard missing
  // (harness-only — every shipped reload path was already guarded — see
  // Suite 95.8/95.9, the regression locks for this pattern).
  window.addEventListener('beforeunload', () => {
    clearTimeout(_saveTimer);
    if (window._contextSwitching || window._loadingSave) return;
    if (!window.robco_v8)
      window.robco_v8 = { activeContext: state.gameContext || 'FNV', campaigns: {} };
    window.robco_v8.activeContext = state.gameContext || 'FNV';
    window.robco_v8.campaigns[window.robco_v8.activeContext] = JSON.parse(JSON.stringify(state));
    try {
      localStorage.setItem('robco_v8', JSON.stringify(window.robco_v8));
    } catch (e) {
      // SAVE_INTEGRITY_PASS fail-loud audit: setItem is atomic on throw (a
      // QuotaExceededError never partially writes), so the PRIOR robco_v8
      // stays intact — this only means the last <500ms of edits since the
      // last debounced saveState() may not have flushed. No UI is possible
      // during unload; console.error is the loud, auditable trail (never a
      // silent swallow, Protocol 42).
      console.error('[RobCo] beforeunload flush failed (quota?):', e);
    }
  });
}

// ── window.onload — BOOT ORCHESTRATOR ───────────────────────────
// Calls every boot-phase function above (plus a handful defined in sibling
// ui-core-*.js files, already in scope by this point — see index.html load
// order) in the exact order they ran in the original pre-split monolith.
// GOTCHA: do not reorder without re-auditing every boot/lifecycle entry path
// (planning/STEP2_PHASE0_PLAN.md) — two orderings are load-bearing today:
// _hydrateMetaFromIdb() must resolve before anything reads a device pref
// (P2's IndexedDB reconciliation), and routeLaunchShortcut() must run last,
// after initTabs(), so a PWA shortcut deep-link isn't overridden by the
// normal saved-tab restore.
window.onload = async function () {
  try {
    // U7: wire the OS Event Bus subscribers first (RobcoEvents is guaranteed loaded by onload).
    _wireCoreEventBusSubscribers();
    _wireAudioEventBusSubscribers();
    _wireApiEventBusSubscribers();
    _wireChassisCoreEventBusSubscribers(); // CHASSIS LIVING CORE: runtime.state/level.up/data.write/stat.change
    _wireFeedbackEchoSubscribers(); // FEEDBACK ANIMATION WAVE 1: the STATUS ANNUNCIATOR
    _wireLocationCardSubscriber(); // LOCATION CONFIRMATION CARD: top-right arrival toast
    // P2: reconcile device prefs from IndexedDB (bounded + fail-safe) BEFORE the rest of boot reads them.
    await _hydrateMetaFromIdb();
    _hydrateStateFromStorage();
    _requestPersistentStorage(); // SAVE_INTEGRITY_PASS Layer 2: fire-and-forget, never blocks boot
    if (window._migrateColdStoreToIdb) window._migrateColdStoreToIdb(); // P3: fire-and-forget cold-store → IDB migration
    _restoreApiKeyAndChatHistory();
    loadUI();
    _applyRailGrouping(); // FO3 PIP-BOY BUILD U1: stamp data-subtab (no-op without identity.rails) — must run before initTabs()/switchTab() so the boot-time sub-tab restore has real data-subtab attributes to work with
    _applyFo3NavLabels(); // FO3 PIP-BOY BUILD U2 owner-feedback pass: re-label the 3 lamp keycaps from identity.navLamps (no-op without it) — board elements are static markup already present, same boot phase as _applyRailGrouping()
    initTabs(); // Phase 4: restore active tab (defaults to 'stat' on first load)
    _initBezelChrome(); // DO-N: restore bezel subsystem highlight + sync the FAULT lamp
    setupHpBarInteraction();
    setupXpBarInteraction(); // C11: XP bar click-drag (mirrors HP bar, within current level range)
    setupRadBarInteraction(); // RAD bar click-drag (mirrors HP/XP bars, owner batch item 2)
    _wireBioHarnessZones(); // PHASE 3 · OPERATOR BUS-03: SVG zone taps route through toggleLimb()
    _wireFaderDrag(); // PHASE 3 follow-up · OPERATOR BUS-02: fader-ladder drag routes through commitStat()
    _armAmbientAudio(startCrtHum); // continuous ambient — deferred to first gesture (blocked-autoplay spam fix)
    if (typeof startReactorHum === 'function') _armAmbientAudio(startReactorHum); // LIVING CORE #6: same autoplay-safe first-gesture arm
    initRegistryAutocomplete();
    initAmmoDatalist();
    initLocationDatalist();
    initWakeLock(); // WU-F1: restore the Sustained Power Cell (Screen Wake Lock) preference
    initHaptic(); // WU-F2: restore the Haptic Solenoid (Vibration) preference
    initOverseerLog(); // WU-F7: start the Overseer's Log session clock + bump boot count (once)
    initHighLumen(); // WU-F8: restore the High-Lumen Optics (max-contrast) preference
    initImmersion(); // P8: restore the Global Immersion dial (Full/Balanced/Minimal) device pref
    initRadio(); // WU-F5: restore the Pip-Boy Radio preference (autoplay-safe first-gesture arm)
    _wireRotaryDialClick();
    _wireStandby();
    _wireAmbientExperiences(); // A3: IDLE/STANDBY-deepen/SHUTDOWN dial-gated ambient observers
    initOverseerScope(); // DO-O: the living Overseer (Director Uplink oscilloscope presence)
    initAmbientRuntime(); // Ambient Runtime — the single-heartbeat scheduler; owns the app's one setInterval and drives every ambient observer
    initChassisCore(); // CHASSIS: the LIVING CORE — paints its initial frame after the runtime state is live
    if (typeof initTestConsole === 'function') initTestConsole(); // staging/dev-only Test Console — hidden on prod, which STRIPS the file (Health-U7); typeof guard prevents a ReferenceError → black screen (Protocol 33, Suite 149.17)
    _wirePanelPersistence(); // also wires the Module Bay hatch ceremony to securityConfigPanel's own first user-open (owner report — never at boot); also re-applies scroll restore (Protocol 42)
    _wireToolDeck(); // Tool Deck + Quick-Draw Holster — deck/scrim/tool-row/socket/bind-key wiring
    _restoreOpticsPreference();
    _restoreDevicePrefs();
    _wireKeyboardShortcuts();
    _runBootSequenceAndBriefing();
    _startAmbientTimers();
    _wireInputHistoryNav();
    _wireUnloadFlush();
    routeLaunchShortcut(); // PWA shortcut deep-link routing — must run last, after initTabs
  } catch (e) {
    console.error('[RobCo] boot failed:', e);
  }
};

// ── WU-F4 PENDING-DIRECTIVES TALLY (Badging API) ──────────────────────────
// Posts the count of unresolved directives — active quests — on the installed
// terminal icon while the app is backgrounded, and clears it the moment the
// terminal is open ("directives seen"). Free, offline, no AI, game-agnostic
// (Protocol 38) — reads only state.quests, carries no game literal. Ambient: no
// toast/notification, no settings toggle, no state field. Graceful no-op on any
// browser without the Badging API (desktop Firefox/Safari, non-installed tabs);
// every call is wrapped so a missing/rejecting Badge API can never break the app.
function _badgeSupported() {
  return (
    typeof navigator !== 'undefined' &&
    typeof navigator.setAppBadge === 'function' &&
    typeof navigator.clearAppBadge === 'function'
  );
}
// Unresolved directives = active quests (status 'active' or unset). The single
// source for both the QUEST LOG panel badge and the app-icon badge (Protocol 22).
function _pendingDirectivesCount() {
  return (state.quests || []).filter(q => q.status === 'active' || !q.status).length;
}
function _updateAppBadge() {
  if (!_badgeSupported()) return; // graceful no-op where the Badging API is absent
  try {
    // While the terminal is open the user is reading their directives, so the
    // ambient icon badge stays clear; it only posts the tally once backgrounded.
    const hidden = typeof document !== 'undefined' && document.visibilityState === 'hidden';
    const n = hidden ? _pendingDirectivesCount() : 0;
    const p = n > 0 ? navigator.setAppBadge(n) : navigator.clearAppBadge();
    if (p && typeof p.catch === 'function') p.catch(() => {}); // swallow async rejects
  } catch (_) {
    /* never throw on a badge update */
  }
}
// Re-evaluate the icon badge on every visibility transition: post the tally when
// the terminal is hidden, clear it when reopened ("clears on open").
document.addEventListener('visibilitychange', _updateAppBadge);

// ── PANEL BADGES (Protocol UI-4) ────────────────────────────────
function _updatePanelBadges() {
  const badges = [
    { h2text: '> PERK LOADOUT', count: (state.perks || []).length },
    {
      h2text: '> CARGO MANIFEST',
      // Combined: non-ammo inventory items + tracked ammo calibers
      count:
        (state.inventory || []).filter(it => (it.type || 'misc') !== 'ammo').length +
        Object.values(state.ammo || {}).filter(v => v > 0).length,
    },
    { h2text: '> SQUAD ROSTER', count: (state.squad || []).length },
    { h2text: '> STATUS EFFECTS', count: (state.status || []).length },
    { h2text: '> FIELD NOTES', count: (state.campaign_notes || []).length },
    {
      h2text: '> DIRECTIVE REGISTRY',
      count: _pendingDirectivesCount(),
    },
    {
      h2text: '> CURIO ARCHIVE',
      count: (state.collectibles || []).length,
    },
    {
      h2text: '> FIELD FABRICATION',
      count:
        typeof FALLOUT_REGISTRY !== 'undefined' && Array.isArray(FALLOUT_REGISTRY.recipes)
          ? FALLOUT_REGISTRY.recipes.filter(r =>
              r.ingredients.every(ing => _craftGetHave(ing.item) >= ing.qty)
            ).length
          : 0,
    },
    {
      h2text: '> SKILL BOOKS',
      count: (state.skillBooks || []).length,
      total:
        typeof FALLOUT_REGISTRY !== 'undefined' && Array.isArray(FALLOUT_REGISTRY.skillBooks)
          ? FALLOUT_REGISTRY.skillBooks.length
          : 0,
    },
    {
      h2text: '> SKILL MAGAZINES',
      count: (state.magazines || []).length,
      total:
        typeof FALLOUT_REGISTRY !== 'undefined' && Array.isArray(FALLOUT_REGISTRY.magazines)
          ? FALLOUT_REGISTRY.magazines.length
          : 0,
    },
  ];
  badges.forEach(({ h2text, count, total }) => {
    // Find the heading with exactly this text (case-insensitive prefix match).
    // SKILL BOOKS/SKILL MAGAZINES are top-level .panel h2 boards (BUS-05a/
    // BUS-05b, Phase 3 OPERATOR batch 3) — the .sub-panel h3 half of this
    // selector still covers any other nested sub-panel badge (Protocol 22).
    const h2 = Array.from(document.querySelectorAll('.panel h2, .sub-panel h3')).find(el =>
      el.textContent.trim().startsWith(h2text)
    );
    if (!h2) return;
    // Remove old badge
    const old = h2.querySelector('.panel-badge');
    if (old) old.remove();
    // Add new badge if count > 0
    if (count > 0) {
      const badge = document.createElement('span');
      badge.className = 'panel-badge';
      badge.textContent = total ? `${count}/${total}` : count;
      h2.appendChild(badge);
    }
  });
  _updateAppBadge(); // WU-F4: keep the installed-icon pending-directives tally in sync
}

// ── AUTO-EXPAND PANEL (#31) ──────────────────────────────────────────
// Called by autoImportState() after a state delta with the changed category key.
// Opens the relevant panel so the Courier can immediately see what changed.
function expandPanelForCategory(categoryKey) {
  // Tab routing: switch to the correct tab before expanding the panel
  const tabMap = {
    squad: 'inv',
    status: 'stat',
    inventory: 'inv',
    campaign_notes: 'data',
    perks: 'stat',
    factions: 'stat',
    quests: 'data',
    ammo: 'inv',
    equipped: 'inv',
    collectibles: 'inv',
    craft: 'inv',
    trade: 'inv',
    skillBooks: 'stat',
    magazines: 'stat',
    // WU-HF3 panel navigation — additional categories reachable by typing a panel
    // name/alias in the Comm-Link (see PANEL_NAV_ALIASES in api.js).
    special: 'stat',
    skills: 'stat',
    bio: 'stat',
    map: 'data',
    log: 'chassis',
    databank: 'data',
    config: 'settings',
  };
  if (tabMap[categoryKey]) switchTab(tabMap[categoryKey]);

  const map = {
    squad: '> SQUAD ROSTER',
    status: '> STATUS EFFECTS',
    inventory: '> CARGO MANIFEST',
    campaign_notes: '> FIELD NOTES',
    perks: '> PERK LOADOUT',
    factions: '> FACTION STANDING',
    quests: '> DIRECTIVE REGISTRY',
    ammo: '> CARGO MANIFEST', // ammo now lives in the AMMO drawer, folded into the manifest board
    equipped: '> EQUIPPED',
    collectibles: '> CURIO ARCHIVE',
    craft: '> FIELD FABRICATION',
    trade: '> BARTER UPLINK',
    skillBooks: '> SKILL BOOKS',
    magazines: '> SKILL MAGAZINES',
    // WU-HF3 panel navigation targets (h2 prefixes, matched via startsWith).
    // PHASE 3 OPERATOR reskin (Suite 181): BIO-METRICS was split into its 3
    // real boards (VITAL TELEMETRY/S.P.E.C.I.A.L. TUNING/CHRONO), and
    // BIO-SCAN & LIMB STATUS was re-dressed as SKELETAL HARNESS — both
    // targets updated to the new titles so "stats"/"special"/"biometrics"/
    // "bio" keep landing on the right board instead of silently no-opping.
    special: '> VITAL TELEMETRY',
    skills: '> SKILL MATRIX',
    bio: '> SKELETAL HARNESS',
    map: '> CARTOGRAPHY TABLE',
    // CHASSIS reskin: the former single SYSTEM STATUS panel split into BUS-22
    // UNIT POWER PLANT + BUS-23 IDENTITY PLATE & BREAKERS + BUS-24 SERVICE &
    // FAULT CONSOLE — "log" now lands on the device-telemetry board.
    log: '> UNIT POWER PLANT',
    databank: '> CATALOG QUERY',
    config: '> CAMPAIGN CONFIGS',
  };
  const target = map[categoryKey];
  if (!target) return;
  // SKILL BOOKS/SKILL MAGAZINES are top-level .panel h2 boards (BUS-05a/
  // BUS-05b, Phase 3 OPERATOR batch 3) — the .sub-panel h3 half of this
  // selector still covers any other nested sub-panel target (Protocol 22).
  // Protocol 42 fix (found live while verifying the AI->native survey's
  // native LEVEL UP jump-to-SKILL-MATRIX): many reskinned boards render
  // their heading as `> <span class="board-led"></span> NAME` split across
  // multiple lines, so raw textContent carries a doubled space and embedded
  // newlines (e.g. "> \n  VITAL\n  TELEMETRY") that never matched the plain
  // single-spaced target string below — collapsing all whitespace runs to a
  // single space on both sides makes the match immune to that markup shape.
  const norm = s => s.replace(/\s+/g, ' ').trim();
  const normTarget = norm(target);
  const h2 = Array.from(document.querySelectorAll('.panel h2, .sub-panel h3')).find(el =>
    norm(el.textContent).startsWith(normTarget)
  );
  if (!h2) return;
  const details = h2.closest('details.panel');
  if (details && !details.open) {
    details.setAttribute('open', '');
    // Persist the newly opened state
    const ps = JSON.parse(MetaStore.get('robco_panel_state') || '{}');
    if (details.dataset.panelId) {
      ps[details.dataset.panelId] = true;
      MetaStore.set('robco_panel_state', JSON.stringify(ps));
    }
  }
  // Ammo's visibility is drawer-gated (Phase 3 · Piece 2 CARGO MANIFEST
  // reskin) rather than a collapsible <details> — pulling the AMMO drawer
  // via setInvFilter() is what reveals it (also updates the drawer's active
  // state + persists the choice, Protocol 22 single entry point). SKILL
  // BOOKS/SKILL MAGAZINES are now top-level boards (BUS-05a/BUS-05b), so
  // the generic details.open handling above already reveals them.
  if (categoryKey === 'ammo') {
    if (typeof setInvFilter === 'function') setInvFilter('ammo');
  }
  // WU-HF1: bring the opened panel into view. Without this, opening a panel that sits
  // below the fold (e.g. BARTER UPLINK is beneath BACKPACK/EQUIPPED/AMMO/CRAFTING on the
  // INV tab) silently switched tabs with the panel off-screen — the [TRADE] tap "did
  // nothing". scrollIntoView walks up to whatever actually scrolls (the document on
  // mobile, the column in the desktop shell). A requestAnimationFrame lets the tab-switch
  // layout settle first.
  //
  // r3: CENTER the opened panel in the viewport instead of pinning it to the very top
  // (owner: it felt jammed at the top edge). We center the SUMMARY (the small header), not
  // the whole details box — for a panel taller than the viewport, centering the full box
  // would push its header off-screen; centering the header keeps it comfortably visible
  // with the panel's content flowing below it. block:'center' does the centering; when the
  // panel is near the page bottom the scroller centers it as far as its range allows.
  // behavior:'auto' (instant) is deliberate: it is reliable on every scroller (a 'smooth'
  // scrollIntoView is a silent no-op on some document scrollers, which would regress the
  // reveal to "nothing happened") and is inherently reduced-motion-safe (no animation).
  const summaryEl = details ? details.querySelector('summary') : null;
  if (summaryEl && typeof summaryEl.scrollIntoView === 'function') {
    const _reveal = () => {
      try {
        summaryEl.scrollIntoView({ block: 'center', behavior: 'auto' });
      } catch (_) {
        /* scrollIntoView unsupported — non-fatal */
      }
    };
    if (typeof requestAnimationFrame === 'function') requestAnimationFrame(_reveal);
    else _reveal();
  }
}

// ── Environment detection (Protocol 43 / WU-C11 env-aware changelog) ─────────
// Staging/dev shows the changelog's [Unreleased] section so the owner can review
// unreleased work; production hides it. FAIL-SAFE: any uncertainty defaults to
// production, so unreleased work can never leak to the public site. Primary
// signal = the <meta name="robco-env" content="staging"> marker that
// scripts/cf-staging-build.mjs injects into the staged build (prod never emits
// it); hostname (Cloudflare *.pages.dev + localhost) is a secondary signal.
function _isStagingEnv() {
  try {
    const m = document.querySelector('meta[name="robco-env"]');
    if (m && m.getAttribute('content') === 'staging') return true;
    if (typeof window !== 'undefined' && window.__ROBCO_ENV__ === 'staging') return true;
    const h = (typeof location !== 'undefined' && location.hostname) || '';
    if (h === 'localhost' || h === '127.0.0.1' || /\.pages\.dev$/.test(h)) return true;
  } catch (_) {
    /* fall through to production default */
  }
  return false; // production default — never leak [Unreleased]
}

// Returns the changelog markdown to render for the given environment. Production
// strips the [Unreleased] section entirely; staging/dev keeps it (rendered in
// source order — earliest-first within each category, per the changelog convention).
function _visibleChangelog(text, isStaging) {
  if (isStaging) return text;
  return text
    .split(/\r?\n(?=## \[)/)
    .filter(s => !/^## \[Unreleased\]/.test(s.trimStart()))
    .join('\n');
}

// ── WU-C11 changelog viewer glow-up ──────────────────────────────────────────
// Diegetic "FIRMWARE REVISION LOG" framing: each Keep-a-Changelog category maps
// to a HOUSE_STANDARD tag. Unknown categories fall back to a generic tag.
const _CHANGELOG_CAT_TAGS = {
  added: '[+] ADDED',
  fixed: '[*] FIXED',
  changed: '[~] CHANGED',
  removed: '[-] REMOVED',
  improved: '[^] IMPROVED',
  hotfix: '[!] HOTFIX',
  'under the hood': '[#] UNDER THE HOOD',
};
function _changelogCatTag(name) {
  const key = String(name || '')
    .trim()
    .toLowerCase();
  return _CHANGELOG_CAT_TAGS[key] || '[>] ' + key.toUpperCase();
}

// Parse changelog markdown into version blocks → categories → entries.
// SOURCE ORDER IS PRESERVED at every level: version blocks, categories within a
// version, and entries within a category are pushed in document order — there is
// no .reverse()/.sort() anywhere, so the on-site log reads exactly as authored
// (earliest-first within each category, per the CHANGELOG convention). The date
// is lifted from the version header's <!-- Date: … --> comment before comments
// are stripped for display.
function _parseChangelog(text) {
  const blocks = String(text)
    .split(/\r?\n(?=## \[)/)
    .filter(b => /^\s*## \[/.test(b));
  return blocks.map(block => {
    const headerLine = block.split(/\r?\n/)[0] || '';
    const dateM = headerLine.match(/Date:\s*([0-9]{4}-[0-9]{2}-[0-9]{2})/);
    const date = dateM ? dateM[1] : '';
    const labelRaw = headerLine
      .replace(/<!--[\s\S]*?-->/g, '')
      .replace(/^\s*##\s*/, '')
      .trim();
    const verM = labelRaw.match(/^\[([^\]]+)\]/);
    const version = verM ? verM[1] : labelRaw;
    const titleM = labelRaw.match(/\]\s*[—–-]\s*(.+)$/);
    const title = titleM ? titleM[1].trim() : '';
    const body = block
      .split(/\r?\n/)
      .slice(1)
      .join('\n')
      .replace(/<!--[\s\S]*?-->/g, '');
    const categories = [];
    for (const cb of body.split(/\r?\n(?=### )/)) {
      const cm = cb.match(/^\s*###\s*(.+)/);
      if (!cm) continue;
      const catName = cm[1].trim();
      const entries = [];
      for (const ln of cb.split(/\r?\n/)) {
        const em = ln.match(/^\s*-\s+(.*\S)\s*$/);
        if (em) entries.push(em[1]); // document order — no reverse, no sort
      }
      if (entries.length) {
        categories.push({ name: catName, tag: _changelogCatTag(catName), entries });
      }
    }
    return { version, title, date, categories };
  });
}

// Render the structured, decluttered changelog into the shared sysModal: a
// version <select> dropdown (one version shown at a time, most-recent default),
// collapsible category <details> (first open, rest collapsed), diegetic tags and
// "> " bullets, capped to a ~700px reading column on desktop (see terminal.css).
// `text` is ALREADY env-filtered by the caller via _visibleChangelog().
function _showChangelogModal(text, title) {
  const content = document.getElementById('modalContent');
  document.getElementById('modalTitle').innerText = title;
  const versions = _parseChangelog(text);
  if (!versions.length) {
    content.innerHTML =
      '<div class="changelog-viewer"><p class="changelog-empty">&gt; [SYS-ALERT: NO REVISION DATA]</p></div>';
    openModal();
    return;
  }
  const renderCats = v => {
    const cats = v.categories
      .map((c, idx) => {
        const items = c.entries.map(e => '<li>&gt; ' + escapeHtml(e) + '</li>').join('');
        return (
          '<details class="changelog-cat"' +
          (idx === 0 ? ' open' : '') +
          '><summary><span class="changelog-cat-tag">' +
          escapeHtml(c.tag) +
          '</span><span class="changelog-cat-count"> · ' +
          c.entries.length +
          '</span></summary><ul class="changelog-entries">' +
          items +
          '</ul></details>'
        );
      })
      .join('');
    return cats || '<p class="changelog-empty">&gt; (no entries logged)</p>';
  };
  const metaText = v =>
    '> FIRMWARE REVISION ' +
    v.version +
    (v.date ? ' · ' + v.date : '') +
    (v.title ? ' · ' + v.title : '');
  const opts = versions
    .map(
      v =>
        '<option value="' +
        escapeHtml(v.version) +
        '">' +
        escapeHtml(v.version + (v.date ? ' — ' + v.date : '')) +
        '</option>'
    )
    .join('');
  const first = versions[0];
  content.innerHTML =
    '<div class="changelog-viewer">' +
    '<div class="changelog-firmware-head">FIRMWARE REVISION LOG</div>' +
    '<div class="changelog-ver-row"><label class="changelog-ver-label" for="changelogVersionSelect">&gt; REVISION:</label>' +
    '<select id="changelogVersionSelect" class="changelog-ver-select">' +
    opts +
    '</select></div>' +
    '<div class="changelog-meta" id="changelogMeta">' +
    escapeHtml(metaText(first)) +
    '</div>' +
    '<div class="changelog-controls">' +
    '<button type="button" id="changelogToggleAll" class="changelog-toggle-all" ' +
    'aria-label="Expand or collapse all changelog sections">&gt; EXPAND ALL</button>' +
    '</div>' +
    '<div class="changelog-cats" id="changelogCats">' +
    renderCats(first) +
    '</div></div>';
  const box = document.querySelector('#sysModal .modal-box');
  if (box) box.classList.add('changelog-wide');
  // WU-C15: expand/collapse-all toggle. Operates on the category <details> of the
  // currently-rendered version. The label reflects live state and re-syncs after a
  // version swap. Wired via addEventListener (no inline on* handler — keeps it out of
  // the inline-handler integrity surface, Suite 59).
  const toggleBtn = document.getElementById('changelogToggleAll');
  const _catsAllOpen = () => {
    const cats = content.querySelectorAll('.changelog-cat');
    return cats.length > 0 && Array.from(cats).every(d => d.open);
  };
  const _syncToggleLabel = () => {
    if (toggleBtn) toggleBtn.textContent = _catsAllOpen() ? '> COLLAPSE ALL' : '> EXPAND ALL';
  };
  const _wireCatToggles = () => {
    content
      .querySelectorAll('.changelog-cat')
      .forEach(d => d.addEventListener('toggle', _syncToggleLabel));
  };
  if (toggleBtn) {
    toggleBtn.addEventListener('click', () => {
      const open = !_catsAllOpen();
      content.querySelectorAll('.changelog-cat').forEach(d => {
        d.open = open;
      });
      _syncToggleLabel();
    });
  }
  _wireCatToggles();
  _syncToggleLabel();
  // Wire the dropdown to swap only the body + meta — the <select> element itself
  // persists across changes (no inline on* handler; addEventListener keeps it
  // out of the inline-handler integrity surface).
  const selEl = document.getElementById('changelogVersionSelect');
  if (selEl) {
    selEl.addEventListener('change', () => {
      const v = versions.find(x => x.version === selEl.value) || versions[0];
      const catsEl = document.getElementById('changelogCats');
      const metaEl = document.getElementById('changelogMeta');
      if (catsEl) catsEl.innerHTML = renderCats(v);
      if (metaEl) metaEl.textContent = metaText(v);
      _wireCatToggles(); // re-wire the freshly-rendered <details> (idx 0 open, rest closed)
      _syncToggleLabel();
    });
  }
  openModal();
}

function showFullChangelog() {
  fetch('CHANGELOG.md')
    .then(r => r.text())
    .then(text => {
      // Env gate first (prod hides [Unreleased], staging shows it), then render
      // the structured viewer over the already-filtered markdown.
      const visible = _visibleChangelog(text, _isStagingEnv());
      _showChangelogModal(visible, '> FIRMWARE REVISION LOG');
    })
    .catch(() => {
      document.getElementById('modalTitle').innerText = '> SYSTEM CHANGELOG';
      document.getElementById('modalContent').innerText = '> [SYS-ALERT: CHANGELOG NOT FOUND]';
      openModal();
    });
}

// ── SHARED SYSTEM MODAL (open / close / confirm) ────────────────
function _openSysModal() {
  _sysModalTrigger = document.activeElement || null;
  var modal = document.getElementById('sysModal');
  if (!modal) return;
  modal.style.display = 'flex';
  var closeBtn = modal.querySelector('.close-btn');
  if (closeBtn) closeBtn.focus();
}

// openModal({title, body, wide, onClose}) — Step 2 Phase 0 U12 (FP-SYS-8): the
// single consolidated driver for the shared #sysModal. Every feature that opens
// the system modal calls this — either bare (the caller already wrote
// modalTitle/modalContent directly, matching the pre-U12 call shape) or with
// {title, body} to have this function do the content-setting too. All callers
// share the ONE focus-trap implementation already wired in _wireKeyboardShortcuts()
// (Tab-cycle + Escape-close) — that part of D-2 was already unified pre-U12; this
// adds the single named entry point + the optional onClose hook confirmAction()
// needs. The index.html firmware-update dialog (_triggerUpdate) is a deliberate,
// separately tested exception (Suite 65) — a non-dismissable blocking modal that
// must never share this dismissable driver's Esc/close semantics, so it is not
// folded in here.
function openModal(opts) {
  opts = opts || {};
  const modal = document.getElementById('sysModal');
  if (!modal) return;
  if (opts.title !== undefined) {
    const t = document.getElementById('modalTitle');
    if (t) t.innerText = opts.title;
  }
  if (opts.body !== undefined) {
    const c = document.getElementById('modalContent');
    if (c) c.innerHTML = opts.body;
  }
  if (opts.wide !== undefined) {
    const box = modal.querySelector('.modal-box');
    if (box) box.classList.toggle('changelog-wide', !!opts.wide);
  }
  // Owner report: confirmAction() dialogs (WIPE TERMINAL and every other
  // confirm-gated destructive action) carry their own labeled CANCEL button
  // alongside the modal's always-present static "[ CLOSE INTERFACE ]" button
  // — both just dismiss, a duplicate cancel. hideCloseBtn lets confirmAction()
  // suppress the redundant static button (Protocol 22 — same class-toggle
  // idiom as `wide` above) so a confirm dialog reads as exactly one CONTINUE
  // + one CANCEL; every other openModal() caller (help, error log, changelog,
  // save help) is unaffected and keeps its one CLOSE INTERFACE button.
  if (opts.hideCloseBtn !== undefined) {
    const box = modal.querySelector('.modal-box');
    if (box) box.classList.toggle('confirm-mode', !!opts.hideCloseBtn);
  }
  _modalCloseCallback = typeof opts.onClose === 'function' ? opts.onClose : null;
  _openSysModal();
}

function closeModal() {
  const modal = document.getElementById('sysModal');
  modal.style.display = 'none';
  // Drop the changelog-only wide reading-column mode so the next modal (LOGS,
  // command reference, etc.) renders at the normal width (WU-C11).
  const box = modal.querySelector('.modal-box');
  if (box) box.classList.remove('changelog-wide');
  // Restore the static CLOSE INTERFACE button for the next modal open — a
  // confirmAction() dialog is the only caller that ever suppresses it.
  if (box) box.classList.remove('confirm-mode');
  if (_sysModalTrigger && typeof _sysModalTrigger.focus === 'function') {
    _sysModalTrigger.focus();
  }
  _sysModalTrigger = null;
  const cb = _modalCloseCallback;
  _modalCloseCallback = null;
  if (cb) cb();
}

// confirmAction({title, warning, confirmLabel, cancelLabel}) — Step 2 Phase 0 U12
// (FP-SYS-10): the diegetic replacement for the blocking browser confirm(). Returns
// a Promise<boolean> — true only if the CONFIRM button is explicitly clicked; every
// other exit (CANCEL button, the modal's own CLOSE button, or Escape) resolves
// false, exactly matching confirm()'s "anything but OK means cancel" contract so
// call sites that do `if (!(await confirmAction(...))) return;` behave identically
// to the old `if (!confirm(...)) return;` guard. Built on openModal()'s onClose
// hook: the CANCEL button, the CLOSE button, and Escape all funnel through the
// same closeModal() → onClose path, so there is exactly one resolution path for
// every non-confirm exit (no duplicated cancel logic to drift out of sync).
function confirmAction(opts) {
  opts = opts || {};
  return new Promise(resolve => {
    let resolved = false;
    const settle = val => {
      if (resolved) return;
      resolved = true;
      resolve(val);
    };
    const warningHtml = String(opts.warning || 'Are you sure?')
      .split('\n')
      .map(line => '<p>' + escapeHtml(line) + '</p>')
      .join('');
    const confirmLabel = opts.confirmLabel || 'CONFIRM';
    const cancelLabel = opts.cancelLabel || 'CANCEL';
    const body =
      '<div class="modal-confirm-body">' +
      warningHtml +
      '</div>' +
      '<div class="modal-confirm-actions">' +
      '<button type="button" id="modalConfirmYes" class="blue-btn">[ ' +
      escapeHtml(confirmLabel) +
      ' ]</button>' +
      '<button type="button" id="modalConfirmNo" class="blue-btn">[ ' +
      escapeHtml(cancelLabel) +
      ' ]</button>' +
      '</div>';
    openModal({
      title: opts.title || '> CONFIRM ACTION',
      body,
      hideCloseBtn: true,
      onClose: () => settle(false),
    });
    const yesBtn = document.getElementById('modalConfirmYes');
    const noBtn = document.getElementById('modalConfirmNo');
    if (yesBtn)
      yesBtn.addEventListener('click', () => {
        settle(true);
        closeModal();
      });
    if (noBtn)
      noBtn.addEventListener('click', () => {
        closeModal();
      });
    // Default focus on CANCEL — mirrors the safe default for a destructive-leaning
    // confirmation dialog (an accidental Enter/Space never fires the confirm path).
    if (noBtn) noBtn.focus();
  });
}

// ── CLIENT ERROR LOG VIEWER (reads the ring-buffer at file top) ──
function _clearErrorLog() {
  MetaStore.remove(ERROR_LOG_KEY);
  showErrorLog();
  _updateFaultLamp();
}
function showErrorLog() {
  const modal = document.getElementById('sysModal');
  const title = document.getElementById('modalTitle');
  const content = document.getElementById('modalContent');
  if (!modal || !title || !content) return;
  title.innerText = '> CLIENT ERROR LOG';
  let log = [];
  try {
    log = JSON.parse(MetaStore.get(ERROR_LOG_KEY) || '[]');
  } catch (_) {}
  if (log.length === 0) {
    content.innerHTML = '<pre style="color:var(--robco-dim)">No errors recorded.</pre>';
  } else {
    const rows = log
      .map(e => {
        const ts = new Date(e.t).toISOString().replace('T', ' ').slice(0, 19);
        return (
          '<div style="margin-bottom:6px;border-bottom:1px solid var(--robco-dim);padding-bottom:4px">' +
          '<span style="color:var(--robco-dim);font-size:10px">' +
          escapeHtml(ts) +
          ' [' +
          escapeHtml(e.type || '?') +
          ']</span><br>' +
          '<span>' +
          escapeHtml(e.msg || '') +
          '</span></div>'
        );
      })
      .join('');
    content.innerHTML =
      '<div style="font-size:11px">' +
      rows +
      '<button class="action-btn" style="margin-top:6px;font-size:10px" ' +
      'onclick="_clearErrorLog()">' +
      'CLEAR LOGS</button></div>';
  }
  openModal();
}

// ── loadUI() — MASTER PER-TICK RENDER PASS ──────────────────────
// Every panel below is gated by _isDirty() (the render-signature cache
// declared at the top of this file), so a loadUI() call is cheap when
// nothing relevant changed — it always re-syncs the raw stat inputs, but
// only re-renders a panel's DOM when that panel's own state slice differs
// from its last-rendered signature.
function seedNewCampaignInventory(ctx) {
  const seedItems = (GAME_DEFS[ctx] || GAME_DEFS.FNV).seedInventory || [];
  if (seedItems.length === 0) return;
  if ((state.inventory || []).length !== 0) return;
  if ((state.ticks || 0) !== 0) return;
  state.inventory = state.inventory || [];
  seedItems.forEach(item => state.inventory.push({ ...item }));
}

function loadUI() {
  seedNewCampaignInventory(state.gameContext);
  if (_isDirty('skills', { sk: state.skills, ctx: state.gameContext })) renderSkills();
  document.getElementById('stat_lvl').value = state.lvl;
  document.getElementById('stat_xp').value = state.xp;
  document.getElementById('stat_hp_cur').value = state.hpCur;
  document.getElementById('stat_hp_max').value = state.hpMax;
  ['s', 'p', 'e', 'c', 'i', 'a', 'l'].forEach(
    k => (document.getElementById('s_' + k).value = state[k])
  );
  document.getElementById('c_caps').value = state.caps;
  document.getElementById('stat_loc').value = state.loc;
  document.getElementById('stat_rads').value = state.rads;
  document.getElementById('stat_karma').value = state.karma;
  // TIME: decompose ticks → Calendar Date (M/D/Y) + H/M inputs
  {
    const t = state.ticks || 0;
    const dt = _resolveGameDateTime(t);
    const hr = Math.floor((t % 240) / 10);
    const mn = (t % 10) * 6;
    const calMonthEl = document.getElementById('cal_month');
    const calDayEl = document.getElementById('cal_day');
    const calYearEl = document.getElementById('cal_year');
    const hrEl = document.getElementById('time_hour');
    const minEl = document.getElementById('time_min');
    const hidden = document.getElementById('stat_ticks');
    const hiddenDay = document.getElementById('time_day');
    if (calMonthEl) calMonthEl.value = dt.month + 1; // _resolveGameDateTime uses 0-indexed month
    if (calDayEl) calDayEl.value = dt.day;
    if (calYearEl) calYearEl.value = dt.year;
    if (hrEl) hrEl.value = hr;
    if (minEl) minEl.value = mn;
    if (hidden) hidden.value = t;
    if (hiddenDay) hiddenDay.value = Math.floor(t / 240) + 1;
  }
  // Skills — use getSkillKeys() for context-aware FNV/FO3 support
  getSkillKeys().forEach(sk => {
    let el = document.getElementById('sk_' + sk);
    if (el) el.value = state.skills && state.skills[sk] !== undefined ? state.skills[sk] : 15;
  });
  // All limbs including head
  var _limbNames = { la: 'Left Arm', ra: 'Right Arm', ll: 'Left Leg', rl: 'Right Leg', hd: 'Head' };
  // U6 Strand 2 (G-1): the FO3 Pip-Boy mockup labels each limb box (HEAD,
  // L.ARM, L.LEG / R.ARM, R.LEG) — today the name only reaches AT via
  // aria-label above, with nothing visible on screen. A short abbreviation
  // map, separate from the full-word aria map, matches the mockup's boxed-
  // field width. `hidden` by default (the same idiom .fd-name already
  // uses) — NV never reveals it, no FNV-exclusion CSS needed, no game
  // literal here (Protocol 38).
  var _limbShortNames = { la: 'L.ARM', ra: 'R.ARM', ll: 'L.LEG', rl: 'R.LEG', hd: 'HEAD' };
  ['la', 'ra', 'll', 'rl', 'hd'].forEach(k => {
    let btn = document.getElementById('btn_l_' + k);
    if (!btn) return;
    const isCrippled = state[k] !== 'OK';
    const nameSpan = '<span class="zone-name" hidden>' + _limbShortNames[k] + '</span>';
    if (!isCrippled) {
      btn.className = 'limb-ok';
      btn.innerHTML = nameSpan + '<span class="zone-status">[██████] OK</span>';
    } else {
      btn.className = 'limb-crip limb-glitch';
      btn.innerHTML = nameSpan + '<span class="zone-status">[░░░░░░] CRIPPLED</span>';
    }
    btn.setAttribute('aria-pressed', isCrippled ? 'true' : 'false');
    btn.setAttribute('aria-label', (_limbNames[k] || k) + ': ' + (isCrippled ? 'Crippled' : 'OK'));
    // U6 Strand 6: the Vault Boy figure is a projection of this SAME
    // isCrippled value — one state, one code path (Protocol 22/24), never
    // a second source of truth. Scoped to .vaultboy-fig so this never
    // touches the (hidden-under-FO3) legacy .zone-body plate, which has
    // its own [data-limb] elements and its own sync function
    // (_syncBioHarnessZones(), called below).
    const figLimb = document.querySelector('.vaultboy-fig [data-limb="' + k + '"]');
    if (figLimb) figLimb.classList.toggle('crippled', isCrippled);
  });
  // PHASE 3 · OPERATOR BUS-03: sync the SVG zone plate — the "second
  // projection" of the exact same state.la/ra/ll/rl/hd this loop already
  // reads (Protocol 22 single-apply — never a second state source).
  if (typeof _syncBioHarnessZones === 'function') _syncBioHarnessZones();
  updateKarmaUI();
  if (_isDirty('inv', { inv: state.inventory, f: _invFilter })) renderInventory();
  if (_isDirty('ammo', state.ammo)) renderAmmo();
  if (_isDirty('squad', state.squad)) renderSquad();
  if (_isDirty('status', state.status)) renderStatus();
  if (_isDirty('notes', state.campaign_notes)) renderCampaignNotes();
  // DATABANK panel (WU-N4b option C) is input-driven, not state-driven — re-render its
  // results for the current search each loadUI so the panel stays in sync (read-only, cheap).
  if (typeof renderDatabankPanel === 'function') renderDatabankPanel();
  if (_isDirty('factions', state.factions)) renderFactionRep();
  if (_isDirty('perks', state.perks)) renderPerks();
  if (_isDirty('quests', state.quests)) renderQuests();
  if (
    _isDirty('sessionstats', {
      st: state.stats,
      col: state.collectibles,
      ticks: state.ticks,
      lh: state.locationHistory,
    })
  )
    renderSessionStats();
  if (_isDirty('equipped', state.equipped)) renderEquipped();
  if (_isDirty('collectibles', { col: state.collectibles, ctx: state.gameContext }))
    renderCollectibles();
  if (_isDirty('lincoln', { li: state.lincolnItems, ctx: state.gameContext }))
    renderLincolnMemorabilia();
  if (_isDirty('traits', { tr: state.traits, ctx: state.gameContext })) renderTraits();
  if (_isDirty('skillbooks', { sb: state.skillBooks, ctx: state.gameContext })) renderSkillBooks();
  if (_isDirty('magazines', { mg: state.magazines, ctx: state.gameContext })) renderMagazines();
  if (
    _isDirty('craft', {
      inv: state.inventory,
      ammo: state.ammo,
      sk: state.skills,
      ctx: state.gameContext,
    })
  )
    renderCraft();
  if (
    _isDirty('trade', {
      caps: state.caps,
      inv: state.inventory,
      barter: state.skills && state.skills.barter,
      ctx: state.gameContext,
    })
  )
    renderTrade();
  if (_isDirty('gamedate', { ticks: state.ticks, ctx: state.gameContext })) renderGameDate();
  // G6: Regional Zone Map — skip when DATA tab is not active (B-P1: map work is invisible off-tab;
  // switchTab('data') at ui-core.js:891 re-renders when the user switches to it). Checks panel
  // visibility directly (DO-N: decoupled from which UI drives the tab — bezel keycap or otherwise).
  if (document.querySelector('.panel[data-tab="data"].tab-visible')) {
    if (
      _isDirty('worldmap', {
        lh: state.locationHistory,
        col: state.collectibles,
        loc: state.loc,
        mv: state.mapView,
        li: state.lincolnItems,
        ctx: state.gameContext,
      })
    )
      renderWorldMap();
  }
  // Karma Engine rebuild: the live-drag/level-change dirty-check that
  // decides WHEN to recompute now lives in updateMath() (see there for why —
  // neither the slider's oninput nor the level-change handlers call
  // loadUI()). loadUI() itself is only a full-repaint path (boot, tab
  // switch, campaign load), so it always calls the renderer unconditionally
  // here — matching the renderDatabankPanel() precedent just above — which
  // also keeps this function reachable from loadUI() (Protocol 22/architecture
  // convention that every render*() is called from loadUI()).
  if (typeof renderKarmaCenter === 'function') renderKarmaCenter(); // G4: FO3 Karma Center
  if (
    _isDirty('campstatus', {
      q: state.quests,
      f: state.factions,
      s: state.status,
      n: state.campaign_notes,
      el: state.eventLog, // P4: Crossroads + Incident views read the Terminal Record
    })
  )
    renderCampaignStatus(); // v2.0.1: Campaign Status + Crossroads Record + Incident Log
  renderAccount(); // always — reads Firebase auth state, not covered by state slice
  renderSavesList(); // always — reads localStorage/cloud saves, not covered by state slice
  if (typeof renderOverseerLog === 'function') renderOverseerLog(); // WU-F7: local device telemetry, not a state slice
  if (typeof renderSystemStatus === 'function') renderSystemStatus(); // CHASSIS: firmware/cache/carrier/flags, not a state slice
  _updateContextPanels(); // G4: switch faction/karma panel visibility
  // C5/C11: Restore CAMPG dropdowns from state
  {
    const ptSel = document.getElementById('playthroughTypeSelect');
    if (ptSel) ptSel.value = state.playthroughType || 'standard';
    const mode = (state && state.campaignMode) || 'standard';
    const locked = mode === 'rng-locked';
    const armed = mode === 'rng';
    const cb = document.getElementById('completeRngToggle');
    if (cb) {
      cb.checked = locked || armed;
      cb.disabled = locked; // cannot uncheck when permanently active
    }
    // The armed/locked banners are painted by _syncInterlockUI() below (Protocol
    // 22 — one repaint function owns the whole board, not a duplicate here too).
  }
  // SU-3: keep the CAMPAIGN PROFILE / RANDOMIZER INTERLOCK custom controls (and
  // the armed/locked banners) in sync with state on every loadUI() pass too
  // (e.g. an AI-driven update, or wipeTerminal()'s post-wipe loadUI() call).
  if (typeof _syncCampaignProfileUI === 'function') _syncCampaignProfileUI();
  if (typeof _syncInterlockUI === 'function') _syncInterlockUI();
  updateMath();
  triggerPhosphorGhost();
  // Radiation SPECIAL debuff coloring (display-only, does not modify state)
  const rads = state.rads || 0;
  const radDebuffs = {};
  if (rads >= 200) {
    radDebuffs.e = true;
  }
  if (rads >= 400) {
    radDebuffs.e = true;
    radDebuffs.a = true;
  }
  if (rads >= 600) {
    radDebuffs.e = true;
    radDebuffs.a = true;
    radDebuffs.s = true;
  }
  if (rads >= 800) {
    radDebuffs.e = true;
    radDebuffs.a = true;
    radDebuffs.s = true;
    radDebuffs.p = true;
  }
  if (rads >= 1000) {
    ['s', 'p', 'e', 'c', 'i', 'a', 'l'].forEach(k => (radDebuffs[k] = true));
  }
  ['s', 'p', 'e', 'c', 'i', 'a', 'l'].forEach(k => {
    const el = document.getElementById('s_' + k);
    if (!el) return;
    if (radDebuffs[k]) {
      el.style.color = 'var(--robco-danger)';
      el.title = 'RAD debuff active';
      // U7: a second, non-color signal for the same state (Protocol 17 —
      // never convey meaning by color alone; the FO3 CSS also neutralizes
      // this inline red to green, per the owner's real-device reference
      // that the FO3 screen never shows red — this class is what still
      // reads as "debuffed" once the color is gone).
      el.classList.add('rad-debuffed');
    } else {
      el.style.color = '';
      el.title = '';
      el.classList.remove('rad-debuffed');
    }
  });
}

// ── KARMA / HP / contextual-message gate variables ────────────
let _lastKarma = null,
  _lastHpPct = null;

// Contextual terminal message gate variables
// Each tracks the last-emitted threshold so we only fire once per crossing.
let _lastRadThreshold = 0; // 0 / 200 / 400 / 600 / 1000
// FEEDBACK ANIMATION WAVE 1: maps the threshold ladder above onto the SAME
// NONE/MINOR/ADVANCED/SEVERE tier names _bioScanCompute() already uses
// (Protocol 22 — no second breakpoint table).
function _radTierName(threshold) {
  return threshold >= 600
    ? 'SEVERE'
    : threshold >= 400
      ? 'ADVANCED'
      : threshold >= 200
        ? 'MINOR'
        : 'NONE';
}
let _lastGameHourBand = -1; // 0=night(20-5), 1=morning(6-11), 2=day(12-18), 3=evening(19)
let _lastChemExpiry = new Set(); // names of chems we've already warned about

// ── updateMath() — DERIVED-STAT REPAINT + AUDIO/VISUAL THRESHOLD GATES ──
// Recomputes AP/carry-weight/HP%/XP%/rad tier from the current DOM + state,
// repaints every dependent visual (bars, body classList flags, the weigh
// bridge, the bezel telemetry strip), fires the one-shot contextual chat
// messages and audio cues on each threshold crossing, and — GOTCHA — ends by
// calling saveState(), so every call to updateMath() schedules a debounced
// persist. loadUI() and most stat-editing call sites already call this once
// per user action; avoid adding a new call inside a tight loop or a per-frame
// handler without accounting for that.
function updateMath() {
  let maxAp = 65 + state.a * 3;
  document.getElementById('display_ap').innerText = maxAp;
  let maxWeight = 150 + state.s * 10;
  // Exclude ammo-typed items from carry weight — ammo items that leaked into
  // state.inventory from old saves would be invisible (filtered from render)
  // but would still add phantom weight without this filter.
  let curWt = state.inventory
    .filter(item => (item.type || 'misc') !== 'ammo')
    .reduce((acc, item) => acc + item.qty * item.wgt, 0);
  document.getElementById('display_weight').innerText = `${curWt.toFixed(1)} / ${maxWeight}`;
  // Color now rides the body.weight-heavy/-critical/-over classes (toggled
  // below) via CSS instead of an inline style — the LOAD-CELL WEIGH BRIDGE
  // (OPERATIONS BUS-10) needs the same 3-tier nominal/amber/red readout the
  // bridge instrument itself uses, and a single CSS rule keeps both in sync
  // (Phase 3 · Piece 2).

  // HP Bar update + Critical HP Flash (#37)
  let hpFill = document.getElementById('hp_bar_fill');
  if (hpFill) {
    let hpCur = parseInt(document.getElementById('stat_hp_cur').value) || 0;
    let hpMax = parseInt(document.getElementById('stat_hp_max').value) || 100;
    let pct = Math.min(100, Math.max(0, (hpCur / hpMax) * 100));
    hpFill.style.width = pct + '%';
    if (pct > 60) hpFill.style.background = 'var(--robco-green)';
    else if (pct > 25) hpFill.style.background = 'var(--robco-alert)';
    else hpFill.style.background = 'var(--robco-danger)';
    // Flash red when HP drops into critical territory — a state crossing,
    // emitted through the bus (U7); the flash + haptic below is the subscriber.
    if (_lastHpPct !== null && _lastHpPct > 25 && pct <= 25) {
      RobcoEvents.emit('hp.critical', { pct });
    }
    _lastHpPct = pct;
    // FEEDBACK ANIMATION WAVE 1 (#1 FLATLINE WARNING) — a continuous red
    // glass-edge vignette for as long as HP stays critical (not just the
    // crossing), breathing in time with the existing HEARTBEAT channel —
    // both gated on the SAME pct<25 condition (Protocol 22), so they can
    // never drift out of sync with each other.
    document.body.classList.toggle('hp-critical-vignette', pct < 25 && hpMax > 0);
    // H4: Low Health Heartbeat — start when HP < 25%, stop when >= 25%
    // Deferred to the first user gesture (_armAmbientAudio, ui-audio.js) — an
    // existing save loaded already-critical spams blocked-autoplay warnings
    // otherwise, since the heartbeat's own ~833ms interval keeps retrying.
    if (pct < 25 && hpMax > 0) {
      _armAmbientAudio(() => startHeartbeat(pct / 100));
    } else {
      stopHeartbeat();
    }
  }

  // XP progress bar — reads DOM directly (same approach as HP bar) to avoid stale state reads
  let xpFill = document.getElementById('xp_bar_fill');
  if (xpFill) {
    let lvl = Math.max(1, parseInt(document.getElementById('stat_lvl').value) || 1);
    let xp = parseInt(document.getElementById('stat_xp').value) || 0;
    let xpCur = lvl <= 1 ? 0 : 75 * (lvl * lvl) - 25 * lvl - 50;
    let xpNext = 75 * ((lvl + 1) * (lvl + 1)) - 25 * (lvl + 1) - 50;
    let pct =
      lvl >= MAX_PLAYER_LEVEL
        ? 100
        : Math.min(100, Math.max(0, ((xp - xpCur) / (xpNext - xpCur)) * 100));
    xpFill.style.width = pct + '%';
    // Native LEVEL UP control (owner report): ungated by XP — only disabled
    // once the player has actually reached MAX_PLAYER_LEVEL.
    const levelUpBtn = document.getElementById('btnLevelUp');
    if (levelUpBtn) levelUpBtn.disabled = lvl >= MAX_PLAYER_LEVEL;
  }

  // Karma Flash (#30) — flash when karma polarity changes or large delta
  let curKarma = parseInt(document.getElementById('stat_karma').value) || 0;
  if (_lastKarma !== null && curKarma !== _lastKarma) {
    const delta = curKarma - _lastKarma;
    if (Math.abs(delta) >= 50) {
      const cls = delta > 0 ? 'karma-flash-good' : 'karma-flash-evil';
      document.body.classList.remove('karma-flash-good', 'karma-flash-evil');
      void document.body.offsetWidth;
      document.body.classList.add(cls);
      setTimeout(() => document.body.classList.remove(cls), 950);
    }
  }
  _lastKarma = curKarma;

  // Karma Engine rebuild (Protocol 8 Stage 2) — the Karma Center's title/
  // tier/hit-squad/companion readout is level-scaled (getKarmaTitle(karma,
  // lvl)), so it must recompute live on BOTH a karma change (dragging
  // #stat_karma) and a level-only change (state.lvl set directly by
  // onLvlInputChanged()/nativeLevelUp(), neither of which touch state.karma).
  // updateMath() is the one function every one of those paths already calls,
  // so it is the single correct hook point (moved here from loadUI(), which
  // none of those paths call) — Protocol 27: reproduced live via Playwright
  // before fixing; a slider drag left the board stale until the debounced
  // save eventually re-synced state.karma, which loadUI() never re-ran to
  // pick up.
  if (_isDirty('karma', { k: state.karma, lvl: state.lvl, ctx: state.gameContext }))
    if (typeof renderKarmaCenter === 'function') renderKarmaCenter(); // G4: FO3 Karma Center

  // FEEDBACK ANIMATION WAVE 2 (#17 CAPS ODOMETER SPIN) — caps has no
  // dedicated drag setter like hp/xp/rads, so this reads the one real #c_caps
  // field every updateMath() tick (the karma-flash pattern just above) and
  // routes through the SAME shared _emitStatChangeIfDiffers() helper
  // (Protocol 22) — covers manual edits, doBuy/doSell's caps mirror, and any
  // AI caps write, since every one of those paths already calls updateMath().
  const capsEl = document.getElementById('c_caps');
  if (capsEl) _emitStatChangeIfDiffers('caps', parseInt(capsEl.value) || 0);

  // Day/Night Indicator (#12) — toggle class based on in-game hour
  const gameHour = Math.floor(((state.ticks || 0) % 240) / 10);
  if (gameHour >= 20 || gameHour < 6) {
    document.body.classList.add('time-night');
  } else {
    document.body.classList.remove('time-night');
  }

  // Radiation tracking: color escalation + CRT screen interference
  let radEl = document.getElementById('stat_rads');
  if (radEl) {
    let rads = parseInt(radEl.value) || 0;
    if (rads >= 600) {
      radEl.style.color = 'var(--robco-danger)';
      radEl.style.animation = 'rad-pulse 0.8s ease-in-out infinite';
    } else if (rads >= 400) {
      radEl.style.color = '#e67e22';
      radEl.style.animation = 'rad-pulse 1.5s ease-in-out infinite';
    } else if (rads >= 200) {
      radEl.style.color = 'var(--robco-alert)';
      radEl.style.animation = 'none';
    } else {
      radEl.style.color = 'var(--robco-green)';
      radEl.style.animation = 'none';
    }
    // Drive CRT flicker/glitch off radiation threshold
    document.body.classList.remove('rad-warning', 'rad-critical', 'rad-fatal');
    if (rads >= 1000) document.body.classList.add('rad-fatal');
    else if (rads >= 600) document.body.classList.add('rad-critical');
    else if (rads >= 200) document.body.classList.add('rad-warning');
    // Audio systems — only update when rad level or limb status actually changes
    let hasCrippled = ['la', 'ra', 'll', 'rl', 'hd'].some(l => state[l] !== 'OK');
    if (rads !== _lastRads || hasCrippled !== _lastCrippled) {
      _lastRads = rads;
      _lastCrippled = hasCrippled;
      setGeigerRate(rads >= 1000 ? 25 : rads >= 600 ? 12 : rads >= 200 ? 0.33 : 0);
      // Deferred to the first gesture (_armAmbientAudio) — same blocked-autoplay
      // spam risk as the heartbeat above when an existing save already has high
      // rads/a crippled head at boot.
      if (rads >= 600 || state.hd === 'CRIPPLED') _armAmbientAudio(startTinnitus);
      else stopTinnitus();
      setCrtHumIntensity(rads, hasCrippled);
    }
  }

  // Carry weight interface deformation
  document.body.classList.remove('weight-heavy', 'weight-critical', 'weight-over');
  if (curWt >= maxWeight) document.body.classList.add('weight-over');
  else if (curWt >= maxWeight * 0.9) document.body.classList.add('weight-critical');
  else if (curWt >= maxWeight * 0.75) document.body.classList.add('weight-heavy');
  // OPERATIONS BUS-10 LOAD-CELL WEIGH BRIDGE — read-only mirror of the same
  // curWt/maxWeight this function already computed; painted from this one
  // apply path so the bridge and OPERATOR's own display_weight can never
  // disagree (Phase 3 · Piece 2, Protocol 22 single-apply).
  if (typeof _paintWeighBridge === 'function') _paintWeighBridge(curWt, maxWeight);

  // #25 Radiation Treatment Alert — compute how many RadAway doses needed.
  // PHASE 3: #radAwayAlert now wraps a lamp <i> + a #radAwayAlertText span
  // (the .radaway-lamp reskin) instead of being a plain text node — the
  // message goes on that inner span (never alertEl.textContent directly,
  // which would wipe out the lamp <i>), and display flips to 'flex' to match
  // the lamp's icon+text row layout. Same show/hide/color logic as before.
  {
    const rads = state.rads || 0;
    const alertEl = document.getElementById('radAwayAlert');
    const alertTextEl = document.getElementById('radAwayAlertText');
    if (alertEl) {
      if (rads >= 200) {
        const dosesNeeded = Math.ceil(rads / 150);
        const hasRadAway = state.inventory.some(i => /radaway/i.test(i.name));
        const msg = `RAD TREATMENT: ~${dosesNeeded} RadAway needed${hasRadAway ? ' — RadAway in pack' : ' — NONE IN PACK'}`;
        if (alertTextEl) alertTextEl.textContent = msg;
        else alertEl.textContent = msg; // fail-safe if the lamp markup isn't present
        alertEl.style.display = 'flex';
        alertEl.style.color = hasRadAway ? 'var(--robco-alert)' : 'var(--robco-danger)';
      } else {
        alertEl.style.display = 'none';
      }
    }
  }

  // PHASE 3 · OPERATOR hero-three instrument sync (Protocol 22 reskin) —
  // reads the exact same DOM this function already updated above; drives the
  // new CRT-trace/fader-ladder/zone-plate/board-status visuals. One new call
  // site, no forked logic.
  _syncOperatorTelemetry();

  // Notification Badges (#13) — update panel summary badges after all renders
  _updatePanelBadges();

  // ── CONTEXTUAL TERMINAL MESSAGES ────────────────────────────────
  // These fire once per threshold crossing so the terminal gives situational
  // feedback without spamming. Gate variables ensure single-fire per state.
  {
    // Radiation threshold crossing messages
    const curRads = parseInt((document.getElementById('stat_rads') || {}).value) || 0;
    const radThreshold =
      curRads >= 1000
        ? 1000
        : curRads >= 600
          ? 600
          : curRads >= 400
            ? 400
            : curRads >= 200
              ? 200
              : 0;
    if (radThreshold !== _lastRadThreshold) {
      if (radThreshold > _lastRadThreshold) {
        // Escalating
        const radMsgs = {
          200: '> RADIATION DETECTED. GEIGER COUNTER ACTIVE. SEEK DECONTAMINATION.',
          400: '> RAD LEVEL ELEVATED. HP DEGRADATION RISK. RADAWAY RECOMMENDED.',
          600: '> CRITICAL IRRADIATION. SEEK IMMEDIATE TREATMENT.',
          1000: '> FATAL RADIATION EXPOSURE. SURVIVAL PROBABILITY: NEGLIGIBLE.',
        };
        if (radMsgs[radThreshold]) appendToChat(radMsgs[radThreshold], 'sys', true);
      } else if (radThreshold < _lastRadThreshold && _lastRadThreshold > 0) {
        // De-escalating
        appendToChat('> RADIATION LEVELS DECLINING. DECONTAMINATION IN PROGRESS.', 'sys', true);
      }
      // FEEDBACK ANIMATION WAVE 1 (#4 GEIGER SPIKE / #5 RADAWAY DRAIN): one
      // additive emit at this EXISTING crossing detector (U7 hp.critical
      // precedent) — reuses _bioScanCompute's own NONE/MINOR/ADVANCED/SEVERE
      // breakpoints (200/400/600), never a new literal (Protocol 22/38).
      RobcoEvents.emit('rad.tier', {
        tier: _radTierName(radThreshold),
        direction: radThreshold > _lastRadThreshold ? 'up' : 'down',
      });
      _lastRadThreshold = radThreshold;
    }

    // Time-of-day transition messages (fires once per band change)
    const gameHr = Math.floor(((state.ticks || 0) % 240) / 10);
    const hourBand = gameHr >= 20 || gameHr < 6 ? 0 : gameHr < 12 ? 1 : gameHr < 19 ? 2 : 3;
    if (_lastGameHourBand !== -1 && hourBand !== _lastGameHourBand) {
      const bandMsgs = [
        '> NIGHT CYCLE. CURFEW IN EFFECT. TRAVEL WITH CAUTION.',
        '> DAWN DETECTED. AMBIENT TEMPERATURE RISING.',
        '> MIDDAY. VISIBILITY OPTIMAL.',
        '> DUSK. PREPARE FOR NIGHT CYCLE.',
      ];
      appendToChat(bandMsgs[hourBand], 'sys', true);
    }
    _lastGameHourBand = hourBand;

    // Expiring chem warnings (ticks 1–2, fire once per chem name)
    if (state.status && state.status.length > 0) {
      state.status.forEach(eff => {
        if (eff.type === 'BUFF' && (eff.ticks || 0) > 0 && (eff.ticks || 0) <= 2) {
          const key = (eff.name || '').toLowerCase();
          if (!_lastChemExpiry.has(key)) {
            _lastChemExpiry.add(key);
            appendToChat(
              `> CHEM WARNING: ${(eff.name || 'UNKNOWN').toUpperCase()} WEARING OFF. [${eff.ticks}T REMAINING]`,
              'sys',
              true
            );
          }
        } else {
          // Reset if ticks went up (new dose) or effect removed
          const key = (eff.name || '').toLowerCase();
          if ((eff.ticks || 0) > 2) _lastChemExpiry.delete(key);
        }
      });
    }
  }

  // FIX 5 (owner report): the bezel VITALS/RAD strip is HP/rads/limb-driven —
  // updateMath() is the single choke point every HP/rads DOM edit and every
  // limb toggle (via loadUI()) already runs through, so this keeps the strip
  // live without a second listener (Protocol 22).
  if (typeof _refreshBezelTelemetry === 'function') _refreshBezelTelemetry();

  saveState();
}

// ── TEXT FORMATTING HELPERS ──────────────────────────────────────────
function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function emptyState(msg) {
  return '<span class="empty-state">' + escapeHtml(msg) + '</span>';
}

// Escape first (prevents XSS), then apply known-safe HTML replacements
function escapeAndFormat(text) {
  const escaped = String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/```[a-z]*\n?/gi, '')
    .replace(/```/g, '');
  return (
    escaped
      .replace(/\*\*(.*?)\*\*/g, '<b>$1</b>')
      .replace(/\u25b2/g, '<span class="delta-up">\u25b2</span>')
      .replace(/\u25bc/g, '<span class="delta-down">\u25bc</span>')
      // #29 Skill Check Indicators: highlight [SkillName N] patterns (e.g. [Speech 50])
      .replace(/\[([A-Za-z_ ]+)\s+(\d{1,3})\]/g, (match, skill, req) => {
        const skillKey = skill.toLowerCase().replace(/\s+/g, '_');
        if (getSkillKeys().includes(skillKey)) {
          const playerVal = (state.skills && state.skills[skillKey]) || 0;
          const pass = playerVal >= parseInt(req);
          const color = pass ? 'var(--robco-green)' : 'var(--robco-danger)';
          // Ping the skill input in the UI
          setTimeout(() => {
            const el = document.getElementById('sk_' + skillKey);
            if (el) {
              el.classList.remove('skill-ping');
              void el.offsetWidth;
              el.classList.add('skill-ping');
              setTimeout(() => el.classList.remove('skill-ping'), 1250);
            }
          }, 50);
          return `<span style="color:${color};font-weight:bold;" title="Your ${skill}: ${playerVal}">[${skill} ${req}${pass ? ' ✓' : ' ✗'}]</span>`;
        }
        return match;
      })
  );
}

function getTypewriterSpeed(text) {
  // #34 Typewriter Speed Control: user-set multiplier (0.25×–2×) stored in localStorage
  const speedMult = parseFloat(MetaStore.get('robco_typer_speed') || '1');
  let base;
  if (/\b(dead|fatal|crit|ambush|explosion|killed|bleeding|dying)\b/i.test(text)) base = 2;
  else if (/\b(rest|wait|camp|safe|sleep|heal|recover)\b/i.test(text)) base = 40;
  else base = 15;
  return Math.max(1, Math.round(base * (1 / speedMult)));
}

// ── CHAT TRANSCRIPT RENDERING (appendToChat + typewriter) ───────
function appendToChat(text, sender, isHistoryLoad = false) {
  if (!text) return;
  const chatBox = document.getElementById('chatDisplay');
  const msgDiv = document.createElement('div');
  msgDiv.className = sender === 'user' ? 'msg-user' : sender === 'sys' ? 'msg-sys' : 'msg-ai';
  chatBox.appendChild(msgDiv);

  // Owner batch: unified transcript source tag — AI/Overseer-side lines carry an
  // OVERSEER tag, mirroring the existing [TERM] quick-log text prefix, so a shared
  // transcript still shows at a glance which side (native TERMINAL vs Director
  // OVERSEER) produced each line. Derived from `sender` every render (display-only,
  // never written into `text`/chatHistory), so it can never double up on a history
  // replay. A dedicated content span keeps the typewriter's textContent/innerHTML
  // writes scoped to the message body — never wiping the tag (Protocol 22).
  const msgContent = document.createElement('span');
  msgContent.className = 'msg-content';
  if (sender === 'ai') {
    const tagEl = document.createElement('span');
    tagEl.className = 'msg-tag msg-tag--overseer';
    tagEl.textContent = 'OVERSEER';
    msgDiv.appendChild(tagEl);
  } else if (sender === 'user') {
    // Style A cleanup (owner-approved mockup): the user side gets a matching
    // phosphor TERMINAL tag above its lines, for symmetry with OVERSEER — the
    // existing "> " chevron (baked into the text at the transmitMessage()
    // call sites) is kept alongside it.
    const tagEl = document.createElement('span');
    tagEl.className = 'msg-tag msg-tag--terminal';
    tagEl.textContent = 'TERMINAL';
    msgDiv.appendChild(tagEl);
  }
  msgDiv.appendChild(msgContent);

  // Build safe HTML once — escapes first, then applies formatting
  const fullHtml = escapeAndFormat(text);

  const _prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (sender === 'ai' && !isHistoryLoad && !_prefersReduced) {
    // DO-O: the Director is TRANSMITTING for the duration of the typewriter.
    if (typeof window.setOverseerState === 'function') window.setOverseerState('speaking');
    // Typewriter: reveal plain text with textContent (no parse cost, no XSS risk),
    // then swap to fully formatted innerHTML only once at animation end.
    const plainText = String(text)
      .replace(/```[a-z]*\n?/gi, '')
      .replace(/```/g, '');
    let i = 0;
    const speed = getTypewriterSpeed(text);
    const batchSize = speed <= 4 ? 4 : 1;

    function typeWriter() {
      if (i < plainText.length) {
        i = Math.min(i + batchSize, plainText.length);
        msgContent.textContent = plainText.substring(0, i);
        if (i % 3 === 0) playClack();
        chatBox.scrollTop = chatBox.scrollHeight;
        setTimeout(typeWriter, speed);
      } else {
        // Animation complete — apply full safe HTML formatting
        msgContent.innerHTML = fullHtml;
        chatBox.scrollTop = chatBox.scrollHeight;
        // DO-O: the typewriter owns the SPEAKING → LISTENING reset (transmitMessage's
        // finally hook only resets from 'thinking' — never truncates this).
        if (typeof window.setOverseerState === 'function') window.setOverseerState('listening');
      }
    }
    typeWriter();
  } else {
    msgContent.innerHTML = fullHtml;
    chatBox.scrollTop = chatBox.scrollHeight;
    // DO-O: reduced-motion / isHistoryLoad-false instant branch — the reply
    // is already fully delivered, so SPEAKING → LISTENING fires immediately.
    if (sender === 'ai' && !isHistoryLoad && typeof window.setOverseerState === 'function') {
      window.setOverseerState('speaking');
      window.setOverseerState('listening');
    }
  }

  if (!isHistoryLoad) {
    chatHistory.push({ text, sender });
    // Cap in-memory history and debounce the localStorage write
    if (chatHistory.length > CHAT_MAX) chatHistory = chatHistory.slice(-CHAT_MAX);
    clearTimeout(_chatSaveTimer);
    _chatSaveTimer = setTimeout(() => {
      // Debounce eliminates jitter — no need to further truncate here.
      // Full history (up to CHAT_MAX) is saved so Download Campaign Log
      // works correctly after a page reload.
      localStorage.setItem('robco_chat', JSON.stringify(chatHistory));
    }, 200);
  }
}

async function clearChat() {
  const ok = await confirmAction({
    title: '> PURGE COMM-LINK',
    warning: 'Purge Comm-Link history? This cannot be undone.',
    confirmLabel: 'PURGE',
  });
  if (ok) {
    chatHistory = [];
    localStorage.removeItem('robco_chat');
    document.getElementById('chatDisplay').innerHTML = '';
    appendToChat('> SYSTEM LOGS PURGED. AWAITING COURIER INPUT...', 'sys', true);
  }
}

// ── F6: WIPE TERMINAL — NEW CAMPAIGN ────────────────────────────────
// Double-confirmation wipe: resets state to defaults, clears chat history,
// re-presents game context selection screen.
async function wipeTerminal() {
  let wipeWarning =
    'This will erase ALL Courier data:\n- SPECIAL / Skills / Perks / Quests\n- Inventory / Factions / Status Effects\n- Campaign Notes / Collectibles / Squad\n- Chat History / Session Statistics\n\nSave slots are preserved.\n\nThis CANNOT be undone. Continue?';
  // Owner report: Complete RNG is only ever PERMANENTLY locked in by a wipe
  // performed while armed (see wasRngArmed below) — warn about that
  // irreversible commitment right here, at the one moment it actually takes
  // effect, rather than relying on the arm-time banner alone. Reuses the
  // same state.campaignMode signal wasRngArmed reads later (Protocol 22).
  if (state.campaignMode === 'rng') {
    wipeWarning +=
      '\n\n⚠ COMPLETE RNG is armed. Continuing will PERMANENTLY enable it for this save — it cannot be changed or disabled afterward.';
  }
  const gate1 = await confirmAction({
    title: '> WIPE TERMINAL',
    warning: wipeWarning,
    confirmLabel: 'CONTINUE',
  });
  if (!gate1) return;
  const gate2 = await confirmAction({
    title: '> FINAL CONFIRMATION',
    warning: 'Are you absolutely certain?\n\nThis will destroy all unsaved progress.',
    confirmLabel: 'WIPE TERMINAL',
  });
  if (!gate2) return;

  // Reset state to defaults (preserves gameContext selection from boot)
  const wasRngArmed = state.campaignMode === 'rng';
  const freshState = JSON.parse(JSON.stringify(window._defaultState || {}));
  freshState.gameContext = state.gameContext || 'FNV'; // preserve game context for now
  // C11: If Complete RNG was armed (checked) when player wiped, activate the lock permanently
  if (wasRngArmed) freshState.campaignMode = 'rng-locked';

  // Wipe all current state properties to ensure no phantom arrays or strings remain
  for (let key in state) {
    if (Object.prototype.hasOwnProperty.call(state, key)) {
      delete state[key];
    }
  }

  Object.assign(state, freshState);

  // Clear chat history
  chatHistory = [];
  localStorage.removeItem('robco_chat');
  localStorage.removeItem('robco_v7'); // force fresh state on next save

  // Re-present game context selection
  state.gameContext = null;

  // C5: Clean up dead legacy localStorage key
  localStorage.removeItem('robco_playstyle_type');

  // Clear chat display
  const chatDisplay = document.getElementById('chatDisplay');
  if (chatDisplay) chatDisplay.innerHTML = '';

  // Reload UI first, so the DOM matches the fresh state
  loadUI();
  switchTab('stat');

  // Save the wiped state (now that syncStateFromDom will see clean DOM)
  saveState();

  // M1 Campaign Ignition (Ceremony Moments Wave 1) — a short, skippable
  // commissioning ceremony replaces the old two bare chat lines
  // (_runCampaignIgnition(), above). The context-selection prompt below is
  // unchanged functional copy, not ceremony, and always follows once
  // ignition completes (or is skipped).
  _runCampaignIgnition(() => {
    appendToChat('> SELECT GAME CONTEXT:', 'sys', true);
    // DO-K: skip designOnly entries (FO4) — advertising a context nothing can actually select
    // would be a real, visible regression the moment GAME_DEFS grows a third game.
    Object.values(GAME_DEFS)
      .filter(d => !d.designOnly)
      .forEach(d => {
        appendToChat(`> Type [CONTEXT: ${d.id}] for ${d.label}`, 'sys', true);
      });
    appendToChat('> Or the AI will detect your game automatically.', 'sys', true);
  });
}
