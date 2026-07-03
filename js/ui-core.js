let attachedImageData = null;
let attachedImageMimeType = null;
let _invFilter = 'all';

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
  // WU-F5 Pip-Boy Radio: ON semantics (true = playing), NOT a mute flag. Default
  // OFF (opt-in). initRadio() does the autoplay-safe first-gesture restore at boot;
  // this initialiser just reflects the saved preference into the cache.
  radio: MetaStore.get('robco_radio_on') === 'true',
  masterMute: MetaStore.get('robco_master_muted') === 'true',
};

// ── WU-F1 SUSTAINED POWER CELL (Screen Wake Lock) ─────────────────────────
// Keeps the display lit while the terminal is active, using the Screen Wake Lock
// API. Free, offline, no AI, game-agnostic (Protocol 38) — operates only on the
// device screen. Opt-in (default OFF, battery-safe), persisted as a localStorage
// device preference (NOT campaign state — so no Protocol-4 save/sync path). Mirrors
// the audio-toggle pattern. Graceful fallback: on browsers without the API the
// toggle is disabled and the panel says so; acquire/release failures are swallowed
// so a missing/blocked lock can never break the terminal.
const WAKE_LOCK_KEY = 'robco_wakelock_enabled';
let _wakeLockSentinel = null;
function _wakeLockSupported() {
  return (
    typeof navigator !== 'undefined' &&
    'wakeLock' in navigator &&
    !!navigator.wakeLock &&
    typeof navigator.wakeLock.request === 'function'
  );
}
function isWakeLockEnabled() {
  return MetaStore.get(WAKE_LOCK_KEY) === 'true';
}
async function _acquireWakeLock() {
  if (!_wakeLockSupported() || _wakeLockSentinel) return false;
  try {
    _wakeLockSentinel = await navigator.wakeLock.request('screen');
    // The OS auto-releases on tab hide; clear our handle so visibilitychange re-acquires.
    _wakeLockSentinel.addEventListener('release', () => {
      _wakeLockSentinel = null;
      _updateWakeLockUI();
    });
    _updateWakeLockUI();
    return true;
  } catch (_) {
    _wakeLockSentinel = null; // NotAllowedError / not visible — fail soft, retried on visibility
    return false;
  }
}
async function _releaseWakeLock() {
  try {
    if (_wakeLockSentinel) await _wakeLockSentinel.release();
  } catch (_) {
    /* never throw on release */
  }
  _wakeLockSentinel = null;
}
function _updateWakeLockUI() {
  const note = document.getElementById('wakeLockStatus');
  if (!note) return;
  if (!_wakeLockSupported()) {
    note.textContent = '> POWER CELL UNAVAILABLE ON THIS UNIT';
    return;
  }
  note.textContent = isWakeLockEnabled()
    ? '> DISPLAY SUSTAINED — SCREEN STAYS LIT'
    : '> POWER CELL IDLE — DISPLAY MAY DIM';
}
async function toggleWakeLock(enabled) {
  MetaStore.set(WAKE_LOCK_KEY, enabled ? 'true' : 'false');
  if (typeof playChipClick === 'function') playChipClick(enabled); // B2c: tactile install/eject click
  if (enabled) await _acquireWakeLock();
  else await _releaseWakeLock();
  _updateWakeLockUI();
  if (typeof _logBaySvc === 'function') {
    _logBaySvc(enabled ? 'SUSTAINED POWER CELL INSTALLED' : 'SUSTAINED POWER CELL REMOVED');
  }
}
function initWakeLock() {
  const toggle = document.getElementById('wakeLockToggle');
  if (!_wakeLockSupported()) {
    // Graceful fallback: disable the control, surface the unsupported state.
    if (toggle) {
      toggle.checked = false;
      toggle.disabled = true;
    }
    _updateWakeLockUI();
    return;
  }
  const enabled = isWakeLockEnabled();
  if (toggle) toggle.checked = enabled;
  if (enabled) _acquireWakeLock();
  _updateWakeLockUI();
}
// Re-acquire when the tab becomes visible again (the OS releases the lock on hide).
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible' && isWakeLockEnabled() && !_wakeLockSentinel) {
    _acquireWakeLock();
  }
});

// ── WU-F7: OVERSEER'S MAINTENANCE LOG ─────────────────────────
// Local-only device telemetry surfaced as the Overseer's maintenance log: boot
// count, total power-on time, longest single session, and live current uptime.
// Reuses the existing session clock (sessionStart). Persisted as a localStorage
// device stat (NOT campaign state — so no Protocol-4 save/sync path), mirroring
// the wake-lock preference above. No web API, no AI, no network, game-agnostic.
// Never throws: read/write are wrapped so a missing or quota-full store degrades
// to zeroes and can never break the terminal.
const OVERSEER_LOG_KEY = 'robco_overseer_log';
let _overseerBaseMs = 0; // total power-on accumulated BEFORE this session
let _overseerSessionStart = 0; // Date.now() when this session's logging began
let _overseerBooted = false;
function _readOverseerLog() {
  const num = v => (typeof v === 'number' && isFinite(v) && v >= 0 ? v : 0);
  try {
    const o = JSON.parse(MetaStore.get(OVERSEER_LOG_KEY) || '{}');
    return {
      bootCount: num(o.bootCount),
      totalPowerOnMs: num(o.totalPowerOnMs),
      longestSessionMs: num(o.longestSessionMs),
      firstBoot: num(o.firstBoot),
    };
  } catch (_) {
    return { bootCount: 0, totalPowerOnMs: 0, longestSessionMs: 0, firstBoot: 0 };
  }
}
function _writeOverseerLog(o) {
  try {
    MetaStore.set(OVERSEER_LOG_KEY, JSON.stringify(o));
  } catch (_) {
    /* quota / disabled storage — never let telemetry throw */
  }
}
function _overseerSessionMs() {
  return _overseerSessionStart ? Math.max(0, Date.now() - _overseerSessionStart) : 0;
}
// Idempotent: recomputes the running total from the boot-time base each call, so a
// double-fire (interval + visibilitychange + pagehide) can never double-count.
function _flushOverseerLog() {
  const o = _readOverseerLog();
  const session = _overseerSessionMs();
  o.totalPowerOnMs = _overseerBaseMs + session;
  if (session > o.longestSessionMs) o.longestSessionMs = session;
  _writeOverseerLog(o);
  return o;
}
function _fmtOverseerDuration(ms) {
  const totalSec = Math.floor(Math.max(0, ms) / 1000);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  if (h >= 24) return `${Math.floor(h / 24)}d ${String(h % 24).padStart(2, '0')}h`;
  if (h > 0) return `${h}h ${String(m).padStart(2, '0')}m`;
  if (m > 0) return `${m}m ${String(s).padStart(2, '0')}s`;
  return `${s}s`;
}
function renderOverseerLog() {
  const el = document.getElementById('overseerLogDisplay');
  if (!el) return;
  const o = _readOverseerLog();
  const session = _overseerSessionMs();
  const total = _overseerBaseMs + session;
  const longest = Math.max(o.longestSessionMs, session);
  const hours = total / 3600000;
  const hoursStr = hours >= 10 ? hours.toFixed(0) : hours.toFixed(1);
  el.innerHTML =
    '<div style="display:grid;grid-template-columns:1fr 1fr;gap:4px 8px;font-size:11px;">' +
    '<span style="opacity:0.65;">CURRENT UPTIME</span><span>' +
    _fmtOverseerDuration(session) +
    '</span>' +
    '<span style="opacity:0.65;">LONGEST SESSION</span><span>' +
    _fmtOverseerDuration(longest) +
    '</span>' +
    '<span style="opacity:0.65;">TOTAL POWER-ON</span><span>' +
    hoursStr +
    'h</span>' +
    '<span style="opacity:0.65;">BOOT COUNT</span><span>' +
    o.bootCount +
    '</span>' +
    '</div>';
}
function initOverseerLog() {
  // Boot-count increments exactly once per page load (window.onload), even though
  // renderOverseerLog() is re-run from loadUI on every tab switch.
  if (_overseerBooted) {
    renderOverseerLog();
    return;
  }
  _overseerBooted = true;
  const o = _readOverseerLog();
  _overseerBaseMs = o.totalPowerOnMs;
  if (!o.firstBoot) o.firstBoot = Date.now();
  o.bootCount += 1;
  _writeOverseerLog(o);
  _overseerSessionStart = Date.now();
  // Periodic flush (30s) so a crash / forced close loses at most one interval of
  // power-on time, and the live read-out stays fresh while the panel sits open.
  // Phase 2 A2: this is now an Ambient Runtime observer instead of a standalone
  // setInterval. It runs in ALL live states — INCLUDING STANDBY — because power-on
  // accounting must keep ticking while the tab is blurred (matching the old
  // never-cleared setInterval); tier 'minimal' so the dial never silences telemetry.
  // Registered once (this boot-only path is guarded by _overseerBooted above).
  AmbientRuntime.register({
    id: 'overseer-flush',
    states: ['READY', 'ACTIVE', 'IDLE', 'STANDBY'],
    tier: 'minimal',
    cadenceMs: 30000,
    onTick: () => {
      _flushOverseerLog();
      renderOverseerLog();
    },
  });
  renderOverseerLog();
}
// Persist the running totals on tab-hide / close so they survive a closed tab —
// standard lifecycle events only (no special API); fail-soft if it can't write.
document.addEventListener('visibilitychange', () => {
  if (document.hidden) _flushOverseerLog();
});
window.addEventListener('pagehide', _flushOverseerLog);

// ── WU-F8: HIGH-LUMEN OPTICS (high-contrast mode) ─────────────
// Manual companion to the OS prefers-contrast: more media query — both apply
// the same AA+ high-contrast CSS (see terminal.css). The toggle adds/removes
// the `high-lumen` class on <html> (matching the early-paint boot script) and
// persists as a localStorage device preference (NOT campaign state — no
// Protocol-4 path), mirroring the wake-lock toggle. Pure CSS effect, game-
// agnostic: it layers over whatever optics colour is active. No web API, so
// there is nothing to feature-detect — it is always available.
const HIGH_LUMEN_KEY = 'robco_high_lumen';
function isHighLumenEnabled() {
  return MetaStore.get(HIGH_LUMEN_KEY) === 'true';
}
function _applyHighLumen(on) {
  document.documentElement.classList.toggle('high-lumen', !!on);
}
function _updateHighLumenUI() {
  const note = document.getElementById('highLumenStatus');
  if (!note) return;
  note.textContent = isHighLumenEnabled()
    ? '> PHOSPHOR DRIVE BOOSTED — MAXIMUM CONTRAST'
    : '> STANDARD OPTICS — AMBIENT CONTRAST';
}
function toggleHighLumen(enabled) {
  MetaStore.set(HIGH_LUMEN_KEY, enabled ? 'true' : 'false');
  _applyHighLumen(enabled);
  _updateHighLumenUI();
  if (typeof _updateOpticsBoardStatus === 'function') _updateOpticsBoardStatus();
  if (typeof _logBaySvc === 'function') {
    _logBaySvc(enabled ? 'HIGH-LUMEN COIL INSTALLED' : 'HIGH-LUMEN COIL REMOVED');
  }
}
function initHighLumen() {
  const toggle = document.getElementById('highLumenToggle');
  const enabled = isHighLumenEnabled();
  if (toggle) toggle.checked = enabled;
  _applyHighLumen(enabled);
  _updateHighLumenUI();
}

// ── GLOBAL IMMERSION DIAL — UI (P8) ──────────────────────────────
// The gate helpers + pref live in state.js (getImmersionTier / immersionAllows /
// setImmersionTier — the seam Phase 2 consumers read). This is only the DOM control:
// the <select> value, the status readout, and the boot restore. No campaign state.
// Module Bay SLOT 04 rotary dial (B2b) — knob rotation + position/description text
// per tier. Presentation-only; the stored tier is still the single source of truth.
const IMMERSION_DIAL = {
  full: {
    rot: -52,
    desc: 'ALL AMBIENT SYSTEMS RUNNING — IDLE PHOSPHOR, STANDBY BREATHING, CRT POWER-DOWN, FULL SOUNDSCAPE.',
  },
  balanced: {
    rot: 0,
    desc: 'REDUCED AMBIENCE — ESSENTIAL EFFECTS ONLY, GENTLER IDLE BEHAVIOR.',
  },
  minimal: {
    rot: 52,
    desc: 'QUIET OPERATION — AMBIENT SYSTEMS DORMANT, TERMINAL STAYS OUT OF YOUR WAY.',
  },
};
function _updateImmersionUI() {
  const note = document.getElementById('immersionStatus');
  const tier = typeof getImmersionTier === 'function' ? getImmersionTier() : 'full';
  if (note) {
    note.textContent =
      tier === 'full'
        ? '> FULL IMMERSION — all ambient systems active'
        : tier === 'balanced'
          ? '> BALANCED — reduced ambient activity'
          : '> MINIMAL — ambient systems quiet';
  }
  // Module Bay SLOT 04 legend — purely decorative, mirrors the real select's value.
  document.querySelectorAll('.immersion-legend span').forEach(s => {
    s.classList.toggle('on', s.dataset.tier === tier);
  });
  // The real #immersionSelect stays in the DOM (visually hidden) as the fully
  // accessible control — keep its value synced regardless of which entry point
  // (select, dial) last changed the stored tier (Protocol 42 drift guard, same
  // pattern as BAY_CHECKBOX_SYNC_MAP for the boolean modules).
  const sel = document.getElementById('immersionSelect');
  if (sel) sel.value = tier;
  const dial = IMMERSION_DIAL[tier] || IMMERSION_DIAL.full;
  const knob = document.getElementById('immersionDialKnob');
  if (knob) knob.style.transform = 'rotate(' + dial.rot + 'deg)';
  const posEl = document.getElementById('immersionDialPos');
  if (posEl) posEl.textContent = tier.toUpperCase();
  const descEl = document.getElementById('immersionDialDesc');
  if (descEl) descEl.textContent = dial.desc;
  const dialBtn = document.querySelector('button.dial');
  if (dialBtn) {
    dialBtn.setAttribute(
      'aria-label',
      'Atmospheric regulator dial — currently ' +
        tier.toUpperCase() +
        '. Press to cycle to the next level.'
    );
  }
}
// Module Bay SLOT 04 adapter (B2b) — a native <select> can't be reshaped into a
// dial, so this genuinely-custom control cycles the exact same 3 values through
// the exact same onImmersionChange() setter the (now visually hidden) select
// still uses — one truth, two entry points (Protocol 22/25).
const IMMERSION_ORDER = ['full', 'balanced', 'minimal'];
// FIX 2 (owner request, B2c unit): a suppress-click flag set by a genuine
// drag (see _wireImmersionDialDrag below) so the trailing synthetic `click`
// event a pointerup fires inside the button bounds doesn't re-cycle the tier
// the drag already applied. Left false for a plain tap/keyboard activation,
// which still falls through to the tap-to-cycle path below unchanged.
let _dialDragSuppressClick = false;
function _cycleImmersionDial() {
  if (_dialDragSuppressClick) {
    _dialDragSuppressClick = false;
    return;
  }
  const cur = typeof getImmersionTier === 'function' ? getImmersionTier() : 'full';
  const next = IMMERSION_ORDER[(IMMERSION_ORDER.indexOf(cur) + 1) % IMMERSION_ORDER.length];
  onImmersionChange(next);
}
window._cycleImmersionDial = _cycleImmersionDial;
function onImmersionChange(value) {
  if (typeof setImmersionTier === 'function') setImmersionTier(value);
  _updateImmersionUI();
  if (typeof _logBaySvc === 'function') {
    _logBaySvc('ATMOSPHERIC GOVERNOR → ' + String(value).toUpperCase());
  }
  // DO-O: a dial change can flip _scopeShouldAnimate() live — re-arm so the
  // oscilloscope starts/stops animating immediately, not on the next state change.
  if (typeof _armScopeLoop === 'function') _armScopeLoop();
}

// FIX 2 (owner request, B2c unit, best-effort): drag/slide-to-rotate for the
// dial, layered ON TOP of the existing tap-to-cycle (onclick="_cycleImmersionDial()"
// stays untouched) — never a forked control. A horizontal pointer drag steps
// through the SAME 3-value IMMERSION_ORDER via the SAME onImmersionChange()
// setter the tap and the real <select> both use (Protocol 22/25 — one truth,
// three entry points). Keyboard activation is unaffected: it fires a `click`
// with no preceding pointer drag, so _dialDragSuppressClick stays false and
// the tap-to-cycle path runs exactly as before. Reduced-motion is unaffected
// too — the knob's rotation still goes through the same CSS transform the
// global prefers-reduced-motion block already neutralises (Suite 94).
const DIAL_DRAG_STEP_PX = 46; // px of horizontal drag per tier step
let _dialDrag = null; // { startX, startIndex, lastIndex } while a drag is active

function _dialPointerMove(ev) {
  if (!_dialDrag) return;
  const dx = ev.clientX - _dialDrag.startX;
  if (Math.abs(dx) > 6) _dialDrag.moved = true;
  let idx = _dialDrag.startIndex + Math.round(dx / DIAL_DRAG_STEP_PX);
  idx = Math.max(0, Math.min(IMMERSION_ORDER.length - 1, idx));
  if (idx !== _dialDrag.lastIndex) {
    _dialDrag.lastIndex = idx;
    onImmersionChange(IMMERSION_ORDER[idx]);
  }
}
function _dialPointerEnd(ev) {
  if (!_dialDrag) return;
  const btn = ev.currentTarget;
  try {
    btn.releasePointerCapture(ev.pointerId);
  } catch (e) {
    /* already released */
  }
  if (_dialDrag.moved) _dialDragSuppressClick = true;
  _dialDrag = null;
  btn.removeEventListener('pointermove', _dialPointerMove);
  btn.removeEventListener('pointerup', _dialPointerEnd);
  btn.removeEventListener('pointercancel', _dialPointerEnd);
}
function _dialPointerDown(ev) {
  // Left button only for mouse; touch/pen have no `button` semantics (0 by spec).
  if (ev.button !== 0) return;
  const btn = ev.currentTarget;
  const cur = typeof getImmersionTier === 'function' ? getImmersionTier() : 'full';
  const startIndex = IMMERSION_ORDER.indexOf(cur);
  _dialDrag = { startX: ev.clientX, startIndex, lastIndex: startIndex, moved: false };
  try {
    btn.setPointerCapture(ev.pointerId);
  } catch (e) {
    /* unsupported — drag still tracks via the listeners below */
  }
  btn.addEventListener('pointermove', _dialPointerMove);
  btn.addEventListener('pointerup', _dialPointerEnd);
  btn.addEventListener('pointercancel', _dialPointerEnd);
}
function _wireImmersionDialDrag() {
  const btn = document.querySelector('button.dial');
  if (!btn || typeof window.PointerEvent === 'undefined') return; // graceful fallback: tap-to-cycle still works
  btn.addEventListener('pointerdown', _dialPointerDown);
}

function initImmersion() {
  const sel = document.getElementById('immersionSelect');
  if (sel && typeof getImmersionTier === 'function') sel.value = getImmersionTier();
  _updateImmersionUI();
  _wireImmersionDialDrag();
}

// ── MODULE BAY (Step 2 · Phase 2 · B2a) ─────────────────────────────────────
// The Security & Configuration panel reframed as installable hardware boards.
// ONE-TRUTH MODEL: the bay and the Schematic View are both PROJECTIONS of the
// same stored device prefs — every control still calls the setter it always
// called (Protocol 22/23); this section only (a) restores the bay's own
// presentation-only bits at boot (hatch first-visit, the two combined status
// lines that have no other owner), (b) re-syncs those bits after any bay
// control fires, and (c) regenerates the Schematic View from current state
// whenever it's opened — never a second wired control set, so it can never
// drift from the bay (Protocol 25 sanctioned-exception guardrail).
const BAY_SVC_LOG_CAP = 12;

// Diegetic confirmation line in the SLOT-adjacent service log. Presentation
// only — never persisted, never durable state.
function _logBaySvc(msg) {
  const body = document.getElementById('baySvcLogBody');
  if (!body) return;
  const d = new Date();
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  const line = document.createElement('div');
  line.textContent = '> ' + hh + ':' + mm + ' · ' + msg;
  body.appendChild(line);
  while (body.children.length > BAY_SVC_LOG_CAP) body.removeChild(body.firstChild);
  body.parentElement.scrollTop = body.parentElement.scrollHeight;
}
window._logBaySvc = _logBaySvc;

// Re-syncs every bay-owned presentation bit from the stored prefs. Safe to call
// after ANY bay control fires (idempotent, cheap) — this is what keeps the bay
// and the Schematic View from ever drifting apart (they read the same prefs).
// Protocol 42 fix (found during this unit's manual verification): the bay's
// own checkboxes and the Schematic View's mirrored checkboxes are two SEPARATE
// DOM elements bound to the same MetaStore key — changing one didn't push its
// new .checked state to the other. Re-syncing every boolean control's checked
// state from MetaStore on every renderModuleBay() call (already fired after
// every bay AND schematic control change) closes that gap in both directions.
const BAY_CHECKBOX_SYNC_MAP = {
  highLumenToggle: 'robco_high_lumen',
  masterMuteToggle: 'robco_master_muted',
  radioToggle: 'robco_radio_on',
  wakeLockToggle: 'robco_wakelock_enabled',
  hapticToggle: 'robco_haptic_enabled',
  geminiKeySyncToggle: 'robco_gemini_key_sync',
};
function renderModuleBay() {
  Object.keys(BAY_CHECKBOX_SYNC_MAP).forEach(id => {
    const el = document.getElementById(id);
    if (el) el.checked = MetaStore.get(BAY_CHECKBOX_SYNC_MAP[id]) === 'true';
  });
  // B2c: SERVO CLICK RELAY uses INVERTED checkbox semantics (checked =
  // installed = audible), so it can't ride the 1:1 BAY_CHECKBOX_SYNC_MAP above.
  const hwSfxToggle = document.getElementById('hardwareSfxToggle');
  if (hwSfxToggle) hwSfxToggle.checked = MetaStore.get('robco_hardwaresfx_muted') !== 'true';
  if (typeof _updateOpticsBoardStatus === 'function') _updateOpticsBoardStatus();
  if (typeof _updateSonicBoardStatus === 'function') _updateSonicBoardStatus();
  if (typeof _updateUplinkBoardStatus === 'function') _updateUplinkBoardStatus();
  const schem = document.getElementById('baySchematic');
  if (schem && !schem.hidden) renderBaySchematic();
}
window.renderModuleBay = renderModuleBay;

// First-visit-only hatch ceremony (LOCKED-1). After the first-ever release the
// bay just opens with the panel — this function only decides whether the
// closed-hatch overlay is shown at all.
function initModuleBay() {
  const opened = MetaStore.get('robco_bay_opened') === 'true';
  const hatch = document.getElementById('bayHatch');
  if (hatch) hatch.hidden = opened;
  // FIX 4 (owner report — new standing rule, "everything remembers on reload"):
  // restore whichever of Bay / Schematic View the technician was last looking
  // at, via the registered robco_bay_view device pref.
  _applyBayView(MetaStore.get('robco_bay_view') === 'schematic' ? 'schematic' : 'bay');
}
window.initModuleBay = initModuleBay;

function releaseBayHatch() {
  MetaStore.set('robco_bay_opened', 'true');
  const hatch = document.getElementById('bayHatch');
  if (hatch) {
    const reduced =
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    hatch.classList.add('bay-hatch--open');
    setTimeout(
      () => {
        hatch.hidden = true;
      },
      reduced ? 0 : 900
    );
  }
  _logBaySvc('HATCH RELEASED — TECHNICIAN ACCESS GRANTED');
}
window.releaseBayHatch = releaseBayHatch;

// Permanent light-touch fallback (LOCKED-3) — swaps the bay grid for a flat,
// regenerated list of the same controls. Never a parallel wired set. Shared by
// initModuleBay() (boot restore) and toggleBaySchematic() (user action) so the
// two never drift (Protocol 22).
function _applyBayView(view) {
  const bay = document.getElementById('bayContent');
  const schem = document.getElementById('baySchematic');
  if (!bay || !schem) return;
  const toSchematic = view === 'schematic';
  schem.hidden = !toSchematic;
  bay.hidden = toSchematic;
  if (toSchematic) renderBaySchematic();
  else renderModuleBay();
}
window._applyBayView = _applyBayView;

function toggleBaySchematic() {
  const schem = document.getElementById('baySchematic');
  if (!schem) return;
  const view = schem.hidden ? 'schematic' : 'bay';
  // FIX 4: persist the view choice so it survives a reload.
  MetaStore.set('robco_bay_view', view);
  _applyBayView(view);
}
window.toggleBaySchematic = toggleBaySchematic;

function _schemSetGeminiSync(checked) {
  if (window.setGeminiKeySync) window.setGeminiKeySync(checked);
  renderModuleBay();
}
window._schemSetGeminiSync = _schemSetGeminiSync;

// B2c: mirrors the bay's SERVO CLICK RELAY toggle — same INVERTED-checkbox
// adapter shape as _schemSetGeminiSync above (Protocol 22/25).
function _schemSetHardwareSfx(checked) {
  toggleAudio('robco_hardwaresfx_muted', !checked);
  renderModuleBay();
}
window._schemSetHardwareSfx = _schemSetHardwareSfx;

// Regenerated from the SAME stored prefs the bay reads — every row calls the
// SAME setter its bay counterpart calls, then re-syncs via renderModuleBay()
// (which re-renders this very list while it's open, so it can never drift).
function renderBaySchematic() {
  const list = document.getElementById('baySchematicList');
  if (!list) return;
  const optic = typeof _resolveOptic === 'function' ? _resolveOptic() : 'green';
  const highLumen = typeof isHighLumenEnabled === 'function' && isHighLumenEnabled();
  const masterMuted = MetaStore.get('robco_master_muted') === 'true';
  const radioOn = MetaStore.get('robco_radio_on') === 'true';
  const wakeOn = typeof isWakeLockEnabled === 'function' && isWakeLockEnabled();
  const hapticOn = typeof isHapticEnabled === 'function' && isHapticEnabled();
  const tier = typeof getImmersionTier === 'function' ? getImmersionTier() : 'full';
  const keySync = MetaStore.get('robco_gemini_key_sync') === 'true';
  const typerSpeed = parseFloat(MetaStore.get('robco_typer_speed') || '1');
  const hwSfxOn = MetaStore.get('robco_hardwaresfx_muted') !== 'true';

  // FIX 2 (owner report): name/loc stacked ABOVE a full-width control row —
  // the control can never be squeezed narrower than its own content (which
  // was silently ellipsis-clipping the phosphor-tube <select>, e.g. "ROBCO
  // GR…") regardless of label length or viewport width.
  const row = (controlHtml, name, loc) =>
    `<div class="schem-row"><div class="schem-row-head"><span class="sr-name">${escapeHtml(name)}</span><span class="sr-loc">${loc}</span></div><div class="schem-row-control">${controlHtml}</div></div>`;
  const checkboxRow = (setter, checked, name, loc) =>
    row(
      `<input type="checkbox" ${checked ? 'checked' : ''} onchange="${setter}(this.checked); renderModuleBay();" aria-label="${escapeHtml(name)}" />`,
      name,
      loc
    );
  const themeOptions =
    typeof THEMES === 'object' && THEMES
      ? Object.keys(THEMES)
          .map(
            k =>
              `<option value="${k}"${k === optic ? ' selected' : ''}>${escapeHtml(THEMES[k].label)}</option>`
          )
          .join('')
      : '';

  list.innerHTML = [
    row(
      `<select onchange="changeOpticsColor(this.value); renderModuleBay();" aria-label="Phosphor tube">${themeOptions}</select>`,
      'PHOSPHOR TUBE',
      'SLOT 01'
    ),
    checkboxRow('toggleHighLumen', highLumen, 'HIGH-LUMEN COIL', 'SLOT 01'),
    checkboxRow('toggleMasterMute', masterMuted, 'SONIC PROCESSOR BOARD (MASTER MUTE)', 'SLOT 02'),
    row(
      '<span style="opacity:.6">13 rows</span>',
      '13 CHANNEL CHIPS — manage individually in SLOT 02 above',
      'SLOT 02'
    ),
    checkboxRow('_schemSetHardwareSfx', hwSfxOn, 'SERVO CLICK RELAY', 'SLOT 02'),
    checkboxRow('toggleRadio', radioOn, 'RADIO RECEIVER MODULE', 'SLOT 02'),
    row(
      `<input type="range" min="0.25" max="3" step="0.25" value="${typerSpeed}" style="flex:1 1 90px;min-width:0" oninput="MetaStore.set('robco_typer_speed', this.value); renderModuleBay();" aria-label="Print-rate trim" />`,
      'PRINT-RATE TRIM',
      'SLOT 02'
    ),
    checkboxRow('toggleWakeLock', wakeOn, 'SUSTAINED POWER CELL', 'SLOT 03'),
    checkboxRow('toggleHaptic', hapticOn, 'HAPTIC SOLENOID', 'SLOT 03'),
    row(
      `<select onchange="onImmersionChange(this.value); renderModuleBay();" aria-label="Atmospheric regulator">
        <option value="full"${tier === 'full' ? ' selected' : ''}>FULL</option>
        <option value="balanced"${tier === 'balanced' ? ' selected' : ''}>BALANCED</option>
        <option value="minimal"${tier === 'minimal' ? ' selected' : ''}>MINIMAL</option>
      </select>`,
      'ATMOSPHERIC REGULATOR',
      'SLOT 04'
    ),
    checkboxRow('_schemSetGeminiSync', keySync, 'KEY-SYNC JUMPER', 'SLOT 05'),
  ].join('');
}
window.renderBaySchematic = renderBaySchematic;

// SVC Tray onclick wrappers — kept as tiny named functions (not inline multi-
// statement onclick) so the diegetic log message is never embedded in an
// index.html attribute value (avoids colliding with the Suite 59 inline-
// handler scanner, which treats any "Word(" it finds in an attribute as a
// candidate function reference). Each wraps the SAME existing utility action.
function _svcExportCampaignLog(fmt) {
  exportCampaignLog(fmt);
  _logBaySvc('CAMPAIGN LOG EXPORTED — .' + String(fmt).toUpperCase());
}
window._svcExportCampaignLog = _svcExportCampaignLog;

function _svcViewChangelog() {
  showFullChangelog();
  _logBaySvc('FIRMWARE REVISION LOG OPENED');
}
window._svcViewChangelog = _svcViewChangelog;

function _svcInstallPwa() {
  installPwa();
  _logBaySvc('SYSTEM INSTALLER LAUNCHED');
}
window._svcInstallPwa = _svcInstallPwa;

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

// DO-N: the casing-top FAULT lamp reads the existing error ring-buffer
// (read-only device telemetry, no new state) — lit whenever a client error
// has been recorded this device, cleared by the existing [LOGS] CLEAR action.
function _updateFaultLamp() {
  const lamp = document.getElementById('lampFault');
  if (!lamp) return;
  let hasErrors;
  try {
    hasErrors = JSON.parse(MetaStore.get(ERROR_LOG_KEY) || '[]').length > 0;
  } catch (_) {
    hasErrors = false;
  }
  lamp.classList.toggle('fault', hasErrors);
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
    try {
      window.robco_v8 = JSON.parse(v8Str);
      let activeCampaign = window.robco_v8.campaigns[window.robco_v8.activeContext] || {};
      state = { ...state, ...activeCampaign };
      state.gameContext = window.robco_v8.activeContext;
      // P4: the v8 fast-path skips migrateState, so run the Terminal Record
      // [T#]→eventLog migration here too — existing v8 saves migrate on load
      // (idempotent + non-lossy; leaves manual notes in campaign_notes).
      if (typeof window._migrateEventLog === 'function') window._migrateEventLog(state);
      loadedOk = true;
    } catch (e) {
      console.error('[RobCo] Corrupt robco_v8 — quarantined, booting fresh:', e);
      localStorage.removeItem('robco_v8');
    }
  }
  if (!loadedOk && v7Str) {
    try {
      let savedState = JSON.parse(v7Str);
      if (typeof migrateState === 'function')
        savedState = migrateState(savedState.version || '1.0', savedState);

      window.robco_v8 = {
        activeContext: savedState.gameContext || 'FNV',
        campaigns: {},
      };
      window.robco_v8.campaigns[window.robco_v8.activeContext] = savedState;
      localStorage.setItem('robco_v8', JSON.stringify(window.robco_v8));

      state = { ...state, ...savedState };
      state.gameContext = window.robco_v8.activeContext;
      loadedOk = true;
    } catch (e) {
      console.error('[RobCo] Corrupt robco_v7 — quarantined, booting fresh:', e);
      localStorage.removeItem('robco_v7');
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
    localStorage.setItem('robco_v7', JSON.stringify(state));
  }
  // Ensure all 14 faction keys exist (handles older saves missing new factions)
  if (!state.factions) state.factions = _buildFactions();
  getFactionRegistry().forEach(f => {
    if (!state.factions[f.key]) state.factions[f.key] = { fame: 0, infamy: 0 };
  });
}

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
    },
    onExit: () => {
      document.body.classList.remove('rt-shutdown', 'rt-shutdown-plain');
    },
  });
}

// ── DO-O: THE LIVING OVERSEER — DIRECTOR UPLINK (Protocol UI-10) ───────────
// A presentation layer OVER the existing Comm-Link/AI pipeline (Protocol 22 —
// appendToChat()/transmitMessage() are hooked, never forked). The oscilloscope
// canvas reacts to the REAL AI lifecycle (thinking at the thermal-load window,
// speaking during the typewriter, listening at rest, disabled/offline from the
// key+flag+navigator.onLine signals). All per-game flavor text is read from
// getIdentity().overseer (Protocol 38) with a generic fallback for a game that
// hasn't authored one; trace colour is the existing --bezel-wire CSS token
// (Protocol UI-7) — there is no JS colour branch anywhere in this block.
// Writes NOTHING durable to the campaign: _scopeState is a transient module
// var and the idle-blip observer below renders via appendToChat(...,true)
// (never pushed to chatHistory/robco_chat).
// ── DO-O START ──────────────────────────────────────────────────────────
const OVERSEER_GENERIC_FALLBACK = {
  title: 'COMM UPLINK',
  relay: 'CARRIER LINK',
  signalStrip: 'SIGNAL — · ENCRYPTION: TRI-NODE',
  states: {
    listening: '[ LISTENING ]',
    thinking: '[ ESTABLISHING LINK ]',
    speaking: '[ TRANSMITTING ]',
    disabled: '[ NO CARRIER ]',
    offline: '[ OFFLINE ]',
  },
};
const OVERSEER_STATES = ['listening', 'thinking', 'speaking', 'disabled', 'offline'];

function _overseerIdentity() {
  const id = typeof getIdentity === 'function' ? getIdentity() : null;
  return (id && id.overseer) || OVERSEER_GENERIC_FALLBACK;
}

let _scopeState = 'listening';
let _scopeAnimHandle = null;
let _scopeT = 0;
let _scopeScratchUntil = 0;
let _runtimeAwake = true;

// _overseerRestState — PURE, vm-testable (Suite 162 behavioral test). Decides
// the resting tag from the three live signals; never touches the DOM.
function _overseerRestState({ hasKey, aiEnabled, online }) {
  if (!online) return 'offline';
  if (!hasKey || !aiEnabled) return 'disabled';
  return 'listening';
}
window._overseerRestState = _overseerRestState; // exposed for api.js's finally hook + the Suite 162 behavioral test

// _overseerRestSignals — reads the same key/flag/online signals transmitMessage()
// itself gates on (api.js), so the scope's resting tag always matches reality.
function _overseerRestSignals() {
  const hasKey = !!(typeof MetaStore !== 'undefined' && MetaStore.get('robco_gemini_key'));
  const aiEnabled =
    typeof window.isFeatureEnabled !== 'function' || window.isFeatureEnabled('aiChat') !== false;
  const online = typeof navigator === 'undefined' || navigator.onLine !== false;
  return { hasKey, aiEnabled, online };
}
window._overseerRestSignals = _overseerRestSignals; // exposed for api.js's finally hook

function _scopeShouldAnimate() {
  const reduced =
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduced) return false;
  if (typeof immersionAllows === 'function' && !immersionAllows('balanced')) return false;
  if (!_runtimeAwake) return false;
  if (typeof document !== 'undefined' && document.hidden) return false;
  return true;
}

function _scopeColor() {
  try {
    return (
      getComputedStyle(document.documentElement).getPropertyValue('--bezel-wire').trim() ||
      '#ffb642'
    );
  } catch (_) {
    return '#ffb642';
  }
}

function _sizeOverseerScope(canvas) {
  const r = canvas.getBoundingClientRect();
  if (r.width === 0) return false;
  const dpr = window.devicePixelRatio || 1;
  canvas.width = Math.round(r.width * dpr);
  canvas.height = Math.round(r.height * dpr);
  return true;
}

function drawScope() {
  const canvas = document.getElementById('overseerScope');
  if (!canvas) return;
  if (!canvas.width && !_sizeOverseerScope(canvas)) return;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  const W = canvas.width,
    H = canvas.height,
    mid = H / 2;
  const dpr = window.devicePixelRatio || 1;
  ctx.clearRect(0, 0, W, H);
  ctx.strokeStyle = 'rgba(20,253,206,0.10)';
  ctx.lineWidth = 1;
  for (let x = 0; x < W; x += W / 12) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, H);
    ctx.stroke();
  }
  for (let y = 0; y < H; y += H / 6) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(W, y);
    ctx.stroke();
  }
  const color = _scopeColor();
  ctx.strokeStyle = color;
  ctx.shadowColor = color;
  ctx.shadowBlur = 6 * dpr;
  ctx.lineWidth = 1.6 * dpr;
  ctx.beginPath();
  const scratching = performance.now() < _scopeScratchUntil;
  for (let x = 0; x <= W; x += 2) {
    let y;
    if (_scopeState === 'thinking') {
      y =
        mid +
        (Math.sin(x * 0.09 + _scopeT * 3.1) + Math.sin(x * 0.23 - _scopeT * 4.7)) * H * 0.11 +
        (Math.random() - 0.5) * H * 0.34;
    } else if (_scopeState === 'speaking') {
      const env = 0.55 + 0.45 * Math.sin(_scopeT * 6);
      y =
        mid + Math.sin(x * 0.045 + _scopeT * 5) * H * 0.26 * env + (Math.random() - 0.5) * H * 0.05;
    } else if (_scopeState === 'disabled' || _scopeState === 'offline') {
      y = mid + (Math.random() - 0.5) * H * 0.02;
    } else {
      // listening — gentle carrier sine, occasional NV-persona scratch burst
      y =
        mid +
        Math.sin(x * 0.02 + _scopeT) * H * 0.14 +
        Math.sin(x * 0.006 - _scopeT * 0.4) * H * 0.05 +
        (Math.random() - 0.5) * H * (scratching ? 0.22 : 0.02);
    }
    if (x === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.stroke();
  ctx.shadowBlur = 0;
}

function _scopeLoop() {
  _scopeT += 0.035;
  if (_scopeState === 'listening' && Math.random() < 0.004) {
    _scopeScratchUntil = performance.now() + 260 + Math.random() * 320;
  }
  drawScope();
  if (_scopeShouldAnimate()) {
    _scopeAnimHandle = requestAnimationFrame(_scopeLoop);
  } else {
    _scopeAnimHandle = null;
  }
}

// _armScopeLoop — starts the rAF loop iff animation is currently allowed;
// otherwise just paints the correct static frame for the current state
// (reduced-motion / Minimal dial / standby / tab-hidden all degrade here).
function _armScopeLoop() {
  if (_scopeAnimHandle) return; // already running
  if (!_scopeShouldAnimate()) {
    drawScope();
    return;
  }
  _scopeAnimHandle = requestAnimationFrame(_scopeLoop);
}

function getOverseerState() {
  return _scopeState;
}
window.getOverseerState = getOverseerState;

// setOverseerState(s) — the ONE state-setter. Always draws one frame
// immediately (so reduced-motion/Minimal-dial users still see the correct
// frame), then arms the loop iff animation is currently allowed.
function setOverseerState(s) {
  if (OVERSEER_STATES.indexOf(s) === -1) return;
  _scopeState = s;
  const ov = _overseerIdentity();
  const tag = (ov.states && ov.states[s]) || OVERSEER_GENERIC_FALLBACK.states[s];
  const tagEl = document.getElementById('scopeTag');
  if (tagEl) {
    tagEl.textContent = tag;
    tagEl.classList.toggle('thinking', s === 'thinking');
  }
  const csEl = document.getElementById('csState');
  if (csEl) csEl.textContent = tag;
  drawScope();
  _armScopeLoop();
}
window.setOverseerState = setOverseerState;

// refreshOverseerCarrier — re-reads the per-game identity strings (title/
// relay/status-strip) and, ONLY when the scope is genuinely at rest (never
// mid-transaction), recomputes listening/disabled/offline from the live
// key/flag/online signals. transmitMessage()'s own finally hook is the ONE
// place that force-resets FROM 'thinking' (guarded there on
// getOverseerState()==='thinking' — see api.js — since a blind reset here
// would truncate a SPEAKING typewriter that starts asynchronously after
// finally runs).
function refreshOverseerCarrier() {
  const ov = _overseerIdentity();
  const titleEl = document.getElementById('ovsTitle');
  if (titleEl) titleEl.textContent = ov.title;
  const stripLabelEl = document.getElementById('carrierStripLabel');
  if (stripLabelEl) stripLabelEl.textContent = ov.title;
  const relayEl = document.getElementById('ovsRelay');
  if (relayEl) relayEl.textContent = ov.relay;
  const metaEl = document.getElementById('scopeStrip');
  if (metaEl) metaEl.textContent = ov.signalStrip;
  if (_scopeState === 'thinking' || _scopeState === 'speaking') {
    drawScope();
    return;
  }
  setOverseerState(_overseerRestState(_overseerRestSignals()));
}
window.refreshOverseerCarrier = refreshOverseerCarrier;

// initOverseerScope — boot wiring (called once from window.onload, A3
// precedent). Registers the runtime pause/resume observer + the dial-gated
// idle-life blip observer, wires resize/online/offline/visibilitychange/
// reduced-motion listeners, and paints the initial resting frame.
function initOverseerScope() {
  const canvas = document.getElementById('overseerScope');
  if (!canvas) return;
  _sizeOverseerScope(canvas);
  refreshOverseerCarrier();

  window.addEventListener('resize', () => {
    _sizeOverseerScope(canvas);
    drawScope();
  });
  window.addEventListener('online', refreshOverseerCarrier);
  window.addEventListener('offline', refreshOverseerCarrier);
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) _armScopeLoop();
  });
  if (typeof window.matchMedia === 'function') {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const onReducedMotionChange = () => setOverseerState(_scopeState);
    if (typeof mq.addEventListener === 'function')
      mq.addEventListener('change', onReducedMotionChange);
  }

  if (typeof AmbientRuntime !== 'undefined' && AmbientRuntime && AmbientRuntime.register) {
    // Pause on real power-down (STANDBY/SHUTDOWN/OFF) — onEnter/onExit are NOT
    // tier-gated by the runtime itself (A3 convention); the dial gate lives in
    // _scopeShouldAnimate() via immersionAllows('balanced').
    AmbientRuntime.register({
      id: 'overseer-scope',
      states: ['STANDBY', 'SHUTDOWN', 'OFF'],
      onEnter: () => {
        _runtimeAwake = false;
        drawScope();
      },
      onExit: () => {
        _runtimeAwake = true;
        setOverseerState(_scopeState);
      },
    });

    // Idle-life blips (owner-approved, locked decision): low-rate, dial-gated,
    // NON-persisted device-template lines from identity.persona.blipBank —
    // never AI output, never saved (appendToChat's isHistoryLoad=true keeps
    // this out of chatHistory/robco_chat).
    AmbientRuntime.register({
      id: 'overseer-idle-blip',
      states: ['ACTIVE', 'IDLE'],
      tier: 'balanced',
      cadenceMs: 35000,
      onTick: () => {
        if (_scopeState !== 'listening') return;
        if (Math.random() > 0.6) return;
        const id = typeof getIdentity === 'function' ? getIdentity() : null;
        const bank = (id && id.persona && id.persona.blipBank) || [];
        if (!bank.length) return;
        const line = bank[Math.floor(Math.random() * bank.length)];
        if (typeof appendToChat === 'function') appendToChat(line, 'sys', true);
      },
    });
  }
}
window.initOverseerScope = initOverseerScope;
// ── DO-O END ────────────────────────────────────────────────────────────

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

function _wirePanelPersistence() {
  // #35 Panel Memory — restore previously open/closed panel states
  // On desktop, default-open still applies if no saved state exists
  const savedPanelState = JSON.parse(MetaStore.get('robco_panel_state') || 'null');
  const panelEls = Array.from(document.querySelectorAll('details.panel'));
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
      // Module Bay hatch ceremony (owner report): fires only on the panel's OWN toggle —
      // never unconditionally at page load — so a Courier who has never opened Settings
      // never sees the hatch until they actually click it open.
      if (d.id === 'securityConfigPanel' && d.open && typeof initModuleBay === 'function')
        initModuleBay();
    });
  });

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
}

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
    const banner = document.getElementById('rngModeBanner');
    if (banner) banner.style.display = armed ? 'block' : 'none';
    const lockedBanner = document.getElementById('rngLockedBanner');
    if (lockedBanner) lockedBanner.style.display = locked ? 'block' : 'none';
  }

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
}

function _wireKeyboardShortcuts() {
  // #15 Keyboard Shortcuts — Ctrl+1–6 toggle first 6 panels, Ctrl+/ focus chat
  document.addEventListener('keydown', e => {
    if (e.ctrlKey && !e.shiftKey && !e.altKey) {
      const num = parseInt(e.key);
      if (num >= 1 && num <= 6) {
        e.preventDefault();
        const panels = Array.from(document.querySelectorAll('details.panel'));
        const target = panels[num - 1];
        if (target) {
          if (target.open) target.removeAttribute('open');
          else target.setAttribute('open', '');
          // persist new state
          const ps = JSON.parse(MetaStore.get('robco_panel_state') || '{}');
          if (target.dataset.panelId) {
            ps[target.dataset.panelId] = target.open;
            MetaStore.set('robco_panel_state', JSON.stringify(ps));
          }
        }
      } else if (e.key === '/') {
        e.preventDefault();
        const ci = document.getElementById('chatInput');
        if (ci) ci.focus();
      }
    }
    // Tab keyboard shortcuts: 1=STAT, 2=INV, 3=DATA (no modifier, not in input)
    if (!e.ctrlKey && !e.altKey && !e.metaKey) {
      const activeEl = document.activeElement;
      const inInput =
        activeEl &&
        (activeEl.tagName === 'INPUT' ||
          activeEl.tagName === 'TEXTAREA' ||
          activeEl.tagName === 'SELECT');
      if (!inInput) {
        // DO-N bezel hotkeys: [1]-[5] select a subsystem, [0] opens the flat
        // DIRECTORY fallback. [4]/[5] are new (UPLINK/CHASSIS were never
        // gated by a tab); [1]-[3] keep routing through switchTab() exactly
        // as before via selectSubsystem()'s _NAV_TAB_FOR map.
        const hotkeyMap = {
          1: 'operator',
          2: 'operations',
          3: 'databank',
          4: 'uplink',
          5: 'chassis',
        };
        if (hotkeyMap[e.key]) {
          e.preventDefault();
          selectSubsystem(hotkeyMap[e.key]);
        } else if (e.key === '0') {
          e.preventDefault();
          openBezelDirectory();
        }
      }
    }
    if (e.key === 'Tab') {
      var trapModal = document.getElementById('sysModal');
      if (trapModal && trapModal.style.display !== 'none') {
        var focusableEls = Array.from(
          trapModal.querySelectorAll(
            'button:not([disabled]),[href],input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])'
          )
        ).filter(function (el) {
          return el.offsetParent !== null;
        });
        if (focusableEls.length > 0) {
          var first = focusableEls[0];
          var last = focusableEls[focusableEls.length - 1];
          if (e.shiftKey && document.activeElement === first) {
            e.preventDefault();
            last.focus();
          } else if (!e.shiftKey && document.activeElement === last) {
            e.preventDefault();
            first.focus();
          }
        }
      }
    }
    if (e.key === 'Escape') {
      const modal = document.getElementById('sysModal');
      if (modal && modal.style.display !== 'none') closeModal();
    }
  });
}

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

function _wireInputHistoryNav() {
  // #36 Input History — Up/Down arrows cycle through sent user commands
  // (history source is chatHistory filtered to user messages; _inputHistoryIdx is the nav cursor)
  let _inputHistoryIdx = -1;
  const _chatInput = document.getElementById('chatInput');
  if (_chatInput) {
    _chatInput.addEventListener('keydown', e => {
      // Only intercept when input is otherwise empty or navigating history
      if (e.key === 'ArrowUp') {
        const userMsgs = chatHistory.filter(m => m.sender === 'user').map(m => m.text);
        if (userMsgs.length === 0) return;
        e.preventDefault();
        if (_inputHistoryIdx === -1) _inputHistoryIdx = userMsgs.length;
        _inputHistoryIdx = Math.max(0, _inputHistoryIdx - 1);
        _chatInput.value = userMsgs[_inputHistoryIdx] || '';
      } else if (e.key === 'ArrowDown') {
        const userMsgs = chatHistory.filter(m => m.sender === 'user').map(m => m.text);
        if (_inputHistoryIdx === -1) return;
        e.preventDefault();
        _inputHistoryIdx = Math.min(userMsgs.length, _inputHistoryIdx + 1);
        _chatInput.value = _inputHistoryIdx < userMsgs.length ? userMsgs[_inputHistoryIdx] : '';
        if (_inputHistoryIdx === userMsgs.length) _inputHistoryIdx = -1;
      } else {
        _inputHistoryIdx = -1; // Any other key resets nav position
      }
    });
  }
}

function _wireUnloadFlush() {
  // Flush any pending debounced save immediately on tab close
  window.addEventListener('beforeunload', () => {
    clearTimeout(_saveTimer);
    // Suppress the unload flush when a context switch OR a save-load reload is in
    // flight — otherwise the stale in-memory state would clobber the robco_v8 a
    // load path just wrote, making IMPORT SAVE / RESTORE BACKUP / cloud load no-ops.
    if (window._contextSwitching || window._loadingSave) return;
    if (!window.robco_v8)
      window.robco_v8 = { activeContext: state.gameContext || 'FNV', campaigns: {} };
    window.robco_v8.activeContext = state.gameContext || 'FNV';
    window.robco_v8.campaigns[window.robco_v8.activeContext] = JSON.parse(JSON.stringify(state));
    localStorage.setItem('robco_v8', JSON.stringify(window.robco_v8));
  });
}

window.onload = async function () {
  try {
    // U7: wire the OS Event Bus subscribers first (RobcoEvents is guaranteed loaded by onload).
    _wireCoreEventBusSubscribers();
    _wireAudioEventBusSubscribers();
    _wireApiEventBusSubscribers();
    // P2: reconcile device prefs from IndexedDB (bounded + fail-safe) BEFORE the rest of boot reads them.
    await _hydrateMetaFromIdb();
    _hydrateStateFromStorage();
    if (window._migrateColdStoreToIdb) window._migrateColdStoreToIdb(); // P3: fire-and-forget cold-store → IDB migration
    _restoreApiKeyAndChatHistory();
    loadUI();
    initTabs(); // Phase 4: restore active tab (defaults to 'stat' on first load)
    _initBezelChrome(); // DO-N: restore bezel subsystem highlight + sync the FAULT lamp
    setupHpBarInteraction();
    setupXpBarInteraction(); // C11: XP bar click-drag (mirrors HP bar, within current level range)
    startCrtHum();
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
    initAmbientRuntime(); // A1: Ambient Runtime — additive state machine + observer scheduler (parallel to standby; owns no timers yet)
    initTestConsole(); // staging/dev-only Test Console — no-ops (stays hidden) on production
    _wirePanelPersistence(); // also wires the Module Bay hatch ceremony to securityConfigPanel's own first user-open (owner report — never at boot)
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

function setupHpBarInteraction() {
  const container = document.getElementById('hp_bar_container');
  if (!container) return;
  function applyHp(e) {
    const rect = container.getBoundingClientRect();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const pct = Math.min(1, Math.max(0, (clientX - rect.left) / rect.width));
    const hpMax = parseInt(document.getElementById('stat_hp_max').value) || 100;
    const newHp = Math.round(pct * hpMax);
    document.getElementById('stat_hp_cur').value = newHp;
    state.hpCur = newHp;
    updateMath();
  }
  let dragging = false;
  container.addEventListener('mousedown', e => {
    dragging = true;
    applyHp(e);
  });
  document.addEventListener('mousemove', e => {
    if (dragging) applyHp(e);
  });
  document.addEventListener('mouseup', () => {
    dragging = false;
  });
  container.addEventListener(
    'touchstart',
    e => {
      dragging = true;
      applyHp(e);
      e.preventDefault();
    },
    { passive: false }
  );
  document.addEventListener(
    'touchmove',
    e => {
      if (dragging) applyHp(e);
    },
    { passive: false }
  );
  document.addEventListener('touchend', () => {
    dragging = false;
  });
}

// C11: XP bar click-drag — mirrors HP bar but sets XP within [xpCur, xpNext-1] range.
// Allows direct manipulation of XP progress within the current level.
function setupXpBarInteraction() {
  const container = document.getElementById('xp_bar_container');
  if (!container) return;
  function applyXp(e) {
    const rect = container.getBoundingClientRect();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const pct = Math.min(1, Math.max(0, (clientX - rect.left) / rect.width));
    const lvl = Math.max(1, parseInt(document.getElementById('stat_lvl').value) || 1);
    const xpCur = lvl <= 1 ? 0 : 75 * (lvl * lvl) - 25 * lvl - 50;
    const xpNext = 75 * ((lvl + 1) * (lvl + 1)) - 25 * (lvl + 1) - 50;
    const newXp = Math.round(xpCur + pct * (xpNext - xpCur - 1));
    document.getElementById('stat_xp').value = newXp;
    state.xp = newXp;
    updateMath();
  }
  let dragging = false;
  container.addEventListener('mousedown', e => {
    dragging = true;
    applyXp(e);
  });
  document.addEventListener('mousemove', e => {
    if (dragging) applyXp(e);
  });
  document.addEventListener('mouseup', () => {
    dragging = false;
  });
  container.addEventListener(
    'touchstart',
    e => {
      dragging = true;
      applyXp(e);
      e.preventDefault();
    },
    { passive: false }
  );
  document.addEventListener(
    'touchmove',
    e => {
      if (dragging) applyXp(e);
    },
    { passive: false }
  );
  document.addEventListener('touchend', () => {
    dragging = false;
  });
}

// C11: Level input change handler — when user edits the level field,
// auto-set XP to the minimum XP required for that level (xpCur).
function onLvlInputChanged() {
  const lvl = Math.max(1, parseInt(document.getElementById('stat_lvl').value) || 1);
  const xpCur = lvl <= 1 ? 0 : 75 * (lvl * lvl) - 25 * lvl - 50;
  document.getElementById('stat_xp').value = xpCur;
  state.lvl = lvl;
  state.xp = xpCur;
  updateMath();
}

// C5: Playthrough type handler — writes state field (Protocol 4).
// Affects AI directive. Triggers saveState() so the change persists.
// Valid combinations with Complete RNG are all supported.
function onPlaythroughTypeChange(type) {
  const valid = ['standard', 'minmaxed', 'completionist', 'casual', 'speedrun'];
  if (!valid.includes(type)) return;
  state.playthroughType = type;
  saveState();
}

// C4-fix / C11: Complete RNG toggle — receives boolean from checkbox this.checked.
// Updates state.campaignMode ('standard' | 'rng') and saves.
// If mode is 'rng-locked', toggle is a no-op (cannot be disabled).
function onCampaignModeChange(checked) {
  if (state.campaignMode === 'rng-locked') {
    // Permanently locked — force checkbox back to checked, do nothing
    const cb = document.getElementById('completeRngToggle');
    if (cb) {
      cb.checked = true;
      cb.disabled = true;
    }
    return;
  }
  state.campaignMode = checked ? 'rng' : 'standard';
  saveState();
  const banner = document.getElementById('rngModeBanner');
  if (banner) banner.style.display = checked ? 'block' : 'none';
}

let deferredPrompt;
window.addEventListener('beforeinstallprompt', e => {
  e.preventDefault();
  deferredPrompt = e;
  if (document.getElementById('btnInstallPwa')) {
    document.getElementById('btnInstallPwa').style.display = 'block';
  }
});

async function installPwa() {
  if (deferredPrompt) {
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      document.getElementById('btnInstallPwa').style.display = 'none';
    }
    deferredPrompt = null;
  }
}

function changePlaystyle(style) {
  if (style === 'melee') {
    let stateStr = JSON.stringify(state).toLowerCase();
    if (stateStr.includes('educated') || stateStr.includes('dead weight')) {
      openModal({
        title: '> PLAYSTYLE',
        body: '>> CANNOT SWAP TO MELEE ONLY: Save state contains restricted perks (Educated/Dead Weight).',
      });
      document.getElementById('playstyleInput').value =
        localStorage.getItem('robco_playstyle') || 'any';
      return;
    }
  }
  localStorage.setItem('robco_playstyle', style);
  if (typeof window._invalidateCommCache === 'function') window._invalidateCommCache();
}

function onGameContextChange(ctx) {
  // DO-K: designOnly games (FO4) prove the N-game data abstraction but aren't selectable yet —
  // #gameContextSelect already offers no FO4 <option>, this is the defensive second guard.
  if (!GAME_DEFS[ctx] || GAME_DEFS[ctx].designOnly) return;
  if (!window.robco_v8) window.robco_v8 = { activeContext: 'FNV', campaigns: {} };
  window.robco_v8.campaigns[state.gameContext] = JSON.parse(JSON.stringify(state));
  window.robco_v8.activeContext = ctx;
  state.gameContext = ctx;
  window._contextSwitching = true;
  // DO-K: flip the pre-paint attribute before the reload so a briefly-cached document (or a
  // future non-full-reload switch path) never shows the outgoing game's identity chrome.
  document.documentElement.dataset.game = ctx;
  localStorage.setItem('robco_v8', JSON.stringify(window.robco_v8));
  window.location.reload();
}

// ── CAMPAIGN LOG EXPORT ────────────────────────────────────────
// format: 'txt' (default), 'html' (#41), 'md' (#27)
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

function _updatePanelBadges() {
  const badges = [
    { h2text: '> PERKS', count: (state.perks || []).length },
    {
      h2text: '> BACKPACK INVENTORY',
      // Combined: non-ammo inventory items + tracked ammo calibers
      count:
        (state.inventory || []).filter(it => (it.type || 'misc') !== 'ammo').length +
        Object.values(state.ammo || {}).filter(v => v > 0).length,
    },
    { h2text: '> SQUAD STATUS', count: (state.squad || []).length },
    { h2text: '> STATUS EFFECTS', count: (state.status || []).length },
    { h2text: '> CAMPAIGN NOTES', count: (state.campaign_notes || []).length },
    {
      h2text: '> QUEST LOG',
      count: _pendingDirectivesCount(),
    },
    {
      h2text: '> COLLECTIBLES',
      count: (state.collectibles || []).length,
    },
    {
      h2text: '> CRAFTING',
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
    // Find the h2 with exactly this text (case-insensitive prefix match)
    const h2 = Array.from(document.querySelectorAll('.panel h2')).find(el =>
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
// ── TAB NAVIGATION ───────────────────────────────────────────────
// Tabs: 'stat' | 'inv' | 'data'
// Each panel has data-tab="stat|inv|data|campg". Panels with no data-tab always show.
// Security & Configuration has no data-tab and is always visible.
const TAB_NAMES = ['stat', 'inv', 'data', 'campg'];
// DO-N: 'data' and 'campg' present together as the ONE bezel subsystem
// (DATABANK) — selecting either tab shows both panel groups; STAT/INV stay
// mutually exclusive. switchTab() itself keeps working standalone exactly
// as before (routing/hotkey/deep-link contract preserved) — this only
// widens which panels a 'data'/'campg' call reveals.
const _DATABANK_TABS = ['data', 'campg'];
const TAB_TO_SUBSYSTEM = {
  stat: 'operator',
  inv: 'operations',
  data: 'databank',
  campg: 'databank',
};

function switchTab(tab) {
  if (!TAB_NAMES.includes(tab)) return;
  playPanelClick(); // H1: rotary dial click on tab switch
  // Show panels for the active tab (databank merges data+campg), hide others
  const showTabs = _DATABANK_TABS.includes(tab) ? _DATABANK_TABS : [tab];
  document.querySelectorAll('.panel[data-tab]').forEach(el => {
    if (showTabs.includes(el.dataset.tab)) {
      el.classList.add('tab-visible');
    } else {
      el.classList.remove('tab-visible');
    }
  });
  // Store active tab so page reload restores it
  MetaStore.set('robco_active_tab', tab);
  // Re-render world map when switching to the DATA tab so it measures real panel width
  if (tab === 'data' && typeof renderWorldMap === 'function') renderWorldMap();
  // DO-N: sync the bezel subsystem nav (LED/aria-selected/telemetry) to match —
  // every entry path (hotkey, #go= deep-link, bezel click, AI auto-expand)
  // stays visually consistent through this one call.
  _syncBezelNav(TAB_TO_SUBSYSTEM[tab] || 'operator');
}

// Initialize tab on page load (restores last used tab, defaults to 'stat')
function initTabs() {
  let tab = 'stat';
  const saved = MetaStore.get('robco_active_tab');
  if (saved && TAB_NAMES.includes(saved)) tab = saved;
  switchTab(tab);
}

// ── DO-N: BEZEL SUBSYSTEM NAV ─────────────────────────────────────────
// Illuminated keycap presentation over the existing tab/router system
// (Protocol 25 owner-approved redesign). Every keycap routes through
// switchTab() (stat/inv/data/campg unchanged) or, for the two subsystems
// that were never gated by a tab (the always-visible Comm-Link column and
// Security & Configuration/Module Bay), scrolls/focuses them directly —
// mirroring the existing SHORTCUT_ROUTES.comm approach. Writes only the
// MetaStore view preference (Protocol UI-6); no campaign state touched.
const NAV_KEYS = ['operator', 'operations', 'databank', 'uplink', 'chassis'];
const _NAV_TAB_FOR = { operator: 'stat', operations: 'inv', databank: 'data' };

function _syncBezelNav(subsystem) {
  if (!NAV_KEYS.includes(subsystem)) return;
  NAV_KEYS.forEach(k => {
    const btn = document.getElementById('navkey-' + k);
    if (!btn) return;
    const on = k === subsystem;
    btn.classList.toggle('active', on);
    btn.setAttribute('aria-selected', String(on));
  });
  const lcd = document.getElementById('bezelTelemetry');
  if (lcd) lcd.textContent = _bezelTelemetryText(subsystem);
  MetaStore.set('robco_bezel_subsystem', subsystem);
  // DO-O: the single choke point every subsystem change already routes through —
  // drives the mobile UPLINK self-contained-view CSS (body[data-subsystem="uplink"]).
  document.body.dataset.subsystem = subsystem;
}

function _bezelTelemetryText(subsystem) {
  switch (subsystem) {
    case 'operator': {
      const hpMax = state.hpMax || 100;
      const nominal = hpMax <= 0 || (state.hpCur || 0) / hpMax > 0.25;
      return '▸ SUBSYSTEM: OPERATOR · ' + (nominal ? 'VITALS NOMINAL' : 'VITALS CRITICAL');
    }
    case 'operations': {
      const n = Array.isArray(state.inventory) ? state.inventory.length : 0;
      return '▸ SUBSYSTEM: OPERATIONS · ' + n + ' MANIFEST ENTRIES';
    }
    case 'databank':
      return (
        '▸ SUBSYSTEM: DATABANK · ' +
        (typeof _pendingDirectivesCount === 'function' ? _pendingDirectivesCount() : 0) +
        ' ACTIVE DIRECTIVES'
      );
    case 'uplink':
      return '▸ SUBSYSTEM: UPLINK · DIRECTOR CHANNEL';
    case 'chassis':
      return '▸ SUBSYSTEM: CHASSIS · MODULE BAY';
    default:
      return '▸ SUBSYSTEM: ' + subsystem.toUpperCase();
  }
}

// SWEEP — the DO-N "re-tune the channel" motion verb on subsystem change.
// Reduced-motion is handled by the existing global prefers-reduced-motion
// CSS block, which zeroes the animation to an instant resting frame.
function _bezelSweep() {
  const wrap = document.querySelector('.glass-frame');
  if (!wrap) return;
  wrap.classList.remove('sweep');
  void wrap.offsetWidth; // force reflow so the animation can restart
  wrap.classList.add('sweep');
}

// selectSubsystem(view) — the bezel keycap click handler.
function selectSubsystem(view) {
  const tab = _NAV_TAB_FOR[view];
  if (tab) {
    switchTab(tab); // routes + syncs the nav in one call
  } else if (view === 'uplink') {
    const i = document.getElementById('chatInput');
    if (i) {
      i.scrollIntoView({ block: 'center' });
      i.focus();
    }
    _syncBezelNav('uplink');
  } else if (view === 'chassis') {
    const bay = document.getElementById('moduleBay');
    const details = bay && bay.closest('details.panel');
    if (details && !details.open) details.setAttribute('open', '');
    if (bay) bay.scrollIntoView({ block: 'center' });
    _syncBezelNav('chassis');
  } else {
    return;
  }
  _bezelSweep();
}

// DIRECTORY fallback (Protocol 25) — a flat, plain-label list of every
// subsystem, one tap away, reusing the shared #sysModal driver (Protocol 22)
// rather than a bespoke dialog.
function openBezelDirectory() {
  const items = [
    ['operator', 'OPERATOR', 'character stats', 'STAT · [1]'],
    ['operations', 'OPERATIONS', 'inventory &amp; crafting', 'INV · [2]'],
    ['databank', 'DATABANK', 'quests, map, campaign', 'DATA·CAMPG · [3]'],
    ['uplink', 'UPLINK', 'the AI comm-link', 'COMM · [4]'],
    ['chassis', 'CHASSIS', 'settings &amp; saves', 'SYSTEM · [5]'],
  ];
  const body =
    '<div class="d-sub" style="font-size: 9px; opacity: 0.5; letter-spacing: 1px; margin-bottom: 10px">FLAT INDEX — EVERY SUBSYSTEM, PLAIN LABELS</div>' +
    items
      .map(
        ([view, label, desc, sub]) =>
          '<button type="button" class="blue-btn bezel-dir-item" onclick="selectSubsystem(\'' +
          view +
          '\'); closeModal();">' +
          label +
          ' — ' +
          desc +
          ' <span>' +
          sub +
          '</span></button>'
      )
      .join('');
  openModal({ title: '> SUBSYSTEM DIRECTORY', body });
}

// Restore the last-focused non-tab subsystem (uplink/chassis) highlight on
// boot — visual only, never scrolls/focuses anything on page load.
function initBezelSubsystem() {
  const saved = MetaStore.get('robco_bezel_subsystem');
  if (saved === 'uplink' || saved === 'chassis') _syncBezelNav(saved);
}

// Single boot-phase entry point for the two DO-N bezel-chrome restores, so
// window.onload gains one named call (Suite 132's slim-composition contract)
// instead of two.
function _initBezelChrome() {
  initBezelSubsystem();
  _updateFaultLamp();
}

// PWA app-shortcut deep-link routes. Keys are the only accepted #go= values (allow-list).
const SHORTCUT_ROUTES = {
  comm: () => {
    const i = document.getElementById('chatInput');
    if (i) {
      i.scrollIntoView({ block: 'center' });
      i.focus();
    }
    _syncBezelNav('uplink'); // DO-N: keep the bezel highlight consistent with this deep-link
  },
  inv: () => switchTab('inv'),
  stat: () => switchTab('stat'),
  data: () => switchTab('data'),
  new: () => wipeTerminal(),
};
function routeLaunchShortcut() {
  let raw;
  try {
    raw = (window.location.hash || '').replace(/^#/, '');
  } catch (_) {
    return;
  }
  if (!raw) return;
  const m = raw.match(/^go=([a-z]+)$/);
  if (!m) return;
  const action = SHORTCUT_ROUTES[m[1]];
  if (typeof action !== 'function') return;
  try {
    history.replaceState(null, '', window.location.pathname + window.location.search);
  } catch (_) {}
  action();
}

// Called by #stat_loc onchange (no arg — reads the value the user just typed into the
// input) AND by the quick-log "arrived <location>" TERMINAL verb (api.js, passes the new
// location text explicitly since there's no onchange DOM event to read it from). One
// function, not a forked quick-log-only setter (Protocol 22) — this is what makes
// "arrived Primm" actually move [CURRENT] on the WORLD MAP instead of only adding Primm
// to the visited list (the owner-reported live-update bug: quick-log used to call
// markLocationVisited(), which records a discovery without ever changing state.loc).
// View preference (state.mapView) is kept as-is.
function onLocationChange(overrideLoc) {
  // Fog-of-war: the place we're leaving stays discovered, and the new place becomes
  // discovered too — so the previous location shows [VISITED] (not [UNKNOWN]) once the
  // Courier moves on. Capture the old location BEFORE syncStateFromDom() overwrites
  // state.loc with the new #stat_loc value, then record both via the shared helper.
  // saveState() persists the updated locationHistory in the same (debounced) write;
  // cloud sync stays manual (no auto-push).
  const prevLoc = state.loc;
  if (overrideLoc) {
    // Mirror the new value into #stat_loc BEFORE syncStateFromDom() reads it back — the
    // same "mirror to DOM before saveState" idiom #c_caps uses (WU-N2), since
    // syncStateFromDom() always re-reads state.loc from this element.
    const locEl = document.getElementById('stat_loc');
    if (locEl) locEl.value = overrideLoc;
  }
  syncStateFromDom();
  recordLocationVisit(prevLoc);
  recordLocationVisit(state.loc);
  saveState();
  renderWorldMap();
}

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
    log: 'data',
    databank: 'data',
    config: 'campg',
  };
  if (tabMap[categoryKey]) switchTab(tabMap[categoryKey]);

  const map = {
    squad: '> SQUAD STATUS',
    status: '> STATUS EFFECTS',
    inventory: '> BACKPACK INVENTORY',
    campaign_notes: '> CAMPAIGN NOTES',
    perks: '> PERKS',
    factions: '> FACTION STANDING',
    quests: '> QUEST LOG',
    ammo: '> BACKPACK INVENTORY', // ammo lives in the sub-panel inside BACKPACK
    equipped: '> EQUIPPED',
    collectibles: '> COLLECTIBLES',
    craft: '> CRAFTING',
    trade: '> BARTER UPLINK',
    skillBooks: '> SKILL BOOKS',
    magazines: '> SKILL MAGAZINES',
    // WU-HF3 panel navigation targets (h2 prefixes, matched via startsWith)
    special: '> BIO-METRICS',
    skills: '> SKILL MATRIX',
    bio: '> BIO-SCAN',
    map: '> WORLD MAP',
    log: "> OVERSEER'S LOG",
    databank: '> DATABANK',
    config: '> CAMPAIGN CONFIGURATION',
  };
  const target = map[categoryKey];
  if (!target) return;
  const h2 = Array.from(document.querySelectorAll('.panel h2')).find(el =>
    el.textContent.trim().startsWith(target)
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
  // For ammo, also open the nested ammo sub-panel
  if (categoryKey === 'ammo') {
    const subPanel = document.getElementById('ammoSubPanel');
    if (subPanel && !subPanel.open) subPanel.setAttribute('open', '');
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

// ── WU-N1: V.A.T.S. NATIVE CALCULATOR ────────────────────────────
// Fully deterministic, offline, read-only — no AI. Two parts:
//   • HIT PROBABILITY table — an ESTIMATE (per-region modifier + clamp). The exact
//     ranged hit-% is NOT canon-sourceable (WU-D4a-RANGED-GAP: per-weapon spread/range
//     falloff are absent from WEAPONS.CSV and fallout.wiki), so it is labeled ESTIMATE.
//   • AP-STRIKE OPTIMIZER — exact from the equipped weapon's Base_Damage / Special_Attack_AP
//     and the canon AP pool (apBase + apPerAgility × AGI); shows strikes affordable, damage
//     per strike (after target DT), damage-per-AP, and the optimal region.
// All per-game data (crit bonus, hit-% clamp, AP formula, region table, combat-skill set)
// comes from GAME_DEFS[ctx] — game-agnostic (Protocol 38). See planning/MASTER_PLAN.md WU-N1.

// _vatsResolveSkill — pick the weapon's combat skill. Melee/unarmed is EXACT (read from the
// weapon row); ranged falls back to the best of the game's ranged combat skills because the
// schema has no per-weapon skill column (WU-D4a-RANGED-GAP). Filters GAME_DEFS[ctx].combatSkills
// through getSkillKeys() so a 3rd game just supplies its own set — and FO3 big_guns is now
// included (GA-10 live-bug fix; the old hardcoded object omitted it).
function _vatsResolveSkill(stats, def, skills) {
  const keys = (typeof getSkillKeys === 'function' && getSkillKeys()) || [];
  const combat = (def.combatSkills || []).filter(k => keys.includes(k));
  if (stats) {
    const noAmmo = !stats.ammoType || stats.ammoType.toLowerCase() === 'none';
    if ((stats.reqUnarmed || 0) > 0 && combat.includes('unarmed')) {
      return { name: 'unarmed', value: skills.unarmed || 0, exact: true };
    }
    if (noAmmo && combat.includes('melee_weapons')) {
      return { name: 'melee_weapons', value: skills.melee_weapons || 0, exact: true };
    }
  }
  // Ranged (or nothing equipped): estimate via the best ranged combat skill.
  const pool = stats ? combat.filter(k => k !== 'melee_weapons' && k !== 'unarmed') : combat;
  const candidates = pool.length ? pool : combat;
  let name = candidates[0] || 'guns';
  let value = skills[name] || 0;
  candidates.forEach(k => {
    const v = skills[k] || 0;
    if (v > value) {
      value = v;
      name = k;
    }
  });
  return { name, value, exact: false };
}

// _vatsIsMelee — canonical melee-scope classification of a weapon row (§1.6): a weapon is
// melee/unarmed when it consumes no ammo (Ammo_Type None/blank) or requires Unarmed.
function _vatsIsMelee(stats) {
  if (!stats) return false;
  const noAmmo = !stats.ammoType || stats.ammoType.toLowerCase() === 'none';
  return noAmmo || (stats.reqUnarmed || 0) > 0;
}

function showVATSOverlay() {
  const modal = document.getElementById('sysModal');
  const title = document.getElementById('modalTitle');
  const content = document.getElementById('modalContent');
  if (!modal || !title || !content) return;

  title.innerText = '> V.A.T.S. TACTICAL CALCULATOR';
  content.innerHTML = `
<div style="font-family:inherit;font-size:11px;line-height:1.7;">
  <div style="margin-bottom:8px;display:flex;align-items:center;gap:8px;flex-wrap:wrap;">
    <label for="vatsTargetDT" style="font-size:11px;letter-spacing:0.5px;">TARGET DT (damage threshold):</label>
    <input id="vatsTargetDT" type="number" min="0" max="200" value="0" step="1" inputmode="numeric"
      aria-label="Target damage threshold"
      oninput="recomputeVATS()"
      style="font-size:16px;min-height:28px;width:84px;background:#000;color:inherit;border:1px solid var(--robco-green,#14fdce);padding:2px 6px;" />
  </div>
  <div id="vatsResult" aria-live="polite" aria-atomic="true" style="white-space:pre-wrap;font-family:inherit;"></div>
</div>`;

  recomputeVATS();
  openModal();
}

// recomputeVATS — recompute and render the V.A.T.S. table from live state + the TARGET DT
// input. Read-only. Safe to call repeatedly (the DT input's oninput).
function recomputeVATS() {
  const out = document.getElementById('vatsResult');
  if (!out) return;

  const ctx = typeof getGameContext === 'function' ? getGameContext() : 'FNV';
  const def = (window.GAME_DEFS && GAME_DEFS[ctx]) || (window.GAME_DEFS && GAME_DEFS.FNV) || {};
  const v = def.vats || {};
  const hitMin = typeof v.hitChanceMin === 'number' ? v.hitChanceMin : 5;
  const hitMax = typeof v.hitChanceMax === 'number' ? v.hitChanceMax : 95;
  const critBonus = typeof v.critBonus === 'number' ? v.critBonus : 0.05;
  const apBase = typeof v.apBase === 'number' ? v.apBase : 65;
  const apPerAgi = typeof v.apPerAgility === 'number' ? v.apPerAgility : 3;
  const regions =
    Array.isArray(v.regions) && v.regions.length ? v.regions : [{ name: 'TORSO', mod: 0, ap: 4 }];

  const per = parseInt((document.getElementById('s_p') || {}).value) || 5;
  const agi = parseInt((document.getElementById('s_a') || {}).value) || 5;
  const apPool = apBase + apPerAgi * agi;

  const skills = state.skills || {};
  const playstyle = localStorage.getItem('robco_playstyle') || 'any';
  const weaponName = (state.equipped && state.equipped.weapon) || null;
  const stats =
    weaponName && typeof lookupWeaponStats === 'function' ? lookupWeaponStats(weaponName) : null;
  const weaponIsMelee = _vatsIsMelee(stats);
  // Canonical melee-scope gate (§1.6) — NEVER mode alone.
  const meleeScope = playstyle === 'melee' || weaponIsMelee;

  const sk = _vatsResolveSkill(stats, def, skills);

  // Chem boost — active combat BUFFs count as a skill-equivalent bonus (existing heuristic).
  let chemBonus = 0;
  (state.status || []).forEach(eff => {
    if (eff && eff.type === 'BUFF' && (eff.ticks || 0) > 0) {
      const n = (eff.name || '').toLowerCase();
      if (
        n.includes('gun') ||
        n.includes('weapon') ||
        n.includes('combat') ||
        n.includes('turbo') ||
        n.includes('psycho')
      ) {
        chemBonus += 10;
      }
    }
  });

  const targetDT = Math.max(
    0,
    parseInt((document.getElementById('vatsTargetDT') || {}).value) || 0
  );

  // Base hit-% estimate (per-region modifier applied below). Clamp from GAME_DEFS (WU-D4a).
  const base = per * 2 + agi * 1.5 + (sk.value + chemBonus) / 3;
  const clamp = pct => Math.min(hitMax, Math.max(hitMin, Math.round(pct)));

  const hitRows = regions
    .map(r => {
      const pct = clamp(base + (r.mod || 0));
      const bar = '#'.repeat(Math.floor(pct / 10)).padEnd(10, '·');
      return `  ${r.name.padEnd(7)} [${bar}] ${String(pct).padStart(3)}% EST`;
    })
    .join('\n');

  // AP-strike optimizer (exact when a weapon is equipped). effDmg = Base_Damage − target DT.
  let apSection;
  if (stats) {
    const effDmg = Math.max(1, Math.round((stats.baseDamage || 0) - targetDT));
    let bestRegion = null;
    let bestDpa = -1;
    const apRows = regions
      .map(r => {
        const ap = r.ap || 1;
        const strikes = Math.floor(apPool / ap);
        const dpa = effDmg / ap;
        if (dpa > bestDpa) {
          bestDpa = dpa;
          bestRegion = r.name;
        }
        return `  ${r.name.padEnd(7)} AP:${String(ap).padStart(2)}  STRIKES:${String(strikes).padStart(2)}  DMG/AP:${dpa.toFixed(1)}  BURST:${strikes * effDmg}`;
      })
      .join('\n');
    apSection =
      `  WEAPON: ${escapeHtml(stats.name)}  (${weaponIsMelee ? 'MELEE/UNARMED — EXACT' : 'RANGED'})\n` +
      `  BASE DMG:${stats.baseDamage}  − DT:${targetDT}  = EFF DMG:${effDmg}  |  AP POOL:${apPool} (base)\n\n` +
      apRows +
      `\n\n  OPTIMAL (dmg/AP): ${bestRegion}`;
  } else {
    apSection = '  Equip a weapon (INV → equip) for exact AP-strike & damage math.';
  }

  const chemStr = chemBonus > 0 ? `  (+${chemBonus} CHEM)` : '';
  const skillLabel = `${sk.name.replace(/_/g, ' ').toUpperCase()} ${sk.value}${sk.exact ? '' : ' (est.)'}`;
  const critPct = Math.round(critBonus * 100);

  out.innerHTML = `<b>INPUTS</b>
  PER:${per}  AGI:${agi}  SKILL:${skillLabel}${chemStr}
  PLAYSTYLE:${playstyle.toUpperCase()}  MELEE-SCOPE:${meleeScope ? 'YES' : 'NO'}
  VATS CRIT BONUS: +${critPct}% (${ctx})

<b>HIT PROBABILITY — ESTIMATE</b>
${hitRows}

<b>AP-STRIKE OPTIMIZER${meleeScope ? '  ◄ MELEE' : ''}</b>
${apSection}

<span style="opacity:0.6;font-size:10px;">DETERMINISTIC — NO AI. Melee/unarmed AP-strike &amp; damage are exact;
ranged hit-% is an estimate (per-weapon spread is not in canon data). Read-only.</span>`;
}

// ── COMMAND-LINE MODE — pill UI + placeholder + hint (Step 2 · Phase 2 · B1) ──
// The inline mode pill inside the Comm-Link input toolbar (#modePill) plus the
// per-mode placeholder text and the "/`/`@` override" hint reveal. Device-pref
// backed (getInputMode/setInputMode/otherInputMode, js/state.js) — never
// campaign state, so it does NOT reset on a new campaign (same as optics,
// immersion, and every other MetaStore-backed device preference).
function _modeLabel(mode) {
  return mode === 'terminal' ? 'TERMINAL' : 'OVERSEER';
}

function _modePlaceholder(mode) {
  return mode === 'terminal'
    ? "TERM> ENTER A COMMAND OR QUICK-LOG (E.G. 'KILLED DEATHCLAW')…"
    : "AI> ENTER COMMAND OR ACTION (E.G. '> [THREAT] GECKOS')…";
}

function _renderModePill() {
  const pill = document.getElementById('modePill');
  const input = document.getElementById('chatInput');
  const mode = typeof getInputMode === 'function' ? getInputMode() : 'overseer';
  if (pill) {
    pill.textContent = _modeLabel(mode);
    pill.className = 'action-btn btn-sm mode-pill mode-pill--' + mode;
    pill.setAttribute(
      'aria-label',
      'Command input mode: ' +
        _modeLabel(mode) +
        '. Tap to switch to ' +
        _modeLabel(otherInputMode(mode)) +
        '.'
    );
  }
  if (input) input.placeholder = _modePlaceholder(mode);
}

// Tapping the pill swaps the PERSISTED mode (device pref) — distinct from the
// one-off `/`/`@` override, which never touches this persisted value.
function toggleInputMode() {
  const mode = typeof getInputMode === 'function' ? getInputMode() : 'overseer';
  setInputMode(otherInputMode(mode));
  _renderModePill();
  _updateModeHint();
  if (typeof playPanelClick === 'function') playPanelClick();
}
window.toggleInputMode = toggleInputMode;

// Shows "→ TERMINAL" / "→ OVERSEER" the moment #chatInput's raw value starts
// with `/` or `@` (first character only — matches the override-detection rule
// exactly). Reuses _resolveCommandInput() (api.js) as the single source of the
// actual routing target — `/` is FIXED to TERMINAL and `@` is FIXED to
// OVERSEER regardless of the persisted mode — so the hint can never drift from
// what submitCommandInput() will actually do. Implemented as a plain inline
// reveal (not a floating overlay) so it can never overflow at 360/412px — it
// just occupies its own row when visible.
function _updateModeHint() {
  const hint = document.getElementById('modeHintPopup');
  const input = document.getElementById('chatInput');
  if (!hint || !input) return;
  if (typeof _resolveCommandInput !== 'function') {
    hint.style.display = 'none';
    return;
  }
  // resolved.override is true for a leading `/` (whole-line -> TERMINAL) OR a
  // `@` appearing anywhere (inline ping -> OVERSEER) — the resolver is the
  // single source of both WHETHER an override is active and WHERE it targets,
  // so the hint can never drift from what submitCommandInput() will do.
  const resolved = _resolveCommandInput(input.value);
  if (resolved.override) {
    hint.textContent = '→ ' + _modeLabel(resolved.mode);
    hint.style.display = 'block';
  } else {
    hint.style.display = 'none';
  }
}
window._updateModeHint = _updateModeHint;

function _hideModeHint() {
  const hint = document.getElementById('modeHintPopup');
  if (hint) hint.style.display = 'none';
}
window._hideModeHint = _hideModeHint;

// One-time wiring for the hint reveal (the pill itself is restored/rendered by
// _restoreDevicePrefs(); the chat autocomplete extension is wired inside
// initRegistryAutocomplete() in ui-saves.js — Protocol 22, same singleton).
function _wireModeHint() {
  const input = document.getElementById('chatInput');
  if (input) input.addEventListener('input', _updateModeHint);
}

// WU-E3: the command registry is kept in lock-step with reality — every entry
// resolves to a NATIVE_COMMAND_ROUTER token (api.js), a live panel/UI control, an
// AI-directive-defined command (getSystemDirective), or a keyboard handler. The six
// deterministic NATIVE TERMINALS run fully offline with no AI call. Retired AI macros
// (the old screenshot-V.A.T.S., [TACTICS], [CURRENCY], [AUDIT], [STASH]/[EXCESS],
// [SYNC], [TRAVEL CLUSTER], [CASINO], [COMM LINK], [PAUSE], [PAGE 2/3], [ARCHIVE],
// chained &&/-Q/-S flags, etc.) were removed because they no longer resolve anywhere.
// Suite 113 guards this registry ↔ router ↔ help consistency so it can't drift again.
const COMMAND_REGISTRY = [
  {
    group: 'COMMAND-LINE MODE',
    cmds: [
      {
        cmd: '[MODE PILL]',
        desc: 'Tap the pill above the input to swap between TERMINAL (native + quick-log, offline) and OVERSEER (AI narrator).',
      },
      { cmd: '/message', desc: 'One-off: send just this message to TERMINAL, regardless of mode.' },
      {
        cmd: 'text @message',
        desc: 'Anywhere in a line, @ pings OVERSEER with just the text after it — the text before is dropped.',
      },
      {
        cmd: 'killed <target>',
        desc: 'Quick-log (TERMINAL): record a kill in the Terminal Record. Offline.',
      },
      { cmd: '+N caps / -N caps', desc: 'Quick-log (TERMINAL): adjust your caps. Offline.' },
      {
        cmd: 'arrived <location>',
        desc: 'Quick-log (TERMINAL): record a location as visited. Offline.',
      },
      {
        cmd: 'rep <faction> up/down',
        desc: "Quick-log (TERMINAL): nudge a faction's reputation +/-5. Offline.",
      },
      {
        cmd: 'action, action, action',
        desc: 'Quick-log (TERMINAL): comma-separate multiple actions on one line to apply them all.',
      },
    ],
  },
  {
    group: 'NATIVE TERMINALS — OFFLINE, NO AI',
    cmds: [
      {
        cmd: '[VATS SIM] / [VS] / [VATS]',
        desc: 'V.A.T.S. calculator — hit %, crit bonus & melee/unarmed AP-strike plan. Offline.',
      },
      {
        cmd: '[THREAT] / [TH]',
        desc: 'Bestiary stat card + time-to-neutralize & ammo/strike burn. Offline.',
      },
      {
        cmd: '[TRADE]',
        desc: 'Barter terminal (INV tab) — buy/sell at your Barter-skill prices. Offline.',
      },
      {
        cmd: 'CONSULT <topic> / [CON]',
        desc: 'Databank lookup — items, perks, quests, locations, creatures. Offline.',
      },
      {
        cmd: '[BIO-SCAN] / [BIO]',
        desc: 'Medical advisory — limb, HP, radiation & addiction readout. Offline.',
      },
      {
        cmd: '[LOOT] / [LT]',
        desc: 'Salvage terminal — add a database item to your pack at its value. Offline.',
      },
    ],
  },
  {
    group: 'INVENTORY & PROGRESSION',
    cmds: [
      { cmd: '[CRAFT]', desc: 'Consume ingredients to build (craft panel).' },
      { cmd: '[VISUAL UPLOAD: X]', desc: 'Parse a screenshot into inventory (Wpn / App / Msc).' },
      { cmd: '[BIND: X, DIR]', desc: 'Assign gear to a D-Pad vector.' },
      { cmd: '[PAD: DIR]', desc: 'Fire a D-Pad hotkey (the ◄ ▲ ▼ ► buttons).' },
      { cmd: '[ROADMAP]', desc: 'Perk roadmap toward your build goals.' },
    ],
  },
  {
    group: 'NAVIGATION & WORLD STATE',
    cmds: [
      { cmd: '[GPS] / [MAP]', desc: 'Localized geographic compass grid.' },
      { cmd: '[WAIT: X Hrs]', desc: 'Advance the clock by X hours; restock.' },
      { cmd: '[SLEEP]', desc: 'Advance 8 hours; heal HP & limbs. Offline.' },
      { cmd: '[CROSSROADS]', desc: 'Point-of-no-return / butterfly-effect check. Offline.' },
    ],
  },
  {
    group: 'KEYBOARD SHORTCUTS',
    cmds: [
      { cmd: 'Ctrl + Enter', desc: 'Send command.' },
      { cmd: 'Ctrl + /', desc: 'Focus command input.' },
      { cmd: 'Ctrl + 1–6', desc: 'Toggle panels 1–6 open/close.' },
      { cmd: '1 / 2 / 3 / 4', desc: 'Switch tab: STAT / INV / DATA / CAMPG.' },
      { cmd: '↑ / ↓', desc: 'Cycle command history in input.' },
      { cmd: '↑ / ↓ + Enter', desc: 'Navigate and select autocomplete.' },
      { cmd: 'Esc', desc: 'Close dialog or dismiss autocomplete.' },
    ],
  },
  {
    group: 'SYSTEM',
    cmds: [
      { cmd: '[TERMLINK] / [TL]', desc: 'Command console — launch any offline subsystem.' },
      { cmd: '[FEATURES]', desc: 'Show this command registry.' },
      { cmd: '[LOGS]', desc: 'Show client error log (local-only).' },
    ],
  },
];

function showHelpModal() {
  const modal = document.getElementById('sysModal');
  const title = document.getElementById('modalTitle');
  const content = document.getElementById('modalContent');
  if (!modal || !title || !content) return;
  title.innerText = '> COMM-LINK COMMAND REGISTRY';
  content.innerHTML =
    '<div class="cmd-registry">' +
    COMMAND_REGISTRY.map(
      g =>
        '<div class="cmd-group"><div class="cmd-group-title">' +
        escapeHtml(g.group) +
        '</div>' +
        g.cmds
          .map(
            c =>
              '<div class="cmd-card"><span class="cmd-name">' +
              escapeHtml(c.cmd) +
              '</span><span class="cmd-desc">' +
              escapeHtml(c.desc) +
              '</span></div>'
          )
          .join('') +
        '</div>'
    ).join('') +
    '</div><p style="font-size:9px;opacity:0.6;margin-top:8px;">Type any command in the Comm-Link input to execute.</p>';
  openModal();
}

// SAVE & DATA field manual — diegetic, game-agnostic copy (Protocol 38: no
// game-specific literals; describes the save mechanics generically). Each save
// action exposed by the SAVE MENU is documented here so the "?" affordance can
// explain the whole panel. Rendered into the shared sysModal so it inherits the
// WU-C4 focus-trap + ARIA dialog semantics for free.
const SAVE_HELP = [
  {
    cmd: 'OVERWRITE',
    desc: 'On the ALL SAVES list, replaces that specific save — local slot or cloud — with your current campaign while keeping its existing name. You always confirm first, and a local overwrite keeps its prior contents recoverable in VERSION HISTORY.',
  },
  {
    cmd: 'EXPORT SAVE',
    desc: 'Writes your entire campaign to a downloadable archive file kept on your own device — your offline insurance against data loss. Store it anywhere.',
  },
  {
    cmd: 'IMPORT SAVE',
    desc: 'Loads a previously exported archive back into the terminal, automatically upgrading older archives to the current save format.',
  },
  {
    cmd: 'RESTORE BACKUP',
    desc: 'The terminal keeps several automatic rolling snapshots of recent states. Restore rewinds to the most recent intact snapshot if a save ever goes wrong.',
  },
  {
    cmd: 'EXPORT FULL BACKUP',
    desc: 'Bundles EVERYTHING at once — your live campaign, all three save slots, and their version history — into a single downloadable file. IMPORT SAVE restores this bundle the same way it restores a single save; just pick the file.',
  },
  {
    cmd: 'SAVE SLOTS (A / B / C)',
    desc: 'Three named local slots held in this browser for quick save and load — no file needed. Saving to a slot overwrites only that slot.',
  },
  {
    cmd: 'SAVE TO CLOUD',
    desc: 'Signed-in operators only: uploads the current campaign to your private cloud vault as a new, additive entry. Existing cloud saves are never overwritten.',
  },
  {
    cmd: 'SYNC LOCAL SLOTS → CLOUD',
    desc: 'Pushes the local slots held in this browser up to your cloud vault in a single operation, so they are available on your other devices.',
  },
  {
    cmd: 'LOAD FROM CLOUD',
    desc: 'Pick any entry from the saves list to pull it back down. You are always asked to confirm before a loaded save replaces your current one.',
  },
  {
    cmd: 'AUTO-SAVE',
    desc: 'Your progress is written to this browser continuously in the background. These tools are for backups, transfers between devices, and recovery.',
  },
];

function showSaveHelpModal() {
  const modal = document.getElementById('sysModal');
  const title = document.getElementById('modalTitle');
  const content = document.getElementById('modalContent');
  if (!modal || !title || !content) return;
  title.innerText = '> SAVE & DATA — FIELD MANUAL';
  content.innerHTML =
    '<div class="cmd-registry">' +
    SAVE_HELP.map(
      c =>
        '<div class="cmd-card"><span class="cmd-name">' +
        escapeHtml(c.cmd) +
        '</span><span class="cmd-desc">' +
        escapeHtml(c.desc) +
        '</span></div>'
    ).join('') +
    '</div>';
  openModal();
}

function capStatMax(el) {
  const n = parseInt(el.value, 10);
  if (!isNaN(n) && n > 10) el.value = '10';
}
function commitStat(el) {
  const k = el.id.slice(2);
  let v = parseInt(el.value, 10);
  if (isNaN(v)) v = (state && state[k]) || 5;
  v = Math.max(1, Math.min(10, v));
  el.value = String(v);
  if (state) state[k] = v;
  updateMath();
  saveState();
}
function toggleLimb(limb) {
  let wasOk = state[limb] === 'OK';
  state[limb] = wasOk ? 'CRIPPLED' : 'OK';
  if (wasOk) {
    if (limb === 'hd') {
      playHeadCrippleSound();
      startTinnitus(); // Head cripple always triggers tinnitus
    } else {
      playLimbCrippleSound(limb);
    }
    if (crtHumGain) {
      crtHumGain.gain.cancelScheduledValues(audioCtx.currentTime);
      crtHumGain.gain.setValueAtTime(0.007, audioCtx.currentTime);
      crtHumGain.gain.linearRampToValueAtTime(0, audioCtx.currentTime + 0.08);
      crtHumGain.gain.linearRampToValueAtTime(0.007, audioCtx.currentTime + 0.35);
    }
  } else {
    if (limb === 'hd') {
      // Only stop tinnitus if rads are also below the threshold
      let rads = parseInt(document.getElementById('stat_rads').value) || 0;
      if (rads < 600) stopTinnitus();
    }
    playLimbRestoreSound();
  }
  loadUI();
}

function updateKarmaUI() {
  let k = parseInt(document.getElementById('stat_karma').value) || 0;
  let label = 'Neutral';
  if (k >= 750) label = 'Messiah';
  else if (k >= 250) label = 'Good';
  else if (k <= -750) label = 'Very Evil';
  else if (k <= -250) label = 'Evil';
  document.getElementById('karma_label').innerText = label;
}

function seedNewCampaignInventory(ctx) {
  const seedItems = (GAME_DEFS[ctx] || GAME_DEFS.FNV).seedInventory || [];
  if (seedItems.length === 0) return;
  if ((state.inventory || []).length !== 0) return;
  if ((state.ticks || 0) !== 0) return;
  state.inventory = state.inventory || [];
  seedItems.forEach(item => state.inventory.push({ ...item }));
}

const SKILL_LABELS = {
  barter: 'Barter',
  big_guns: 'Big Guns',
  energy_weapons: 'Energy Weapons',
  explosives: 'Explosives',
  guns: 'Guns',
  lockpick: 'Lockpick',
  medicine: 'Medicine',
  melee_weapons: 'Melee Weapons',
  repair: 'Repair',
  science: 'Science',
  small_guns: 'Small Guns',
  sneak: 'Sneak',
  speech: 'Speech',
  survival: 'Survival',
  unarmed: 'Unarmed',
};

function renderSkills() {
  const grid = document.getElementById('skillsGrid');
  if (!grid) return;
  grid.innerHTML = getSkillKeys()
    .map(sk => {
      const val = state.skills && state.skills[sk] !== undefined ? state.skills[sk] : 15;
      const label = SKILL_LABELS[sk] || sk;
      return `<div class="skill-row"><label for="sk_${sk}">${escapeHtml(label)}</label><input type="number" id="sk_${sk}" value="${val}" min="0" max="100" inputmode="numeric" oninput="saveState()"></div>`;
    })
    .join('');
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
  ['la', 'ra', 'll', 'rl', 'hd'].forEach(k => {
    let btn = document.getElementById('btn_l_' + k);
    if (!btn) return;
    const isCrippled = state[k] !== 'OK';
    if (!isCrippled) {
      btn.className = 'limb-ok';
      btn.innerText = '[██████] OK';
    } else {
      btn.className = 'limb-crip limb-glitch';
      btn.innerText = '[░░░░░░] CRIP';
    }
    btn.setAttribute('aria-pressed', isCrippled ? 'true' : 'false');
    btn.setAttribute('aria-label', (_limbNames[k] || k) + ': ' + (isCrippled ? 'Crippled' : 'OK'));
  });
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
  if (_isDirty('karma', { k: state.karma, ctx: state.gameContext })) renderKarmaCenter(); // G4: FO3 Karma Center
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
    const banner = document.getElementById('rngModeBanner');
    if (banner) banner.style.display = armed ? 'block' : 'none';
    const lockedBanner = document.getElementById('rngLockedBanner');
    if (lockedBanner) lockedBanner.style.display = locked ? 'block' : 'none';
  }
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
    } else {
      el.style.color = '';
      el.title = '';
    }
  });
}

// ── TIME INPUT HANDLER ───────────────────────────────────────────────
// Called by oninput on the calendar and time inputs. Clamps values and triggers a save.
function onTimeInputChanged() {
  const calMonthEl = document.getElementById('cal_month');
  const calDayEl = document.getElementById('cal_day');
  const calYearEl = document.getElementById('cal_year');
  const hrEl = document.getElementById('time_hour');
  const minEl = document.getElementById('time_min');
  if (!calMonthEl || !calDayEl || !calYearEl || !hrEl || !minEl) return;

  // Clamp
  let mo = Math.min(12, Math.max(1, parseInt(calMonthEl.value) || 1));
  let dy = Math.min(31, Math.max(1, parseInt(calDayEl.value) || 1));
  let yr = Math.max(2200, parseInt(calYearEl.value) || 2281);
  let h = Math.min(23, Math.max(0, parseInt(hrEl.value) || 0));
  let m = Math.min(59, Math.max(0, parseInt(minEl.value) || 0));

  calMonthEl.value = mo;
  calDayEl.value = dy;
  calYearEl.value = yr;
  hrEl.value = h;
  minEl.value = m;

  state.ticks = calendarToTicks(mo, dy, yr, h, m);

  // Keep hidden fields in sync
  let hiddenTicks = document.getElementById('stat_ticks');
  if (hiddenTicks) hiddenTicks.value = state.ticks;
  let hiddenDay = document.getElementById('time_day');
  if (hiddenDay) hiddenDay.value = Math.floor(state.ticks / 240) + 1;

  saveState();
}

// ── KARMA / HP / contextual-message gate variables ────────────
let _lastKarma = null,
  _lastHpPct = null;

// Contextual terminal message gate variables
// Each tracks the last-emitted threshold so we only fire once per crossing.
let _lastRadThreshold = 0; // 0 / 200 / 400 / 600 / 1000
let _lastGameHourBand = -1; // 0=night(20-5), 1=morning(6-11), 2=day(12-18), 3=evening(19)
let _lastChemExpiry = new Set(); // names of chems we've already warned about

// U7: HP-critical reaction (crit-hp-flash class + chassis buzz) — updateMath()
// below only detects the >25%→≤25% crossing and emits; this is the subscriber.
// Wiring is deferred to a function called from window.onload, NOT run at this
// file's top level — ui-core.js is itself a static <script> tag that can execute
// before state.js (which defines RobcoEvents) finishes its dynamic, context-
// conditional load (see the boot-loader comment in index.html); a top-level
// RobcoEvents.on(...) here would throw "RobcoEvents is not defined" on some boots.
function _wireCoreEventBusSubscribers() {
  RobcoEvents.on('hp.critical', () => {
    document.body.classList.remove('crit-hp-flash');
    void document.body.offsetWidth;
    document.body.classList.add('crit-hp-flash');
    setTimeout(() => document.body.classList.remove('crit-hp-flash'), 750);
    if (typeof triggerHaptic === 'function') triggerHaptic('lowhealth'); // WU-F2 haptic
  });
}

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
  document.getElementById('display_weight').style.color =
    curWt > maxWeight ? 'var(--robco-danger)' : 'var(--robco-green)';

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
    // H4: Low Health Heartbeat — start when HP < 25%, stop when >= 25%
    if (pct < 25 && hpMax > 0) {
      startHeartbeat(pct / 100);
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
    let pct = lvl >= 50 ? 100 : Math.min(100, Math.max(0, ((xp - xpCur) / (xpNext - xpCur)) * 100));
    xpFill.style.width = pct + '%';
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
      if (rads >= 600 || state.hd === 'CRIPPLED') startTinnitus();
      else stopTinnitus();
      setCrtHumIntensity(rads, hasCrippled);
    }
  }

  // Carry weight interface deformation
  document.body.classList.remove('weight-heavy', 'weight-critical', 'weight-over');
  if (curWt >= maxWeight) document.body.classList.add('weight-over');
  else if (curWt >= maxWeight * 0.9) document.body.classList.add('weight-critical');
  else if (curWt >= maxWeight * 0.75) document.body.classList.add('weight-heavy');

  // #25 Radiation Treatment Alert — compute how many RadAway doses needed
  {
    const rads = state.rads || 0;
    const alertEl = document.getElementById('radAwayAlert');
    if (alertEl) {
      if (rads >= 200) {
        const dosesNeeded = Math.ceil(rads / 150);
        const hasRadAway = state.inventory.some(i => /radaway/i.test(i.name));
        alertEl.textContent = `RAD TREATMENT: ~${dosesNeeded} RadAway needed${hasRadAway ? ' — RadAway in pack' : ' — NONE IN PACK'}`;
        alertEl.style.display = 'block';
        alertEl.style.color = hasRadAway ? 'var(--robco-alert)' : 'var(--robco-danger)';
      } else {
        alertEl.style.display = 'none';
      }
    }
  }

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

function appendToChat(text, sender, isHistoryLoad = false) {
  if (!text) return;
  const chatBox = document.getElementById('chatDisplay');
  const msgDiv = document.createElement('div');
  msgDiv.className = sender === 'user' ? 'msg-user' : sender === 'sys' ? 'msg-sys' : 'msg-ai';
  chatBox.appendChild(msgDiv);

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
        msgDiv.textContent = plainText.substring(0, i);
        if (i % 3 === 0) playClack();
        chatBox.scrollTop = chatBox.scrollHeight;
        setTimeout(typeWriter, speed);
      } else {
        // Animation complete — apply full safe HTML formatting
        msgDiv.innerHTML = fullHtml;
        chatBox.scrollTop = chatBox.scrollHeight;
        // DO-O: the typewriter owns the SPEAKING → LISTENING reset (transmitMessage's
        // finally hook only resets from 'thinking' — never truncates this).
        if (typeof window.setOverseerState === 'function') window.setOverseerState('listening');
      }
    }
    typeWriter();
  } else {
    msgDiv.innerHTML = fullHtml;
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

function macroCommand(actionStr) {
  let target = document.getElementById('macroTarget').value.trim();
  let finalCmd = actionStr;

  // Append the target if present and it's not a D-PAD command
  if (target && !actionStr.includes('PAD:')) {
    finalCmd = `${actionStr} ${target}`;
  }

  document.getElementById('chatInput').value = `> ${finalCmd}`;
  transmitMessage();
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
  const gate1 = await confirmAction({
    title: '> WIPE TERMINAL',
    warning:
      'This will erase ALL Courier data:\n- SPECIAL / Skills / Perks / Quests\n- Inventory / Factions / Status Effects\n- Campaign Notes / Collectibles / Squad\n- Chat History / Session Statistics\n\nSave slots are preserved.\n\nThis CANNOT be undone. Continue?',
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

  // Show context selection prompt in chat
  appendToChat('> TERMINAL WIPED. INITIATING NEW CAMPAIGN...', 'sys', true);
  appendToChat('> SELECT GAME CONTEXT:', 'sys', true);
  // DO-K: skip designOnly entries (FO4) — advertising a context nothing can actually select
  // would be a real, visible regression the moment GAME_DEFS grows a third game.
  Object.values(GAME_DEFS)
    .filter(d => !d.designOnly)
    .forEach(d => {
      appendToChat(`> Type [CONTEXT: ${d.id}] for ${d.label}`, 'sys', true);
    });
  appendToChat('> Or the AI will detect your game automatically.', 'sys', true);
}

// ── SAVE SLOTS (#6) ────────────────────────────────────────────────
// 3 named slots (A/B/C) stored as robco_slot_1/2/3 in localStorage.
// Each slot stores the full envelope {version, state, chat, playstyle, savedAt, slotName}.
