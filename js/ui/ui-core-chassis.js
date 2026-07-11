// ── ui-core-chassis.js — THE LIVING CORE + CHASSIS PANEL (split from ui-core.js, 2.8.5 U-A1) ──
// _coreRefresh and every _core* behavior, initChassisCore, the legacy
// "Overseer's Maintenance Log" telemetry (reskinned as CHASSIS's Unit Power
// Plant), System Status, the Service & Fault Console, and the casing lamps.
// Global scope, static <script> tag — see index.html load order.

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
      // M4 Long-Absence Recalibration (Ceremony Moments Wave 1) — additive
      // field, zeroes-safe like every sibling above; 0 reads identically to
      // "never flushed" (no prior session to compare against).
      lastFlushAt: num(o.lastFlushAt),
    };
  } catch (_) {
    return {
      bootCount: 0,
      totalPowerOnMs: 0,
      longestSessionMs: 0,
      firstBoot: 0,
      lastFlushAt: 0,
    };
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
  // M4 Long-Absence Recalibration — stamped on every flush (30s tick,
  // visibilitychange-hidden, pagehide), so the NEXT boot's runBootSequence()
  // reads THIS session's last flush (initOverseerLog()'s own write, which
  // runs earlier in the same window.onload, never touches this field).
  o.lastFlushAt = Date.now();
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
// BUS-22 UNIT POWER PLANT reskin (CHASSIS): the same four telemetry figures,
// now rendered as odo-tile industrial digit wheels — reusing the BUS-21
// SERVICE TALLY's _odoTile() helper verbatim (ui-render.js, Protocol 22) rather
// than a parallel drum-tile implementation. #chassisPlantStatus is the board's
// collapsed one-line summary (Protocol 22 — the same pattern every other
// bay-board's panel-substatus line already follows).
function renderOverseerLog() {
  const el = document.getElementById('overseerLogDisplay');
  if (!el) return;
  const o = _readOverseerLog();
  const session = _overseerSessionMs();
  const total = _overseerBaseMs + session;
  const longest = Math.max(o.longestSessionMs, session);
  const hours = total / 3600000;
  const hoursStr = hours >= 10 ? hours.toFixed(0) : hours.toFixed(1);
  const tile =
    typeof _odoTile === 'function'
      ? _odoTile
      : (cap, v) => '<span style="opacity:0.65;">' + cap + '</span><span>' + v + '</span>';
  el.innerHTML =
    tile('CURRENT UPTIME', _fmtOverseerDuration(session), 'live — this sitting') +
    tile('LONGEST SESSION', _fmtOverseerDuration(longest), 'record sitting') +
    tile('TOTAL POWER-ON', hoursStr + 'H', 'lifetime hour meter') +
    tile('BOOT COUNT', String(o.bootCount).padStart(4, '0'), 'ignitions — one per cold start');
  const sum = document.getElementById('chassisPlantStatus');
  if (sum) {
    sum.textContent =
      'SITTING ' +
      _fmtOverseerDuration(session) +
      ' · TOTAL ' +
      hoursStr +
      'H · ' +
      o.bootCount +
      ' IGNITIONS';
  }
}
// ── SYSTEM STATUS (CHASSIS) — Step 2 v2.8.0 Settings-tab unit ───────────
// Firmware/cache/carrier/feature-flag readout, merged beside the WU-F7 device
// telemetry half of the former Overseer's Log. Reads the real active
// Cache Storage key rather than duplicating the sw.js CACHE_NAME literal
// (Protocol 22) — resolved once and cached, since it never changes mid-session.
let _systemStatusCacheName = null;
function _readActiveCacheName(cb) {
  if (_systemStatusCacheName) {
    cb(_systemStatusCacheName);
    return;
  }
  if (!window.caches || typeof window.caches.keys !== 'function') {
    cb(null);
    return;
  }
  window.caches
    .keys()
    .then(keys => {
      _systemStatusCacheName = keys.find(k => k.indexOf('robco-terminal-v') === 0) || null;
      cb(_systemStatusCacheName);
    })
    .catch(() => cb(null));
}
// Protocol 22 — a literal fallback ONLY, exercised if window.getFeatureFlagKeys()
// (js/cloud.js, the real single source of every registered kill-switch flag) is
// unavailable, e.g. a reduced test harness that never loads cloud.js. In the real
// boot order cloud.js loads before this function is ever CALLED at runtime (it's a
// script-tag load-order dependency, not a call-time one — see Suite 219), so a live
// player always gets the real, current key list, never this frozen snapshot. Kept
// in sync with _featureFlags in cloud.js as a courtesy, not a requirement — the r2
// hotfix bug (visualOcr/visualAiVision missing from the breaker rack) was exactly
// this list silently drifting out of sync with the real flags; Suite 219 guards
// both this fallback and the primary source against drifting again.
const _SYSTEM_STATUS_FLAGS_FALLBACK = [
  'aiChat',
  'cloudSync',
  'googleSignIn',
  'keySync',
  'saveMigration',
  'offlineQueue',
  'visualOcr',
  'visualAiVision',
];
function _systemStatusFlagKeys() {
  return typeof window.getFeatureFlagKeys === 'function'
    ? window.getFeatureFlagKeys()
    : _SYSTEM_STATUS_FLAGS_FALLBACK;
}
// BUS-23 IDENTITY PLATE & BREAKERS reskin (CHASSIS): the same firmware/cache/
// carrier/feature-flag read-out, now rendered as a stamped serial plate (id-
// plate/rivets/id-row) + a breaker-lever rack (one per remote kill-switch
// flag, plus CARRIER) — read-outs only, the user never throws a lever
// (Protocol 33/35: the flags are set by the remote kill-switch config).
// #chassisIdentityStatus is the board's collapsed summary line.
function _chassisIdRow(label, val) {
  return (
    '<div class="id-row"><b>' + escapeHtml(label) + '</b><span>' + escapeHtml(val) + '</span></div>'
  );
}
function _chassisBreaker(label, on, wire, onWord, offWord) {
  return (
    '<div class="breaker' +
    (wire ? ' wire' : '') +
    ' ' +
    (on ? 'on' : 'off') +
    '">' +
    '<span class="bk-cap">' +
    escapeHtml(label) +
    '</span>' +
    '<span class="bk-slot" aria-hidden="true"><span class="bk-lever"></span></span>' +
    '<span class="bk-led" aria-hidden="true"></span>' +
    '<span class="bk-state">' +
    (on ? onWord : offWord) +
    '</span>' +
    '</div>'
  );
}
function renderSystemStatus() {
  const el = document.getElementById('systemStatusDisplay');
  if (!el) return;
  const connected = typeof _isUplinkConnected === 'function' ? _isUplinkConnected() : false;
  const flags = _systemStatusFlagKeys().map(k => ({
    key: k,
    on: typeof window.isFeatureEnabled !== 'function' || window.isFeatureEnabled(k) !== false,
  }));
  const enabledCount = flags.filter(f => f.on).length;
  _readActiveCacheName(cacheName => {
    const cacheRev = (cacheName || 'UNKNOWN').match(/-r\d+$/);
    el.innerHTML =
      '<div class="id-plate">' +
      '<span class="rivet tl" aria-hidden="true"></span><span class="rivet tr" aria-hidden="true"></span>' +
      '<span class="rivet bl" aria-hidden="true"></span><span class="rivet br" aria-hidden="true"></span>' +
      '<div class="id-title">ROBCO INDUSTRIES — UNIT IDENTITY</div>' +
      _chassisIdRow('MODEL', 'RIT-V300 DESK TERMINAL') +
      _chassisIdRow('FIRMWARE', 'v' + APP_VERSION) +
      _chassisIdRow('CACHE REV', cacheName || 'UNKNOWN') +
      _chassisIdRow('STORAGE', 'LOCAL · PWA SERVICE WORKER ACTIVE') +
      '</div>' +
      '<div class="breaker-rack">' +
      _chassisBreaker('CARRIER', connected, true, 'ONLINE', 'OFFLINE') +
      flags
        .map(f => _chassisBreaker(f.key.toUpperCase(), f.on, false, 'ENABLED', 'DISABLED'))
        .join('') +
      '</div>' +
      '<div class="rack-note" style="text-align:center;opacity:0.4;font-size:8px;text-transform:none;margin-top:8px">' +
      'breaker levers are read-outs of the remote kill-switch flags — the machine shows its own switchgear, users never throw these' +
      '</div>';
    const sum = document.getElementById('chassisIdentityStatus');
    if (sum) {
      sum.textContent =
        'FW v' +
        APP_VERSION +
        ' · CACHE ' +
        (cacheRev ? cacheRev[0].slice(1) : cacheName || 'UNKNOWN') +
        ' · CARRIER ' +
        (connected ? 'ONLINE' : 'OFFLINE') +
        ' · ' +
        enabledCount +
        '/' +
        flags.length +
        ' SYSTEMS ENABLED';
    }
    // .wire (amber, --bezel-wire) and .red (--robco-danger) share equal CSS
    // specificity — keep them mutually exclusive rather than stacking both,
    // so a disconnected carrier reliably shows red regardless of source order.
    const led = document.getElementById('carrierBoardLed');
    if (led) {
      led.classList.toggle('wire', connected);
      led.classList.toggle('red', !connected);
    }
  });
}
window.renderSystemStatus = renderSystemStatus;

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

// FEEDBACK ANIMATION WAVE 3 (#32 FAULT, polish tier) — the "did this
// ACTUALLY change?" crossing cache (the _lastRadThreshold/_lastWeightSeized
// precedent). Deliberately does NOT seed at boot.
let _lastFaultHasErrors = null;
// DO-N: the casing-top FAULT lamp reads the existing error ring-buffer
// (read-only device telemetry, no new state) — lit whenever a client error
// has been recorded this device, cleared by the existing [LOGS] CLEAR action.
function _updateFaultLamp() {
  const lamp = document.getElementById('lampFault');
  const hasErrors = _readErrorLog().length > 0;
  if (lamp) lamp.classList.toggle('fault', hasErrors);
  // #32 FAULT — a one-shot flicker on the lamp + the BUS-24 counter, fired
  // only on the genuine false->true crossing (a fresh fault, never every
  // re-render while already lit); home-only — the always-present lamp is
  // already the echo (build plan §8 Q6), no annunciator push needed.
  const isNewFault = _lastFaultHasErrors === false && hasErrors === true;
  _lastFaultHasErrors = hasErrors;
  if (typeof renderServiceFaultConsole === 'function') renderServiceFaultConsole();
  if (typeof _coreRefresh === 'function') _coreRefresh(); // LIVING CORE behavior #6: fault strain
  if (isNewFault) {
    [lamp, document.getElementById('svcFaultNum')].forEach(el => {
      if (!el) return;
      el.classList.remove('fault-flicker-in');
      void el.offsetWidth;
      el.classList.add('fault-flicker-in');
      setTimeout(() => el.classList.remove('fault-flicker-in'), 700);
    });
  }
}

// BUS-24 SERVICE & FAULT CONSOLE (CHASSIS) — the fault-annunciator half; the
// revision-log spool half is static markup (its one live value, #svcRevLine,
// is stamped once at boot by initChassisCore()). Reads the SAME ring-buffer
// _updateFaultLamp() already reads (Protocol 22) — never a second source of
// truth for "how many faults are buffered."
function renderServiceFaultConsole() {
  const counter = document.getElementById('svcFaultCounter');
  const numEl = document.getElementById('svcFaultNum');
  const lastEl = document.getElementById('svcFaultLast');
  const led = document.getElementById('svcBoardLed');
  const sum = document.getElementById('chassisSvcStatus');
  if (!counter && !sum) return;
  const log = _readErrorLog();
  const clear = log.length === 0;
  if (counter) counter.classList.toggle('clear', clear);
  if (numEl) numEl.textContent = String(Math.min(log.length, 99)).padStart(2, '0');
  if (lastEl) {
    if (clear) {
      lastEl.textContent = 'NO FAULTS ON THE BUFFER — UNIT NOMINAL';
    } else {
      const last = log[log.length - 1];
      const ts = new Date(last.t || Date.now()).toISOString().replace('T', ' ').slice(0, 19);
      lastEl.textContent =
        'LAST: [' +
        (last.type || '?') +
        '] ' +
        (last.msg || '') +
        ' · ' +
        ts +
        ' · buffered locally, never transmitted';
    }
  }
  if (led) led.classList.toggle('red', !clear);
  if (sum) {
    sum.textContent = clear
      ? 'REV LOG READY · NO FAULTS BUFFERED'
      : 'REV LOG READY · ' + log.length + ' FAULT' + (log.length === 1 ? '' : 'S') + ' BUFFERED';
  }
}
window.renderServiceFaultConsole = renderServiceFaultConsole;

// ── Owner-report batch: casing lamps go from decorative to functional ──────
// FIX 1: PWR lamp click → the existing AmbientRuntime SHUTDOWN path (Protocol
// 22 — the exact same shutdown() the A3 shutdown-crt observer already uses;
// #powerOnBtn/_powerOnFromShutdown() above remains the sole way back on).
function _powerOffFromLamp() {
  if (typeof AmbientRuntime === 'undefined' || !AmbientRuntime) return;
  AmbientRuntime.shutdown();
}
window._powerOffFromLamp = _powerOffFromLamp;

// PWR lamp reflects the real runtime power state — lit outside SHUTDOWN/OFF,
// unlit while shut down. Wired from the shutdown-crt observer's onEnter/onExit
// (Protocol 22 — no separate observer registered just for the lamp).
function _updatePwrLamp(on) {
  const lamp = document.getElementById('lampPwr');
  if (lamp) lamp.classList.toggle('on', !!on);
}

// FIX 2/4/5: the ONE connection signal — reused by the UPLINK lamp, the
// Overseer's own NO-CARRIER resting tag, the scope-tag click gate, and the
// bezel VITALS-strip CARRIER field, so none of them can ever disagree
// (Protocol 22). Deliberately the SAME hasKey/aiEnabled/online check
// _overseerRestState/_overseerRestSignals already use — not the stricter
// validated-key check SLOT 05's own board status uses (Suite 121/162).
function _isUplinkConnected() {
  return (
    typeof _overseerRestState === 'function' &&
    typeof _overseerRestSignals === 'function' &&
    _overseerRestState(_overseerRestSignals()) === 'listening'
  );
}
window._isUplinkConnected = _isUplinkConnected;

// UPLINK lamp reflects the same connection signal.
function _updateUplinkLamp() {
  const lamp = document.getElementById('lampUplink');
  if (lamp) lamp.classList.toggle('on', _isUplinkConnected());
}

// FIX 2/4a: shared navigation target for "go fix the AI connection" — used by
// the UPLINK lamp click and the Overseer's NO CARRIER tag click. Reuses
// selectSubsystem('settings') (Protocol 22) to route + sync the bezel nav —
// the Module Bay (and its SLOT 05 AI Uplink board) lives under the SETTINGS
// subsystem (Step 2 v2.8.0 Settings-tab unit), not CHASSIS — then opens/
// scrolls the SLOT 05 sub-panel specifically.
function _openAiUplinkSlot() {
  if (typeof selectSubsystem === 'function') selectSubsystem('settings');
  const slot = document.querySelector('details[data-sub-id="slot_05_uplink"]');
  if (!slot) return;
  if (!slot.open) slot.setAttribute('open', '');
  slot.scrollIntoView({ block: 'center' });
}
window._openAiUplinkSlot = _openAiUplinkSlot;

// ── CHASSIS [5] — THE LIVING CORE (Protocol UI-10) ─────────────────────────
// A decorative layer OVER real machine signals — the SAME pattern DO-O
// establishes above, reused rather than forked (Protocol 22): the core hooks
// setOverseerState()/_isUplinkConnected()/AmbientRuntime/RobcoEvents, never
// re-instruments transmitMessage()/appendToChat() itself. _coreRefresh() is
// the ONE choke point that recomputes every continuous signal and paints
// BOTH the full BUS-22 instrument (#chassisCore) and the mini mirror in its
// own casing-top readout window (#chassisCoreMini inside #chassisScreenMini)
// from the SAME snapshot — one shared source, so the two views can never
// drift (document.querySelectorAll keys off the shared .chassis-core-shape
// class both elements carry). Continuous
// motion (ring spin / heart pulse / flicker / fault ring / radio shimmer) is
// a plain CSS `animation:`, gated as a GROUP by _coreShouldAnimate() via the
// .core-still class; one-shot flourishes (level-up flare, save/sync pulse,
// tap-to-poke) use `transition:` instead (css: .chassis-core-shape rules),
// which the same global prefers-reduced-motion block also neutralises, so
// they still settle to a correct frame even while .core-still is present.
// Writes NOTHING durable to the campaign anywhere in this block — every
// signal read here is transient/in-memory or MetaStore device telemetry,
// never state.*/saveState()/robco_v8.
// ── CHASSIS CORE START ──────────────────────────────────────────────────
const CORE_POWER_CLASSES = ['core-boot', 'core-idle', 'core-standby', 'core-shutdown'];

// ── LIVING CORE — 10 owner-approved new behaviors (batch 2) ────────────────
// #1 THERMAL GLOW state — an in-memory-only "temperature" (0-100, never
// persisted — a purely cosmetic running average of recent activity, not a
// campaign stat). _coreThermalTick() (registered as an AmbientRuntime
// observer below, mirroring the DO-O idle-blip timer pattern — Protocol 22)
// is the ONLY place that mutates it; _coreRefresh() only ever READS it to
// paint the current tier.
let _coreTemp = 0;
// #7 RECOVERY / #4 RECONNECT-RIPPLE edge detection — the previous call's
// fault count / disconnected flag, so _coreRefresh() can tell a GENUINE
// transition (fault cleared, carrier just came back) from "still zero" /
// "still connected" and never fire the one-shot on every repaint.
let _lastCoreFaultCount = 0;
let _lastCoreDisconnected = false;
// #8 UPTIME-MILESTONE PULSE — the last whole hour of session uptime already
// celebrated this session (in-memory only, resets on reload — mirrors every
// other transient LIVING CORE signal, never a saved/campaign value).
let _lastCoreUptimeMilestone = 0;

// #1 thermal accumulator tick — a real, activity-derived running value (busy
// -> warms, idle -> cools), NOT a demo timer: the SAME three signals
// _coreRefresh()'s own #12 overclock check already reads (thinking/radio/a
// buffered fault). cadenceMs 4000 keeps the ramp "sustained load", not an
// instant flicker.
function _coreThermalTick() {
  const thinking =
    typeof getOverseerState === 'function' &&
    (getOverseerState() === 'thinking' || getOverseerState() === 'speaking');
  const radioOn = typeof _radioPlaying === 'function' && _radioPlaying();
  const faultCount = typeof _readErrorLog === 'function' ? _readErrorLog().length : 0;
  const busy = thinking || radioOn || faultCount > 0;
  _coreTemp = busy ? Math.min(100, _coreTemp + 8) : Math.max(0, _coreTemp - 5);
  _coreRefresh();
}

// #1/#4/#5/#7 — idle heartbeat / standby dim / shutdown collapse / boot
// ignition all derive from the ONE canonical Ambient Runtime state (no
// separate observers registered — RobcoEvents' existing 'runtime.state'
// broadcast, subscribed in _wireChassisCoreEventBusSubscribers() below, is
// what actually triggers a repaint on every transition).
function _corePowerClass() {
  const rt =
    typeof AmbientRuntime !== 'undefined' && AmbientRuntime ? AmbientRuntime.getState() : 'ACTIVE';
  if (rt === 'COLD_BOOT') return 'core-boot';
  if (rt === 'IDLE' || rt === 'STANDBY') return 'core-standby';
  if (rt === 'SHUTDOWN' || rt === 'OFF') return 'core-shutdown';
  return 'core-idle';
}

// The gate (Protocol UI-10) — mirrors _scopeShouldAnimate()'s exact gate list
// (Protocol 22): reduced-motion, the Immersion dial below Balanced,
// document.hidden, and the runtime in STANDBY/SHUTDOWN/OFF each suppress the
// continuous loop as one group — no bespoke per-behaviour carve-out.
function _coreShouldAnimate() {
  const reduced =
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduced) return false;
  if (typeof immersionAllows === 'function' && !immersionAllows('balanced')) return false;
  if (typeof document !== 'undefined' && document.hidden) return false;
  const rt =
    typeof AmbientRuntime !== 'undefined' && AmbientRuntime ? AmbientRuntime.getState() : 'ACTIVE';
  if (rt === 'STANDBY' || rt === 'SHUTDOWN' || rt === 'OFF') return false;
  return true;
}

// The shared shell query — both #chassisCore (the real button) and
// #chassisCoreMini (the decorative header mirror) carry this one class.
function _coreShells() {
  return Array.from(document.querySelectorAll('.chassis-core-shape'));
}

// _coreRefresh — recomputes every continuous signal and paints both shells
// from the SAME snapshot. Call sites: setOverseerState() (#2 AI revs / #3
// connection), _updateFaultLamp() (#6 fault strain), onImmersionChange() +
// a reduced-motion/visibilitychange listener (the gate), and the
// 'runtime.state' bus subscription (#1/#4/#5/#7). Never a polling loop.
function _coreRefresh() {
  const shells = _coreShells();
  if (!shells.length) return;
  const thinking =
    typeof getOverseerState === 'function' &&
    (getOverseerState() === 'thinking' || getOverseerState() === 'speaking');
  const disconnected =
    typeof getOverseerState === 'function' &&
    (getOverseerState() === 'disabled' || getOverseerState() === 'offline');
  const faultCount = typeof _readErrorLog === 'function' ? _readErrorLog().length : 0;
  const radioOn = typeof _radioPlaying === 'function' && _radioPlaying();
  const power = _corePowerClass();
  const animate = _coreShouldAnimate();
  // #12 Overclock strain — several signals active at once works the core
  // visibly harder. Recomputed live every call, no separate decay timer.
  const overclock = [thinking, radioOn, faultCount > 0].filter(Boolean).length >= 2;
  // #1 Thermal glow — _coreThermalTick() (an AmbientRuntime observer) is the
  // only mutator of _coreTemp; this just reads the current tier to paint.
  const tempWarm = _coreTemp >= 34 && _coreTemp < 67;
  const tempHot = _coreTemp >= 67;
  // #7 Recovery — a fault buffer that just emptied (was >0, now 0).
  const justRecovered = _lastCoreFaultCount > 0 && faultCount === 0;
  // #4 Reconnect ripple — the carrier just came back (was disconnected, now not).
  const justReconnected = _lastCoreDisconnected && !disconnected;

  shells.forEach(el => {
    CORE_POWER_CLASSES.forEach(c => el.classList.toggle(c, c === power));
    el.classList.toggle('core-thinking', thinking);
    el.classList.toggle('core-disconnected', disconnected && !thinking);
    el.classList.toggle('core-fault', faultCount > 0);
    el.classList.toggle('core-radio', radioOn);
    el.classList.toggle('core-overclock', overclock);
    el.classList.toggle('core-temp-warm', tempWarm);
    el.classList.toggle('core-temp-hot', tempHot);
    el.classList.toggle('core-still', !animate);
  });

  const led = document.getElementById('corePowerLed');
  if (led) led.classList.toggle('red', faultCount > 0);

  // #7/#4 one-shot flourishes — fired AFTER the main paint above so
  // core-fault is already off the element by the time core-recovering goes
  // on (they can never coexist — see the CSS comment on .core-recovering::after).
  if (justRecovered) _coreOneShot('core-recovering', 1200);
  if (justReconnected) _coreOneShot('core-ripple', 900);
  _lastCoreFaultCount = faultCount;
  _lastCoreDisconnected = disconnected;

  // #6 Reactor hum — the SAME activity signals this function already
  // computed drive the hum's live intensity (Protocol 22, no re-derivation).
  if (typeof _updateReactorHumLevel === 'function') {
    _updateReactorHumLevel(thinking, radioOn, faultCount > 0);
  }
}
window._coreRefresh = _coreRefresh;

// One-shot flourishes (#8 level-up flare, #9 save/sync write-pulse, #13
// tap-to-poke) — add-then-remove the reflow-restart pattern the OS Event Bus
// subscribers already use elsewhere (Suite 135/162 precedent) so a repeated
// trigger restarts cleanly. Skipped entirely when the gate is closed — a
// suppressed flourish simply never fires, leaving the correct resting frame.
const _coreOneShotTimers = {};
function _coreOneShot(cls, ms) {
  if (!_coreShouldAnimate()) return;
  _coreShells().forEach(el => {
    el.classList.remove(cls);
    void el.offsetWidth; // force reflow so a repeated trigger restarts the transition
    el.classList.add(cls);
  });
  clearTimeout(_coreOneShotTimers[cls]);
  _coreOneShotTimers[cls] = setTimeout(() => {
    _coreShells().forEach(el => el.classList.remove(cls));
  }, ms);
}
function _coreFlare() {
  _coreOneShot('core-flare', 900);
}
window._coreFlare = _coreFlare;
function _coreDataPulse() {
  _coreOneShot('core-datapulse', 700);
}
window._coreDataPulse = _coreDataPulse;

// #4 Power-surge ripple — fired alongside the EXISTING flare/datapulse calls
// (save-to-slot, cloud push/pull, level-up) plus the reconnect edge detected
// inside _coreRefresh() itself (Protocol 22 — reuses data.write/level.up/
// connection, never a new trigger).
function _coreRipple() {
  _coreOneShot('core-ripple', 900);
}
window._coreRipple = _coreRipple;

// #8 Uptime-milestone pulse — a small celebratory flourish, distinct from
// the brighter flare/datapulse/tap group.
function _coreMilestonePulse() {
  _coreOneShot('core-milestone', 1000);
}
window._coreMilestonePulse = _coreMilestonePulse;

// #13 Tap-to-poke — the #chassisCore button's onclick. An optional short
// synth kick via the EXISTING hardware-SFX channel (Protocol 7 —
// playChipClick() already guards masterMute + the hardwareSfx pref; reused
// as-is, never forked). Purely cosmetic — no campaign write. Suppressed once
// (see #9 below) when the click follows a completed hold-to-overcharge —
// a pointerup always fires a trailing click event regardless of how long the
// button was held, so without this guard a charged release would fire BOTH
// the overcharge burst AND a plain poke.
let _coreSuppressNextTap = false;
function _coreTapPoke() {
  if (_coreSuppressNextTap) {
    _coreSuppressNextTap = false;
    return;
  }
  _coreOneShot('core-tap', 500);
  if (typeof playChipClick === 'function') playChipClick(true);
}
window._coreTapPoke = _coreTapPoke;

// #9 Tap-and-hold overcharge — extends tap-to-poke with a press-and-HOLD
// gesture. Wired to #chassisCore's pointerdown/up/cancel/leave in
// initChassisCore() below. Holding CORE_HOLD_MS ramps the ring spin via the
// SAME --core-spin-mul-r1/-r3 inertia mechanism #3 uses (Protocol 22);
// releasing AFTER the charge threshold fires a bigger burst (reusing the
// #14 stat-change burst's own tumble keyframes) plus an optional heavier
// synth kick via the EXISTING hardware-SFX board-thunk channel (Protocol 7 —
// playBoardThunk() already guards masterMute + hardwareSfx). Gated the same
// way every other flourish is: when _coreShouldAnimate() is closed, the
// charging visual never starts, so a hold under reduced-motion/low-immersion/
// hidden-tab/standby degrades to a no-op hold + a plain click — never a
// broken half-state.
const CORE_HOLD_MS = 850;
let _coreHoldTimer = null;
let _coreHeld = false; // true once THIS press reached the charge threshold
function _coreHoldStart() {
  _coreHeld = false;
  clearTimeout(_coreHoldTimer);
  _coreHoldTimer = null;
  if (!_coreShouldAnimate()) return; // gate closed — no charge visual, plain tap still works
  _coreShells().forEach(el => el.classList.add('core-charging'));
  _coreHoldTimer = setTimeout(() => {
    _coreHeld = true;
    _coreShells().forEach(el => {
      el.classList.remove('core-charging');
      el.classList.add('core-charged');
    });
  }, CORE_HOLD_MS);
}
function _coreHoldEnd() {
  clearTimeout(_coreHoldTimer);
  _coreHoldTimer = null;
  const wasCharged = _coreHeld;
  _coreHeld = false;
  _coreShells().forEach(el => el.classList.remove('core-charging', 'core-charged'));
  if (wasCharged) {
    _coreOneShot('core-overcharge', 1800);
    if (typeof playBoardThunk === 'function') playBoardThunk(true);
  }
  _coreSuppressNextTap = wasCharged; // consume: the trailing click must not ALSO poke
}
window._coreHoldStart = _coreHoldStart;
window._coreHoldEnd = _coreHoldEnd;

// #14 3D ring burst on a real stat change (owner follow-up) — a genuine 3D
// orbital tumble (rotateX/rotateY/rotateZ), distinct from the flat 2D
// chassisCoreSpin the rings idle with, layered on via the same one-shot
// add-then-reflow-then-remove pattern as every other flourish above. Fires
// through _coreOneShot(), so it is already gated by _coreShouldAnimate() —
// no bespoke reduced-motion carve-out. 1800ms matches the CSS
// chassisCoreOrbitBurst1/2/3 animation-duration (owner follow-up: "a bit
// slower" than the previous 1.4s, same 720deg double tumble, just more
// graceful) so the class is removed right as the animation finishes.
function _coreStatBurst() {
  _coreOneShot('core-stat-burst', 1800);
}
window._coreStatBurst = _coreStatBurst;

// _emitStatChangeIfDiffers(key, newVal) — the shared "did this ACTUALLY
// change?" cache for the drag-style stat setters (HP/XP/RAD bars, the skill
// VU meter), which are called on every mousemove/touchmove tick during a
// drag and have no other "before this call" value to compare against
// (unlike commitStat()'s onchange commit, which reads state[k] directly
// before overwriting it). Deliberately does NOT seed from state at boot —
// the FIRST edit to a given key each session only establishes the baseline
// (no burst); every edit after that on the same key fires correctly. Purely
// an in-memory comparison cache — writes nothing durable to the campaign.
const _lastStatValues = {};
function _emitStatChangeIfDiffers(key, newVal) {
  const old = _lastStatValues[key];
  _lastStatValues[key] = newVal;
  if (old !== undefined && old !== newVal) {
    RobcoEvents.emit('stat.change', { key, oldVal: old, newVal });
  }
}

// The "?" explainer (Suite 103 showSaveHelpModal precedent, Protocol 22) —
// plain, in-voice language describing what the cell is and what each
// behaviour means. Game-agnostic (Protocol 38) — device fiction only.
const CORE_HELP = [
  {
    cmd: 'IDLE HEARTBEAT',
    desc: 'A slow, steady pulse — the cell sitting quietly while the terminal is powered and waiting.',
  },
  {
    cmd: 'DIRECTOR UPLINK',
    desc: 'The cell spins up and glows brighter while the Director composes a reply — the same moment the Uplink scope reads THINKING.',
  },
  {
    cmd: 'CARRIER LINK',
    desc: 'A steady glow means the carrier is connected. No key, a disabled uplink, or no connection at all and the cell flickers and dims.',
  },
  {
    cmd: 'STANDBY',
    desc: 'The cell dims and slows whenever the terminal sits idle or the tab loses focus — a power-saving state, not a fault.',
  },
  {
    cmd: 'SHUTDOWN',
    desc: 'A full power-down collapses the cell to a dark point. Use PRESS TO POWER ON to bring it back.',
  },
  {
    cmd: 'FAULT STRAIN',
    desc: 'A faint red ring appears whenever the client error log has something buffered — clear it from the FAULT ANNUNCIATOR on BUS-24.',
  },
  {
    cmd: 'IGNITION',
    desc: 'A cold boot spins the cell up fast before it settles into its normal idle rhythm.',
  },
  { cmd: 'LEVEL-UP FLARE', desc: 'A single bright flash marks a level committed.' },
  {
    cmd: 'DATA PULSE',
    desc: 'A quick brighten marks a save written — to a local slot, or pushed to / pulled from the cloud.',
  },
  { cmd: 'RADIO SHIMMER', desc: 'A gentle shimmer plays while the Pip-Boy Radio station is on.' },
  {
    cmd: 'CELL COLOUR',
    desc: 'The cell always glows in whatever optic colour is currently selected on this terminal.',
  },
  {
    cmd: 'OVERCLOCK',
    desc: 'Several of the above happening at once (the Director busy, the radio playing, a fault buffered) works the cell visibly harder.',
  },
  {
    cmd: 'TAP TO PULSE',
    desc: 'Tap the cell any time for a quick kick — purely cosmetic, changes nothing.',
  },
  {
    cmd: '3D RING BURST',
    desc: "The cell's rings tumble in a real 3D orbit for a moment whenever you actually change a stat — a S.P.E.C.I.A.L. attribute, a skill, your HP, XP, or radiation level — or level up.",
  },
  {
    cmd: 'THERMAL GLOW',
    desc: 'The cell warms from green toward amber and red the longer it stays busy, and cools back down once things quiet.',
  },
  {
    cmd: 'ENERGY SPARKS',
    desc: 'Small particles orbit the cell — more of them, brighter, while the cell is busy; just a faint one at rest.',
  },
  {
    cmd: 'SPIN INERTIA',
    desc: 'The rings ease smoothly into a new speed instead of snapping — a momentum feel, not an instant jump.',
  },
  {
    cmd: 'POWER-SURGE RIPPLE',
    desc: 'A ring ripples outward whenever the carrier reconnects, in addition to the data-pulse and level-up flourishes above.',
  },
  {
    cmd: 'IDLE FLARES',
    desc: 'Every so often during a long quiet stretch, the cell flares faintly — the reactor settling.',
  },
  {
    cmd: 'REACTOR HUM',
    desc: 'A synthesized hum tuned to blend with the CRT hum, rising with the cell’s activity and louder while you’re looking at CHASSIS.',
  },
  {
    cmd: 'RECOVERY',
    desc: 'When a buffered fault clears, the cell visibly stabilizes back to calm green instead of the fault ring just vanishing.',
  },
  {
    cmd: 'UPTIME MILESTONE',
    desc: 'A small celebratory pulse marks every hour the terminal has been powered on this session.',
  },
  {
    cmd: 'HOLD TO OVERCHARGE',
    desc: 'Press and HOLD the cell to spin it up, then release for a bigger burst than a plain tap.',
  },
];
function showCoreHelpModal() {
  openModal({
    title: '> SUSTAINED CELL — FIELD MANUAL',
    body:
      '<div class="cmd-registry">' +
      CORE_HELP.map(
        c =>
          '<div class="cmd-card"><span class="cmd-name">' +
          escapeHtml(c.cmd) +
          '</span><span class="cmd-desc">' +
          escapeHtml(c.desc) +
          '</span></div>'
      ).join('') +
      '</div>',
  });
}
window.showCoreHelpModal = showCoreHelpModal;

// Boot wiring — mirrors initOverseerScope()'s call shape (called once from
// window.onload). Stamps the BUS-24 revision line, paints the fault console
// + the core's initial frame, and re-arms the gate on the two live signals
// that can flip it outside a runtime transition (a reduced-motion OS
// preference change, and the tab visibility toggle).
function initChassisCore() {
  const svcRev = document.getElementById('svcRevLine');
  if (svcRev) svcRev.textContent = 'CURRENT: v' + APP_VERSION;
  if (typeof renderServiceFaultConsole === 'function') renderServiceFaultConsole();
  _coreRefresh();
  document.addEventListener('visibilitychange', () => _coreRefresh());
  if (typeof window.matchMedia === 'function') {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    if (typeof mq.addEventListener === 'function')
      mq.addEventListener('change', () => _coreRefresh());
  }

  // #9 Tap-and-hold overcharge — pointer wiring on the real button only (the
  // mini core is a decorative, non-interactive aria-hidden mirror).
  const coreBtn = document.getElementById('chassisCore');
  if (coreBtn) {
    coreBtn.addEventListener('pointerdown', _coreHoldStart);
    coreBtn.addEventListener('pointerup', _coreHoldEnd);
    coreBtn.addEventListener('pointercancel', _coreHoldEnd);
    coreBtn.addEventListener('pointerleave', _coreHoldEnd);
  }

  if (typeof AmbientRuntime !== 'undefined' && AmbientRuntime && AmbientRuntime.register) {
    // #1 Thermal glow accumulator — a real activity-derived running value,
    // ticking only while the terminal is genuinely awake (ACTIVE/IDLE, never
    // STANDBY/SHUTDOWN/OFF — those states are already gated off/dimmed).
    AmbientRuntime.register({
      id: 'core-thermal',
      states: ['ACTIVE', 'IDLE'],
      tier: 'balanced',
      cadenceMs: 4000,
      onTick: _coreThermalTick,
    });

    // #5 Idle flares — low-rate, dial-gated, non-persisted, mirrors the DO-O
    // Overseer idle-blip timer exactly (Protocol 22): only during genuine
    // idle, roughly half the ticks, a faint settling flare.
    AmbientRuntime.register({
      id: 'core-idle-flare',
      states: ['IDLE'],
      tier: 'balanced',
      cadenceMs: 42000,
      onTick: () => {
        if (Math.random() > 0.5) return;
        _coreOneShot('core-idle-flare', 1100);
      },
    });

    // #6 Reactor hum power link — mirrors the SAME 'crt-hum-power' pattern
    // (_wireAmbientExperiences() above) so the reactor hum stops on a genuine
    // power-down and resumes (autoplay-safe, deferred to the first gesture)
    // when the terminal comes back — a functional power link, not tier-gated,
    // exactly like the CRT hum's own link.
    AmbientRuntime.register({
      id: 'reactor-hum-power',
      states: ['SHUTDOWN', 'OFF'],
      onEnter: () => {
        if (typeof stopReactorHum === 'function') stopReactorHum();
      },
      onExit: () => {
        if (typeof startReactorHum !== 'function') return;
        _armAmbientAudio(() => startReactorHum());
      },
    });
  }
}
window.initChassisCore = initChassisCore;

// RobcoEvents subscriptions — deferred to a function called from
// window.onload (the Suite 135 U7 boot-order lesson: ui-core.js is a static
// <script> tag that can execute before state.js, which defines RobcoEvents,
// finishes its dynamic context-conditional load; a top-level .on() call here
// would throw "RobcoEvents is not defined" on some boots).
function _wireChassisCoreEventBusSubscribers() {
  // #1/#4/#5/#7 idle/standby/shutdown/boot — every Ambient Runtime
  // transition already broadcasts here (runtime.js _emit()).
  RobcoEvents.on('runtime.state', () => _coreRefresh());
  // #8 level-up flare — the SAME event nativeLevelUp() already emits.
  RobcoEvents.on('level.up', () => _coreFlare());
  // #9 save/sync write-pulse — emitted by saveToSlot() (ui-saves.js) and
  // saveCurrentToCloud()/loadCloudSave()/overwriteCloudSave() (cloud.js).
  RobcoEvents.on('data.write', () => _coreDataPulse());
  // #14 3D ring burst on a real stat change — level-up IS a stat change (in
  // addition to its own heart flare above), plus every genuine SPECIAL/
  // skill/HP/XP/RAD edit via the new 'stat.change' event.
  RobcoEvents.on('level.up', () => _coreStatBurst());
  RobcoEvents.on('stat.change', () => _coreStatBurst());
  // #4 Power-surge ripple — the SAME data.write/level.up signals above, plus
  // the reconnect edge detected separately inside _coreRefresh() itself
  // (Protocol 22 — reuses existing signals, never a new trigger).
  RobcoEvents.on('level.up', () => _coreRipple());
  RobcoEvents.on('data.write', () => _coreRipple());
}
// ── CHASSIS CORE END ────────────────────────────────────────────────────
