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
  typing: localStorage.getItem('robco_sfx_muted') === 'true',
  hum: localStorage.getItem('robco_hum_muted') === 'true',
  geiger: localStorage.getItem('robco_geiger_muted') === 'true',
  tinnitus: localStorage.getItem('robco_tinnitus_muted') === 'true',
  ambient: localStorage.getItem('robco_ambient_muted') === 'true',
  wake: localStorage.getItem('robco_wake_muted') === 'true',
  panelClick: localStorage.getItem('robco_panelclick_muted') === 'true', // H1: rotary dial clicks
  bootDrone: localStorage.getItem('robco_bootdrone_muted') === 'true', // H4-bonus: boot drone
  levelUp: localStorage.getItem('robco_levelup_muted') === 'true', // H3: level up jingle
  heartbeat: localStorage.getItem('robco_heartbeat_muted') === 'true', // H4: low health heartbeat
  questComplete: localStorage.getItem('robco_questcomplete_muted') === 'true', // quest complete chime
  questFail: localStorage.getItem('robco_questfail_muted') === 'true', // quest fail tone
  factionThreshold: localStorage.getItem('robco_factionthreshold_muted') === 'true', // faction standing alert
  // WU-F5 Pip-Boy Radio: ON semantics (true = playing), NOT a mute flag. Default
  // OFF (opt-in). initRadio() does the autoplay-safe first-gesture restore at boot;
  // this initialiser just reflects the saved preference into the cache.
  radio: localStorage.getItem('robco_radio_on') === 'true',
  masterMute: localStorage.getItem('robco_master_muted') === 'true',
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
  return localStorage.getItem(WAKE_LOCK_KEY) === 'true';
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
  localStorage.setItem(WAKE_LOCK_KEY, enabled ? 'true' : 'false');
  if (enabled) await _acquireWakeLock();
  else await _releaseWakeLock();
  _updateWakeLockUI();
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
let _overseerFlushTimer = null;
let _overseerBooted = false;
function _readOverseerLog() {
  const num = v => (typeof v === 'number' && isFinite(v) && v >= 0 ? v : 0);
  try {
    const o = JSON.parse(localStorage.getItem(OVERSEER_LOG_KEY) || '{}');
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
    localStorage.setItem(OVERSEER_LOG_KEY, JSON.stringify(o));
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
  if (!_overseerFlushTimer) {
    _overseerFlushTimer = setInterval(() => {
      _flushOverseerLog();
      renderOverseerLog();
    }, 30000);
  }
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
  return localStorage.getItem(HIGH_LUMEN_KEY) === 'true';
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
  localStorage.setItem(HIGH_LUMEN_KEY, enabled ? 'true' : 'false');
  _applyHighLumen(enabled);
  _updateHighLumenUI();
}
function initHighLumen() {
  const toggle = document.getElementById('highLumenToggle');
  const enabled = isHighLumenEnabled();
  if (toggle) toggle.checked = enabled;
  _applyHighLumen(enabled);
  _updateHighLumenUI();
}

// ── CLIENT ERROR RING-BUFFER ──────────────────────────────────
// Local-only diagnostic log — never transmitted. Cap 50 entries × 300 chars ≈ 15 KB max.
const ERROR_LOG_KEY = 'robco_error_log';
const ERROR_LOG_CAP = 50;
let _sysModalTrigger = null;
function _recordError(type, msg) {
  try {
    const log = JSON.parse(localStorage.getItem(ERROR_LOG_KEY) || '[]');
    log.push({ t: Date.now(), type, msg: String(msg).slice(0, 300) });
    while (log.length > ERROR_LOG_CAP) log.shift();
    localStorage.setItem(ERROR_LOG_KEY, JSON.stringify(log));
  } catch (_) {} // never let logging throw
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

window.onload = function () {
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

  if (localStorage.getItem('robco_gemini_key')) {
    document.getElementById('apiKeyInput').value = localStorage.getItem('robco_gemini_key');
  }
  if (localStorage.getItem('robco_gemini_key_sync') === 'true') {
    const syncEl = document.getElementById('geminiKeySyncToggle');
    if (syncEl) syncEl.checked = true;
  }
  if (localStorage.getItem('robco_gemini_model')) {
    let savedModel = localStorage.getItem('robco_gemini_model');
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
  loadUI();
  initTabs(); // Phase 4: restore active tab (defaults to 'stat' on first load)
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
  initRadio(); // WU-F5: restore the Pip-Boy Radio preference (autoplay-safe first-gesture arm)

  // H1: Rotary Dial Click — fire on any <details> panel toggle inside uiPanel
  const _uiPanel = document.getElementById('uiPanel');
  if (_uiPanel) {
    _uiPanel.addEventListener('toggle', () => playPanelClick(), true);
  }

  // ── TAB STANDBY MODE ───────────────────────────────────────────
  // enterStandby/exitStandby are shared so blur+visibilitychange
  // can both fire without doubling the wake tone or log message.
  let _standbyActive = false;
  let _uptimeInterval = null;
  let _memCycleInterval = null;

  // Shared interval starters (DUP-3/DUP-4). Both the boot path and exitStandby()
  // restart these after standby clears them; the guard keeps a double-call from
  // ever stacking a second timer.
  function _startUptimeClock() {
    if (_uptimeInterval) return;
    _uptimeInterval = setInterval(() => {
      let elapsed = Math.floor((Date.now() - sessionStart) / 1000);
      let h = Math.floor(elapsed / 3600),
        m = Math.floor((elapsed % 3600) / 60),
        s = elapsed % 60;
      let el = document.getElementById('uptimeClock');
      if (el)
        el.innerText = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
    }, 1000);
  }
  function _startMemCycle() {
    if (_memCycleInterval) return;
    _memCycleInterval = setInterval(() => {
      appendToChat('> MEMORY CYCLE COMPLETE. 64K STABLE.', 'sys', true);
      document.body.style.filter = 'brightness(0.35)';
      setTimeout(() => {
        document.body.style.filter = '';
      }, 150);
    }, 900000);
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
    clearInterval(_uptimeInterval);
    _uptimeInterval = null;
    clearInterval(_memCycleInterval);
    _memCycleInterval = null;
    stopHeartbeat();
  }

  function exitStandby() {
    if (!_standbyActive) return;
    _standbyActive = false;
    playWakeTone();
    setTimeout(() => {
      document.body.classList.remove('standby');
      if (crtHumGain) {
        crtHumGain.gain.cancelScheduledValues(audioCtx.currentTime);
        crtHumGain.gain.linearRampToValueAtTime(0.007, audioCtx.currentTime + 0.5);
      }
      appendToChat('> COURIER RETURNED. SYNCHRONIZING TELEMETRY...', 'sys', true);
      let _rads = parseInt(document.getElementById('stat_rads').value) || 0;
      setGeigerRate(_rads >= 1000 ? 25 : _rads >= 600 ? 12 : _rads >= 200 ? 0.33 : 0);
      _startUptimeClock();
      _startMemCycle();
      updateMath();
    }, 650);
  }

  // blur fires while the tab is still compositing — best chance to see the dim on tab-out
  window.addEventListener('blur', enterStandby);
  window.addEventListener('focus', exitStandby);
  // visibilitychange is the reliable fallback (keyboard tab-switch, mobile, etc.)
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) enterStandby();
    else exitStandby();
  });

  // #35 Panel Memory — restore previously open/closed panel states
  // On desktop, default-open still applies if no saved state exists
  const savedPanelState = JSON.parse(localStorage.getItem('robco_panel_state') || 'null');
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
    } else if (window.innerWidth >= 1000) {
      d.setAttribute('open', '');
    }
    d.addEventListener('toggle', () => {
      const ps = JSON.parse(localStorage.getItem('robco_panel_state') || '{}');
      ps[id] = d.open;
      localStorage.setItem('robco_panel_state', JSON.stringify(ps));
      if (d.id === 'worldMapPanel' && d.open && typeof renderWorldMap === 'function')
        renderWorldMap();
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
        const ps = JSON.parse(localStorage.getItem('robco_panel_state') || '{}');
        ps[id] = d.open;
        localStorage.setItem('robco_panel_state', JSON.stringify(ps));
      } catch (_) {}
    });
  });

  if (localStorage.getItem('robco_optics')) {
    let color = localStorage.getItem('robco_optics');
    document.getElementById('opticsColorInput').value = color;
    changeOpticsColor(color);
  }

  if (localStorage.getItem('robco_sfx_muted') === 'true') {
    let el = document.getElementById('muteTypingToggle');
    if (el) el.checked = true;
  }
  if (localStorage.getItem('robco_hum_muted') === 'true') {
    let el = document.getElementById('muteHumToggle');
    if (el) el.checked = true;
  }
  if (localStorage.getItem('robco_geiger_muted') === 'true') {
    let el = document.getElementById('muteGeigerToggle');
    if (el) el.checked = true;
  }
  if (localStorage.getItem('robco_tinnitus_muted') === 'true') {
    let el = document.getElementById('muteTinnitusToggle');
    if (el) el.checked = true;
  }
  if (localStorage.getItem('robco_ambient_muted') === 'true') {
    let el = document.getElementById('muteLimbToggle');
    if (el) el.checked = true;
  }
  if (localStorage.getItem('robco_wake_muted') === 'true') {
    let el = document.getElementById('muteWakeToggle');
    if (el) el.checked = true;
  }
  if (localStorage.getItem('robco_questcomplete_muted') === 'true') {
    let el = document.getElementById('muteQuestCompleteToggle');
    if (el) el.checked = true;
  }
  if (localStorage.getItem('robco_questfail_muted') === 'true') {
    let el = document.getElementById('muteQuestFailToggle');
    if (el) el.checked = true;
  }
  if (localStorage.getItem('robco_factionthreshold_muted') === 'true') {
    let el = document.getElementById('muteFactionThresholdToggle');
    if (el) el.checked = true;
  }
  // Master mute restore
  if (localStorage.getItem('robco_master_muted') === 'true') {
    let el = document.getElementById('masterMuteToggle');
    if (el) el.checked = true;
  }
  // Silently refresh model list 2s after boot if key is present
  if (localStorage.getItem('robco_gemini_key')) {
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
    const savedSpeed = parseFloat(localStorage.getItem('robco_typer_speed') || '1');
    const slider = document.getElementById('typerSpeedSlider');
    const label = document.getElementById('typerSpeedVal');
    if (slider) slider.value = savedSpeed;
    if (label) label.textContent = savedSpeed.toFixed(2) + '\u00d7';
  }

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
          const ps = JSON.parse(localStorage.getItem('robco_panel_state') || '{}');
          if (target.dataset.panelId) {
            ps[target.dataset.panelId] = target.open;
            localStorage.setItem('robco_panel_state', JSON.stringify(ps));
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
        if (e.key === '1') {
          e.preventDefault();
          switchTab('stat');
        } else if (e.key === '2') {
          e.preventDefault();
          switchTab('inv');
        } else if (e.key === '3') {
          e.preventDefault();
          switchTab('data');
        } else if (e.key === '4') {
          e.preventDefault();
          switchTab('campg');
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

  // Defer changelog display until after boot sequence completes
  let needsChangelog = false;
  if (localStorage.getItem('robco_version') !== APP_VERSION) {
    localStorage.setItem('robco_version', APP_VERSION);
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

  // Session Uptime Clock + Memory Cycle Event (every 15 minutes) — shared starters (DUP-3/4)
  let sessionStart = Date.now();
  _startUptimeClock();
  _startMemCycle();

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

  routeLaunchShortcut(); // PWA shortcut deep-link routing — must run last, after initTabs
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
      alert(
        '>> CANNOT SWAP TO MELEE ONLY: Save state contains restricted perks (Educated/Dead Weight).'
      );
      document.getElementById('playstyleInput').value =
        localStorage.getItem('robco_playstyle') || 'any';
      return;
    }
  }
  localStorage.setItem('robco_playstyle', style);
  if (typeof window._invalidateCommCache === 'function') window._invalidateCommCache();
}

function onGameContextChange(ctx) {
  if (!GAME_DEFS[ctx]) return;
  if (!window.robco_v8) window.robco_v8 = { activeContext: 'FNV', campaigns: {} };
  window.robco_v8.campaigns[state.gameContext] = JSON.parse(JSON.stringify(state));
  window.robco_v8.activeContext = ctx;
  state.gameContext = ctx;
  window._contextSwitching = true;
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

function switchTab(tab) {
  if (!TAB_NAMES.includes(tab)) return;
  playPanelClick(); // H1: rotary dial click on tab switch
  // Show panels for the active tab, hide others
  document.querySelectorAll('.panel[data-tab]').forEach(el => {
    if (el.dataset.tab === tab) {
      el.classList.add('tab-visible');
    } else {
      el.classList.remove('tab-visible');
    }
  });
  // Update button active states
  TAB_NAMES.forEach(t => {
    const btn = document.getElementById('tab-btn-' + t);
    if (btn) btn.classList.toggle('active', t === tab);
  });
  // Store active tab so page reload restores it
  try {
    localStorage.setItem('robco_active_tab', tab);
  } catch (_) {}
  // Re-render world map when switching to the DATA tab so it measures real panel width
  if (tab === 'data' && typeof renderWorldMap === 'function') renderWorldMap();
}

// Initialize tab on page load (restores last used tab, defaults to 'stat')
function initTabs() {
  let tab = 'stat';
  try {
    const saved = localStorage.getItem('robco_active_tab');
    if (saved && TAB_NAMES.includes(saved)) tab = saved;
  } catch (_) {}
  switchTab(tab);
}

// PWA app-shortcut deep-link routes. Keys are the only accepted #go= values (allow-list).
const SHORTCUT_ROUTES = {
  comm: () => {
    const i = document.getElementById('chatInput');
    if (i) {
      i.scrollIntoView({ block: 'center' });
      i.focus();
    }
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

// Called by #stat_loc onchange: persists the new location and re-renders so the
// current-zone highlight updates. View preference (state.mapView) is kept as-is.
function onLocationChange() {
  // Fog-of-war: the place we're leaving stays discovered, and the new place becomes
  // discovered too — so the previous location shows [VISITED] (not [UNKNOWN]) once the
  // Courier moves on. Capture the old location BEFORE syncStateFromDom() overwrites
  // state.loc with the new #stat_loc value, then record both via the shared helper.
  // saveState() persists the updated locationHistory in the same (debounced) write;
  // cloud sync stays manual (no auto-push).
  const prevLoc = state.loc;
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
    const ps = JSON.parse(localStorage.getItem('robco_panel_state') || '{}');
    if (details.dataset.panelId) {
      ps[details.dataset.panelId] = true;
      localStorage.setItem('robco_panel_state', JSON.stringify(ps));
    }
  }
  // For ammo, also open the nested ammo sub-panel
  if (categoryKey === 'ammo') {
    const subPanel = document.getElementById('ammoSubPanel');
    if (subPanel && !subPanel.open) subPanel.setAttribute('open', '');
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
    _openSysModal();
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
  _openSysModal();
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
      _openSysModal();
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
}

function showErrorLog() {
  const modal = document.getElementById('sysModal');
  const title = document.getElementById('modalTitle');
  const content = document.getElementById('modalContent');
  if (!modal || !title || !content) return;
  title.innerText = '> CLIENT ERROR LOG';
  let log = [];
  try {
    log = JSON.parse(localStorage.getItem(ERROR_LOG_KEY) || '[]');
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
      'onclick="localStorage.removeItem(\'' +
      ERROR_LOG_KEY +
      '\');showErrorLog()">' +
      'CLEAR LOGS</button></div>';
  }
  _openSysModal();
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
  _openSysModal();
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
      { cmd: '[TIMELINE]', desc: 'Projected narrative timeline.' },
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
  _openSysModal();
}

// SAVE & DATA field manual — diegetic, game-agnostic copy (Protocol 38: no
// game-specific literals; describes the save mechanics generically). Each save
// action exposed by the SAVE MENU is documented here so the "?" affordance can
// explain the whole panel. Rendered into the shared sysModal so it inherits the
// WU-C4 focus-trap + ARIA dialog semantics for free.
const SAVE_HELP = [
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
  _openSysModal();
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
  // switchTab('data') at ui-core.js:891 re-renders when the user switches to it).
  if (document.getElementById('tab-btn-data')?.classList.contains('active')) {
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
    })
  )
    renderCampaignStatus(); // v2.0.1: Campaign Status + Crossroads Record
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
    // Flash red when HP drops into critical territory
    if (_lastHpPct !== null && _lastHpPct > 25 && pct <= 25) {
      document.body.classList.remove('crit-hp-flash');
      void document.body.offsetWidth;
      document.body.classList.add('crit-hp-flash');
      setTimeout(() => document.body.classList.remove('crit-hp-flash'), 750);
      // WU-F2: one-shot chassis buzz on the critical-HP crossing (mirrors the flash)
      if (typeof triggerHaptic === 'function') triggerHaptic('lowhealth');
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
  const speedMult = parseFloat(localStorage.getItem('robco_typer_speed') || '1');
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
      }
    }
    typeWriter();
  } else {
    msgDiv.innerHTML = fullHtml;
    chatBox.scrollTop = chatBox.scrollHeight;
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

function clearChat() {
  if (confirm('Purge Comm-Link history? This cannot be undone.')) {
    chatHistory = [];
    localStorage.removeItem('robco_chat');
    document.getElementById('chatDisplay').innerHTML = '';
    appendToChat('> SYSTEM LOGS PURGED. AWAITING COURIER INPUT...', 'sys', true);
  }
}

// ── F6: WIPE TERMINAL — NEW CAMPAIGN ────────────────────────────────
// Double-confirmation wipe: resets state to defaults, clears chat history,
// re-presents game context selection screen.
function wipeTerminal() {
  if (
    !confirm(
      '> WIPE TERMINAL\n\nThis will erase ALL Courier data:\n- SPECIAL / Skills / Perks / Quests\n- Inventory / Factions / Status Effects\n- Campaign Notes / Collectibles / Squad\n- Chat History / Session Statistics\n\nSave slots are preserved.\n\nThis CANNOT be undone. Continue?'
    )
  )
    return;
  if (
    !confirm(
      '> FINAL CONFIRMATION\n\nAre you absolutely certain?\nType OK to confirm terminal wipe.\n\nThis will destroy all unsaved progress.'
    )
  )
    return;

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
  Object.values(GAME_DEFS).forEach(d => {
    appendToChat(`> Type [CONTEXT: ${d.id}] for ${d.label}`, 'sys', true);
  });
  appendToChat('> Or the AI will detect your game automatically.', 'sys', true);
}

// ── SAVE SLOTS (#6) ────────────────────────────────────────────────
// 3 named slots (A/B/C) stored as robco_slot_1/2/3 in localStorage.
// Each slot stores the full envelope {version, state, chat, playstyle, savedAt, slotName}.
