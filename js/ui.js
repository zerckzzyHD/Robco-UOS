let attachedImageData = null;
let attachedImageMimeType = null;

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
  masterMute: localStorage.getItem('robco_master_muted') === 'true',
};

// ── GLOBAL ERROR NET ──────────────────────────────────────────
// Catches uncaught JS errors and unhandled promise rejections and surfaces a
// recoverable on-screen diagnostic instead of leaving the user with a blank screen.
window.addEventListener('error', ev => {
  const msg =
    (ev.message || 'Unknown error') + (ev.filename ? ` [${ev.filename}:${ev.lineno}]` : '');
  console.error('[RobCo] Uncaught error:', msg, ev.error);
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

// The Mechanical Audio Synth (Procedural, no files required)
// Lazily created on first user gesture to comply with Chrome's autoplay policy.
// Before any user interaction, audioCtx is null and all audio functions early-return.
let audioCtx = null;
function ensureAudioCtx() {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }
  if (audioCtx.state === 'suspended') audioCtx.resume();
  return audioCtx;
}
function playClack() {
  if (AudioSettings.masterMute || AudioSettings.typing) return;
  ensureAudioCtx();
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.type = 'square';
  osc.frequency.setValueAtTime(100 + Math.random() * 50, audioCtx.currentTime);
  osc.frequency.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.05);
  gain.gain.setValueAtTime(0.05, audioCtx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.05);
  osc.connect(gain);
  gain.connect(audioCtx.destination);
  osc.start();
  osc.stop(audioCtx.currentTime + 0.05);
}

// ── GEIGER COUNTER ─────────────────────────────────────────────
let geigerRunning = false,
  geigerTimeout = null,
  _geigerCurrentRate = -1;

function playGeigerClick() {
  if (AudioSettings.masterMute || AudioSettings.geiger) return;
  ensureAudioCtx();
  const bufSize = Math.floor(audioCtx.sampleRate * 0.003);
  const buf = audioCtx.createBuffer(1, bufSize, audioCtx.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < bufSize; i++) data[i] = Math.random() * 2 - 1;
  const src = audioCtx.createBufferSource();
  src.buffer = buf;
  const bpf = audioCtx.createBiquadFilter();
  bpf.type = 'bandpass';
  bpf.frequency.value = 2200;
  bpf.Q.value = 0.5;
  const g = audioCtx.createGain();
  g.gain.setValueAtTime(0.25, audioCtx.currentTime);
  g.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.003);
  src.connect(bpf);
  bpf.connect(g);
  g.connect(audioCtx.destination);
  src.start();
  src.stop(audioCtx.currentTime + 0.004);
}

function scheduleGeiger(rate) {
  if (!geigerRunning) return;
  geigerTimeout = setTimeout(
    () => {
      playGeigerClick();
      scheduleGeiger(rate);
    },
    Math.max(20, (-Math.log(Math.random()) / rate) * 1000)
  );
}

function setGeigerRate(rate) {
  if (rate === _geigerCurrentRate) return;
  _geigerCurrentRate = rate;
  geigerRunning = false;
  if (geigerTimeout) {
    clearTimeout(geigerTimeout);
    geigerTimeout = null;
  }
  if (rate > 0) {
    geigerRunning = true;
    scheduleGeiger(rate);
  }
}

// ── TINNITUS ───────────────────────────────────────────────────
let tinnitusNode = null,
  tinnitusGain = null,
  tinnitusTimeout = null;

function startTinnitus() {
  if (tinnitusNode || AudioSettings.masterMute || AudioSettings.tinnitus) return;
  ensureAudioCtx();
  tinnitusNode = audioCtx.createOscillator();
  tinnitusGain = audioCtx.createGain();
  tinnitusNode.type = 'sine';
  tinnitusNode.frequency.value = 5200;
  tinnitusGain.gain.value = 0.0001;
  tinnitusNode.connect(tinnitusGain);
  tinnitusGain.connect(audioCtx.destination);
  tinnitusNode.start();
  function swell() {
    if (!tinnitusGain) return;
    tinnitusGain.gain.cancelScheduledValues(audioCtx.currentTime);
    tinnitusGain.gain.setValueAtTime(0.0001, audioCtx.currentTime);
    tinnitusGain.gain.linearRampToValueAtTime(0.0028, audioCtx.currentTime + 1.5);
    tinnitusGain.gain.linearRampToValueAtTime(0.0001, audioCtx.currentTime + 3.5);
    tinnitusTimeout = setTimeout(swell, 12000 + Math.random() * 20000);
  }
  tinnitusTimeout = setTimeout(swell, 6000 + Math.random() * 8000);
}

function stopTinnitus() {
  if (tinnitusTimeout) {
    clearTimeout(tinnitusTimeout);
    tinnitusTimeout = null;
  }
  if (tinnitusNode) {
    try {
      tinnitusNode.stop();
    } catch (e) {}
    tinnitusNode.disconnect();
    tinnitusNode = null;
  }
  if (tinnitusGain) {
    tinnitusGain.disconnect();
    tinnitusGain = null;
  }
}

// ── CRT HUM ────────────────────────────────────────────────────
let crtHumNode = null,
  crtHumGain = null,
  crtHumLfo = null,
  crtHumLfoGain = null;

function startCrtHum() {
  if (crtHumNode || AudioSettings.masterMute || AudioSettings.hum) return;
  ensureAudioCtx();
  crtHumNode = audioCtx.createOscillator();
  crtHumGain = audioCtx.createGain();
  crtHumLfo = audioCtx.createOscillator();
  crtHumLfoGain = audioCtx.createGain();
  crtHumNode.type = 'sine';
  crtHumNode.frequency.value = 60;
  crtHumGain.gain.value = 0.007;
  crtHumLfo.type = 'sine';
  crtHumLfo.frequency.value = 0.08;
  crtHumLfoGain.gain.value = 1.2;
  crtHumLfo.connect(crtHumLfoGain);
  crtHumLfoGain.connect(crtHumNode.frequency);
  crtHumNode.connect(crtHumGain);
  crtHumGain.connect(audioCtx.destination);
  crtHumNode.start();
  crtHumLfo.start();
}

function setCrtHumIntensity(rads, hasCrippled) {
  if (!crtHumGain || !crtHumNode || !audioCtx) return;
  let targetFreq = rads >= 600 ? 82 : 60;
  let targetGain = rads >= 600 ? 0.014 : 0.007;
  if (hasCrippled) targetGain *= 0.4;
  crtHumNode.frequency.cancelScheduledValues(audioCtx.currentTime);
  crtHumNode.frequency.linearRampToValueAtTime(targetFreq, audioCtx.currentTime + 2);
  crtHumGain.gain.cancelScheduledValues(audioCtx.currentTime);
  crtHumGain.gain.linearRampToValueAtTime(targetGain, audioCtx.currentTime + 1);
}

// ── H2: THERMAL LOAD PITCH SHIFT ───────────────────────────────
// During API call: hum shifts 60Hz→80Hz over 5s, gain +20%.
// On return: snaps back to 60Hz over 0.5s. No new AudioSettings key.
function startThermalLoad() {
  if (!crtHumNode || !crtHumGain || !audioCtx) return;
  if (AudioSettings.masterMute || AudioSettings.hum) return;
  crtHumNode.frequency.cancelScheduledValues(audioCtx.currentTime);
  crtHumNode.frequency.linearRampToValueAtTime(80, audioCtx.currentTime + 5);
  crtHumGain.gain.cancelScheduledValues(audioCtx.currentTime);
  crtHumGain.gain.linearRampToValueAtTime(0.0084, audioCtx.currentTime + 3); // +20%
}

function stopThermalLoad() {
  if (!crtHumNode || !crtHumGain || !audioCtx) return;
  const rads = parseInt((document.getElementById('stat_rads') || {}).value) || 0;
  const baseFreq = rads >= 600 ? 82 : 60;
  const baseGain = rads >= 600 ? 0.014 : 0.007;
  crtHumNode.frequency.cancelScheduledValues(audioCtx.currentTime);
  crtHumNode.frequency.linearRampToValueAtTime(baseFreq, audioCtx.currentTime + 0.5);
  crtHumGain.gain.cancelScheduledValues(audioCtx.currentTime);
  crtHumGain.gain.linearRampToValueAtTime(baseGain, audioCtx.currentTime + 0.5);
}

// ── LIMB TRAUMA SOUNDS ─────────────────────────────────────────
function playLimbCrippleSound(limb) {
  if (AudioSettings.masterMute || AudioSettings.ambient) return;
  ensureAudioCtx();
  const isArm = limb === 'la' || limb === 'ra';
  const osc = audioCtx.createOscillator();
  const g = audioCtx.createGain();
  if (isArm) {
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(380, audioCtx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(60, audioCtx.currentTime + 0.08);
    g.gain.setValueAtTime(0.18, audioCtx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.09);
  } else {
    osc.type = 'sine';
    osc.frequency.setValueAtTime(75, audioCtx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(30, audioCtx.currentTime + 0.12);
    g.gain.setValueAtTime(0.3, audioCtx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.13);
  }
  osc.connect(g);
  g.connect(audioCtx.destination);
  osc.start();
  osc.stop(audioCtx.currentTime + 0.15);
}

function playLimbRestoreSound() {
  if (AudioSettings.masterMute || AudioSettings.ambient) return;
  ensureAudioCtx();
  [440, 880, 1760].forEach((freq, i) => {
    setTimeout(() => {
      const osc = audioCtx.createOscillator();
      const g = audioCtx.createGain();
      osc.type = 'sine';
      osc.frequency.value = freq;
      g.gain.setValueAtTime(0.06, audioCtx.currentTime);
      g.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.1);
      osc.connect(g);
      g.connect(audioCtx.destination);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.12);
    }, i * 130);
  });
}

function playHeadCrippleSound() {
  if (AudioSettings.masterMute || AudioSettings.ambient) return;
  ensureAudioCtx();
  // Concussive thud
  const osc1 = audioCtx.createOscillator();
  const g1 = audioCtx.createGain();
  osc1.type = 'triangle';
  osc1.frequency.setValueAtTime(550, audioCtx.currentTime);
  osc1.frequency.exponentialRampToValueAtTime(40, audioCtx.currentTime + 0.1);
  g1.gain.setValueAtTime(0.3, audioCtx.currentTime);
  g1.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.12);
  osc1.connect(g1);
  g1.connect(audioCtx.destination);
  osc1.start();
  osc1.stop(audioCtx.currentTime + 0.15);
  // High-frequency concussion ring
  const osc2 = audioCtx.createOscillator();
  const g2 = audioCtx.createGain();
  osc2.type = 'sine';
  osc2.frequency.setValueAtTime(3800, audioCtx.currentTime + 0.05);
  g2.gain.setValueAtTime(0, audioCtx.currentTime);
  g2.gain.setValueAtTime(0.04, audioCtx.currentTime + 0.05);
  g2.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.5);
  osc2.connect(g2);
  g2.connect(audioCtx.destination);
  osc2.start();
  osc2.stop(audioCtx.currentTime + 0.55);
}

// ── WAKE TONE (Tab Standby) ────────────────────────────────────
function playWakeTone() {
  if (AudioSettings.masterMute || AudioSettings.wake) return; // Separate mute from limb SFX
  ensureAudioCtx();
  [220, 440, 880].forEach((freq, i) => {
    setTimeout(() => {
      const osc = audioCtx.createOscillator();
      const g = audioCtx.createGain();
      osc.type = 'square';
      osc.frequency.value = freq;
      g.gain.setValueAtTime(0.04, audioCtx.currentTime);
      g.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.07);
      osc.connect(g);
      g.connect(audioCtx.destination);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.08);
    }, i * 80);
  });
}

// ── SYNC COMPLETE TONE (Feature #33) ──────────────────────────
// A subtle two-note confirmation tone played when AI sync completes.
// Respects master mute and the typing SFX mute (closest semantic match).
function playSyncTone() {
  if (AudioSettings.masterMute || AudioSettings.typing) return;
  ensureAudioCtx();
  [
    [880, 0],
    [1320, 0.08],
  ].forEach(([freq, delay]) => {
    setTimeout(() => {
      const osc = audioCtx.createOscillator();
      const g = audioCtx.createGain();
      osc.type = 'sine';
      osc.frequency.value = freq;
      g.gain.setValueAtTime(0.03, audioCtx.currentTime);
      g.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.12);
      osc.connect(g);
      g.connect(audioCtx.destination);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.14);
    }, delay * 1000);
  });
  // Visual sync flash
  document.body.classList.remove('sync-complete');
  void document.body.offsetWidth;
  document.body.classList.add('sync-complete');
  setTimeout(() => document.body.classList.remove('sync-complete'), 450);
}

// ── STAT DELTA GHOST ───────────────────────────────────────────
function showDeltaGhost(fieldId, oldVal, newVal) {
  if (oldVal === newVal) return;
  const el = document.getElementById(fieldId);
  if (!el) return;
  const ghost = document.createElement('span');
  ghost.className = 'delta-ghost';
  ghost.textContent = oldVal;
  const rect = el.getBoundingClientRect();
  ghost.style.left = rect.left + 'px';
  ghost.style.top = rect.top + 'px';
  ghost.style.width = rect.width + 'px';
  document.body.appendChild(ghost);
  setTimeout(() => {
    if (ghost.parentNode) ghost.parentNode.removeChild(ghost);
  }, 900);
}

window.onload = function () {
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
  if (localStorage.getItem('robco_gemini_model')) {
    let savedModel = localStorage.getItem('robco_gemini_model');
    document.getElementById('apiModelInput').innerHTML =
      `<option value="${savedModel}">${savedModel} (Secured)</option>`;
  }
  if (localStorage.getItem('robco_courier_id')) {
    let courierInput = document.getElementById('courierIdInput');
    if (courierInput) courierInput.value = localStorage.getItem('robco_courier_id');
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

  // H1: Rotary Dial Click — fire on any <details> panel toggle inside uiPanel
  const _uiPanel = document.getElementById('uiPanel');
  if (_uiPanel) {
    _uiPanel.addEventListener('toggle', () => playPanelClick(), true);
  }

  // ── TAB STANDBY MODE ───────────────────────────────────────────
  // enterStandby/exitStandby are shared so blur+visibilitychange
  // can both fire without doubling the wake tone or log message.
  let _standbyActive = false;

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
          const entries = text.split(/\r?\n(?=## \[v\d+\.\d+)/);
          const latestEntry = entries[0] || text;
          document.getElementById('modalTitle').innerText = `> PATCH NOTES: ${APP_VERSION}`;
          document.getElementById('modalContent').innerText = latestEntry.trim();
          document.getElementById('sysModal').style.display = 'flex';
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

    if (window._lastStateBeforeSync || localStorage.getItem('robco_backup')) {
      let undoBtn = document.getElementById('undoSyncBtn');
      if (undoBtn) undoBtn.style.display = 'block';
    }
  });

  // Session Uptime Clock
  let sessionStart = Date.now();
  setInterval(() => {
    let elapsed = Math.floor((Date.now() - sessionStart) / 1000);
    let h = Math.floor(elapsed / 3600),
      m = Math.floor((elapsed % 3600) / 60),
      s = elapsed % 60;
    let el = document.getElementById('uptimeClock');
    if (el)
      el.innerText = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  }, 1000);

  // Memory Cycle Event (every 15 minutes)
  setInterval(() => {
    appendToChat('> MEMORY CYCLE COMPLETE. 64K STABLE.', 'sys', true);
    document.body.style.filter = 'brightness(0.35)';
    setTimeout(() => {
      document.body.style.filter = '';
    }, 150);
  }, 900000);

  // #36 Input History — Up/Down arrows cycle through sent user commands
  const _inputHistory = [];
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
    localStorage.setItem('robco_v7', JSON.stringify(state));
  });
};

function changeOpticsColor(color) {
  let root = document.documentElement;
  if (color === 'amber') {
    root.style.setProperty('--robco-green', '#ffb642');
    root.style.setProperty('--robco-glow', '0 0 6px rgba(255, 182, 66, 0.6)');
    root.style.setProperty('--robco-dark', '#2e1d03');
    root.style.setProperty('--robco-refresh', 'rgba(255, 182, 66, 0.12)');
  } else if (color === 'blue') {
    root.style.setProperty('--robco-green', '#42cbf5');
    root.style.setProperty('--robco-glow', '0 0 6px rgba(66, 203, 245, 0.6)');
    root.style.setProperty('--robco-dark', '#03202e');
    root.style.setProperty('--robco-refresh', 'rgba(66, 203, 245, 0.12)');
  } else if (color === 'legion') {
    root.style.setProperty('--robco-green', '#ff4040');
    root.style.setProperty('--robco-glow', '0 0 6px rgba(255, 64, 64, 0.6)');
    root.style.setProperty('--robco-dark', '#2a0000');
    root.style.setProperty('--robco-refresh', 'rgba(255, 64, 64, 0.12)');
  } else if (color === 'ghoul') {
    root.style.setProperty('--robco-green', '#7dff5f');
    root.style.setProperty('--robco-glow', '0 0 6px rgba(125, 255, 95, 0.6)');
    root.style.setProperty('--robco-dark', '#0a1e03');
    root.style.setProperty('--robco-refresh', 'rgba(125, 255, 95, 0.12)');
  } else if (color === 'neon') {
    root.style.setProperty('--robco-green', '#c084fc');
    root.style.setProperty('--robco-glow', '0 0 6px rgba(192, 132, 252, 0.6)');
    root.style.setProperty('--robco-dark', '#1a0329');
    root.style.setProperty('--robco-refresh', 'rgba(192, 132, 252, 0.12)');
  } else {
    root.style.setProperty('--robco-green', '#14fdce');
    root.style.setProperty('--robco-glow', '0 0 6px rgba(20, 253, 206, 0.6)');
    root.style.setProperty('--robco-dark', '#021c14');
    root.style.setProperty('--robco-refresh', 'rgba(20, 253, 206, 0.12)');
  }
  localStorage.setItem('robco_optics', color);
}

function toggleAudio(key, isMuted) {
  localStorage.setItem(key, isMuted);
  // Keep in-memory cache in sync so audio functions don't need localStorage reads
  const keyMap = {
    robco_sfx_muted: 'typing',
    robco_hum_muted: 'hum',
    robco_geiger_muted: 'geiger',
    robco_tinnitus_muted: 'tinnitus',
    robco_ambient_muted: 'ambient',
    robco_wake_muted: 'wake',
    robco_panelclick_muted: 'panelClick', // H1
    robco_bootdrone_muted: 'bootDrone', // boot bonus
    robco_levelup_muted: 'levelUp', // H3
    robco_heartbeat_muted: 'heartbeat', // H4
    robco_questcomplete_muted: 'questComplete', // quest complete chime
    robco_questfail_muted: 'questFail', // quest fail tone
    robco_factionthreshold_muted: 'factionThreshold', // faction standing alert
  };
  if (keyMap[key] !== undefined) AudioSettings[keyMap[key]] = isMuted;

  // Immediately stop/start ambient systems based on their specific key
  if (key === 'robco_hum_muted') {
    if (isMuted) {
      if (crtHumGain) {
        crtHumGain.gain.linearRampToValueAtTime(0, audioCtx.currentTime + 0.3);
      }
    } else {
      if (!crtHumNode) {
        startCrtHum();
      } else if (crtHumGain) {
        crtHumGain.gain.linearRampToValueAtTime(0.007, audioCtx.currentTime + 0.3);
      }
    }
  }
  if (key === 'robco_geiger_muted') {
    if (isMuted) {
      geigerRunning = false;
      if (geigerTimeout) {
        clearTimeout(geigerTimeout);
        geigerTimeout = null;
      }
      _geigerCurrentRate = -1;
    } else {
      let rads = parseInt(document.getElementById('stat_rads').value) || 0;
      setGeigerRate(rads >= 1000 ? 25 : rads >= 600 ? 12 : rads >= 200 ? 0.33 : 0);
    }
  }
  if (key === 'robco_tinnitus_muted') {
    if (isMuted) {
      stopTinnitus();
    } else {
      let rads = parseInt(document.getElementById('stat_rads').value) || 0;
      if (rads >= 600) startTinnitus();
    }
  }
}

// ── MASTER MUTE ────────────────────────────────────────────
function toggleMasterMute(isMuted) {
  localStorage.setItem('robco_master_muted', isMuted);
  AudioSettings.masterMute = isMuted;
  if (isMuted) {
    geigerRunning = false;
    if (geigerTimeout) {
      clearTimeout(geigerTimeout);
      geigerTimeout = null;
    }
    _geigerCurrentRate = -1;
    stopTinnitus();
    if (crtHumGain) {
      crtHumGain.gain.linearRampToValueAtTime(0, audioCtx.currentTime + 0.3);
    }
  } else {
    let rads = parseInt(document.getElementById('stat_rads').value) || 0;
    setGeigerRate(rads >= 1000 ? 25 : rads >= 600 ? 12 : rads >= 200 ? 0.33 : 0);
    if (rads >= 600 || state.hd === 'CRIPPLED') startTinnitus();
    if (crtHumGain && !AudioSettings.hum) {
      crtHumGain.gain.linearRampToValueAtTime(0.007, audioCtx.currentTime + 0.3);
    }
  }
}

// ── QUEST COMPLETE CHIME ────────────────────────────────────
// Rising two-note major chord (C5 → E5 → G5), synth arpeggio, ~0.5s decay.
// Fired from autoImportState() when a quest transitions to COMPLETED.
function playQuestCompleteSound() {
  if (AudioSettings.masterMute) return;
  if (AudioSettings.questComplete) return;
  ensureAudioCtx();
  const now = audioCtx.currentTime;
  [523.25, 659.25, 783.99].forEach((freq, i) => {
    const osc = audioCtx.createOscillator();
    const g = audioCtx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, now + i * 0.08);
    g.gain.setValueAtTime(0, now + i * 0.08);
    g.gain.linearRampToValueAtTime(0.09, now + i * 0.08 + 0.02);
    g.gain.exponentialRampToValueAtTime(0.001, now + i * 0.08 + 0.45);
    osc.connect(g);
    g.connect(audioCtx.destination);
    osc.start(now + i * 0.08);
    osc.stop(now + i * 0.08 + 0.5);
  });
}

// ── QUEST FAIL TONE ─────────────────────────────────────────
// Descending minor third (E4 → C4), sawtooth, short stinger.
// Fired from autoImportState() when a quest transitions to FAILED.
function playQuestFailSound() {
  if (AudioSettings.masterMute) return;
  if (AudioSettings.questFail) return;
  ensureAudioCtx();
  const now = audioCtx.currentTime;
  [329.63, 261.63].forEach((freq, i) => {
    const osc = audioCtx.createOscillator();
    const g = audioCtx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(freq, now + i * 0.12);
    g.gain.setValueAtTime(0.07, now + i * 0.12);
    g.gain.exponentialRampToValueAtTime(0.001, now + i * 0.12 + 0.35);
    osc.connect(g);
    g.connect(audioCtx.destination);
    osc.start(now + i * 0.12);
    osc.stop(now + i * 0.12 + 0.4);
  });
}

// ── FACTION THRESHOLD TONE ──────────────────────────────────
// Single sustained square-wave beep tuned to signify a faction standing
// reaching Idolized (high G5) or Vilified (low A2).
// Fired from autoImportState() at faction consequence threshold crossings.
function playFactionThresholdSound(isIdolized) {
  if (AudioSettings.masterMute) return;
  if (AudioSettings.factionThreshold) return;
  ensureAudioCtx();
  const now = audioCtx.currentTime;
  const osc = audioCtx.createOscillator();
  const g = audioCtx.createGain();
  osc.type = 'square';
  osc.frequency.setValueAtTime(isIdolized ? 783.99 : 110, now);
  g.gain.setValueAtTime(0.055, now);
  g.gain.exponentialRampToValueAtTime(0.001, now + (isIdolized ? 0.6 : 0.8));
  osc.connect(g);
  g.connect(audioCtx.destination);
  osc.start(now);
  osc.stop(now + (isIdolized ? 0.65 : 0.85));
}

// ── H1: ROTARY DIAL CLICK ───────────────────────────────────
// Short synthesized click on details toggle and tab switch.
// Square wave ~2000Hz, 15ms decay.
function playPanelClick() {
  if (AudioSettings.masterMute) return;
  if (AudioSettings.panelClick) return;
  ensureAudioCtx();
  const osc = audioCtx.createOscillator();
  const g = audioCtx.createGain();
  osc.type = 'square';
  osc.frequency.setValueAtTime(2000, audioCtx.currentTime);
  g.gain.setValueAtTime(0.035, audioCtx.currentTime);
  g.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.015);
  osc.connect(g);
  g.connect(audioCtx.destination);
  osc.start();
  osc.stop(audioCtx.currentTime + 0.018);
}

// ── H4: BOOT SEQUENCE DRONE ─────────────────────────────────────
// On boot: a startup drone ramping from 30Hz → 60Hz over 2s, then decaying.
// Mimics CRT power-on. Fires once at boot before user gesture, so audioCtx
// might not exist — use setTimeout to attempt after first user touch.
function playBootDrone() {
  if (AudioSettings.masterMute) return;
  if (AudioSettings.bootDrone) return;
  // audioCtx requires user gesture — try immediately (will fail silently if locked)
  function _tryDrone() {
    try {
      ensureAudioCtx();
    } catch (_) {
      return;
    }
    if (!audioCtx) return;
    const osc = audioCtx.createOscillator();
    const g = audioCtx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(30, audioCtx.currentTime);
    osc.frequency.linearRampToValueAtTime(60, audioCtx.currentTime + 2);
    g.gain.setValueAtTime(0.0, audioCtx.currentTime);
    g.gain.linearRampToValueAtTime(0.02, audioCtx.currentTime + 0.5);
    g.gain.setValueAtTime(0.02, audioCtx.currentTime + 1.5);
    g.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + 3);
    osc.connect(g);
    g.connect(audioCtx.destination);
    osc.start();
    osc.stop(audioCtx.currentTime + 3.1);
  }
  // First user interaction triggers audioCtx creation; boot runs before it.
  // Wire to first click/key so drone plays immediately on interaction.
  function _onFirstInteract() {
    _tryDrone();
    document.removeEventListener('click', _onFirstInteract);
    document.removeEventListener('keydown', _onFirstInteract);
  }
  document.addEventListener('click', _onFirstInteract, { once: true });
  document.addEventListener('keydown', _onFirstInteract, { once: true });
}

// ── H3: LEVEL UP JINGLE ──────────────────────────────────────────
// Fired by autoImportState() when state.lvl increases.
// Three-note ascending arpeggio: 440 → 660 → 880Hz (sine, 80ms each).
function playLevelUpJingle() {
  if (AudioSettings.masterMute) return;
  if (AudioSettings.levelUp) return;
  ensureAudioCtx();
  if (!audioCtx) return;
  const notes = [440, 660, 880];
  notes.forEach((freq, i) => {
    const osc = audioCtx.createOscillator();
    const g = audioCtx.createGain();
    osc.type = 'sine';
    osc.frequency.value = freq;
    const t = audioCtx.currentTime + i * 0.1;
    g.gain.setValueAtTime(0.0, t);
    g.gain.linearRampToValueAtTime(0.12, t + 0.01);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.08);
    osc.connect(g);
    g.connect(audioCtx.destination);
    osc.start(t);
    osc.stop(t + 0.1);
  });
}

// ── H4: LOW HEALTH HEARTBEAT ─────────────────────────────────────
// Activates when HP < 25% (checked in updateMath()).
// Sine pulse ~1.2Hz. When concurrent with tinnitus (crippled head),
// tinnitus gain reduces 50%.
let _heartbeatTimer = null;

function startHeartbeat(hpFraction) {
  if (AudioSettings.masterMute) return;
  if (AudioSettings.heartbeat) return;
  if (_heartbeatTimer) return; // already running
  ensureAudioCtx();
  if (!audioCtx) return;
  // Gain proportional to HP deficit: 0 at 25%, max at 0%
  const deficit = 1 - hpFraction / 0.25;
  const gainVal = Math.max(0.01, Math.min(0.06, deficit * 0.06));
  function _beat() {
    if (!audioCtx || AudioSettings.masterMute || AudioSettings.heartbeat) {
      stopHeartbeat();
      return;
    }
    const osc = audioCtx.createOscillator();
    const g = audioCtx.createGain();
    osc.type = 'sine';
    osc.frequency.value = 80;
    g.gain.setValueAtTime(gainVal, audioCtx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.08);
    osc.connect(g);
    g.connect(audioCtx.destination);
    osc.start();
    osc.stop(audioCtx.currentTime + 0.1);
  }
  _beat(); // fire immediately
  _heartbeatTimer = setInterval(_beat, Math.round(1000 / 1.2)); // ~833ms
  // H4: When concurrent with tinnitus, reduce tinnitus gain 50% per spec
  if (tinnitusGain && tinnitusNode && audioCtx) {
    tinnitusGain.gain.linearRampToValueAtTime(
      tinnitusGain.gain.value * 0.5,
      audioCtx.currentTime + 0.5
    );
  }
}

function stopHeartbeat() {
  if (_heartbeatTimer) {
    clearInterval(_heartbeatTimer);
    _heartbeatTimer = null;
    // Restore tinnitus gain if it was reduced
    if (tinnitusGain && tinnitusNode && audioCtx) {
      tinnitusGain.gain.linearRampToValueAtTime(0.0001, audioCtx.currentTime + 0.5);
    }
  }
}

function runBootSequence(onComplete) {
  const bootScreen = document.getElementById('bootScreen');
  if (!bootScreen) {
    if (onComplete) onComplete();
    return;
  }
  const bootLines = document.getElementById('bootLines');
  playBootDrone(); // H4: boot sequence drone
  const lines = [
    '> ROBCO INDUSTRIES (TM) UNIFIED OPERATING SYSTEM',
    '> COPYRIGHT 2075-2077 ROBCO INDUSTRIES',
    '> ─────────────────────────────────────────────',
    '> 64K RAM SYSTEM   |   38911 BYTES FREE',
    '> MEMORY CHECK.................. [OK]',
    '> HARDWARE DIAGNOSTICS.......... [OK]',
    '> LOADING U.O.S. v' + APP_VERSION + '.........',
    '> SECURE LINK ESTABLISHED. BOOTING...',
  ];
  let i = 0;
  const iv = setInterval(() => {
    if (i < lines.length) {
      const el = document.createElement('div');
      el.textContent = lines[i++];
      bootLines.appendChild(el);
    } else {
      clearInterval(iv);
      setTimeout(() => {
        bootScreen.classList.add('boot-fade-out');
        setTimeout(() => {
          bootScreen.style.display = 'none';
          if (onComplete) onComplete();
        }, 400);
      }, 200);
    }
  }, 120);
}

function triggerPhosphorGhost() {
  const fields = document.querySelectorAll(
    'input[type="number"], #display_ap, #display_weight, #karma_label'
  );
  fields.forEach(el => el.classList.remove('phosphor-ghost'));
  void document.body.offsetWidth;
  fields.forEach(el => el.classList.add('phosphor-ghost'));
}

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
}

function onGameContextChange(ctx) {
  if (ctx !== 'FNV' && ctx !== 'FO3') return;
  if (!window.robco_v8) window.robco_v8 = { activeContext: 'FNV', campaigns: {} };
  window.robco_v8.activeContext = ctx;
  window.robco_v8.campaigns[state.gameContext] = JSON.parse(JSON.stringify(state));
  localStorage.setItem('robco_v8', JSON.stringify(window.robco_v8));
  window.location.reload();
}

// ── CAMPAIGN LOG EXPORT ────────────────────────────────────────
// format: 'txt' (default), 'html' (#41), 'md' (#27)
function exportCampaignLog(format = 'txt') {
  if (!chatHistory || chatHistory.length === 0) {
    alert('> ERROR: COMM-LINK LOGS EMPTY.');
    return;
  }

  if (format === 'html') {
    // #41 HTML Campaign Log Export — green-on-black styled HTML matching current optics
    const optics = localStorage.getItem('robco_optics') || 'green';
    const fgMap = {
      green: '#14fdce',
      amber: '#ffb642',
      blue: '#42cbf5',
      legion: '#ff4040',
      ghoul: '#7dff5f',
      neon: '#c084fc',
    };
    const fg = fgMap[optics] || '#14fdce';
    let rows = chatHistory
      .map(msg => {
        let clean = msg.text
          .replace(/<[^>]*>?/gm, '')
          .replace(/```[a-z]*\n?/gi, '')
          .replace(/```/g, '');
        const label =
          msg.sender === 'user' ? 'COURIER' : msg.sender === 'sys' ? 'SYSTEM' : 'DATABANK';
        const color = msg.sender === 'user' ? '#fff' : msg.sender === 'sys' ? '#f39c12' : fg;
        const safe = clean.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
        return `<div style="margin-bottom:10px;"><span style="color:${color};opacity:0.6;font-size:11px;">[${label}]</span><br><span style="color:${color};white-space:pre-wrap;">${safe}</span></div>`;
      })
      .join('');
    const html = `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><title>RobCo U.O.S. Campaign Log</title><style>body{background:#010a07;color:${fg};font-family:'Courier New',monospace;padding:20px;font-size:13px;line-height:1.5;}.header{text-align:center;border-bottom:1px dashed ${fg};padding-bottom:10px;margin-bottom:20px;letter-spacing:2px;}</style></head><body><div class="header"><h1>ROBCO INDUSTRIES U.O.S.<br>AFTER-ACTION CAMPAIGN LOG</h1><p>Courier: ${escapeHtml(state.loc || '?')} | ${formatGameTime(state.ticks || 0)} | Lv.${state.lvl || 1}</p></div>${rows}</body></html>`;
    _downloadBlob(html, 'text/html', 'robco_campaign_log.html');
    return;
  }

  if (format === 'md') {
    // #27 Export as Markdown
    let md = `# RobCo U.O.S. — Campaign Log\n\n`;
    md += `**Location:** ${state.loc || '?'} | **Time:** ${formatGameTime(state.ticks || 0)} | **Level:** ${state.lvl || 1}\n\n---\n\n`;
    chatHistory.forEach(msg => {
      let clean = msg.text
        .replace(/<[^>]*>?/gm, '')
        .replace(/```[a-z]*\n?/gi, '')
        .replace(/```/g, '')
        .trim();
      if (!clean) return;
      const prefix =
        msg.sender === 'user'
          ? '**[COURIER]**'
          : msg.sender === 'sys'
            ? '*[SYSTEM]*'
            : '> [DATABANK]';
      md += `${prefix} ${clean}\n\n`;
    });
    _downloadBlob(md, 'text/markdown', 'robco_campaign_log.md');
    return;
  }

  // Default: plain text (original behavior)
  let logStr = '=========================================================\n';
  logStr += '         ROBCO INDUSTRIES UNIFIED OPERATING SYSTEM\n';
  logStr += '                 AFTER-ACTION CAMPAIGN LOG\n';
  logStr += '=========================================================\n\n';
  chatHistory.forEach(msg => {
    let cleanText = msg.text
      .replace(/<[^>]*>?/gm, '')
      .replace(/\x60{3}[a-z]*\n/gi, '')
      .replace(/\x60{3}/g, '');
    if (msg.sender === 'user') logStr += `[COURIER]: ${cleanText}\n\n`;
    else if (msg.sender === 'sys') logStr += `[SYSTEM]: ${cleanText}\n\n`;
    else logStr += `[DATABANK]: ${cleanText}\n\n`;
  });
  _downloadBlob(logStr, 'text/plain', 'robco_campaign_log.txt');
}

function _downloadBlob(content, mimeType, filename) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// ── NOTIFICATION BADGES (#13) ────────────────────────────────────────
// Shows count badges on panel summaries whenever their contents are non-empty.
// Called at end of updateMath() so it always reflects current state.
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
      count: (state.quests || []).filter(q => q.status === 'active' || !q.status).length,
    },
    {
      h2text: '> COLLECTIBLES',
      count: (state.collectibles || []).length,
    },
  ];
  badges.forEach(({ h2text, count }) => {
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
      badge.textContent = count;
      h2.appendChild(badge);
    }
  });
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

// Called by #stat_loc onchange: persists the new location and re-renders so the
// current-zone highlight updates. View preference (state.mapView) is kept as-is.
function onLocationChange() {
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

function showFullChangelog() {
  fetch('CHANGELOG.md')
    .then(r => r.text())
    .then(text => {
      document.getElementById('modalTitle').innerText = '> SYSTEM CHANGELOG — ALL VERSIONS';
      document.getElementById('modalContent').innerText = text.trim();
      document.getElementById('sysModal').style.display = 'flex';
    })
    .catch(() => {
      document.getElementById('modalTitle').innerText = '> SYSTEM CHANGELOG';
      document.getElementById('modalContent').innerText = '> [SYS-ALERT: CHANGELOG NOT FOUND]';
      document.getElementById('sysModal').style.display = 'flex';
    });
}

function closeModal() {
  document.getElementById('sysModal').style.display = 'none';
}

// ── G1: V.A.T.S. TACTICAL OVERLAY ────────────────────────────────
// Reads state (PER, AGI, weapon skill, chem boosts) and target DT from inputs.
// Outputs estimated hit % per body region. Read-only — no state writes.
// Clearly labeled ESTIMATED. Also constructs a [VATS] AI prompt payload.
// Formula: BASE_CHANCE = (Perception * 2) + (Agility * 1.5) + (WeaponSkill / 3)
//          Adjusted by region modifier and target DT.
//          Clamped to 5-95%. Labeled ESTIMATED throughout.
function showVATSOverlay() {
  const modal = document.getElementById('sysModal');
  const title = document.getElementById('modalTitle');
  const content = document.getElementById('modalContent');
  if (!modal || !title || !content) return;

  // Read SPECIAL from DOM
  const per = parseInt((document.getElementById('s_p') || {}).value) || 5;
  const agi = parseInt((document.getElementById('s_a') || {}).value) || 5;

  // Active weapon skill: check state.equipped.weapon against skill matrix
  // Or just use best combat skill from state.skills
  const skills = state.skills || {};
  const combatSkills = {
    guns: skills.guns || skills.small_guns || 0,
    energy_weapons: skills.energy_weapons || 0,
    melee_weapons: skills.melee_weapons || 0,
    sneak: skills.sneak || 0,
    explosives: skills.explosives || 0,
  };
  const activeSkill = Math.max(...Object.values(combatSkills));
  const activeSkillName =
    Object.keys(combatSkills).find(k => combatSkills[k] === activeSkill) || 'guns';

  // Chem boost: any active BUFF with ticks > 0 that matches combat skill
  let chemBonus = 0;
  (state.status || []).forEach(eff => {
    if (eff.type === 'BUFF' && (eff.ticks || 0) > 0) {
      const name = (eff.name || '').toLowerCase();
      if (
        name.includes('gun') ||
        name.includes('weapon') ||
        name.includes('combat') ||
        name.includes('turbo') ||
        name.includes('psycho')
      ) {
        chemBonus += 10; // +10 skill equivalent per active combat buff
      }
    }
  });

  // Target DT input — read from a prompt or use default 0
  const targetDT = 0; // Default: no DT. AI will handle specifics.

  // Base chance calculation (intentionally approximate)
  const base = per * 2 + agi * 1.5 + (activeSkill + chemBonus) / 3 - targetDT * 1.5;

  // Body region modifiers (FNV standard)
  const regions = [
    { name: 'HEAD', mod: -40, ap: 5 },
    { name: 'TORSO', mod: 0, ap: 4 },
    { name: 'L. ARM', mod: -20, ap: 3 },
    { name: 'R. ARM', mod: -20, ap: 3 },
    { name: 'L. LEG', mod: -25, ap: 4 },
    { name: 'R. LEG', mod: -25, ap: 4 },
    { name: 'EYES', mod: -60, ap: 6 },
    { name: 'GROIN', mod: -30, ap: 4 },
  ];

  const rows = regions
    .map(r => {
      const pct = Math.min(95, Math.max(5, Math.round(base + r.mod)));
      const bar = '#'.repeat(Math.floor(pct / 10)).padEnd(10, '·');
      return `${r.name.padEnd(8)} [${bar}] ${pct}% EST. &nbsp; AP:${r.ap}`;
    })
    .join('\n');

  const chemStr = chemBonus > 0 ? ` (+${chemBonus} CHEM BOOST)` : '';

  title.innerText = '> V.A.T.S. TACTICAL OVERLAY — ESTIMATED ONLY';
  content.innerHTML = `
<div style="font-family:inherit;font-size:11px;line-height:1.8;white-space:pre;">
<b>INPUTS</b>
  PER:${per}  AGI:${agi}  SKILL:${activeSkillName.toUpperCase()} ${activeSkill}${chemStr}
  TARGET DT: ${targetDT} (update via AI [VATS] command for specifics)

<b>HIT PROBABILITIES — ESTIMATED</b>
  ${rows.split('\n').join('\n  ')}

<b style="opacity:0.6;font-size:10px;">
ACCURACY ESTIMATES BASED ON SIMPLIFIED FORMULA.
ACTUAL OUTCOME DETERMINED BY AI RESOLUTION.
USE [VATS] COMMAND FOR CONTEXT-AWARE COMBAT ANALYSIS.
</b>
</div>`;

  modal.style.display = 'flex';
}

const COMMAND_REGISTRY = [
  {
    group: 'TACTICAL & COMBAT',
    cmds: [
      { cmd: '[VATS SIM] / [VS]', desc: 'Melee/Unarmed AP strike optimizer.' },
      { cmd: '[VVATS]', desc: 'Analyze screenshot for hit %.' },
      { cmd: '[THREAT] / [TH]', desc: 'Squad TTK & ammo burn calc.' },
      { cmd: '[TACTICS] / [TA]', desc: 'Multi-companion combat guide.' },
      { cmd: '[BIO-SCAN]', desc: 'Limb evaluation & med routing.' },
    ],
  },
  {
    group: 'INVENTORY & ECONOMY',
    cmds: [
      { cmd: '[VISUAL UPLOAD:X]', desc: 'Parse screenshot (Wpn/App/Msc).' },
      { cmd: '[SYNC: data]', desc: 'Batch state update via string.' },
      { cmd: '[BIND: X, DIR]', desc: 'Assign gear to D-Pad vectors.' },
      { cmd: '[PAD: DIR]', desc: 'Auto-execute 8-way hotkeys.' },
      { cmd: '[TRADE: X] / [TD]', desc: 'Live barter math & updates.' },
      { cmd: '[STASH: Loc] / [-FULL]', desc: 'Network inventory sum/full.' },
      { cmd: '[EXCESS] / [-FULL]', desc: 'Jury Rig & weight triage.' },
      { cmd: '[CURRENCY]', desc: 'Weightless Wealth exchange.' },
      { cmd: '[CRAFT]', desc: 'Consume ingredients to build.' },
      { cmd: '[AUDIT]', desc: 'Stash value for liquidation.' },
    ],
  },
  {
    group: 'CHARACTER & BIO-STATUS',
    cmds: [
      { cmd: '[TIMER/CHEM] / [CH]', desc: 'Buff ticks & addictions.' },
      { cmd: '[SQUAD]', desc: 'Squad loadouts & 150lb weight.' },
      { cmd: '[ROADMAP]', desc: 'Perks to Cap; implant overlap.' },
    ],
  },
  {
    group: 'NAVIGATION & WORLD STATE',
    cmds: [
      { cmd: '[GPS/MAP]', desc: 'Localized geographic compass.' },
      { cmd: '[TRAVEL CLUSTER] / [TC]', desc: 'Group active quest nodes.' },
      { cmd: '[WAIT: X Hrs]', desc: 'Advance clock & restock.' },
      { cmd: '[SLEEP]', desc: 'Advance 8 Hrs, heal HP/Limbs.' },
      { cmd: '[TIMELINE]', desc: 'Projected narrative timeline.' },
      { cmd: '[CASINO]', desc: 'Blackjack strategy via LUCK.' },
    ],
  },
  {
    group: 'NARRATIVE & DIRECTIVES',
    cmds: [
      { cmd: '[CROSSROADS]', desc: 'Butterfly-effect lockouts.' },
      { cmd: '[COMM LINK]', desc: 'NPC persona override. (SEVER)' },
      { cmd: '[PAUSE]', desc: 'Master Directive (Page One).' },
      { cmd: '[PAGE 2/3]', desc: 'Dynamic routes & alignment.' },
      { cmd: '[ARCHIVE]', desc: '3 most recent story choices.' },
      { cmd: '&& / -Q / -S', desc: 'Chain cmds, Quiet, Stealth.' },
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
  modal.style.display = 'flex';
}
function clampStat(el) {
  if (el.value > 10) el.value = 10;
  if (el.value < 1) el.value = 1;
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

function loadUI() {
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
  ['la', 'ra', 'll', 'rl', 'hd'].forEach(k => {
    let btn = document.getElementById('btn_l_' + k);
    if (!btn) return;
    if (state[k] === 'OK') {
      btn.className = 'limb-ok';
      btn.innerText = '[██████] OK';
    } else {
      btn.className = 'limb-crip limb-glitch';
      btn.innerText = '[░░░░░░] CRIP';
    }
  });
  updateKarmaUI();
  renderInventory();
  renderAmmo();
  renderSquad();
  renderStatus();
  renderCampaignNotes();
  renderFactionRep();
  renderPerks();
  renderQuests();
  renderSessionStats();
  renderEquipped();
  renderCollectibles();
  renderGameDate();
  renderWorldMap(); // G6: Regional Zone Map
  renderKarmaCenter(); // G4: FO3 Karma Center
  renderCampaignStatus(); // v2.0.1: Campaign Status + Crossroads Record
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

function addItem() {
  let n = document.getElementById('newItemName').value;
  if (!n) return;

  // Auto-populate from database if fields are empty
  const dbEntry = typeof lookupItemInDb === 'function' ? lookupItemInDb(n) : null;

  let q = parseFloat(document.getElementById('newItemQty').value) || 1;
  const rawW = document.getElementById('newItemWeight').value;
  const rawV = document.getElementById('newItemValue').value;
  let w = rawW !== '' ? parseFloat(rawW) || 0 : dbEntry ? dbEntry.wgt : 0;
  let v = rawV !== '' ? parseFloat(rawV) || 0 : dbEntry ? dbEntry.val : 0;
  let t = (document.getElementById('newItemType') || {}).value || 'misc';
  // Auto-set type from DB if user left it on the default 'misc'
  if (t === 'misc' && dbEntry && dbEntry.type) t = dbEntry.type;

  // ── AMMO ROUTING ────────────────────────────────────────────────
  // If the resolved type is 'ammo', route to state.ammo (sub-panel) instead of inventory
  if (t === 'ammo') {
    if (!state.ammo) state.ammo = {};
    state.ammo[n] = (state.ammo[n] || 0) + q;
    document.getElementById('newItemName').value = '';
    document.getElementById('newItemQty').value = '';
    document.getElementById('newItemWeight').value = '';
    document.getElementById('newItemValue').value = '';
    saveState();
    loadUI();
    expandPanelForCategory('ammo');
    return;
  }

  let ex = state.inventory.find(i => i.name.toLowerCase() === n.toLowerCase());
  if (ex) {
    ex.qty += q;
    // Retroactively correct weight/value if the existing entry had 0 and the new add has real data
    if (ex.wgt === 0 && w > 0) ex.wgt = w;
    if (ex.val === 0 && v > 0) ex.val = v;
    if (ex.type === 'misc' && t !== 'misc') ex.type = t;
  } else state.inventory.push({ name: n, qty: q, wgt: w, val: v, type: t });
  document.getElementById('newItemName').value = '';
  document.getElementById('newItemQty').value = '';
  document.getElementById('newItemWeight').value = '';
  document.getElementById('newItemValue').value = '';
  loadUI();
}
function delItem(idx) {
  state.inventory.splice(idx, 1);
  loadUI();
}
function renderInventory() {
  const lst = document.getElementById('invList');
  if (!lst) return;
  // #23 Consumable Quick-Use + #32 Item Category Tags
  // Each row shows: [TYPE] qty x Name (weight · value) [USE] [X]
  const typeColors = {
    weapon: 'var(--robco-danger)',
    armor: 'var(--robco-blue)',
    aid: 'var(--robco-green)',
    ammo: 'var(--robco-alert)',
    misc: 'var(--robco-alert)',
  };
  // Filter ammo-typed items — they render in the ammo sub-panel
  // Map with original index FIRST so data-idx and data-use stay correct after filter
  const displayItems = state.inventory
    .map((it, idx) => ({ ...it, _origIdx: idx }))
    .filter(it => (it.type || 'misc') !== 'ammo');
  lst.innerHTML = displayItems
    .map(it => {
      const cat = (it.type || 'misc').toLowerCase();
      const typeTag = `<span style="font-size:9px;opacity:0.7;margin-right:3px;color:${typeColors[cat] || 'inherit'};">[${cat.toUpperCase()}]</span>`;
      return `<li><button class="use-btn" data-use="${it._origIdx}" title="Quick-use: send [USE] ${escapeHtml(it.name)}">USE</button>${typeTag}<span>${parseInt(it.qty) || 0}x ${escapeHtml(it.name)} (${parseFloat(it.wgt) || 0} lb${parseInt(it.val) ? ' · ' + parseInt(it.val) + 'c' : ''})</span> <button class="delete-btn" data-idx="${it._origIdx}">X</button></li>`;
    })
    .join('');
  lst.onclick = e => {
    const del = e.target.closest('[data-idx]');
    if (del) {
      delItem(+del.dataset.idx);
      return;
    }
    const use = e.target.closest('[data-use]');
    if (use) {
      const item = state.inventory[+use.dataset.use];
      if (!item) return;
      document.getElementById('chatInput').value = `> [USE] ${item.name}`;
      transmitMessage();
    }
  };
}

// ── AMMO RESERVES ──────────────────────────────────────────────
function renderAmmo() {
  const ammoDiv = document.getElementById('ammoList');
  if (!ammoDiv) return;
  const ammoObj = state.ammo || {};
  const entries = Object.entries(ammoObj).filter(([, count]) => count > 0);
  if (entries.length === 0) {
    ammoDiv.innerHTML = '<span style="color: rgba(20,253,206,0.5)">No Ammo Tracked</span>';
    return;
  }
  // Sort alphabetically by caliber name
  entries.sort((a, b) => a[0].localeCompare(b[0]));
  ammoDiv.innerHTML =
    '<div style="display:grid;grid-template-columns:1fr auto auto;gap:2px 8px;font-size:11px;">' +
    entries
      .map(
        ([caliber, count]) =>
          `<span style="opacity:0.8;">${escapeHtml(caliber)}</span>` +
          `<span style="text-align:right;">${count}</span>` +
          `<button class="delete-btn" style="font-size:9px;padding:0 4px;" onclick="removeAmmo('${escapeHtml(caliber).replace(/'/g, '&#39;')}')" title="Remove">X</button>`
      )
      .join('') +
    '</div>';
}

function addAmmo() {
  const typeEl = document.getElementById('newAmmoType');
  const countEl = document.getElementById('newAmmoCount');
  if (!typeEl || !typeEl.value.trim()) return;
  const caliber = typeEl.value.trim();
  const count = parseInt(countEl.value) || 0;
  if (count <= 0) return;
  if (!state.ammo) state.ammo = {};
  state.ammo[caliber] = (state.ammo[caliber] || 0) + count;
  typeEl.value = '';
  countEl.value = '';
  saveState();
  loadUI();
}

function removeAmmo(caliber) {
  if (!state.ammo) return;
  delete state.ammo[caliber];
  saveState();
  loadUI();
}

function renderSquad() {
  const squadDiv = document.getElementById('squadList');
  if (!squadDiv) return;
  if (!state.squad || state.squad.length === 0) {
    squadDiv.innerHTML = '<span style="color: rgba(20, 253, 206, 0.5)">No Active Companions</span>';
    return;
  }
  squadDiv.innerHTML = state.squad
    .map((member, i) => {
      const hpRatio = member.hp / (member.hpMax || 100);
      const pBars = Math.ceil(hpRatio * 10);
      const barStr = '['.padEnd(pBars + 1, '\u2588').padEnd(11, '\u2591') + ']';
      // #11 Companion Affinity: render affinity bar if present
      let affinityStr = '';
      if (member.affinity !== undefined) {
        const aff = Math.min(100, Math.max(0, parseInt(member.affinity) || 0));
        const affBars = Math.round(aff / 10);
        const affBar = '['.padEnd(affBars + 1, '\u25a0').padEnd(11, '\u25a1') + ']';
        const affColor =
          aff >= 75
            ? 'var(--robco-green)'
            : aff >= 40
              ? 'var(--robco-alert)'
              : 'var(--robco-danger)';
        affinityStr = `<div style="font-size:10px;margin-top:2px;color:${affColor};">AFF: ${affBar} ${aff}%</div>`;
      }
      return `<div style="margin-bottom: 5px; border-bottom: 1px dashed rgba(20, 253, 206, 0.3); padding-bottom: 4px;">
            <div style="font-weight:bold;display:flex;justify-content:space-between;align-items:center;">
                <span>${barStr} ${escapeHtml(member.name)}</span>
                <button class="delete-btn" onclick="removeSquadMember(${i})">X</button>
            </div>
            <div style="font-size: 11px; display:flex; justify-content:space-between; margin-top:2px;">
                <span style="color: var(--robco-green)">HP: ${parseInt(member.hp) || 0}/${parseInt(member.hpMax) || 0}</span>
                <span style="color: var(--robco-alert)">AMMO: ${parseInt(member.ammo) || 0}</span>
                <span style="color: var(--robco-danger)">CND: ${escapeHtml(String(member.condition))}</span>
            </div>
            ${member.weapon ? `<div style="font-size:10px;opacity:0.6;margin-top:1px;">WPN: ${escapeHtml(member.weapon)}${member.dt !== undefined ? ' | DT: ' + (parseInt(member.dt) || 0) : ''}</div>` : ''}
            ${affinityStr}
        </div>`;
    })
    .join('');
}

function removeSquadMember(idx) {
  if (state.squad && state.squad.length > idx) {
    state.squad.splice(idx, 1);
    loadUI();
  }
}

function addSquadMember() {
  const nameInput = document.getElementById('newSquadName');
  if (!nameInput || !nameInput.value.trim()) return;
  if (!state.squad) state.squad = [];

  const name = nameInput.value.trim();
  const existing = state.squad.find(m => m.name.toLowerCase() === name.toLowerCase());
  if (existing) {
    nameInput.value = '';
    return;
  }

  state.squad.push({
    name: name,
    hp: 100,
    hpMax: 100,
    weapon: 'Unarmed',
    ammo: 0,
    condition: 'OK',
  });

  nameInput.value = '';
  loadUI();
}

// ── UTILITY FUNCTIONS ──────────────────────────────────────────
// ── TIME SYSTEM ───────────────────────────────────────────────────
// Internal representation: ticks (integer). 240 ticks = 1 in-game day.
// 1 tick = 6 minutes. 10 ticks = 1 hour.
//
// ticksToGameTime(t)  → internal 'D1 14:00' format (legacy, used internally)
// formatGameTime(t)   → Fallout-style 'Wednesday, 10.23.81, 1:40 AM' (display)
// getGameDate()       → 'OCT 19, 2281' (calendar date only)
// gameTimeToTicks()   → inverse: D/H/M → ticks (used by time input handler)
//
// Design: All display-facing code uses formatGameTime(). Internal logic and
// save/persistence remain tick-based. Shared by FNV and FO3 via gameContext.

function ticksToGameTime(t) {
  // Internal format — kept for backward compatibility (log exports, any future consumers).
  let day = Math.floor(t / 240) + 1;
  let hr = Math.floor((t % 240) / 10);
  let mn = (t % 10) * 6;
  return `D${day} ${String(hr).padStart(2, '0')}:${String(mn).padStart(2, '0')}`;
}

// ── CALENDAR DATE (G7) ────────────────────────────────────────────
// Computes the absolute in-universe calendar from ticks + gameContext.
// FNV starting date: October 19, 2281. FO3 starting date: August 17, 2277.
//
// Returns a structured object so all downstream formatters share one source:
//   { month, day, year, weekday, hour, minute } — all integers + strings.
function _resolveGameDateTime(ticks) {
  const MONTH_DAYS = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  const isFO3 = typeof state !== 'undefined' && state.gameContext === 'FO3';

  // Game-specific epoch
  const startMonth = isFO3 ? 7 : 9; // Aug=7 (0-indexed), Oct=9
  const startDay = isFO3 ? 17 : 19;
  const startYear = isFO3 ? 2277 : 2281;

  // FNV: Oct 19, 2281 = Sunday. FO3: Aug 17, 2277 = Wednesday.
  // Weekday of epoch (0=Sun … 6=Sat)
  const epochWeekday = isFO3 ? 3 : 0; // FO3=Wed(3), FNV=Sun(0)

  const t = ticks || 0;
  const dayOffset = Math.floor(t / 240); // whole days elapsed
  const hr = Math.floor((t % 240) / 10);
  const mn = (t % 10) * 6;

  let month = startMonth;
  let day = startDay + dayOffset;
  let year = startYear;

  // Roll calendar forward
  while (day > MONTH_DAYS[month]) {
    day -= MONTH_DAYS[month];
    month++;
    if (month > 11) {
      month = 0;
      year++;
    }
  }

  const weekday = (epochWeekday + dayOffset) % 7;

  return { month, day, year, weekday, hour: hr, minute: mn };
}

// Formats ticks as Fallout-style: 'Wednesday, 10.23.81, 1:40 AM'
// Used for all player-visible time displays.
function formatGameTime(t) {
  const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const dt = _resolveGameDateTime(t);

  // Date: MM.DD.YY (Fallout UI convention — 2-digit year)
  const mm = String(dt.month + 1).padStart(2, '0');
  const dd = String(dt.day).padStart(2, '0');
  const yy = String(dt.year).slice(-2);
  const dateStr = `${mm}.${dd}.${yy}`;

  // Time: 12-hour with AM/PM
  const ampm = dt.hour < 12 ? 'AM' : 'PM';
  const h12 = dt.hour % 12 || 12;
  const timeStr = `${h12}:${String(dt.minute).padStart(2, '0')} ${ampm}`;

  return `${WEEKDAYS[dt.weekday]}, ${dateStr}, ${timeStr}`;
}

// Returns calendar date only as 'OCT 19, 2281' — used by gameDateDisplay.
function getGameDate() {
  const MONTHS = [
    'JAN',
    'FEB',
    'MAR',
    'APR',
    'MAY',
    'JUN',
    'JUL',
    'AUG',
    'SEP',
    'OCT',
    'NOV',
    'DEC',
  ];
  const dt = _resolveGameDateTime((typeof state !== 'undefined' && state.ticks) || 0);
  return `${MONTHS[dt.month]} ${String(dt.day).padStart(2, '0')}, ${dt.year}`;
}

// Updates the DATE + TIME display in the Bio-Metrics panel.
// Shows calendar date on the DATE row and Fallout-style time on the TIME row.
function renderGameDate() {
  const dateEl = document.getElementById('gameDateDisplay');
  if (dateEl) dateEl.textContent = getGameDate();
  const timeEl = document.getElementById('gameTimeDisplay');
  if (timeEl)
    timeEl.textContent = formatGameTime((typeof state !== 'undefined' && state.ticks) || 0);
}

// Minute resolution snaps to nearest tick boundary (floor to multiple of 6).
function gameTimeToTicks(day, hour, min) {
  return (day - 1) * 240 + hour * 10 + Math.floor(min / 6);
}

// ── calendarToTicks() — C11: Calendar Date Editor ────────────────────
// Converts (month [1-12], day [1-31], year, hour [0-23], min [0-59]) to ticks.
// Uses the same MONTH_DAYS table as _resolveGameDateTime() — no leap years (game convention).
// Game-context aware: FNV epoch Oct 19, 2281; FO3 epoch Aug 17, 2277.
function calendarToTicks(month, day, year, hour, min) {
  const MONTH_DAYS = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  const isFO3 = typeof state !== 'undefined' && state.gameContext === 'FO3';
  const startMonth = isFO3 ? 7 : 9; // 0-indexed: Aug=7, Oct=9
  const startDay = isFO3 ? 17 : 19;
  const startYear = isFO3 ? 2277 : 2281;
  // Count total days since an arbitrary base year using MONTH_DAYS (no leap years)
  function daysSinceBase(yr, mo0, dy) {
    // mo0 = 0-indexed month
    let total = (yr - 2200) * 365; // close-enough base offset
    for (let i = 0; i < mo0; i++) total += MONTH_DAYS[i];
    return total + dy;
  }
  const startTotal = daysSinceBase(startYear, startMonth, startDay);
  const targetTotal = daysSinceBase(year, (month - 1 + 12) % 12, day);
  const dayOffset = Math.max(0, targetTotal - startTotal);
  const h = Math.min(23, Math.max(0, hour || 0));
  const mn = Math.min(59, Math.max(0, min || 0));
  return dayOffset * 240 + h * 10 + Math.floor(mn / 6);
}

// ── FACTION THRESHOLDS (GECK-sourced, per-faction) ─────────────────
// t1: Smiling Troublemaker / Sneering Punk boundary
// t2: Accepted / Shunned boundary
// t3: Liked / Hated boundary
// t4: Idolized / Vilified boundary
// Source: fallout.wiki — GECK GetReputationThreshold documentation
const FACTION_THRESHOLDS = {
  ncr: { t1: 4, t2: 20, t3: 50, t4: 80 },
  legion: { t1: 4, t2: 25, t3: 50, t4: 100 },
  house: { t1: 3, t2: 10, t3: 25, t4: 50 },
  boomers: { t1: 3, t2: 8, t3: 25, t4: 50 },
  bos: { t1: 2, t2: 3, t3: 10, t4: 20 },
  followers: { t1: 3, t2: 8, t3: 25, t4: 50 },
  khans: { t1: 2, t2: 5, t3: 15, t4: 30 },
  powder: { t1: 2, t2: 5, t3: 15, t4: 30 },
  kings: { t1: 2, t2: 5, t3: 15, t4: 30 },
  strip: { t1: 3, t2: 8, t3: 20, t4: 40 },
  freeside: { t1: 3, t2: 10, t3: 35, t4: 70 },
  // FO3 factions — use generic thresholds (no independent GECK data)
  enclave: { t1: 3, t2: 10, t3: 30, t4: 60 },
  lyons: { t1: 3, t2: 10, t3: 30, t4: 60 },
  outcast: { t1: 2, t2: 8, t3: 25, t4: 50 },
  talon: { t1: 2, t2: 5, t3: 15, t4: 30 },
  regulators: { t1: 2, t2: 5, t3: 15, t4: 30 },
  slavers: { t1: 2, t2: 5, t3: 15, t4: 30 },
  reillys: { t1: 2, t2: 5, t3: 15, t4: 30 },
  tunnelsnakes: { t1: 2, t2: 5, t3: 15, t4: 30 },
  supermutants: { t1: 3, t2: 8, t3: 20, t4: 50 },
  underworld: { t1: 2, t2: 5, t3: 15, t4: 30 },
  rivetcity: { t1: 2, t2: 5, t3: 15, t4: 30 },
};
// Default thresholds for any faction key not in the table above
const _DEFAULT_THRESHOLDS = { t1: 3, t2: 8, t3: 25, t4: 50 };

// ── getFactionStanding(key, fame, infamy) ───────────────────────────
// Canonical FNV 2D fame/infamy matrix.
// Returns { label, color } based on the intersection of fame rank × infamy rank.
// Source: fallout.wiki GECK GetReputationThreshold function table.
function getFactionStanding(key, fame, infamy) {
  const th = FACTION_THRESHOLDS[key] || _DEFAULT_THRESHOLDS;
  const f = fame || 0;
  const i = infamy || 0;

  // Rank each axis: 0=none, 1=low, 2=mid, 3=high, 4=max
  const fr = f < th.t1 ? 0 : f < th.t2 ? 1 : f < th.t3 ? 2 : f < th.t4 ? 3 : 4;
  const ir = i < th.t1 ? 0 : i < th.t2 ? 1 : i < th.t3 ? 2 : i < th.t4 ? 3 : 4;

  // 2D resolution matrix (fameRank × infamyRank)
  // Derived from GECK GetReputationThreshold output table
  if (fr === 4 && ir === 0) return { label: 'Idolized', color: 'var(--robco-green)' };
  if (fr === 4 && ir <= 2) return { label: 'Merciful Thug', color: 'var(--robco-alert)' };
  if (fr >= 3 && ir <= 1) return { label: 'Liked', color: 'var(--robco-green)' };
  if (fr >= 2 && ir === 0) return { label: 'Accepted', color: 'var(--robco-green)' };
  if (fr === 1 && ir === 0) return { label: 'Accepted', color: 'var(--robco-green)' };
  if (fr >= 3 && ir >= 3) return { label: 'Wild Child', color: 'var(--robco-alert)' };
  if (fr >= 2 && ir >= 2) return { label: 'Unpredictable', color: 'var(--robco-alert)' };
  if (fr === 4 && ir >= 3) return { label: 'Wild Child', color: 'var(--robco-alert)' };
  if (fr >= 1 && ir >= 3) return { label: 'Dark Hero', color: 'var(--robco-alert)' };
  if (fr === 1 && ir === 1) return { label: 'Soft-Hearted Devil', color: 'var(--robco-alert)' };
  if (fr === 1 && ir === 2) return { label: 'Mixed', color: 'var(--robco-alert)' };
  if (fr === 2 && ir === 1) return { label: 'Mixed', color: 'var(--robco-alert)' };
  if (fr === 0 && ir === 0) return { label: 'Neutral', color: 'var(--robco-alert)' };
  if (fr === 0 && ir === 1) return { label: 'Sneering Punk', color: 'var(--robco-danger)' };
  if (fr === 0 && ir === 2) return { label: 'Shunned', color: 'var(--robco-danger)' };
  if (fr === 0 && ir === 3) return { label: 'Hated', color: 'var(--robco-danger)' };
  if (fr === 0 && ir === 4) return { label: 'Vilified', color: 'var(--robco-danger)' };
  // Fallback for any unhandled combination
  return { label: 'Neutral', color: 'var(--robco-alert)' };
}

function renderStatus() {
  const statusDiv = document.getElementById('statusList');
  if (!statusDiv) return;
  if (!state.status || state.status.length === 0) {
    statusDiv.innerHTML = '<span style="color: rgba(20,253,206,0.5)">No Active Effects</span>';
    return;
  }
  statusDiv.innerHTML = state.status
    .map((eff, i) => {
      const ticks = eff.ticks || 0;
      let typeClass =
        eff.type === 'BUFF'
          ? 'effect-buff'
          : eff.type === 'DEBUFF'
            ? 'effect-debuff'
            : 'effect-neutral';
      let tickInfo = ticks > 0 ? ` [${ticks}t]` : '';
      // Expiry warning: 1–2 ticks remaining on a timed effect
      let expiryBadge = '';
      let itemCls = 'effect-item';
      if (ticks > 0 && ticks <= 2) {
        itemCls += ' effect-item--expiring';
        expiryBadge = `<span class="effect-expiring-badge">[EXPIRING]</span>`;
      } else if (ticks === 0 && eff.type !== 'NEUTRAL') {
        // permanent effects get a subtle marker
        tickInfo = ' [∞]';
      }
      return `<div class="${itemCls}"><span class="${typeClass}">${escapeHtml(eff.name || '')}${tickInfo}${expiryBadge}</span><div><span class="effect-type" style="margin-right:8px;">${escapeHtml(eff.type || 'BUFF')}</span><button class="delete-btn" onclick="removeStatusEffect(${i})">X</button></div></div>`;
    })
    .join('');
  // G3: Apply chem boost highlights to Skill Matrix rows
  _applyChemHighlights();
}

// G3: Active Chem Visualizer ─────────────────────────────────────────────────
// Active BUFFs (type='BUFF', ticks > 0) apply .chem-boost class to matching skill rows.
// Matching: buff name fuzzy-matched against skill key display names.
// Highlight is a brighter phosphor effect (CSS class only, no color change).
function _applyChemHighlights() {
  // First, clear all existing highlights
  document
    .querySelectorAll('.skill-row.chem-boost')
    .forEach(el => el.classList.remove('chem-boost'));

  if (!state.status || state.status.length === 0) return;

  // Active buffs with ticks > 0 (time-limited chems, not permanent)
  const activeBuffs = state.status.filter(eff => eff.type === 'BUFF' && (eff.ticks || 0) > 0);
  if (activeBuffs.length === 0) return;

  // Build skill key → display name mapping from getSkillKeys()
  const skillKeys = getSkillKeys();
  const skillNames = skillKeys.map(k => ({ key: k, name: k.replace(/_/g, ' ').toUpperCase() }));

  activeBuffs.forEach(buff => {
    const buffName = (buff.name || '').toLowerCase();
    skillNames.forEach(({ key }) => {
      const skillName = key.replace(/_/g, ' ').toLowerCase();
      // Simple substring match: buff name contains skill name or vice versa
      if (buffName.includes(skillName) || skillName.includes(buffName.split(' ')[0])) {
        const row = document.getElementById('sk_' + key);
        if (row) {
          // Target the parent input-group row
          const inputGroup = row.closest('.skill-row') || row.parentElement;
          if (inputGroup) inputGroup.classList.add('chem-boost');
        }
      }
    });
  });
}

function removeStatusEffect(idx) {
  if (state.status && state.status.length > idx) {
    state.status.splice(idx, 1);
    loadUI();
  }
}

function addStatusEffect() {
  const nameInput = document.getElementById('newStatusName');
  const ticksInput = document.getElementById('newStatusTicks');
  const typeSelect = document.getElementById('newStatusType');
  if (!nameInput || !nameInput.value.trim()) return;
  if (!state.status) state.status = [];

  const ticks = parseInt(ticksInput.value) || 0;
  const name = nameInput.value.trim();
  const type = (typeSelect ? typeSelect.value : 'BUFF').toUpperCase();

  const existing = state.status.find(e => e.name.toLowerCase() === name.toLowerCase());
  if (existing) {
    existing.ticks = ticks;
    existing.type = type;
  } else {
    state.status.push({ name, ticks, type });
  }

  nameInput.value = '';
  if (ticksInput) ticksInput.value = '';
  loadUI();
}

function renderPerks() {
  const perksDiv = document.getElementById('perksList');
  if (!perksDiv) return;
  if (!state.perks || state.perks.length === 0) {
    perksDiv.innerHTML = '<span style="color: rgba(20,253,206,0.5)">No Perks Acquired</span>';
    return;
  }
  perksDiv.innerHTML =
    '<ul class="notes-list">' +
    state.perks
      .map(
        (p, i) =>
          `<li>${escapeHtml(p.name)}${p.rank > 1 ? ' (Rank ' + p.rank + ')' : ''}${p.level_taken ? ' — Lv.' + p.level_taken : ''}<button class="delete-btn" style="float:right;" onclick="removePerk(${i})">X</button></li>`
      )
      .join('') +
    '</ul>';
}

function removePerk(idx) {
  if (state.perks && state.perks.length > idx) {
    state.perks.splice(idx, 1);
    loadUI();
  }
}

function addPerk() {
  const name = (document.getElementById('newPerkName') || {}).value?.trim();
  if (!name) return;
  const rank = parseInt((document.getElementById('newPerkRank') || {}).value) || 1;
  const levelTaken = parseInt((document.getElementById('newPerkLevel') || {}).value) || 0;
  if (!state.perks) state.perks = [];
  const ex = state.perks.find(p => p.name.toLowerCase() === name.toLowerCase());
  if (ex) {
    ex.rank = Math.max(ex.rank, rank);
  } else {
    state.perks.push({ name, rank, level_taken: levelTaken || null });
  }
  document.getElementById('newPerkName').value = '';
  document.getElementById('newPerkRank').value = '';
  document.getElementById('newPerkLevel').value = '';
  loadUI();
}

// #1 Quest Log — renders state.quests[] as a filterable list
function renderQuests() {
  const questsDiv = document.getElementById('questsList');
  if (!questsDiv) return;
  if (!state.quests || state.quests.length === 0) {
    questsDiv.innerHTML = '<span style="color: rgba(20,253,206,0.5)">No Active Quests</span>';
    return;
  }
  const statusColors = {
    active: 'var(--robco-alert)',
    complete: 'var(--robco-green)',
    failed: 'var(--robco-danger)',
  };
  questsDiv.innerHTML =
    '<ul class="notes-list">' +
    state.quests
      .map((q, i) => {
        const st = (q.status || 'active').toLowerCase();
        const color = statusColors[st] || 'inherit';
        const factions = q.factions
          ? ` <span style="font-size:9px;opacity:0.6;">[${escapeHtml(String(q.factions))}]</span>`
          : '';
        return `<li style="color:${color};">[${escapeHtml(st.toUpperCase())}] ${escapeHtml(q.name)}${factions}${q.objective ? '<div style="font-size:10px;opacity:0.7;margin-left:10px;">' + escapeHtml(q.objective) + '</div>' : ''}<button class="delete-btn" style="float:right;" onclick="removeQuest(${i})">X</button></li>`;
      })
      .join('') +
    '</ul>';
}
function removeQuest(idx) {
  state.quests.splice(idx, 1);
  loadUI();
}

// #8 Session Statistics — renders state.stats
function renderSessionStats() {
  const statsDiv = document.getElementById('sessionStatsList');
  if (!statsDiv) return;
  const s = state.stats || {};
  const elapsed = Math.round((Date.now() - (s.sessionStart || Date.now())) / 60000);
  // I2: Collectibles count for session stats
  const collectDefs =
    typeof FALLOUT_REGISTRY !== 'undefined' && FALLOUT_REGISTRY.collectibles
      ? FALLOUT_REGISTRY.collectibles
      : [];
  const collectAcquired = (state.collectibles || []).length;
  const collectTotal = collectDefs.length;
  const collectLine =
    collectTotal > 0
      ? `<span style="opacity:0.65;">COLLECTIBLES</span><span>${collectAcquired}/${collectTotal}</span>`
      : '';
  statsDiv.innerHTML = `
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:4px 8px;font-size:11px;">
            <span style="opacity:0.65;">KILLS</span><span>${s.kills || 0}</span>
            <span style="opacity:0.65;">CAPS EARNED</span><span>${s.capsEarned || 0}</span>
            <span style="opacity:0.65;">DMG DEALT</span><span>${s.damageDealt || 0}</span>
            <span style="opacity:0.65;">SESSION TIME</span><span>${elapsed}m</span>
            <span style="opacity:0.65;">TICKS</span><span>${state.ticks || 0}</span>
            <span style="opacity:0.65;">LOCATION VISITS</span><span>${(state.locationHistory || []).length}</span>
            ${collectLine}
        </div>`;
}

// #2 Equipped Item Tracking — renders state.equipped in bio-metrics
function renderEquipped() {
  const eqDiv = document.getElementById('equippedDisplay');
  if (!eqDiv) return;
  const eq = state.equipped || {};
  const lines = [];
  if (eq.weapon)
    lines.push(`<span style="color:var(--robco-danger);">WPN: ${escapeHtml(eq.weapon)}</span>`);
  if (eq.armor)
    lines.push(`<span style="color:var(--robco-blue);">ARMOR: ${escapeHtml(eq.armor)}</span>`);
  if (eq.headgear)
    lines.push(`<span style="color:var(--robco-blue);">HEAD: ${escapeHtml(eq.headgear)}</span>`);
  eqDiv.innerHTML = lines.length
    ? lines.join('<br>')
    : '<span style="opacity:0.4;">Nothing equipped</span>';
}

// ── COLLECTIBLES PANEL ────────────────────────────────────────────
// Reads FALLOUT_REGISTRY.collectibles (game-specific list) and state.collectibles
// (flat array of collected item names). Renders terminal-style [ACQUIRED]/[MISSING] list.
function renderCollectibles() {
  const container = document.getElementById('collectiblesDisplay');
  if (!container) return;

  const defs =
    typeof FALLOUT_REGISTRY !== 'undefined' && FALLOUT_REGISTRY.collectibles
      ? FALLOUT_REGISTRY.collectibles
      : [];
  const acquired = new Set((state.collectibles || []).map(n => n.toLowerCase()));
  const total = defs.length;
  const acquiredCount = defs.filter(d => acquired.has(d.name.toLowerCase())).length;

  if (total === 0) {
    container.innerHTML =
      '<span style="opacity:0.4;font-size:11px;">[NO COLLECTIBLES REGISTRY LOADED]</span>';
    return;
  }

  // Determine collectible type label based on game context
  const isF03 = typeof state !== 'undefined' && state.gameContext === 'FO3';
  const typeLabel = isF03 ? 'BOBBLEHEADS' : 'SNOW GLOBES';

  // Header line: SNOW GLOBES  [3/7]
  let html = `<div style="font-weight:bold;letter-spacing:1px;margin-bottom:6px;font-size:11px;">${typeLabel}&nbsp;&nbsp;[${acquiredCount}/${total}]</div>`;

  // Acquired items first
  const acquiredDefs = defs.filter(d => acquired.has(d.name.toLowerCase()));
  const missingDefs = defs.filter(d => !acquired.has(d.name.toLowerCase()));

  acquiredDefs.forEach(d => {
    const safeName = escapeHtml(d.name);
    html += `<div style="font-size:11px;letter-spacing:0.5px;margin-bottom:2px;"><span style="color:var(--robco-green);cursor:pointer;" onclick="toggleCollectible('${safeName}')" title="Click to mark MISSING">[ACQUIRED]</span> ${escapeHtml(d.name.toUpperCase())}</div>`;
  });

  if (acquiredDefs.length > 0 && missingDefs.length > 0) {
    html += '<div style="border-top:1px dashed rgba(20,253,206,0.2);margin:4px 0;"></div>';
  }

  missingDefs.forEach(d => {
    const safeName = escapeHtml(d.name);
    const locHint = d.location
      ? ` &mdash; <span style="opacity:0.5;font-size:10px;">LOC: ${escapeHtml(d.location)}</span>`
      : '';
    html += `<div style="font-size:11px;letter-spacing:0.5px;margin-bottom:2px;opacity:0.75;"><span style="opacity:0.6;cursor:pointer;" onclick="toggleCollectible('${safeName}')" title="Click to mark ACQUIRED">[MISSING]</span> ${escapeHtml(d.name.toUpperCase())}${locHint}</div>`;
  });

  container.innerHTML = html;
}

function toggleCollectible(name) {
  if (!state.collectibles) state.collectibles = [];
  const lowerName = name.toLowerCase();
  const idx = state.collectibles.findIndex(n => n.toLowerCase() === lowerName);
  if (idx >= 0) {
    state.collectibles.splice(idx, 1);
  } else {
    state.collectibles.push(name);
  }
  renderCollectibles();
  saveState();
}

function renderCampaignNotes() {
  const notesDiv = document.getElementById('campaignNotesList');
  if (!notesDiv) return;
  if (!state.campaign_notes || state.campaign_notes.length === 0) {
    notesDiv.innerHTML = '<span style="color: rgba(20,253,206,0.5)">No Notes Recorded</span>';
    return;
  }
  notesDiv.innerHTML =
    '<ul class="notes-list">' +
    state.campaign_notes
      .map((note, i) => {
        const isAutoLog = /^\[T\d+\]/.test(note);
        const opacity = isAutoLog ? '0.65' : '1';
        return `<li style="opacity:${opacity};">${escapeHtml(String(note))}<button class="delete-btn" style="float:right;" onclick="removeCampaignNote(${i})">X</button></li>`;
      })
      .join('') +
    '</ul>';
}

function removeCampaignNote(idx) {
  if (state.campaign_notes && state.campaign_notes.length > idx) {
    state.campaign_notes.splice(idx, 1);
    loadUI();
  }
}

function addCampaignNote() {
  const input = document.getElementById('newCampaignNote');
  if (!input || !input.value.trim()) return;
  if (!state.campaign_notes) state.campaign_notes = [];
  state.campaign_notes.push(input.value.trim());
  input.value = '';
  loadUI();
}

// ── CAMPAIGN STATUS PANEL (v2.0.1) ───────────────────────────────
// Reads existing state fields — no new state fields, no Protocol 4 required.
// Displays: quest summary, top faction standings, active effects, and campaign notes count.
// Crossroads Record tab reads campaign_notes for auto-logged quest/faction events.
function renderCampaignStatus() {
  const display = document.getElementById('campaignStatusDisplay');
  const crossroads = document.getElementById('crossroadsDisplay');

  // ── Campaign Status ──────────────────────────────────────
  if (display) {
    const quests = state.quests || [];
    const completed = quests.filter(
      q => q.status === 'completed' || q.status === 'complete'
    ).length;
    const active = quests.filter(q => q.status === 'in progress' || q.status === 'active').length;
    const failed = quests.filter(q => q.status === 'failed').length;
    const total = quests.length;

    // Top 3 faction standings by absolute net rep
    const factions = state.factions || {};
    const factionReg = typeof getFactionRegistry === 'function' ? getFactionRegistry() : [];
    const topFactions = factionReg
      .map(f => {
        const data = factions[f.key] || { fame: 0, infamy: 0 };
        const s =
          typeof getFactionStanding === 'function'
            ? getFactionStanding(f.key, data.fame || 0, data.infamy || 0)
            : { label: 'NEUTRAL', color: 'var(--robco-green)' };
        return { name: f.name, label: s.label, color: s.color };
      })
      .filter(f => f.label !== 'Neutral' && f.label !== 'NEUTRAL')
      .slice(0, 4);

    // Active effects summary
    const activeEffects = (state.status || []).length;
    const expiringEffects = (state.status || []).filter(
      e => (e.ticks || 0) > 0 && (e.ticks || 0) <= 2
    ).length;

    // Build the HTML
    let html = `<div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;margin-bottom:8px;">
      <div class="campg-stat-box">
        <div class="campg-stat-label">QUESTS</div>
        <div class="campg-stat-value">${total}</div>
        <div class="campg-stat-sub">${completed} done · ${active} active · ${failed} failed</div>
      </div>
      <div class="campg-stat-box">
        <div class="campg-stat-label">EFFECTS</div>
        <div class="campg-stat-value">${activeEffects}</div>
        <div class="campg-stat-sub">${expiringEffects > 0 ? expiringEffects + ' expiring' : 'none expiring'}</div>
      </div>
    </div>`;

    if (topFactions.length > 0) {
      html += `<div style="margin-bottom:6px;font-size:9px;opacity:0.5;letter-spacing:0.5px;">NOTABLE STANDINGS</div>`;
      html += `<div style="display:flex;flex-wrap:wrap;gap:4px;margin-bottom:6px;">`;
      topFactions.forEach(f => {
        html += `<span style="font-size:9px;border:1px dashed rgba(20,253,206,0.25);padding:2px 6px;color:${f.color};">${escapeHtml(f.name.toUpperCase())}: ${f.label}</span>`;
      });
      html += `</div>`;
    } else {
      html += `<div style="font-size:9px;opacity:0.4;margin-bottom:6px;">[NO NOTABLE FACTION STANDINGS]</div>`;
    }

    // Recent campaign note count
    const noteCount = (state.campaign_notes || []).length;
    html += `<div style="font-size:9px;opacity:0.5;">${noteCount} campaign log entr${noteCount === 1 ? 'y' : 'ies'}</div>`;

    display.innerHTML = html;
  }

  // ── Crossroads Record ────────────────────────────────────
  // Reads campaign_notes that were auto-logged by quest/faction transitions.
  // Auto-logged entries start with [T<ticks>].
  if (crossroads) {
    const autoLogs = (state.campaign_notes || [])
      .filter(n => /^\[T\d+\]/.test(String(n)))
      .slice(-20) // last 20 events
      .reverse(); // newest first

    if (autoLogs.length === 0) {
      crossroads.innerHTML =
        '<span style="opacity:0.45;">[NO DECISIONS RECORDED — CROSSROADS EVENTS WILL APPEAR HERE]</span>';
    } else {
      crossroads.innerHTML = autoLogs
        .map(
          note =>
            `<div style="border-bottom:1px solid rgba(20,253,206,0.1);padding:4px 0;font-size:10px;opacity:0.75;">${escapeHtml(String(note))}</div>`
        )
        .join('');
    }
  }
}

// ── G6: REGIONAL ZONE MAP (WORLD MAP) ────────────────────────────
// Registry-driven 6×6 CSS grid. Markers:
//   CURRENT — bright border, on zone matching state.loc (fuzzy match against zone.locations[])
//   VISITED — dashed muted border, on zones in locationHistory
//   [?] pip  — on zones containing uncollected collectibles
// Compass strip labels orientation. Narrow viewports get a 4×4 core-zone fallback.
let _mapActiveZone = null;

function setMapView(v) {
  state.mapView = v;
  saveState();
  renderWorldMap();
}

function zoomMapToZone(zoneName) {
  _mapActiveZone = zoneName;
  renderWorldMap();
}

function resetMapZoom() {
  _mapActiveZone = null;
  renderWorldMap();
}

// Abbreviation map for long zone names in the 6×6 grid display.
// Full names are always available via the title tooltip.
const _MAP_ABBREV = {
  'Ranger Station Foxtrot': 'R.S. Foxtrot',
  'Ranger Station Alpha': 'R.S. Alpha',
  'Ranger Station Bravo': 'R.S. Bravo',
  'Ranger Station Charlie': 'R.S. Charlie',
  'Ranger Station Delta': 'R.S. Delta',
  'Ranger Station Echo': 'R.S. Echo',
  'Camp Forlorn Hope': 'Forlorn Hope',
  'Camp Searchlight': 'Searchlight',
  'Camp McCarran': 'McCarran',
  '188 Trading Post': '188 Post',
  'Mount Charleston': 'Mt. Charleston',
  'Searchlight Airport': 'S.L. Airport',
};

function _mapAbbrev(name) {
  return _MAP_ABBREV[name] || name;
}

function renderWorldMap() {
  const display = document.getElementById('worldMapDisplay');
  if (!display) return;

  const zones =
    typeof FALLOUT_REGISTRY !== 'undefined' && FALLOUT_REGISTRY.zones ? FALLOUT_REGISTRY.zones : [];

  if (!zones.length) {
    display.innerHTML = '<span style="opacity:0.4;">[MAP DATA NOT LOADED]</span>';
    return;
  }

  // Build sets for quick lookups
  const visited = new Set((state.locationHistory || []).map(l => (l || '').toLowerCase()));
  const collected = new Set((state.collectibles || []).map(c => (c || '').toLowerCase()));
  const collectDefs =
    typeof FALLOUT_REGISTRY !== 'undefined' && FALLOUT_REGISTRY.collectibles
      ? FALLOUT_REGISTRY.collectibles
      : [];

  const currentLoc = (state.loc || '').toLowerCase();

  // Helper: check if a zone has an uncollected collectible
  function zoneHasUncollectedCollectible(zone) {
    return collectDefs.some(def => {
      const defName = (def.name || '').toLowerCase();
      if (collected.has(defName)) return false;
      const searchIn = [zone.name, ...(zone.locations || [])].map(s => s.toLowerCase());
      return searchIn.some(s => s.includes(defName) || defName.includes(s.split(' ')[0]));
    });
  }

  function locHasUncollectedCollectible(locName) {
    const locLower = locName.toLowerCase();
    return collectDefs.some(def => {
      const defName = (def.name || '').toLowerCase();
      if (collected.has(defName)) return false;
      return locLower.includes(defName) || defName.includes(locLower.split(' ')[0]);
    });
  }

  // Scores a zone against the current location string to pick ONE best-match cell.
  // 100 = exact string match, 50+len = whole-word token match, 10 = substring fallback.
  function scoreZoneForLoc(zone, loc) {
    const locLower = loc.toLowerCase();
    const searchIn = [zone.name, ...(zone.locations || [])].map(s => s.toLowerCase());
    let best = 0;
    for (const s of searchIn) {
      if (s === locLower) return 100;
      const locWords = locLower.split(/[ ,]+/).filter(w => w.length > 2);
      const sWords = s.split(/[ ,]+/).filter(w => w.length > 2);
      if (locWords.some(lw => sWords.some(sw => sw === lw))) {
        best = Math.max(best, 50 + s.length);
      } else if (
        locWords.some(lw => lw.length > 3 && sWords.some(sw => sw.includes(lw) || lw.includes(sw)))
      ) {
        best = Math.max(best, 10);
      }
    }
    return best;
  }

  function zoneVisited(zone) {
    const searchIn = [zone.name, ...(zone.locations || [])].map(s => s.toLowerCase());
    for (const v of visited) {
      if (searchIn.some(s => s.includes(v) || v.includes(s.split(' ')[0]))) return true;
    }
    return false;
  }

  function locVisited(locName) {
    const locLower = locName.toLowerCase();
    for (const v of visited) {
      if (locLower.includes(v) || v.includes(locLower.split(' ')[0])) return true;
    }
    return false;
  }

  // ── ZOOM LEVEL 2: DETAILED REGIONAL VIEW ─────────────────────────
  if (_mapActiveZone) {
    const activeZone = zones.find(z => z.name === _mapActiveZone);
    if (!activeZone) {
      _mapActiveZone = null;
      return renderWorldMap();
    }

    let html = `
      <div class="map-detail-header">
        <button class="action-btn map-back-btn" onclick="resetMapZoom()">&lt; WORLD GRID</button>
        <span style="font-weight:bold; font-size:11px; letter-spacing:1px;">${escapeHtml(activeZone.name).toUpperCase()} REGION</span>
      </div>
      <div class="map-detail-list">
    `;

    const locs = activeZone.locations || [];
    if (locs.length === 0) {
      html += `<div style="opacity:0.5; font-style:italic; padding:8px 4px;">[NO DATA]</div>`;
    } else {
      // Single-winner: find the one best-matching location index (score ≥50 required).
      // Prevents "goodsprings" substring match from marking Bitter Springs as [CURRENT].
      let currentLocIdx = -1;
      if (currentLoc) {
        let bestLocScore = 0,
          bestLocLen = 0;
        locs.forEach((loc, i) => {
          const s = scoreZoneForLoc({ name: loc, locations: [] }, currentLoc);
          if (s > bestLocScore || (s > 0 && s === bestLocScore && loc.length > bestLocLen)) {
            bestLocScore = s;
            bestLocLen = loc.length;
            currentLocIdx = i;
          }
        });
        if (bestLocScore < 50) currentLocIdx = -1;
      }
      locs.forEach((loc, i) => {
        const isYou = i === currentLocIdx;
        const wasVisited = locVisited(loc);
        const hasCollectible = locHasUncollectedCollectible(loc);

        let statusText = '<span style="opacity:0.4;">[UNKNOWN]</span>';
        let rowCls = 'map-detail-row';
        if (isYou) {
          statusText = '<span class="map-you-marker">[CURRENT]</span>';
          rowCls += ' map-detail-row--current';
        } else if (wasVisited) {
          statusText = '<span style="opacity:0.8;">[VISITED]</span>';
          rowCls += ' map-detail-row--visited';
        }

        const collectibleBadge = hasCollectible
          ? `<span class="map-collectible-badge">[?]</span>`
          : '';

        html += `
          <div class="${rowCls}">
            <span>- ${escapeHtml(loc)}${collectibleBadge}</span>
            <span style="font-size:9px;white-space:nowrap;">${statusText}</span>
          </div>
        `;
      });
    }

    html += `</div>`;
    display.innerHTML = html;
    return;
  }

  // ── ZOOM LEVEL 1: STRATEGIC WORLD VIEW ───────────────────────────
  // Size is a pure function of state.mapView (persisted) — no width measurement.
  // 'full' → 6×6 grid; 'auto' and 'core' → 4×4 core grid (rows 2–5, cols 2–5).
  const mv = state.mapView || 'auto';
  const useFull = mv === 'full';

  const rowMin = useFull ? 1 : 2;
  const rowMax = useFull ? 6 : 5;
  const colMin = useFull ? 1 : 2;
  const colMax = useFull ? 6 : 5;
  const cols = colMax - colMin + 1;

  // Build zone lookup by grid position
  const gridMap = {};
  zones.forEach(z => {
    gridMap[`${z.gridRow},${z.gridCol}`] = z;
  });

  // Compute ONE winning grid key for current location to prevent multi-highlight
  let currentZoneKey = null;
  if (currentLoc) {
    let bestScore = 0,
      bestLen = 0;
    Object.entries(gridMap).forEach(([key, zone]) => {
      const score = scoreZoneForLoc(zone, currentLoc);
      if (score > bestScore || (score > 0 && score === bestScore && zone.name.length > bestLen)) {
        bestScore = score;
        bestLen = zone.name.length;
        currentZoneKey = score >= 50 ? key : null;
      }
    });
    if (bestScore < 50) currentZoneKey = null;
  }

  // Compass column labels (W → E)
  const compassCols = [];
  for (let c = colMin; c <= colMax; c++) {
    if (c === colMin) compassCols.push('W');
    else if (c === colMax) compassCols.push('E');
    else compassCols.push('·');
  }

  let html = `<div style="display:grid; grid-template-columns:14px repeat(${cols},minmax(0,1fr)); gap:2px; font-size:9px; letter-spacing:0.3px; margin:4px 0; max-width:100%;">`;

  // Compass header row
  html += `<div></div>`; // corner spacer
  compassCols.forEach(lbl => {
    html += `<div style="text-align:center;font-size:8px;opacity:0.35;line-height:1.4;">${lbl}</div>`;
  });

  for (let r = rowMin; r <= rowMax; r++) {
    // Row N/S label
    let rowLbl = '·';
    if (r === rowMin) rowLbl = 'N';
    else if (r === rowMax) rowLbl = 'S';
    html += `<div style="display:flex;align-items:center;justify-content:center;font-size:8px;opacity:0.35;">${rowLbl}</div>`;

    for (let c = colMin; c <= colMax; c++) {
      const zone = gridMap[`${r},${c}`] || null;
      if (!zone) {
        html += `<div class="map-cell map-cell--empty"></div>`;
        continue;
      }

      const isYou = currentZoneKey === `${r},${c}`;
      const wasVisited = zoneVisited(zone);
      const hasUncollected = zoneHasUncollectedCollectible(zone);

      let cellCls = 'map-cell';
      if (isYou) cellCls += ' map-cell--current';
      else if (wasVisited) cellCls += ' map-cell--visited';

      const collectiblePip = hasUncollected ? `<span class="map-cell-pip">[?]</span>` : '';
      const displayName = escapeHtml(_mapAbbrev(zone.name));

      html += `<div class="${cellCls}" onclick="zoomMapToZone('${escapeHtml(zone.name.replace(/'/g, "\\'"))}')" title="${escapeHtml(zone.name)}">
        <span class="map-cell-name">${displayName}</span>
        ${collectiblePip}
      </div>`;
    }
  }

  html += '</div>';

  // Legend + toggle button (shown on all widths; persists view preference via state.mapView)
  const toggleBtn = useFull
    ? `<button class="map-toggle-btn" onclick="setMapView('core')">CORE VIEW</button>`
    : `<button class="map-toggle-btn" onclick="setMapView('full')">FULL MAP</button>`;

  html += `<div class="map-legend">N=CURRENT &nbsp;·=VISITED &nbsp;[?]=COLLECTIBLE &nbsp;TAP=ZOOM ${toggleBtn}</div>`;
  display.innerHTML = html;
}

// ── FACTION REPUTATION — inline editing (Implementation 3) ─────────
// adjustFaction(key, field, delta) — nudges fame or infamy by delta.
// Called by inline [+] / [-] buttons in each faction card.
// Clamps to 0–1000. Saves state and re-renders.
function adjustFaction(key, field, delta) {
  if (!state.factions) state.factions = {};
  if (!state.factions[key]) state.factions[key] = { fame: 0, infamy: 0 };
  const cur = state.factions[key][field] || 0;
  state.factions[key][field] = Math.max(0, Math.min(1000, cur + delta));
  saveState();
  renderFactionRep();
  _updatePanelBadges();
}

function renderFactionRep() {
  const container = document.getElementById('factionContainer');
  if (!container) return;
  const factions = state.factions || {};

  // Build faction card with inline [+]/[-] fame/infamy nudges.
  // Net standing label shown prominently; reputation trend bar and threshold
  // markers (Vilified/Idolized) give at-a-glance progress context.
  // Mobile-friendly: buttons have min 28×28px touch targets via CSS class.
  function factionCard(f) {
    const data = factions[f.key] || { fame: 0, infamy: 0 };
    const s = getFactionStanding(f.key, data.fame, data.infamy);
    const famVal = data.fame || 0;
    const infamyVal = data.infamy || 0;

    // Net rep for bar: ranges -100 (pure infamy) to +100 (pure fame).
    // bar fill = fame fraction; threshold markers at ±75 standing.
    const total = famVal + infamyVal || 1;
    const netPct = Math.min(100, Math.max(0, (famVal / total) * 100));
    // Vilified threshold marker = 25% (infamy dominant), Idolized = 75%
    const barHtml = `
      <div class="faction-rep-bar-track" title="Fame ${famVal} / Infamy ${infamyVal}">
        <div class="faction-rep-bar-fill" style="width:${netPct}%;background:${s.color};"></div>
        <div class="faction-rep-bar-marker" style="left:25%;" title="Vilified threshold"></div>
        <div class="faction-rep-bar-marker" style="left:75%;" title="Idolized threshold"></div>
      </div>`;

    return `<div class="faction-card">
      <span class="faction-card-name" title="${escapeHtml(f.name)}">${escapeHtml(f.name).toUpperCase()}</span>
      <span class="faction-card-standing" style="color:${s.color};">${s.label}</span>
      <span class="faction-card-counts">F:${famVal} / I:${infamyVal}</span>
      ${barHtml}
      <div class="faction-card-btns">
        <button class="faction-btn faction-btn--fame" title="Fame +50" onclick="adjustFaction('${f.key}','fame',50)">F+</button>
        <button class="faction-btn faction-btn--fame" title="Fame -50" onclick="adjustFaction('${f.key}','fame',-50)">F-</button>
        <button class="faction-btn faction-btn--infamy" title="Infamy +50" onclick="adjustFaction('${f.key}','infamy',50)">I+</button>
        <button class="faction-btn faction-btn--infamy" title="Infamy -50" onclick="adjustFaction('${f.key}','infamy',-50)">I-</button>
      </div>
    </div>`;
  }

  const major = getFactionRegistry().filter(f => f.tier === 'major');
  const minor = getFactionRegistry().filter(f => f.tier === 'minor');

  // Bug fix: save the open state of the minor-factions <details> panel
  // before replacing innerHTML, so clicking F+/F-/I+/I- doesn't collapse it.
  const minorDetails = container.querySelector('details');
  const minorWasOpen = minorDetails ? minorDetails.open : false;

  container.innerHTML = `
    <div style="font-size:9px;opacity:0.45;margin-bottom:4px;letter-spacing:0.5px;">F+/F- = Fame ±50 &nbsp; I+/I- = Infamy ±50 &nbsp; BAR = F/(F+I) ratio</div>
    <div class="faction-grid">
      ${major.map(factionCard).join('')}
    </div>
    <details style="margin-top:6px;">
      <summary style="font-size:11px;letter-spacing:1px;opacity:0.6;cursor:pointer;user-select:none;list-style:none;outline:none;font-family:inherit;padding:2px 0;">[+] MINOR FACTIONS</summary>
      <div class="faction-grid" style="margin-top:5px;">
        ${minor.map(factionCard).join('')}
      </div>
    </details>
  `;

  // Restore open state after re-render
  if (minorWasOpen) {
    const newDetails = container.querySelector('details');
    if (newDetails) newDetails.open = true;
  }
}

// ── G4: EXPANDED KARMA SYSTEM (FO3) ─────────────────────────────
// When gameContext === 'FO3': Karma Center shown, Faction Standing hidden.
// When gameContext === 'FNV' (or default): Faction Standing shown, Karma Center hidden.
// Thresholds: Very Evil (<-750) / Evil (<-250) / Neutral / Good (>250) / Very Good (>750).
// Differentiated by text labels and brightness — no multi-color.
function renderKarmaCenter() {
  const display = document.getElementById('karmaCenterDisplay');
  if (!display) return;

  const karma = state.karma || 0;
  let label, opacity, hitSquad;
  if (karma <= -750) {
    label = 'VERY EVIL';
    opacity = 1.0;
    hitSquad = true;
  } else if (karma <= -250) {
    label = 'EVIL';
    opacity = 0.85;
    hitSquad = false;
  } else if (karma < 250) {
    label = 'NEUTRAL';
    opacity = 0.65;
    hitSquad = false;
  } else if (karma < 750) {
    label = 'GOOD';
    opacity = 0.85;
    hitSquad = false;
  } else {
    label = 'VERY GOOD';
    opacity = 1.0;
    hitSquad = false;
  }

  const barPct = Math.max(0, Math.min(100, ((karma + 1000) / 2000) * 100));
  let html = `
    <div style="text-align:center;font-size:18px;letter-spacing:3px;filter:brightness(${opacity + 0.4});padding:6px 0;">${label}</div>
    <div style="font-size:11px;opacity:0.6;text-align:center;margin-bottom:6px;">KARMA: ${karma > 0 ? '+' : ''}${karma}</div>
    <div style="background:rgba(20,253,206,0.1);height:4px;border-radius:2px;margin:0 0 8px;">
      <div style="height:4px;width:${barPct}%;background:var(--robco-green);border-radius:2px;transition:width 0.4s;"></div>
    </div>`;

  if (hitSquad) {
    html += `<div style="font-size:10px;letter-spacing:1px;opacity:0.8;border:1px dashed rgba(255,80,80,0.6);padding:4px 6px;margin-bottom:6px;">[!] ENCLAVE HIT SQUAD RISK</div>`;
  }

  // Companion availability notes based on karma
  html += `<div style="font-size:10px;opacity:0.55;margin-top:4px;">`;
  if (karma >= 250) {
    html += `COMPANIONS: Dogmeat, Fawkes, Star Paladin Cross available`;
  } else if (karma <= -250) {
    html += `COMPANIONS: Clover, Jericho available`;
  } else {
    html += `COMPANIONS: Charon, Sergeant RL-3 available`;
  }
  html += `</div>`;

  display.innerHTML = html;
}

// Switch faction/karma panels based on game context (called from loadUI).
function _updateContextPanels() {
  const isFO3 = typeof state !== 'undefined' && state.gameContext === 'FO3';
  const factionPanel = document.getElementById('factionPanel');
  const karmaPanel = document.getElementById('karmaPanel');
  if (factionPanel) {
    // Let the tab system control visibility via tab-visible; just toggle display
    factionPanel.style.display = isFO3 ? 'none' : '';
  }
  if (karmaPanel) {
    // Only show if on stat tab and FO3 mode; otherwise hide
    karmaPanel.style.display = isFO3 ? '' : 'none';
  }
}

function undoLastSync() {
  try {
    if (window._lastStateBeforeSync) {
      let prev = JSON.parse(window._lastStateBeforeSync);
      state = { ...state, ...prev };
      window._lastStateBeforeSync = null;
      let undoBtn = document.getElementById('undoSyncBtn');
      if (undoBtn) undoBtn.style.display = 'none';
      loadUI();
      appendToChat('> STATE ROLLBACK COMPLETE. PREVIOUS TELEMETRY RESTORED.', 'sys', true);
    } else if (localStorage.getItem('robco_backup')) {
      let prev = JSON.parse(localStorage.getItem('robco_backup'));
      if (prev.robco_v8) {
        localStorage.setItem('robco_v8', JSON.stringify(prev.robco_v8));
        localStorage.removeItem('robco_backup');
        alert('> HARD BACKUP RESTORED SUCCESSFULLY. REBOOTING SYSTEM...');
        window.location.reload();
      }
    } else {
      appendToChat('> NO RECENT SYNC TO UNDO.', 'sys', true);
    }
  } catch (e) {
    appendToChat('> ROLLBACK FAILED: DATA CORRUPTED.', 'sys', true);
  }
}

// ── TEXT FORMATTING HELPERS ──────────────────────────────────────────
function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
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

  if (sender === 'ai' && !isHistoryLoad) {
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

function tradeItem(name, price, isVendor) {
  let macro = isVendor ? `[BUY] ${name}` : `[SELL] ${name}`;
  document.getElementById('chatInput').value = `> ${macro}`;
  closeModal();
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
  appendToChat('> Type [CONTEXT: FNV] for Fallout: New Vegas', 'sys', true);
  appendToChat('> Type [CONTEXT: FO3] for Fallout 3', 'sys', true);
  appendToChat('> Or the AI will detect your game automatically.', 'sys', true);
}

// ── SAVE SLOTS (#6) ────────────────────────────────────────────────
// 3 named slots (A/B/C) stored as robco_slot_1/2/3 in localStorage.
// Each slot stores the full envelope {version, state, chat, playstyle, savedAt, slotName}.
const SLOT_NAMES = ['A', 'B', 'C'];
function _slotKey(n) {
  return `robco_slot_${n}`;
}
function _slotLabel(n) {
  return `SLOT ${SLOT_NAMES[n - 1]}`;
}

function saveToSlot(slotNum) {
  syncStateFromDom();
  const envelope = {
    version: APP_VERSION,
    state: JSON.parse(JSON.stringify(state)),
    chat: chatHistory.slice(-200),
    playstyle: localStorage.getItem('robco_playstyle') || 'any',
    savedAt: Date.now(),
    slotName: _slotLabel(slotNum),
    gameContext: state.gameContext || 'FNV', // F5: store game context in envelope
  };
  try {
    localStorage.setItem(_slotKey(slotNum), JSON.stringify(envelope));
    const el = document.getElementById('slotStatus');
    const ts = new Date(envelope.savedAt).toLocaleTimeString();
    const ctx = envelope.gameContext;
    if (el) el.textContent = `${_slotLabel(slotNum)} [${ctx}] saved at ${ts}`;
    appendToChat(`> [SAVE] ${_slotLabel(slotNum)} [${ctx}] written at ${ts}`, 'sys', true);
  } catch (e) {
    appendToChat('> [ERROR] Save slot write failed — storage quota exceeded.', 'sys', true);
  }
}

function loadFromSlot(slotNum) {
  const raw = localStorage.getItem(_slotKey(slotNum));
  if (!raw) {
    appendToChat(`> [LOAD] ${_slotLabel(slotNum)} is empty.`, 'sys', true);
    return;
  }
  try {
    let env = JSON.parse(raw);
    // F5: Warn on gameContext mismatch between slot and current session
    const slotCtx = env.gameContext || env.state?.gameContext || 'FNV';
    const curCtx = state.gameContext || 'FNV';
    if (slotCtx !== curCtx) {
      const ok = confirm(
        `> CONTEXT MISMATCH\n\nThis save is a ${slotCtx} campaign.\nYou are currently in ${curCtx} mode.\n\nLoading will switch to ${slotCtx}. Continue?`
      );
      if (!ok) return;
    }
    if (typeof migrateState === 'function')
      env.state = migrateState(env.version || '1.0', env.state);
    state = { ...state, ...env.state };
    if (env.chat && Array.isArray(env.chat)) restoreChatHistory(env.chat);
    if (env.playstyle) {
      localStorage.setItem('robco_playstyle', env.playstyle);
      let el = document.getElementById('playstyleInput');
      if (el) el.value = env.playstyle;
    }
    loadUI();
    const ts = env.savedAt ? new Date(env.savedAt).toLocaleString() : 'unknown';
    const ctx = slotCtx;
    appendToChat(`> [LOAD] ${_slotLabel(slotNum)} [${ctx}] restored. Saved: ${ts}`, 'sys', true);
    const statusEl = document.getElementById('slotStatus');
    if (statusEl) statusEl.textContent = `${_slotLabel(slotNum)} [${ctx}] loaded (saved: ${ts})`;
  } catch (e) {
    appendToChat('> [ERROR] Save slot corrupted or unreadable.', 'sys', true);
  }
}

// ── QUEST LOG HELPERS (#1) ──────────────────────────────────────────
function addQuest() {
  const name = (document.getElementById('newQuestName') || {}).value?.trim();
  if (!name) return;
  const status = (document.getElementById('newQuestStatus') || {}).value || 'active';
  const obj = (document.getElementById('newQuestObjective') || {}).value?.trim() || null;
  if (!state.quests) state.quests = [];
  state.quests.push({ name, status, objective: obj });
  document.getElementById('newQuestName').value = '';
  document.getElementById('newQuestObjective').value = '';
  loadUI();
}

// ── SESSION STATISTICS HELPERS (#8) ────────────────────────────────
function resetSessionStats() {
  state.stats = { kills: 0, capsEarned: 0, damageDealt: 0, sessionStart: Date.now() };
  saveState();
  renderSessionStats();
}

// ── TOKEN BUDGET DISPLAY (#17) ────────────────────────────────────────
// Rough estimate: 1 token ≈ 4 chars. Updates on textarea input.
function updateTokenBudget() {
  const el = document.getElementById('tokenBudgetDisplay');
  if (!el) return;
  const model = (document.getElementById('apiModelInput') || {}).value || '';
  const ctxLimit = model.includes('1.5') ? 1000000 : model.includes('2.0') ? 1000000 : 128000;
  // Estimate: system directive (~2,875 tokens) + databaseCSVs (~3,200 tokens, now always in systemInstruction) + chat history + state + user input
  const directiveEst = 6500;
  const chatEst = Math.round(chatHistory.reduce((a, m) => a + m.text.length, 0) / 4);
  const stateEst = Math.round(JSON.stringify(state).length / 4);
  const inputEst = Math.round((document.getElementById('chatInput')?.value?.length || 0) / 4);
  const total = directiveEst + chatEst + stateEst + inputEst;
  const pct = Math.round((total / ctxLimit) * 100);
  el.textContent = `~${total.toLocaleString()} / ${(ctxLimit / 1000).toFixed(0)}K tokens (${pct}%)`;
  el.style.color =
    pct > 80 ? 'var(--robco-danger)' : pct > 50 ? 'var(--robco-alert)' : 'var(--robco-blue)';
}

function triggerFileInput() {
  document.getElementById('fileInput').click();
}
function restoreChatHistory(history) {
  chatHistory = history.slice(-CHAT_MAX);
  const chatBox = document.getElementById('chatDisplay');
  if (chatBox) {
    chatBox.innerHTML = '';
    chatHistory.forEach(msg => appendToChat(msg.text, msg.sender, true));
  }
  clearTimeout(_chatSaveTimer);
  localStorage.setItem('robco_chat', JSON.stringify(chatHistory));
}
function handleFileUpload(event) {
  const file = event.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = function (e) {
    try {
      const parsed = JSON.parse(e.target.result);
      if (parsed.robco_v8) {
        // v8 Container payload
        localStorage.setItem(
          'robco_backup',
          JSON.stringify({ robco_v8: JSON.parse(localStorage.getItem('robco_v8') || '{}') })
        );
        localStorage.setItem('robco_v8', JSON.stringify(parsed.robco_v8));
        if (parsed.chat && Array.isArray(parsed.chat))
          localStorage.setItem('robco_chat', JSON.stringify(parsed.chat));
        if (parsed.playstyle) localStorage.setItem('robco_playstyle', parsed.playstyle);
        alert('>> HARD BACKUP RESTORED SUCCESSFULLY. REBOOTING SYSTEM... <<');
        window.location.reload();
      } else if (parsed.version && parsed.state) {
        // Envelope format (v1.6.3+): contains state, chat, playstyle
        autoImportState(JSON.stringify(parsed.state));
        if (parsed.chat && Array.isArray(parsed.chat)) restoreChatHistory(parsed.chat);
        if (parsed.playstyle) {
          localStorage.setItem('robco_playstyle', parsed.playstyle);
          let el = document.getElementById('playstyleInput');
          if (el) el.value = parsed.playstyle;
        }
        alert('>> LEGACY BACKUP RESTORED SUCCESSFULLY <<');
      } else {
        // Legacy: bare state JSON
        autoImportState(e.target.result);
        alert('>> LEGACY BACKUP RESTORED SUCCESSFULLY <<');
      }
    } catch (err) {
      appendToChat('> [SYS-ALERT: SAVE FILE CORRUPTED OR UNREADABLE]', 'sys');
    }
  };
  reader.readAsText(file);
}

function triggerImageUpload() {
  document.getElementById('imageInput').click();
}
function handleImageSelection(event) {
  const file = event.target.files[0];
  if (!file) return;
  attachedImageMimeType = file.type;
  const reader = new FileReader();
  reader.onload = function (e) {
    attachedImageData = e.target.result;
    const preview = document.getElementById('imagePreview');
    preview.src = attachedImageData;
    preview.style.display = 'block';
  };
  reader.readAsDataURL(file);
}

// ── REGISTRY AUTOCOMPLETE (Phase 3) ──────────────────────────────────────────
/**
 * Shared singleton autocomplete panel for registry-backed text inputs.
 * Wires #newQuestName  → quests  category
 *       #newItemName   → items   category
 *
 * Behaviour:
 *  - Triggers after 2+ chars, debounced 150 ms.
 *  - Keyboard: ArrowUp / ArrowDown to navigate, Enter to select, Escape to dismiss.
 *  - Click item to fill and dismiss.
 *  - Dismisses automatically on blur (after a 100 ms grace for click events).
 *  - Does NOT modify state, save, or undo — pure UI read-only helper.
 */
function initRegistryAutocomplete() {
  // Build the singleton panel once
  var panel = document.getElementById('acPanel');
  if (!panel) {
    panel = document.createElement('div');
    panel.id = 'acPanel';
    panel.className = 'autocomplete-panel';
    panel.setAttribute('role', 'listbox');
    document.body.appendChild(panel);
  }

  var _acTimer = null;
  var _acActiveIdx = -1;
  var _acResults = [];
  var _acCurrentInput = null;

  function acHide() {
    panel.classList.remove('ac-visible');
    _acActiveIdx = -1;
    _acResults = [];
    _acCurrentInput = null;
  }

  function acPosition(inputEl) {
    var rect = inputEl.getBoundingClientRect();
    panel.style.top = rect.bottom + 2 + 'px';
    panel.style.left = rect.left + 'px';
    // Clamp to viewport right edge
    var panelW = Math.min(340, Math.max(220, rect.width));
    panel.style.width = panelW + 'px';
  }

  function acRender(results, inputEl) {
    _acResults = results;
    _acActiveIdx = -1;
    panel.innerHTML = '';

    if (!results.length) {
      var empty = document.createElement('div');
      empty.className = 'ac-empty';
      empty.textContent = 'No matches';
      panel.appendChild(empty);
    } else {
      results.forEach(function (entry, i) {
        var item = document.createElement('div');
        item.className = 'ac-item';
        item.setAttribute('role', 'option');
        item.dataset.idx = i;

        var nameSpan = document.createElement('span');
        nameSpan.className = 'ac-item-name';
        nameSpan.textContent = entry.name;

        var tagSpan = document.createElement('span');
        tagSpan.className = 'ac-item-tag';
        // Show type or dlc as a tag hint
        var tag = entry.type || '';
        if (entry.dlc) tag += ' [' + entry.dlc.toUpperCase() + ']';
        if (entry.level > 0) tag += ' L' + entry.level;
        tagSpan.textContent = tag;

        item.appendChild(nameSpan);
        if (tag) item.appendChild(tagSpan);

        item.addEventListener('mousedown', function (e) {
          // Use mousedown so it fires before blur
          e.preventDefault();
          if (_acCurrentInput) {
            _acCurrentInput.value = entry.name;
            // Trigger input event so any live listeners see the change
            _acCurrentInput.dispatchEvent(new Event('input', { bubbles: true }));
          }
          acHide();
        });

        panel.appendChild(item);
      });
    }

    acPosition(inputEl);
    panel.classList.add('ac-visible');
  }

  function acSetActive(idx) {
    var items = panel.querySelectorAll('.ac-item');
    items.forEach(function (el) {
      el.classList.remove('ac-active');
    });
    if (idx >= 0 && idx < items.length) {
      items[idx].classList.add('ac-active');
      items[idx].scrollIntoView({ block: 'nearest' });
    }
    _acActiveIdx = idx;
  }

  function wireInput(inputId, category) {
    var el = document.getElementById(inputId);
    if (!el) return;

    el.addEventListener('input', function () {
      clearTimeout(_acTimer);
      var q = el.value;
      if (q.length < 2) {
        acHide();
        return;
      }
      _acCurrentInput = el;
      _acTimer = setTimeout(function () {
        var results = registrySearch(category, q);
        acRender(results, el);
      }, 150);
    });

    el.addEventListener('keydown', function (e) {
      if (!panel.classList.contains('ac-visible')) return;
      var itemCount = _acResults.length;
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        acSetActive(Math.min(_acActiveIdx + 1, itemCount - 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        acSetActive(Math.max(_acActiveIdx - 1, 0));
      } else if (e.key === 'Enter') {
        if (_acActiveIdx >= 0 && _acResults[_acActiveIdx]) {
          e.preventDefault();
          el.value = _acResults[_acActiveIdx].name;
          el.dispatchEvent(new Event('input', { bubbles: true }));
          acHide();
        }
      } else if (e.key === 'Escape') {
        acHide();
      }
    });

    el.addEventListener('blur', function () {
      // 100 ms grace: mousedown on an item fires before blur resolves
      setTimeout(acHide, 120);
    });

    el.addEventListener('focus', function () {
      // Reopen if there's already enough text (e.g. user tabbed back)
      var q = el.value;
      if (q.length >= 2) {
        _acCurrentInput = el;
        var results = registrySearch(category, q);
        if (results.length) acRender(results, el);
      }
    });
  }

  // Wire all three registry-backed inputs
  wireInput('newQuestName', 'quests');
  wireInput('newItemName', 'items');
  wireInput('newPerkName', 'perks');

  // Reposition on scroll/resize so the panel doesn't orphan
  window.addEventListener(
    'scroll',
    function () {
      if (_acCurrentInput && panel.classList.contains('ac-visible')) {
        acPosition(_acCurrentInput);
      }
    },
    { passive: true }
  );
  window.addEventListener('resize', function () {
    if (_acCurrentInput && panel.classList.contains('ac-visible')) {
      acPosition(_acCurrentInput);
    }
  });
}

// ── AMMO DATALIST ─────────────────────────────────────────────────────────
// Populates the #ammoCalibers <datalist> with unique caliber names from
// AMMO.CSV in database.js. Called once on window.onload.
function initAmmoDatalist() {
  const dl = document.getElementById('ammoCalibers');
  if (!dl) return;
  if (typeof getAmmoCalibers !== 'function') return;
  const calibers = getAmmoCalibers();
  dl.innerHTML = calibers.map(c => `<option value="${c}"></option>`).join('');
}
