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

// ── FIRST-GESTURE AMBIENT-AUDIO ARM ───────────────────────────────────────
// One-shot SFX (level-up jingle, chip clicks, etc.) always fire from a real
// user action, so they naturally land after a gesture. But CONTINUOUS ambient
// starters — the CRT hum (always started at boot) and the Geiger/tinnitus/
// heartbeat loops (started at boot when an existing save already has high
// rads/crippled limbs/critical HP) — were calling ensureAudioCtx() straight
// out of window.onload/updateMath(), long before any gesture. Each blocked
// resume()/node-start attempt logs "AudioContext was not allowed to start",
// and a self-rescheduling loop (Geiger ticks, the ~833ms heartbeat) repeats
// that every cycle until the user's first click/keydown — dozens of warnings
// for a single boot. This defers those starters to the first gesture instead,
// mirroring playBootDrone's (H4) own arming pattern, generalized to a shared
// queue so multiple starters queued before that gesture all fire once, in
// order, off ONE pair of listeners (no stacked duplicate listeners).
let _firstGestureSeen = false;
let _pendingAmbientAudio = [];
function _onFirstAmbientGesture() {
  document.removeEventListener('click', _onFirstAmbientGesture);
  document.removeEventListener('keydown', _onFirstAmbientGesture);
  _firstGestureSeen = true;
  const pending = _pendingAmbientAudio;
  _pendingAmbientAudio = [];
  pending.forEach(fn => fn());
}
function _armAmbientAudio(fn) {
  if (_firstGestureSeen) {
    fn();
    return;
  }
  if (_pendingAmbientAudio.length === 0) {
    document.addEventListener('click', _onFirstAmbientGesture, { once: true });
    document.addEventListener('keydown', _onFirstAmbientGesture, { once: true });
  }
  _pendingAmbientAudio.push(fn);
}

// ── WU-F2 HAPTIC SOLENOID (Vibration API) ─────────────────────────────────
// Brief chassis buzz on key events (level-up, faction-threshold alert, critical
// HP) via navigator.vibrate. Free, offline, no AI, game-agnostic (Protocol 38)
// — operates only on the device's vibration motor, carries no game data.
// Opt-in (default OFF — battery/annoyance-safe), persisted as a localStorage
// device preference (NOT campaign state — so no Protocol-4 save/sync path),
// mirroring the WU-F1 Sustained Power Cell pattern. Three graceful fallbacks:
//   1. Feature-detect — silent no-op where navigator.vibrate is unavailable
//      (desktop/iOS Safari); the toggle is disabled and the panel says so.
//   2. Respect prefers-reduced-motion — never vibrates when the user has
//      reduced motion set (Protocol 17 / Phase-C a11y).
//   3. Any vibrate() throw is swallowed so haptics can never break the terminal.
const HAPTIC_KEY = 'robco_haptic_enabled';
const HAPTIC_PATTERNS = {
  tick: 15, // generic key-clack / transmit tick
  alert: [40, 30, 40], // ⚠ faction threshold / sys-alert
  levelup: [20, 30, 25, 30, 60], // level-up rising pulse
  lowhealth: [60, 40, 60], // critical-HP warning
};
function _hapticSupported() {
  return typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function';
}
function _hapticReducedMotion() {
  return (
    typeof window !== 'undefined' &&
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  );
}
function isHapticEnabled() {
  return MetaStore.get(HAPTIC_KEY) === 'true';
}
// Core fire helper. Accepts a named pattern key or a raw vibrate() argument.
// Returns true only if a real vibration was actually dispatched.
function triggerHaptic(pattern) {
  if (!_hapticSupported()) return false; // 1. graceful no-op where unsupported
  if (!isHapticEnabled()) return false; // opt-in device preference
  if (_hapticReducedMotion()) return false; // 2. a11y: respect reduced motion
  const p = HAPTIC_PATTERNS[pattern] !== undefined ? HAPTIC_PATTERNS[pattern] : pattern;
  try {
    navigator.vibrate(p);
  } catch (_) {
    return false; // 3. never throw out of a haptic call
  }
  return true;
}
function _updateHapticUI() {
  const note = document.getElementById('hapticStatus');
  if (!note) return;
  if (!_hapticSupported()) {
    note.textContent = '> SOLENOID UNAVAILABLE ON THIS UNIT';
    return;
  }
  if (_hapticReducedMotion()) {
    note.textContent = '> SOLENOID HELD — REDUCED-MOTION ACTIVE';
    return;
  }
  note.textContent = isHapticEnabled()
    ? '> SOLENOID ARMED — CHASSIS PULSES ON ALERTS'
    : '> SOLENOID IDLE — NO CHASSIS FEEDBACK';
}
function toggleHaptic(enabled) {
  MetaStore.set(HAPTIC_KEY, enabled ? 'true' : 'false');
  if (typeof playChipClick === 'function') playChipClick(enabled); // B2c: tactile install/eject click
  // Confirmation buzz on enable so the user feels it works immediately.
  if (enabled) triggerHaptic('tick');
  _updateHapticUI();
  if (typeof _logBaySvc === 'function') {
    _logBaySvc(enabled ? 'HAPTIC SOLENOID INSTALLED' : 'HAPTIC SOLENOID REMOVED');
  }
}
function initHaptic() {
  const toggle = document.getElementById('hapticToggle');
  if (!_hapticSupported()) {
    // Graceful fallback: disable the control, surface the unsupported state.
    if (toggle) {
      toggle.checked = false;
      toggle.disabled = true;
    }
    _updateHapticUI();
    return;
  }
  if (toggle) toggle.checked = isHapticEnabled();
  _updateHapticUI();
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
    _armAmbientAudio(() => scheduleGeiger(rate));
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

// Owner report: the CRT hum kept playing while the terminal was powered off.
// Mirrors stopTinnitus()'s full-teardown pattern (stop+disconnect+null every
// node) rather than just zeroing gain, so a subsequent startCrtHum() call
// (guarded on `if (crtHumNode ...) return`) is free to recreate the graph
// instead of finding stale nodes already in place.
function stopCrtHum() {
  if (crtHumLfo) {
    try {
      crtHumLfo.stop();
    } catch (e) {}
    crtHumLfo.disconnect();
    crtHumLfo = null;
  }
  if (crtHumLfoGain) {
    crtHumLfoGain.disconnect();
    crtHumLfoGain = null;
  }
  if (crtHumNode) {
    try {
      crtHumNode.stop();
    } catch (e) {}
    crtHumNode.disconnect();
    crtHumNode = null;
  }
  if (crtHumGain) {
    crtHumGain.disconnect();
    crtHumGain = null;
  }
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

// WU-T1: table-driven optics. Applies the five --robco-* CSS vars for a THEMES key
// (glow + refresh derived from the rgb triplet — single source, never drifts). Apply-only;
// does NOT persist, so the per-game default path can apply without recording an explicit pick.
function _applyThemeVars(key) {
  const t = (typeof THEMES !== 'undefined' && (THEMES[key] || THEMES.green)) || null;
  if (!t) return;
  const root = document.documentElement;
  root.style.setProperty('--robco-green-rgb', t.rgb);
  root.style.setProperty('--robco-green', t.hex);
  root.style.setProperty('--robco-glow', `0 0 6px rgba(${t.rgb}, 0.6)`);
  root.style.setProperty('--robco-dark', t.dark);
  root.style.setProperty('--robco-refresh', `rgba(${t.rgb}, 0.12)`);
}

// Resolution order (WU-T1): explicit pick (robco_optics) is handled by the caller; this
// returns the active game's default optic → falls back to the canon RobCo green. Reads
// _activeDef().theme.defaultOptics — no game literal (Protocol 38); a new game supplies its own.
function _resolveDefaultOptics() {
  try {
    const t = typeof _activeDef === 'function' ? _activeDef().theme : null;
    if (t && t.defaultOptics && typeof THEMES !== 'undefined' && THEMES[t.defaultOptics]) {
      return t.defaultOptics;
    }
  } catch (e) {
    /* fall through to the canon green default */
  }
  return 'green';
}

// Per-game optic storage key — game-agnostic, keyed by the active gameContext so EVERY game
// (FNV, FO3, and any future game) remembers its own optic independently. Adding a game needs
// ZERO theming-code change: a new ctx just uses its own `robco_optic_<ctx>` key + its
// GAME_DEFS[ctx].theme.defaultOptics. No game literal here (Protocol 38).
function _opticStorageKey(ctx) {
  const c = ctx || (typeof getGameContext === 'function' ? getGameContext() : 'FNV');
  return 'robco_optic_' + c;
}

// Resolve the optic to apply for the ACTIVE game: this game's remembered manual pick
// (robco_optic_<ctx>) → the game's default (GAME_DEFS[ctx].theme.defaultOptics) → canon green.
// Migrates a legacy site-wide pick (robco_optics) into this game's key once, then retires it,
// so existing users keep their colour for the game they're on while the other game starts at
// its own default. Game-agnostic.
function _resolveOptic() {
  try {
    const key = _opticStorageKey();
    let saved = MetaStore.get(key);
    if (!saved) {
      const legacy = MetaStore.get('robco_optics');
      if (legacy && typeof THEMES !== 'undefined' && THEMES[legacy]) {
        MetaStore.set(key, legacy);
        MetaStore.remove('robco_optics');
        saved = legacy;
      }
    }
    if (saved && typeof THEMES !== 'undefined' && THEMES[saved]) return saved;
  } catch (_) {
    /* storage unavailable — fall through to the game default */
  }
  return _resolveDefaultOptics();
}

// Dynamic "(Default)" label — tag whichever phosphor-tube button matches the ACTIVE game's
// default optic (GAME_DEFS[ctx].theme.defaultOptics), stripping the tag from all the others.
// Data-driven + game-agnostic: a new game's default tube is labelled with no code change.
// (Step 2 · Phase 2 · B2a: the OPTICS <select> was replaced by the Module Bay tube rack —
// same container id `opticsColorInput`, now a <div> of `.tube` buttons instead of <option>s.)
// The GREEN FAMILY cartridge (WU-optics-picker) is skipped — it carries its own "N TYPES"
// tag instead, and the fan-tray variant sharing its data-optic still gets tagged normally.
function _updateOpticsDefaultLabel() {
  const rack = document.getElementById('opticsColorInput');
  if (!rack) return;
  const def = _resolveDefaultOptics();
  Array.from(rack.querySelectorAll('.tube')).forEach(btn => {
    if (btn.classList.contains('family')) return;
    const tag = btn.querySelector('.t-default');
    if (tag) tag.textContent = btn.dataset.optic === def ? '(DEFAULT)' : '';
  });
}

// Explicit user pick (the OPTICS <select>): apply + persist as THIS GAME's standing choice
// (per-game key), so each game remembers its own optic independently.
function changeOpticsColor(color) {
  _applyThemeVars(color);
  MetaStore.set(_opticStorageKey(), color);
}

// WU-optics-picker: every THEMES key sharing the given family tag, in THEMES declaration
// order. Data-driven (Protocol 38) — reads THEMES[k].family rather than a hardcoded colour
// list, so a future second family works by tagging its rows, not by editing this function.
function _themeFamilyMembers(familyKey) {
  if (!familyKey || typeof THEMES === 'undefined') return [];
  return Object.keys(THEMES).filter(k => THEMES[k].family === familyKey);
}

// The family cartridge's representative member: the currently seated optic if it's IN the
// family; else the active game's default optic if that's in the family; else the family's
// first declared member. Pure derivation — no new persistence (Protocol UI-6 n/a: this is a
// momentary picker gesture, not a view mode).
function _resolveOpticsFamilyRepresentative(familyKey) {
  const members = _themeFamilyMembers(familyKey);
  if (!members.length) return null;
  const seated = typeof _resolveOptic === 'function' ? _resolveOptic() : null;
  if (seated && members.includes(seated)) return seated;
  const def = typeof _resolveDefaultOptics === 'function' ? _resolveDefaultOptics() : null;
  if (def && members.includes(def)) return def;
  return members[0];
}

// Repaints the family cartridge (glass colour, name, ghost ring, aria-label) to represent
// the given member key. UI-only — never persists; changeOpticsColor() remains the single
// writer (Protocol 22).
function _updateOpticsFamilyRepresentative(key) {
  const fam = document.getElementById('opticsFamilyTube');
  if (!fam || typeof THEMES === 'undefined' || !THEMES[key]) return;
  const familyKey = fam.dataset.family;
  const t = THEMES[key];
  fam.dataset.optic = key;
  fam.style.setProperty('--tube', t.hex);
  const nameEl = fam.querySelector('.t-name');
  if (nameEl) nameEl.textContent = t.label;
  const members = _themeFamilyMembers(familyKey);
  const others = members.filter(k => k !== key);
  const ghosts = fam.querySelectorAll('.ghost');
  ghosts.forEach((g, i) => {
    const ok = others[i];
    if (ok && THEMES[ok]) g.style.setProperty('--g', THEMES[ok].hex);
  });
  const familyLabel =
    (typeof OPTIC_FAMILY_LABELS !== 'undefined' && OPTIC_FAMILY_LABELS[familyKey]) ||
    familyKey.toUpperCase();
  fam.setAttribute(
    'aria-label',
    familyLabel +
      ' family — currently ' +
      t.label +
      '. Activate to open cartridge and choose between ' +
      members.length +
      ' ' +
      familyKey +
      ' types.'
  );
}

// Cartridge tap → fans the family out into its variant tubes (mockup: "the cartridge ejects
// its tubes"). Lights whichever variant is currently seated so the choice reads at a glance.
function _expandOpticsFamily(btnEl) {
  if (!btnEl) return;
  const socket = btnEl.closest('.family-socket');
  if (!socket) return;
  socket.classList.add('expanded');
  btnEl.setAttribute('aria-expanded', 'true');
  const seated = typeof _resolveOptic === 'function' ? _resolveOptic() : null;
  const tray = socket.querySelector('.fan-tray');
  if (tray) {
    Array.from(tray.querySelectorAll('.tube')).forEach(t =>
      t.classList.toggle('seated', t.dataset.optic === seated)
    );
  }
  const note = document.getElementById('opticsStatus');
  if (note) {
    const familyLabel =
      (typeof OPTIC_FAMILY_LABELS !== 'undefined' && OPTIC_FAMILY_LABELS[btnEl.dataset.family]) ||
      String(btnEl.dataset.family).toUpperCase();
    note.textContent =
      '> ' +
      familyLabel +
      ' CARTRIDGE OPEN — ' +
      _themeFamilyMembers(btnEl.dataset.family).length +
      ' PHOSPHOR TYPES EXPOSED';
  }
}
window._expandOpticsFamily = _expandOpticsFamily;

// Shell tap (escape hatch, no change) OR the post-pick collapse (reseat=true plays the
// tubeSeat re-latch flourish — a plain CSS animation, neutralized to its final frame by the
// app's global prefers-reduced-motion block, Protocol UI-9).
function _collapseOpticsFamily(reseat) {
  const socket = document.getElementById('opticsFamilySocket');
  const fam = document.getElementById('opticsFamilyTube');
  if (!socket || !fam) return;
  socket.classList.remove('expanded');
  fam.setAttribute('aria-expanded', 'false');
  if (reseat) {
    fam.classList.remove('reseat');
    void fam.offsetWidth; // restart the seat animation cleanly on repeated picks
    fam.classList.add('reseat');
  }
  if (!reseat && typeof _updateOpticsBoardStatus === 'function') {
    const note = document.getElementById('opticsStatus');
    if (note) note.textContent = '> GREEN CARTRIDGE LATCHED — NO CHANGE';
  } else if (typeof _updateOpticsBoardStatus === 'function') {
    _updateOpticsBoardStatus();
  }
}
window._collapseOpticsFamily = _collapseOpticsFamily;

// Module Bay tube-rack adapter (Step 2 · Phase 2 · B2a) — UI-only: seats the tapped tube
// (visual .seated state), then calls the SAME setter every other optics entry point uses
// (Protocol 22). No new persistence path — changeOpticsColor() remains the single writer.
// WU-optics-picker: a family-member pick also repaints the cartridge to represent it and
// collapses the fan-tray with the reseat flourish (mockup: "tap a green variant → seated,
// tray collapses, cartridge reappears showing the chosen green").
function _seatOpticsTube(btnEl) {
  if (!btnEl || !btnEl.dataset) return;
  const key = btnEl.dataset.optic;
  const t = typeof THEMES !== 'undefined' ? THEMES[key] : null;
  const isFamilyMember = !!(t && t.family);
  if (isFamilyMember) _updateOpticsFamilyRepresentative(key);
  const rack = document.getElementById('opticsColorInput');
  if (rack) {
    Array.from(rack.querySelectorAll('.tube')).forEach(el =>
      el.classList.toggle('seated', el.dataset.optic === key)
    );
  }
  changeOpticsColor(key);
  if (isFamilyMember) _collapseOpticsFamily(true);
  if (typeof renderModuleBay === 'function') renderModuleBay();
}
window._seatOpticsTube = _seatOpticsTube;

// Module Bay SLOT 01 status line — combines the seated tube's label with the high-lumen
// coil state into one diegetic readout. Pure presentation; reads MetaStore, writes nothing.
function _updateOpticsBoardStatus() {
  const note = document.getElementById('opticsStatus');
  if (!note) return;
  const key = _resolveOptic();
  const label =
    typeof THEMES !== 'undefined' && THEMES[key] ? THEMES[key].label : key.toUpperCase();
  const coilOn = typeof isHighLumenEnabled === 'function' && isHighLumenEnabled();
  note.textContent =
    '> TUBE SEATED: ' + label + (coilOn ? ' · HIGH-LUMEN COIL ACTIVE' : ' · COIL SOCKET EMPTY');
}
window._updateOpticsBoardStatus = _updateOpticsBoardStatus;

// Module Bay SLOT 05 status line (owner report fix): reflects the REAL AI Uplink
// connection — a validated Gemini key + selected engine — instead of a hardcoded
// NO CARRIER string. "Validated" reuses robco_gemini_validated_key (set only inside
// fetchAuthorizedModels()'s live 200-response success path, api.js), never a bare
// "a key string is present" check, so pasting garbage into the key field can't show a
// false CARRIER ESTABLISHED. Pure presentation; reads MetaStore, writes nothing.
function _updateUplinkBoardStatus() {
  const note = document.getElementById('uplinkStatus');
  if (!note) return;
  const key = MetaStore.get('robco_gemini_key');
  const validatedKey = MetaStore.get('robco_gemini_validated_key');
  const model = MetaStore.get('robco_gemini_model');
  if (key && model && validatedKey && validatedKey === key) {
    note.textContent = '> CARRIER ESTABLISHED — UPLINK LOCKED · ' + String(model).toUpperCase();
  } else {
    note.textContent = '> NO CARRIER — TERMINAL FULLY OPERATIONAL OFFLINE';
  }
}
window._updateUplinkBoardStatus = _updateUplinkBoardStatus;

function toggleAudio(key, isMuted) {
  MetaStore.set(key, isMuted);
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
    robco_hardwaresfx_muted: 'hardwareSfx', // B2c: chip/board install-eject click
  };
  if (keyMap[key] !== undefined) AudioSettings[keyMap[key]] = isMuted;

  // B2c: tactile confirmation click for pulling/inserting a chip — gated by
  // the hardwareSfx channel itself, not by the specific channel being
  // toggled, so it fires the same way regardless of which chip was touched.
  playChipClick(!isMuted);

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
  if (typeof _updateSonicBoardStatus === 'function') _updateSonicBoardStatus();
}

// ── MASTER MUTE ────────────────────────────────────────────
function toggleMasterMute(isMuted) {
  // B2c: the board's own physical thunk must be audible for the eject/reseat
  // ACTION itself even though "master mute = zero audio" governs everything
  // else — so it's played at the instant AudioSettings.masterMute is still on
  // the OLD (audible) side of the flip: before the flag flips true on eject
  // (heard leaving), after the flag flips back false on reseat (heard
  // arriving). Never bypasses the guard — playBoardThunk() still checks
  // AudioSettings.masterMute itself, this just calls it at the right moment.
  if (isMuted) playBoardThunk(false);
  MetaStore.set('robco_master_muted', isMuted);
  AudioSettings.masterMute = isMuted;
  if (!isMuted) playBoardThunk(true);
  if (isMuted) {
    geigerRunning = false;
    if (geigerTimeout) {
      clearTimeout(geigerTimeout);
      geigerTimeout = null;
    }
    _geigerCurrentRate = -1;
    stopTinnitus();
    stopRadio(); // WU-F5: silence the radio under master mute (pref preserved)
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
    if (AudioSettings.radio) startRadio(); // WU-F5: resume the radio if it was on
  }
  _updateRadioUI();
  _updateSonicBoardStatus();
  if (typeof _logBaySvc === 'function') {
    _logBaySvc(
      isMuted
        ? 'SONIC PROCESSOR REMOVED — MASTER MUTE'
        : 'SONIC PROCESSOR RESEATED — AUDIO RESTORED'
    );
  }
}

// ── WU-F5 PIP-BOY RADIO (synthesized — zero-byte WebAudio station) ──────────
// A procedural retrofuturist station bed: a low broadband static hiss + a warm
// drifting carrier hum + a slow, randomly-evolving sequence of synthesized tonal
// motifs/beeps. FULLY GENERATED via WebAudio — no audio files (zero cache cost),
// IP-safe (no copyrighted music). Free, offline, no AI, game-agnostic (Protocol
// 38 — carries no game data). Opt-in player (default OFF), persisted as the
// localStorage device preference `robco_radio_on`.
//
// Protocol 7: reuses ensureAudioCtx()/audioCtx, respects AudioSettings.masterMute,
// and owns the AudioSettings.radio guard. NOTE — unlike the sibling audio toggles
// (which are MUTE flags, true = silenced, routed through toggleAudio's keyMap),
// the radio is an explicit PLAYER: AudioSettings.radio uses ON semantics (true =
// playing) and has its own toggleRadio() handler, so it is deliberately NOT added
// to the toggleAudio mute keyMap (adding it there would invert its meaning).
// Autoplay-policy-safe: only ever started from a user gesture — the toggle click,
// or a one-shot first-interaction arm when restoring a saved "on" preference.
const RADIO_KEY = 'robco_radio_on';
let radioNodes = null; // { masterGain, staticSrc, carrier, lfo } while playing
let radioMotifTimeout = null;
let _radioArmed = false; // a one-shot first-gesture start is pending

function _radioPlaying() {
  return !!radioNodes;
}
function isRadioOn() {
  return MetaStore.get(RADIO_KEY) === 'true';
}

// Schedule the next short tonal motif/beep over the static bed, then re-arm.
function _radioScheduleMotif() {
  if (!radioNodes || !audioCtx) return;
  const now = audioCtx.currentTime;
  const notes = [220, 261.63, 329.63, 392, 493.88]; // warm retro pentatonic
  const f = notes[Math.floor(Math.random() * notes.length)];
  const osc = audioCtx.createOscillator();
  const g = audioCtx.createGain();
  osc.type = Math.random() < 0.5 ? 'triangle' : 'sine';
  osc.frequency.setValueAtTime(f, now);
  g.gain.setValueAtTime(0.0001, now);
  g.gain.linearRampToValueAtTime(0.05, now + 0.06);
  g.gain.exponentialRampToValueAtTime(0.0001, now + 0.5);
  osc.connect(g);
  g.connect(radioNodes.masterGain);
  osc.start(now);
  osc.stop(now + 0.55);
  radioMotifTimeout = setTimeout(_radioScheduleMotif, 1400 + Math.random() * 3000);
}

function startRadio() {
  // Guards: already playing, master-muted, or the radio pref is off → no-op.
  if (radioNodes || AudioSettings.masterMute || !AudioSettings.radio) return;
  ensureAudioCtx();
  const masterGain = audioCtx.createGain();
  masterGain.gain.setValueAtTime(0.0001, audioCtx.currentTime);
  masterGain.gain.linearRampToValueAtTime(0.5, audioCtx.currentTime + 0.6); // fade in
  // Broadband static bed — a looping noise buffer through a bandpass.
  const noiseBuf = audioCtx.createBuffer(1, audioCtx.sampleRate * 2, audioCtx.sampleRate);
  const nd = noiseBuf.getChannelData(0);
  for (let i = 0; i < nd.length; i++) nd[i] = Math.random() * 2 - 1;
  const staticSrc = audioCtx.createBufferSource();
  staticSrc.buffer = noiseBuf;
  staticSrc.loop = true;
  const staticFilter = audioCtx.createBiquadFilter();
  staticFilter.type = 'bandpass';
  staticFilter.frequency.value = 1400;
  staticFilter.Q.value = 0.6;
  const staticGain = audioCtx.createGain();
  staticGain.gain.value = 0.05;
  staticSrc.connect(staticFilter);
  staticFilter.connect(staticGain);
  staticGain.connect(masterGain);
  // Warm carrier hum, slowly detuned by a sub-audio LFO (retrofuturist drift).
  const carrier = audioCtx.createOscillator();
  const carrierGain = audioCtx.createGain();
  carrier.type = 'sine';
  carrier.frequency.value = 110;
  carrierGain.gain.value = 0.025;
  const lfo = audioCtx.createOscillator();
  const lfoGain = audioCtx.createGain();
  lfo.type = 'sine';
  lfo.frequency.value = 0.13;
  lfoGain.gain.value = 6;
  lfo.connect(lfoGain);
  lfoGain.connect(carrier.frequency);
  carrier.connect(carrierGain);
  carrierGain.connect(masterGain);
  masterGain.connect(audioCtx.destination);
  staticSrc.start();
  carrier.start();
  lfo.start();
  radioNodes = { masterGain, staticSrc, carrier, lfo };
  _radioScheduleMotif();
  _updateRadioUI();
}

function stopRadio() {
  if (radioMotifTimeout) {
    clearTimeout(radioMotifTimeout);
    radioMotifTimeout = null;
  }
  if (radioNodes && audioCtx) {
    const nodes = radioNodes;
    try {
      nodes.masterGain.gain.cancelScheduledValues(audioCtx.currentTime);
      nodes.masterGain.gain.linearRampToValueAtTime(0.0001, audioCtx.currentTime + 0.3);
    } catch (e) {
      /* ignore */
    }
    setTimeout(() => {
      ['staticSrc', 'carrier', 'lfo'].forEach(k => {
        try {
          nodes[k].stop();
        } catch (e) {
          /* already stopped */
        }
        try {
          nodes[k].disconnect();
        } catch (e) {
          /* ignore */
        }
      });
      try {
        nodes.masterGain.disconnect();
      } catch (e) {
        /* ignore */
      }
    }, 350);
  }
  radioNodes = null;
  _updateRadioUI();
}

function _updateRadioUI() {
  const note = document.getElementById('radioStatus');
  if (!note) return;
  if (AudioSettings.masterMute) {
    note.textContent = '> RADIO SILENCED — MASTER AUDIO MUTED';
    return;
  }
  note.textContent = _radioPlaying()
    ? '> RECEIVING — STATION CARRIER LOCKED'
    : '> RADIO OFFLINE — NO CARRIER';
}

// Module Bay SLOT 02 status line (Step 2 · Phase 2 · B2a) — combines the master-mute
// state with the live active-channel count and the radio module state into one
// diegetic readout. Pure presentation; reads MetaStore/AudioSettings, writes nothing.
function _updateSonicBoardStatus() {
  // FIX 1 (owner report, B2c unit): visually pull EVERY chip while the board
  // itself is ejected (master mute) — the individual .chip-input checkboxes
  // and their robco_*_muted keys are untouched, only the CSS class flips, so
  // reseating the board restores each chip to its own preserved state.
  const grid = document.getElementById('chipGrid');
  if (grid) grid.classList.toggle('sonic-board--ejected', !!AudioSettings.masterMute);
  const note = document.getElementById('sonicStatus');
  if (!note) return;
  if (AudioSettings.masterMute) {
    note.textContent = '> BOARD REMOVED — ALL AUDIO OFFLINE (CHANNEL CHIPS PRESERVED FOR RESEAT)';
    return;
  }
  const keys = [
    'robco_sfx_muted',
    'robco_hum_muted',
    'robco_geiger_muted',
    'robco_tinnitus_muted',
    'robco_ambient_muted',
    'robco_wake_muted',
    'robco_panelclick_muted',
    'robco_bootdrone_muted',
    'robco_levelup_muted',
    'robco_heartbeat_muted',
    'robco_questcomplete_muted',
    'robco_questfail_muted',
    'robco_factionthreshold_muted',
  ];
  const total = keys.length;
  const active = keys.filter(k => MetaStore.get(k) !== 'true').length;
  note.textContent =
    '> BOARD SEATED · ' +
    active +
    '/' +
    total +
    ' CHANNELS ACTIVE · RECEIVER ' +
    (AudioSettings.radio ? 'INSTALLED — STATION CARRIER LIVE' : 'SOCKET EMPTY');
}
window._updateSonicBoardStatus = _updateSonicBoardStatus;

// ── B2c: MODULE BAY HARDWARE SFX (chip click + board thunk) ────────────────
// Tactile install/eject feedback for physically handling Module Bay hardware:
// the 13 SLOT-02 channel chips, the SERVO CLICK RELAY toggle that gates this
// whole channel, and the other bay-module toggles (radio, power cell, haptic
// solenoid — wired at their own call sites below/in ui-core.js). ONE audio
// source per Protocol 7 (one AudioSettings.hardwareSfx flag / one
// robco_hardwaresfx_muted key) covers every trigger site, mirroring the
// existing "ambient"/"panelClick" precedent of a single channel gating
// several related call sites rather than one flag per call site.
function playChipClick(installing) {
  if (AudioSettings.masterMute) return;
  if (AudioSettings.hardwareSfx) return;
  ensureAudioCtx();
  const osc = audioCtx.createOscillator();
  const g = audioCtx.createGain();
  osc.type = 'square';
  const f0 = installing ? 900 : 700;
  const f1 = installing ? 1300 : 350;
  osc.frequency.setValueAtTime(f0, audioCtx.currentTime);
  osc.frequency.exponentialRampToValueAtTime(f1, audioCtx.currentTime + 0.03);
  g.gain.setValueAtTime(0.05, audioCtx.currentTime);
  g.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.035);
  osc.connect(g);
  g.connect(audioCtx.destination);
  osc.start();
  osc.stop(audioCtx.currentTime + 0.04);
}

// A heavier percussive thunk for the Sonic Processor board itself (SLOT 02's
// own eject/reseat), distinct in weight from the lighter chip click above.
function playBoardThunk(installing) {
  if (AudioSettings.masterMute) return;
  if (AudioSettings.hardwareSfx) return;
  ensureAudioCtx();
  const osc = audioCtx.createOscillator();
  const g = audioCtx.createGain();
  osc.type = 'sine';
  const f0 = installing ? 70 : 140;
  const f1 = installing ? 130 : 45;
  osc.frequency.setValueAtTime(f0, audioCtx.currentTime);
  osc.frequency.exponentialRampToValueAtTime(f1, audioCtx.currentTime + 0.12);
  g.gain.setValueAtTime(0.12, audioCtx.currentTime);
  g.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.15);
  osc.connect(g);
  g.connect(audioCtx.destination);
  osc.start();
  osc.stop(audioCtx.currentTime + 0.16);
}

// User-facing play/stop toggle (diegetic `> PIP-BOY RADIO`). Persists the device
// preference and starts/stops the station. The onchange fires from a real click,
// satisfying the autoplay policy.
function toggleRadio(on) {
  MetaStore.set(RADIO_KEY, on ? 'true' : 'false');
  AudioSettings.radio = on;
  playChipClick(on); // B2c: tactile install/eject confirmation
  if (on) startRadio();
  else stopRadio();
  _updateRadioUI();
  _updateSonicBoardStatus();
  if (typeof _logBaySvc === 'function') {
    _logBaySvc(on ? 'RADIO RECEIVER MODULE INSTALLED' : 'RADIO RECEIVER MODULE REMOVED');
  }
}

// Boot restore. The saved preference cannot auto-start audio (no gesture yet), so
// when it is "on" we arm a one-shot first-interaction starter (mirrors the boot
// drone). The checkbox reflects the saved preference immediately.
function initRadio() {
  AudioSettings.radio = isRadioOn();
  const toggle = document.getElementById('radioToggle');
  if (toggle) toggle.checked = AudioSettings.radio;
  if (AudioSettings.radio && !radioNodes && !_radioArmed) {
    _radioArmed = true;
    const _armStart = () => {
      document.removeEventListener('click', _armStart);
      document.removeEventListener('keydown', _armStart);
      _radioArmed = false;
      if (AudioSettings.radio && !AudioSettings.masterMute) startRadio();
      _updateRadioUI();
    };
    document.addEventListener('click', _armStart, { once: true });
    document.addEventListener('keydown', _armStart, { once: true });
  }
  _updateRadioUI();
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
// Mimics CRT power-on. The browser autoplay policy blocks audio before the
// first user gesture, and boot runs before any interaction — so the drone is
// armed to the first click/key.
//
// WU-B10: the armed gesture only plays the drone IF boot is still in progress
// (`_bootActive`). If the user's first interaction lands AFTER boot already
// finished, the stale drone is suppressed — it never fires detached on a later
// mid-session menu tap. Net: the drone plays as part of boot, or not at all.
let _bootActive = false; // true only between runBootSequence start and completion

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
  // Wire to first click/key, but only play the drone if boot is STILL active —
  // a first interaction after boot completed suppresses the stale drone (WU-B10).
  function _onFirstInteract() {
    document.removeEventListener('click', _onFirstInteract);
    document.removeEventListener('keydown', _onFirstInteract);
    if (!_bootActive) return; // boot already finished → suppress detached drone
    _tryDrone();
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

// U7: level-up is detected in autoImportState() (api.js) and emitted through
// RobcoEvents — the jingle + haptic are a pure reaction, subscribed here. Wiring
// is deferred to a function called from window.onload (ui-core.js), NOT run at
// this file's top level — ui-audio.js is a static <script> tag that can execute
// before state.js (which defines RobcoEvents) finishes its dynamic, context-
// conditional load (see the boot-loader comment in index.html); a top-level
// RobcoEvents.on(...) here would throw "RobcoEvents is not defined" on some boots.
function _wireAudioEventBusSubscribers() {
  RobcoEvents.on('level.up', () => {
    playLevelUpJingle();
    triggerHaptic('levelup'); // WU-F2 haptic
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

// ── WU-F6 COLD-START / DEGRADED-TUBE BOOT ─────────────────────────────────
// runBootSequence renders one of three diegetic POST "flavors":
//   • 'normal'   — the terse warm boot (unchanged 8-line sequence).
//   • 'cold'     — the first-ever power-on: a longer POST with a RETROS BIOS
//                  banner + a counting memory test. Runs at most once, gated by
//                  the localStorage `robco_booted_before` flag.
//   • 'degraded' — a RARE "cold CRT tube warming up" variant with a flickery,
//                  re-stabilising POST. Per the owner's explicit preference this
//                  is NOT first-boot-gated: it rolls on EVERY boot at a low
//                  probability, so the degraded tube can surface any time.
// Pure JS/CSS, game-agnostic (Protocol 38), free, offline, no AI. The flicker is
// a CSS animation, so the global prefers-reduced-motion block neutralises it for
// motion-sensitive users (CR-1) while the degraded POST text still shows.
// Overridable for tests/verification via `window.__robcoBootFlavor`.
const DEGRADED_BOOT_CHANCE = 0.01; // rare degraded-tube boot (~1 in 100) — rolled on EVERY boot

function _pickBootFlavor() {
  const forced = (typeof window !== 'undefined' && window.__robcoBootFlavor) || null;
  if (forced === 'normal' || forced === 'cold' || forced === 'degraded') return forced;
  // Degraded variant first — deliberately NOT gated to the first boot (owner pref).
  if (Math.random() < DEGRADED_BOOT_CHANCE) return 'degraded';
  // First-ever power-on → the longer cold-start POST (once only).
  if (!MetaStore.get('robco_booted_before')) {
    return 'cold';
  }
  return 'normal';
}

function _bootLinesFor(flavor) {
  const ver = '> LOADING U.O.S. v' + APP_VERSION + '.........';
  if (flavor === 'cold') {
    return [
      '> ROBCO INDUSTRIES (TM) UNIFIED OPERATING SYSTEM',
      '> COPYRIGHT 2075-2077 ROBCO INDUSTRIES',
      '> ─────────────────────────────────────────────',
      '> RETROS BIOS v3.14 — COLD START DETECTED',
      '> PERFORMING FULL POWER-ON SELF TEST...',
      '> MEMORY TEST: 016K · 032K · 048K · 064K ...... [OK]',
      '> 64K RAM SYSTEM   |   38911 BYTES FREE',
      '> CMOS CHECKSUM................ [OK]',
      '> HARDWARE DIAGNOSTICS.......... [OK]',
      ver,
      '> SECURE LINK ESTABLISHED. BOOTING...',
    ];
  }
  if (flavor === 'degraded') {
    return [
      '> ROBCO INDUSTRIES (TM) UNIFIED OPERATING SYSTEM',
      '> ░▒▓ CRT TUBE COLD — WARMING UP ▓▒░',
      '> SIGNAL UNSTABLE...... RE-STABILISING SWEEP',
      '> MEMORY CHECK........ [RETRY] ........ [OK]',
      '> HARDWARE DIAGNOSTICS.......... [OK]',
      '> PHOSPHOR ALIGNMENT RESTORED',
      ver,
      '> SECURE LINK ESTABLISHED. BOOTING...',
    ];
  }
  // 'normal' (warm boot) — unchanged from the original sequence
  return [
    '> ROBCO INDUSTRIES (TM) UNIFIED OPERATING SYSTEM',
    '> COPYRIGHT 2075-2077 ROBCO INDUSTRIES',
    '> ─────────────────────────────────────────────',
    '> 64K RAM SYSTEM   |   38911 BYTES FREE',
    '> MEMORY CHECK.................. [OK]',
    '> HARDWARE DIAGNOSTICS.......... [OK]',
    ver,
    '> SECURE LINK ESTABLISHED. BOOTING...',
  ];
}

function runBootSequence(onComplete) {
  const bootScreen = document.getElementById('bootScreen');
  if (!bootScreen) {
    if (onComplete) onComplete();
    return;
  }
  const bootLines = document.getElementById('bootLines');
  _bootActive = true; // WU-B10: open the boot window — drone may play on first gesture
  playBootDrone(); // H4: boot sequence drone
  const flavor = _pickBootFlavor();
  // Record that the unit has booted so the first-power-on 'cold' POST never repeats.
  // MetaStore.set never throws (private mode / quota fails soft — worst case the
  // cold POST repeats).
  MetaStore.set('robco_booted_before', 'true');
  if (flavor === 'degraded') bootScreen.classList.add('boot-degraded');
  const lines = _bootLinesFor(flavor);
  // WU-T3: per-game identity line (Pip-Boy model + wasteland uplink) sourced from
  // GAME_DEFS[ctx].theme — data-driven (Protocol 38), so a new game just adds strings. Injected
  // here, AFTER _bootLinesFor, so it shows uniformly for every boot flavor (normal/cold/degraded)
  // without touching the WU-F6 POST content. Fail-safe to generic text if the theme is absent.
  const _t3theme = (typeof _activeDef === 'function' && _activeDef().theme) || {};
  const _t3model = String(_t3theme.pipBoyModel || 'PIP-BOY').toUpperCase();
  const _t3flavor = String(_t3theme.bootFlavor || 'WASTELAND UPLINK').toUpperCase();
  // Place it just before the final "SECURE LINK ESTABLISHED…" line.
  lines.splice(Math.max(0, lines.length - 1), 0, '> ' + _t3model + ' — ' + _t3flavor);
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
          bootScreen.classList.remove('boot-degraded'); // hygiene for any re-entry
          _bootActive = false; // WU-B10: boot window closed — suppress any stale drone
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
