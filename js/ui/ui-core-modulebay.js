// ── ui-core-modulebay.js — MODULE BAY (split from ui-core.js, 2.8.5 U-A1) ──
// Module Bay wiring (renderModuleBay/initModuleBay/renderBaySchematic), the
// Sustained Power Cell (SLOT 03) and High-Lumen/Immersion-dial clusters, and
// the campaign-config board (game context, tempo dial, randomizer interlock,
// cart deck). Global scope, static <script> tag — see index.html load order.
// GOTCHA: this file straddles BOTH stores (Protocol 23 two-store boundary) —
// device prefs (optics, wake lock, immersion tier, haptics, key-sync) read/
// write through MetaStore/localStorage, while campaign fields (gameContext,
// playstyle, playthroughType, campaignMode) live on `state` (or, for
// playstyle, a raw localStorage key that rides the save envelope — see the
// note at changePlaystyle()) and go through saveState(). Know which store a
// given control targets before touching it.

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
    if (typeof _updatePowerBoardStatus === 'function') _updatePowerBoardStatus();
    return;
  }
  note.textContent = isWakeLockEnabled()
    ? '> DISPLAY SUSTAINED — SCREEN STAYS LIT'
    : '> POWER CELL IDLE — DISPLAY MAY DIM';
  if (typeof _updatePowerBoardStatus === 'function') _updatePowerBoardStatus();
}

// Owner batch item 5: SLOT 03 (POWER CELL BAY) collapsed summary line — combines
// the wake-lock + haptic states its own two status notes already show (reads the
// same underlying booleans those notes read, Protocol 22 — never re-parses their
// text) into one line so the board's state is visible collapsed too.
function _updatePowerBoardStatus() {
  const sum = document.getElementById('sum-slot03');
  if (!sum) return;
  const wakeOn =
    typeof _wakeLockSupported === 'function' && _wakeLockSupported() && isWakeLockEnabled();
  const hapticOn =
    typeof _hapticSupported === 'function' && _hapticSupported() && isHapticEnabled();
  sum.textContent =
    'DISPLAY SUSTAIN ' + (wakeOn ? 'ON' : 'OFF') + ' · HAPTICS ' + (hapticOn ? 'ON' : 'OFF');
}
window._updatePowerBoardStatus = _updatePowerBoardStatus;
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
  // Owner batch item 5: mirror into SLOT 04's collapsed summary line (Protocol 22).
  const sum04 = document.getElementById('sum-slot04');
  if (sum04 && note) sum04.textContent = note.textContent.replace(/^>\s*/, '');
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
  // CHASSIS LIVING CORE: a dial change can flip _coreShouldAnimate() live too.
  if (typeof _coreRefresh === 'function') _coreRefresh();
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
// Protocol 42 fix (2.8.5 item 6) — the NON-checkbox half of the same drift the
// BAY_CHECKBOX_SYNC_MAP above was written to close. BAY_CHECKBOX_SYNC_MAP only
// ever re-synced booleans, so the bay's PRINT-RATE TRIM slider and its numeric
// readout were restored at BOOT only (ui-core.js): dragging the trim in the
// Schematic View wrote the pref correctly, but switching back to the bay showed
// the old slider position and a stale "1.00×" until the next reload. Re-syncing
// value controls from the stored pref on every renderModuleBay() — which
// already fires after every bay AND schematic change — closes it in both
// directions, exactly as the checkbox map does.
function _syncBayValueControls() {
  const speed = parseFloat(MetaStore.get('robco_typer_speed') || '1');
  const slider = document.getElementById('typerSpeedSlider');
  if (slider) slider.value = String(speed);
  const label = document.getElementById('typerSpeedVal');
  if (label) label.textContent = speed.toFixed(2) + '×';
}
window._syncBayValueControls = _syncBayValueControls;

function renderModuleBay() {
  Object.keys(BAY_CHECKBOX_SYNC_MAP).forEach(id => {
    const el = document.getElementById(id);
    if (el) el.checked = MetaStore.get(BAY_CHECKBOX_SYNC_MAP[id]) === 'true';
  });
  // PROTOCOL 25 (sanctioned-exception guardrail #5 — stored semantics must not
  // change even when presentation inverts): B2c's SERVO CLICK RELAY uses
  // INVERTED checkbox semantics (checked = installed = audible), so it can't
  // ride the 1:1 BAY_CHECKBOX_SYNC_MAP above — it still writes the same
  // robco_hardwaresfx_muted boolean the mute toggle always wrote.
  const hwSfxToggle = document.getElementById('hardwareSfxToggle');
  if (hwSfxToggle) hwSfxToggle.checked = MetaStore.get('robco_hardwaresfx_muted') !== 'true';
  _syncBayValueControls();
  if (typeof _updateOpticsBoardStatus === 'function') _updateOpticsBoardStatus();
  if (typeof _updateSonicBoardStatus === 'function') _updateSonicBoardStatus();
  if (typeof _updateUplinkBoardStatus === 'function') _updateUplinkBoardStatus();
  if (typeof _updatePowerBoardStatus === 'function') _updatePowerBoardStatus();
  if (typeof _updateImmersionUI === 'function') _updateImmersionUI();
  _updateModuleBaySummary(); // owner batch item 5: top-level collapsed summary line
  const schem = document.getElementById('baySchematic');
  if (schem && !schem.hidden) renderBaySchematic();
}
window.renderModuleBay = renderModuleBay;

// Owner batch item 5: the SECURITY & CONFIGURATION (Module Bay) top-level panel's
// own collapsed-summary line — a short, dynamically-accurate combination of the
// same signals its SLOT boards already show (Protocol 22: reads the same
// underlying state, never re-derives it), so the whole bay's status is visible
// even before it's opened.
function _updateModuleBaySummary() {
  const sum = document.getElementById('sum-bay');
  if (!sum) return;
  const opticKey = typeof _resolveOptic === 'function' ? _resolveOptic() : 'green';
  const opticLabel =
    typeof THEMES !== 'undefined' && THEMES[opticKey] ? THEMES[opticKey].label : opticKey;
  const audioOn = !(window.AudioSettings && AudioSettings.masterMute);
  const carrier =
    typeof _isUplinkConnected === 'function' && _isUplinkConnected() ? 'CARRIER' : 'NO CARRIER';
  sum.textContent = opticLabel + ' · AUDIO ' + (audioOn ? 'ON' : 'OFF') + ' · ' + carrier;
}
window._updateModuleBaySummary = _updateModuleBaySummary;

// First-visit-only hatch ceremony (LOCKED-1). After the first-ever release the
// bay just opens with the panel — this function only decides whether the
// closed-hatch overlay is shown at all.
function initModuleBay() {
  const opened = MetaStore.get('robco_bay_opened') === 'true';
  const hatch = document.getElementById('bayHatch');
  if (hatch) hatch.hidden = opened;
  // PROTOCOL UI-6 (Everything Remembers on Reload) / FIX 4 (owner report —
  // this is the precedent example the protocol itself cites): restore
  // whichever of Bay / Schematic View the technician was last looking at, via
  // the registered robco_bay_view device pref.
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
// two never drift (Protocol 22) — PROTOCOL UI-6's mandated shape: one apply
// function serving both the boot-restore path and the user-action path.
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
  // PROTOCOL UI-6 / FIX 4: persist the view choice so it survives a reload.
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

// ── 2.8.5 item 6 — SCHEMATIC PROXY FORWARDERS ─────────────────────────────
// The rows added in this unit (the audio channel chips, the SLOT 05 uplink
// controls, the SVC TRAY actions) are PROXIES: they drive the REAL bay control
// and let its own already-wired handler run, rather than re-declaring which
// setter/pref each one owns.
//
// WHY forwarding rather than the direct-setter shape the original 11 rows use
// (both shapes are Protocol 22 — one truth; they differ in WHERE that truth
// lives):
//   1. It is the only CORRECT shape for the uplink controls. saveApiKeySilent()
//      (api.js) reads document.getElementById('apiKeyInput').value and
//      'apiModelInput'.value directly — a schematic input that called it
//      without first writing the bay's own node would persist the BAY's stale
//      value and silently discard what the user just typed.
//   2. It is what makes the chip list undriftable. The chips are derived from
//      #chipGrid at render time, so a 15th chip appears in the schematic with
//      no change here — which is the exact defect this unit fixes (the old
//      hardcoded chip-count label was already wrong by one when it was found).
// The bay stays in the DOM while hidden ([hidden] only hides it), so the real
// nodes are always reachable.
function _schemProxy(id, apply) {
  const el = document.getElementById(id);
  if (!el) return; // bay markup absent (test harness / partial DOM) — fail soft
  if (typeof apply === 'function') apply(el);
  return el;
}

// Mirrors a bay checkbox: set the real node, then fire its own change handler
// so whatever setter that chip declares in index.html is the one that runs.
function _schemForwardCheckbox(id, checked) {
  _schemProxy(id, el => {
    el.checked = !!checked;
    el.dispatchEvent(new Event('change', { bubbles: true }));
  });
  renderModuleBay();
}
window._schemForwardCheckbox = _schemForwardCheckbox;

// Mirrors a bay text/select control the same way (input vs change chosen to
// match the handler the bay node actually declares).
function _schemForwardValue(id, value, evtName) {
  _schemProxy(id, el => {
    el.value = value;
    el.dispatchEvent(new Event(evtName || 'change', { bubbles: true }));
  });
  renderModuleBay();
}
window._schemForwardValue = _schemForwardValue;

// Mirrors a bay action button — clicks the real one (its own onclick runs).
function _schemForwardClick(id) {
  _schemProxy(id, el => el.click());
}
window._schemForwardClick = _schemForwardClick;

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
  // SLOT 05 / SVC TRAY (2.8.5 item 6): mirror the bay's own nodes so the two
  // views can never disagree about the current value. The <select> option lists
  // are cloned from the real controls rather than re-declared — the model list
  // is populated at runtime by fetchAuthorizedModels(), so it has no static
  // list to copy.
  const apiKey = MetaStore.get('robco_gemini_key') || '';
  const modelOptions = _schemCloneOptions('apiModelInput');
  const holotapeOptions = _schemCloneOptions('holotapeFormatSelect');
  const pwaBtn = document.getElementById('btnInstallPwa');
  const pwaInstallable = !!pwaBtn && pwaBtn.style.display !== 'none';

  _applySchematicFraming();

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
    checkboxRow('_schemSetHardwareSfx', hwSfxOn, 'SERVO CLICK RELAY', 'SLOT 02'),
    _schemChipRows(),
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
    // SLOT 05 (UPLINK) — added at 2.8.5 item 6. Before this the schematic had
    // NO representation of the uplink board's actual payload, so a technician
    // who left the view on `schematic` (it persists — Protocol UI-6) could not
    // reach their own API key or model without switching back to the bay.
    row(
      `<input type="password" maxlength="200" value="${escapeHtml(apiKey)}" placeholder="PASTE GEMINI KEY HERE…" aria-label="Gemini API key" oninput="_schemForwardValue('apiKeyInput', this.value, 'input')" />`,
      'CIPHER KEY — AUTHORIZATION KEY',
      'SLOT 05'
    ),
    row(
      `<select onchange="_schemForwardValue('apiModelInput', this.value)" aria-label="AI model selection">${modelOptions}</select>`,
      'ENGINE SELECT — AI MODEL',
      'SLOT 05'
    ),
    row(
      `<button type="button" class="btn-sm" onclick="_schemForwardClick('btnFetchModels')">HANDSHAKE</button>`,
      'HANDSHAKE — VALIDATE KEY &amp; FETCH ENGINES',
      'SLOT 05'
    ),
    checkboxRow('_schemSetGeminiSync', keySync, 'KEY-SYNC JUMPER', 'SLOT 05'),
    // SVC TRAY — added at 2.8.5 item 6, same gap as SLOT 05 above.
    row(
      `<select onchange="_schemForwardValue('holotapeFormatSelect', this.value)" aria-label="Holotape export format">${holotapeOptions}</select>`,
      'HOLOTAPE FORMAT',
      'SVC TRAY'
    ),
    row(
      `<button type="button" class="btn-sm" onclick="_schemForwardClick('ejectHolotapeBtn')">&#9654; EJECT HOLOTAPE</button>`,
      'EJECT HOLOTAPE — EXPORT CAMPAIGN LOG',
      'SVC TRAY'
    ),
    // The bay hides this button until the browser fires beforeinstallprompt —
    // mirror that visibility rather than offering an install that cannot run.
    pwaInstallable
      ? row(
          `<button type="button" class="btn-sm" onclick="_schemForwardClick('btnInstallPwa')">&#9660; INSTALL SYSTEM (APP)</button>`,
          'SYSTEM INSTALLER',
          'SVC TRAY'
        )
      : '',
  ].join('');
}
window.renderBaySchematic = renderBaySchematic;

// Clones a bay <select>'s options, preserving the CURRENT selection.
// Deliberately not a raw .innerHTML copy: a selection made through the DOM
// (el.value = …, which is how fetchAuthorizedModels() and the boot restore both
// set the model) never appears as a `selected` attribute in the serialized
// markup, so an innerHTML clone would silently render the schematic's copy
// showing the FIRST option while the real control held something else.
function _schemCloneOptions(id) {
  const el = document.getElementById(id);
  if (!el) return '';
  return Array.from(el.options)
    .map(
      o =>
        '<option value="' +
        escapeHtml(o.value) +
        '"' +
        (o.value === el.value ? ' selected' : '') +
        '>' +
        escapeHtml(o.textContent) +
        '</option>'
    )
    .join('');
}
window._schemCloneOptions = _schemCloneOptions;

// The audio channel chips, derived LIVE from the bay's own #chipGrid.
//
// This replaces a single hardcoded, inert row that named a chip COUNT in its
// label and caption. Two defects in one line: the count was written as a
// string, so it was already wrong for the real number of chips the moment one
// was added (muteReactorHumToggle) — and the row was not a control at all, it
// told the reader to go back to the bay, contradicting the view's own promise
// of "EVERY MODULE AS A FLAT LIST, SAME CONTROLS".
// Deriving from the DOM means the count can never drift again and a future
// chip needs no change here (Protocol 38 / Protocol 22).
function _schemChipRows() {
  const grid = document.getElementById('chipGrid');
  if (!grid) return '';
  return Array.from(grid.querySelectorAll('input.chip-input'))
    .map(input => {
      const label = grid.querySelector('label[for="' + input.id + '"]');
      const pinEl = label && label.querySelector('.pin-id');
      const pin = pinEl ? pinEl.textContent.trim() : '';
      // The pin id is nested inside the label, so it rides along in textContent.
      const name = label ? label.textContent.replace(pin, '').trim() : input.id;
      const escName = escapeHtml(name + ' (CHANNEL CHIP — MUTE)');
      return (
        '<div class="schem-row"><div class="schem-row-head">' +
        '<span class="sr-name">' +
        escName +
        '</span><span class="sr-loc">' +
        escapeHtml(pin ? 'SLOT 02 · ' + pin : 'SLOT 02') +
        '</span></div><div class="schem-row-control">' +
        '<input type="checkbox" ' +
        (input.checked ? 'checked' : '') +
        ' onchange="_schemForwardCheckbox(\'' +
        escapeHtml(input.id) +
        '\', this.checked)" aria-label="' +
        escName +
        '" /></div></div>'
      );
    })
    .join('');
}
window._schemChipRows = _schemChipRows;

// Generic framing for a game that has authored no identity.schematic block.
// Protocol UI-10's rule: a literal generic fallback, never another game's
// borrowed fiction.
const SCHEMATIC_FALLBACK = {
  title: 'SCHEMATIC VIEW',
  note: 'EVERY MODULE AS A FLAT LIST — SAME CONTROLS, SAME SETTINGS, NO HARDWARE FICTION.',
  sig: 'SERVICE SCHEMATIC',
};

// Per-game framing, read from GAME_DEFS via getIdentity() — data, never a
// per-game `ctx === '<game>' ? … : …` branch (Protocol 38 / Protocol UI-7).
function _schematicFraming() {
  const id = typeof getIdentity === 'function' ? getIdentity() : null;
  const s = (id && id.schematic) || {};
  return {
    title: s.title || SCHEMATIC_FALLBACK.title,
    note: s.note || SCHEMATIC_FALLBACK.note,
    sig: s.sig || SCHEMATIC_FALLBACK.sig,
  };
}
window._schematicFraming = _schematicFraming;

// Paints the per-game heading/subtitle/signature strip. Separate from the row
// list so the framing is applied on every render (including the boot restore).
function _applySchematicFraming() {
  const f = _schematicFraming();
  const t = document.getElementById('baySchematicTitle');
  if (t) t.textContent = '⌕ ' + f.title;
  const n = document.getElementById('baySchematicNote');
  if (n) n.textContent = f.note;
  const g = document.getElementById('baySchematicSig');
  if (g) g.textContent = f.sig;
}
window._applySchematicFraming = _applySchematicFraming;

// ── SVC TRAY EXPORT/UTILITY ACTIONS ─────────────────────────────────────────
// SVC Tray onclick wrappers — kept as tiny named functions (not inline multi-
// statement onclick) so the diegetic log message is never embedded in an
// index.html attribute value (avoids colliding with the Suite 59 inline-
// handler scanner, which treats any "Word(" it finds in an attribute as a
// candidate function reference). Each wraps the SAME existing utility action.

// Consolidated EJECT HOLOTAPE control (owner report): merges the four
// previously-separate export buttons (EJECT HOLOTAPE / PRINT CAMPAIGN LOG /
// EXPORT .MD / EXPORT .HTML) into one — a #holotapeFormatSelect format
// choice plus this single action. Re-routes to the existing, UNFORKED
// functions (Protocol 22): TXT keeps the original EJECT HOLOTAPE behavior
// (ejectHolotape()'s share → clipboard → download fallback chain); MD/HTML
// keep the original EXPORT .MD/.HTML behavior (exportCampaignLog(fmt)'s
// download-only path) — neither function's own logic changes, only which
// one this control calls.
function _svcEjectHolotape() {
  const sel = document.getElementById('holotapeFormatSelect');
  const fmt = sel ? sel.value : 'txt';
  if (fmt === 'txt') {
    ejectHolotape();
  } else {
    exportCampaignLog(fmt);
  }
  _logBaySvc(
    'CAMPAIGN LOG EXPORTED — .' + String(fmt).toUpperCase() + (fmt === 'txt' ? ' (SHARE)' : '')
  );
}
window._svcEjectHolotape = _svcEjectHolotape;

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

// ── CAMPAIGN CONFIG STATE SETTERS (playthrough type, Complete RNG) ─────────
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
  // SU-3 (found during render-verify, Protocol 42): #completeRngToggle is a real,
  // keyboard/AT-reachable control (.bay-visually-hidden-input) — a user toggling
  // it DIRECTLY (never touching the fancy breaker button) must still repaint the
  // well/cover/seal/title/desc/summary/sequence-legend, not just this banner.
  if (typeof _syncInterlockUI === 'function') _syncInterlockUI();
}

// ── PWA INSTALL PROMPT ───────────────────────────────────────────────────────
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

// ── CAMPAIGN PROFILE STATE SETTERS (playstyle, game context) ───────────────
// GOTCHA / PROTOCOL 23 (two-store boundary): unlike the wake-lock/high-lumen/
// immersion prefs above, robco_playstyle is CAMPAIGN data, not a device pref
// — it rides the save envelope (cloud push/pull, save slots, export/import;
// see cloud.js and ui-saves.js) and is deliberately read/written via raw
// localStorage rather than MetaStore for that reason. Do not "fix" this to
// use MetaStore without moving it off the campaign-save round-trip first.
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

// ── CAMPAIGN PROFILE / RANDOMIZER INTERLOCK custom-control wiring (SU-3) ──
// The real controls (#gameContextSelect, #playstyleInput, #playthroughTypeSelect,
// #completeRngToggle) stay in the DOM, visually hidden via .bay-visually-hidden-input
// (the same technique already shipped for #immersionSelect — Protocol 17: a
// keyboard/AT user can still reach any of them directly); the cartridge/rocker/
// detent/breaker buttons below are the genuinely-custom visible controls, and both
// entry points drive the EXACT SAME setters (Protocol 22 — one truth, many entries).

// Owner decision: a cartridge swap reboots the terminal into a different game's
// campaign, so it is gated behind a light confirm — confirm -> proceed (calls the
// unchanged onGameContextChange), cancel -> stay (reverts the hidden select back to
// the still-active game; onGameContextChange is never called, so nothing reloads).
async function _confirmGameContextChange(ctx) {
  const sel = document.getElementById('gameContextSelect');
  const current = (state && state.gameContext) || 'FNV';
  if (ctx === current) {
    if (sel) sel.value = ctx;
    return;
  }
  const label = (GAME_DEFS[ctx] && GAME_DEFS[ctx].label) || ctx;
  const ok = await confirmAction({
    title: '> SWAP PROGRAM CARTRIDGE',
    warning:
      'Seating the ' +
      label +
      " cartridge reboots the terminal into that game's campaign.\n\nEach game keeps its own separate campaign — nothing is lost.\n\nContinue?",
    confirmLabel: 'SEAT CARTRIDGE',
  });
  if (!ok) {
    if (sel) sel.value = current;
    _syncCampaignProfileUI();
    return;
  }
  onGameContextChange(ctx);
}
window._confirmGameContextChange = _confirmGameContextChange;

// Cartridge button click — syncs the hidden select then routes through the exact
// same confirm gate a direct select change uses.
function _seatGameCartridge(ctx) {
  const sel = document.getElementById('gameContextSelect');
  if (sel) sel.value = ctx;
  // PROTOCOL UI-9 (Motion-Verb Grammar) — SEAT, introduced at Ceremony
  // Moments Wave 1, M5: fires the instant the cartridge is tapped (the
  // physical "press it into the slot" moment), independent of whether the
  // player then confirms or cancels the reload dialog below; never touches
  // the reload path itself (zero boot risk).
  const btn = document.getElementById('cart-' + String(ctx).toLowerCase());
  if (typeof _motionSeat === 'function') _motionSeat(btn);
  _confirmGameContextChange(ctx);
}
window._seatGameCartridge = _seatGameCartridge;

// PLAYSTYLE doctrine rocker. changePlaystyle() itself reverts #playstyleInput's
// value on the Educated/Dead-Weight melee lockout (unchanged) — re-syncing after
// it returns always reflects the ACTUAL final value, lockout or not.
function _setDoctrine(style) {
  const sel = document.getElementById('playstyleInput');
  if (sel) sel.value = style;
  changePlaystyle(style);
  _syncCampaignProfileUI();
}
window._setDoctrine = _setDoctrine;

// PLAYTHROUGH TYPE tempo dial + 5 direct-pick detents — one tap per pick.
function _setTempo(type) {
  const sel = document.getElementById('playthroughTypeSelect');
  if (sel) sel.value = type;
  onPlaythroughTypeChange(type);
  _syncCampaignProfileUI();
}
window._setTempo = _setTempo;

const _TEMPO_ORDER = ['standard', 'minmaxed', 'completionist', 'casual', 'speedrun'];
// SU-3 rework: the needle's rotation IS its index on the gauge arc — −84° …
// +84°, 42° apart, 0° = up (matches the owner-approved mockup geometry).
const _TEMPO_ARC_MIN = -84;
const _TEMPO_ARC_STEP = 42;
const _TEMPO_ARC_MAX = 84;
const _TEMPO_ROT = [-84, -42, 0, 42, 84];
const _TEMPO_LABELS = {
  standard: 'STANDARD',
  minmaxed: 'MIN-MAXED',
  completionist: 'COMPLETIONIST',
  casual: 'CASUAL',
  speedrun: 'SPEEDRUN',
};
const _TEMPO_DESC = {
  standard: 'balanced pacing — the default simulation',
  minmaxed: 'the AI assumes optimized builds',
  completionist: 'every side path surfaces',
  casual: 'forgiving pacing, lighter bookkeeping',
  speedrun: 'critical path only — aggressive clock',
};

// The seatable (non design-only) games, in GAME_DEFS declaration order — the
// single source renderCartDeck() generates the cartridge stack from (Protocol
// 38: a future seatable game needs only a new GAME_DEFS entry, never a markup
// or stacking-logic rewrite).
function _seatableGames() {
  return Object.keys(GAME_DEFS).filter(k => !GAME_DEFS[k].designOnly);
}

// Renders the PROGRAM CARTRIDGE stack — a physical pile, active game on top
// (stack-index 0, full legibility), every other seatable game piled beneath it
// with a progressively larger peek offset driven by the CSS --stack-index/
// --cart-stack-depth custom properties (css/terminal.css). Reuses the exact
// pre-existing _seatGameCartridge(ctx) onclick wiring (Protocol 22) — tapping
// a peeking cartridge still routes through the unchanged confirm-gated swap.
function renderCartDeck() {
  const deck = document.getElementById('cartDeck');
  if (!deck) return;
  const ctx = (state && state.gameContext) || 'FNV';
  const games = _seatableGames();
  const ordered = games.includes(ctx) ? [ctx, ...games.filter(g => g !== ctx)] : games;
  deck.style.setProperty('--cart-stack-depth', String(ordered.length));
  deck.innerHTML = ordered
    .map((g, i) => {
      const def = GAME_DEFS[g] || {};
      const label = String(def.label || g);
      const sub = (def.theme && def.theme.cartridgeTape) || '';
      const seated = g === ctx;
      return (
        `<button type="button" class="cart${seated ? ' seated' : ''}" id="cart-${escapeHtml(g.toLowerCase())}" ` +
        `style="--stack-index:${i}" onclick="_seatGameCartridge('${escapeHtml(g)}')" role="radio" ` +
        `aria-checked="${seated}" aria-label="Seat the ${escapeHtml(label)} program cartridge — switches the active game campaign">` +
        `<span class="spools" aria-hidden="true"><i></i><i></i></span>` +
        `<span class="c-name">${escapeHtml(label.toUpperCase())}</span>` +
        `<span class="c-sub">${escapeHtml(sub)}</span>` +
        `</button>`
      );
    })
    .join('');
}
window.renderCartDeck = renderCartDeck;

// Re-paints the CAMPAIGN PROFILE board's custom controls from the real,
// underlying state — cartridges/rocker/detents/dial/summary line. Called after
// every profile change and once at boot; never drifts from the hidden real
// controls, which stay the actual source of truth.
function _syncCampaignProfileUI() {
  const ctx = (state && state.gameContext) || 'FNV';
  renderCartDeck();

  const style = localStorage.getItem('robco_playstyle') || 'any';
  const isMelee = style === 'melee';
  const anyBtn = document.getElementById('rk-any');
  const meleeBtn = document.getElementById('rk-melee');
  if (anyBtn) {
    anyBtn.classList.toggle('on', !isMelee);
    anyBtn.setAttribute('aria-checked', String(!isMelee));
  }
  if (meleeBtn) {
    meleeBtn.classList.toggle('on', isMelee);
    meleeBtn.setAttribute('aria-checked', String(isMelee));
  }
  const doctrineStatus = document.getElementById('st-doctrine');
  if (doctrineStatus)
    doctrineStatus.textContent = '> DOCTRINE: ' + (isMelee ? 'MELEE / UNARMED ONLY' : 'ANY WEAPON');

  const tempo = (state && state.playthroughType) || 'standard';
  const tIdx = Math.max(0, _TEMPO_ORDER.indexOf(tempo));
  const tKey = _TEMPO_ORDER[tIdx];
  document.querySelectorAll('.detent2').forEach(d => {
    const on = d.dataset.tempo === tKey;
    d.classList.toggle('on', on);
    d.setAttribute('aria-checked', String(on));
  });
  document.querySelectorAll('.tempo-tick').forEach(t => {
    t.classList.toggle('lit', Number(t.dataset.i) === tIdx);
  });
  const knob = document.getElementById('tempoKnob');
  if (knob) {
    knob.style.transform = 'rotate(' + _TEMPO_ROT[tIdx] + 'deg)';
    knob.setAttribute('aria-valuenow', String(tIdx));
    knob.setAttribute('aria-valuetext', _TEMPO_LABELS[tKey] + ' — ' + _TEMPO_DESC[tKey]);
  }
  const readoutName = document.getElementById('tempoReadoutName');
  if (readoutName) readoutName.textContent = _TEMPO_LABELS[tKey];
  const readoutDesc = document.getElementById('tempoReadoutDesc');
  if (readoutDesc) readoutDesc.textContent = _TEMPO_DESC[tKey];
  const tempoStatus = document.getElementById('st-tempo');
  if (tempoStatus) tempoStatus.textContent = '> TEMPO: ' + _TEMPO_LABELS[tKey];

  const sum = document.getElementById('sum-profile');
  if (sum) {
    const gameLabel = String((GAME_DEFS[ctx] && GAME_DEFS[ctx].label) || ctx).toUpperCase();
    const doctrineLabel = isMelee ? 'MELEE ONLY' : 'ANY WEAPON';
    sum.textContent =
      gameLabel +
      ' CARTRIDGE · ' +
      doctrineLabel +
      ' · TEMPO: ' +
      _TEMPO_LABELS[_TEMPO_ORDER[tIdx]];
  }
  _syncCampaignConfigTopSummary();
}
window._syncCampaignProfileUI = _syncCampaignProfileUI;

// Owner batch item 5: the CAMPAIGN CONFIGS top-level panel's own collapsed
// summary line — aggregates the CAMPAIGN PROFILE + RANDOMIZER INTERLOCK
// boards' own summary text (Protocol 22, never re-derives their state) into
// one line. Called from both boards' own sync functions so it can never go
// stale regardless of which board last changed.
function _syncCampaignConfigTopSummary() {
  const sum = document.getElementById('sum-campaignConfig');
  if (!sum) return;
  const profile = document.getElementById('sum-profile');
  const ilk = document.getElementById('sum-ilk');
  const parts = [];
  if (profile && profile.textContent) parts.push(profile.textContent);
  if (ilk && ilk.textContent) parts.push(ilk.textContent);
  sum.textContent = parts.join(' · ');
}
window._syncCampaignConfigTopSummary = _syncCampaignConfigTopSummary;

// ── OPERATIONAL TEMPO rotary dial — drag-to-rotate (SU-3 rework) ───────────
// Reuses the Immersion dial's drag PATTERN (pointerdown/move/up/cancel,
// pointer capture, a "did this actually move" flag gating a real drag vs a
// tap, listeners added on down and removed on up/cancel) but NOT its pixel-
// step math: the Immersion dial steps 3 tiers off horizontal drag distance,
// while this dial has 5 positions ringed on a real arc and the needle must
// visually track the pointer's actual ANGLE while dragging (live needle-
// follow), snapping to the nearest position only on release — a genuinely
// different geometry gets its own angle-based handlers rather than force-
// fitting the pixel-step function onto it (Protocol 22: same established
// pattern, not a wholesale duplicate of unrelated math).
//
// Owner directive: tapping the knob body does NOTHING — unlike the
// Immersion dial there is no tap-to-advance/cycle here, only a drag, a
// direct .detent2 position tap, or the arrow keys change the value. The
// knob has no click handler at all, so a real drag's trailing synthetic
// click has nothing to do — the Immersion dial's own _dialDragSuppressClick
// flag is untouched by any of this (there's nothing here for it to suppress).
let _tempoDrag = null; // { startA, moved } while a genuine drag is in progress

function _tempoPointerAngle(ev, knob) {
  const r = knob.getBoundingClientRect();
  const cx = r.left + r.width / 2;
  const cy = r.top + r.height / 2;
  return (Math.atan2(ev.clientX - cx, cy - ev.clientY) * 180) / Math.PI; // 0° = up
}
function _tempoClampArc(a) {
  return Math.max(_TEMPO_ARC_MIN, Math.min(_TEMPO_ARC_MAX, a));
}
function _tempoNearestIndex(a) {
  return Math.max(
    0,
    Math.min(4, Math.round((_tempoClampArc(a) - _TEMPO_ARC_MIN) / _TEMPO_ARC_STEP))
  );
}
function _tempoPointerMove(ev) {
  if (!_tempoDrag) return;
  const knob = ev.currentTarget;
  const a = _tempoPointerAngle(ev, knob);
  if (!_tempoDrag.moved && Math.abs(a - _tempoDrag.startA) < 7) return; // wobble = still a tap
  _tempoDrag.moved = true;
  knob.classList.add('dragging'); // kill the transition for live needle-follow
  const clamped = _tempoClampArc(a);
  knob.style.transform = 'rotate(' + clamped + 'deg)';
  // Live preview of the nearest position while dragging — not committed
  // (onPlaythroughTypeChange) until pointerup, matching the mockup.
  const near = _tempoNearestIndex(clamped);
  document.querySelectorAll('.detent2').forEach(d => {
    d.classList.toggle('on', Number(d.dataset.i) === near);
  });
  document.querySelectorAll('.tempo-tick').forEach(t => {
    t.classList.toggle('lit', Number(t.dataset.i) === near);
  });
  // Owner report: the readout name/description used to only refresh on
  // release (_setTempo -> _syncCampaignProfileUI), so the needle could point
  // at CASUAL mid-drag while the readout still read COMPLETIONIST. Preview
  // the readout (and the knob's own ARIA) at the nearest position live, on
  // every drag frame — the actual value commit still only happens on
  // pointerup (_tempoPointerUp -> _setTempo), unchanged.
  const nearKey = _TEMPO_ORDER[near];
  const readoutName = document.getElementById('tempoReadoutName');
  if (readoutName) readoutName.textContent = _TEMPO_LABELS[nearKey];
  const readoutDesc = document.getElementById('tempoReadoutDesc');
  if (readoutDesc) readoutDesc.textContent = _TEMPO_DESC[nearKey];
  knob.setAttribute('aria-valuenow', String(near));
  knob.setAttribute('aria-valuetext', _TEMPO_LABELS[nearKey] + ' — ' + _TEMPO_DESC[nearKey]);
}
function _tempoPointerCleanup(knob) {
  knob.classList.remove('dragging');
  knob.removeEventListener('pointermove', _tempoPointerMove);
  knob.removeEventListener('pointerup', _tempoPointerUp);
  knob.removeEventListener('pointercancel', _tempoPointerCancel);
}
function _tempoPointerUp(ev) {
  if (!_tempoDrag) return;
  const knob = ev.currentTarget;
  try {
    knob.releasePointerCapture(ev.pointerId);
  } catch (e) {
    /* already released */
  }
  const drag = _tempoDrag;
  _tempoDrag = null;
  _tempoPointerCleanup(knob);
  if (drag.moved) {
    const idx = _tempoNearestIndex(_tempoPointerAngle(ev, knob));
    _setTempo(_TEMPO_ORDER[idx]); // real commit + repaint — the source of truth
  }
}
function _tempoPointerCancel(ev) {
  if (!_tempoDrag) return;
  const knob = ev.currentTarget;
  _tempoDrag = null;
  _tempoPointerCleanup(knob);
  _syncCampaignProfileUI(); // revert any live drag-preview back to the committed value
}
function _tempoPointerDown(ev) {
  if (ev.button !== 0) return; // left button only for mouse; touch/pen have no `button` semantics
  const knob = ev.currentTarget;
  _tempoDrag = { startA: _tempoPointerAngle(ev, knob), moved: false };
  try {
    knob.setPointerCapture(ev.pointerId);
  } catch (e) {
    /* unsupported — drag still tracks via the listeners below */
  }
  knob.addEventListener('pointermove', _tempoPointerMove);
  knob.addEventListener('pointerup', _tempoPointerUp);
  knob.addEventListener('pointercancel', _tempoPointerCancel);
}
// Arrow-key stepping — the knob is role=slider, so ArrowLeft/Right/Up/Down +
// Home/End are the expected native slider keymap.
function _tempoKeyDown(ev) {
  const tempo = (state && state.playthroughType) || 'standard';
  const idx = Math.max(0, _TEMPO_ORDER.indexOf(tempo));
  if (ev.key === 'ArrowRight' || ev.key === 'ArrowUp') {
    ev.preventDefault();
    _setTempo(_TEMPO_ORDER[Math.min(4, idx + 1)]);
  } else if (ev.key === 'ArrowLeft' || ev.key === 'ArrowDown') {
    ev.preventDefault();
    _setTempo(_TEMPO_ORDER[Math.max(0, idx - 1)]);
  } else if (ev.key === 'Home') {
    ev.preventDefault();
    _setTempo(_TEMPO_ORDER[0]);
  } else if (ev.key === 'End') {
    ev.preventDefault();
    _setTempo(_TEMPO_ORDER[4]);
  }
}
function _wireTempoDialDrag() {
  const knob = document.getElementById('tempoKnob');
  if (!knob) return;
  knob.addEventListener('keydown', _tempoKeyDown); // works with or without PointerEvent support
  if (typeof window.PointerEvent === 'undefined') return; // graceful fallback: tap-position + arrows still work
  knob.addEventListener('pointerdown', _tempoPointerDown);
}
window._wireTempoDialDrag = _wireTempoDialDrag;

// ── RANDOMIZER INTERLOCK — the breaker/cover/seal fiction over
// #completeRngToggle / state.campaignMode (mirrors the ARCHITECTURE.md-documented
// SAFE/'standard' -> ARMED/'rng' (reversible) -> SEALED/'rng-locked' (permanent,
// only via wipeTerminal() while armed) lifecycle — unchanged). Two deliberate
// taps arm from SAFE (lift the cover, then throw the lever) so a stray tap can't
// arm it; a single tap disarms/re-arms once the cover is already lifted.
// _ilkCoverLifted is transient UI state only (never persisted) — a fresh render
// always starts with the cover closed, matching SAFE.
let _ilkCoverLifted = false;
function _interlockLiftCover(ev) {
  if (ev) ev.stopPropagation();
  if (state.campaignMode === 'rng-locked') return;
  _ilkCoverLifted = true;
  const well = document.getElementById('ilkWell');
  if (well) well.classList.add('lifted');
}
window._interlockLiftCover = _interlockLiftCover;

function _interlockThrowBreaker() {
  if (state.campaignMode === 'rng-locked') return;
  const armed = state.campaignMode === 'rng';
  if (!armed && !_ilkCoverLifted) {
    _interlockLiftCover();
    return;
  }
  const cb = document.getElementById('completeRngToggle');
  const nextChecked = !armed;
  if (cb) cb.checked = nextChecked;
  onCampaignModeChange(nextChecked);
  _ilkCoverLifted = nextChecked;
  _syncInterlockUI();
}
window._interlockThrowBreaker = _interlockThrowBreaker;

// Re-paints the RANDOMIZER INTERLOCK · PURGE board from state.campaignMode — the
// well/lever/cover/seal, the sequence legend, the summary line, and the LED.
// Called after every interlock change and once at boot.
function _syncInterlockUI() {
  const mode = (state && state.campaignMode) || 'standard';
  const rngState = mode === 'rng' ? 'armed' : mode === 'rng-locked' ? 'locked' : 'safe';
  const wrap = document.getElementById('interlockWrap');
  if (wrap) wrap.dataset.rng = rngState;
  const well = document.getElementById('ilkWell');
  if (well) well.classList.toggle('lifted', rngState !== 'safe');
  if (rngState === 'safe') _ilkCoverLifted = false;

  const title = document.getElementById('ilkTitle');
  if (title)
    title.textContent =
      'COMPLETE RNG — ' +
      (rngState === 'safe' ? 'SAFE' : rngState === 'armed' ? 'ARMED' : 'SEALED');
  const desc = document.getElementById('ilkDesc');
  if (desc) {
    desc.textContent =
      rngState === 'safe'
        ? 'Full randomisation of SPECIAL, traits, tag skills, skill points and perk picks — handed to the AI for a NEW campaign only. Arming changes nothing until the next terminal wipe, and never touches an existing save.'
        : rngState === 'armed'
          ? 'Breaker thrown. The NEXT new campaign will be fully randomised. This one is untouched. Throw the breaker back down to disarm — right up until the wipe.'
          : 'This run was created with the breaker thrown. The interlock sealed at campaign creation and cannot be reopened — the seal is the fiction for: the toggle is disabled for this whole run.';
  }
  const actions = document.getElementById('ilkActions');
  if (actions) actions.style.display = rngState === 'armed' ? '' : 'none';

  // Protocol 22 consolidation (found during render-verify): _restoreDevicePrefs()/
  // loadUI() already toggled these banners from the same state.campaignMode read
  // before calling this function — folding it in here too means ANY future
  // caller of _syncInterlockUI() repaints the WHOLE board, banners included,
  // instead of depending on a caller-specific duplicate a few lines above it.
  const armedBanner = document.getElementById('rngModeBanner');
  if (armedBanner) armedBanner.style.display = rngState === 'armed' ? 'block' : 'none';
  const lockedBanner = document.getElementById('rngLockedBanner');
  if (lockedBanner) lockedBanner.style.display = rngState === 'locked' ? 'block' : 'none';

  const safeStep = document.getElementById('sq-safe');
  const armedStep = document.getElementById('sq-armed');
  const lockedStep = document.getElementById('sq-locked');
  if (safeStep) safeStep.classList.toggle('now', rngState === 'safe');
  if (armedStep) armedStep.classList.toggle('now', rngState === 'armed');
  if (lockedStep) lockedStep.classList.toggle('now', rngState === 'locked');

  const sum = document.getElementById('sum-ilk');
  if (sum)
    sum.textContent =
      rngState === 'safe'
        ? 'RNG SAFE · PURGE KEY STOWED'
        : rngState === 'armed'
          ? 'RNG ARMED — COMMITS AT NEXT WIPE'
          : 'RNG SEALED — PERMANENT THIS RUN';

  const led = document.getElementById('ilkLed');
  if (led)
    led.className =
      'bay-led ' + (rngState === 'safe' ? 'off' : rngState === 'armed' ? 'amber' : 'red');

  const st = document.getElementById('st-ilk');
  if (st) {
    st.textContent =
      rngState === 'safe'
        ? '> INTERLOCK SAFE — STANDARD CAMPAIGN MODE'
        : rngState === 'armed'
          ? '> INTERLOCK ARMED — NOTHING CHANGES UNTIL THE NEXT WIPE'
          : '> INTERLOCK SEALED — FULL RANDOMISATION ACTIVE, PERMANENT FOR THIS RUN';
    st.className =
      'board-status' + (rngState === 'armed' ? ' alert' : rngState === 'locked' ? ' danger' : '');
  }
  _syncCampaignConfigTopSummary();
}
window._syncInterlockUI = _syncInterlockUI;
