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
  masterMute: localStorage.getItem('robco_master_muted') === 'true',
};

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
  if (localStorage.getItem('robco_v7')) {
    let savedState = JSON.parse(localStorage.getItem('robco_v7'));
    // #16 Save Version Migration — upgrade old saves in-place before spreading into state
    if (typeof migrateState === 'function')
      savedState = migrateState(savedState.version || '1.0', savedState);
    state = { ...state, ...savedState };
  } else {
    // Fresh load: run migration to populate all new fields
    if (typeof migrateState === 'function') state = migrateState(APP_VERSION, state);
  }
  // ── FACTION MIGRATION: old flat keys (nf/ni/lf/li/sf/si) → state.factions ──
  if (state.nf !== undefined) {
    if (!state.factions) state.factions = {};
    FACTION_REGISTRY.forEach(f => {
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
  FACTION_REGISTRY.forEach(f => {
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
  setupHpBarInteraction();
  startCrtHum();
  initRegistryAutocomplete();

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
  });

  // Defer changelog display until after boot sequence completes
  let needsChangelog = false;
  if (localStorage.getItem('robco_version') !== APP_VERSION) {
    localStorage.setItem('robco_version', APP_VERSION);
    needsChangelog = true;
  }

  runBootSequence(() => {
    if (needsChangelog) {
      fetch('changelog.txt')
        .then(r => r.text())
        .then(text => {
          const entries = text.split(/\r?\n(?=v\d+\.\d+)/);
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
      const briefing = [
        `> LOC: ${state.loc} | ${ticksToGameTime(state.ticks)} | HP: ${state.hpCur}/${state.hpMax}`,
        `> CAPS: ${state.caps} | RADS: ${state.rads} | SQUAD: ${companionNames}`,
        limbStatus.length > 0 ? `> ⚠ CRIPPLED: ${limbStatus.join(', ').toUpperCase()}` : null,
        lastNote ? `> LAST NOTE: ${lastNote}` : null,
      ]
        .filter(Boolean)
        .join('\n');
      appendToChat(briefing, 'sys', true);
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

function runBootSequence(onComplete) {
  const bootScreen = document.getElementById('bootScreen');
  if (!bootScreen) {
    if (onComplete) onComplete();
    return;
  }
  const bootLines = document.getElementById('bootLines');
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
    const html = `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><title>RobCo U.O.S. Campaign Log</title><style>body{background:#010a07;color:${fg};font-family:'Courier New',monospace;padding:20px;font-size:13px;line-height:1.5;}.header{text-align:center;border-bottom:1px dashed ${fg};padding-bottom:10px;margin-bottom:20px;letter-spacing:2px;}</style></head><body><div class="header"><h1>ROBCO INDUSTRIES U.O.S.<br>AFTER-ACTION CAMPAIGN LOG</h1><p>Courier: ${escapeHtml(state.loc || '?')} | ${ticksToGameTime(state.ticks || 0)} | Lv.${state.lvl || 1}</p></div>${rows}</body></html>`;
    _downloadBlob(html, 'text/html', 'robco_campaign_log.html');
    return;
  }

  if (format === 'md') {
    // #27 Export as Markdown
    let md = `# RobCo U.O.S. — Campaign Log\n\n`;
    md += `**Location:** ${state.loc || '?'} | **Time:** ${ticksToGameTime(state.ticks || 0)} | **Level:** ${state.lvl || 1}\n\n---\n\n`;
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
    { h2text: '> BACKPACK INVENTORY', count: (state.inventory || []).length },
    { h2text: '> SQUAD STATUS', count: (state.squad || []).length },
    { h2text: '> STATUS EFFECTS', count: (state.status || []).filter(s => s.ticks !== 0).length },
    { h2text: '> CAMPAIGN NOTES', count: (state.campaign_notes || []).length },
    {
      h2text: '> QUEST LOG',
      count: (state.quests || []).filter(q => q.status === 'active' || !q.status).length,
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
// Called by autoImportState() after a state delta with the changed category key.
// Opens the relevant panel so the Courier can immediately see what changed.
function expandPanelForCategory(categoryKey) {
  const map = {
    squad: '> SQUAD STATUS',
    status: '> STATUS EFFECTS',
    inventory: '> BACKPACK INVENTORY',
    campaign_notes: '> CAMPAIGN NOTES',
    perks: '> PERKS',
    factions: '> FACTION STANDING',
    quests: '> QUEST LOG',
    equipped: '> EQUIPPED',
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
}

function showFullChangelog() {
  fetch('changelog.txt')
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
  // TIME: decompose ticks → D/H/M inputs
  {
    const t = state.ticks || 0;
    const day = Math.floor(t / 240) + 1;
    const hr = Math.floor((t % 240) / 10);
    const mn = (t % 10) * 6;
    const dayEl = document.getElementById('time_day');
    const hrEl = document.getElementById('time_hour');
    const minEl = document.getElementById('time_min');
    const hidden = document.getElementById('stat_ticks');
    if (dayEl) dayEl.value = day;
    if (hrEl) hrEl.value = hr;
    if (minEl) minEl.value = mn;
    if (hidden) hidden.value = t; // keep hidden field in sync
  }
  // Skills
  SKILL_KEYS.forEach(sk => {
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
  renderSquad();
  renderStatus();
  renderCampaignNotes();
  renderFactionRep();
  renderPerks();
  renderQuests();
  renderSessionStats();
  renderEquipped();
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
// Called by oninput on the D/H/M inputs. Clamps values and triggers a save.
function onTimeInputChanged() {
  const dayEl = document.getElementById('time_day');
  const hrEl = document.getElementById('time_hour');
  const minEl = document.getElementById('time_min');
  if (!dayEl || !hrEl || !minEl) return;
  // Clamp
  if (parseInt(dayEl.value) < 1 || isNaN(parseInt(dayEl.value))) dayEl.value = 1;
  if (parseInt(hrEl.value) < 0) hrEl.value = 0;
  if (parseInt(hrEl.value) > 23) hrEl.value = 23;
  if (parseInt(minEl.value) < 0) minEl.value = 0;
  if (parseInt(minEl.value) > 59) minEl.value = 59;

  state.ticks = gameTimeToTicks(parseInt(dayEl.value), parseInt(hrEl.value), parseInt(minEl.value));
  saveState();
}

// ── KARMA / HP change tracking (for flash effects) ────────────
let _lastKarma = null,
  _lastHpPct = null;

function updateMath() {
  let maxAp = 65 + state.a * 3;
  document.getElementById('display_ap').innerText = maxAp;
  let maxWeight = 150 + state.s * 10;
  let curWt = state.inventory.reduce((acc, item) => acc + item.qty * item.wgt, 0);
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
  }

  // XP progress bar
  let xpFill = document.getElementById('xp_bar_fill');
  if (xpFill) {
    let lvl = state.lvl || 1;
    let xp = state.xp || 0;
    let xpCur = 25 * (lvl * lvl) + 125 * lvl - 150;
    let xpNext = 25 * ((lvl + 1) * (lvl + 1)) + 125 * (lvl + 1) - 150;
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

  saveState();
}

function addItem() {
  let n = document.getElementById('newItemName').value;
  let q = parseFloat(document.getElementById('newItemQty').value) || 1;
  let w = parseFloat(document.getElementById('newItemWeight').value) || 0;
  let v = parseFloat(document.getElementById('newItemValue').value) || 0;
  let t = (document.getElementById('newItemType') || {}).value || 'misc';
  if (!n) return;
  let ex = state.inventory.find(i => i.name.toLowerCase() === n.toLowerCase());
  if (ex) ex.qty += q;
  else state.inventory.push({ name: n, qty: q, wgt: w, val: v, type: t });
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
  lst.innerHTML = state.inventory
    .map((it, i) => {
      const cat = (it.type || 'misc').toLowerCase();
      const typeTag = `<span style="font-size:9px;opacity:0.7;margin-right:3px;color:${typeColors[cat] || 'inherit'};">[${cat.toUpperCase()}]</span>`;
      const wgtStr = it.wgt > 0 ? ` ${it.wgt} lb` : '';
      const valStr = it.val > 0 ? ` · ${it.val}c` : '';
      return `<li><button class="use-btn" data-use="${i}" title="Quick-use: send [USE] ${escapeHtml(it.name)}">USE</button>${typeTag}<span>${it.qty}x ${escapeHtml(it.name)}${wgtStr || valStr ? ` (${wgtStr.trim()}${wgtStr && valStr ? ' ' : ''}${valStr.trim()})` : ''}</span> <button class="delete-btn" data-idx="${i}">X</button></li>`;
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

function renderSquad() {
  const squadDiv = document.getElementById('squadList');
  if (!squadDiv) return;
  if (!state.squad || state.squad.length === 0) {
    squadDiv.innerHTML = '<span style="color: rgba(20, 253, 206, 0.5)">No Active Companions</span>';
    return;
  }
  squadDiv.innerHTML = state.squad
    .map(member => {
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
            <div style="font-weight:bold;">${barStr} ${escapeHtml(member.name)}</div>
            <div style="font-size: 11px; display:flex; justify-content:space-between; margin-top:2px;">
                <span style="color: var(--robco-green)">HP: ${member.hp}/${member.hpMax}</span>
                <span style="color: var(--robco-alert)">AMMO: ${member.ammo}</span>
                <span style="color: var(--robco-danger)">CND: ${escapeHtml(String(member.condition))}</span>
            </div>
            ${member.weapon ? `<div style="font-size:10px;opacity:0.6;margin-top:1px;">WPN: ${escapeHtml(member.weapon)}${member.dt !== undefined ? ' | DT: ' + member.dt : ''}</div>` : ''}
            ${affinityStr}
        </div>`;
    })
    .join('');
}

// ── UTILITY FUNCTIONS ──────────────────────────────────────────
function ticksToGameTime(t) {
  let day = Math.floor(t / 240) + 1;
  let hr = Math.floor((t % 240) / 10);
  let mn = (t % 10) * 6;
  return `D${day} ${String(hr).padStart(2, '0')}:${String(mn).padStart(2, '0')}`;
}

// ── INVERSE: D/H/M → ticks (1 tick = 6 minutes, 10 ticks/hr, 240 ticks/day) ──
// Minute resolution snaps to nearest tick boundary (floor to multiple of 6).
function gameTimeToTicks(day, hour, min) {
  return (day - 1) * 240 + hour * 10 + Math.floor(min / 6);
}

function getFactionStanding(fame, infamy) {
  let net = (fame || 0) - (infamy || 0);
  if (net >= 750) return { label: 'Idolized', color: 'var(--robco-green)' };
  if (net >= 250) return { label: 'Liked', color: 'var(--robco-green)' };
  if (net >= 50) return { label: 'Accepted', color: 'var(--robco-green)' };
  if (net >= -50) return { label: 'Neutral', color: 'var(--robco-alert)' };
  if (net >= -250) return { label: 'Tolerated', color: 'var(--robco-alert)' };
  if (net >= -500) return { label: 'Shunned', color: 'var(--robco-danger)' };
  return { label: 'Vilified', color: 'var(--robco-danger)' };
}

function renderStatus() {
  const statusDiv = document.getElementById('statusList');
  if (!statusDiv) return;
  if (!state.status || state.status.length === 0) {
    statusDiv.innerHTML = '<span style="color: rgba(20,253,206,0.5)">No Active Effects</span>';
    return;
  }
  statusDiv.innerHTML = state.status
    .map(eff => {
      let typeClass =
        eff.type === 'BUFF'
          ? 'effect-buff'
          : eff.type === 'DEBUFF'
            ? 'effect-debuff'
            : 'effect-neutral';
      let tickInfo = eff.ticks > 0 ? ` [${eff.ticks}t]` : '';
      return `<div class="effect-item"><span class="${typeClass}">${escapeHtml(eff.name || '')}${tickInfo}</span><span class="effect-type">${escapeHtml(eff.type || 'BUFF')}</span></div>`;
    })
    .join('');
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
        p =>
          `<li>${escapeHtml(p.name)}${p.rank > 1 ? ' (Rank ' + p.rank + ')' : ''}${p.level_taken ? ' — Lv.' + p.level_taken : ''}</li>`
      )
      .join('') +
    '</ul>';
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
          ? ` <span style="font-size:9px;opacity:0.6;">[${q.factions}]</span>`
          : '';
        return `<li style="color:${color};">[${st.toUpperCase()}] ${escapeHtml(q.name)}${factions}${q.objective ? '<div style="font-size:10px;opacity:0.7;margin-left:10px;">' + escapeHtml(q.objective) + '</div>' : ''}<button class="delete-btn" style="float:right;" onclick="removeQuest(${i})">X</button></li>`;
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
  statsDiv.innerHTML = `
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:4px 8px;font-size:11px;">
            <span style="opacity:0.65;">KILLS</span><span>${s.kills || 0}</span>
            <span style="opacity:0.65;">CAPS EARNED</span><span>${s.capsEarned || 0}</span>
            <span style="opacity:0.65;">DMG DEALT</span><span>${s.damageDealt || 0}</span>
            <span style="opacity:0.65;">SESSION TIME</span><span>${elapsed}m</span>
            <span style="opacity:0.65;">TICKS</span><span>${state.ticks || 0}</span>
            <span style="opacity:0.65;">LOCATION VISITS</span><span>${(state.locationHistory || []).length}</span>
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

function renderCampaignNotes() {
  const notesDiv = document.getElementById('campaignNotesList');
  if (!notesDiv) return;
  if (!state.campaign_notes || state.campaign_notes.length === 0) {
    notesDiv.innerHTML = '<span style="color: rgba(20,253,206,0.5)">No Notes Recorded</span>';
    return;
  }
  notesDiv.innerHTML =
    '<ul class="notes-list">' +
    state.campaign_notes.map(note => `<li>${escapeHtml(String(note))}</li>`).join('') +
    '</ul>';
}

function renderFactionRep() {
  const container = document.getElementById('factionContainer');
  if (!container) return;
  const factions = state.factions || {};

  function factionCard(f) {
    const data = factions[f.key] || { fame: 0, infamy: 0 };
    const s = getFactionStanding(data.fame, data.infamy);
    return `<div style="display:flex;flex-direction:column;align-items:center;gap:3px;padding:5px 3px;border:1px dashed rgba(20,253,206,0.3);text-align:center;min-width:0;">
            <span style="font-size:9px;letter-spacing:0.4px;opacity:0.65;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;width:100%;">${escapeHtml(f.name)}</span>
            <span style="font-size:10px;font-weight:bold;color:${s.color};">${s.label}</span>
        </div>`;
  }

  const major = FACTION_REGISTRY.filter(f => f.tier === 'major');
  const minor = FACTION_REGISTRY.filter(f => f.tier === 'minor');

  container.innerHTML = `
        <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:4px;margin-top:4px;">
            ${major.map(factionCard).join('')}
        </div>
        <details style="margin-top:6px;">
            <summary style="font-size:11px;letter-spacing:1px;opacity:0.6;cursor:pointer;user-select:none;list-style:none;outline:none;font-family:inherit;padding:2px 0;">[+] MINOR FACTIONS</summary>
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:4px;margin-top:5px;">
                ${minor.map(factionCard).join('')}
            </div>
        </details>
    `;
}

function undoLastSync() {
  if (!window._lastStateBeforeSync) {
    appendToChat('> NO RECENT SYNC TO UNDO.', 'sys', true);
    return;
  }
  try {
    let prev = JSON.parse(window._lastStateBeforeSync);
    state = { ...state, ...prev };
    window._lastStateBeforeSync = null;
    let undoBtn = document.getElementById('undoSyncBtn');
    if (undoBtn) undoBtn.style.display = 'none';
    loadUI();
    appendToChat('> STATE ROLLBACK COMPLETE. PREVIOUS TELEMETRY RESTORED.', 'sys', true);
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
        if (SKILL_KEYS.includes(skillKey)) {
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
  };
  try {
    localStorage.setItem(_slotKey(slotNum), JSON.stringify(envelope));
    const el = document.getElementById('slotStatus');
    const ts = new Date(envelope.savedAt).toLocaleTimeString();
    if (el) el.textContent = `${_slotLabel(slotNum)} saved at ${ts}`;
    appendToChat(`> [SAVE] ${_slotLabel(slotNum)} written at ${ts}`, 'sys', true);
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
    appendToChat(`> [LOAD] ${_slotLabel(slotNum)} restored. Saved: ${ts}`, 'sys', true);
    const statusEl = document.getElementById('slotStatus');
    if (statusEl) statusEl.textContent = `${_slotLabel(slotNum)} loaded (saved: ${ts})`;
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
      if (parsed.version && parsed.state) {
        // Envelope format (v1.6.3+): contains state, chat, playstyle
        autoImportState(JSON.stringify(parsed.state));
        if (parsed.chat && Array.isArray(parsed.chat)) restoreChatHistory(parsed.chat);
        if (parsed.playstyle) {
          localStorage.setItem('robco_playstyle', parsed.playstyle);
          let el = document.getElementById('playstyleInput');
          if (el) el.value = parsed.playstyle;
        }
      } else {
        // Legacy: bare state JSON
        autoImportState(e.target.result);
      }
      alert('>> HARD BACKUP RESTORED SUCCESSFULLY <<');
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
