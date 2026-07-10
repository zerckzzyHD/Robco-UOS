// ── DIAGNOSTIC SHELL — the ONE canonical dev/debug console (Step 2 · Phase 2,
//    Diagnostic Shell U1: registry spine + two-signal gate) ──────────────────
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
// ── U1: THE TWO-SIGNAL GATE (planning/DIAGNOSTIC_SHELL_PLAN.md §2.2) ─────────
// One signal used to answer "show it or not." This panel now serves two
// audiences (an owner-only staging toolbench, and a future non-destructive
// prod-minigame sandbox), so a second signal decides WHICH tools may render:
//   - _shellVisible() — does the shell exist at all? Unchanged philosophy,
//     a thin alias for _devConsoleUnlocked(). Fails to false (absent).
//   - _shellTier() — 'staging' ONLY on a POSITIVE staging signal, otherwise
//     the RESTRICTIVE 'prod' tier. Fails to 'prod' on any uncertainty — same
//     fail-safe direction as _devConsoleUnlocked() and the changelog viewer.
//   - _toolVisible(tool, tier) — the ONE filter every registry tool passes
//     through BEFORE it ever touches the document. A tier:'staging' tool has
//     exactly one way to render (a positively-confirmed staging tier), so it
//     can never leak to a production player. See _renderShell() below: every
//     tier-invisible tool's anchor is stripped out of a DETACHED clone of the
//     <template> before that clone is ever appended to the document — nothing
//     filtered ever becomes reachable DOM.
//   - _invoke(tool) — every destructive:true tool's action is auto-wrapped in
//     the existing confirmAction() helper (Protocol 22/34) so no caller can
//     forget a confirm gate; it is a property of the registry data, enforced
//     by this one call path.
//
// DIAGNOSTIC_SHELL_TOOLS (below) is the single source of truth this panel
// renders from. Adding a future trigger/reset/inspector is one more registry
// entry — see the EXTENSION POINT comment near the template in index.html.
//
// ── HARD ATMOSPHERE/SAVE BOUNDARY (Phase-2 prime invariant #1) ────────────────
// This file touches ONLY in-memory Ambient Runtime state and the Immersion
// tier (an existing MetaStore device pref, same as the real dial in Security &
// Config). It never reads or writes the campaign save, stats, or event log,
// and never pushes anything to the cloud. No auto-anything (Phase-2 invariant
// #2) — every action here is an explicit developer button/select, never
// triggered on its own.
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

  // _shellVisible — existence gate (U1): does the shell mount AT ALL? A thin,
  // literally-named alias over _devConsoleUnlocked() — same fail-safe-to-false
  // philosophy, never a second re-derived check (Protocol 22).
  function _shellVisible() {
    return _devConsoleUnlocked();
  }

  // _shellTier — WHICH tools may render, once the shell is visible. 'staging'
  // ONLY when the staging signal is POSITIVELY confirmed; otherwise the
  // RESTRICTIVE 'prod' tier. Fails to 'prod' on any throw/missing function —
  // the same fail-safe direction as _devConsoleUnlocked()'s "default to
  // hidden"/the changelog viewer's "default to production".
  function _shellTier() {
    try {
      return typeof window._isStagingEnv === 'function' && window._isStagingEnv()
        ? 'staging'
        : 'prod';
    } catch (_) {
      return 'prod';
    }
  }

  // _toolVisible — the ONE filter every registry tool passes through before
  // it ever enters the document. A tier:'prod' tool always shows (both
  // audiences); a tier:'staging' tool shows ONLY when staging is positively
  // confirmed. See _renderShell() for where this runs (before DOM insertion).
  function _toolVisible(tool, tier) {
    if (!tool) return false;
    if (tool.tier === 'prod') return true;
    return tier === 'staging';
  }

  // _invoke — the auto-confirm-gate (U1): a destructive:true tool's action
  // is ALWAYS wrapped in the existing confirmAction() helper (Protocol 22/34,
  // the diegetic Promise-based confirm, never the blocking confirm()). A
  // non-destructive tool's action fires immediately. Fail-safe: if
  // confirmAction() itself is unavailable or throws, a destructive action
  // never fires (the safe direction).
  function _invoke(tool) {
    if (!tool || typeof tool.action !== 'function') return;
    var run = function () {
      try {
        tool.action();
      } catch (_) {
        /* a tool action must never break the console */
      }
    };
    if (!tool.destructive) {
      run();
      return;
    }
    try {
      if (typeof confirmAction !== 'function') return; // fail-safe: no confirm path available, no destructive action
      confirmAction({
        title: '> ' + tool.label,
        warning: tool.tooltip || 'This is a destructive diagnostic action.',
        confirmLabel: 'EXECUTE',
        cancelLabel: 'ABORT',
      }).then(function (ok) {
        if (ok) run();
      });
    } catch (_) {
      /* a confirm-gate failure must never fire a destructive action */
    }
  }

  // ── DIAGNOSTIC_SHELL_TOOLS — the single source of truth this panel renders
  // from (planning/DIAGNOSTIC_SHELL_PLAN.md §2.1). U1 re-expresses every
  // existing control (the 9 items below) as a registry entry; each `anchor`
  // selector names the existing markup block inside <template
  // id="testConsoleTemplate"> (index.html) that control already lives in —
  // migration only, no new tools. A future trigger/reset/inspector is one
  // more entry (see the EXTENSION POINT comment beside the template).
  var DIAGNOSTIC_SHELL_TOOLS = [
    {
      id: 'inspect-runtime-state',
      label: 'RUNTIME STATE',
      subLabel: 'AmbientRuntime.getState() readout',
      icon: '◉',
      category: 'inspect',
      tier: 'prod',
      destructive: false,
      tooltip: 'Live Ambient Runtime state readout.',
      triggers: ['runtime.state'],
      anchor: '[data-dsh-anchor="testConsoleState"]',
    },
    {
      id: 'runtime-force-transition',
      label: 'FORCE TRANSITION',
      subLabel: 'AmbientRuntime.forceState(IDLE / STANDBY / SHUTDOWN / OFF)',
      icon: '▲',
      category: 'triggers',
      tier: 'prod',
      destructive: false,
      tooltip: 'Force the Ambient Runtime into IDLE, STANDBY, SHUTDOWN, or OFF.',
      triggers: ['runtime.state'],
      anchor: '[data-dsh-anchor="testConsoleTransitions"]',
    },
    {
      id: 'reboot',
      label: 'REBOOT',
      subLabel: 'runBootSequence() replay',
      icon: '↻',
      category: 'triggers',
      tier: 'prod',
      destructive: false,
      tooltip: 'Replay the boot sequence.',
      triggers: [],
      anchor: '[data-dsh-anchor="testConsoleTransitions"]',
    },
    {
      id: 'wake-active',
      label: 'WAKE → ACTIVE',
      subLabel: "AmbientRuntime.forceState('ACTIVE')",
      icon: '●',
      category: 'triggers',
      tier: 'prod',
      destructive: false,
      tooltip:
        'Force the Ambient Runtime back to ACTIVE — the one-click undo for the force-transition buttons.',
      triggers: ['runtime.state'],
      anchor: '[data-dsh-anchor="testConsoleTransitions"]',
    },
    {
      id: 'a11y-immersion',
      label: 'IMMERSION TIER',
      subLabel: 'onImmersionChange() / getImmersionTier()',
      icon: '■',
      category: 'env',
      tier: 'prod',
      destructive: false,
      tooltip: 'Set the device Immersion tier (mirrors the real Security & Config dial).',
      triggers: [],
      anchor: '[data-dsh-anchor="testConsoleImmersionSelect"]',
    },
    {
      id: 'inspect-observers',
      label: 'REGISTERED OBSERVERS',
      subLabel: 'AmbientRuntime.listObservers() readout',
      icon: '◉',
      category: 'inspect',
      tier: 'prod',
      destructive: false,
      tooltip: 'Live list of registered Ambient Runtime observers.',
      triggers: [],
      anchor: '[data-dsh-anchor="testConsoleObservers"]',
    },
    {
      id: 'replay-hatch',
      label: 'REPLAY HATCH',
      subLabel: "MetaStore.remove('robco_bay_opened')",
      icon: '⚙',
      category: 'triggers',
      tier: 'staging',
      destructive: true,
      tooltip: 'Reset the Module Bay hatch so its view-once ceremony replays on next open.',
      triggers: ['robco_bay_opened'],
      anchor: '[data-dsh-anchor="testConsoleReplayHatch"]',
      // action is the ONLY tool this unit routes through _invoke() (every other
      // migrated control keeps its own dedicated wiring below) — a Protocol 42
      // fix landed here after live verification caught this field missing
      // entirely, which made _invoke()'s `typeof tool.action !== 'function'`
      // guard silently no-op the button (no confirm dialog, no action, no
      // thrown error) — see Suite 210.14's registry-completeness regression test.
      action: _replayHatch,
    },
    {
      id: 'ocr-unit1-scan',
      label: 'OPTICAL SCAN TEST',
      subLabel: 'runVisualOcrTest() — raw on-device OCR text dump',
      icon: '⚒',
      category: 'infra',
      tier: 'staging',
      destructive: false,
      tooltip:
        'Run a screenshot through the on-device OCR pipeline and dump the raw recognized text.',
      triggers: [],
      anchor: '[data-dsh-anchor="ocrTestInput"]',
    },
    {
      id: 'ocr-unit2-scan',
      label: 'SCAN & PARSE TEST',
      subLabel: 'runVisualOcr() — full parse / preview / confirm pipeline',
      icon: '⚒',
      category: 'infra',
      tier: 'staging',
      destructive: false,
      tooltip: 'Run a screenshot through the full OCR parse + preview/confirm pipeline.',
      triggers: [],
      anchor: '[data-dsh-anchor="visualParseTestInput"]',
    },
  ];
  // Exposed read-only for the harness (the VM behavioral proof, mirroring how
  // the OCR test wiring is reachable) — never mutated at runtime.
  window._DIAGNOSTIC_SHELL_TOOLS = DIAGNOSTIC_SHELL_TOOLS;
  window._toolVisible = _toolVisible;
  window._shellTier = _shellTier;

  // Section order + chrome (planning/DIAGNOSTIC_SHELL_PLAN.md §3.1). U1 only
  // populates triggers/inspect/env/infra; state/resets/fixtures/inline stay
  // empty (no tools yet) and are skipped entirely — a section with zero
  // visible tools for the current tier is never rendered.
  var CATEGORY_ORDER = ['triggers', 'state', 'resets', 'infra', 'inspect', 'fixtures', 'env'];
  var CATEGORY_META = {
    triggers: { stagingTitle: 'TRIGGERS', prodTitle: 'STIMULUS BENCH' },
    state: { stagingTitle: 'STATE SETUP', prodTitle: 'STATE SETUP' },
    resets: { stagingTitle: 'RESETS', prodTitle: 'RESETS' },
    infra: { stagingTitle: 'RESILIENCE & INFRA', prodTitle: 'RESILIENCE & INFRA' },
    inspect: { stagingTitle: 'INSPECT', prodTitle: 'READOUTS' },
    fixtures: { stagingTitle: 'FIXTURES', prodTitle: 'FIXTURES' },
    env: { stagingTitle: 'ENVIRONMENT & UNLOCK', prodTitle: 'ACCESS' },
  };

  function _paintEnvBanner(panel, tier) {
    var el = panel.querySelector('#dshEnvBanner');
    if (!el) return;
    el.textContent =
      tier === 'staging'
        ? 'STAGING TOOLBENCH — ALL SYSTEMS EXPOSED'
        : 'RESTRICTED DIAGNOSTIC ACCESS — SANDBOX';
    el.classList.toggle('dsh-banner-staging', tier === 'staging');
    el.classList.toggle('dsh-banner-prod', tier !== 'staging');
  }

  // _renderShell — the single render pipeline (planning/DIAGNOSTIC_SHELL_PLAN.md
  // §3.3). Runs on a DETACHED clone of <template id="testConsoleTemplate">
  // (see _mountConsole()) — nothing here has touched the document yet. For
  // every category, in order: gather the tools that pass _toolVisible() for
  // the CURRENT tier, skip the whole section if none survive, otherwise build
  // a collapsible sub-panel and MOVE each surviving tool's existing anchor
  // element into it. Any anchor never claimed by a visible tool (tier-filtered
  // out) is explicitly stripped from the tree at the end — so a tier:'staging'
  // tool has no path to the document unless _shellTier() genuinely returned
  // 'staging'. This is what makes the filter run BEFORE DOM insertion: the
  // caller only appends the surviving `panel` to the document after this
  // function returns.
  function _renderShell(panel) {
    var tier = _shellTier();
    _paintEnvBanner(panel, tier);
    var sectionsHost = panel.querySelector('#dshSections');
    if (!sectionsHost) return;
    sectionsHost.innerHTML = '';
    var moved = {};
    CATEGORY_ORDER.forEach(function (cat) {
      var visibleTools = DIAGNOSTIC_SHELL_TOOLS.filter(function (t) {
        return t.category === cat && _toolVisible(t, tier);
      });
      if (!visibleTools.length) return; // section hidden entirely this tier
      var meta = CATEGORY_META[cat] || {};
      var details = document.createElement('details');
      details.className = 'sub-panel';
      details.setAttribute('data-sub-id', 'dsh_' + cat);
      var summary = document.createElement('summary');
      var h3 = document.createElement('h3');
      h3.textContent =
        '> ' +
        (tier === 'staging'
          ? meta.stagingTitle
          : meta.prodTitle || meta.stagingTitle || cat.toUpperCase());
      summary.appendChild(h3);
      details.appendChild(summary);
      visibleTools.forEach(function (tool) {
        if (!tool.anchor || moved[tool.anchor]) return; // a shared anchor already placed
        var anchorEl = panel.querySelector(tool.anchor);
        if (!anchorEl) return;
        anchorEl.setAttribute(
          'data-dsh-search',
          (tool.label + ' ' + (tool.subLabel || '')).toLowerCase()
        );
        details.appendChild(anchorEl); // moves the existing node — no markup rebuilt
        moved[tool.anchor] = true;
      });
      if (typeof _wireDynamicSubPanel === 'function') _wireDynamicSubPanel(details);
      sectionsHost.appendChild(details);
    });
    // Leak-proof guarantee: an anchor no visible tool ever claimed (every tool
    // pointing at it was filtered out by _toolVisible for this tier) is
    // stripped from the tree here, before this panel is ever appended to the
    // document — it never becomes reachable DOM.
    DIAGNOSTIC_SHELL_TOOLS.forEach(function (tool) {
      if (!tool.anchor || moved[tool.anchor]) return;
      var leftover = panel.querySelector(tool.anchor);
      if (leftover && leftover.parentNode) leftover.parentNode.removeChild(leftover);
    });
  }

  function _wireSearch(panel) {
    var input = panel.querySelector('#dshSearch');
    if (!input) return;
    input.addEventListener('input', function () {
      var q = input.value.trim().toLowerCase();
      var sections = panel.querySelectorAll('#dshSections > details.sub-panel');
      Array.prototype.forEach.call(sections, function (sec) {
        var anchors = sec.querySelectorAll('[data-dsh-search]');
        var anyVisible = !anchors.length; // an empty section (shouldn't happen) stays visible
        Array.prototype.forEach.call(anchors, function (a) {
          var hay = a.getAttribute('data-dsh-search') || '';
          var show = !q || hay.indexOf(q) !== -1;
          a.style.display = show ? '' : 'none';
          if (show) anyVisible = true;
        });
        sec.style.display = anyVisible ? '' : 'none';
      });
    });
  }

  function _mountConsole() {
    var mount = document.getElementById('testConsoleMount');
    var tpl = document.getElementById('testConsoleTemplate');
    if (!mount || !tpl || !tpl.content) return null;
    var existing = document.getElementById('testConsolePanel');
    if (existing) return existing;
    var frag = tpl.content.cloneNode(true); // detached — not part of the document yet
    var panel = frag.querySelector('#testConsolePanel');
    if (!panel) return null;
    _renderShell(panel); // filter + reorganize BEFORE the panel ever touches the document
    mount.appendChild(panel); // only the surviving, tier-appropriate DOM is inserted
    return panel;
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
  // never a parallel flag); never touches campaign state. U1: this is the console's
  // one pre-existing destructive-leaning control, so it is now tier:'staging' and
  // destructive:true in the registry — DIAGNOSTIC_SHELL_TOOLS['replay-hatch'] — and
  // fires through _invoke() so a confirm gate can never be skipped.
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

  function _toolById(id) {
    for (var i = 0; i < DIAGNOSTIC_SHELL_TOOLS.length; i++) {
      if (DIAGNOSTIC_SHELL_TOOLS[i].id === id) return DIAGNOSTIC_SHELL_TOOLS[i];
    }
    return null;
  }

  function _wireReplayHatch(panel) {
    var btn = panel.querySelector('#testConsoleReplayHatch');
    if (!btn) return;
    var tool = _toolById('replay-hatch');
    btn.addEventListener('click', function () {
      if (tool) {
        _invoke(tool);
      } else {
        _replayHatch(); // fail-safe: registry entry missing, still never skip the action
      }
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
      _wireSearch(panel);
      _wireLiveRefresh(panel);
      _refresh(panel);
    } catch (_) {
      /* fail-safe: a console failure can never break boot or leak to production */
    }
  }
  window.initTestConsole = initTestConsole;
})();
