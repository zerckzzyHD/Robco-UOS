// ── TEST CONSOLE — staging/dev-only developer panel (Step 2 · Phase 2) ─────────
//
// A live inspector + trigger panel for the Ambient Runtime (js/runtime.js) so
// the accumulating Phase-2 ambient features are testable without waiting on
// real idle/standby timers on a real device.
//
// ── STAGING-ONLY, FAIL-SAFE TO HIDDEN ─────────────────────────────────────────
// Gated behind the EXACT SAME env signal the changelog viewer uses to hide its
// [Unreleased] section on production (_isStagingEnv(), ui-core.js, Protocol
// 43/WU-C11): the staging marker that scripts/cf-staging-build.mjs stamps into
// the staged build, with the local/Cloudflare-staging hostname as a secondary
// signal. Any uncertainty (function missing, a throw, an unrecognized host)
// defaults to HIDDEN — a production player must never see this panel. The
// markup itself lives inert inside <template id="testConsoleTemplate">
// (index.html, the WU-E2 pattern) so it cannot render even if this gate were
// somehow bypassed — it only enters the DOM when initTestConsole() explicitly
// clones it in.
//
// ── HARD ATMOSPHERE/SAVE BOUNDARY (Phase-2 prime invariant #1) ────────────────
// This file touches ONLY in-memory Ambient Runtime state and the Immersion
// tier (an existing MetaStore device pref, same as the real dial in Security &
// Config). It never reads or writes the campaign save, stats, or event log,
// and never pushes anything to the cloud. No auto-anything (Phase-2 invariant
// #2) — every action here is an explicit developer button/select, never
// triggered on its own.
//
// ── EXTENSION POINT ───────────────────────────────────────────────────────────
// To add a trigger for a future ambient feature (broadcasts, weather, boot
// flavors, etc.), add one more control inside #testConsoleTemplate's body
// (index.html) and wire it here the same way _renderTransitionButtons /
// _wireImmersionSelect do — call the feature's existing entry point directly,
// never write campaign state, never bypass an existing confirm gate.
//
// Game-agnostic (Protocol 38): pure dev-tooling, no game literals.
(function () {
  'use strict';

  var _refreshUnregister = null;

  // _isStaging — reuses ui-core.js's _isStagingEnv() verbatim (Protocol 22).
  // Fails OPEN to false (hidden) on any uncertainty — never leak to production.
  function _isStaging() {
    try {
      return typeof window._isStagingEnv === 'function' ? window._isStagingEnv() : false;
    } catch (_) {
      return false;
    }
  }

  function _mountConsole() {
    var mount = document.getElementById('testConsoleMount');
    var tpl = document.getElementById('testConsoleTemplate');
    if (!mount || !tpl || !tpl.content) return null;
    if (!document.getElementById('testConsolePanel')) {
      mount.appendChild(tpl.content.cloneNode(true));
    }
    return document.getElementById('testConsolePanel');
  }

  function _renderTransitionButtons(panel) {
    var wrap = panel.querySelector('#testConsoleTransitions');
    if (!wrap || !window.AmbientRuntime || !Array.isArray(window.AmbientRuntime.STATES)) return;
    wrap.innerHTML = window.AmbientRuntime.STATES.map(function (s) {
      var label = escapeHtml(s);
      return (
        '<button type="button" class="btn-sm" data-test-transition="' +
        label +
        '" aria-label="Force Ambient Runtime transition to ' +
        label +
        '">' +
        label +
        '</button>'
      );
    }).join('');
    Array.prototype.forEach.call(wrap.querySelectorAll('[data-test-transition]'), function (btn) {
      btn.addEventListener('click', function () {
        var target = btn.getAttribute('data-test-transition');
        try {
          if (target === 'SHUTDOWN' && typeof window.AmbientRuntime.shutdown === 'function') {
            window.AmbientRuntime.shutdown();
          } else if (typeof window.AmbientRuntime.transition === 'function') {
            window.AmbientRuntime.transition(target);
          }
        } catch (_) {
          /* a forced transition must never break the console */
        }
        _refresh(panel);
      });
    });
  }

  function _wireImmersionSelect(panel) {
    var sel = panel.querySelector('#testConsoleImmersionSelect');
    if (!sel) return;
    try {
      if (typeof window.getImmersionTier === 'function') sel.value = window.getImmersionTier();
    } catch (_) {
      /* leave the default option selected */
    }
    sel.addEventListener('change', function () {
      try {
        // Reuses the real dial's own setter (Protocol 22) — a MetaStore device
        // pref write, never a campaign write.
        if (typeof window.onImmersionChange === 'function') window.onImmersionChange(sel.value);
        var real = document.getElementById('immersionSelect');
        if (real) real.value = sel.value; // keep the real Security & Config dial in sync
      } catch (_) {
        /* device-pref write only -- never throw into the console */
      }
    });
  }

  function _refresh(panel) {
    try {
      var stateEl = panel.querySelector('#testConsoleState');
      if (
        stateEl &&
        window.AmbientRuntime &&
        typeof window.AmbientRuntime.getState === 'function'
      ) {
        stateEl.textContent = window.AmbientRuntime.getState();
      }
      var obsEl = panel.querySelector('#testConsoleObservers');
      if (
        obsEl &&
        window.AmbientRuntime &&
        typeof window.AmbientRuntime.listObservers === 'function'
      ) {
        var list = window.AmbientRuntime.listObservers();
        obsEl.innerHTML = list.length
          ? list
              .map(function (o) {
                return (
                  '<div class="tracker-row"><span>' +
                  escapeHtml(o.id) +
                  '</span><span>&nbsp;' +
                  escapeHtml(o.states.join('/')) +
                  ' &middot; ' +
                  escapeHtml(o.tier) +
                  ' &middot; ' +
                  escapeHtml(String(o.cadenceMs)) +
                  'ms</span></div>'
                );
              })
              .join('')
          : '<div>NO OBSERVERS REGISTERED</div>';
      }
    } catch (_) {
      /* a console refresh failure must never break the runtime or boot */
    }
  }

  // The console's own live-updating readout is itself an Ambient Runtime
  // observer (Protocol 22 — "one heartbeat, many observers") rather than a
  // second, competing setInterval. tier 'minimal' so it is never muted by the
  // dial (a dev tool, not atmosphere); states = every state, so transitions
  // into IDLE/STANDBY/SHUTDOWN are visible as they happen.
  function _wireLiveRefresh(panel) {
    if (_refreshUnregister) return; // idempotent — initTestConsole only mounts once
    if (!window.AmbientRuntime || typeof window.AmbientRuntime.register !== 'function') return;
    _refreshUnregister = window.AmbientRuntime.register({
      id: 'test-console-refresh',
      cadenceMs: 500,
      states: (window.AmbientRuntime.STATES || []).slice(),
      tier: 'minimal',
      onTick: function () {
        _refresh(panel);
      },
    });
  }

  // initTestConsole — the named window.onload boot phase (called from ui-core.js).
  // Does ABSOLUTELY NOTHING unless _isStaging() returns true. Wrapped so a
  // console failure can never break boot.
  function initTestConsole() {
    try {
      if (!_isStaging()) return; // production default — the console never mounts
      var panel = _mountConsole();
      if (!panel) return;
      _renderTransitionButtons(panel);
      _wireImmersionSelect(panel);
      _wireLiveRefresh(panel);
      _refresh(panel);
    } catch (_) {
      /* fail-safe: a console failure can never break boot or leak to production */
    }
  }
  window.initTestConsole = initTestConsole;
})();
