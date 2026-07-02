// ── AMBIENT RUNTIME — the one heartbeat, many observers (Step 2 · Phase 2 · A1) ──
//
// window.AmbientRuntime is the OS-level lifecycle substrate for everything
// atmospheric. It owns ONE canonical terminal state, ONE heartbeat, and an
// observer registry — every ambient consumer (timers, UPLINK, hardware
// choreography, attract/standby experiences) subscribes here instead of
// re-implementing its own tick or its own dial gate.
//
//   Canonical state:  OFF → COLD_BOOT → READY → ACTIVE → IDLE → STANDBY → SHUTDOWN
//   One heartbeat:    a single setInterval; each beat runs every eligible observer.
//   Central dial:     the runtime is the ONE place immersionAllows(tier) is checked.
//
// ── A1 IS PURELY ADDITIVE ─────────────────────────────────────────────────────
// A1 tracks the terminal state IN PARALLEL with the existing standby/timers in
// ui-core.js / ui-audio.js, which are left completely untouched. It migrates no
// timer and moves no standby action (that is A2, one-per-commit, later). Nothing
// observable changes in this unit: the ONLY registered observer is an inert
// self-test that bumps an in-memory counter. If the runtime fails to start, the
// app is byte-identical to today.
//
// ── HARD ATMOSPHERE / SAVE BOUNDARY (Phase-2 prime invariant #1) ──────────────
// The ambient layer writes NOTHING durable to the campaign: it never persists the
// campaign save, never mutates a campaign field, and never appends to the Terminal
// Record. Runtime state is ephemeral / in-memory; any device pref would go through
// MetaStore only (A1 stores none). Gate-guarded by the no-durable-write suite that
// ships with A1 (negative grep for the forbidden persistence identifiers).
//
// ── BOOT-ORDER LESSON (U7) ────────────────────────────────────────────────────
// This file's TOP LEVEL only DEFINES window.AmbientRuntime / window.initAmbientRuntime.
// Every cross-file read (immersionAllows, RobcoEvents) happens INSIDE a function
// that runs from window.onload (initAmbientRuntime), never at parse time — because
// this file can be parsed before the shared state module has loaded. All reads are
// additionally typeof-guarded and fail OPEN, mirroring the _startMemCycle seam.
//
// Game-agnostic (Protocol 38): pure lifecycle logic, no game literals.
(function () {
  'use strict';

  // Canonical terminal states, in lifecycle order.
  var RUNTIME_STATES = ['OFF', 'COLD_BOOT', 'READY', 'ACTIVE', 'IDLE', 'STANDBY', 'SHUTDOWN'];

  // Legal transition adjacency. Any edge NOT listed here is a no-op — an illegal
  // edge never throws, never mutates state, and never fires onEnter/onExit.
  var LEGAL = {
    OFF: ['COLD_BOOT', 'SHUTDOWN'],
    COLD_BOOT: ['READY', 'STANDBY', 'SHUTDOWN'],
    READY: ['ACTIVE', 'STANDBY', 'SHUTDOWN'],
    ACTIVE: ['IDLE', 'STANDBY', 'SHUTDOWN'],
    IDLE: ['ACTIVE', 'STANDBY', 'SHUTDOWN'],
    STANDBY: ['ACTIVE', 'READY', 'SHUTDOWN'],
    SHUTDOWN: ['OFF'],
  };

  var GRANULARITY_MS = 250; // one heartbeat granularity (the single scheduler cadence)
  var IDLE_MS = 120000; // ACTIVE → IDLE after this much no user interaction

  var _state = 'OFF';
  var _observers = [];
  var _heartbeat = null;
  var _started = false;
  var _lastActivity = _now(); // seeded now so a pre-start beat never reads a stale 0

  function _now() {
    return Date.now();
  }

  function getState() {
    return _state;
  }

  // immersionAllows lives in the shared state module. Fail OPEN if it is unavailable or throws —
  // never suppress an observer on a missing gate (the _startMemCycle pattern).
  function _allows(tier) {
    try {
      return typeof window.immersionAllows === 'function' ? window.immersionAllows(tier) : true;
    } catch (_) {
      return true;
    }
  }

  // Announce a state change on the bus. The emitter itself must never break a
  // transition, so the whole thing is guarded (RobcoEvents.emit also swallows
  // listener errors on its side).
  function _emit(from, to) {
    try {
      if (window.RobcoEvents && typeof window.RobcoEvents.emit === 'function') {
        window.RobcoEvents.emit('runtime.state', { from: from, to: to });
      }
    } catch (_) {
      /* a bus failure can never break a runtime transition */
    }
  }

  // register — add an observer. Returns an unregister() handle.
  //   { id, cadenceMs, states, tier, onTick, onEnter, onExit }
  //   states    = array of runtime states the observer runs in (empty = never)
  //   tier      = minimum immersion tier required (default 'full')
  //   cadenceMs = minimum ms between this observer's ticks (default 0 = every beat)
  //   onTick    = called each eligible beat; onEnter(to)/onExit(from) fire when the
  //               runtime crosses INTO / OUT OF the observer's state set.
  function register(spec) {
    if (!spec || typeof spec !== 'object') return function () {};
    var obs = {
      id: spec.id || 'obs-' + _observers.length,
      cadenceMs: typeof spec.cadenceMs === 'number' && spec.cadenceMs >= 0 ? spec.cadenceMs : 0,
      states: Array.isArray(spec.states) ? spec.states.slice() : [],
      tier: spec.tier || 'full',
      onTick: typeof spec.onTick === 'function' ? spec.onTick : null,
      onEnter: typeof spec.onEnter === 'function' ? spec.onEnter : null,
      onExit: typeof spec.onExit === 'function' ? spec.onExit : null,
      _lastTick: -Infinity,
    };
    _observers.push(obs);
    return function unregister() {
      var i = _observers.indexOf(obs);
      if (i !== -1) _observers.splice(i, 1);
    };
  }

  // transition — validated + idempotent. Fires per-observer onExit(from)/onEnter(to)
  // for observers whose state-set boundary is crossed, then emits runtime.state.
  // Returns true iff the state actually changed.
  function transition(to) {
    if (RUNTIME_STATES.indexOf(to) === -1) return false; // unknown target — ignore
    var from = _state;
    if (to === from) return false; // idempotent — no-op, no events
    if (!(LEGAL[from] && LEGAL[from].indexOf(to) !== -1)) return false; // illegal edge
    _state = to;
    for (var i = 0; i < _observers.length; i++) {
      var o = _observers[i];
      var wasIn = o.states.indexOf(from) !== -1;
      var nowIn = o.states.indexOf(to) !== -1;
      try {
        if (nowIn && !wasIn && o.onEnter) o.onEnter(to);
        else if (wasIn && !nowIn && o.onExit) o.onExit(from);
      } catch (_) {
        /* a bad observer callback never breaks the transition or its siblings */
      }
    }
    _emit(from, to);
    return true;
  }

  // _beat — ONE heartbeat pass. Boot-complete detection, idle detection, then each
  // eligible observer's scheduled tick. Safe to call directly (tests drive it so
  // the state machine + gating are proven deterministically, without timer races).
  function _beat() {
    // COLD_BOOT → READY → ACTIVE once the boot screen has cleared. ADDITIVE: the
    // existing boot sequence still OWNS the screen; the runtime only observes it.
    if (_state === 'COLD_BOOT' && _bootCleared()) {
      transition('READY');
      transition('ACTIVE');
    }
    // ACTIVE → IDLE after IDLE_MS with no interaction.
    if (_state === 'ACTIVE' && _now() - _lastActivity >= IDLE_MS) {
      transition('IDLE');
    }
    var t = _now();
    for (var i = 0; i < _observers.length; i++) {
      var o = _observers[i];
      if (!o.onTick) continue;
      if (o.states.indexOf(_state) === -1) continue; // not in one of its states
      if (!_allows(o.tier)) continue; // DIAL GATE — re-evaluated live, every beat
      if (t - o._lastTick < o.cadenceMs) continue; // cadence throttle
      o._lastTick = t;
      try {
        o.onTick();
      } catch (_) {
        /* one bad observer never breaks the beat or its siblings (RobcoEvents pattern) */
      }
    }
  }

  // Boot is "cleared" once the boot screen is gone/hidden (or absent, e.g. headless).
  function _bootCleared() {
    try {
      var bs = document.getElementById('bootScreen');
      return !bs || bs.style.display === 'none';
    } catch (_) {
      return true;
    }
  }

  // Public: record user interaction — resets the idle clock and wakes to ACTIVE.
  function noteActivity() {
    _lastActivity = _now();
    if (_state === 'IDLE' || _state === 'STANDBY' || _state === 'READY') transition('ACTIVE');
  }

  function _onStandby() {
    if (_state === 'ACTIVE' || _state === 'IDLE' || _state === 'READY' || _state === 'COLD_BOOT') {
      transition('STANDBY');
    }
  }

  function _onResume() {
    if (_state === 'STANDBY') transition('ACTIVE');
    _lastActivity = _now();
  }

  // Explicit power-down (wired to the SHUTDOWN command in A3). SHUTDOWN → OFF.
  function shutdown() {
    transition('SHUTDOWN');
    transition('OFF');
  }

  // start — begin the single heartbeat + wire the lifecycle signal listeners.
  // Called ONCE from initAmbientRuntime() (window.onload), never at parse time.
  function start() {
    if (_started) return;
    _started = true;
    _lastActivity = _now();
    if (_state === 'OFF') transition('COLD_BOOT');
    try {
      window.addEventListener('pointerdown', noteActivity, true);
      window.addEventListener('keydown', noteActivity, true);
      window.addEventListener('blur', _onStandby);
      window.addEventListener('focus', _onResume);
      document.addEventListener('visibilitychange', function () {
        if (document.hidden) _onStandby();
        else _onResume();
      });
    } catch (_) {
      /* listener wiring must never break boot */
    }
    try {
      _heartbeat = setInterval(_beat, GRANULARITY_MS);
    } catch (_) {
      _heartbeat = null; // no scheduler available → app stays byte-identical to today
    }
  }

  var AmbientRuntime = {
    STATES: RUNTIME_STATES.slice(),
    getState: getState,
    register: register,
    transition: transition,
    noteActivity: noteActivity,
    shutdown: shutdown,
    start: start,
    _beat: _beat, // exposed for the deterministic behavioral test (tests/test.html)
    _ticks: 0, // demo-observer counter — in-memory, user-invisible, writes nothing
  };
  window.AmbientRuntime = AmbientRuntime;

  // initAmbientRuntime — the named window.onload boot phase (called from ui-core.js).
  // Registers the ONE inert self-test observer (proves tick + state gate + tier
  // gate) and starts the heartbeat. Wrapped so a runtime failure can never break
  // boot: on any throw the app is byte-identical to today.
  function initAmbientRuntime() {
    try {
      register({
        id: 'runtime-selftest',
        cadenceMs: 1000,
        states: ['ACTIVE'],
        tier: 'minimal',
        onTick: function () {
          AmbientRuntime._ticks++;
        },
      });
      start();
    } catch (_) {
      /* fail-safe: if the runtime can't start, the app runs exactly as before */
    }
  }
  window.initAmbientRuntime = initAmbientRuntime;
})();
