// ── ui-core-overseer.js — DIRECTOR UPLINK (split from ui-core.js, 2.8.5 U-A1) ──
// The DO-O Director Uplink presence (setOverseerState/scope canvas), the
// AI composer wiring (mode pill, autogrow, input history), help modals, the
// Tool Deck launcher, and the campaign-ignition ceremony. Global scope,
// static <script> tag — see index.html load order.

// GOTCHA: these two are the sole declaration of a cross-file image-attach
// stash — ui-saves.js (file picker) and ocr.js (Visual Upload) WRITE them,
// api.js and api-router.js READ them when a transmit is in flight. They land
// in this file only because this is where the split put them; there is no
// functional tie to the Director Uplink code below.
let attachedImageData = null;
let attachedImageMimeType = null;
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
  // M2 Director on the Wire (Ceremony Moments Wave 1) — generic fallback for
  // an unauthored game (Protocol 38: never borrowed fiction).
  greeting: '▸ CARRIER ESTABLISHED. Transmit when ready.',
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
// FIX 3 (owner report): a transient, one-shot amplitude bump for tapping the
// [ LISTENING ] tag — decays to 0 by _scopePulseDurationMs after the tap, a
// pure visual flourish that never touches _scopeState (the real state
// machine is untouched).
let _scopePulseUntil = 0;
const _scopePulseDurationMs = 450;

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

// PROTOCOL UI-10: the ONE gate function every animation entry/exit point
// (_scopeLoop, _armScopeLoop, _scopePulse, the AmbientRuntime onEnter/onExit
// below) calls through — reduced-motion, the Immersion dial, Ambient Runtime
// power-down, and tab-hidden are checked here and ONLY here, so no caller can
// drift into its own bespoke reduced-motion carve-out. Re-evaluated live on
// every call (never cached), since any of the four signals can flip mid-loop.
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
  // FIX 3: a tap-triggered pulse envelope — 1 right after the tap, decaying
  // linearly to 0 by _scopePulseDurationMs later. Only listening's carrier
  // wave reads it (thinking/speaking/disabled already have their own motion).
  const pulseRemain = _scopePulseUntil - performance.now();
  const pulseEnv = pulseRemain > 0 ? pulseRemain / _scopePulseDurationMs : 0;
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
      // listening — gentle carrier sine, occasional NV-persona scratch burst,
      // amplified by the one-shot tap pulse while it decays
      y =
        mid +
        Math.sin(x * 0.02 + _scopeT) * H * 0.14 * (1 + pulseEnv * 2.5) +
        Math.sin(x * 0.006 - _scopeT * 0.4) * H * 0.05 +
        (Math.random() - 0.5) * H * (scratching ? 0.22 : 0.02) * (1 + pulseEnv * 1.5);
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
    // FIX 4a (owner report): only NO CARRIER (disabled/offline) has somewhere
    // useful to route to. FIX 3 (owner report): LISTENING is ALSO actionable —
    // a tap triggers a one-shot scope pulse (see _scopeTagClick/_scopePulse) —
    // so only a mid-transaction tag (thinking/speaking) stays a pure readout.
    if (tagEl.tagName === 'BUTTON') {
      tagEl.disabled = s === 'thinking' || s === 'speaking';
      tagEl.setAttribute(
        'aria-label',
        s === 'listening'
          ? tag + ' — tap to pulse the scope'
          : s === 'disabled' || s === 'offline'
            ? tag + ' — tap to open the AI Uplink settings'
            : tag
      );
    }
  }
  const csEl = document.getElementById('csState');
  if (csEl) csEl.textContent = tag;
  drawScope();
  _armScopeLoop();
  // CHASSIS LIVING CORE #2/#3 (AI revs / connection) — reuses this SAME
  // choke point rather than re-instrumenting transmitMessage()/
  // appendToChat() (Protocol 22).
  if (typeof _coreRefresh === 'function') _coreRefresh();
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
// PROTOCOL UI-10 (deterministic reset ordering): this is the "check the
// presence's OWN current state before resetting" rule in practice — the
// thinking/speaking guard two lines below is what stops a lifecycle hook
// from stomping a state a longer-running async step (the typewriter) already
// advanced past.
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
  // FIX 2/5 (owner report): the casing UPLINK lamp + bezel VITALS strip read the
  // exact same connection signal this function is about to recompute below —
  // this is the ONE choke point every connection-change entry path (online/
  // offline events, a key edit via saveApiKeySilent, initial boot) already
  // routes through, so they live-update together and can never drift apart
  // (Protocol 22).
  if (typeof _updateUplinkLamp === 'function') _updateUplinkLamp();
  if (typeof _refreshBezelTelemetry === 'function') _refreshBezelTelemetry();
  if (typeof renderSystemStatus === 'function') renderSystemStatus();
  // SU-4: the ACCOUNT/REG PORT board's words read the same carrier signal as the
  // lines above — routing it through this one choke point is what keeps it from
  // ever disagreeing with the UPLINK lamp/bezel telemetry/SYSTEM STATUS carrier.
  if (typeof renderAccount === 'function') renderAccount();
  if (_scopeState === 'thinking' || _scopeState === 'speaking') {
    drawScope();
    return;
  }
  setOverseerState(_overseerRestState(_overseerRestSignals()));
}
window.refreshOverseerCarrier = refreshOverseerCarrier;

// _scopePulse — FIX 3 (owner report): a fun one-shot flourish for tapping
// [ LISTENING ]. Purely visual (transient module var only, Protocol UI-10's
// zero-campaign-write rule); degrades to a no-op under the SAME gate every
// other scope motion already obeys (reduced-motion / Minimal dial / hidden
// tab / runtime STANDBY-SHUTDOWN-OFF), never a bespoke carve-out.
function _scopePulse() {
  if (_scopeState !== 'listening') return;
  if (!_scopeShouldAnimate()) return;
  _scopePulseUntil = performance.now() + _scopePulseDurationMs;
  _armScopeLoop();
}
window._scopePulse = _scopePulse;

// FIX 4a (owner report): the scope tag's click handler — only NO CARRIER
// (disabled/offline) routes anywhere; the native `disabled` attribute above
// already blocks the click in every other state, this is defense-in-depth.
// FIX 3 (owner report): LISTENING routes to the pulse flourish instead.
function _scopeTagClick() {
  if (_scopeState === 'disabled' || _scopeState === 'offline') {
    if (typeof _openAiUplinkSlot === 'function') _openAiUplinkSlot();
  } else if (_scopeState === 'listening') {
    _scopePulse();
  }
}
window._scopeTagClick = _scopeTagClick;

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
      // AI_OVERSEER Finding 7 — thinned so the blips read as texture, not noise:
      // cadence raised 35s → 60s and fire-chance lowered 40% → 25%, so a diagnostic
      // blip lands roughly every ~4 min of idle listening instead of every ~1.5 min.
      cadenceMs: 60000,
      onTick: () => {
        if (_scopeState !== 'listening') return;
        if (Math.random() > 0.25) return;
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

// ── M2 · DIRECTOR ON THE WIRE (Ceremony Moments Wave 1) ────────────────────
// Consumes the DO-K identity.overseer.greeting authored for all three games
// (state.js) but rendered nowhere until now. Fires at most once per session,
// the first time the UPLINK subsystem genuinely becomes active (a user tap/
// hotkey/deep-link — never a boot-time bezel-highlight restore) with a live
// carrier (_isUplinkConnected(), the same signal the UPLINK lamp/bezel
// telemetry already share). Renders via appendToChat(...,true) — the DO-O
// idle-blip precedent: a device-template ambient line, never persisted to
// chatHistory/robco_v8, never AI output (Protocol UI-10). Writes NOTHING
// durable to the campaign — _overseerGreeted is a transient module var.
let _overseerGreeted = false;
function _maybeGreetOverseer() {
  if (_overseerGreeted) return;
  if (typeof _isUplinkConnected !== 'function' || !_isUplinkConnected()) return;
  _overseerGreeted = true; // gate first — a throw below must never re-arm this session
  const ov = _overseerIdentity();
  const greeting = (ov && ov.greeting) || OVERSEER_GENERIC_FALLBACK.greeting;
  if (greeting && typeof appendToChat === 'function') appendToChat(greeting, 'sys', true);
  if (typeof _scopePulse === 'function') _scopePulse();
}
window._maybeGreetOverseer = _maybeGreetOverseer;
// ── M2 END ──────────────────────────────────────────────────────────────

// ── M1 · CAMPAIGN IGNITION (Ceremony Moments Wave 1) ────────────────────────
// Replaces wipeTerminal()'s two bare chat lines with a short (~2.5s),
// skippable "commissioning" sequence — the new-campaign ceremony every RPG
// opening has, but this app never had. Typed lines reuse the runBootSequence()
// timed-reveal precedent, but as a self-rescheduling setTimeout chain rather
// than setInterval — ui-core.js's standalone-timer retirement (Suite 148.6,
// Phase 2 A2) makes the AmbientRuntime heartbeat the one setInterval-based
// scheduler in this file; a one-shot, self-cancelling reveal like this one is
// exactly what setTimeout chaining is for. The ignition flare reuses the
// CHASSIS living core's existing _coreFlare() (Protocol 22); the closing line
// reuses M2's greeting consumer (_overseerIdentity()/OVERSEER_GENERIC_FALLBACK)
// directly — a wipe usually happens from SETTINGS, not UPLINK, so this does
// not gate on carrier status the way _maybeGreetOverseer() does; it also sets
// _overseerGreeted so a same-session UPLINK visit right after doesn't
// re-greet redundantly. Any tap/keydown during the sequence fast-forwards to
// the end frame (posting every remaining line at once, never silently
// dropped) instead of blocking input. Writes NOTHING durable to the campaign
// — every line is the normal un-persisted appendToChat(...,true) sys-line
// convention wipeTerminal() already used; the dim is a toggled CSS class +
// plain @keyframes (Protocol UI-9, auto-neutralized by the global
// reduced-motion block).
function _runCampaignIgnition(onComplete) {
  const glass = document.querySelector('.glass-frame');
  const lines = [
    '> UNIT RE-COMMISSIONED',
    '> REGISTERING NEW OPERATOR……… [OK]',
    '> CALIBRATING S.P.E.C.I.A.L. BASELINE… [OK]',
    '> DIRECTIVE REGISTRY: EMPTY — AWAITING ORDERS',
  ];
  let i = 0;
  let finished = false;
  let timer = null;
  function finish() {
    if (finished) return;
    finished = true;
    clearTimeout(timer);
    document.removeEventListener('pointerdown', finish, true);
    document.removeEventListener('keydown', finish, true);
    if (glass) glass.classList.remove('ignition-dim');
    // A skip mid-sequence posts every remaining line at once, in order —
    // never silently dropped.
    for (; i < lines.length; i++) {
      if (typeof appendToChat === 'function') appendToChat(lines[i], 'sys', true);
    }
    if (typeof _coreFlare === 'function') _coreFlare();
    const ov = typeof _overseerIdentity === 'function' ? _overseerIdentity() : null;
    const greeting = (ov && ov.greeting) || OVERSEER_GENERIC_FALLBACK.greeting;
    if (greeting && typeof appendToChat === 'function') appendToChat(greeting, 'sys', true);
    _overseerGreeted = true; // M2: the ignition's own greeting counts for this session
    if (onComplete) onComplete();
  }
  function tick() {
    if (i < lines.length) {
      if (typeof appendToChat === 'function') appendToChat(lines[i], 'sys', true);
      i++;
      timer = setTimeout(tick, 550);
    } else {
      finish();
    }
  }
  if (glass) glass.classList.add('ignition-dim');
  document.addEventListener('pointerdown', finish, true);
  document.addEventListener('keydown', finish, true);
  timer = setTimeout(tick, 550);
}
window._runCampaignIgnition = _runCampaignIgnition;
// ── M1 END ──────────────────────────────────────────────────────────────

// ── INPUT HISTORY (#36) ─────────────────────────────────────────────────
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
  _autoGrowComposer();
}

// Tapping the pill swaps the PERSISTED mode (device pref) — distinct from the
// one-off `/`/`@` override, which never touches this persisted value.
function toggleInputMode() {
  const mode = typeof getInputMode === 'function' ? getInputMode() : 'overseer';
  setInputMode(otherInputMode(mode));
  _renderModePill();
  _updateModeHint();
  if (typeof playPanelClick === 'function') playPanelClick();
  // FIX (owner report): a touch tap leaves the pill focused with no real
  // pointerleave to clear it — blur it so no lingering focus ring survives
  // the tap (belt-and-suspenders alongside the CSS hover-gate fix below).
  const pill = document.getElementById('modePill');
  if (pill && typeof pill.blur === 'function') pill.blur();
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

// ── COMPOSER AUTO-GROW (small-UI-polish batch) ─────────────────────────────
// Owner fix (small-UI-polish batch): #chatInput starts as small as possible
// (sized to fit its own placeholder sentence — no dead space below the
// text) and grows with typed content up to a cap, then scrolls internally.
// Keep in sync with .composer-input's max-height (terminal.css).
const COMPOSER_INPUT_MAX_HEIGHT_PX = 160;

function _autoGrowComposer() {
  const el = document.getElementById('chatInput');
  if (!el) return;
  el.style.height = 'auto';
  if (!el.value) {
    // scrollHeight only reflects real VALUE content, not placeholder text —
    // briefly fill with the placeholder to measure the smallest box that
    // fits the whole example sentence, then restore the empty value.
    // Programmatic .value writes don't fire 'input', so no feedback loop.
    el.value = el.placeholder;
    el.style.height = Math.min(el.scrollHeight, COMPOSER_INPUT_MAX_HEIGHT_PX) + 'px';
    el.value = '';
  } else {
    el.style.height = Math.min(el.scrollHeight, COMPOSER_INPUT_MAX_HEIGHT_PX) + 'px';
  }
}
window._autoGrowComposer = _autoGrowComposer;

// Boot-wired alongside _wireModeHint() (same #chatInput surface); re-measures
// on every keystroke. The initial call sizes the box to the placeholder.
function _wireComposerAutoGrow() {
  const el = document.getElementById('chatInput');
  if (!el) return;
  el.addEventListener('input', _autoGrowComposer);
  _autoGrowComposer();
}

// ── HELP MODALS — COMM-LINK COMMAND REGISTRY + SAVE & DATA FIELD MANUAL ────
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

// ── TOOL DECK + QUICK-DRAW HOLSTER (Design Overhaul command-cluster overhaul) ──
// The deck is a screen-local bottom-sheet anchored to .glass-frame — a distinct,
// bespoke overlay surface, structurally different from the centered #sysModal
// (Protocol 22/23: not a duplicate modal manager). Owner-approved redesign of the
// command cluster (Protocol 25) — reuses every tool's existing handler unchanged.
let _holsterBinding = false;

function toggleToolDeck() {
  const deck = document.getElementById('toolDeck');
  if (!deck) return;
  if (deck.hidden) openToolDeck();
  else closeToolDeck();
}

function openToolDeck() {
  const deck = document.getElementById('toolDeck');
  const scrim = document.getElementById('deckScrim');
  const key = document.getElementById('deckKey');
  if (!deck || !scrim || !key) return;
  deck.hidden = false;
  scrim.hidden = false;
  key.classList.add('open');
  key.setAttribute('aria-expanded', 'true');
  if (typeof renderHolster === 'function') renderHolster();
  // M5 SEAT — targets the grip bar, not #toolDeck itself: the deck already
  // owns its own `deckUp` slide-in `animation` (unchanged), and CSS
  // `animation` is a single property — a second rule setting it on the same
  // element would silently replace deckUp rather than run alongside it.
  // The grip bar has no animation of its own, so SEAT lands there cleanly.
  if (typeof _motionSeat === 'function') _motionSeat(deck.querySelector('.deck-grip'));
  // Deliberately no autofocus on #deckTarget here (owner report — auto-popping the
  // mobile keyboard on deck OPEN covered the Quick-Draw Holster sockets below it).
  // The field still focuses itself when the user taps it, or via the BIND ▸ flow
  // (see the bindKey listener in _wireToolDeck()), which specifically needs it.
}

function _disarmHolsterBind() {
  _holsterBinding = false;
  const holster = document.querySelector('.holster');
  const bindKey = document.getElementById('bindKey');
  const hint = document.getElementById('holsterHint');
  if (holster) holster.classList.remove('binding');
  if (bindKey) {
    bindKey.classList.remove('armed');
    bindKey.setAttribute('aria-pressed', 'false');
  }
  if (hint) hint.textContent = '';
}

function closeToolDeck() {
  const deck = document.getElementById('toolDeck');
  const scrim = document.getElementById('deckScrim');
  const key = document.getElementById('deckKey');
  if (!deck || !scrim || !key) return;
  deck.hidden = true;
  scrim.hidden = true;
  key.classList.remove('open');
  key.setAttribute('aria-expanded', 'false');
  _disarmHolsterBind();
  key.focus();
}
