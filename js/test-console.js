// ── DEVELOPER CONSOLE — the ONE canonical dev/debug console (Step 2 · Phase 2) ─
//
// A live inspector + trigger panel for the Ambient Runtime (js/runtime.js) so
// the accumulating Phase-2 ambient features are testable without waiting on
// real idle/standby timers on a real device.
//
// ── THIS IS THE CANONICAL CONSOLE, NOT A THROWAWAY TEST PANEL ─────────────────
// This panel IS the one developer/debug console the roadmap's hacking minigame
// will later unlock in normal builds — there is no separate "real" console to
// build later. Visibility is centralized in ONE gate, `_devConsoleUnlocked()`
// below: today it is true only on a dev/staging build (so dev builds skip the
// hack entirely); on production it is false until the future minigame flips it.
// Nothing else in this file (or any future caller) may re-derive visibility —
// every check goes through that one function (Protocol 22).
//
// ── FAIL-SAFE TO HIDDEN ───────────────────────────────────────────────────────
// `_devConsoleUnlocked()`'s staging path reuses the EXACT SAME env signal the
// changelog viewer uses to hide its [Unreleased] section on production
// (_isStagingEnv(), ui-core.js, Protocol 43/WU-C11): the staging marker that
// scripts/cf-staging-build.mjs stamps into the staged build, with the
// local/Cloudflare-staging hostname as a secondary signal. Any uncertainty
// (function missing, a throw, an unrecognized host) defaults to HIDDEN — a
// production player must never see this panel until they've actually earned it.
// The markup itself also lives inert inside <template id="testConsoleTemplate">
// (index.html, the WU-E2 pattern) so it cannot render even if the gate were
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

  // _devConsoleUnlocked — THE canonical, single gate for this console's
  // visibility (Protocol 22 — one gate, not several re-derived checks).
  //   TODAY: true only on a dev/staging build (delegates verbatim to
  //   ui-core.js's _isStagingEnv(), never re-implemented) — dev builds skip
  //   the hack entirely.
  //   MINIGAME-UNLOCK SEAM: this exact function is what the future in-game
  //   hacking minigame will also flip to true on a production build once the
  //   player solves it (e.g. by additionally checking a persisted unlock
  //   flag this function reads) — the console it unlocks IS this one, not a
  //   separate panel. When that lands, add the unlock-flag check here and
  //   nowhere else.
  // Fails OPEN to false (hidden) on any uncertainty — never leak to production.
  function _devConsoleUnlocked() {
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

  // Owner report fix: COLD_BOOT/READY/ACTIVE are normal-operation states with no A3
  // ambient observer of their own, so forcing them from here was a dead button (no
  // visible effect). Only the four states that drive a visible A3 ambient experience
  // (idle-phosphor/standby-deepen/shutdown-crt, Suite 150) stay as one-click force
  // buttons — REBOOT and WAKE_TO_ACTIVE (below) replace the normal-op buttons.
  var VISIBLE_EFFECT_STATES = ['IDLE', 'STANDBY', 'SHUTDOWN', 'OFF'];

  function _renderTransitionButtons(panel) {
    var wrap = panel.querySelector('#testConsoleTransitions');
    if (!wrap || !window.AmbientRuntime || !Array.isArray(window.AmbientRuntime.STATES)) return;
    var states = window.AmbientRuntime.STATES.filter(function (s) {
      return VISIBLE_EFFECT_STATES.indexOf(s) !== -1;
    });
    wrap.innerHTML = states
      .map(function (s) {
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
      })
      .join('');
    Array.prototype.forEach.call(wrap.querySelectorAll('[data-test-transition]'), function (btn) {
      btn.addEventListener('click', function () {
        var target = btn.getAttribute('data-test-transition');
        try {
          // The console must be able to force ANY state to exercise the ambient
          // behaviors in each one, so every button routes through the FORCE path
          // (bypasses the LEGAL adjacency map) rather than the validated
          // transition() a real caller would use — this is a debug tool, not a
          // simulation of legal player-driven flow.
          if (typeof window.AmbientRuntime.forceState === 'function') {
            window.AmbientRuntime.forceState(target);
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

  // REBOOT replays the real boot sequence (runBootSequence, ui-audio.js) instead of
  // forcing a state the runtime auto-advances through anyway with no visible effect.
  // The boot screen is only ever hidden via style.display/classList (never removed from
  // the DOM — ui-audio.js), so it must be explicitly reset before re-running the
  // sequence, or it would replay invisibly behind display:none.
  function _rebootFromConsole(panel) {
    try {
      var bootScreen = document.getElementById('bootScreen');
      var bootLines = document.getElementById('bootLines');
      if (bootScreen) {
        bootScreen.style.display = '';
        bootScreen.classList.remove('boot-fade-out', 'boot-degraded');
      }
      if (bootLines) bootLines.innerHTML = '';
      if (typeof window.runBootSequence === 'function') window.runBootSequence();
    } catch (_) {
      /* a console failure must never break boot or leak to production */
    }
    _refresh(panel);
  }

  // WAKE -> ACTIVE is the one-click undo for the IDLE/STANDBY/SHUTDOWN/OFF force
  // buttons above, so a tester is never stuck in a dimmed/shutdown visual state without
  // reloading the page. Reuses the same forceState() path (Protocol 22), never a forked
  // transition mechanism.
  function _wakeToActive(panel) {
    try {
      if (window.AmbientRuntime && typeof window.AmbientRuntime.forceState === 'function') {
        window.AmbientRuntime.forceState('ACTIVE');
      }
    } catch (_) {
      /* a forced transition must never break the console */
    }
    _refresh(panel);
  }

  function _wireResetControls(panel) {
    var wrap = panel.querySelector('#testConsoleTransitions');
    if (!wrap) return;
    var reboot = document.createElement('button');
    reboot.type = 'button';
    reboot.className = 'btn-sm';
    reboot.setAttribute('data-test-reboot', '1');
    reboot.setAttribute('aria-label', 'Replay the boot sequence');
    reboot.textContent = 'REBOOT';
    reboot.addEventListener('click', function () {
      _rebootFromConsole(panel);
    });
    wrap.appendChild(reboot);

    var wake = document.createElement('button');
    wake.type = 'button';
    wake.className = 'btn-sm';
    wake.setAttribute('data-test-wake', '1');
    wake.setAttribute('aria-label', 'Force Ambient Runtime back to ACTIVE');
    wake.textContent = 'WAKE → ACTIVE';
    wake.addEventListener('click', function () {
      _wakeToActive(panel);
    });
    wrap.appendChild(wake);
  }

  // Owner report: the Module Bay's first-visit hatch ceremony (robco_bay_opened,
  // ui-core.js) can only ever be SEEN once per device — there is no in-app way to
  // re-trigger it for testing. REPLAY HATCH resets that device pref and puts the
  // #bayHatch overlay itself back into its closed, pre-ceremony state so the next
  // look at Security & Config replays it, without a page reload. Dev/staging-console
  // only (Protocol 22 — reuses the exact same MetaStore key releaseBayHatch() sets,
  // never a parallel flag); never touches campaign state.
  function _replayHatch() {
    try {
      if (window.MetaStore && typeof window.MetaStore.remove === 'function') {
        window.MetaStore.remove('robco_bay_opened');
      }
      var hatch = document.getElementById('bayHatch');
      if (hatch) {
        hatch.classList.remove('bay-hatch--open');
        hatch.hidden = false;
      }
    } catch (_) {
      /* a console failure must never break boot or leak to production */
    }
  }

  function _wireReplayHatch(panel) {
    var btn = panel.querySelector('#testConsoleReplayHatch');
    if (!btn) return;
    btn.addEventListener('click', function () {
      _replayHatch();
    });
  }

  // Visual Upload OCR Unit-1 infra proof (planning/VISUAL_UPLOAD_OCR_PLAN.md
  // Sec7 Stage 1): a thin wiring layer only -- the actual OCR pipeline
  // (lazy Tesseract.js load, canvas preprocessing, worker.recognize) lives in
  // js/ocr.js (Protocol 23 layering). Writes NOTHING durable to the campaign;
  // dumps the raw recognized text into #ocrTestOutput for a live proof.
  function _wireOcrTest(panel) {
    var input = panel.querySelector('#ocrTestInput');
    var btn = panel.querySelector('#ocrTestScanBtn');
    var status = panel.querySelector('#ocrTestStatus');
    var output = panel.querySelector('#ocrTestOutput');
    if (!input || !btn || !status || !output) return;
    btn.addEventListener('click', function () {
      var file = input.files && input.files[0];
      if (!file) {
        status.textContent = 'SELECT AN IMAGE FIRST';
        return;
      }
      if (typeof window.runVisualOcrTest !== 'function') {
        status.textContent = 'OCR MODULE NOT LOADED (js/ocr.js)';
        return;
      }
      btn.disabled = true;
      output.textContent = '';
      window
        .runVisualOcrTest(file, function (msg) {
          status.textContent = msg;
        })
        .then(function (text) {
          status.textContent = 'DONE';
          output.textContent = text && text.trim() ? text : '[NO TEXT DETECTED]';
        })
        .catch(function (err) {
          status.textContent = 'FAILED: ' + (err && err.message ? err.message : 'unknown error');
        })
        .finally(function () {
          btn.disabled = false;
        });
    });
  }

  // Visual Upload OCR Unit 2 (planning/VISUAL_UPLOAD_OCR_PLAN.md §3): the full
  // OCR -> deterministic parser -> preview/confirm modal -> additive apply
  // pipeline. This wiring itself writes NOTHING durable -- it only invokes
  // window.runVisualOcr() (js/ocr.js), which opens the real preview/confirm
  // modal (renderVisualParsePreview, js/ui-render.js); every campaign write
  // happens only if/when the player taps CONFIRM & APPLY inside that modal.
  function _wireVisualParseTest(panel) {
    var input = panel.querySelector('#visualParseTestInput');
    var btn = panel.querySelector('#visualParseTestBtn');
    var status = panel.querySelector('#visualParseTestStatus');
    if (!input || !btn || !status) return;
    btn.addEventListener('click', function () {
      var file = input.files && input.files[0];
      if (!file) {
        status.textContent = 'SELECT AN IMAGE FIRST';
        return;
      }
      if (typeof window.runVisualOcr !== 'function') {
        status.textContent = 'OCR MODULE NOT LOADED (js/ocr.js)';
        return;
      }
      btn.disabled = true;
      window
        .runVisualOcr(file, function (msg) {
          status.textContent = msg;
        })
        .catch(function (err) {
          status.textContent = 'FAILED: ' + (err && err.message ? err.message : 'unknown error');
        })
        .finally(function () {
          btn.disabled = false;
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
  // Does ABSOLUTELY NOTHING unless _devConsoleUnlocked() returns true. Wrapped
  // so a console failure can never break boot.
  function initTestConsole() {
    try {
      if (!_devConsoleUnlocked()) return; // production default — the console never mounts
      var panel = _mountConsole();
      if (!panel) return;
      _renderTransitionButtons(panel);
      _wireResetControls(panel);
      _wireReplayHatch(panel);
      _wireOcrTest(panel);
      _wireVisualParseTest(panel);
      _wireImmersionSelect(panel);
      _wireLiveRefresh(panel);
      _refresh(panel);
    } catch (_) {
      /* fail-safe: a console failure can never break boot or leak to production */
    }
  }
  window.initTestConsole = initTestConsole;
})();
